// ================================================================
// AVANT SHOP.JS — Phase 4 Update (Auto-load from Outfit Builder)
// ================================================================

const platformDB = [
    { name: "Amazon",   price: "₹2,499",  img: "assets/1.jpeg" },
    { name: "Flipkart", price: "₹3,150",  img: "assets/2.jpeg" },
    { name: "Myntra",   price: "₹4,990",  img: "assets/3.jpeg" },
    { name: "Ajio",     price: "₹12,400", img: "assets/4.jpeg" }
];

// ── ON PAGE LOAD: Check localStorage for outfit items ──────────
document.addEventListener('DOMContentLoaded', () => {
    const savedItems = localStorage.getItem('avant_shop_items');
    if (!savedItems) return;

    let itemList = [];
    try { itemList = JSON.parse(savedItems); } catch (e) { return; }

    if (!Array.isArray(itemList) || itemList.length === 0) return;

    // Clear the saved items so it doesn't persist on next visit
    localStorage.removeItem('avant_shop_items');

    // Show a banner
    showOutfitBanner(itemList);

    // Auto-render item buttons
    renderItemButtons(itemList);
});

// ── OUTFIT BANNER ──────────────────────────────────────────────
function showOutfitBanner(items) {
    const resultsSection = document.querySelector('.results-section');
    if (!resultsSection) return;

    const banner = document.createElement('div');
    banner.id = 'outfit-banner';
    banner.style.cssText = `
        background: #000; color: #fff; padding: 20px 5%; 
        font-family: 'Montserrat', sans-serif; font-size: 0.7rem;
        letter-spacing: 3px; text-transform: uppercase;
        display: flex; align-items: center; gap: 15px; flex-wrap: wrap;
    `;
    banner.innerHTML = `
        <span style="opacity:0.5;">✦ OUTFIT LAB</span>
        <span>Showing results for your generated look</span>
        <span style="opacity:0.4;">·</span>
        <span style="opacity:0.7;">${items.join(' · ')}</span>
        <button onclick="document.getElementById('outfit-banner').remove();document.getElementById('item-buttons').remove();" 
            style="margin-left:auto;background:transparent;border:1px solid #555;color:#fff;padding:5px 15px;cursor:pointer;font-family:'Montserrat',sans-serif;font-size:0.65rem;letter-spacing:2px;">
            CLEAR ×
        </button>
    `;
    resultsSection.insertBefore(banner, resultsSection.firstChild);
}

// ── ITEM QUICK-SEARCH BUTTONS ──────────────────────────────────
function renderItemButtons(items) {
    const resultsSection = document.querySelector('.results-section');
    if (!resultsSection) return;

    const btnRow = document.createElement('div');
    btnRow.id = 'item-buttons';
    btnRow.style.cssText = `
        padding: 25px 5% 10px; display: flex; flex-wrap: wrap; gap: 10px;
    `;

    items.forEach(item => {
        const btn = document.createElement('button');
        btn.textContent = item;
        btn.style.cssText = `
            padding: 10px 20px; border: 1px solid #000; background: #fff;
            font-family: 'Montserrat', sans-serif; font-size: 0.65rem;
            font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
            cursor: pointer; transition: all 0.3s ease;
        `;
        btn.onmouseenter = () => { btn.style.background = '#000'; btn.style.color = '#fff'; };
        btn.onmouseleave = () => { btn.style.background = '#fff'; btn.style.color = '#000'; };
        btn.onclick = () => {
            document.getElementById('shop-search').value = item;
            performSearch();
        };
        btnRow.appendChild(btn);
    });

    // Auto search with the first item
    resultsSection.insertBefore(btnRow, resultsSection.querySelector('.results-grid'));

    // Auto-search first item
    if (items.length > 0) {
        document.getElementById('shop-search').value = items[0];
        performSearch();
    }
}

// ── MANUAL SEARCH ──────────────────────────────────────────────
function performSearch() {
    const query = document.getElementById('shop-search').value.trim();
    const resultsGrid = document.getElementById('shop-results');

    if (query === "") {
        alert("Please enter a style or item to search.");
        return;
    }

    resultsGrid.innerHTML = `
        <p class="initial-msg" style="font-style:normal;font-size:0.8rem;letter-spacing:3px;color:#aaa;">
            SCOURING PLATFORMS...
        </p>`;

    setTimeout(() => {
        resultsGrid.innerHTML = '';

        platformDB.forEach(platform => {
            const productHTML = `
                <div class="product-box">
                    <span class="platform-tag">${platform.name.toUpperCase()}</span>
                    <img src="${platform.img}" alt="${query}" onerror="this.style.background='#f5f5f5';this.style.height='200px'">
                    <h4>${query.toUpperCase()}</h4>
                    <p>${platform.price}</p>
                    <a href="https://www.${platform.name.toLowerCase()}.com/s?k=${encodeURIComponent(query)}" 
                       target="_blank" rel="noopener" class="shop-now-btn">
                       VIEW ON ${platform.name.toUpperCase()} ↗
                    </a>
                </div>`;
            resultsGrid.innerHTML += productHTML;
        });

        resultsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 800);
}