// ================================================================
// AVANT — shop.js (Phase 4 Updated)
// Reads 'avant_shopping_sync' from localStorage (set by outfit.js)
// and auto-populates the search bar + fires first search.
// ================================================================

const platformDB = [
    {
        name: "Amazon",
        color: "#FF9900",
        getUrl: (q) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}`
    },
    {
        name: "Flipkart",
        color: "#2874F0",
        getUrl: (q) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}`
    },
    {
        name: "Myntra",
        color: "#FF3F6C",
        getUrl: (q) => `https://www.myntra.com/${encodeURIComponent(q)}`
    },
    {
        name: "Ajio",
        color: "#E31837",
        getUrl: (q) => `https://www.ajio.com/search/?text=${encodeURIComponent(q)}`
    }
];

// ── Placeholder images per platform (your existing assets) ───────
const platformImgs = [
    'assets/1.jpeg',
    'assets/2.jpeg',
    'assets/3.jpeg',
    'assets/4.jpeg'
];

// ── Price simulation ──────────────────────────────────────────────
const priceBands = ['₹1,299', '₹2,499', '₹3,150', '₹4,990', '₹6,800', '₹9,200', '₹12,400'];
function fakePrice() {
    return priceBands[Math.floor(Math.random() * priceBands.length)];
}

// ================================================================
// MAIN SEARCH RENDERER
// ================================================================
function performSearch(queryOverride) {
    const searchInput = document.getElementById('shop-search');
    const query = (queryOverride || searchInput?.value || '').trim();

    if (!query) {
        alert('Please enter a style or item to search.');
        return;
    }

    // Sync search bar text so user sees what's being searched
    if (searchInput && queryOverride) searchInput.value = queryOverride;

    const resultsGrid = document.getElementById('shop-results');
    if (!resultsGrid) return;

    // Loading state
    resultsGrid.innerHTML = `
        <p class="initial-msg" style="font-style:italic;color:#bbb;">
            Scouring platforms for <em>${query}</em>...
        </p>`;

    setTimeout(() => {
        resultsGrid.innerHTML = '';

        platformDB.forEach((platform, idx) => {
            const price    = fakePrice();
            const imgSrc   = platformImgs[idx] || 'assets/1.jpeg';
            const shopLink = platform.getUrl(query);

            const box = document.createElement('div');
            box.className = 'product-box';
            box.innerHTML = `
                <span class="platform-tag">${platform.name.toUpperCase()}</span>
                <img src="${imgSrc}" alt="${query} on ${platform.name}" loading="lazy">
                <h4>${query.toUpperCase()}</h4>
                <p>${price}</p>
                <a href="${shopLink}" target="_blank" rel="noopener noreferrer" class="shop-now-btn">
                    VIEW ON ${platform.name.toUpperCase()} ↗
                </a>`;

            resultsGrid.appendChild(box);
        });

        resultsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 800);
}

// ================================================================
// OUTFIT SYNC — Read localStorage set by outfit.js
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
    const raw = localStorage.getItem('avant_shopping_sync');
    if (!raw) return; // Normal manual visit — do nothing

    try {
        const items = JSON.parse(raw);
        if (!Array.isArray(items) || items.length === 0) return;

        // Clear the sync key so it doesn't re-trigger on next manual visit
        localStorage.removeItem('avant_shopping_sync');

        // Build quick-search pill buttons banner
        const resultsSection = document.querySelector('.results-section');
        if (resultsSection) {
            const banner = document.createElement('div');
            banner.id = 'outfit-sync-banner';
            banner.style.cssText = `
                padding: 30px 5%;
                background: #f9f9f9;
                border-bottom: 1px solid #eee;
                display: flex;
                flex-direction: column;
                gap: 14px;
            `;
            banner.innerHTML = `
                <p style="
                    font-family:'Montserrat',sans-serif;
                    font-size:0.65rem;
                    font-weight:700;
                    letter-spacing:4px;
                    color:#aaa;
                    text-transform:uppercase;
                    margin:0;
                ">✦ &nbsp; FROM YOUR OUTFIT LAB</p>
                <div id="sync-pills" style="display:flex;flex-wrap:wrap;gap:10px;"></div>
            `;
            resultsSection.prepend(banner);

            // Render a pill per item
            const pillsWrap = document.getElementById('sync-pills');
            items.forEach(item => {
                if (!item || !item.trim()) return;
                const pill = document.createElement('button');
                pill.textContent = item.trim();
                pill.style.cssText = `
                    padding: 8px 18px;
                    border: 1.5px solid #000;
                    background: #fff;
                    font-family: 'Montserrat', sans-serif;
                    font-size: 0.7rem;
                    font-weight: 700;
                    letter-spacing: 1.5px;
                    text-transform: uppercase;
                    cursor: pointer;
                    transition: all 0.25s ease;
                `;
                pill.onmouseenter = () => { pill.style.background = '#000'; pill.style.color = '#fff'; };
                pill.onmouseleave = () => { pill.style.background = '#fff'; pill.style.color = '#000'; };
                pill.onclick = () => performSearch(item.trim());
                pillsWrap?.appendChild(pill);
            });
        }

        // Auto-fire search on the first item
        if (items[0]) {
            setTimeout(() => performSearch(items[0].trim()), 400);
        }

    } catch (err) {
        console.warn('Could not parse avant_shopping_sync:', err.message);
        localStorage.removeItem('avant_shopping_sync');
    }
});

// Enter key on search bar
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('shop-search');
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch();
            }
        });
    }
});