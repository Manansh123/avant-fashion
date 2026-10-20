import { useEffect, useRef, useState } from 'react';
import Layout from '../common/Layout.jsx';

function StatItem({ target, suffix, label }) {
    const [count, setCount] = useState(0);
    const statRef = useRef(null);
    const hasAnimatedRef = useRef(false);

    useEffect(() => {
        const el = statRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !hasAnimatedRef.current) {
                        hasAnimatedRef.current = true;
                        const speed = 1500;
                        const inc = target / (speed / 16);
                        let current = 0;

                        const step = () => {
                            current += inc;
                            if (current < target) {
                                setCount(Math.ceil(current));
                                requestAnimationFrame(step);
                            } else {
                                setCount(target);
                            }
                        };
                        requestAnimationFrame(step);
                        observer.unobserve(el);
                    }
                });
            },
            { threshold: 0.3 }
        );

        observer.observe(el);

        return () => {
            observer.disconnect();
        };
    }, [target]);

    return (
        <div className="stat-item" ref={statRef}>
            <span className="stat-number">{count}</span>
            <span className="stat-plus">{suffix}</span>
            <p className="stat-label">{label}</p>
        </div>
    );
}

export default function HomePage() {
    const bannerRef = useRef(null);
    const heroRef = useRef(null);

    useEffect(() => {
        // Ensure scroll starts top
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }
        window.scrollTo(0, 0);

        const banner = bannerRef.current;
        const heroSection = heroRef.current;

        // Mobile banner fix
        function handleBannerLoad() {
            if (window.innerWidth <= 768 && heroSection) {
                heroSection.style.height = 'auto';
                heroSection.style.minHeight = 'auto';
            }
        }

        if (banner) {
            if (banner.complete) {
                handleBannerLoad();
            } else {
                banner.addEventListener('load', handleBannerLoad);
            }
        }

        // Banner scroll effect
        function applyBannerScrollEffect() {
            const scrollValue = window.scrollY;
            if (!banner) return;

            if (window.innerWidth > 768 && scrollValue < 600) {
                const scale = 1 - scrollValue / 10000;
                const borderRadius = scrollValue / 10;
                const width = 100 - scrollValue / 500;

                banner.style.transform = `scale(${scale > 0.85 ? scale : 0.85})`;
                banner.style.borderRadius = `${borderRadius > 60 ? 60 : borderRadius}px`;
                banner.style.width = `${width < 90 ? 90 : width}%`;
            } else if (window.innerWidth <= 768) {
                const mScroll = Math.min(scrollValue, 400);
                const scale = 1 - mScroll / 7000;
                const borderRadius = mScroll / 12;

                banner.style.transform = `scale(${scale > 0.88 ? scale : 0.88})`;
                banner.style.width = '100%';
                banner.style.borderRadius = `${borderRadius > 40 ? 40 : borderRadius}px`;
            }
        }

        window.addEventListener('scroll', applyBannerScrollEffect, { passive: true });
        applyBannerScrollEffect();

        // Mobile tool rows observer
        let rowObserver = null;
        const toolRows = document.querySelectorAll('.tool-row');
        if (toolRows.length && window.innerWidth <= 768) {
            rowObserver = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('in-view');
                        }
                    });
                },
                { threshold: 0.4 }
            );
            toolRows.forEach((row) => rowObserver.observe(row));
        }

        return () => {
            window.removeEventListener('scroll', applyBannerScrollEffect);
            if (banner) banner.removeEventListener('load', handleBannerLoad);
            if (rowObserver) rowObserver.disconnect();
        };
    }, []);

    return (
        <Layout>
            <section className="hero" ref={heroRef}>
                <img
                    src="assets/Designed.png"
                    alt="Avant Banner"
                    className="banner-image"
                    ref={bannerRef}
                />
            </section>

            <section className="brand-vision">
                <div className="container">
                    <div className="vision-wrapper">
                        <p className="vision-subtext">00 / Philosophy</p>
                        <h1 className="vision-main-heading">
                            AVANT IS A DIALOGUE <br />
                            <span>BETWEEN LOGIC AND INTUITION</span>
                        </h1>

                        <div className="vision-grid">
                            <div className="vision-left">
                                <p className="vision-intro">
                                    Fashion is not just what you wear — it’s how you think, how you feel, and how you move
                                    through the world. Avant represents what comes next: a forward-thinking approach.
                                </p>
                            </div>

                            <div className="vision-right">
                                <p className="vision-system-title">The System of Balance:</p>
                                <ul className="vision-list">
                                    <li><strong>LOGIC</strong> — to understand structure and proportion.</li>
                                    <li><strong>MIND</strong> — to reflect intention and confidence.</li>
                                    <li><strong>BODY</strong> — to respect fit and fabric.</li>
                                </ul>
                            </div>
                        </div>

                        <h2 className="vision-outro">
                            “We don’t create outfits, <br />
                            We curate <span>alignments</span>.”
                        </h2>
                    </div>
                </div>
            </section>

            <section className="tech-stats">
                <div className="container stats-grid">
                    <StatItem target={500} suffix="+" label="Color Harmonies" />
                    <StatItem target={24} suffix="/7" label="Style Logic" />
                    <StatItem target={100} suffix="%" label="Avant Approved" />
                </div>
            </section>

            <section className="explore-tools">
                <div className="container content-wrapper">
                    <h2 className="section-heading">
                        The Future of <br />Personal Styling.
                    </h2>

                    <div className="tool-row">
                        <div className="tool-text">
                            <span className="tool-number">01</span>
                            <h3>Trend Discovery</h3>
                            <p>
                                Decoding the visual language of the now. We parse global fashion data to bring you curated
                                insights into Y2K revivals and Modern Minimalist movements.
                            </p>
                            <a href="trends.html" className="btn">Explore Trends</a>
                        </div>
                        <div className="tool-image">
                            <img src="assets/trend-discovery.jpeg" alt="Trend Discovery" />
                        </div>
                    </div>

                    <div className="tool-row reverse">
                        <div className="tool-text">
                            <span className="tool-number">02</span>
                            <h3>Outfit Builder</h3>
                            <p>
                                Styling as a science. Our rule-based system harmonizes color theory and occasion-appropriateness
                                for an "Avant Approved" look.
                            </p>
                            <a href="outfit.html" className="btn">Start Building</a>
                        </div>
                        <div className="tool-image">
                            <img src="assets/outfit-builder.jpg" alt="Outfit Builder" />
                        </div>
                    </div>

                    <div className="tool-row">
                        <div className="tool-text">
                            <span className="tool-number">03</span>
                            <h3>Digital Wardrobe</h3>
                            <p>
                                Digitize your wardrobe to identify missing links and suggest new ways to style your existing
                                favorites sustainably.
                            </p>
                            <a href="wardrobe.html" className="btn">My Wardrobe</a>
                        </div>
                        <div className="tool-image">
                            <img src="assets/virtual-wardrobe.jpg" alt="Virtual Wardrobe" />
                        </div>
                    </div>

                    <div className="tool-row reverse">
                        <div className="tool-text">
                            <span className="tool-number">04</span>
                            <h3>Shop the Look</h3>
                            <p>
                                Directly shop curated outfits tailored to your style profile, connecting you with top brands for
                                a seamless styling journey.
                            </p>
                            <a href="shop.html" className="btn">Shop Now</a>
                        </div>
                        <div className="tool-image">
                            <img src="assets/shop-the-look.jpg" alt="Shop the Look" />
                        </div>
                    </div>

                    <div className="tool-row">
                        <div className="tool-text">
                            <span className="tool-number">05</span>
                            <h3>Virtual Try-On</h3>
                            <p>
                                See how new styles look on you before you buy, making every outfit choice more confident and personal.
                            </p>
                            <a href="tryon.html" className="btn">Try On Now</a>
                        </div>
                        <div className="tool-image">
                            <img src="assets/try-on.png" alt="Virtual Try-On" />
                        </div>
                    </div>
                </div>
            </section>
        </Layout>
    );
}
