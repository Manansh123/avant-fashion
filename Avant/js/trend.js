// 1. Data Archive for Trends
const trendArchives = {
    grandpa: ["gp1.jpg", "gp2.jpg", "gp3.jpg", "gp4.jpg", "gp5.jpg"],
    streetwear: ["sl1.jpg", "sl2.jpg", "sl3.jpg", "sl4.jpg", "sl5.jpg"],
    y2k: ["y1.jpg", "y2.jpg", "y3.jpg", "y4.jpg", "y5.jpg"],
    oldmoney: ["om1.jpg", "om2.jpg", "om3.jpg", "om4.jpg", "om5.jpg"],
    academia: ["da1.jpg", "da2.jpg", "da3.jpg", "da4.jpg", "da5.jpg"],
    fluid: ["gf1.jpg", "gf2.jpg", "gf3.jpg", "gf4.jpg", "gf5.jpg"]
};

/**
 * Main Function: Trends Matrix Toggle & Gallery
 * logic: Agar 'active' hai toh close karo, nahi toh open karo.
 */
function updateTrendMatrix(clickedElement) {
    const selectedTrend = clickedElement.getAttribute('data-trend');
    
    // Agar user ne 'Upload Card' par click kiya hai, toh ye function stop (Modal handles it)
    if (!selectedTrend) return;

    // --- TOGGLE LOCK LOGIC ---
    // Agar clicked element pehle se active hai, toh iska matlab user band karna chahta hai
    if (clickedElement.classList.contains('active')) {
        console.log("Closing current trend...");
        resetMatrix();
        return; 
    }

    // --- OPEN LOGIC ---
    // 1. Pehle sab kuch clean karein (Reset)
    resetMatrix();

    // 2. Clicked box ko 'active' state mein daalo
    clickedElement.classList.add('active');

    // 3. Baaki boxes mein photos distribute karein
    const allItems = Array.from(document.querySelectorAll('.matrix-item'));
    const otherItems = allItems.filter(item => item !== clickedElement && !item.classList.contains('upload-card'));
    const photosToDistribute = trendArchives[selectedTrend];

    otherItems.forEach((item, index) => {
        // Gallery mode enable karo
        item.classList.add('is-gallery');
        const galleryDiv = item.querySelector('.trend-gallery-view');
        
        if (galleryDiv && photosToDistribute && photosToDistribute[index]) {
            // Path: assets/trends/
            galleryDiv.innerHTML = `<img src="assets/trends/${photosToDistribute[index]}" class="gallery-thumb-single">`;
        }
    });
}

/**
 * Helper Function: Matrix ko wapas normal state mein laane ke liye
 */
function resetMatrix() {
    document.querySelectorAll('.matrix-item').forEach(item => {
        item.classList.remove('active', 'is-gallery');
        const galleryDiv = item.querySelector('.trend-gallery-view');
        if (galleryDiv) galleryDiv.innerHTML = '';
    });
}

/**
 * Modal Controls for Uploading
 */
function openUploadModal() {
    const modal = document.getElementById('uploadModal');
    if(modal) modal.style.display = 'flex';
}

function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    if(modal) modal.style.display = 'none';
}

// Window click listener to close modal if clicked outside
window.onclick = function(event) {
    const modal = document.getElementById('uploadModal');
    if (event.target == modal) {
        closeUploadModal();
    }
};

function handleNewPost() {
    // 1. Get Input values
    const trendName = document.querySelector('#uploadModal input[type="text"]').value;
    const fileInput = document.getElementById('fileInput');
    
    if (!trendName || !fileInput.files[0]) {
        alert("Please enter a name and select an image first!");
        return;
    }

    // 2. Create a temporary URL for the image (Local preview)
    const imageUrl = URL.createObjectURL(fileInput.files[0]);

    // 3. Create the New Trend Box HTML
    const newBox = document.createElement('div');
    newBox.className = 'matrix-item';
    newBox.setAttribute('data-trend', trendName.toLowerCase().replace(/\s/g, ''));
    newBox.onclick = function() { updateTrendMatrix(this); };

    newBox.innerHTML = `
        <div class="matrix-img"><img src="${imageUrl}" alt="${trendName}"></div>
        <div class="matrix-info">
            <h3>${trendName}</h3>
            <p>EXPLORE ARCHIVE</p>
        </div>
        <div class="trend-gallery-view"></div>
    `;

    // 4. Insert it into the Matrix (Before the Upload Card)
    const matrix = document.getElementById('styleMatrix');
    const uploadCard = document.querySelector('.upload-card');
    matrix.insertBefore(newBox, uploadCard);

    // 5. Success & Close
    alert("Trend Posted Locally! (Note: Since we don't have a database connected yet, it will disappear on refresh)");
    closeUploadModal();
    
    // Reset form
    document.querySelector('#uploadModal input[type="text"]').value = '';
    fileInput.value = '';
}