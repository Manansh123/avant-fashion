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
        
        if (elementId === 'nav-placeholder') {
            initLoginModal();
            initMobileMenu(); 
        }
    } catch (error) {
        console.error(error);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    loadComponent('nav-placeholder', 'navbar.html');
    loadComponent('footer-placeholder', 'footer.html');

    const banner = document.querySelector('.banner-image');
    const heroSection = document.querySelector('.hero');
    const statNumbers = document.querySelectorAll('.stat-number');
    const trendBtns = document.querySelectorAll('.trend-btn');

    // --- 2. MOBILE SPACE FIX (CRITICAL) ---
    // Phone par image load hote hi container ki extra height remove karein
    if (banner) {
        banner.onload = function() {
            if (window.innerWidth <= 768 && heroSection) {
                heroSection.style.height = 'auto';
                heroSection.style.minHeight = 'auto';
            }
        };
        // Agar image cache se load ho gayi ho
        if (banner.complete && window.innerWidth <= 768 && heroSection) {
            heroSection.style.height = 'auto';
            heroSection.style.minHeight = 'auto';
        }
    }

    // --- 3. SCROLL ANIMATIONS ---
    window.addEventListener('scroll', () => {
        const scrollValue = window.scrollY;
        const nav = document.querySelector('.navbar');

        // Zoom logic ONLY for Desktop
        if (banner && window.innerWidth > 768 && scrollValue < 600) { 
            const scale = 1 - (scrollValue / 10000); 
            const borderRadius = (scrollValue / 10); 
            const width = 100 - (scrollValue / 500); 

            banner.style.transform = `scale(${scale > 0.85 ? scale : 0.85})`;
            banner.style.borderRadius = `${borderRadius > 60 ? 60 : borderRadius}px`;
            banner.style.width = `${width < 90 ? 90 : width}%`;
        } else if (banner && window.innerWidth <= 768) {
            // Mobile par saare dynamic styles reset
            banner.style.transform = 'none';
            banner.style.borderRadius = '0';
            banner.style.width = '100%';
        }

        if (nav) {
            scrollValue > 50 ? nav.classList.add('scrolled') : nav.classList.remove('scrolled');
        }
    });

    // Stats Counter Animation (requestAnimationFrame for performance)
    const startCount = (el) => {
        const target = +el.getAttribute('data-target');
        const count = +el.innerText;
        const speed = 1500;
        const inc = target / (speed / 16);

        if (count < target) {
            el.innerText = Math.ceil(count + inc);
            requestAnimationFrame(() => startCount(el)); 
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
    }, { threshold: 0.3 });

    statNumbers.forEach(stat => statsObserver.observe(stat));

    if (trendBtns) {
        trendBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const trend = this.getAttribute('data-trend');
                showTrendOutfits(trend);
            });
        });
    }
});

function initMobileMenu() {
    const burger = document.querySelector('.burger-menu'); 
    const navLinks = document.querySelector('.nav-links');
    
    if (burger && navLinks) {
        burger.onclick = () => {
            navLinks.classList.toggle('nav-active');
            burger.classList.toggle('toggle');
        };
    }
}

function initLoginModal() {
    const modal = document.getElementById("loginModal");
    const loginBtn = document.querySelector(".login-btn");
    const closeBtn = document.querySelector(".close-modal");

    if (loginBtn && modal) {
        loginBtn.onclick = (e) => {
            e.preventDefault();
            modal.style.display = "block";
        };
    }
    if (closeBtn) closeBtn.onclick = () => modal.style.display = "none";
    window.onclick = (event) => { if (event.target == modal) modal.style.display = "none"; };
}

function showTrendOutfits(trend) {
    const outfits = {
        streetwear: ['Graphic Tee, Jeans, Sneakers', 'Hoodie, Cargo Pants, Boots'],
        y2k: ['Crop Top, Low Rise Jeans, Platforms', 'Velvet Dress, Choker, Heels'],
        minimal: ['White Tee, Black Pants, Loafers', 'Blazer, Slacks, Ballet Flats']
    };
    const preview = document.getElementById('outfit-preview');
    if (preview && outfits[trend]) {
        preview.innerHTML = ''; 
        outfits[trend].forEach(outfit => {
            const div = document.createElement('div');
            div.className = 'outfit-preview-item';
            div.textContent = outfit;
            preview.appendChild(div);
        });
    }
}