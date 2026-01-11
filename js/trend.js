const trendArchives = {
    grandpa: ["gp1.jpg", "gp2.jpg", "gp3.jpg", "gp4.jpg", "gp5.jpg"],
    streetwear: ["sl1.jpg", "sl2.jpg", "sl3.jpg", "sl4.jpg", "sl5.jpg"],
    y2k: ["y1.jpg", "y2.jpg", "y3.jpg", "y4.jpg", "y5.jpg"],
    oldmoney: ["om1.jpg", "om2.jpg", "om3.jpg", "om4.jpg", "om5.jpg"],
    academia: ["da1.jpg", "da2.jpg", "da3.jpg", "da4.jpg", "da5.jpg"],
    fluid: ["gf1.jpg", "gf2.jpg", "gf3.jpg", "gf4.jpg", "gf5.jpg"]
};

function updateTrendMatrix(clickedElement) {
    const selectedTrend = clickedElement.getAttribute('data-trend');
    const allItems = Array.from(document.querySelectorAll('.matrix-item'));

    // Reset Logic: Agar same active trend par click ho toh matrix wapas normal kar do
    if (clickedElement.classList.contains('active')) {
        allItems.forEach(item => {
            item.classList.remove('active', 'is-gallery');
            const galleryDiv = item.querySelector('.trend-gallery-view');
            if (galleryDiv) galleryDiv.innerHTML = '';
        });
        return;
    }

    // 1. Sabhi boxes ko reset karein
    allItems.forEach(item => {
        item.classList.remove('active', 'is-gallery');
        const galleryDiv = item.querySelector('.trend-gallery-view');
        if (galleryDiv) galleryDiv.innerHTML = '';
    });

    // 2. Clicked box ko 'active' banayein
    clickedElement.classList.add('active');

    // 3. Baaki ke 5 boxes mein images distribute karein
    const otherItems = allItems.filter(item => item !== clickedElement);
    const photosToDistribute = trendArchives[selectedTrend];

    otherItems.forEach((item, index) => {
        item.classList.add('is-gallery');
        const galleryDiv = item.querySelector('.trend-gallery-view');
        
        if (galleryDiv && photosToDistribute[index]) {
            const img = document.createElement('img');
            // PATH UPDATED HERE: assets/trends/ folder
            img.src = `assets/trends/${photosToDistribute[index]}`;
            img.className = 'gallery-thumb-single';
            galleryDiv.appendChild(img);
        }
    });
}