# BigQuery Release Notes Tracker & X/Twitter Composer

A premium, modern, responsive web application to track Google Cloud BigQuery developments, parse release notes into type-coded updates, and draft/compose tailored updates directly to X (formerly Twitter) using an interactive, custom composer modal.

Built on a robust Python Flask backend and a plain vanilla HTML, JavaScript, and CSS frontend, the dashboard features glassmorphic aesthetics, micro-animations, and dynamic data-filtering.

---

## Key Features

- **Granular Update Parsing**: Google Cloud release entries are parsed and split by `<h3>` headings. This divides a single day's clump of updates into discrete card entries (e.g. separates features from issues) for focused sharing.
- **Dynamic Category Accentuation**: Update cards and headers are color-coded based on category tags:
  - **Feature**: Emerald Green theme.
  - **Issue**: Warm Amber theme.
  - **Deprecation**: Rose Red theme.
  - **Other**: Slate Blue theme.
- **Smart Data Caching**: In-memory caching (10-minute timeout) of Google Cloud's RSS feed coordinates API calls to ensure instant load times and prevent Google rate-limiting. A manual forced-refresh option bypasses the cache.
- **Metrics Dashboard & Filtering**: A statistics strip shows total counts for each update category. Stat cards function as quick-filter triggers. Full-text search and sorting are supported.
- **Interactive Tweet Composer**: Click "Tweet Update" on any card to launch an in-app compose modal modeled after X/Twitter's native composer:
  - **Automated Text Budgeting**: Prepresents a template containing headers, date details, and documentation links. It intelligently truncates the notes to stay safely within Twitter's 280-character limit.
  - **Visual Character Meter**: An SVG progress ring updates dynamically as you type, shifting colors (Blue -> Orange -> Red) as you near or exceed 280 characters.
  - **Hashtag Insertion Accelerators**: One-click tags for adding trending markers (`#BigQuery`, `#GoogleCloud`, `#GCP`, `#DataEngineering`).
  - **Action Hub**: Supports copying to clipboard (with toast feedback) and triggers X/Twitter compose intents in a new window.

---

## Tech Stack

- **Backend**: Python 3.14+, Flask, Requests, BeautifulSoup4
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+), FontAwesome Icons, Google Fonts (*Outfit*, *Inter*, *JetBrains Mono*)

---

## Getting Started

### Prerequisites
- Python 3.8+ installed on your local environment
- Git installed (optional, for code tracking)

### Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/kunalkumar-dev5/event-talks-app.git
   cd event-talks-app
   ```

2. **Create a Virtual Environment**:
   ```bash
   python -m venv venv
   ```

3. **Activate the Environment**:
   - **Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **macOS / Linux**:
     ```bash
     source venv/bin/activate
     ```

4. **Install Dependencies**:
   ```bash
   pip install flask requests beautifulsoup4
   ```

### Running Locally

1. **Start the Flask Server**:
   ```bash
   python app.py
   ```
2. **Access the Dashboard**: Open your web browser and navigate to [http://localhost:5000](http://localhost:5000).

---

## Project Structure

```
├── app.py                     # Flask backend, caching, & BeautifulSoup RSS parser
├── templates/
│   └── index.html             # Dashboard structure & Tweet composer modal
├── static/
│   ├── css/
│   │   └── styles.css         # Styling system, dark theme, & visual transitions
│   └── js/
│       └── app.js             # Client state management, filters, & modal interaction
└── .gitignore                 # Standard system & python project exclusion list
```

---

## License

This project is open-source and available under the MIT License.
