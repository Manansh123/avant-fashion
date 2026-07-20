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
    function applyBannerScrollEffect() {
        const scrollValue = window.scrollY;
        const nav = document.querySelector('.navbar');

        // Desktop — pehle jaisa hi: rectangle se shuru, scroll se scale+width+curve
        if (banner && window.innerWidth > 768 && scrollValue < 600) {
            const scale = 1 - (scrollValue / 10000);
            const borderRadius = scrollValue / 10;      // 0 se shuru — rectangle pehle
            const width = 100 - (scrollValue / 500);

            banner.style.transform = `scale(${scale > 0.85 ? scale : 0.85})`;
            banner.style.borderRadius = `${borderRadius > 60 ? 60 : borderRadius}px`;
            banner.style.width = `${width < 90 ? 90 : width}%`;
        } else if (banner && window.innerWidth <= 768) {
            // Mobile — same "chota hona" effect jaisa desktop pe, lekin width%
            // nahi chhedte (usi se object-fit:cover crop-bug aata tha).
            // transform:scale() se hi visually chota hota hai, crop safe rehta.
            const mScroll = Math.min(scrollValue, 400);
            const scale = 1 - (mScroll / 7000);          // desktop jaisa hi shrink feel
            const borderRadius = mScroll / 12;            // 0 se shuru — rectangle pehle

            banner.style.transform = `scale(${scale > 0.88 ? scale : 0.88})`;
            banner.style.width = '100%';
            banner.style.borderRadius = `${borderRadius > 40 ? 40 : borderRadius}px`;
        }

        if (nav) {
            scrollValue > 50 ? nav.classList.add('scrolled') : nav.classList.remove('scrolled');
        }
    }

    window.addEventListener('scroll', applyBannerScrollEffect);
    applyBannerScrollEffect(); // load pe ek baar — starting state (rectangle) set ho

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
    const burger   = document.querySelector('.burger-menu');
    const navLinks = document.querySelector('.nav-links');
    const overlay  = document.querySelector('.nav-overlay');

    if (burger && navLinks) {
        burger.onclick = () => {
            const opening = !navLinks.classList.contains('nav-active');
            navLinks.classList.toggle('nav-active');
            burger.classList.toggle('active');
            if (overlay) overlay.classList.toggle('active');
            opening ? forceMenuLightColors() : clearMenuColorOverride();
        };
    }

    if (navLinks) {
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', closeMobileMenu);
        });
    }
}

// Menu ke andar background hamesha dark hota hai (nav-links.nav-active bg)
// isliye logo/text ko yahan hamesha white force karo — page ke black-override
// rules (build-page/trends-page) ko yahan override karna zaroori hai warna
// black-on-black ho ke invisible ho jaate. Inline !important sabse pakka jeetta hai.
function forceMenuLightColors() {
    document.querySelectorAll('.nav-links a').forEach(a => a.style.setProperty('color', '#fff', 'important'));
    document.querySelectorAll('.logo-image, .logo-name-image').forEach(img =>
        img.style.setProperty('filter', 'invert(0) brightness(1)', 'important'));
}
function clearMenuColorOverride() {
    document.querySelectorAll('.nav-links a').forEach(a => a.style.removeProperty('color'));
    document.querySelectorAll('.logo-image, .logo-name-image').forEach(img => img.style.removeProperty('filter'));
}

function closeMobileMenu() {
    const burger   = document.querySelector('.burger-menu');
    const navLinks = document.querySelector('.nav-links');
    const overlay  = document.querySelector('.nav-overlay');
    if (navLinks) navLinks.classList.remove('nav-active');
    if (burger)   burger.classList.remove('active');
    if (overlay)  overlay.classList.remove('active');
    clearMenuColorOverride();
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