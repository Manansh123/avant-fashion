// ================================================================
// AVANT — tryon.js FINAL (Virtual Fitting Room)
// ================================================================

let userPhotoFile = null;
let garmentFile = null;
let selectedLookUrl = null;

const photoInput          = document.getElementById('user-photo-input');
const uploadZone           = document.getElementById('upload-zone');
const uploadInner          = document.getElementById('upload-inner');

const garmentInput         = document.getElementById('garment-photo-input');
const garmentUploadZone    = document.getElementById('garment-upload-zone');
const garmentUploadInner   = document.getElementById('garment-upload-inner');

const looksGrid      = document.getElementById('looks-grid');
const generateBtn    = document.getElementById('generate-btn');
const stage           = document.getElementById('tryon-stage');
const actionsWrap     = document.getElementById('tryon-actions');
const saveLookWrap    = document.getElementById('save-look-wrap');
const saveLookCheckbox = document.getElementById('save-look-checkbox');
const looksDivider    = document.querySelector('.tryon-or-divider');

let autoSavedItemId = null;   // wardrobe _id of the item saved via the checkbox
let autoSavedItemEl = null;   // its <div> in the grid, so we can remove it on uncheck

function isLoggedIn() { return !!localStorage.getItem('avantUserName'); }
function getUsername() { return localStorage.getItem('avantUserName') || null; }

// ================================================================
// LOAD SAVED LOOKS
// ================================================================
async function loadLooks() {
    let items = [];
    try {
        if (isLoggedIn()) {
            const res = await fetch('/api/my-wardrobe', { headers: { 'x-username': getUsername() } });
            const data = await res.json();
            if (data.success) items = data.items.map(i => i.imageUrl);
        } else {
            const guest = JSON.parse(localStorage.getItem('avant_wardrobe_guest') || '[]');
            items = guest.map(i => i.src).filter(Boolean);
        }
    } catch (err) {
        console.error('Failed to load looks:', err);
    }
    renderLooks(items);
}

function updateDividerVisibility() {
    if (!looksDivider) return;
    const hasRealLooks = looksGrid.querySelectorAll('.tryon-look-item').length > 0;
    looksDivider.style.display = hasRealLooks ? '' : 'none';
}

function renderLooks(urls) {
    looksGrid.innerHTML = '';
    if (urls.length === 0) {
        looksGrid.innerHTML = `<p class="tryon-empty-msg">No saved looks yet — add some in your <a href="wardrobe.html">Wardrobe</a>, or just upload a garment photo above.</p>`;
        updateDividerVisibility();
        return;
    }
    urls.forEach(url => {
        const div = document.createElement('div');
        div.className = 'tryon-look-item';
        div.innerHTML = `
            <img src="${url}" alt="Saved look">
            <span class="tryon-look-check">✓</span>
            <button type="button" class="tryon-look-remove" title="Remove">&times;</button>
        `;
        div.querySelector('img').onclick = () => selectLook(url, div);
        div.querySelector('.tryon-look-remove').onclick = (ev) => {
            ev.stopPropagation();
            div.remove();
            if (selectedLookUrl === url) deselectLook();
            updateDividerVisibility();
        };
        looksGrid.appendChild(div);
    });
    updateDividerVisibility();
}

function selectLook(url, el) {
    garmentFile = null;
    resetGarmentUploadUI();
    hideSaveLookOption();

    document.querySelectorAll('.tryon-look-item').forEach(i => i.classList.remove('selected'));
    el.classList.add('selected');
    selectedLookUrl = url;
    updateGenerateBtnState();
}

function deselectLook() {
    selectedLookUrl = null;
    document.querySelectorAll('.tryon-look-item').forEach(i => i.classList.remove('selected'));
    updateGenerateBtnState();
}

// ================================================================
// USER PHOTO UPLOAD
// ================================================================
uploadZone.addEventListener('click', () => photoInput.click());

photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUserPhoto(file);
});

function setUserPhoto(file) {
    userPhotoFile = file;
    const url = URL.createObjectURL(file);
    uploadZone.classList.add('has-image');
    uploadInner.innerHTML = `
        <img src="${url}" class="tryon-upload-preview" alt="Your photo">
        <button type="button" class="tryon-upload-remove" id="remove-photo-btn">&times;</button>
    `;
    document.getElementById('remove-photo-btn').addEventListener('click', (ev) => {
        ev.stopPropagation();
        removePhoto();
    });
    updateGenerateBtnState();
}

function removePhoto() {
    userPhotoFile = null;
    photoInput.value = '';
    uploadZone.classList.remove('has-image');
    uploadInner.innerHTML = `
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#000"
            stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <p>Upload a full-body photo<br><span>front-facing, plain background works best</span></p>
    `;
    updateGenerateBtnState();
}

// ================================================================
// GARMENT UPLOAD
// ================================================================
garmentUploadZone.addEventListener('click', () => garmentInput.click());

garmentInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setGarmentFile(file);
});

function setGarmentFile(file) {
    deselectLook();
    garmentFile = file;

    const url = URL.createObjectURL(file);
    garmentUploadZone.classList.add('has-image');
    garmentUploadInner.innerHTML = `
        <img src="${url}" class="tryon-upload-preview" alt="Your garment">
        <button type="button" class="tryon-upload-remove" id="remove-garment-btn">&times;</button>
    `;
    document.getElementById('remove-garment-btn').addEventListener('click', (ev) => {
        ev.stopPropagation();
        garmentFile = null;
        garmentInput.value = '';
        resetGarmentUploadUI();
        hideSaveLookOption();
        updateGenerateBtnState();
    });

    showSaveLookOption();
    updateGenerateBtnState();
}

function resetGarmentUploadUI() {
    garmentUploadZone.classList.remove('has-image');
    garmentUploadInner.innerHTML = `
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#000"
            stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <p>Upload a garment photo<br><span>clean product shot works best</span></p>
    `;
}

// ================================================================
// "SAVE THIS LOOK" — shown whenever a garment was directly uploaded
// (whether by the user or auto-filled from Outfit Builder)
// ================================================================
function showSaveLookOption() {
    if (saveLookWrap) saveLookWrap.style.display = 'flex';
}
function hideSaveLookOption() {
    if (saveLookWrap) saveLookWrap.style.display = 'none';
    if (saveLookCheckbox) saveLookCheckbox.checked = false;
}

async function maybeSaveGarmentToWardrobe() {
    if (!garmentFile || !saveLookCheckbox?.checked) return;
    try {
        const fd = new FormData();
        fd.append('image', garmentFile);
        if (isLoggedIn()) fd.append('userName', getUsername());
        const res = await fetch('/api/upload-wardrobe', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.success) {
            autoSavedItemId = data.itemId || null;
            autoSavedItemEl = prependLookToGrid(data.imageUrl);
        }
        console.log('✅ Garment saved to wardrobe');
    } catch (err) {
        console.warn('⚠ Could not save garment to wardrobe:', err.message);
    }
}

async function undoSaveGarmentToWardrobe() {
    if (autoSavedItemEl) {
        autoSavedItemEl.remove();
        updateDividerVisibility();
    }
    if (autoSavedItemId && isLoggedIn()) {
        try {
            await fetch(`/api/my-wardrobe/${autoSavedItemId}`, {
                method: 'DELETE',
                headers: { 'x-username': getUsername() }
            });
        } catch (err) {
            console.warn('⚠ Could not remove saved garment:', err.message);
        }
    }
    autoSavedItemId = null;
    autoSavedItemEl = null;
}

// Checking the box saves + shows it in the grid immediately.
// Unchecking removes it again — no need to wait for "Generate".
saveLookCheckbox?.addEventListener('change', () => {
    if (saveLookCheckbox.checked) {
        maybeSaveGarmentToWardrobe();
    } else {
        undoSaveGarmentToWardrobe();
    }
});

// Adds the newly-saved look to the TOP of the grid immediately —
// no page reload needed to see it. Returns the created element.
function prependLookToGrid(url) {
    const emptyMsg = looksGrid.querySelector('.tryon-empty-msg');
    if (emptyMsg) emptyMsg.remove();

    const div = document.createElement('div');
    div.className = 'tryon-look-item';
    div.innerHTML = `
        <img src="${url}" alt="Saved look">
        <span class="tryon-look-check">&#10003;</span>
        <button type="button" class="tryon-look-remove" title="Remove">&times;</button>
    `;
    div.querySelector('img').onclick = () => selectLook(url, div);
    div.querySelector('.tryon-look-remove').onclick = (ev) => {
        ev.stopPropagation();
        if (selectedLookUrl === url) deselectLook();
        div.remove();
        if (div === autoSavedItemEl) { autoSavedItemId = null; autoSavedItemEl = null; }
        updateDividerVisibility();
    };
    looksGrid.insertBefore(div, looksGrid.firstChild);
    updateDividerVisibility();
    return div;
}

// ================================================================
// AUTO-FILL FROM OUTFIT BUILDER (bridge from outfit.html)
// ================================================================
function loadBridgedGarment() {
    const bridged = localStorage.getItem('avant_tryon_garment_bridge');
    if (!bridged) return;
    localStorage.removeItem('avant_tryon_garment_bridge');

    try {
        const { dataUrl } = JSON.parse(bridged);
        fetch(dataUrl)
            .then(r => r.blob())
            .then(blob => {
                const file = new File([blob], 'avant-generated-look.jpg', { type: blob.type || 'image/jpeg' });
                setGarmentFile(file);
            });
    } catch (err) {
        console.warn('⚠ Failed to load bridged garment:', err.message);
    }
}

// ================================================================
// GENERATE BUTTON STATE
// ================================================================
function updateGenerateBtnState() {
    generateBtn.disabled = !(userPhotoFile && (garmentFile || selectedLookUrl));
}

// ================================================================
// GENERATE TRY-ON
// ================================================================
generateBtn.addEventListener('click', async () => {
    if (!userPhotoFile || !(garmentFile || selectedLookUrl)) return;

    generateBtn.disabled = true;
    generateBtn.textContent = 'Fitting...';
    actionsWrap.style.display = 'none';

    const loadingQuotes = [
        "Draping the fabric just right...",
        "Consulting the style archives...",
        "Matching light and shadow to the fit...",
        "Tailoring every seam to your shape...",
        "Almost runway-ready...",
        "Fine-tuning the silhouette..."
    ];
    let quoteIndex = 0;

    stage.innerHTML = `
        <div class="tryon-loading-inner">
            <div class="loading-bars">
                <span></span><span></span><span></span><span></span><span></span>
            </div>
            <p class="loading-label" id="tryon-loading-quote">${loadingQuotes[0]}</p>
        </div>`;

    const quoteInterval = setInterval(() => {
        quoteIndex = (quoteIndex + 1) % loadingQuotes.length;
        const el = document.getElementById('tryon-loading-quote');
        if (el) el.textContent = loadingQuotes[quoteIndex];
        else clearInterval(quoteInterval);
    }, 3500);

    try {
        const fd = new FormData();
        fd.append('photo', userPhotoFile);
        if (garmentFile) {
            fd.append('garmentPhoto', garmentFile);
        } else {
            fd.append('lookImageUrl', selectedLookUrl);
        }

        const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 100000); // 100s — slightly more than backend's 90s
const res = await fetch('/api/virtual-tryon', { method: 'POST', body: fd, signal: controller.signal });
clearTimeout(timeoutId);
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            throw new Error(`Server error (status ${res.status})`);
        }

        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Try-on failed');

        clearInterval(quoteInterval);
        stage.innerHTML = `<img src="${data.imageUrl}" alt="Your try-on result">`;
        actionsWrap.style.display = 'flex';

        document.getElementById('tryon-download-btn').onclick = async (ev) => {
            const btn = ev.currentTarget;
            const originalText = btn.textContent;
            btn.textContent = 'Downloading...';
            try {
                const imgRes = await fetch(data.imageUrl);
                const blob = await imgRes.blob();
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = 'avant-tryon.jpg';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
            } catch (err) {
                console.error('Download failed, opening in a new tab instead:', err);
                window.open(data.imageUrl, '_blank');
            } finally {
                btn.textContent = originalText;
            }
        };
        document.getElementById('tryon-reset-btn').onclick = () => {
            stage.innerHTML = `<p class="tryon-stage-placeholder">Upload your photo and pick a look to begin</p>`;
            actionsWrap.style.display = 'none';
        };

    } catch (err) {
        clearInterval(quoteInterval);
        console.error('Try-on error:', err);
        stage.innerHTML = `
            <p class="tryon-stage-placeholder" style="color:#c00;">
                ${err.message}
            </p>`;
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Try It On';
        updateGenerateBtnState();
    }
});

// ================================================================
// PAGE LOAD
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
    loadLooks();
    loadBridgedGarment();
});