// ================================================================
// AVANT — OUTFIT LAB: outfit.js (FINAL — Backend Proxy Image)
// ================================================================
console.log('✦ AVANT Outfit Lab loaded');

let currentImageUrl  = null;
let currentShopItems = [];
let currentCaption   = '';

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
    if (l) {
        l.style.display = (state === 'loading') ? 'flex' : 'none';
        if (state === 'loading') showFashionQuote(l.querySelector('.mirror-loading-inner'));
    }
    if (r) {
        if (state === 'result') {
            r.style.animation = 'none';
            r.offsetHeight;
            r.style.animation = '';
            r.style.display   = 'flex';
            // Animate the whole mirror frame in
            const frame = document.getElementById('result-frame');
            if (frame) {
                frame.classList.remove('reveal-in');
                void frame.offsetWidth;
                frame.classList.add('reveal-in');
                setTimeout(() => frame.classList.remove('reveal-in'), 600);
            } 
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
    document.querySelector('.visual-output')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const synthBtn = document.getElementById('synthesize-btn');
    const btnText  = synthBtn?.querySelector('.btn-text');
    if (synthBtn) synthBtn.disabled = true;
    if (btnText)  btnText.textContent = 'GENERATING...';

    const actionsWrap = document.getElementById('mirror-actions');
    if (actionsWrap) actionsWrap.style.display = 'none';
    resetActionButtons();
    resetProgress();
    setProgress(12);

    // gender read early — sent to backend now, not just used for the image proxy
    const targetGender = (document.getElementById('dl-gender')?.value || 'unisex').trim();

    try {
        // ── Step 1: Get caption + shopping list from backend ───────
        setProgress(28);
        const res = await fetch('/api/generate-outfit-logic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item, color, fabric, aesthetic, occasion, weather, footwear, gender: targetGender, additionalDetails: mood })
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

        // gender already read above (targetGender), sent to backend + used here for image proxy
        const proxyUrl = `/api/proxy-image?prompt=${encodeURIComponent(shortPrompt)}&width=768&height=1024&gender=${encodeURIComponent(targetGender)}&t=${Date.now()}`;

        currentImageUrl  = proxyUrl;
        currentShopItems = (Array.isArray(data.shoppingItems) && data.shoppingItems.length > 0)
            ? data.shoppingItems : inputChips;

        // ── Step 3: Fill caption & chips ───────────────────────────
        const captionEl = document.getElementById('outfit-caption');
        if (captionEl) {
            const c = (data.caption || '').trim();
            currentCaption = c.length > 5 ? c :
                `A ${color || 'curated'} ${item || 'look'} in ${aesthetic || 'avant-garde'} style.`;
            captionEl.textContent = currentCaption;
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
        _showToast('Couldn\'t synthesize that look — please try again.');
    } finally {
        if (synthBtn) synthBtn.disabled = false;
        if (btnText) btnText.innerHTML = '✦ &nbsp; SYNTHESIZE LOOK &nbsp; ✦';
    }
}

// ================================================================
// PROXY IMAGE LOADER
// ================================================================
function _loadProxyImage(proxyUrl) {
    const wrap  = document.querySelector('.outfit-img-wrap');
    const imgEl = document.getElementById('outfit-img');
    if (!imgEl || !wrap) return;

    let spinner = document.getElementById('img-spinner');
    if (!spinner) {
        spinner = document.createElement('div');
        spinner.id = 'img-spinner';
        Object.assign(spinner.style, {
            position: 'absolute', inset: '0', background: '#f0f0f0',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', zIndex: '10'
        });
        wrap.appendChild(spinner);
    }
    spinner.style.display = 'flex';
    // Same quote + bars loading jo bade mirror-loading state mein use hota hai —
    // ab dono jagah (initial generate + image load) ek jaisi loading dikhegi
    spinner.innerHTML = `
        <div class="mirror-loading-inner">
            <div class="loading-bars">
                <span></span><span></span><span></span><span></span><span></span>
            </div>
            
        </div>`;
    showFashionQuote(spinner.querySelector('.mirror-loading-inner'));

    imgEl.onload = () => {
        spinner.style.display = 'none';
        imgEl.style.transition = 'opacity 0.7s ease';
        imgEl.style.opacity    = '1';
        setProgress(100);
        setTimeout(() => setProgress(0), 900);

        // Capture loaded image as blob — avoids any re-fetch for download/wardrobe
        window._avantCapturedBlob = null;
        try {
            const canvas = document.createElement('canvas');
            canvas.width  = imgEl.naturalWidth;
            canvas.height = imgEl.naturalHeight;
            canvas.getContext('2d').drawImage(imgEl, 0, 0);
            canvas.toBlob(b => { window._avantCapturedBlob = b; }, 'image/jpeg', 0.92);
        } catch (e) { console.warn('Canvas capture failed:', e); }

        // Download icon — inject once
        if (!wrap.querySelector('.img-download-btn')) {
            const dlBtn = document.createElement('button');
            dlBtn.className = 'img-download-btn';
            dlBtn.title = 'Download look';
            dlBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
            dlBtn.onclick = (e) => {
                e.stopPropagation();
                const blob = window._avantCapturedBlob;
                if (blob) {
                    const bUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = bUrl;
                    a.download = 'avant-look.jpg';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(bUrl), 2000);
                } else {
                    _showToast('Image still loading, try again in a moment.');
                }
            };
            wrap.appendChild(dlBtn);
        }

        // Whole-box reveal animation
        const frame = document.getElementById('result-frame');
        if (frame) {
            frame.classList.remove('reveal-in');
            void frame.offsetWidth; // reflow reset
            frame.classList.add('reveal-in');
            setTimeout(() => frame.classList.remove('reveal-in'), 600);
        }
    };

    imgEl.onerror = () => {
        // Error resolution display layer updates dynamically
        spinner.innerHTML = `<p style="font-family:'Montserrat',sans-serif;font-size:0.68rem;font-weight:700;letter-spacing:2px;color:#c00;text-align:center;line-height:1.8;">AI CLOUD UTILITY BUSY<br><span style="font-weight:400;font-size:0.6rem;color:#aaa;text-transform:none;">The network timed out. Please try again.</span></p><button onclick="_loadProxyImage('${proxyUrl}')" style="padding:10px 22px;background:#000;color:#fff;border:none;font-family:'Montserrat',sans-serif;font-size:0.65rem;font-weight:700;letter-spacing:2px;cursor:pointer;text-transform:uppercase;margin-top:5px;">↻ RETRY SEQUENCE</button>`;
        setProgress(0);
    };

    imgEl.src = proxyUrl;
}

// ================================================================
// CHIPS
// ================================================================
function _renderChips(inputChips, apiItems) {
    const el = document.getElementById('outfit-chips');
    if (!el) return;
    el.innerHTML = '';

    // 1. Render Input configurations layout
    // inputChips.forEach(val => {
    //     if (!val.trim()) return;
    //     const c = document.createElement('span');
    //     c.className = 'chip chip--input';
    //     c.textContent = val.trim();
    //     el.appendChild(c);
    // });

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
// GO TO VIRTUAL TRY-ON — sends the generated look straight into the
// Try-On page's garment upload slot (no need to save-to-wardrobe first)
// ================================================================
async function goToVirtualTryOn() {
    const blob = window._avantCapturedBlob;
    if (!blob) {
        _showToast('Generate a look first, then wait for the image to fully load.');
        return;
    }
 
    try {
        // Blob can't be stored in localStorage directly — convert to a
        // base64 data URL so it survives the page navigation.
        const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
 
        localStorage.setItem('avant_tryon_garment_bridge', JSON.stringify({ dataUrl }));
        window.location.href = 'tryon.html';
    } catch (err) {
        _showToast('Could not send this look to Try-On — please try again.');
        console.error('goToVirtualTryOn error:', err);
    }
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
        _showToast('Couldn\'t save to your closet — please try again.');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '↓   Save to Try-On Closet'; }
    }
}

// ================================================================
// SYNC IMAGE TO WARDROBE + REDIRECT
// ================================================================
// OUTFIT.JS KE ANDAR IS FUNCTION KO DHUNDH KAR SIRF YEH LINE UPDATE KARO
async function syncToWardrobeGallery() {
    const blob = window._avantCapturedBlob;
    if (!blob) { _showToast('Generate a look first, then wait for image to fully load.'); return; }

    const btn = document.getElementById('shop-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'UPLOADING...'; }

    try {
        _showToast('Syncing look to Wardrobe...');

        const fd = new FormData();
        fd.append('image', blob, 'avant-outfit.jpg');
        const u = localStorage.getItem('avantUserName');
        if (u) fd.append('userName', u);

        const res  = await fetch('/api/upload-wardrobe', { method: 'POST', body: fd });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

       // Bridge image to wardrobe page (works guest + logged-in)
        try {
            const prev = JSON.parse(localStorage.getItem('avant_wardrobe_bridge') || '[]');
            prev.unshift({
                src:  data.imageUrl,
                time: data.timestamp || new Date().toLocaleString('en-GB'),
                id:   data.itemId || null,
                isDb: !!data.savedToDb
            });
            localStorage.setItem('avant_wardrobe_bridge', JSON.stringify(prev.slice(0, 20)));
        } catch(e) {}

        _showToast('✓ Added to Wardrobe!');
        setTimeout(() => { window.location.href = 'wardrobe.html'; }, 700);
    } catch (err) {
        _showToast('Couldn\'t sync to your wardrobe — please try again.');
        if (btn) { btn.disabled = false; btn.textContent = 'Add to Wardrobe Page'; }
    }
}

// ================================================================
// SHOP THIS LOOK
// ================================================================
function shopThisLook() {
    if (!currentShopItems.length) { _showToast('Generate a look first.'); return; }

    // FIX: pehle yahan ek OBJECT { items, image, caption } save hota tha,
    // lekin shop.js Array.isArray(items) check karta hai — object aane pe
    // wo silently fail ho jaata tha aur sab items ek saath search nahi hote the.
    // Ab seedha ARRAY save karo taaki shop.js ke multi-item search ko sahi data mile.
    localStorage.setItem('avant_shopping_sync', JSON.stringify(currentShopItems));

    const btn = document.getElementById('shop-look-btn');
    if (btn) btn.textContent = 'REDIRECTING...';
    setTimeout(() => { window.location.href = 'shop.html'; }, 250);
}

// ================================================================
// RESET ACTION BUTTONS — fixes buttons staying stuck on
// "UPLOADING.../REDIRECTING..." when the user hits the browser's
// Back button (bfcache restores the frozen JS state as-is).
// ================================================================
function resetActionButtons() {
    const shopBtn = document.getElementById('shop-btn');
    if (shopBtn) { shopBtn.disabled = false; shopBtn.textContent = 'Add to Wardrobe Page'; }

    const shopLookBtn = document.getElementById('shop-look-btn');
    if (shopLookBtn) { shopLookBtn.disabled = false; shopLookBtn.textContent = 'Shop this Look'; }

    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Try This Look On'; }
}

// Fires when the page is restored from bfcache (Back/Forward button)
window.addEventListener('pageshow', (event) => {
    if (event.persisted) resetActionButtons();
});

// ================================================================
// DATALIST REOPEN FIX
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.dl-group input[type="text"]').forEach(input => {
        let saved = '';
        let isSelecting = false;

        // Mousedown: if already has value + focused, reopen list
        input.addEventListener('mousedown', function (e) {
            if (document.activeElement === this && this.value) {
                saved = this.value;
                this.value = '';
                isSelecting = true;
                setTimeout(() => {
                    this.dispatchEvent(new Event('input', { bubbles: true }));
                    isSelecting = false;
                }, 0);
            }
        });

        // First focus (tab-in): also clear to show list
        input.addEventListener('focus', function () {
            if (this.value && !isSelecting) {
                saved = this.value;
                this.value = '';
                setTimeout(() => this.dispatchEvent(new Event('input', { bubbles: true })), 0);
            }
        });

        // Blur: restore if nothing new picked
        input.addEventListener('blur', function () {
            if (!this.value.trim() && saved) this.value = saved;
            saved = '';
        });

        // Change: value confirmed, clear saved
        input.addEventListener('change', () => { saved = ''; });

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter')  { e.preventDefault(); this.blur(); generateOutfit(); }
            if (e.key === 'Escape') { this.value = saved; saved = ''; this.blur(); }
            // Arrow down = reopen list even if value present
            if (e.key === 'ArrowDown' && this.value && !saved) {
                saved = this.value;
                this.value = '';
                setTimeout(() => this.dispatchEvent(new Event('input', { bubbles: true })), 0);
            }
        });
    });

    const mood = document.getElementById('dl-mood');
    if (mood) mood.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generateOutfit(); }
    });
});