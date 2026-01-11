// --- DIGITAL WARDROBE LOGIC (WITH PERMANENT STORAGE) ---

// 1. Initialize images from localStorage or empty array if none exist
let wardrobeImages = JSON.parse(localStorage.getItem('avant_wardrobe')) || [];
let currentIndex = 0;

const uploadInput = document.getElementById('outfit-upload');
const gridContainer = document.getElementById('wardrobe-grid');

// Render existing images immediately on page load
if (gridContainer) {
    renderGrid();
}

// 2. Upload Logic
if (uploadInput) {
    uploadInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const timestamp = new Date().toLocaleString('en-GB', { 
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                });
                
                const imageData = {
                    src: event.target.result,
                    time: timestamp
                };
                
                // Add new image to the top of the array
                wardrobeImages.unshift(imageData); 
                
                // Save to browser memory and update UI
                saveToLocal();
                renderGrid();
            };
            reader.readAsDataURL(file);
        }
    });
}

// 3. Helper to Save Data Permanently
function saveToLocal() {
    localStorage.setItem('avant_wardrobe', JSON.stringify(wardrobeImages));
}

// 4. Grid Rendering with Delete Button
function renderGrid() {
    if(!gridContainer) return;
    gridContainer.innerHTML = '';
    
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

// 5. Delete Logic
function deleteImage(event, index) {
    event.stopPropagation(); // Prevents the lightbox from opening when clicking delete
    if(confirm("Permanently remove this look from your archive?")) {
        wardrobeImages.splice(index, 1);
        saveToLocal();
        renderGrid();
    }
}

// 6. Fullscreen Lightbox Logic
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
    
    img.src = wardrobeImages[currentIndex].src;
    meta.innerText = `ARCHIVED ON: ${wardrobeImages[currentIndex].time}`;
}