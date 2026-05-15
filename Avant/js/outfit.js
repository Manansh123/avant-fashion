
console.log("AVANT OUTFIT LAB LOADED");

// --- THE OUTFIT LAB: BRAIN (ENGLISH VERSION) ---
const outfitDatabase = {
    "jeans-blue-streetwear": {
        title: "STREET-LUXE CORE",
        tip: "Style your blue baggy jeans with an oversized graphic hoodie and chunky white sneakers for a definitive street aesthetic.",
        image: "assets/o4.jpg", 
        shop: "oversized-hoodie"
    },
    "jeans-black-oldmoney": {
        title: "QUIET LUXURY",
        tip: "Pair these black denims with a tucked-in cream polo and premium leather loafers to achieve a sophisticated minimalist look.",
        image: "assets/o1.jpg",
        shop: "cream-polo"
    },
    "shirt-white-oldmoney": {
        title: "CLASSIC OLD MONEY",
        tip: "Match this white linen shirt with beige chinos and a brown leather belt for a timeless, high-society silhouette.",
        image: "assets/o2.jpg",
        shop: "beige-chinos"
    },
    "hoodie-black-y2k": {
        title: "CYBER Y2K VIBE",
        tip: "Coordinate this black hoodie with baggy silver metallic pants and tinted sunglasses for a perfect 2000s revival look.",
        image: "assets/o3.jpg",
        shop: "silver-pants"
    },
    "cargo-beige-streetwear": {
        title: "URBAN EXPLORER",
        tip: "Layer your beige cargos with a fitted black compression shirt and technical boots to master the utility-chic trend.",
        image: "assets/o5.jpg",
        shop: "crop-top"
    }
};

function generateLook() {
    console.log("Synthesizing...");

    // 1. Inputs collect karna aur clean karna
    const typeElement = document.getElementById('item-type');
    const colorElement = document.getElementById('item-color');
    const vibeElement = document.getElementById('item-vibe');

    // ID Check Safety
    if (!typeElement || !colorElement || !vibeElement) {
        console.error("Error: Dropdown IDs nahi mili. Check your HTML.");
        return;
    }

    const type = typeElement.value.toLowerCase().trim();
    const color = colorElement.value.toLowerCase().trim();
    const vibe = vibeElement.value.toLowerCase().trim();

    // 2. Key Generation
    const searchKey = `${type}-${color}-${vibe}`;
    console.log("Generated Key:", searchKey);

    // 3. UI Elements
    const defaultMsg = document.getElementById('default-msg');
    const resultContent = document.getElementById('result-content');
    const outfitImg = document.getElementById('outfit-img');
    const vibeTitle = document.getElementById('vibe-title');
    const stylingTip = document.getElementById('styling-tip');
    const shopLink = document.getElementById('shop-link');

    // 4. Logic Apply karna
    if (outfitDatabase[searchKey]) {
        const data = outfitDatabase[searchKey];

        // UI Transformation
        if (defaultMsg) defaultMsg.style.display = 'none';
        if (resultContent) resultContent.style.display = 'block';

        // Content Update
        if (outfitImg) {
            outfitImg.src = data.image;
            outfitImg.onerror = function() {
                console.error("Image missing at: " + data.image);
                alert("File not found in assets/");
            };
        }
        
        if (vibeTitle) vibeTitle.innerText = data.title;
        if (stylingTip) stylingTip.innerText = data.tip;
        if (shopLink) shopLink.href = `shop.html?item=${data.shop}`;
        
        console.log("Success: " + data.title);
    } else {
        // Combination Fallback
        console.warn("No match for: " + searchKey);
        if (defaultMsg) {
            defaultMsg.style.display = 'block';
            defaultMsg.innerHTML = `
                <div style="padding: 20px; border: 1px dashed #000; text-align: center;">
                    <h3 style="font-family: Montserrat; font-size: 1rem;">COMBINATION NOT FOUND</h3>
                    <p style="font-size: 0.8rem;">Lab searched for: <b>${searchKey}</b></p>
                </div>
            `;
        }
        if (resultContent) resultContent.style.display = 'none';
    }
}