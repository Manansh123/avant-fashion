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
    },
    {
        name: "Nykaa Fashion",
        color: "#FC2779",
        getUrl: (q) => `https://www.nykaafashion.com/catalogsearch/result/?q=${encodeURIComponent(q)}`
    },
    {
        name: "TataCliq",
        color: "#E71C24",
        getUrl: (q) => `https://www.tatacliq.com/search/?searchCategory=all&text=${encodeURIComponent(q)}`
    },
    {
        name: "Snapdeal",
        color: "#E40046",
        getUrl: (q) => `https://www.snapdeal.com/search?keyword=${encodeURIComponent(q)}`
    },
    {
        name: "Meesho",
        color: "#9F2089",
        getUrl: (q) => `https://www.meesho.com/search?q=${encodeURIComponent(q)}`
    }
];

// ── Placeholder images per platform (your existing assets) ───────
const platformImgs = [
    'assets/1.jpeg',
    'assets/2.jpeg',
    'assets/3.jpeg',
    'assets/4.jpeg'
];

// ── Real price/rating/reviews — SerpApi ke through, fake number nahi banate
async function fetchRealComparison(query) {
    try {
        const res = await fetch(`/api/shop-compare?q=${encodeURIComponent(query)}`, {
            signal: AbortSignal.timeout(45000)
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        return data.results; // [{ site, available, title, price, rating, reviews, thumbnail, link }]
    } catch (err) {
        console.warn('⚠ Real comparison fetch failed, falling back to plain links:', err.message);
        return null; // caller fallback karega purane links-only mode pe
    }
}

// ================================================================
// MAIN SEARCH RENDERER
// ================================================================
let _searchToken = 0; // race-condition guard — purana search kabhi naye ko overwrite na kare

async function performSearch(queryOverride) {
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

    const myToken = ++_searchToken; // is call ka apna unique token

    // Loading state — sirf spinner bars + fashion quote (ek hi loading indicator, double nahi)
    resultsGrid.innerHTML = `
        <div class="shop-loading-state">
            <div class="loading-bars">
                <span></span><span></span><span></span><span></span><span></span>
            </div>
        </div>`;
    showFashionQuote(resultsGrid.querySelector('.shop-loading-state'));
    resultsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' }); // turant dikhao, result ka wait mat karo

    const realData = await fetchRealComparison(query);

    // Agar iske baad koi naya search shuru ho chuka hai, ye purana result discard karo
    if (myToken !== _searchToken) return;

    resultsGrid.innerHTML = '';

    if (realData) {
        renderRealComparison(resultsGrid, query, realData);
    } else {
        renderFallbackLinks(resultsGrid, query);
    }

    resultsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ================================================================
// REAL DATA RENDER — SerpApi se aaya real price/rating/reviews
// ================================================================
function renderRealComparison(resultsGrid, query, realData) {
    // Best-rated platform dhoondo — sirf raw rating compare NAHI karte
    // (5.0★ with 3 reviews vs 4.2★ with 3000 reviews — dusra zyada bharosemand hai).
    // Bayesian weighted score: kam-review wali rating ko "average" ki taraf khींचta hai.
    const available = realData.filter(r => r.available && r.rating);
    const avgRating = available.length
        ? available.reduce((sum, r) => sum + r.rating, 0) / available.length
        : 0;
    const MIN_VOTES = 50; // isse kam reviews wali rating ko kam weight milega

    function weightedScore(r) {
        const v = r.reviews || 0;
        const R = r.rating;
        return (v / (v + MIN_VOTES)) * R + (MIN_VOTES / (v + MIN_VOTES)) * avgRating;
    }

    const best = available.length
        ? available.reduce((a, b) => (weightedScore(b) > weightedScore(a) ? b : a))
        : null;

    realData.forEach((r, idx) => {
        // Backend already 2 tareeke se try kar chuka (exact + broadened query) —
        // phir bhi na mile toh us platform ka card hi mat banao, gayab kar do
        if (!r.available) return;

        const platform = platformDB[idx];
        const box = document.createElement('div');
        box.className = 'product-box';


        const isBest = best && r.site === best.site;
        box.innerHTML = `
            <span class="platform-tag">${platform.name.toUpperCase()}</span>
            ${isBest ? `<span class="best-rated-badge" title="Weighted by both rating AND review count — not just the highest star number">⭐ TOP RATED</span>` : ''}
            <img src="${r.thumbnail || platformImgs[idx % platformImgs.length]}" alt="${r.title || query}" loading="lazy">
            <h4>${(r.title || query).toUpperCase()}</h4>
            <div class="real-stats-row">
                ${r.price ? `<span class="stat-price">${r.price}</span>` : ''}
                ${r.rating ? `<span class="stat-stars">${starString(r.rating)}</span><span class="stat-rating-num">${r.rating}</span>` : ''}
            </div>
            ${r.reviews ? `<p class="stat-reviews">${r.reviews.toLocaleString('en-IN')} reviews</p>` : ''}
            <p class="real-data-note">Confirm stock, size & delivery on ${platform.name}</p>
            <a href="${r.link || platform.getUrl(query)}" target="_blank" rel="noopener noreferrer" class="shop-now-btn">
                VIEW ON ${platform.name.toUpperCase()} ↗
            </a>`;
        resultsGrid.appendChild(box);
    });

    renderComparisonChart(resultsGrid, realData);
    renderReviewsPanel(resultsGrid, realData);
}

// ── Customer Reviews panel — Amazon/Flipkart-style, real snippets se ──
function renderReviewsPanel(resultsGrid, realData) {
    const withReviews = realData
        .map((r, idx) => ({ ...r, name: platformDB[idx].name }))
        .filter(r => r.available && (r.snippets?.length || r.rating));

    if (withReviews.length === 0) return;

    const wrap = document.createElement('div');
    wrap.className = 'reviews-panel';
    wrap.innerHTML = `<p class="compare-chart-label">✦ CUSTOMER SENTIMENT ✦</p>`;

    const tabsRow = document.createElement('div');
    tabsRow.className = 'reviews-tabs';

    const panelsWrap = document.createElement('div');
    panelsWrap.className = 'reviews-panels';

    withReviews.forEach((r, i) => {
        const colors = PLATFORM_COLORS[r.name] || { line: '#333' };

        const tab = document.createElement('button');
        tab.className = 'reviews-tab' + (i === 0 ? ' active' : '');
        tab.style.setProperty('--tab-color', colors.line);
        tab.textContent = r.name;
        tab.onclick = () => {
            tabsRow.querySelectorAll('.reviews-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            panelsWrap.querySelectorAll('.reviews-panel-content').forEach(p => p.classList.remove('active'));
            document.getElementById(`rev-panel-${i}`).classList.add('active');
        };
        tabsRow.appendChild(tab);

        const panel = document.createElement('div');
        panel.className = 'reviews-panel-content' + (i === 0 ? ' active' : '');
        panel.id = `rev-panel-${i}`;

        const ratingBlock = r.rating ? `
            <div class="rp-rating-block">
                <span class="rp-rating-num">${r.rating}</span>
                <div class="rp-rating-side">
                    <span class="rp-stars" style="color:${colors.line}">${starString(r.rating)}</span>
                    <span class="rp-review-count">${r.reviews ? r.reviews.toLocaleString('en-IN') + ' ratings' : 'Rating on ' + r.name}</span>
                </div>
            </div>` : `<p class="rp-no-rating">No rating data available for this listing yet.</p>`;

        const snippetsHtml = r.snippets?.length
            ? `<div class="rp-snippets">
                ${r.snippets.map(s => `
                    <div class="rp-snippet-card">
                        ${s.rating ? `<span class="rp-snippet-stars" style="color:${colors.line}">${starString(s.rating)}</span>` : ''}
                        <p class="rp-snippet-text">"${s.text}"</p>
                        ${s.source ? `<span class="rp-snippet-source">— via ${s.source}</span>` : ''}
                    </div>`).join('')}
              </div>`
            : `<p class="rp-no-snippets">No individual review text surfaced by Google for this listing — see full reviews on ${r.name}.</p>`;

        panel.innerHTML = ratingBlock + snippetsHtml;
        panelsWrap.appendChild(panel);
    });

    wrap.appendChild(tabsRow);
    wrap.appendChild(panelsWrap);
    resultsGrid.appendChild(wrap);
}

// ── Rating number ko visual stars mein badlo (5-star scale) ────
function starString(rating) {
    const full = Math.round(rating);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
}

// ================================================================
// FALLBACK — SerpApi fail ho gaya, plain search links (jaisa pehle tha)
// ================================================================
// ── Fancy radar comparison — Price Value + Rating + Popularity, real data se ──
let _shopChartInstance = null; // purana chart destroy karne ke liye baar-baar search pe

const PLATFORM_COLORS = {
    Amazon:        { line: '#FF9900', fill: 'rgba(255,153,0,0.15)' },
    Flipkart:      { line: '#2874F0', fill: 'rgba(40,116,240,0.15)' },
    Myntra:        { line: '#FF3F6C', fill: 'rgba(255,63,108,0.15)' },
    Ajio:          { line: '#111111', fill: 'rgba(17,17,17,0.10)' },
    'Nykaa Fashion': { line: '#FC2779', fill: 'rgba(252,39,121,0.15)' },
    TataCliq:      { line: '#E71C24', fill: 'rgba(231,28,36,0.15)' },
    Snapdeal:      { line: '#E40046', fill: 'rgba(228,0,70,0.15)' },
    Meesho:        { line: '#9F2089', fill: 'rgba(159,32,137,0.15)' }
};

function renderComparisonChart(resultsGrid, realData) {
    // Sirf wahi platforms jinke paas kam se kam ek real number hai (price/rating/reviews)
    const withData = realData
        .map((r, idx) => ({ ...r, name: platformDB[idx].name }))
        .filter(r => r.available && (r.rating || r.reviews || r.price));

    if (withData.length < 2 || typeof Chart === 'undefined') return;

    // Har axis tabhi include hoga jab kam se kam 2 platforms ke paas wo data ho —
    // warna misleading zero-axis dikhega
    const havePrice  = withData.filter(r => r.price).length >= 2;
    const haveRating = withData.filter(r => r.rating).length >= 2;
    const haveReviews = withData.filter(r => r.reviews).length >= 2;

    const axes = [];
    if (havePrice)   axes.push('price');
    if (haveRating)  axes.push('rating');
    if (haveReviews) axes.push('reviews');
    if (axes.length < 2) return; // 2 se kam axes ho toh radar banta hi nahi theek se

    // Price ko normalize karo (sasta = better score), rating/reviews already 0-100 scale pe le aate
    const prices = withData.map(r => parsePrice(r.price)).filter(p => p);
    const minP = Math.min(...prices), maxP = Math.max(...prices);
    const maxReviews = Math.max(...withData.map(r => r.reviews || 0), 1);

    const axisLabels = axes.map(a => a === 'price' ? 'Price Value' : a === 'rating' ? 'Rating' : 'Popularity');

    const datasets = withData.map(r => {
        const colors = PLATFORM_COLORS[r.name] || { line: '#333', fill: 'rgba(51,51,51,0.12)' };
        const values = axes.map(a => {
            if (a === 'price') {
                const p = parsePrice(r.price);
                if (!p || maxP === minP) return 50;
                return Math.round(100 * (maxP - p) / (maxP - minP)); // sasta = 100 ke kareeb
            }
            if (a === 'rating')  return r.rating ? Math.round((r.rating / 5) * 100) : 0;
            if (a === 'reviews') return Math.round((( r.reviews || 0) / maxReviews) * 100);
            return 0;
        });
        return {
            label: r.name,
            data: values,
            borderColor: colors.line,
            backgroundColor: colors.fill,
            pointBackgroundColor: colors.line,
            borderWidth: 2,
            pointRadius: 4
        };
    });

    const chartWrap = document.createElement('div');
    chartWrap.className = 'compare-chart-wrap';
    chartWrap.innerHTML = `
        <p class="compare-chart-label">✦ PLATFORM COMPARISON — REAL DATA ✦</p>
        <div class="compare-chart-canvas-box"><canvas id="shop-compare-chart"></canvas></div>
        <p class="compare-chart-footnote">Scale: 1 (worst) to 5 (best) on each axis — outer edge = better. Price Value: cheaper scores higher. Popularity: relative review volume among matched platforms.</p>`;
    resultsGrid.appendChild(chartWrap);

    if (_shopChartInstance) _shopChartInstance.destroy();

    const ctx = document.getElementById('shop-compare-chart').getContext('2d');
    _shopChartInstance = new Chart(ctx, {
        type: 'radar',
        data: { labels: axisLabels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            font: { family: 'Montserrat' },
            plugins: {
                legend: { position: 'bottom', labels: { font: { family: 'Montserrat', size: 11 }, color: '#333', boxWidth: 12 } }
            },
            scales: {
                r: {
                    min: 0, max: 100,
                    ticks: {
                        display: true,
                        stepSize: 20,
                        backdropColor: 'transparent',
                        color: '#bbb',
                        font: { size: 10 },
                        callback: (val) => val === 0 ? '' : String(val / 20) // 20→"1", 40→"2" ... 100→"5"
                    },
                    grid: { color: '#e5e5e5' },
                    angleLines: { color: '#e5e5e5' },
                    pointLabels: { font: { family: 'Montserrat', size: 12, weight: '700' }, color: '#111' }
                }
            }
        }
    });
}

function parsePrice(priceStr) {
    if (!priceStr) return null;
    const num = parseFloat(String(priceStr).replace(/[^\d.]/g, ''));
    return isNaN(num) ? null : num;
}


function renderFallbackLinks(resultsGrid, query) {
    platformDB.forEach((platform, idx) => {
        const imgSrc   = platformImgs[idx % platformImgs.length] || 'assets/1.jpeg';
        const shopLink = platform.getUrl(query);

        const box = document.createElement('div');
        box.className = 'product-box';
        box.innerHTML = `
            <span class="platform-tag">${platform.name.toUpperCase()}</span>
            <img src="${imgSrc}" alt="${query} on ${platform.name}" loading="lazy">
            <h4>${query.toUpperCase()}</h4>
            <p class="real-data-note">Real price, reviews, sizing & stock — see on ${platform.name}</p>
            <a href="${shopLink}" target="_blank" rel="noopener noreferrer" class="shop-now-btn">
                VIEW ON ${platform.name.toUpperCase()} ↗
            </a>`;
        resultsGrid.appendChild(box);
    });
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