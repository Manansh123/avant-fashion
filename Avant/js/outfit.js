// ================================================================
// AVANT OUTFIT.JS — FINAL BULLETPROOF RE-ENGINEERED PRODUCTION SYSTEM
// ================================================================

console.log("✅ AVANT OUTFIT LAB v4 LOADED — COMPONENT ASYNC ROUTING RESOLVED");

// ── STATE ──────────────────────────────────────────────────────
let currentImageUrl   = '';   // Pollinations image URL
let currentItemList   = [];   // Shopping items formatted array
let currentPrompt     = '';   // Image prompt (for metadata)

// ── AUTH HELPERS ───────────────────────────────────────────────
function isLoggedIn() { return !!localStorage.getItem('avantUserName'); }
function getUsername() { return localStorage.getItem('avantUserName') || null; }

// ── DROPDOWN AUTO-RESET & COMPONENT WATCHER ────────────────────
function initOutfitLabEventListeners() {
    console.log("⚓ Binding dynamic event UI systems...");
    
    // Dropdown UX Bug Fix: Focus hote hi values reset hongi bina backspace dabaye list khulne ke liye
    const dropdownIds = ['inp-item', 'inp-color', 'inp-fabric', 'inp-aesthetic', 'inp-occasion', 'inp-weather', 'inp-footwear'];
    dropdownIds.forEach(id => {
        const inputObj = document.getElementById(id);
        if (inputObj) {
            inputObj.addEventListener('focus', function() {
                this.value = ''; // Instantly clears view wrapper data to drop down datalist
            });
        }
    });
}

// Layout components loaded execute sequences asynchronously
document.addEventListener('DOMContentLoaded', () => {
    // If layout takes a split-second to mount from auth.js, we safely poll or initialize immediately
    setTimeout(initOutfitLabEventListeners, 500);
});

// ── MAIN: GENERATE OUTFIT ──────────────────────────────────────
async function generateOutfit() {
    // 1. Gather input states securely
    const item       = document.getElementById('inp-item')?.value.trim()      || 'Outfit';
    const color      = document.getElementById('inp-color')?.value.trim()     || 'Neutral';
    const fabric     = document.getElementById('inp-fabric')?.value.trim()    || 'Cotton';
    const aesthetic  = document.getElementById('inp-aesthetic')?.value.trim() || 'Casual';
    const occasion   = document.getElementById('inp-occasion')?.value.trim()  || 'Casual Outing';
    const weather    = document.getElementById('inp-weather')?.value.trim()   || 'Mild';
    const footwear   = document.getElementById('inp-footwear')?.value.trim()  || 'Sneakers';
    const mood       = document.getElementById('inp-mood')?.value.trim()      || '';

    // Initialize display state transitions
    setUIState('loading');

    // 2. Client Side prompt framing guarantees immediate independent URL creation
    const corePrompt = `Professional high-fashion editorial portrait shot, 8k resolution, studio lighting, sharp focus, symmetrical anatomy, hyper-realistic, a fashion model wearing a ${color} ${fabric} ${item} in ${aesthetic} style for a ${occasion} during ${weather} weather, paired with ${footwear}. ${mood ? 'Details: ' + mood + '.' : ''} Masterpiece, clean fabric texture, no distortion, no extra limbs, no bad anatomy, no blur, crisp details.`;
    
    currentPrompt = corePrompt;
    const encodedPrompt = encodeURIComponent(corePrompt);
    currentImageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1920&model=flux&nologo=true&seed=${Date.now()}`;

    // Target mirror interface bounding
    const img = document.getElementById('generated-image');
    if (!img) {
        setUIState('error', 'Mirror display layout framework unaligned.');
        return;
    }

    // Default structural variables assignment
    let runtimeCaption = `${color} ${item} for ${occasion}. Designed in the spirit of ${aesthetic} expression.`;
    let runtimeItems   = [item, footwear, fabric];

    try {
        // 3. Make the backend outbound stream hit for text components asynchronously
        const response = await fetch('/api/generate-outfit-logic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item, color, fabric, aesthetic, occasion, weather, footwear, additionalDetails: mood })
        });

        const data = await response.json();
        if (data && data.success) {
            runtimeCaption = data.caption || runtimeCaption;
            runtimeItems   = data.itemList || runtimeItems;
        }
    } catch (networkError) {
        console.warn("Text system latency handled safely. Moving to render image pipeline.");
    }

    currentItemList = runtimeItems;

    // 4. Connect the target element parameters directly to source channels
    img.onload = () => {
        setUIState('result', runtimeCaption, runtimeItems);
    };
    
    img.onerror = () => {
        // Safe standard URL recovery layer
        const minimalPrompt = encodeURIComponent(`${color} ${fabric} ${item} ${aesthetic} studio clothing luxury photoshoot`);
        currentImageUrl = `https://image.pollinations.ai/prompt/${minimalPrompt}?width=1080&height=1920&model=flux&nologo=true`;
        img.src = currentImageUrl;
        img.onerror = () => setUIState('error', 'Image generation failed. Try again.');
    };
    
    img.src = currentImageUrl;
}

// ── UI STATE MACHINE ───────────────────────────────────────────
function setUIState(state, caption = '', itemList = []) {
    const defaultEl  = document.getElementById('mirrorDefault');
    const loadingEl  = document.getElementById('mirrorLoading');
    const imgEl      = document.getElementById('generated-image');
    const captionEl  = document.getElementById('captionArea');
    const captionTxt = document.getElementById('captionText');
    const itemsEl    = document.getElementById('shoppingItems');
    const actionEl   = document.getElementById('actionButtons');
    const btn        = document.getElementById('generateBtn');

    // Layout configuration mappings clear
    if (defaultEl) defaultEl.style.display = 'none';
    if (loadingEl) loadingEl.style.display = 'none';
    if (imgEl) imgEl.style.display = 'none';
    if (captionEl) captionEl.style.display = 'none';
    if (actionEl) actionEl.style.display = 'none';

    if (state === 'loading') {
        if (loadingEl) loadingEl.style.display = 'flex';
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'SYNTHESIZING...';
        }
        return;
    }

    if (btn) {
        btn.disabled = false;
        btn.textContent = 'SYNTHESIZE LOOK';
    }

    if (state === 'result') {
        if (imgEl) imgEl.style.display = 'block';
        if (captionEl) captionEl.style.display = 'block';
        if (actionEl) actionEl.style.display = 'flex';

        if (captionTxt) captionTxt.textContent = caption;

        if (itemsEl) {
            itemsEl.innerHTML = '';
            itemList.forEach(piece => {
                const chip = document.createElement('span');
                chip.className = 'item-chip';
                chip.textContent = piece;
                itemsEl.appendChild(chip);
            });
        }
        return;
    }

    if (state === 'error') {
        if (defaultEl) {
            defaultEl.style.display = 'flex';
            defaultEl.innerHTML = `
                <div style="padding:20px;text-align:center; width: 100%;">
                    <div style="font-size:2rem;opacity:0.3;margin-bottom:12px;color:#c00;">⚠</div>
                    <p style="font-family:'Montserrat',sans-serif;font-size:0.65rem;letter-spacing:2px;color:#c00;text-transform:uppercase;margin:0;">
                        ${caption || 'Something went wrong'}
                    </p>
                    <p style="font-family:'Montserrat',sans-serif;font-size:0.6rem;color:#aaa;margin-top:8px;">
                        Please try again
                    </p>
                </div>`;
        }
        return;
    }

    if (defaultEl) defaultEl.style.display = 'flex';
}

// ── SAVE TO CLOSET DIRECT SYNC ─────────────────────────────────
async function saveToCloset() {
    if (!currentImageUrl) { alert('Generate a look first!'); return; }
    const saveBtn = document.getElementById('saveBtn');
    if (!saveBtn) return;
    
    saveBtn.disabled = true;
    saveBtn.textContent = 'SAVING...';

    try {
        const imgRes = await fetch(currentImageUrl);
        if (!imgRes.ok) throw new Error('Source asset stream read timeout');
        const blob = await imgRes.blob();

        const formData = new FormData();
        formData.append('image', blob, 'outfit-lab-generated.jpg');
        if (isLoggedIn()) formData.append('userName', getUsername());

        const res = await fetch('/api/upload-wardrobe', { method: 'POST', body: formData });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        saveBtn.textContent = '✓ SAVED TO CLOSET';
        saveBtn.style.background = '#2d7d46';

        setTimeout(() => {
            saveBtn.disabled = false;
            saveBtn.textContent = '↓   Save to My Closet';
            saveBtn.style.background = '#000';
        }, 3000);
    } catch (err) {
        alert('Save failed: ' + err.message);
        saveBtn.disabled = false;
        saveBtn.textContent = '↓   Save to My Closet';
    }
}

// ── SHOPPING PARAMETER PASS ROUTING ────────────────────────────
function shopThisLook() {
    if (!currentItemList || currentItemList.length === 0) {
        window.location.href = 'shop.html';
        return;
    }
    localStorage.setItem('avant_shop_items', JSON.stringify(currentItemList));
    window.location.href = 'shop.html';
}