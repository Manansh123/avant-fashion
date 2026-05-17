// ================================================================
// AVANT TREND.JS — Phase 3 (Cloudinary Upload + Groq AI)
// ================================================================

const GROQ_API_KEY = process.env.GROQ_API_KEY; 

const trendArchives = {
    grandpa:   ["gp1.jpg","gp2.jpg","gp3.jpg","gp4.jpg","gp5.jpg"],
    streetwear:["sl1.jpg","sl2.jpg","sl3.jpg","sl4.jpg","sl5.jpg"],
    y2k:       ["y1.jpg","y2.jpg","y3.jpg","y4.jpg","y5.jpg"],
    oldmoney:  ["om1.jpg","om2.jpg","om3.jpg","om4.jpg","om5.jpg"],
    academia:  ["da1.jpg","da2.jpg","da3.jpg","da4.jpg","da5.jpg"],
    fluid:     ["gf1.jpg","gf2.jpg","gf3.jpg","gf4.jpg","gf5.jpg"]
};

const BUILTIN_KEYS = Object.keys(trendArchives);
const GUEST_KEY = 'avant_guest_trends';
const SESSION_FLAG = 'avant_session_alive';

// ================================================================
// AUTH HELPERS
// ================================================================
function isLoggedIn() { return !!localStorage.getItem('avantUserName'); }
function getUsername() { return localStorage.getItem('avantUserName') || null; }

// ================================================================
// GUEST REFRESH CLEAR
// sessionStorage flag trick — refresh pe guest data clear
// ================================================================
function clearGuestOnRefresh() {
    if (isLoggedIn()) return;
    const alive = sessionStorage.getItem(SESSION_FLAG);
    if (alive) {
        localStorage.removeItem(GUEST_KEY);
        console.log('🧹 Guest trends cleared on refresh');
    }
    sessionStorage.setItem(SESSION_FLAG, 'true');
}

// ================================================================
// STORAGE — guest localStorage (cleared on refresh), user = DB
// ================================================================
function saveGuestTrend(trendData) {
    const existing = JSON.parse(localStorage.getItem(GUEST_KEY) || '[]');
    existing.push(trendData);
    localStorage.setItem(GUEST_KEY, JSON.stringify(existing));
}

function loadGuestTrends() {
    return JSON.parse(localStorage.getItem(GUEST_KEY) || '[]');
}

function removeGuestTrend(trendKey) {
    let trends = JSON.parse(localStorage.getItem(GUEST_KEY) || '[]');
    trends = trends.filter(t => t.key !== trendKey);
    localStorage.setItem(GUEST_KEY, JSON.stringify(trends));
}

// ================================================================
// LOAD TRENDS — guest from localStorage, user from DB
// ================================================================
async function loadAllCustomTrends() {
    if (!isLoggedIn()) return loadGuestTrends();

    try {
        const res = await fetch('/api/my-trends', {
            headers: { 'x-username': getUsername() }
        });
        const data = await res.json();
        if (data.success) {
            // Map DB format to local format
            return data.trends.map(t => ({
                key:      t._id,       // MongoDB _id use as key
                name:     t.name,
                imageUrl: t.imageUrl,
                dbId:     t._id,       // For delete API call
                isDb:     true
            }));
        }
    } catch (err) {
        console.error('Failed to load user trends:', err);
    }
    return [];
}

// ================================================================
// RENDER SAVED TRENDS
// ================================================================
async function renderSavedTrends() {
    const savedTrends = await loadAllCustomTrends();
    const matrix = document.getElementById('styleMatrix');
    const uploadCard = document.querySelector('.upload-card');

    document.querySelectorAll('.matrix-item.custom-trend').forEach(el => el.remove());

    savedTrends.forEach(trend => {
        const newBox = document.createElement('div');
        newBox.className = 'matrix-item custom-trend';
        newBox.setAttribute('data-trend', trend.key);
        newBox.setAttribute('data-db-id', trend.dbId || '');

        newBox.onclick = function (e) {
            if (this.classList.contains('active') && clickedOnCloseBtn(e, this)) {
                deleteTrend(trend.key, trend.dbId || null, false);
                return;
            }
            if (this.classList.contains('active')) { resetMatrix(); return; }
            updateTrendMatrix(this);
            getAIAdvice(trend.name);
        };

        newBox.innerHTML = `
            <div class="matrix-img"><img src="${trend.imageUrl}" alt="${trend.name}"></div>
            <div class="matrix-info"><h3>${trend.name}</h3><p>EXPLORE AI STYLIST</p></div>
            <div class="trend-gallery-view"></div>`;

        matrix.insertBefore(newBox, uploadCard);
    });
}

// ================================================================
// DELETE TREND
// ================================================================
async function deleteTrend(trendKey, dbId, isBuiltIn) {
    if (!confirm("Are you sure you want to delete this trend?")) return;

    if (isBuiltIn) {
        // Built-in: logged-in users ke liye hidden list mein save
        if (isLoggedIn()) {
            const hiddenKey = `avant_hidden_builtins_${getUsername()}`;
            const hidden = JSON.parse(localStorage.getItem(hiddenKey) || '[]');
            if (!hidden.includes(trendKey)) hidden.push(trendKey);
            localStorage.setItem(hiddenKey, JSON.stringify(hidden));
        }
        const el = document.querySelector(`.matrix-item[data-trend="${trendKey}"]:not(.custom-trend)`);
        if (el) el.remove();
    } else {
        if (isLoggedIn() && dbId) {
            // DB se delete karo
            try {
                await fetch(`/api/my-trends/${dbId}`, {
                    method: 'DELETE',
                    headers: { 'x-username': getUsername() }
                });
                console.log('✅ Trend deleted from DB');
            } catch (err) {
                console.error('Delete from DB failed:', err);
            }
        } else {
            // Guest localStorage se delete
            removeGuestTrend(trendKey);
        }
        const el = document.querySelector(`.matrix-item.custom-trend[data-trend="${trendKey}"]`);
        if (el) el.remove();
    }

    resetMatrix();
    const ai = document.getElementById('ai-advice-section');
    if (ai) ai.style.display = 'none';
}

// ================================================================
// HIDE DELETED BUILT-INS (logged-in)
// ================================================================
function hideDeletedBuiltins() {
    if (!isLoggedIn()) return;
    const hiddenKey = `avant_hidden_builtins_${getUsername()}`;
    const hidden = JSON.parse(localStorage.getItem(hiddenKey) || '[]');
    hidden.forEach(key => {
        const el = document.querySelector(`.matrix-item[data-trend="${key}"]:not(.custom-trend)`);
        if (el) el.remove();
    });
}

// ================================================================
// X CLOSE ZONE DETECTION
// ================================================================
function clickedOnCloseBtn(e, element) {
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return x >= rect.width - 125 && x <= rect.width - 15 && y >= 12 && y <= 50;
}

// ================================================================
// ATTACH DELETE TO BUILT-IN TRENDS
// ================================================================
function attachDeleteToBuiltins() {
    BUILTIN_KEYS.forEach(key => {
        const item = document.querySelector(`.matrix-item[data-trend="${key}"]`);
        if (!item || item._deleteAttached) return;
        item._deleteAttached = true;
        item.addEventListener('click', function (e) {
            if (this.classList.contains('active') && clickedOnCloseBtn(e, this)) {
                e.stopImmediatePropagation();
                deleteTrend(key, null, true);
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
    if (clickedElement.classList.contains('active')) { resetMatrix(); return; }
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
// MODAL
// ================================================================
function openUploadModal() { document.getElementById('uploadModal').style.display = 'flex'; }
function closeUploadModal() { document.getElementById('uploadModal').style.display = 'none'; }
window.onclick = (e) => { if (e.target == document.getElementById('uploadModal')) closeUploadModal(); };

// ================================================================
// HANDLE NEW POST — Phase 3: Cloudinary upload
// ================================================================
async function handleNewPost() {
    const nameInput = document.querySelector('#uploadModal input[type="text"]');
    const fileInput = document.getElementById('fileInput');
    const postBtn = document.getElementById('postTrendBtn');

    const trendName = nameInput?.value.trim();
    if (!trendName) { alert("Please enter a trend name!"); return; }
    if (!fileInput?.files[0]) { alert("Please select an image!"); return; }

    // Loading state
    postBtn.disabled = true;
    postBtn.textContent = 'UPLOADING...';

    try {
        const formData = new FormData();
        formData.append('image', fileInput.files[0]);
        formData.append('trendName', trendName);
        if (isLoggedIn()) formData.append('userName', getUsername());

        const res = await fetch('/api/upload-trend', {
            method: 'POST',
            body: formData
            // NOTE: Content-Type header mat daalo — browser automatically multipart set karta hai
        });

        const data = await res.json();

        if (!data.success) throw new Error(data.message);

        console.log('✅ Upload response:', data);

        // Guest ke liye localStorage mein save
        if (!isLoggedIn()) {
            saveGuestTrend({
                name:     trendName,
                key:      trendName.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
                imageUrl: data.imageUrl,
                isDb:     false
            });
        }

        await renderSavedTrends();

        // const msg = data.savedToDb
        //     ? `"${trendName}" permanently saved to your account!`
        //     : `"${trendName}" uploaded! (Guest session only — will clear on refresh. Login to save permanently)`;
        // alert(msg);

        closeUploadModal();
        if (nameInput) nameInput.value = '';
        if (fileInput) fileInput.value = '';

    } catch (err) {
        console.error('Upload error:', err);
        alert('Upload failed: ' + err.message);
    } finally {
        postBtn.disabled = false;
        postBtn.textContent = 'POST TREND';
    }
}

// ================================================================
// PARSE TIPS
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

// ================================================================
// RENDER TIPS UI
// ================================================================
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
// GROQ AI — DO NOT CHANGE
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
            if (res.status === 400) {
                const err = await res.json().catch(() => ({}));
                if (err?.error?.message?.includes('decommissioned')) continue;
                throw new Error(err?.error?.message || 'HTTP 400');
            }
            if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(`${res.status}`); }
            const data = await res.json();
            const text = data?.choices?.[0]?.message?.content || '';
            const tips = parseTipsToArray(text);
            if (tips.length >= 3) { console.log(`✅ Groq ${model} success`); return tips; }
            throw new Error(`Only ${tips.length} tips`);
        } catch (err) {
            if (err.message.includes('decommissioned')) continue;
            console.warn(`⚠ ${model}: ${err.message}`);
            if (model === models[models.length - 1]) throw err;
        }
    }
    throw new Error('All Groq models failed');
}

async function getAIAdvice(style) {
    const aiSection = document.getElementById('ai-advice-section');
    const responseBox = document.getElementById('ai-response-box');
    if (aiSection) { aiSection.style.display = 'block'; aiSection.scrollIntoView({ behavior: 'smooth' }); }

    responseBox.innerHTML = `
        <div style="text-align:center;padding:50px 20px;">
            <p style="font-family:'Montserrat',sans-serif;font-size:0.68rem;letter-spacing:5px;color:#aaa;text-transform:uppercase;">
                ✦ &nbsp; Generating Style Intelligence &nbsp; ✦
            </p>
        </div>`;

    try {
        const tips = await callGroq(style);
        responseBox.innerHTML = renderTips(style, tips);
    } catch (err) {
        responseBox.innerHTML = `<div style="padding:30px;font-family:'Montserrat',sans-serif;"><p style="color:#c00;font-size:0.8rem;">⚠ ${err.message}</p></div>`;
    }
}

// ================================================================
// PAGE LOAD
// ================================================================
document.addEventListener('DOMContentLoaded', async () => {
    clearGuestOnRefresh();
    await renderSavedTrends();
    hideDeletedBuiltins();
    attachDeleteToBuiltins();
});