// ----------------------------------------------------
// STATE MANAGEMENT
// ----------------------------------------------------
const state = {
    notes: [],
    filteredNotes: [],
    isLoading: false,
    searchQuery: '',
    activeCategory: 'ALL',
    sortOrder: 'desc',
    currentNote: null
};

// SVG Progress Ring constants for character counter
let circumference = 0;

// ----------------------------------------------------
// DOM ELEMENTS
// ----------------------------------------------------
const elements = {
    refreshBtn: document.getElementById('refresh-btn'),
    refreshIcon: document.getElementById('refresh-icon'),
    exportCsvBtn: document.getElementById('export-csv-btn'),
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    themeToggleIcon: document.getElementById('theme-toggle-icon'),
    backToTopBtn: document.getElementById('back-to-top-btn'),
    cacheBanner: document.getElementById('cache-banner'),
    cacheBannerText: document.getElementById('cache-banner-text'),
    cacheBannerRefresh: document.getElementById('cache-banner-refresh'),
    autoTrimBtn: document.getElementById('auto-trim-btn'),
    connectionStatus: document.getElementById('connection-status'),
    
    // Stats
    statTotal: document.getElementById('stat-total'),
    statFeatures: document.getElementById('stat-features'),
    statIssues: document.getElementById('stat-issues'),
    statDeprecations: document.getElementById('stat-deprecations'),
    statCards: document.querySelectorAll('.stat-card'),
    
    // Filters
    searchInput: document.getElementById('search-input'),
    clearSearchBtn: document.getElementById('clear-search'),
    filterTypeSelect: document.getElementById('filter-type'),
    sortOrderSelect: document.getElementById('sort-order'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),
    
    // Views
    notesGrid: document.getElementById('notes-grid'),
    skeletonLoader: document.getElementById('skeleton-loader'),
    emptyState: document.getElementById('empty-state'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    retryBtn: document.getElementById('retry-btn'),
    
    // Modal
    tweetModal: document.getElementById('tweet-modal'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    modalContextType: document.getElementById('modal-context-type'),
    modalContextDate: document.getElementById('modal-context-date'),
    modalContextText: document.getElementById('modal-context-text'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    charCounterText: document.getElementById('char-counter-text'),
    progressCircle: document.querySelector('.progress-ring__circle'),
    copyTweetBtn: document.getElementById('copy-tweet-btn'),
    publishTweetBtn: document.getElementById('publish-tweet-btn'),
    tagButtons: document.querySelectorAll('.badge-tag'),
    
    // Toast
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message')
};

// ----------------------------------------------------
// INITIALIZATION
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initProgressRing();
    setupEventListeners();
    fetchReleaseNotes(false);
});

// ----------------------------------------------------
// EVENT LISTENERS SETUP
// ----------------------------------------------------
function setupEventListeners() {
    // Refresh, Export & Theme buttons
    elements.refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    elements.retryBtn.addEventListener('click', () => fetchReleaseNotes(true));
    elements.exportCsvBtn.addEventListener('click', exportToCSV);
    elements.themeToggleBtn.addEventListener('click', toggleTheme);
    elements.backToTopBtn.addEventListener('click', scrollToTop);
    elements.cacheBannerRefresh.addEventListener('click', () => fetchReleaseNotes(true));
    elements.autoTrimBtn.addEventListener('click', handleAutoTrim);
    
    // Global keyboard & scroll listeners
    window.addEventListener('scroll', handleWindowScroll);
    window.addEventListener('keydown', handleGlobalKeydown);
    elements.tweetTextarea.addEventListener('keydown', handleComposerKeydown);
    
    // Filter & Sort inputs
    elements.searchInput.addEventListener('input', handleSearchInput);
    elements.clearSearchBtn.addEventListener('click', handleClearSearch);
    elements.filterTypeSelect.addEventListener('change', handleFilterCategoryChange);
    elements.sortOrderSelect.addEventListener('change', handleSortOrderChange);
    elements.resetFiltersBtn.addEventListener('click', resetFilters);
    
    // Stats dashboard category selection shortcut
    elements.statCards.forEach(card => {
        card.addEventListener('click', () => {
            const category = card.getAttribute('data-filter-type');
            elements.filterTypeSelect.value = category;
            handleFilterCategoryChange({ target: { value: category } });
        });
    });
    
    // Tweet Composer Modal events
    elements.closeModalBtn.addEventListener('click', closeTweetModal);
    elements.tweetTextarea.addEventListener('input', updateCharCounter);
    elements.copyTweetBtn.addEventListener('click', handleCopyTweet);
    elements.publishTweetBtn.addEventListener('click', handlePublishTweet);
    
    // Click outside modal to close
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) {
            closeTweetModal();
        }
    });
    
    // Tag insertions helpers
    elements.tagButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tag = btn.getAttribute('data-tag');
            insertHashtag(tag);
        });
    });
}

// ----------------------------------------------------
// FETCH DATA
// ----------------------------------------------------
async function fetchReleaseNotes(force = false) {
    if (state.isLoading) return;
    
    setLoadingState(true);
    
    try {
        const url = `/api/release-notes${force ? '?force=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        state.notes = data.notes || [];
        
        // Update connection display status
        setOnlineStatus(true);
        
        // Manage cache warning banner status
        if (data.source === 'cache' || data.source === 'cache_fallback') {
            const minutesAgo = Math.round((Date.now() / 1000 - data.last_fetched) / 60);
            const timeText = minutesAgo <= 0 ? 'just now' : `${minutesAgo} minute${minutesAgo !== 1 ? 's' : ''} ago`;
            if (data.source === 'cache_fallback') {
                elements.cacheBannerText.textContent = `Connection Offline: Showing cached notes from ${timeText}.`;
            } else {
                elements.cacheBannerText.textContent = `Showing cached notes synced ${timeText}.`;
            }
            elements.cacheBanner.style.display = 'flex';
        } else {
            elements.cacheBanner.style.display = 'none';
        }
        
        // Recalculate stats counters & populate dashboard
        updateStatsCounters();
        
        // Filter, sort & render notes list
        applyFiltersAndRender();
        
        // Display toast when manual refresh completes
        if (force) {
            showToast("Release notes refreshed!", "success");
        }
    } catch (error) {
        console.error("Error fetching release notes:", error);
        setOnlineStatus(false);
        
        // If we don't have notes in the app state yet, show full screen error
        if (state.notes.length === 0) {
            showErrorState(error.message);
        } else {
            elements.cacheBannerText.textContent = "Offline Mode: Showing locally cached notes due to connection error.";
            elements.cacheBanner.style.display = 'flex';
            showToast("Failed to sync latest updates. Showing cached version.", "error");
        }
    } finally {
        setLoadingState(false);
    }
}

// ----------------------------------------------------
// UI STATE TOGGLES
// ----------------------------------------------------
function setLoadingState(loading) {
    state.isLoading = loading;
    
    if (loading) {
        elements.refreshIcon.classList.add('spinning');
        elements.refreshBtn.disabled = true;
        
        // Render skeletons
        renderSkeletons();
        elements.skeletonLoader.style.display = 'grid';
        elements.notesGrid.style.display = 'none';
        elements.emptyState.style.display = 'none';
        elements.errorState.style.display = 'none';
    } else {
        elements.refreshIcon.classList.remove('spinning');
        elements.refreshBtn.disabled = false;
        elements.skeletonLoader.style.display = 'none';
    }
}

function setOnlineStatus(online) {
    const dot = elements.connectionStatus.querySelector('.status-dot');
    const text = elements.connectionStatus.querySelector('.status-text');
    
    if (online) {
        dot.classList.remove('offline');
        text.textContent = 'Connected';
    } else {
        dot.classList.add('offline');
        text.textContent = 'Offline';
    }
}

function showErrorState(message) {
    elements.errorMessage.textContent = message || "We couldn't connect to the server to fetch BigQuery release notes.";
    elements.notesGrid.style.display = 'none';
    elements.emptyState.style.display = 'none';
    elements.errorState.style.display = 'block';
}

// ----------------------------------------------------
// RENDERING FUNCTIONS
// ----------------------------------------------------
function renderSkeletons() {
    let skeletonsHtml = '';
    for (let i = 0; i < 6; i++) {
        skeletonsHtml += `
            <div class="skeleton-card">
                <div class="skeleton-header">
                    <div class="skeleton-badge skeleton-pulse"></div>
                    <div class="skeleton-date skeleton-pulse"></div>
                </div>
                <div class="skeleton-body">
                    <div class="skeleton-line long skeleton-pulse"></div>
                    <div class="skeleton-line medium skeleton-pulse"></div>
                    <div class="skeleton-line short skeleton-pulse"></div>
                </div>
                <div class="skeleton-footer">
                    <div class="skeleton-btn skeleton-pulse"></div>
                    <div class="skeleton-link skeleton-pulse"></div>
                </div>
            </div>
        `;
    }
    elements.skeletonLoader.innerHTML = skeletonsHtml;
}

function applyFiltersAndRender() {
    const query = state.searchQuery.toLowerCase().trim();
    const category = state.activeCategory;
    const order = state.sortOrder;
    
    // Filter by type and search query
    state.filteredNotes = state.notes.filter(note => {
        // 1. Category Filter
        const matchesCategory = (category === 'ALL') || 
                               (category === 'Other' && !['Feature', 'Issue', 'Deprecation'].includes(note.type)) || 
                               (note.type === category);
                               
        // 2. Search Query Filter
        const matchesSearch = !query || 
                              note.date.toLowerCase().includes(query) ||
                              note.type.toLowerCase().includes(query) ||
                              note.text.toLowerCase().includes(query);
                              
        return matchesCategory && matchesSearch;
    });
    
    // Sort
    state.filteredNotes.sort((a, b) => {
        // Clean up date comparison based on string values
        const dateA = a.updated || '';
        const dateB = b.updated || '';
        if (order === 'desc') {
            return dateB.localeCompare(dateA);
        } else {
            return dateA.localeCompare(dateB);
        }
    });
    
    renderNotesList();
}

function renderNotesList() {
    if (state.filteredNotes.length === 0) {
        elements.notesGrid.style.display = 'none';
        elements.emptyState.style.display = 'block';
        return;
    }
    
    elements.emptyState.style.display = 'none';
    elements.errorState.style.display = 'none';
    
    let html = '';
    state.filteredNotes.forEach(note => {
        const typeClass = getCategoryClass(note.type);
        const badgeIcon = getCategoryIcon(note.type);
        
        // Make links open in new tab and apply styled custom icons to external links
        // Highlight search query segments in text nodes safely
        let stylizedContent = highlightSearchText(note.content, state.searchQuery);
        
        html += `
            <article class="note-card ${typeClass}" data-id="${note.id}">
                <div class="card-header-meta">
                    <span class="badge badge-${typeClass}">
                        <i class="${badgeIcon}"></i> ${note.type}
                    </span>
                    <span class="card-date">${note.date}</span>
                </div>
                <div class="card-body">
                    ${stylizedContent}
                </div>
                <div class="card-footer">
                    <div class="card-footer-buttons">
                        <button class="btn btn-secondary btn-icon tweet-card-btn" onclick="openTweetComposer('${note.id}')" title="Tweet about this update">
                            <i class="fa-brands fa-x-twitter"></i> Tweet
                        </button>
                        <button class="btn btn-secondary btn-icon copy-card-btn" onclick="copyNoteToClipboard('${note.id}')" title="Copy update content">
                            <i class="fa-solid fa-copy"></i> Copy
                        </button>
                    </div>
                    <a href="${note.link}" target="_blank" rel="noopener noreferrer" class="source-anchor">
                        Docs <i class="fa-solid fa-up-right-from-square"></i>
                    </a>
                </div>
            </article>
        `;
    });
    
    elements.notesGrid.innerHTML = html;
    
    // Inject target="_blank" and external link icons to all card links safely
    const cardLinks = elements.notesGrid.querySelectorAll('.card-body a');
    cardLinks.forEach(link => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        if (!link.querySelector('.external-link-icon')) {
            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-arrow-up-right-from-square external-link-icon';
            link.appendChild(icon);
        }
    });
    elements.notesGrid.style.display = 'grid';
}

// Helper classes mapping
function getCategoryClass(type) {
    if (!type) return 'other';
    const t = type.toLowerCase();
    if (t.includes('feature')) return 'feature';
    if (t.includes('issue')) return 'issue';
    if (t.includes('deprecation')) return 'deprecation';
    return 'other';
}

function getCategoryIcon(type) {
    if (!type) return 'fa-solid fa-circle-info';
    const t = type.toLowerCase();
    if (t.includes('feature')) return 'fa-solid fa-star';
    if (t.includes('issue')) return 'fa-solid fa-triangle-exclamation';
    if (t.includes('deprecation')) return 'fa-solid fa-ban';
    return 'fa-solid fa-circle-info';
}

// ----------------------------------------------------
// FILTER & SEARCH HANDLING
// ----------------------------------------------------
function handleSearchInput(e) {
    state.searchQuery = e.target.value;
    if (state.searchQuery) {
        elements.clearSearchBtn.style.display = 'block';
    } else {
        elements.clearSearchBtn.style.display = 'none';
    }
    applyFiltersAndRender();
}

function handleClearSearch() {
    elements.searchInput.value = '';
    state.searchQuery = '';
    elements.clearSearchBtn.style.display = 'none';
    applyFiltersAndRender();
}

function handleFilterCategoryChange(e) {
    const val = e.target.value;
    state.activeCategory = val;
    elements.filterTypeSelect.value = val;
    
    // Highlight dashboard stat card
    elements.statCards.forEach(card => {
        const type = card.getAttribute('data-filter-type');
        if (type === val) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
    
    applyFiltersAndRender();
}

function handleSortOrderChange(e) {
    state.sortOrder = e.target.value;
    applyFiltersAndRender();
}

function resetFilters() {
    elements.searchInput.value = '';
    state.searchQuery = '';
    elements.clearSearchBtn.style.display = 'none';
    
    elements.filterTypeSelect.value = 'ALL';
    state.activeCategory = 'ALL';
    
    elements.sortOrderSelect.value = 'desc';
    state.sortOrder = 'desc';
    
    elements.statCards.forEach(card => {
        const type = card.getAttribute('data-filter-type');
        if (type === 'ALL') card.classList.add('active');
        else card.classList.remove('active');
    });
    
    applyFiltersAndRender();
}

// ----------------------------------------------------
// STATS CALCULATIONS
// ----------------------------------------------------
function updateStatsCounters() {
    const counts = {
        total: state.notes.length,
        features: 0,
        issues: 0,
        deprecations: 0
    };
    
    state.notes.forEach(note => {
        const typeClass = getCategoryClass(note.type);
        if (typeClass === 'feature') counts.features++;
        else if (typeClass === 'issue') counts.issues++;
        else if (typeClass === 'deprecation') counts.deprecations++;
    });
    
    elements.statTotal.textContent = counts.total;
    elements.statFeatures.textContent = counts.features;
    elements.statIssues.textContent = counts.issues;
    elements.statDeprecations.textContent = counts.deprecations;
}

// ----------------------------------------------------
// TWEET MODAL COMPOSER LOGIC
// ----------------------------------------------------
function initProgressRing() {
    const radius = elements.progressCircle.r.baseVal.value;
    circumference = radius * 2 * Math.PI;
    
    elements.progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    elements.progressCircle.style.strokeDashoffset = circumference;
}

function setProgress(percent) {
    const offset = circumference - (percent / 100 * circumference);
    elements.progressCircle.style.strokeDashoffset = Math.max(0, offset);
}

window.openTweetComposer = function(noteId) {
    const note = state.notes.find(n => n.id === noteId);
    if (!note) return;
    
    state.currentNote = note;
    
    // Set preview details
    elements.modalContextType.className = `context-badge badge-${getCategoryClass(note.type)}`;
    elements.modalContextType.textContent = note.type;
    elements.modalContextDate.textContent = note.date;
    elements.modalContextText.textContent = note.text;
    
    // Preconstruct tweet text
    const defaultTweet = generateTweetContent(note);
    elements.tweetTextarea.value = defaultTweet;
    
    // Update length indicators
    updateCharCounter();
    
    // Display modal
    elements.tweetModal.style.display = 'flex';
    elements.tweetTextarea.focus();
};

function generateTweetContent(note) {
    const header = `📢 #BigQuery Release (${note.date})\n`;
    const typeLabel = `Category: ${note.type}\n\n`;
    
    // Google release note links lead directly to their anchors
    const rawLink = note.link || 'https://docs.cloud.google.com/bigquery/docs/release-notes';
    const link = `\n\nRead more: ${rawLink}`;
    
    // Twitter handles URLs as 23 characters internally. Let's calculate local character budgets.
    // Length budget: 280 total characters
    // Reserved = header + typeLabel + link.
    // Textarea counts the actual length of the URL, so to keep the local character counter happy,
    // we calculate the text truncation based on the length of the string in the textbox.
    const budget = 280 - header.length - typeLabel.length - link.length;
    
    let textSnippet = note.text;
    if (textSnippet.length > budget) {
        textSnippet = textSnippet.slice(0, budget - 3) + "...";
    }
    
    return `${header}${typeLabel}${textSnippet}${link}`;
}

function updateCharCounter() {
    const text = elements.tweetTextarea.value;
    
    // Correctly calculate characters for Twitter representation
    // (A URL in tweet text takes up exactly 23 characters on X, but in the composer we show full text length).
    // Let's do a basic character count. The browser intent supports up to 280 total characters.
    const textLength = text.length;
    const maxChars = 280;
    const remaining = maxChars - textLength;
    
    elements.charCounterText.textContent = remaining;
    
    // Calculate percentage
    const percent = Math.min(100, (textLength / maxChars) * 100);
    setProgress(percent);
    
    // Update color states
    if (remaining < 0) {
        elements.progressCircle.style.stroke = 'var(--color-deprecation)';
        elements.charCounterText.className = 'danger';
        elements.publishTweetBtn.disabled = true;
        elements.autoTrimBtn.style.display = 'inline-block';
    } else if (remaining <= 30) {
        elements.progressCircle.style.stroke = 'var(--color-issue)';
        elements.charCounterText.className = 'warning';
        elements.publishTweetBtn.disabled = false;
        elements.autoTrimBtn.style.display = 'none';
    } else {
        elements.progressCircle.style.stroke = 'var(--twitter-color)';
        elements.charCounterText.className = '';
        elements.publishTweetBtn.disabled = false;
        elements.autoTrimBtn.style.display = 'none';
    }
}

function insertHashtag(tag) {
    const textarea = elements.tweetTextarea;
    const currentText = textarea.value;
    
    // Simple insertion at current cursor or at the end
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    
    if (currentText.includes(tag)) {
        showToast("Hashtag already added!", "error");
        return;
    }
    
    let newText = "";
    if (startPos !== undefined) {
        newText = currentText.substring(0, startPos) + ` ${tag} ` + currentText.substring(endPos, currentText.length);
    } else {
        newText = currentText + ` ${tag}`;
    }
    
    // Clean double spaces
    textarea.value = newText.replace(/\s+/g, ' ').trim();
    updateCharCounter();
    textarea.focus();
}

function closeTweetModal() {
    elements.tweetModal.style.display = 'none';
    state.currentNote = null;
}

function handleCopyTweet() {
    const tweetText = elements.tweetTextarea.value;
    
    navigator.clipboard.writeText(tweetText)
        .then(() => {
            showToast("Tweet copied to clipboard!", "success");
        })
        .catch(err => {
            console.error("Failed to copy text: ", err);
            showToast("Failed to copy text.", "error");
        });
}

function handlePublishTweet() {
    const tweetText = elements.tweetTextarea.value;
    if (tweetText.length > 280) {
        showToast("Tweet exceeds the 280-character limit!", "error");
        return;
    }
    
    const xShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(xShareUrl, '_blank', 'noopener,noreferrer');
    closeTweetModal();
}

// ----------------------------------------------------
// TOAST NOTIFICATIONS
// ----------------------------------------------------
let toastTimeout;
function showToast(message, type = 'success') {
    clearTimeout(toastTimeout);
    
    elements.toastMessage.textContent = message;
    elements.toast.style.display = 'flex';
    
    const icon = elements.toast.querySelector('.toast-icon');
    if (type === 'success') {
        elements.toast.style.backgroundColor = '#10b981';
        icon.className = 'fa-solid fa-circle-check toast-icon';
    } else {
        elements.toast.style.backgroundColor = 'var(--color-deprecation)';
        icon.className = 'fa-solid fa-circle-xmark toast-icon';
    }
    
    toastTimeout = setTimeout(() => {
        elements.toast.style.display = 'none';
    }, 4000);
}

// ----------------------------------------------------
// COPY & EXPORT UTILITIES
// ----------------------------------------------------
window.copyNoteToClipboard = function(noteId) {
    const note = state.notes.find(n => n.id === noteId);
    if (!note) return;
    
    const copyText = `📢 [BigQuery Update - ${note.date}] (${note.type})\n\n${note.text}\n\nRead more: ${note.link}`;
    
    navigator.clipboard.writeText(copyText)
        .then(() => {
            showToast("Copied to clipboard!", "success");
        })
        .catch(err => {
            console.error("Failed to copy: ", err);
            showToast("Failed to copy content.", "error");
        });
};

function exportToCSV() {
    if (state.filteredNotes.length === 0) {
        showToast("No release notes available to export.", "error");
        return;
    }
    
    // Helper to escape values for CSV compatibility
    const escapeCSV = (val) => {
        if (val === null || val === undefined) return '';
        let formatted = val.toString().replace(/"/g, '""');
        if (formatted.includes(',') || formatted.includes('\n') || formatted.includes('"')) {
            formatted = `"${formatted}"`;
        }
        return formatted;
    };
    
    // CSV Columns
    const headers = ['Date', 'Category', 'Update Content', 'Source Link'];
    const rows = state.filteredNotes.map(note => [
        note.date,
        note.type,
        note.text,
        note.link
    ]);
    
    // Construct CSV string
    const csvContent = [
        headers.map(escapeCSV).join(','),
        ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\r\n');
    
    // Trigger browser download
    try {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        
        // Dynamic filename containing date and count
        const categoryTag = state.activeCategory !== 'ALL' ? `_${state.activeCategory.toLowerCase()}` : '';
        const dateStr = new Date().toISOString().slice(0, 10);
        
        link.setAttribute("href", url);
        link.setAttribute("download", `bigquery_release_notes${categoryTag}_${dateStr}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast(`Exported ${state.filteredNotes.length} notes to CSV!`, "success");
    } catch (error) {
        console.error("CSV export failed: ", error);
        showToast("Failed to export CSV.", "error");
    }
}

// ----------------------------------------------------
// THEME SWITCHING (LIGHT/DARK)
// ----------------------------------------------------
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        elements.themeToggleIcon.className = 'fa-solid fa-moon';
        elements.themeToggleBtn.title = 'Switch to Dark Mode';
    } else {
        document.body.classList.remove('light-mode');
        elements.themeToggleIcon.className = 'fa-solid fa-sun';
        elements.themeToggleBtn.title = 'Switch to Light Mode';
    }
}

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-mode');
    
    if (isLight) {
        elements.themeToggleIcon.className = 'fa-solid fa-moon';
        elements.themeToggleBtn.title = 'Switch to Dark Mode';
        localStorage.setItem('theme', 'light');
        showToast("Switched to Light Mode!", "success");
    } else {
        elements.themeToggleIcon.className = 'fa-solid fa-sun';
        elements.themeToggleBtn.title = 'Switch to Light Mode';
        localStorage.setItem('theme', 'dark');
        showToast("Switched to Dark Mode!", "success");
    }
}

// ----------------------------------------------------
// UX ENHANCEMENTS AND UTILITY FUNCTIONS
// ----------------------------------------------------

// Safe HTML search query highlighter
function highlightSearchText(htmlContent, query) {
    if (!query) return htmlContent;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    
    function traverse(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            if (regex.test(text)) {
                const span = document.createElement('span');
                span.innerHTML = text.replace(regex, '<mark class="highlight">$1</mark>');
                node.parentNode.replaceChild(span, node);
            }
        } else {
            const children = Array.from(node.childNodes);
            children.forEach(traverse);
        }
    }
    
    traverse(doc.body);
    return doc.body.innerHTML;
}

// Back to top scroll handlers
function handleWindowScroll() {
    if (window.scrollY > 400) {
        elements.backToTopBtn.style.display = 'flex';
    } else {
        elements.backToTopBtn.style.display = 'none';
    }
}

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Keyboard accessibility handlers
function handleGlobalKeydown(e) {
    // Close composer modal on Escape
    if (e.key === 'Escape' && elements.tweetModal.style.display === 'flex') {
        closeTweetModal();
    }
}

// Keyboard composer listener
function handleComposerKeydown(e) {
    // Submit tweet on Ctrl+Enter or Cmd+Enter
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handlePublishTweet();
    }
}

// Safe auto-trim tweet content helper
function handleAutoTrim() {
    const currentText = elements.tweetTextarea.value;
    const linkMarker = "\n\nRead more: ";
    const linkIndex = currentText.lastIndexOf(linkMarker);
    
    if (linkIndex === -1) {
        elements.tweetTextarea.value = currentText.slice(0, 280);
    } else {
        const linkPart = currentText.substring(linkIndex);
        const textPart = currentText.substring(0, linkIndex);
        const targetTextLen = 280 - linkPart.length;
        
        if (targetTextLen > 3) {
            elements.tweetTextarea.value = textPart.slice(0, targetTextLen - 3) + "..." + linkPart;
        } else {
            elements.tweetTextarea.value = currentText.slice(0, 280);
        }
    }
    updateCharCounter();
    showToast("Tweet auto-trimmed to fit limit!", "success");
}
