console.log("AVANT JS LOADED");

// Refresh par page top par rahe
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

// --- 1. COMPONENT LOADER (Navbar & Footer) ---
async function loadComponent(elementId, filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`Failed to load ${filePath}`);
        const data = await response.text();
        document.getElementById(elementId).innerHTML = data;
        
        // Agar navbar load ho raha hai, toh modal logic init karein
        if (elementId === 'nav-placeholder') {
            initLoginModal();
        }
    } catch (error) {
        console.error(error);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Navbar aur Footer load karein
    loadComponent('nav-placeholder', 'navbar.html');
    loadComponent('footer-placeholder', 'footer.html');

    // --- 2. ELEMENT SELECTIONS ---
    const banner = document.querySelector('.banner-image');
    const brandVisionSections = document.querySelectorAll('.brand-vision');
    const statNumbers = document.querySelectorAll('.stat-number');
    const trendBtns = document.querySelectorAll('.trend-btn');

    // --- 3. SCROLL & INTERSECTION ANIMATIONS ---
    window.addEventListener('scroll', () => {
        const scrollValue = window.scrollY;
        const nav = document.querySelector('.navbar');

        // Banner Zoom & Curve (Sirf Homepage)
        if (banner && scrollValue < 600) { 
            const scale = 1 - (scrollValue / 10000); 
            const borderRadius = (scrollValue / 10); 
            const width = 100 - (scrollValue / 500); 

            banner.style.transform = `scale(${scale > 0.85 ? scale : 0.85})`;
            banner.style.borderRadius = `${borderRadius > 60 ? 60 : borderRadius}px`;
            banner.style.width = `${width < 90 ? 90 : width}%`;
        }

        // Navbar Scrolled Class toggle
        if (nav) {
            if (scrollValue > 50) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
        }
    });

    // Stats Counter Animation
    const startCount = (el) => {
        const target = +el.getAttribute('data-target');
        const count = +el.innerText;
        const speed = 800; 
        const inc = target / speed;

        if (count < target) {
            el.innerText = Math.ceil(count + inc);
            setTimeout(() => startCount(el), 1); 
        } else {
            el.innerText = target;
        }
    };

    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                startCount(entry.target);
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    statNumbers.forEach(stat => statsObserver.observe(stat));

    // Trend Discovery Buttons (Page 2 Logic)
    if (trendBtns) {
        trendBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const trend = this.getAttribute('data-trend');
                showTrendOutfits(trend);
            });
        });
    }
});

// --- 4. LOGIN MODAL INITIALIZATION ---
function initLoginModal() {
    const modal = document.getElementById("loginModal");
    const loginBtn = document.querySelector(".login-btn");
    const closeBtn = document.querySelector(".close-modal");
    const loginForm = document.getElementById("avantLoginForm");

    if (loginBtn && modal) {
        loginBtn.onclick = (e) => {
            e.preventDefault();
            modal.style.display = "block";
        };
    }

    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.style.display = "none";
        };
    }

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    };

    if (loginForm) {
        loginForm.onsubmit = (e) => {
            e.preventDefault();
            alert("Success! Welcome to AVANT.");
            modal.style.display = "none";
        };
    }
}

// --- 5. HELPER FUNCTIONS ---
function showTrendOutfits(trend) {
    const outfits = {
        streetwear: ['Graphic Tee, Jeans, Sneakers', 'Hoodie, Cargo Pants, Boots'],
        y2k: ['Crop Top, Low Rise Jeans, Platforms', 'Velvet Dress, Choker, Heels'],
        minimal: ['White Tee, Black Pants, Loafers', 'Blazer, Slacks, Ballet Flats']
    };

    const preview = document.getElementById('outfit-preview');
    if (preview) {
        preview.innerHTML = ''; 
        outfits[trend].forEach(outfit => {
            const div = document.createElement('div');
            div.className = 'outfit-preview';
            div.style.opacity = '0'; 
            div.textContent = outfit;
            preview.appendChild(div);
            
            setTimeout(() => {
                div.style.transition = 'opacity 0.5s ease';
                div.style.opacity = '1';
            }, 10);
        });
    }
}