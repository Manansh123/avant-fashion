// ================================================================
// AVANT — SHOP YOUR LOOK
// Phase 5: Auto-syncs with Outfit Lab via localStorage / URL params.
//   - If user clicked "Shop this Look" in outfit.html, we read the
//     item list from localStorage['avant_shop_list'] and render
//     symmetric affiliate cards for every item.
//   - Otherwise, falls back to manual search.
// ================================================================

// Platforms we mirror every item across (symmetric shopping links)
const platformDB = [
    {
        name:    "Amazon",
        price:   "₹2,499",
        img:     "assets/1.jpeg",
        // Affiliate-friendly search URL pattern (placeholder)
        link:    (q) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}&tag=avant-21`
    },
    {
        name:    "Flipkart",
        price:   "₹3,150",
        img:     "assets/2.jpeg",
        link:    (q) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}&affid=avant`
    },
    {
        name:    "Myntra",
        price:   "₹4,990",
        img:     "assets/3.jpeg",
        link:    (q) => `https://www.myntra.com/${encodeURIComponent(q).replace(/%20/g, '-')}`
    },
    {
        name:    "Ajio",
        price:   "₹12,400",
        img:     "assets/4.jpeg",
        link:    (q) => `https://www.ajio.com/search/?text=${encodeURIComponent(q)}`
    }
];

// ----------------- HELPERS -----------------
function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

function readShopListFromStorage() {
    try {
        const raw = localStorage.getItem('avant_shop_list');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) return parsed;
        return null;
    } catch (e) {
        return null;
    }
}

// ----------------- RENDER -----------------
function renderProductRow(itemName, container) {
    // For one outfit item, render one row of platform cards
    const row = document.createElement('div');
    row.className = 'shop-item-row';

    row.innerHTML = `
        <h3 class="shop-item-heading">
            <span class="shop-item-label">SHOP</span>
            <span class="shop-item-name">${itemName}</span>
        </h3>
        <div class="results-grid"></div>
    `;

    const grid = row.querySelector('.results-grid');

    platformDB.forEach(item => {
        const card = document.createElement('div');
        card.className = 'product-box';
        card.innerHTML = `
            <span class="platform-tag">${item.name.toUpperCase()}</span>
            <img src="${item.img}" alt="${itemName}">
            <h4>${itemName.toUpperCase()}</h4>
            <p>${item.price}</p>
            <a href="${item.link(itemName)}" target="_blank" rel="noopener noreferrer" class="shop-now-btn">
                VIEW ON ${item.name.toUpperCase()}
            </a>
        `;
        grid.appendChild(card);
    });

    container.appendChild(row);
}

function renderLabBanner(payload) {
    const banner = document.createElement('div');
    banner.className = 'lab-sync-banner';
    banner.innerHTML = `
        <p class="editorial-label-ward">SYNCED FROM THE OUTFIT LAB</p>
        <h2 class="lab-sync-title">Your curated shopping edit</h2>
        ${payload.caption ? `<p class="lab-sync-caption">${payload.caption}</p>` : ''}
        ${payload.imageUrl ? `<img class="lab-sync-thumb" src="${payload.imageUrl}" alt="Your look">` : ''}
        <button class="clear-lab-sync" onclick="clearLabSync()">CLEAR & SEARCH MANUALLY</button>
    `;
    return banner;
}

function renderFromLab(payload) {
    const resultsGrid = document.getElementById('shop-results');
    if (!resultsGrid) return;
    resultsGrid.innerHTML = '';

    // Top banner with caption + thumb
    resultsGrid.appendChild(renderLabBanner(payload));

    // For each item Gemini extracted → render a symmetric row of platform cards
    payload.items.forEach(item => renderProductRow(item, resultsGrid));

    // Pre-fill the search box with the first item for context
    const searchInput = document.getElementById('shop-search');
    if (searchInput && payload.items[0]) searchInput.value = payload.items[0];

    // Smooth scroll
    setTimeout(() => resultsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
}

function clearLabSync() {
    try { localStorage.removeItem('avant_shop_list'); } catch (e) {}
    const resultsGrid = document.getElementById('shop-results');
    if (resultsGrid) {
        resultsGrid.innerHTML = '<p class="initial-msg">Enter a product name to begin your curation.</p>';
    }
    // Strip URL params
    if (window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, 'shop.html');
    }
}

// ----------------- MANUAL SEARCH (legacy) -----------------
function performSearch() {
    const query = document.getElementById('shop-search').value.trim();
    const resultsGrid = document.getElementById('shop-results');

    if (query === "") {
        alert("Please enter a style or item to search.");
        return;
    }

    resultsGrid.innerHTML = '<p class="initial-msg">Scouring platforms for the perfect match...</p>';

    setTimeout(() => {
        resultsGrid.innerHTML = '';
        renderProductRow(query, resultsGrid);
        resultsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 600);
}

// ----------------- AUTO-INIT (Phase 5 bridge) -----------------
document.addEventListener('DOMContentLoaded', () => {
    // Triggered from Outfit Lab?
    const fromLab = getQueryParam('fromLab');
    const labPayload = readShopListFromStorage();

    if ((fromLab || labPayload) && labPayload) {
        renderFromLab(labPayload);
    } else {
        // Manual entry path — keep default initial-msg
    }
});

// Expose
window.performSearch = performSearch;
window.clearLabSync  = clearLabSync;
