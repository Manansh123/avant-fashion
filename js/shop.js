// --- SHOP YOUR LOOK: SEARCH LOGIC ---

const platformDB = [
    { name: "Amazon", price: "₹2,499", img: "assets/1.jpeg" },
    { name: "Flipkart", price: "₹3,150", img: "assets/2.jpeg" },
    { name: "Myntra", price: "₹4,990", img: "assets/3.jpeg" },
    { name: "Ajio", price: "₹12,400", img: "assets/4.jpeg" }
];

function performSearch() {
    const query = document.getElementById('shop-search').value.trim();
    const resultsGrid = document.getElementById('shop-results');

    if (query === "") {
        alert("Please enter a style or item to search.");
        return;
    }

    // Clear and Show Loading state
    resultsGrid.innerHTML = '<p class="initial-msg">Scouring platforms for the perfect match...</p>';

    setTimeout(() => {
        resultsGrid.innerHTML = ''; // Clear loading msg

        platformDB.forEach(item => {
            const productHTML = `
                <div class="product-box">
                    <span class="platform-tag">${item.name.toUpperCase()}</span>
                    <img src="${item.img}" alt="${query}">
                    <h4>${query.toUpperCase()}</h4>
                    <p>${item.price}</p>
                    <a href="#" class="shop-now-btn">VIEW ON ${item.name.toUpperCase()}</a>
                </div>
            `;
            resultsGrid.innerHTML += productHTML;
        });
        
        // Scroll smoothly to results
        resultsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 800);
}