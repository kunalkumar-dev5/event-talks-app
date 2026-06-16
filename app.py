import os
import time
import hashlib
import xml.etree.ElementTree as ET
import urllib.request
import requests
from flask import Flask, jsonify, render_template, request
from bs4 import BeautifulSoup

app = Flask(__name__)

# Cache configuration
CACHE_TIMEOUT = 600  # 10 minutes cache
cache = {
    'notes': [],
    'last_fetched': 0
}

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed():
    """Fetches the XML feed from Google Cloud and parses it into structured JSON notes."""
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    response = requests.get(FEED_URL, headers=headers, timeout=15)
    response.raise_for_status()
    
    xml_data = response.content
    root = ET.fromstring(xml_data)
    
    namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
    entries = root.findall('atom:entry', namespaces)
    
    parsed_notes = []
    for entry in entries:
        title = entry.find('atom:title', namespaces)
        title_text = title.text if title is not None else "Unknown Date"
        
        updated = entry.find('atom:updated', namespaces)
        updated_text = updated.text if updated is not None else ""
        
        # Find alternate link
        link_elem = entry.find("atom:link[@rel='alternate']", namespaces)
        if link_elem is None:
            link_elem = entry.find('atom:link', namespaces)
        link_href = link_elem.attrib.get('href', '') if link_elem is not None else ""
        
        content_elem = entry.find('atom:content', namespaces)
        content_html = content_elem.text if content_elem is not None else ""
        
        # Parse content HTML with BeautifulSoup to split multiple notes under h3 tags
        soup = BeautifulSoup(content_html, 'html.parser')
        h3_tags = soup.find_all('h3')
        
        if not h3_tags:
            # Single update without h3 tag
            text_content = soup.get_text(separator=' ').strip()
            text_content = " ".join(text_content.split())
            
            # Generate a stable ID based on title and content hash
            content_str = str(soup).strip()
            content_id = hashlib.md5(f"{title_text}-{content_str}".encode('utf-8')).hexdigest()
            
            parsed_notes.append({
                'id': content_id,
                'date': title_text,
                'updated': updated_text,
                'link': link_href,
                'type': 'Update',
                'content': content_str,
                'text': text_content
            })
        else:
            for h3 in h3_tags:
                note_type = h3.get_text().strip()
                
                # Gather siblings until next h3
                sibling_content = []
                sibling_text = []
                next_node = h3.next_sibling
                while next_node and (not hasattr(next_node, 'name') or next_node.name != 'h3'):
                    sibling_content.append(str(next_node))
                    if hasattr(next_node, 'get_text'):
                        sibling_text.append(next_node.get_text(separator=' '))
                    elif isinstance(next_node, str):
                        sibling_text.append(next_node)
                    next_node = next_node.next_sibling
                
                html_str = "".join(sibling_content).strip()
                text_str = " ".join(sibling_text).strip()
                text_str = " ".join(text_str.split())
                
                # Generate a stable ID
                content_id = hashlib.md5(f"{title_text}-{note_type}-{html_str}".encode('utf-8')).hexdigest()
                
                parsed_notes.append({
                    'id': content_id,
                    'date': title_text,
                    'updated': updated_text,
                    'link': link_href,
                    'type': note_type,
                    'content': html_str,
                    'text': text_str
                })
                
    return parsed_notes

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force_refresh = request.args.get('force', 'false').lower() == 'true'
    current_time = time.time()
    
    # Use cached notes if cache is valid and refresh not forced
    if cache['notes'] and (current_time - cache['last_fetched'] < CACHE_TIMEOUT) and not force_refresh:
        return jsonify({
            'source': 'cache',
            'last_fetched': cache['last_fetched'],
            'notes': cache['notes']
        })
        
    try:
        notes = fetch_and_parse_feed()
        cache['notes'] = notes
        cache['last_fetched'] = current_time
        return jsonify({
            'source': 'network',
            'last_fetched': current_time,
            'notes': notes
        })
    except Exception as e:
        # Fallback to cache if network fails
        if cache['notes']:
            return jsonify({
                'source': 'cache_fallback',
                'error': str(e),
                'last_fetched': cache['last_fetched'],
                'notes': cache['notes']
            })
        return jsonify({
            'error': f"Failed to fetch release notes: {str(e)}",
            'notes': []
        }), 500

if __name__ == '__main__':
    # Listen on port 5000 by default
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
