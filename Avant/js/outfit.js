// ================================================================
// AVANT — OUTFIT LAB: outfit.js (FINAL — Backend Proxy Image)
// ================================================================
console.log('✦ AVANT Outfit Lab loaded');

let currentImageUrl  = null;
let currentShopItems = [];

// ── Progress bar ──────────────────────────────────────────────────
function setProgress(pct) {
    const bar = document.getElementById('outfit-progress-bar');
    if (!bar) return;
    bar.style.width = pct + '%';
    if (pct > 0 && pct < 100) bar.classList.add('bar-pulse');
    else bar.classList.remove('bar-pulse');
}
function resetProgress() {
    const bar = document.getElementById('outfit-progress-bar');
    if (!bar) return;
    bar.style.transition = 'none';
    bar.style.width = '0%';
    bar.classList.remove('bar-pulse');
    requestAnimationFrame(() => {
        bar.style.transition = 'width 0.45s cubic-bezier(0.19,1,0.22,1)';
    });
}

// ── Mirror states ──────────────────────────────────────────────────
function showMirrorState(state) {
    const d = document.getElementById('default-msg');
    const l = document.getElementById('loading-msg');
    const r = document.getElementById('result-content');
    if (d) d.style.display = (state === 'default')  ? 'flex' : 'none';
    if (l) l.style.display = (state === 'loading')  ? 'flex' : 'none';
    if (r) {
        if (state === 'result') {
            r.style.animation = 'none';
            r.offsetHeight;
            r.style.animation = '';
            r.style.display   = 'flex';
        } else {
            r.style.display = 'none';
        }
    }
}

// ================================================================
// MAIN GENERATION
// ================================================================
async function generateOutfit() {
    const item      = (document.getElementById('dl-item')?.value      || '').trim();
    const color     = (document.getElementById('dl-color')?.value     || '').trim();
    const fabric    = (document.getElementById('dl-fabric')?.value    || '').trim();
    const aesthetic = (document.getElementById('dl-aesthetic')?.value || '').trim();
    const occasion  = (document.getElementById('dl-occasion')?.value  || '').trim();
    const weather   = (document.getElementById('dl-weather')?.value   || '').trim();
    const footwear  = (document.getElementById('dl-footwear')?.value  || '').trim();
    const mood      = (document.getElementById('dl-mood')?.value      || '').trim();

    if (!item && !color && !aesthetic) {
        _showToast('Fill in at least Item, Color, or Aesthetic first.');
        return;
    }

    const inputChips = [item, color, fabric, aesthetic, occasion, weather, footwear].filter(v => v);

    const synthBtn = document.getElementById('synthesize-btn');
    const btnText  = synthBtn?.querySelector('.btn-text');
    if (synthBtn) synthBtn.disabled = true;
    if (btnText)  btnText.textContent = 'GENERATING...';

    const actionsWrap = document.getElementById('mirror-actions');
    if (actionsWrap) actionsWrap.style.display = 'none';

    resetProgress();
    setProgress(12);
    showMirrorState('loading');

    try {
        // ── Step 1: Get caption + shopping list from backend ───────
        setProgress(28);
        const res = await fetch('/api/generate-outfit-logic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item, color, fabric, aesthetic, occasion, weather, footwear, additionalDetails: mood })
        });
        setProgress(55);

        if (!res.ok) throw new Error(`Server ${res.status} — add the route to index.js`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Backend error');

        console.log('✅ Backend OK:', data);

        // ── Step 2: Build PROXY image URL (goes through OUR server) ─
        // /api/proxy-image → server fetches Pollinations → returns image
        // No direct browser→Pollinations = no CORS/timeout issues
        const shortPrompt = data.imagePrompt ||
            `${aesthetic} ${item}, ${color}, editorial fashion, studio lighting`;

        const proxyUrl = `/api/proxy-image?prompt=${encodeURIComponent(shortPrompt)}&width=512&height=640&t=${Date.now()}`;

        currentImageUrl  = proxyUrl;
        currentShopItems = (Array.isArray(data.shoppingItems) && data.shoppingItems.length > 0)
            ? data.shoppingItems : inputChips;

        // ── Step 3: Fill caption & chips ───────────────────────────
        const captionEl = document.getElementById('outfit-caption');
        if (captionEl) {
            const c = (data.caption || '').trim();
            captionEl.textContent = c.length > 5 ? c
                : `A ${color || 'curated'} ${item || 'look'} in ${aesthetic || 'avant-garde'} style.`;
        }
        _renderChips(inputChips, currentShopItems);

        // ── Step 4: Show result panel immediately ──────────────────
        showMirrorState('result');
        setProgress(75);
        if (actionsWrap) actionsWrap.style.display = 'flex';

        // ── Step 5: Load image via proxy (non-blocking) ────────────
        _loadProxyImage(proxyUrl);

    } catch (err) {
        console.error('❌', err.message);
        setProgress(0);
        showMirrorState('default');
        _showToast('Failed: ' + err.message);
    } finally {
        if (synthBtn) synthBtn.disabled = false;
        if (btnText)  btnText.textContent = '✦   SYNTHESIZE LOOK   ✦';
    }
}

// ================================================================
// PROXY IMAGE LOADER
// Requests /api/proxy-image on OUR server.
// Server waits for Pollinations (up to 90s), falls back to Unsplash.
// Browser just sees a normal local HTTP request — never times out fast.
// ================================================================
function _loadProxyImage(proxyUrl) {
    const wrap  = document.querySelector('.outfit-img-wrap');
    const imgEl = document.getElementById('outfit-img');
    if (!imgEl || !wrap) return;

    // Build / reset the spinner overlay
    let spinner = document.getElementById('img-spinner');
    if (!spinner) {
        spinner = document.createElement('div');
        spinner.id = 'img-spinner';
        Object.assign(spinner.style, {
            position: 'absolute', inset: '0',
            background: '#f0f0f0',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '16px', zIndex: '10'
        });
        wrap.appendChild(spinner);
    }
    spinner.style.display = 'flex';
    spinner.innerHTML = `
        <div class="spin-ring"></div>
        <p class="spin-label">
            AI IS RENDERING YOUR LOOK<br>
            <span>Please wait 20–60 seconds</span>
        </p>`;

    // Reset image state
    imgEl.onload  = null;
    imgEl.onerror = null;
    imgEl.src     = '';
    imgEl.style.opacity = '0';

    // Set handlers BEFORE src
    imgEl.onload = () => {
        spinner.style.display = 'none';
        imgEl.style.transition = 'opacity 0.7s ease';
        imgEl.style.opacity    = '1';
        setProgress(100);
        setTimeout(() => setProgress(0), 900);
        console.log('✅ Image displayed successfully');
    };

    imgEl.onerror = () => {
        // Proxy itself failed (very rare — means our server crashed)
        spinner.innerHTML = `
            <p style="font-family:'Montserrat',sans-serif;font-size:0.68rem;font-weight:700;
                letter-spacing:2px;color:#888;text-align:center;line-height:2;padding:0 20px;">
                SERVER ERROR<br>
                <span style="font-weight:400;font-size:0.6rem;color:#aaa;">
                    Restart node server and try again
                </span>
            </p>
            <button onclick="_loadProxyImage('${proxyUrl}')"
                style="padding:10px 22px;background:#000;color:#fff;border:none;
                font-family:'Montserrat',sans-serif;font-size:0.65rem;font-weight:700;
                letter-spacing:3px;cursor:pointer;text-transform:uppercase;">
                ↻ RETRY
            </button>`;
        setProgress(0);
        console.error('❌ Proxy image endpoint failed');
    };

    imgEl.src = proxyUrl;
    console.log('🖼 Loading via proxy:', proxyUrl);
}

// ================================================================
// CHIPS
// ================================================================
function _renderChips(inputChips, apiItems) {
    const el = document.getElementById('outfit-chips');
    if (!el) return;
    el.innerHTML = '';

    // 1. Render Input configurations layout
    inputChips.forEach(val => {
        if (!val.trim()) return;
        const c = document.createElement('span');
        c.className = 'chip chip--input';
        c.textContent = val.trim();
        el.appendChild(c);
    });

    // 2. Render CLICKABLE individual garments links below the generated image
    if (Array.isArray(apiItems) && apiItems.length > 0) {
        const lbl = document.createElement('div');
        lbl.className = 'chips-section-label';
        lbl.style.cssText = `
            width: 100%; font-family: 'Montserrat', sans-serif; font-size: 0.65rem;
            font-weight: 700; letter-spacing: 3px; color: #000; text-transform: uppercase; margin: 20px 0 10px 0;
            border-top: 1px solid #eee; padding-top: 15px;
        `;
        lbl.textContent = "✦ CLICK ITEM TO SHOP THE LOOK ✦";
        el.appendChild(lbl);

        apiItems.forEach(item => {
            const c = document.createElement('a');
            c.className = 'chip chip--shop';
            c.href = 'javascript:void(0);';
            c.style.cssText = `
                display: inline-block; background: #000; color: #fff; padding: 8px 14px;
                margin: 4px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
                letter-spacing: 1px; text-decoration: none; border: 1px solid #000; transition: all 0.3s ease;
            `;
            c.textContent = `Shop ${item.trim()} ↗`;

            // Click handling to redirect and pass data to shop.html safely
            c.onclick = () => {
                localStorage.setItem('avant_shopping_sync', JSON.stringify([item.trim()]));
                _showToast(`Syncing ${item.trim()} parameters to Boutique...`);
                setTimeout(() => { window.location.href = 'shop.html'; }, 400);
            };

            el.appendChild(c);
        });
    }
}

// ================================================================
// TOAST
// ================================================================
function _showToast(msg) {
    document.getElementById('avant-toast')?.remove();
    const t = document.createElement('div');
    t.id = 'avant-toast';
    t.textContent = msg;
    Object.assign(t.style, {
        position: 'fixed', bottom: '30px', left: '50%',
        transform: 'translateX(-50%)',
        background: '#000', color: '#fff',
        fontFamily: "'Montserrat',sans-serif",
        fontSize: '0.72rem', fontWeight: '600',
        letterSpacing: '1.5px', padding: '14px 28px',
        zIndex: '999999', pointerEvents: 'none',
        opacity: '0', transition: 'opacity 0.35s ease',
        maxWidth: '90vw', textAlign: 'center'
    });
    document.body.appendChild(t);
    requestAnimationFrame(() => { t.style.opacity = '1'; });
    setTimeout(() => {
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 400);
    }, 4500);
}

// ================================================================
// SAVE TO CLOSET
// ================================================================
async function saveToCloset() {
    if (!currentImageUrl) { _showToast('Generate a look first.'); return; }
    const btn = document.getElementById('save-btn');
    if (btn) { btn.disabled = true; btn.textContent = '↓   SAVING...'; }
    try {
        _showToast('Saving to closet...');
        const blob = await (await fetch(currentImageUrl)).blob();
        const fd   = new FormData();
        fd.append('image', blob, 'avant-outfit.jpg');
        const u = localStorage.getItem('avantUserName');
        if (u) fd.append('userName', u);
        const data = await (await fetch('/api/upload-wardrobe', { method: 'POST', body: fd })).json();
        if (!data.success) throw new Error(data.message);
        _showToast(data.savedToDb ? '✓ Saved to Closet!' : '✓ Saved! Login to keep permanently.');
    } catch (err) {
        _showToast('Save failed: ' + err.message);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '↓   Save to Try-On Closet'; }
    }
}

// ================================================================
// SHOP THIS LOOK
// ================================================================
function shopThisLook() {
    if (!currentShopItems.length) { _showToast('Generate a look first.'); return; }
    localStorage.setItem('avant_shopping_sync', JSON.stringify(currentShopItems));
    const btn = document.getElementById('shop-btn');
    if (btn) btn.textContent = '→   REDIRECTING...';
    setTimeout(() => { window.location.href = 'shop.html'; }, 250);
}

// ================================================================
// DATALIST REOPEN FIX
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.dl-group input[type="text"]').forEach(input => {
        let saved = '';
        input.addEventListener('click', function () {
            saved = this.value;
            this.value = '';
            setTimeout(() => this.dispatchEvent(new Event('input', { bubbles: true })), 0);
        });
        input.addEventListener('blur', function () {
            if (!this.value.trim() && saved) this.value = saved;
            saved = '';
        });
        input.addEventListener('change', () => { saved = ''; });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter')  { e.preventDefault(); this.blur(); generateOutfit(); }
            if (e.key === 'Escape') { this.value = saved; saved = ''; this.blur(); }
        });
    });

    const mood = document.getElementById('dl-mood');
    if (mood) mood.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generateOutfit(); }
    });
});