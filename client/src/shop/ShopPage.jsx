import { useEffect, useRef, useState } from 'react';
import Layout from '../common/Layout.jsx';
import { getRandomFashionQuote } from '../common/quotes.js';

const PLATFORM_DB = [
    { name: "Amazon", color: "#FF9900", getUrl: (q) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}` },
    { name: "Flipkart", color: "#2874F0", getUrl: (q) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}` },
    { name: "Myntra", color: "#FF3F6C", getUrl: (q) => `https://www.myntra.com/${encodeURIComponent(q)}` },
    { name: "Ajio", color: "#E31837", getUrl: (q) => `https://www.ajio.com/search/?text=${encodeURIComponent(q)}` },
    { name: "Nykaa Fashion", color: "#FC2779", getUrl: (q) => `https://www.nykaafashion.com/catalogsearch/result/?q=${encodeURIComponent(q)}` },
    { name: "TataCliq", color: "#E71C24", getUrl: (q) => `https://www.tatacliq.com/search/?searchCategory=all&text=${encodeURIComponent(q)}` },
    { name: "Snapdeal", color: "#E40046", getUrl: (q) => `https://www.snapdeal.com/search?keyword=${encodeURIComponent(q)}` },
    { name: "Meesho", color: "#9F2089", getUrl: (q) => `https://www.meesho.com/search?q=${encodeURIComponent(q)}` }
];

const PLATFORM_IMGS = ['assets/1.jpeg', 'assets/2.jpeg', 'assets/3.jpeg', 'assets/4.jpeg'];

const PLATFORM_COLORS = {
    Amazon: { line: '#FF9900', fill: 'rgba(255,153,0,0.15)' },
    Flipkart: { line: '#2874F0', fill: 'rgba(40,116,240,0.15)' },
    Myntra: { line: '#FF3F6C', fill: 'rgba(255,63,108,0.15)' },
    Ajio: { line: '#111111', fill: 'rgba(17,17,17,0.10)' },
    'Nykaa Fashion': { line: '#FC2779', fill: 'rgba(252,39,121,0.15)' },
    TataCliq: { line: '#E71C24', fill: 'rgba(231,28,36,0.15)' },
    Snapdeal: { line: '#E40046', fill: 'rgba(228,0,70,0.15)' },
    Meesho: { line: '#9F2089', fill: 'rgba(159,32,137,0.15)' }
};

function starString(rating) {
    const full = Math.round(rating);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
}

function parsePrice(priceStr) {
    if (!priceStr) return null;
    const num = parseFloat(String(priceStr).replace(/[^\d.]/g, ''));
    return isNaN(num) ? null : num;
}

export default function ShopPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [syncPills, setSyncPills] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentQuote, setCurrentQuote] = useState(() => getRandomFashionQuote());
    const [searchResults, setSearchResults] = useState(null); // array of { item, realData }
    const searchTokenRef = useRef(0);
    const chartInstanceRef = useRef(null);
    const resultsRef = useRef(null);

    // Initial load: check bridge
    useEffect(() => {
        const raw = localStorage.getItem('avant_shopping_sync');
        if (!raw) return;

        try {
            const items = JSON.parse(raw);
            if (!Array.isArray(items) || items.length === 0) return;
            localStorage.removeItem('avant_shopping_sync');

            const cleanItems = items.map((i) => i && i.trim()).filter(Boolean);
            setSyncPills(cleanItems);

            if (cleanItems.length === 1) {
                setSearchQuery(cleanItems[0]);
                setTimeout(() => doSearch(cleanItems[0]), 400);
            } else if (cleanItems.length > 1) {
                setSearchQuery(cleanItems.join(', '));
                setTimeout(() => doMultiSearch(cleanItems), 400);
            }
        } catch (err) {
            console.warn('Could not parse avant_shopping_sync:', err.message);
            localStorage.removeItem('avant_shopping_sync');
        }
    }, []);

    async function fetchComparison(q) {
        try {
            const res = await fetch(`/api/shop-compare?q=${encodeURIComponent(q)}`, {
                signal: AbortSignal.timeout(45000)
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            return data.results;
        } catch (err) {
            console.warn('Comparison fetch failed:', err.message);
            return null;
        }
    }

    async function doSearch(queryOverride) {
        const query = (queryOverride || searchQuery).trim();
        if (!query) {
            alert('Please enter a style or item to search.');
            return;
        }

        if (queryOverride) setSearchQuery(queryOverride);

        const myToken = ++searchTokenRef.current;
        setIsLoading(true);
        setCurrentQuote(getRandomFashionQuote());
        setSearchResults(null);

        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

        const data = await fetchComparison(query);
        if (myToken !== searchTokenRef.current) return;

        setIsLoading(false);
        setSearchResults([{ item: query, data }]);
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    async function doMultiSearch(itemList) {
        const myToken = ++searchTokenRef.current;
        setIsLoading(true);
        setCurrentQuote(getRandomFashionQuote());
        setSearchResults(null);

        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

        const allResults = await Promise.all(
            itemList.map(async (item) => ({ item, data: await fetchComparison(item) }))
        );

        if (myToken !== searchTokenRef.current) return;

        setIsLoading(false);
        setSearchResults(allResults);
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    return (
        <Layout>
            <main className="shop-page">
                <header className="shop-hero">
                    <div className="hero-overlay">
                        <p className="editorial-label-ward">04 / CURATED SELECTIONS</p>
                        <h1 className="shop-title">
                            SHOP <span>YOUR LOOK</span>
                        </h1>
                        <blockquote className="shop-quote">
                            "Fashion is the armor to survive the reality of everyday life."
                        </blockquote>

                        <div className="search-container">
                            <input
                                type="text"
                                id="shop-search"
                                placeholder="Search for products (e.g. Linen Shirt)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        doSearch();
                                    }
                                }}
                            />
                            <button id="search-btn" type="button" onClick={() => doSearch()}>
                                SEARCH
                            </button>
                        </div>
                    </div>
                </header>

                <section className="results-section" ref={resultsRef}>
                    {/* Sync pills banner */}
                    {syncPills.length > 0 && (
                        <div
                            id="outfit-sync-banner"
                            style={{
                                padding: '30px 5%',
                                background: '#f9f9f9',
                                borderBottom: '1px solid #eee',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '14px'
                            }}
                        >
                            <p
                                style={{
                                    fontFamily: "'Montserrat', sans-serif",
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    letterSpacing: '4px',
                                    color: '#aaa',
                                    textTransform: 'uppercase',
                                    margin: 0
                                }}
                            >
                                ✦ &nbsp; FROM YOUR OUTFIT LAB
                            </p>
                            <div id="sync-pills" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                {syncPills.map((pillItem, idx) => (
                                    <SyncPill
                                        key={idx}
                                        label={pillItem}
                                        onClick={() => doSearch(pillItem)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="results-grid" id="shop-results">
                        {isLoading && (
                            <div className="shop-loading-state" style={{ gridColumn: '1/-1' }}>
                                <div className="loading-bars">
                                    <span></span><span></span><span></span><span></span><span></span>
                                </div>
                                {currentQuote && (
                                    <div className="fashion-quote-block">
                                        <p className="fashion-quote-text">"{currentQuote.quote}"</p>
                                        <p className="fashion-quote-author">{currentQuote.author}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {!isLoading && !searchResults && (
                            <p className="initial-msg">
                                Enter a product name to begin your curation.
                            </p>
                        )}

                        {!isLoading && searchResults && (
                            <>
                                {searchResults.map(({ item, data }, secIdx) => (
                                    <div key={secIdx} style={{ display: 'contents' }}>
                                        {searchResults.length > 1 && (
                                            <div
                                                style={{
                                                    gridColumn: '1/-1',
                                                    fontFamily: "'Montserrat', sans-serif",
                                                    fontSize: '0.72rem',
                                                    fontWeight: 700,
                                                    letterSpacing: '3px',
                                                    textTransform: 'uppercase',
                                                    color: '#000',
                                                    borderTop: '1px solid #eee',
                                                    paddingTop: '22px',
                                                    marginTop: '10px'
                                                }}
                                            >
                                                ✦ {item} ✦
                                            </div>
                                        )}

                                        {data ? (
                                            <RealComparisonBlock
                                                query={item}
                                                realData={data}
                                                chartRef={chartInstanceRef}
                                            />
                                        ) : (
                                            <FallbackLinksBlock query={item} />
                                        )}
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </section>
            </main>
        </Layout>
    );
}

function SyncPill({ label, onClick }) {
    const [hovered, setHovered] = useState(false);

    return (
        <button
            type="button"
            style={{
                padding: '8px 18px',
                border: '1.5px solid #000',
                background: hovered ? '#000' : '#fff',
                color: hovered ? '#fff' : '#000',
                fontFamily: "'Montserrat', sans-serif",
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.25s ease'
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={onClick}
        >
            {label}
        </button>
    );
}

function RealComparisonBlock({ query, realData }) {
    const available = realData.filter((r) => r.available && r.rating);
    const avgRating = available.length
        ? available.reduce((sum, r) => sum + r.rating, 0) / available.length
        : 0;
    const MIN_VOTES = 50;

    function weightedScore(r) {
        const v = r.reviews || 0;
        const R = r.rating;
        return (v / (v + MIN_VOTES)) * R + (MIN_VOTES / (v + MIN_VOTES)) * avgRating;
    }

    const best = available.length
        ? available.reduce((a, b) => (weightedScore(b) > weightedScore(a) ? b : a))
        : null;

    return (
        <>
            {realData.map((r, idx) => {
                if (!r.available) return null;
                const platform = PLATFORM_DB[idx];
                const isBest = best && r.site === best.site;

                return (
                    <div key={idx} className="product-box">
                        <span className="platform-tag">{platform.name.toUpperCase()}</span>
                        {isBest && (
                            <span
                                className="best-rated-badge"
                                title="Weighted by both rating AND review count — not just the highest star number"
                            >
                                ⭐ TOP RATED
                            </span>
                        )}
                        <img
                            src={r.thumbnail || PLATFORM_IMGS[idx % PLATFORM_IMGS.length]}
                            alt={r.title || query}
                            loading="lazy"
                        />
                        <h4>{(r.title || query).toUpperCase()}</h4>
                        <div className="real-stats-row">
                            {r.price && <span className="stat-price">{r.price}</span>}
                            {r.rating && (
                                <>
                                    <span className="stat-stars">{starString(r.rating)}</span>
                                    <span className="stat-rating-num">{r.rating}</span>
                                </>
                            )}
                        </div>
                        {r.reviews && (
                            <p className="stat-reviews">{r.reviews.toLocaleString('en-IN')} reviews</p>
                        )}
                        <p className="real-data-note">Confirm stock, size & delivery on {platform.name}</p>
                        <a
                            href={r.link || platform.getUrl(query)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shop-now-btn"
                        >
                            VIEW ON {platform.name.toUpperCase()} ↗
                        </a>
                    </div>
                );
            })}

            <RadarChartSection realData={realData} />
            <ReviewsSection realData={realData} />
        </>
    );
}

function RadarChartSection({ realData }) {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        const withData = realData
            .map((r, idx) => ({ ...r, name: PLATFORM_DB[idx].name }))
            .filter((r) => r.available && (r.rating || r.reviews || r.price));

        if (withData.length < 2 || typeof window.Chart === 'undefined') return;

        const havePrice = withData.filter((r) => r.price).length >= 2;
        const haveRating = withData.filter((r) => r.rating).length >= 2;
        const haveReviews = withData.filter((r) => r.reviews).length >= 2;

        const axes = [];
        if (havePrice) axes.push('price');
        if (haveRating) axes.push('rating');
        if (haveReviews) axes.push('reviews');
        if (axes.length < 2) return;

        const prices = withData.map((r) => parsePrice(r.price)).filter(Boolean);
        const minP = Math.min(...prices);
        const maxP = Math.max(...prices);
        const maxReviews = Math.max(...withData.map((r) => r.reviews || 0), 1);

        const axisLabels = axes.map((a) =>
            a === 'price' ? 'Price Value' : a === 'rating' ? 'Rating' : 'Popularity'
        );

        const datasets = withData.map((r) => {
            const colors = PLATFORM_COLORS[r.name] || { line: '#333', fill: 'rgba(51,51,51,0.12)' };
            const values = axes.map((a) => {
                if (a === 'price') {
                    const p = parsePrice(r.price);
                    if (!p || maxP === minP) return 50;
                    return Math.round((100 * (maxP - p)) / (maxP - minP));
                }
                if (a === 'rating') return r.rating ? Math.round((r.rating / 5) * 100) : 0;
                if (a === 'reviews') return Math.round(((r.reviews || 0) / maxReviews) * 100);
                return 0;
            });
            return {
                label: r.name,
                data: values,
                borderColor: colors.line,
                backgroundColor: colors.fill,
                pointBackgroundColor: colors.line,
                borderWidth: 2,
                pointRadius: 4
            };
        });

        if (chartRef.current) chartRef.current.destroy();

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        chartRef.current = new window.Chart(ctx, {
            type: 'radar',
            data: { labels: axisLabels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                font: { family: 'Montserrat' },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { font: { family: 'Montserrat', size: 11 }, color: '#333', boxWidth: 12 }
                    }
                },
                scales: {
                    r: {
                        min: 0,
                        max: 100,
                        ticks: {
                            display: true,
                            stepSize: 20,
                            backdropColor: 'transparent',
                            color: '#bbb',
                            font: { size: 10 },
                            callback: (val) => (val === 0 ? '' : String(val / 20))
                        },
                        grid: { color: '#e5e5e5' },
                        angleLines: { color: '#e5e5e5' },
                        pointLabels: { font: { family: 'Montserrat', size: 12, weight: '700' }, color: '#111' }
                    }
                }
            }
        });

        return () => {
            if (chartRef.current) chartRef.current.destroy();
        };
    }, [realData]);

    const withDataCount = realData.filter((r) => r.available && (r.rating || r.reviews || r.price)).length;
    if (withDataCount < 2) return null;

    return (
        <div className="compare-chart-wrap">
            <p className="compare-chart-label">✦ PLATFORM COMPARISON — REAL DATA ✦</p>
            <div className="compare-chart-canvas-box">
                <canvas ref={canvasRef} id="shop-compare-chart"></canvas>
            </div>
            <p className="compare-chart-footnote">
                Scale: 1 (worst) to 5 (best) on each axis — outer edge = better. Price Value: cheaper scores higher. Popularity: relative review volume among matched platforms.
            </p>
        </div>
    );
}

function ReviewsSection({ realData }) {
    const withReviews = realData
        .map((r, idx) => ({ ...r, name: PLATFORM_DB[idx].name }))
        .filter((r) => r.available && (r.snippets?.length || r.rating));

    const [activeTab, setActiveTab] = useState(0);

    if (withReviews.length === 0) return null;

    const currentRev = withReviews[activeTab] || withReviews[0];
    const colors = PLATFORM_COLORS[currentRev.name] || { line: '#333' };

    return (
        <div className="reviews-panel">
            <p className="compare-chart-label">✦ CUSTOMER SENTIMENT ✦</p>

            <div className="reviews-tabs">
                {withReviews.map((r, i) => {
                    const c = PLATFORM_COLORS[r.name] || { line: '#333' };
                    return (
                        <button
                            key={i}
                            type="button"
                            className={`reviews-tab ${activeTab === i ? 'active' : ''}`}
                            style={{ '--tab-color': c.line }}
                            onClick={() => setActiveTab(i)}
                        >
                            {r.name}
                        </button>
                    );
                })}
            </div>

            <div className="reviews-panels">
                <div className="reviews-panel-content active">
                    {currentRev.rating ? (
                        <div className="rp-rating-block">
                            <span className="rp-rating-num">{currentRev.rating}</span>
                            <div className="rp-rating-side">
                                <span className="rp-stars" style={{ color: colors.line }}>
                                    {starString(currentRev.rating)}
                                </span>
                                <span className="rp-review-count">
                                    {currentRev.reviews
                                        ? currentRev.reviews.toLocaleString('en-IN') + ' ratings'
                                        : 'Rating on ' + currentRev.name}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <p className="rp-no-rating">No rating data available for this listing yet.</p>
                    )}

                    {currentRev.snippets?.length ? (
                        <div className="rp-snippets">
                            {currentRev.snippets.map((s, idx) => (
                                <div key={idx} className="rp-snippet-card">
                                    {s.rating && (
                                        <span className="rp-snippet-stars" style={{ color: colors.line }}>
                                            {starString(s.rating)}
                                        </span>
                                    )}
                                    <p className="rp-snippet-text">"{s.text}"</p>
                                    {s.source && <span className="rp-snippet-source">— via {s.source}</span>}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="rp-no-snippets">
                            No individual review text surfaced by Google for this listing — see full reviews on {currentRev.name}.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

function FallbackLinksBlock({ query }) {
    return (
        <>
            {PLATFORM_DB.map((platform, idx) => {
                const imgSrc = PLATFORM_IMGS[idx % PLATFORM_IMGS.length] || 'assets/1.jpeg';
                const shopLink = platform.getUrl(query);

                return (
                    <div key={idx} className="product-box">
                        <span className="platform-tag">{platform.name.toUpperCase()}</span>
                        <img src={imgSrc} alt={`${query} on ${platform.name}`} loading="lazy" />
                        <h4>{query.toUpperCase()}</h4>
                        <p className="real-data-note">
                            Real price, reviews, sizing & stock — see on {platform.name}
                        </p>
                        <a
                            href={shopLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shop-now-btn"
                        >
                            VIEW ON {platform.name.toUpperCase()} ↗
                        </a>
                    </div>
                );
            })}
        </>
    );
}
