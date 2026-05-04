// ================================================================
// AVANT TREND.JS — Groq Free API (AI working — DO NOT CHANGE)
// ================================================================

const GROQ_API_KEY = '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';

// ================================================================
// DATA ARCHIVE
// ================================================================
const trendArchives = {
    grandpa: ["gp1.jpg", "gp2.jpg", "gp3.jpg", "gp4.jpg", "gp5.jpg"],
    streetwear: ["sl1.jpg", "sl2.jpg", "sl3.jpg", "sl4.jpg", "sl5.jpg"],
    y2k: ["y1.jpg", "y2.jpg", "y3.jpg", "y4.jpg", "y5.jpg"],
    oldmoney: ["om1.jpg", "om2.jpg", "om3.jpg", "om4.jpg", "om5.jpg"],
    academia: ["da1.jpg", "da2.jpg", "da3.jpg", "da4.jpg", "da5.jpg"],
    fluid: ["gf1.jpg", "gf2.jpg", "gf3.jpg", "gf4.jpg", "gf5.jpg"]
};

const BUILTIN_KEYS = ['grandpa', 'streetwear', 'y2k', 'oldmoney', 'academia', 'fluid'];

// ================================================================
// STORAGE LOGIC — REFINED
// ================================================================
function isLoggedIn() { return !!localStorage.getItem('avantUserName'); }

function getCurrentUserKey() {
    const user = localStorage.getItem('avantUserName');
    // Logged in: User specific key | Guest: Session specific key
    return user ? `avant_custom_trends_${user}` : `avant_guest_session`;
}

function saveCustomTrend(trendData) {
    const storage = getStorage();
    const key = getCurrentUserKey();
    const existing = JSON.parse(storage.getItem(key) || '[]');
    existing.push(trendData);
    storage.setItem(key, JSON.stringify(existing));
}

function getStorage() {
    return isLoggedIn() ? localStorage : sessionStorage;
}

function loadCustomTrends() {
    const storage = getStorage();
    const key = getCurrentUserKey();
    return JSON.parse(storage.getItem(key) || '[]');
}

// ================================================================
// DELETE TREND
// ================================================================
function deleteTrend(trendKey, isBuiltIn) {
    const confirmed = confirm("Are you sure you want to delete this trend?");
    if (!confirmed) return;

    if (isBuiltIn) {
        // Built-ins: Permanent hide only for Logged-in users
        if (isLoggedIn()) {
            const user = localStorage.getItem('avantUserName');
            const hiddenKey = `avant_hidden_builtins_${user}`;
            const hidden = JSON.parse(localStorage.getItem(hiddenKey) || '[]');
            if (!hidden.includes(trendKey)) hidden.push(trendKey);
            localStorage.setItem(hiddenKey, JSON.stringify(hidden));
        }
        const el = document.querySelector(`.matrix-item[data-trend="${trendKey}"]:not(.custom-trend)`);
        if (el) el.remove();
    } else {
        // Custom: Storage se remove (Works for both session and local)
        const storage = getStorage();
        const storageKey = getCurrentUserKey();
        let trends = JSON.parse(storage.getItem(storageKey) || '[]');
        trends = trends.filter(t => t.key !== trendKey);
        storage.setItem(storageKey, JSON.stringify(trends));

        const el = document.querySelector(`.matrix-item.custom-trend[data-trend="${trendKey}"]`);
        if (el) el.remove();
    }

    resetMatrix();
    const aiSection = document.getElementById('ai-advice-section');
    if (aiSection) aiSection.style.display = 'none';
}

function hideDeletedBuiltins() {
    if (!isLoggedIn()) return;
    const user = localStorage.getItem('avantUserName');
    const hiddenKey = `avant_hidden_builtins_${user}`;
    const hidden = JSON.parse(localStorage.getItem(hiddenKey) || '[]');
    hidden.forEach(key => {
        const el = document.querySelector(`.matrix-item[data-trend="${key}"]:not(.custom-trend)`);
        if (el) el.remove();
    });
}

function clickedOnCloseBtn(e, element) {
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const closeZoneRight = rect.width - 15;
    const closeZoneLeft = rect.width - 125;
    const closeZoneTop = 12;
    const closeZoneBottom = 50;
    return x >= closeZoneLeft && x <= closeZoneRight && y >= closeZoneTop && y <= closeZoneBottom;
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

        newBox.onclick = function (e) {
            if (this.classList.contains('active') && clickedOnCloseBtn(e, this)) {
                deleteTrend(trend.key, false);
                return;
            }
            if (this.classList.contains('active')) {
                resetMatrix();
                return;
            }
            updateTrendMatrix(this);
            getAIAdvice(trend.name);
        };

        newBox.innerHTML = `
            <div class="matrix-img"><img src="${trend.mainImage || trend.imageUrl}" alt="${trend.name}"></div>
            <div class="matrix-info"><h3>${trend.name}</h3><p>EXPLORE AI STYLIST</p></div>
            <div class="trend-gallery-view"></div>`;

        matrix.insertBefore(newBox, uploadCard);
    });
}

function attachDeleteToBuiltins() {
    BUILTIN_KEYS.forEach(key => {
        const item = document.querySelector(`.matrix-item[data-trend="${key}"]`);
        if (!item || item._deleteAttached) return;
        item._deleteAttached = true;

        item.addEventListener('click', function (e) {
            if (this.classList.contains('active') && clickedOnCloseBtn(e, this)) {
                e.stopImmediatePropagation();
                deleteTrend(key, true);
            }
        }, true);
    });
}

// ================================================================
// MATRIX TOGGLE
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

    if (trendArchives.hasOwnProperty(selectedTrend)) {
        const builtInOthers = Array.from(document.querySelectorAll('.matrix-item')).filter(item =>
            item !== clickedElement &&
            !item.classList.contains('upload-card') &&
            !item.classList.contains('custom-trend')
        );
        const photos = trendArchives[selectedTrend];
        builtInOthers.forEach((item, index) => {
            item.classList.add('is-gallery');
            const gd = item.querySelector('.trend-gallery-view');
            if (gd && photos && photos[index]) {
                gd.innerHTML = `<img src="assets/trends/${photos[index]}" class="gallery-thumb-single">`;
            }
        });
    }
}

function resetMatrix() {
    document.querySelectorAll('.matrix-item').forEach(item => {
        item.classList.remove('active', 'is-gallery');
        const gd = item.querySelector('.trend-gallery-view');
        if (gd) gd.innerHTML = '';
    });
}

// ================================================================
// MODAL & HANDLER
// ================================================================
function openUploadModal() { document.getElementById('uploadModal').style.display = 'flex'; }
function closeUploadModal() { document.getElementById('uploadModal').style.display = 'none'; }
window.onclick = (e) => { if (e.target == document.getElementById('uploadModal')) closeUploadModal(); };

function handleNewPost() {
    const trendName = document.querySelector('#uploadModal input[type="text"]').value.trim();
    const fileInput = document.getElementById('fileInput');
    
    if (!trendName || fileInput.files.length === 0) return;

    const files = Array.from(fileInput.files);
    const imagePromises = files.map(file => new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    }));

    Promise.all(imagePromises).then(base64Images => {
        const trendData = {
            name: trendName,
            key: trendName.toLowerCase().replace(/\s+/g, '') + '_' + Date.now(),
            mainImage: base64Images[0],
            imageUrl: base64Images[0],
            images: base64Images
        };
        
        saveCustomTrend(trendData);
        renderSavedTrends(); // UI update
        
        closeUploadModal();
        document.querySelector('#uploadModal input[type="text"]').value = '';
        fileInput.value = '';
    });
}

// ================================================================
// PARSE TIPS & TIPS UI
// ================================================================
function parseTipsToArray(rawText) {
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const tips = [];
    for (const line of lines) {
        if (/^\|[\s\-|]+\|$/.test(line)) continue;
        if (/^\d+[\.\)]\s+/.test(line)) {
            const tip = line.replace(/^\d+[\.\)]\s+/, '').replace(/\*\*/g, '').replace(/\*/g, '').trim();
            if (tip.length > 8) tips.push(tip);
            continue;
        }
        if (/^[\-\*•]\s+/.test(line)) {
            const tip = line.replace(/^[\-\*•]\s+/, '').replace(/\*\*/g, '').replace(/\*/g, '').trim();
            if (tip.length > 8) tips.push(tip);
        }
    }
    return tips;
}

function renderTips(style, tips) {
    const tipsHTML = tips.map((tip, i) => `
        <div style="display:flex;align-items:flex-start;gap:20px;padding:18px 0;border-bottom:1px solid #ececec;">
            <span style="font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:700;color:#d0d0d0;line-height:1;min-width:40px;flex-shrink:0;">
                ${String(i + 1).padStart(2, '0')}
            </span>
            <p style="font-family:'Montserrat',sans-serif;font-size:0.88rem;font-weight:400;color:#222;line-height:1.8;margin:0;padding-top:5px;">
                ${tip}
            </p>
        </div>`).join('');

    return `
        <div style="padding:35px 40px;background:#fff;">
            <span style="display:inline-block;background:#000;color:#fff;font-family:'Montserrat',sans-serif;font-size:0.58rem;letter-spacing:3px;padding:5px 14px;text-transform:uppercase;margin-bottom:22px;">
                ✦ &nbsp; AI GENERATED
            </span>
            <p style="font-family:'Montserrat',sans-serif;font-size:0.6rem;font-weight:700;letter-spacing:5px;color:#aaa;text-transform:uppercase;margin:0 0 6px 0;">
                STYLING GUIDE FOR
            </p>
            <h1 style="font-family:'Cormorant Garamond',serif;font-size:clamp(2.5rem,5vw,4.2rem);font-weight:700;line-height:0.88;letter-spacing:-2px;color:#000;margin:0 0 22px 0;">
                ${style}
            </h1>
            <div style="width:45px;height:3px;background:#000;margin-bottom:8px;"></div>
            ${tipsHTML}
        </div>`;
}

// ================================================================
// GROQ CALL & AI LOGIC (DO NOT CHANGE - AS REQUESTED)
// ================================================================
async function callGroq(style) {
    const prompt = `You are a fashion stylist for AVANT. Give exactly 5 styling tips for the "${style}" aesthetic for 2026. Plain text only. No markdown, no bold, no asterisks. Number each tip: 1. tip text. One tip per line. Output ONLY the 5 numbered tips.`;
    const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'];
    for (const model of models) {
        try {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
                body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 300, temperature: 0.7 }),
                signal: AbortSignal.timeout(15000)
            });
            if (res.status === 400) { continue; }
            if (!res.ok) { continue; }
            const data = await res.json();
            const text = data?.choices?.[0]?.message?.content || '';
            const tips = parseTipsToArray(text);
            if (tips.length >= 3) return tips;
        } catch (err) { if (model === models[models.length - 1]) throw err; }
    }
}

async function getAIAdvice(style) {
    const aiSection = document.getElementById('ai-advice-section');
    const responseBox = document.getElementById('ai-response-box');
    if (aiSection) { aiSection.style.display = 'block'; aiSection.scrollIntoView({ behavior: 'smooth' }); }
    responseBox.innerHTML = `<div style="text-align:center;padding:50px 20px;"><p style="font-family:'Montserrat',sans-serif;font-size:0.68rem;letter-spacing:5px;color:#aaa;text-transform:uppercase;">✦ &nbsp; Generating Style Intelligence &nbsp; ✦</p></div>`;
    try {
        const tips = await callGroq(style);
        responseBox.innerHTML = renderTips(style, tips);
    } catch (err) {
        responseBox.innerHTML = `<div style="padding:30px 40px;"><p style="color:#c00;">⚠ AI ERROR: ${err.message}</p></div>`;
    }
}

// ================================================================
// INITIALIZE
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Check if it's a reload and user is a guest
    const isReload = performance.getEntriesByType("navigation")[0].type === "reload";
    
    if (!isLoggedIn() && isReload) {
        const storage = sessionStorage; // Guest always uses session
        const key = getCurrentUserKey();
        storage.removeItem(key); // Sirf refresh par data udaao
        console.log("Guest session cleared due to refresh.");
    }

    // Initial renders
    renderSavedTrends();
    hideDeletedBuiltins();
    attachDeleteToBuiltins();
});