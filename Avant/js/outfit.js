// ================================================================
// AVANT — THE OUTFIT LAB (Phase 4 + 5)
// Connects: 7 datalist inputs + mood textarea
//      → /api/generate-outfit-logic (Pollinations image prompt + Gemini caption + item list)
//      → Mirror render
//      → "Save to Try-On Closet" (Phase 4 bridge → MongoDB / Cloudinary)
//      → "Shop this Look" (Phase 5 bridge → shop.html via localStorage)
// ================================================================

console.log("✨ AVANT OUTFIT LAB v2 — LOADED");

// ---------------- AUTH HELPERS ----------------
function isLoggedIn() { return !!localStorage.getItem('avantUserName'); }
function getUsername() { return localStorage.getItem('avantUserName') || null; }

// ---------------- IN-MEMORY STATE ----------------
// Last generated look (used by Save & Shop buttons)
let _lastLook = null;
//  { imageUrl, caption, itemList, inputs, imagePrompt }

// ---------------- INPUT COLLECTION ----------------
function readField(id) {
    const el = document.getElementById(id);
    if (!el) return '';
    const v = (el.value || '').trim();
    // "Others" → treat as empty (backend will handle gracefully)
    if (v.toLowerCase() === 'others') return '';
    return v;
}

function collectInputs() {
    return {
        item:              readField('lab-item'),
        color:             readField('lab-color'),
        fabric:            readField('lab-fabric'),
        aesthetic:         readField('lab-aesthetic'),
        occasion:          readField('lab-occasion'),
        weather:           readField('lab-weather'),
        footwear:          readField('lab-footwear'),
        additionalDetails: readField('lab-mood')
    };
}

// ---------------- UI HELPERS ----------------
function showMirrorLoading(on) {
    const loader = document.getElementById('mirror-loader');
    const img    = document.getElementById('outfit-img');
    if (loader) loader.style.display = on ? 'flex' : 'none';
    if (img && on) img.style.opacity = '0.25';
    if (img && !on) img.style.opacity = '1';
}

function renderItemList(items) {
    const ul = document.getElementById('item-list-render');
    if (!ul) return;
    ul.innerHTML = '';
    if (!items || items.length === 0) return;
    items.forEach(it => {
        const li = document.createElement('li');
        li.textContent = it;
        ul.appendChild(li);
    });
}

function setActionsVisible(on) {
    const actions = document.getElementById('mirror-actions');
    if (actions) actions.style.display = on ? 'flex' : 'none';
}

// ---------------- STEP 3: GENERATE ----------------
async function generateLook() {
    const inputs = collectInputs();

    // Soft validation: need at least 2 fields filled
    const filledCount = Object.values(inputs).filter(v => v && v.length > 0).length;
    if (filledCount < 2) {
        alert("Please fill at least 2 fields to synthesize a look.");
        return;
    }

    // UI: switch to result frame, show loader, hide actions
    const defaultMsg    = document.getElementById('default-msg');
    const resultContent = document.getElementById('result-content');
    const vibeTitle     = document.getElementById('vibe-title');
    const stylingTip    = document.getElementById('styling-tip');
    const outfitImg     = document.getElementById('outfit-img');
    const generateBtn   = document.getElementById('lab-generate-btn');

    if (defaultMsg)    defaultMsg.style.display = 'none';
    if (resultContent) resultContent.style.display = 'block';
    setActionsVisible(false);
    renderItemList([]);

    if (generateBtn) {
        generateBtn.disabled = true;
        generateBtn.dataset._label = generateBtn.innerText;
        generateBtn.innerText = 'SYNTHESIZING...';
    }
    if (stylingTip) stylingTip.innerText = 'Consulting the AI stylist...';
    if (vibeTitle)  vibeTitle.innerText  = 'WEAVING YOUR LOOK';
    if (outfitImg) {
        outfitImg.src = '';
        outfitImg.alt = 'Generating...';
    }
    showMirrorLoading(true);

    try {
        const res = await fetch('/api/generate-outfit-logic', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(inputs)
        });
        const data = await res.json();

        if (!data.success) throw new Error(data.message || 'Generation failed');

        const { imageUrl, caption, itemList, imagePrompt } = data;

        // Cache for Save / Shop buttons
        _lastLook = { imageUrl, caption, itemList, imagePrompt, inputs: data.inputs || inputs };

        // ---------- THE MIRROR EFFECT ----------
        // Pollinations URL — load via <img>, browser streams it
        if (outfitImg) {
            outfitImg.onload = () => {
                showMirrorLoading(false);
                outfitImg.style.opacity = '1';
            };
            outfitImg.onerror = () => {
                showMirrorLoading(false);
                if (stylingTip) stylingTip.innerText = 'The mirror clouded over. Try regenerating in a moment.';
            };
            outfitImg.alt = caption || 'Generated Outfit';
            outfitImg.src = imageUrl;
        }

        // Caption + structured item list
        if (vibeTitle) {
            const vibe = (inputs.aesthetic || 'YOUR SIGNATURE').toUpperCase();
            vibeTitle.innerText = `${vibe} LOOK`;
        }
        if (stylingTip) stylingTip.innerText = caption || 'Your look is ready.';

        renderItemList(itemList);

        // Reveal Save + Shop buttons
        setActionsVisible(true);

    } catch (err) {
        console.error('❌ Outfit Lab error:', err);
        showMirrorLoading(false);
        if (stylingTip) stylingTip.innerText = 'Something went wrong. Please try again.';
        alert('Could not generate outfit: ' + err.message);
    } finally {
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.innerText = generateBtn.dataset._label || 'SYNTHESIZE LOOK';
        }
    }
}

// ---------------- STEP 4: SAVE TO TRY-ON CLOSET ----------------
async function saveLookToCloset() {
    if (!_lastLook || !_lastLook.imageUrl) {
        alert('Generate a look first.');
        return;
    }

    const btn = document.getElementById('save-look-btn');
    if (btn) {
        btn.disabled = true;
        btn.dataset._label = btn.innerText;
        btn.innerText = 'SAVING...';
    }

    try {
        const res = await fetch('/api/save-generated-outfit', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                imageUrl: _lastLook.imageUrl,
                userName: getUsername() || undefined,
                caption:  _lastLook.caption,
                itemList: _lastLook.itemList,
                inputs:   _lastLook.inputs
            })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Save failed');

        // Update the cached URL to the permanent Cloudinary URL
        _lastLook.imageUrl = data.imageUrl;

        // Phase 5 bridge: this is the image Virtual Try-On will use as "Overlay"
        // Stash it locally so other pages can pick it up.
        try {
            const tryOnPayload = {
                imageUrl:  data.imageUrl,
                itemId:    data.itemId || null,
                caption:   _lastLook.caption,
                itemList:  _lastLook.itemList,
                savedAt:   Date.now()
            };
            localStorage.setItem('avant_last_tryon_overlay', JSON.stringify(tryOnPayload));
        } catch (e) { /* ignore quota errors */ }

        if (btn) btn.innerText = data.savedToDb ? '✓ SAVED TO CLOSET' : '✓ SAVED (GUEST)';
        setTimeout(() => {
            if (btn) {
                btn.disabled = false;
                btn.innerText = btn.dataset._label || '💾 SAVE TO TRY-ON CLOSET';
            }
        }, 2200);

        if (!data.savedToDb) {
            // Hint guest users
            console.log('👤 Saved in guest mode — log in to persist permanently.');
        }

    } catch (err) {
        console.error('Save failed:', err);
        alert('Could not save: ' + err.message);
        if (btn) {
            btn.disabled = false;
            btn.innerText = btn.dataset._label || '💾 SAVE TO TRY-ON CLOSET';
        }
    }
}

// ---------------- STEP 5: SHOP THIS LOOK ----------------
function shopThisLook() {
    if (!_lastLook || !_lastLook.itemList || _lastLook.itemList.length === 0) {
        alert('Generate a look first.');
        return;
    }

    // Stash item list in localStorage so shop.html can pick it up symmetrically
    try {
        const payload = {
            items:    _lastLook.itemList,
            caption:  _lastLook.caption || '',
            imageUrl: _lastLook.imageUrl || '',
            inputs:   _lastLook.inputs || {},
            createdAt: Date.now()
        };
        localStorage.setItem('avant_shop_list', JSON.stringify(payload));
    } catch (e) { /* ignore */ }

    // Pass first item as a URL hint (so direct sharing also works)
    const firstItem = encodeURIComponent(_lastLook.itemList[0] || '');
    const url = `shop.html?fromLab=1&q=${firstItem}`;
    window.location.href = url;
}

// ---------------- WIRE BUTTONS ON LOAD ----------------
document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('save-look-btn');
    const shopBtn = document.getElementById('shop-look-btn');
    if (saveBtn) saveBtn.addEventListener('click', saveLookToCloset);
    if (shopBtn) shopBtn.addEventListener('click', shopThisLook);
});

// Expose to inline onclicks
window.generateLook    = generateLook;
window.saveLookToCloset = saveLookToCloset;
window.shopThisLook    = shopThisLook;
