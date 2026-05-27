// ================================================================
// AVANT WARDROBE.JS — Phase 3 (Cloudinary + MongoDB)
// ================================================================

let wardrobeImages = []; // { src, time, id, isDb }
let currentIndex = 0;

const uploadInput = document.getElementById('outfit-upload');
const gridContainer = document.getElementById('wardrobe-grid');

// ================================================================
// AUTH
// ================================================================
function isLoggedIn() { return !!localStorage.getItem('avantUserName'); }
function getUsername() { return localStorage.getItem('avantUserName') || null; }
// function isLoggedIn() { return !!localStorage.getItem('username'); }
// function getUsername() { return localStorage.getItem('username') || null; }

// ================================================================
// INIT — Page load pe data load karo
// ================================================================
async function initWardrobe() {
    if (isLoggedIn()) {
        await loadFromDB();
    } else {
        wardrobeImages = [];
    }

    // Pick up images synced from Outfit Lab (bridge key)
    try {
        const bridge = JSON.parse(localStorage.getItem('avant_wardrobe_bridge') || '[]');
        if (bridge.length > 0) {
            localStorage.removeItem('avant_wardrobe_bridge');
            // Only add items not already loaded from DB (avoids duplicates for logged-in users)
            const existingUrls = new Set(wardrobeImages.map(i => i.src));
            const fresh = bridge.filter(i => i.src && !existingUrls.has(i.src));
            if (fresh.length > 0) wardrobeImages = [...fresh, ...wardrobeImages];
        }
    } catch(e) {}

    if (gridContainer) renderGrid();
}

// ================================================================
// LOAD FROM DB (Logged-in users)
// ================================================================
async function loadFromDB() {
    try {
        const res = await fetch('/api/my-wardrobe', {
            headers: { 'x-username': getUsername() }
        });
        const data = await res.json();
        if (data.success) {
            wardrobeImages = data.items.map(item => ({
                src:  item.imageUrl,
                time: new Date(item.createdAt).toLocaleString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                }),
                id:   item._id,
                isDb: true
            }));
            console.log(`✅ Loaded ${wardrobeImages.length} wardrobe items from DB`);
        }
    } catch (err) {
        console.error('Failed to load wardrobe from DB:', err);
        loadFromLocalStorage(); // Fallback
    }
}

// ================================================================
// LOAD FROM LOCALSTORAGE (Guest)
// ================================================================
function loadFromLocalStorage() {
    wardrobeImages = JSON.parse(localStorage.getItem('avant_wardrobe_guest') || '[]');
    console.log(`📦 Loaded ${wardrobeImages.length} guest wardrobe items`);
}

function saveGuestToLocalStorage() {
    const guestItems = wardrobeImages.filter(img => !img.isDb);
    localStorage.setItem('avant_wardrobe_guest', JSON.stringify(guestItems));
}

// ================================================================
// UPLOAD LOGIC — Cloudinary via server
// ================================================================
if (uploadInput) {
    uploadInput.addEventListener('change', async function (e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // Show loading
        const loadingMsg = document.createElement('p');
        loadingMsg.id = 'upload-loading';
        loadingMsg.style.cssText = 'text-align:center;padding:20px;font-family:Montserrat,sans-serif;font-size:0.8rem;letter-spacing:2px;color:#999;';
        loadingMsg.textContent = `UPLOADING ${files.length} IMAGE${files.length > 1 ? 'S' : ''}...`;
        if (gridContainer) gridContainer.prepend(loadingMsg);

        for (const file of files) {
            try {
                const formData = new FormData();
                formData.append('image', file);
                if (isLoggedIn()) formData.append('userName', getUsername());

                const res = await fetch('/api/upload-wardrobe', {
                    method: 'POST',
                    body: formData
                });

                const data = await res.json();
                if (!data.success) throw new Error(data.message);

                const newItem = {
                    src:  data.imageUrl,
                    time: data.timestamp || new Date().toLocaleString('en-GB'),
                    id:   data.itemId || null,
                    isDb: data.savedToDb || false
                };

                wardrobeImages.unshift(newItem);

                

                console.log('✅ Wardrobe item uploaded:', data.imageUrl);

            } catch (err) {
                console.error('Upload failed:', err);
                alert('Upload failed for one image: ' + err.message);
            }
        }

        // Remove loading msg
        document.getElementById('upload-loading')?.remove();
        renderGrid();
        uploadInput.value = '';
    });
}

// ================================================================
// RENDER GRID
// ================================================================
function renderGrid() {
    if (!gridContainer) return;
    gridContainer.innerHTML = '';

    if (wardrobeImages.length === 0) {
        gridContainer.innerHTML = `
            <p class="initial-msg" style="grid-column:1/-1;text-align:center;padding:50px;color:#ccc;font-style:italic;">
                Your archive is empty. Upload your first look.
            </p>`;
        return;
    }

    wardrobeImages.forEach((img, index) => {
        const div = document.createElement('div');
        div.className = 'grid-item';

        // Timestamp tag
        const timeTag = img.time
            ? `<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.6);color:#fff;font-family:'Montserrat',sans-serif;font-size:0.6rem;letter-spacing:1px;padding:8px 12px;text-transform:uppercase;opacity:0;transition:opacity 0.3s;">${img.time}</div>`
            : '';

        div.innerHTML = `
            <img src="${img.src}" onclick="openLightbox(${index})" alt="Wardrobe Item">
            <button class="delete-btn" onclick="deleteImage(event, ${index})">&times;</button>
            ${timeTag}`;

        // Hover pe timestamp dikhao
        const timeEl = div.querySelector('div[style*="position:absolute"]');
        if (timeEl) {
            div.addEventListener('mouseenter', () => timeEl.style.opacity = '1');
            div.addEventListener('mouseleave', () => timeEl.style.opacity = '0');
        }

        gridContainer.appendChild(div);
    });
}

// ================================================================
// DELETE IMAGE
// ================================================================
async function deleteImage(event, index) {
    event.stopPropagation();
    if (!confirm("Permanently remove this look?")) return;

    const item = wardrobeImages[index];

    if (item.isDb && item.id && isLoggedIn()) {
        // DB se delete
        try {
            const res = await fetch(`/api/my-wardrobe/${item.id}`, {
                method: 'DELETE',
                headers: { 'x-username': getUsername() }
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            console.log('✅ Deleted from DB');
        } catch (err) {
            console.error('DB delete failed:', err);
            alert('Delete failed: ' + err.message);
            return;
        }
    } 

    wardrobeImages.splice(index, 1);
    if (!isLoggedIn()) saveGuestToLocalStorage();
    renderGrid();
}

// ================================================================
// LIGHTBOX
// ================================================================
function openLightbox(index) {
    currentIndex = index;
    const lightbox = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    const meta = document.getElementById('image-timestamp');

    if (lightbox && wardrobeImages[currentIndex]) {
        img.src = wardrobeImages[currentIndex].src;
        if (meta) meta.innerText = wardrobeImages[currentIndex].time
            ? `ARCHIVED ON: ${wardrobeImages[currentIndex].time}`
            : '';
        lightbox.style.display = 'flex';
    }
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) lightbox.style.display = 'none';
}

function changeImage(step) {
    if (wardrobeImages.length === 0) return;
    currentIndex += step;
    if (currentIndex >= wardrobeImages.length) currentIndex = 0;
    if (currentIndex < 0) currentIndex = wardrobeImages.length - 1;

    const img = document.getElementById('lightbox-img');
    const meta = document.getElementById('image-timestamp');
    if (img) img.src = wardrobeImages[currentIndex].src;
    if (meta && wardrobeImages[currentIndex].time) {
        meta.innerText = `ARCHIVED ON: ${wardrobeImages[currentIndex].time}`;
    }
}

// KEYBOARD NAV
document.addEventListener('keydown', function (e) {
    const lightbox = document.getElementById('lightbox');
    if (lightbox && lightbox.style.display === 'flex') {
        if (e.key === "ArrowRight") changeImage(1);
        else if (e.key === "ArrowLeft") changeImage(-1);
        else if (e.key === "Escape") closeLightbox();
    }
});

// ================================================================
// PAGE LOAD
// ================================================================
document.addEventListener('DOMContentLoaded', initWardrobe);