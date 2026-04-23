// ================================================================
// AVANT DIGITAL WARDROBE LOGIC (v3.0 - Multiple Uploads & Keyboard)
// ================================================================

let wardrobeImages = JSON.parse(localStorage.getItem('avant_wardrobe')) || [];
let currentIndex = 0;

const uploadInput = document.getElementById('outfit-upload');
const gridContainer = document.getElementById('wardrobe-grid');

if (gridContainer) {
    renderGrid();
}

// --- MULTIPLE UPLOAD LOGIC ---
if (uploadInput) {
    uploadInput.addEventListener('change', function(e) {
        const files = e.target.files; // Saari selected files yahan hain
        
        if (files.length > 0) {
            // Har file ke liye loop chalao
            Array.from(files).forEach(file => {
                const reader = new FileReader();
                
                reader.onload = function(event) {
                    const timestamp = new Date().toLocaleString('en-GB', { 
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                    });
                    
                    const imageData = {
                        src: event.target.result,
                        time: timestamp
                    };
                    
                    // Nayi images ko top par add karo
                    wardrobeImages.unshift(imageData); 
                    
                    // LocalStorage update aur Grid refresh
                    saveToLocal();
                    renderGrid();
                };
                reader.readAsDataURL(file);
            });
        }
    });
}

function saveToLocal() {
    localStorage.setItem('avant_wardrobe', JSON.stringify(wardrobeImages));
}

function renderGrid() {
    if(!gridContainer) return;
    gridContainer.innerHTML = '';
    
    if (wardrobeImages.length === 0) {
        gridContainer.innerHTML = '<p class="initial-msg" style="grid-column: 1/-1; text-align: center; padding: 50px; color: #ccc; font-style: italic;">Your archive is empty. Upload your first look.</p>';
        return;
    }

    wardrobeImages.forEach((img, index) => {
        const div = document.createElement('div');
        div.className = 'grid-item';
        div.innerHTML = `
            <img src="${img.src}" onclick="openLightbox(${index})">
            <button class="delete-btn" onclick="deleteImage(event, ${index})">&times;</button>
        `;
        gridContainer.appendChild(div);
    });
}

function deleteImage(event, index) {
    event.stopPropagation();
    if(confirm("Permanently remove this look?")) {
        wardrobeImages.splice(index, 1);
        saveToLocal();
        renderGrid();
    }
}

function openLightbox(index) {
    currentIndex = index;
    const lightbox = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    const meta = document.getElementById('image-timestamp');
    
    if (lightbox && wardrobeImages[currentIndex]) {
        img.src = wardrobeImages[currentIndex].src;
        meta.innerText = `ARCHIVED ON: ${wardrobeImages[currentIndex].time}`;
        lightbox.style.display = 'flex';
    }
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if(lightbox) lightbox.style.display = 'none';
}

function changeImage(step) {
    if (wardrobeImages.length === 0) return;
    currentIndex += step;
    if (currentIndex >= wardrobeImages.length) currentIndex = 0;
    if (currentIndex < 0) currentIndex = wardrobeImages.length - 1;
    
    const img = document.getElementById('lightbox-img');
    const meta = document.getElementById('image-timestamp');
    
    if (img && meta) {
        img.src = wardrobeImages[currentIndex].src;
        meta.innerText = `ARCHIVED ON: ${wardrobeImages[currentIndex].time}`;
    }
}

// KEYBOARD NAV
document.addEventListener('keydown', function(e) {
    const lightbox = document.getElementById('lightbox');
    if (lightbox && lightbox.style.display === 'flex') {
        if (e.key === "ArrowRight") changeImage(1);
        else if (e.key === "ArrowLeft") changeImage(-1);
        else if (e.key === "Escape") closeLightbox();
    }
});