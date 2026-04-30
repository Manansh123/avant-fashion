// 1. Data Archive for Built-in Trends
const trendArchives = {
    grandpa: ["gp1.jpg", "gp2.jpg", "gp3.jpg", "gp4.jpg", "gp5.jpg"],
    streetwear: ["sl1.jpg", "sl2.jpg", "sl3.jpg", "sl4.jpg", "sl5.jpg"],
    y2k: ["y1.jpg", "y2.jpg", "y3.jpg", "y4.jpg", "y5.jpg"],
    oldmoney: ["om1.jpg", "om2.jpg", "om3.jpg", "om4.jpg", "om5.jpg"],
    academia: ["da1.jpg", "da2.jpg", "da3.jpg", "da4.jpg", "da5.jpg"],
    fluid: ["gf1.jpg", "gf2.jpg", "gf3.jpg", "gf4.jpg", "gf5.jpg"]
};

// ================================================================
// STORAGE
// ================================================================
function isLoggedIn() {
    return !!localStorage.getItem('avantUserName');
}
function getCurrentUserKey() {
    const userName = localStorage.getItem('avantUserName') || 'guest';
    return `avant_custom_trends_${userName}`;
}
function getStorage() {
    return isLoggedIn() ? localStorage : sessionStorage;
}
function saveCustomTrend(trendData) {
    const key = getCurrentUserKey();
    const storage = getStorage();
    const existing = JSON.parse(storage.getItem(key) || '[]');
    existing.push(trendData);
    storage.setItem(key, JSON.stringify(existing));
}
function loadCustomTrends() {
    const key = getCurrentUserKey();
    return JSON.parse(getStorage().getItem(key) || '[]');
}

// ================================================================
// RENDER SAVED TRENDS
// ================================================================
function renderSavedTrends() {
    const savedTrends = loadCustomTrends();
    const matrix = document.getElementById('styleMatrix');
    const uploadCard = document.querySelector('.upload-card');
    document.querySelectorAll('.matrix-item.custom-trend').forEach(el => el.remove());

    savedTrends.forEach(trend => {
        const newBox = document.createElement('div');
        newBox.className = 'matrix-item custom-trend';
        newBox.setAttribute('data-trend', trend.key);
        newBox.onclick = function () {
            updateTrendMatrix(this);
            getAIAdvice(trend.name);
        };
        newBox.innerHTML = `
            <div class="matrix-img"><img src="${trend.imageUrl}" alt="${trend.name}"></div>
            <div class="matrix-info">
                <h3>${trend.name}</h3>
                <p>EXPLORE AI STYLIST</p>
            </div>
            <div class="trend-gallery-view"></div>
        `;
        matrix.insertBefore(newBox, uploadCard);
    });
}

// ================================================================
// MAIN TOGGLE
// ================================================================
function updateTrendMatrix(clickedElement) {
    const selectedTrend = clickedElement.getAttribute('data-trend');
    if (!selectedTrend) return;

    if (clickedElement.classList.contains('active')) {
        resetMatrix();
        return;
    }

    resetMatrix();
    clickedElement.classList.add('active');

    const isBuiltIn = trendArchives.hasOwnProperty(selectedTrend);

    if (isBuiltIn) {
        const builtInOthers = Array.from(document.querySelectorAll('.matrix-item')).filter(item =>
            item !== clickedElement &&
            !item.classList.contains('upload-card') &&
            !item.classList.contains('custom-trend')
        );
        const photos = trendArchives[selectedTrend];
        builtInOthers.forEach((item, index) => {
            item.classList.add('is-gallery');
            const galleryDiv = item.querySelector('.trend-gallery-view');
            if (galleryDiv && photos && photos[index]) {
                galleryDiv.innerHTML = `<img src="assets/trends/${photos[index]}" class="gallery-thumb-single">`;
            }
        });
    }
}

function resetMatrix() {
    document.querySelectorAll('.matrix-item').forEach(item => {
        item.classList.remove('active', 'is-gallery');
        const galleryDiv = item.querySelector('.trend-gallery-view');
        if (galleryDiv) galleryDiv.innerHTML = '';
    });
}

// ================================================================
// MODAL
// ================================================================
function openUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) modal.style.display = 'flex';
}
function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) modal.style.display = 'none';
}
window.onclick = function (event) {
    const modal = document.getElementById('uploadModal');
    if (event.target == modal) closeUploadModal();
};
function handleNewPost() {
    const trendName = document.querySelector('#uploadModal input[type="text"]').value.trim();
    const fileInput = document.getElementById('fileInput');
    if (!trendName || !fileInput.files[0]) {
        alert("Please enter a name and select an image first!");
        return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
        const trendData = {
            name: trendName,
            key: trendName.toLowerCase().replace(/\s+/g, ''),
            imageUrl: e.target.result
        };
        saveCustomTrend(trendData);
        renderSavedTrends();
        const msg = isLoggedIn() ? "your account (permanent)" : "this session only — login to save permanently";
        alert(`"${trendName}" saved to ${msg}!`);
        closeUploadModal();
        document.querySelector('#uploadModal input[type="text"]').value = '';
        fileInput.value = '';
    };
    reader.readAsDataURL(fileInput.files[0]);
}

// ================================================================
// PARSE TIPS — har ek tip alag element banega
// Handles: "1. tip", "1) tip", "- tip", "• tip", plain lines
// ================================================================
function parseTipsToArray(rawText) {
    // Pehle newline se split karo
    let lines = rawText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 5);

    // Agar sirf 1 line mili (sab ek mein hai), period se split karo
    if (lines.length <= 1) {
        lines = rawText
            .split(/\.\s+/)
            .map(line => line.trim())
            .filter(line => line.length > 5);
    }

    // Number aur bullet prefix strip karo
    const cleanLines = lines.map(line =>
        line
            .replace(/^\d+[\.\)]\s*/, '')   // "1. " ya "1) "
            .replace(/^[\-\*•]\s*/, '')      // "- " ya "• "
            .replace(/\.$/, '')              // trailing period
            .trim()
    ).filter(line => line.length > 5);

    return cleanLines;
}

// ================================================================
// AI ADVICE
// ================================================================
async function getAIAdvice(style) {
    const aiSection = document.getElementById('ai-advice-section');
    const responseBox = document.getElementById('ai-response-box');

    if (aiSection) {
        aiSection.style.display = "block";
        aiSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Loading state
    responseBox.innerHTML = `
        <div style="text-align:center; padding: 50px 20px;">
            <p style="
                font-family: 'Montserrat', sans-serif;
                font-size: 0.7rem;
                letter-spacing: 5px;
                color: #aaa;
                text-transform: uppercase;
            ">✦ &nbsp; Generating Style Intelligence &nbsp; ✦</p>
        </div>
    `;

    try {
        const response = await fetch('/api/style-advice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ styleType: style })
        });

        if (!response.ok) throw new Error(`Server error: ${response.status}`);

        const data = await response.json();

        // Source badge
        const sourceBadge = data.isAI
            ? `<span style="
                display: inline-block;
                background: #000;
                color: #fff;
                font-family: 'Montserrat', sans-serif;
                font-size: 0.6rem;
                letter-spacing: 3px;
                padding: 5px 12px;
                text-transform: uppercase;
                margin-bottom: 20px;
              ">✦ AI GENERATED</span>`
            : `<span style="
                display: inline-block;
                background: #f0f0f0;
                color: #6e6e6e;
                font-family: 'Montserrat', sans-serif;
                font-size: 0.6rem;
                letter-spacing: 3px;
                padding: 5px 12px;
                text-transform: uppercase;
                margin-bottom: 20px;
              ">CURATED TIPS</span>`;

        // Parse tips into array — EACH TIP SEPARATE
        const tips = parseTipsToArray(data.advice);

        // Build each tip as its own styled block
        const tipsHTML = tips.map((tip, i) => `
            <div style="
                display: flex;
                align-items: flex-start;
                gap: 18px;
                padding: 18px 0;
                border-bottom: 1px solid #cacaca;
            ">
                <span style="
                    font-family: 'Cormorant Garamond', serif;
                    font-size: 1.8rem;
                    font-weight: 700;
                    color: #909090;
                    line-height: 1;
                    min-width: 30px;
                ">${String(i + 1).padStart(2, '0')}</span>
                <p style="
                    font-family: 'Montserrat', sans-serif;
                    font-size: 0.9rem;
                    font-weight: 400;
                    color: #333;
                    line-height: 1.7;
                    margin: 0;
                    padding-top: 4px;
                ">${tip}</p>
            </div>
        `).join('');

        responseBox.innerHTML = `
            <div style="padding: 35px 40px; text-align: left; background: #fff;">

                ${sourceBadge}

                <p style="
                    font-family: 'Montserrat', sans-serif;
                    font-size: 0.6rem;
                    font-weight: 700;
                    letter-spacing: 5px;
                    color: #909090;
                    text-transform: uppercase;
                    margin: 0 0 8px 0;
                ">STYLING GUIDE FOR</p>

                <h1 style="
                    font-family: 'Cormorant Garamond', serif;
                    font-size: clamp(2.8rem, 5vw, 4.5rem);
                    font-weight: 700;
                    line-height: 0.85;
                    letter-spacing: -2px;
                    color: #000;
                    margin: 0 0 8px 0;
                ">${style}</h1>

                <div style="
                    width: 50px;
                    height: 3px;
                    background: #000;
                    margin: 20px 0 5px 0;
                "></div>

                <div>${tipsHTML}</div>

            </div>
        `;

    } catch (err) {
        console.error("Frontend AI error:", err.message);
        responseBox.innerHTML = `
            <div style="padding: 30px; font-family: 'Montserrat', sans-serif;">
                <p style="color: #c00; font-size: 0.8rem; letter-spacing: 1px;">
                    ⚠ ${err.message}
                </p>
            </div>
        `;
    }
}

// ================================================================
// PAGE LOAD
// ================================================================
document.addEventListener('DOMContentLoaded', function () {
    renderSavedTrends();
});