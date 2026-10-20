import { useEffect, useState } from 'react';

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [userName, setUserName] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('avantUserName');
        if (storedUser) {
            setUserName(storedUser);
        }

        function handleScroll() {
            setScrolled(window.scrollY > 50);
        }

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    function toggleMenu() {
        setMenuOpen((prev) => !prev);
    }

    function closeMenu() {
        setMenuOpen(false);
    }

    function handleAuthClick(e) {
        if (userName) {
            e.preventDefault();
            if (window.confirm('Logout from Avant Ecosystem?')) {
                localStorage.removeItem('avantUserName');
                setUserName(null);
                window.location.href = 'index.html';
            }
        }
    }

    const lightColorStyle = menuOpen ? { color: '#fff' } : undefined;
    const lightLogoStyle = menuOpen ? { filter: 'invert(0) brightness(1)' } : undefined;

    return (
        <>
            <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
                <div className="container">
                    <div className="logo-container">
                        <a href="index.html" className="logo-link">
                            <img
                                src="assets/logo.png"
                                alt="Avant"
                                className="logo-image"
                                style={lightLogoStyle}
                            />
                            <img
                                src="assets/logoname.png"
                                alt="Avant"
                                className="logo-name-image"
                                style={lightLogoStyle}
                            />
                        </a>
                    </div>

                    <div className="nav-right-group">
                        <ul className={`nav-links ${menuOpen ? 'nav-active' : ''}`} id="navLinks">
                            <li><a href="index.html" style={lightColorStyle} onClick={closeMenu}>Home</a></li>
                            <li><a href="trends.html" style={lightColorStyle} onClick={closeMenu}>Trends</a></li>
                            <li><a href="outfit.html" style={lightColorStyle} onClick={closeMenu}>Build Outfit</a></li>
                            <li><a href="wardrobe.html" style={lightColorStyle} onClick={closeMenu}>Wardrobe</a></li>
                            <li><a href="shop.html" style={lightColorStyle} onClick={closeMenu}>Shop</a></li>
                            <li><a href="tryon.html" style={lightColorStyle} onClick={closeMenu}>Try-On</a></li>
                        </ul>
                        <a
                            href={userName ? '#' : 'login.html'}
                            id="authBtn"
                            className={`login-btn ${userName ? 'login-btn-active' : ''}`}
                            style={userName ? { cursor: 'pointer' } : undefined}
                            onClick={handleAuthClick}
                        >
                            {userName ? `@${userName.toLowerCase()}` : 'Log In / Sign Up'}
                        </a>

                        {/* HAMBURGER — only visible on mobile */}
                        <button
                            className={`burger-menu ${menuOpen ? 'toggle' : ''}`}
                            id="burgerMenu"
                            aria-label="Toggle menu"
                            type="button"
                            onClick={toggleMenu}
                        >
                            <span></span>
                            <span></span>
                            <span></span>
                        </button>
                    </div>
                </div>
            </nav>

            <button
                className={`mobile-menu-close-btn ${menuOpen ? 'active' : ''}`}
                id="mobileMenuCloseBtn"
                aria-label="Close menu"
                type="button"
                onClick={closeMenu}
            >
                &times;
            </button>

            {/* Mobile overlay close area */}
            <div
                className={`nav-overlay ${menuOpen ? 'active' : ''}`}
                id="navOverlay"
                onClick={closeMenu}
            ></div>
        </>
    );
}
