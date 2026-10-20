import { useEffect, useRef, useState } from 'react';
import Layout from '../common/Layout.jsx';

const BUILTIN_TRENDS = [
    { key: 'grandpa', name: 'Eclectic Grandpa', img: 'assets/gp-main.jpg', archives: ['gp1.jpg', 'gp2.jpg', 'gp3.jpg', 'gp4.jpg', 'gp5.jpg'] },
    { key: 'streetwear', name: 'Streetwear', img: 'assets/sl-main.jpg', archives: ['sl1.jpg', 'sl2.jpg', 'sl3.jpg', 'sl4.jpg', 'sl5.jpg'] },
    { key: 'y2k', name: 'Y2K Revival', img: 'assets/y-main.jpg', archives: ['y1.jpg', 'y2.jpg', 'y3.jpg', 'y4.jpg', 'y5.jpg'] },
    { key: 'oldmoney', name: 'Old Money', img: 'assets/om-main.jpg', archives: ['om1.jpg', 'om2.jpg', 'om3.jpg', 'om4.jpg', 'om5.jpg'] },
    { key: 'academia', name: 'Dark Academia', img: 'assets/da-main.jpg', archives: ['da1.jpg', 'da2.jpg', 'da3.jpg', 'da4.jpg', 'da5.jpg'] },
    { key: 'fluid', name: 'Gender Fluid', img: 'assets/gf-main.jpg', archives: ['gf1.jpg', 'gf2.jpg', 'gf3.jpg', 'gf4.jpg', 'gf5.jpg'] }
];

function isLoggedIn() {
    return !!localStorage.getItem('avantUserName');
}

function getCurrentUserKey() {
    const user = localStorage.getItem('avantUserName');
    return user ? `avant_custom_trends_${user}` : `avant_guest_session`;
}

function getStorage() {
    return isLoggedIn() ? localStorage : sessionStorage;
}

function parseTipsToArray(rawText) {
    const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    const tips = [];
    for (const line of lines) {
        if (/^\|[\s\-|]+\|$/.test(line)) continue;
        if (/^\d+[\.\)]\s+/.test(line)) {
            const tip = line.replace(/^\d+[\.\)]\s+/, '').replace(/\*\*/g, '').replace(/\*/g, '').trim();
            if (tip.length > 8) tips.push(tip);
            continue;
        }
        if (/^[\-\*•]\s+/.test(line)) {
            const tip = line.replace(/^[\-\*•]\s+/, '').replace(/\*\*/g, '').replace(/\*/g, '').trim();
            if (tip.length > 8) tips.push(tip);
        }
    }
    return tips;
}

export default function TrendsPage() {
    const [hiddenBuiltins, setHiddenBuiltins] = useState([]);
    const [customTrends, setCustomTrends] = useState([]);
    const [activeTrendKey, setActiveTrendKey] = useState(null);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [newTrendName, setNewTrendName] = useState('');
    const [newTrendFiles, setNewTrendFiles] = useState([]);
    const [aiAdvice, setAiAdvice] = useState(null); // { style, loading, tips, error }
    const fileInputRef = useRef(null);
    const aiSectionRef = useRef(null);

    // Initial load & session management
    useEffect(() => {
        if (!isLoggedIn()) {
            const SESSION_FLAG = 'avant_session_alive';
            const alive = sessionStorage.getItem(SESSION_FLAG);
            if (alive) {
                const key = getCurrentUserKey();
                getStorage().removeItem(key);
            }
            sessionStorage.setItem(SESSION_FLAG, 'true');
        }

        // Hidden builtins
        if (isLoggedIn()) {
            const user = localStorage.getItem('avantUserName');
            const hiddenKey = `avant_hidden_builtins_${user}`;
            const hidden = JSON.parse(localStorage.getItem(hiddenKey) || '[]');
            setHiddenBuiltins(hidden);
        }

        // Custom trends
        const saved = JSON.parse(getStorage().getItem(getCurrentUserKey()) || '[]');
        setCustomTrends(saved);
    }, []);

    const visibleBuiltins = BUILTIN_TRENDS.filter((t) => !hiddenBuiltins.includes(t.key));

    async function getAIAdvice(style) {
        setAiAdvice({ style, loading: true, tips: [], error: null });
        setTimeout(() => {
            if (aiSectionRef.current) {
                aiSectionRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        }, 50);

        try {
            const res = await fetch('/api/trend-style-tips', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ style }),
                signal: AbortSignal.timeout(20000)
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Trend tips failed');

            const tips = parseTipsToArray(data.text);
            if (tips.length >= 3) {
                setAiAdvice({ style, loading: false, tips, error: null });
            } else {
                throw new Error(`Only ${tips.length} tips returned`);
            }
        } catch (err) {
            console.error('🚨 Trend tips failed:', err.message);
            setAiAdvice({
                style,
                loading: false,
                tips: [],
                error: 'Our style desk is between appointments right now — give it another moment and try again.'
            });
        }
    }

    function checkCloseZone(e) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const closeZoneRight = rect.width - 15;
        const closeZoneLeft = rect.width - 125;
        const closeZoneTop = 12;
        const closeZoneBottom = 50;
        return x >= closeZoneLeft && x <= closeZoneRight && y >= closeZoneTop && y <= closeZoneBottom;
    }

    function deleteTrend(trendKey, isBuiltIn) {
        const confirmed = window.confirm('Are you sure you want to delete this trend?');
        if (!confirmed) return;

        if (isBuiltIn) {
            if (isLoggedIn()) {
                const user = localStorage.getItem('avantUserName');
                const hiddenKey = `avant_hidden_builtins_${user}`;
                const hidden = JSON.parse(localStorage.getItem(hiddenKey) || '[]');
                if (!hidden.includes(trendKey)) hidden.push(trendKey);
                localStorage.setItem(hiddenKey, JSON.stringify(hidden));
                setHiddenBuiltins([...hidden]);
            } else {
                setHiddenBuiltins((prev) => [...prev, trendKey]);
            }
        } else {
            const storage = getStorage();
            const storageKey = getCurrentUserKey();
            let trends = JSON.parse(storage.getItem(storageKey) || '[]');
            trends = trends.filter((t) => t.key !== trendKey);
            storage.setItem(storageKey, JSON.stringify(trends));
            setCustomTrends(trends);
        }

        setActiveTrendKey(null);
        setAiAdvice(null);
    }

    function handleCardClick(e, trendKey, trendName, isBuiltIn) {
        if (activeTrendKey === trendKey) {
            if (checkCloseZone(e)) {
                deleteTrend(trendKey, isBuiltIn);
                return;
            }
            // Toggle off
            setActiveTrendKey(null);
            setAiAdvice(null);
            return;
        }

        setActiveTrendKey(trendKey);
        getAIAdvice(trendName);
    }

    function handleNewPost() {
        if (!newTrendName.trim() || newTrendFiles.length === 0) {
            alert('Enter name and select at least one image!');
            return;
        }

        const files = Array.from(newTrendFiles);
        const imagePromises = files.map(
            (file) =>
                new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(file);
                })
        );

        Promise.all(imagePromises).then((base64Images) => {
            const trendData = {
                name: newTrendName.trim(),
                key: newTrendName.toLowerCase().replace(/\s+/g, '') + '_' + Date.now(),
                mainImage: base64Images[0],
                imageUrl: base64Images[0],
                images: base64Images
            };

            const storage = getStorage();
            const key = getCurrentUserKey();
            const existing = JSON.parse(storage.getItem(key) || '[]');
            existing.push(trendData);
            storage.setItem(key, JSON.stringify(existing));

            setCustomTrends(existing);
            setIsUploadOpen(false);
            setNewTrendName('');
            setNewTrendFiles([]);
            if (fileInputRef.current) fileInputRef.current.value = '';
        });
    }

    const activeBuiltin = BUILTIN_TRENDS.find((b) => b.key === activeTrendKey);

    return (
        <Layout>
            <main className="trends-main">
                <div className="container">
                    <header className="trends-intro">
                        <p className="editorial-label-dark-1">01 / TREND ATLAS</p>
                        <h1 className="matrix-heading">
                            GENZ TREND <br />
                            <span>DISCOVERY</span>
                        </h1>
                    </header>

                    <div className="trends-matrix" id="styleMatrix">
                        {/* Builtin trends */}
                        {visibleBuiltins.map((item, index) => {
                            const isActive = activeTrendKey === item.key;
                            const isGallery = activeBuiltin && !isActive;
                            // When another builtin is active, get thumbnail
                            let galleryThumb = null;
                            if (isGallery && activeBuiltin) {
                                // Match other items index
                                const otherItems = visibleBuiltins.filter((b) => b.key !== activeBuiltin.key);
                                const otherIdx = otherItems.findIndex((b) => b.key === item.key);
                                if (otherIdx >= 0 && activeBuiltin.archives[otherIdx]) {
                                    galleryThumb = `assets/trends/${activeBuiltin.archives[otherIdx]}`;
                                }
                            }

                            return (
                                <div
                                    key={item.key}
                                    className={`matrix-item ${isActive ? 'active' : ''} ${isGallery ? 'is-gallery' : ''}`}
                                    data-trend={item.key}
                                    onClick={(e) => handleCardClick(e, item.key, item.name, true)}
                                >
                                    <div className="matrix-img">
                                        <img src={item.img} alt={item.name} />
                                    </div>
                                    <div className="matrix-info">
                                        <h3>{item.name}</h3>
                                        <p>EXPLORE AI STYLIST</p>
                                    </div>
                                    <div className="trend-gallery-view">
                                        {isGallery && galleryThumb && (
                                            <img src={galleryThumb} className="gallery-thumb-single" alt="Gallery preview" />
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Custom trends */}
                        {customTrends.map((trend) => {
                            const isActive = activeTrendKey === trend.key;
                            return (
                                <div
                                    key={trend.key}
                                    className={`matrix-item custom-trend ${isActive ? 'active' : ''}`}
                                    data-trend={trend.key}
                                    onClick={(e) => handleCardClick(e, trend.key, trend.name, false)}
                                >
                                    <div className="matrix-img">
                                        <img src={trend.mainImage || trend.imageUrl} alt={trend.name} />
                                    </div>
                                    <div className="matrix-info">
                                        <h3>{trend.name}</h3>
                                        <p>EXPLORE AI STYLIST</p>
                                    </div>
                                    <div className="trend-gallery-view"></div>
                                </div>
                            );
                        })}

                        {/* Upload Card */}
                        <div className="matrix-item upload-card" onClick={() => setIsUploadOpen(true)}>
                            <div className="upload-inner">
                                <img src="assets/add-image.jpg" className="upload-icon-img" alt="Add trend" />
                                <p>ADD NEW TREND</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* AI Advice Section */}
            {aiAdvice && (
                <section
                    id="ai-advice-section"
                    ref={aiSectionRef}
                    style={{
                        margin: '40px auto',
                        maxWidth: '900px',
                        padding: '40px',
                        border: '1px solid #000',
                        background: '#fff',
                        position: 'relative'
                    }}
                >
                    <span
                        onClick={() => setAiAdvice(null)}
                        style={{
                            position: 'absolute',
                            right: '20px',
                            top: '10px',
                            cursor: 'pointer',
                            fontSize: '2rem'
                        }}
                    >
                        &times;
                    </span>
                    <div
                        id="ai-response-box"
                        style={{
                            fontFamily: "'Montserrat', sans-serif",
                            lineHeight: 1.8,
                            fontSize: '1.1rem',
                            color: '#000'
                        }}
                    >
                        {aiAdvice.loading ? (
                            <div style={{ textAlert: 'center', textAlign: 'center', padding: '50px 20px' }}>
                                <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '0.68rem', letterSpacing: '5px', color: '#aaa', textTransform: 'uppercase' }}>
                                    ✦ &nbsp; Generating Style Intelligence &nbsp; ✦
                                </p>
                                <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '0.65rem', color: '#ccc', marginTop: '8px', letterSpacing: '2px' }}>
                                    {aiAdvice.style.toUpperCase()}
                                </p>
                            </div>
                        ) : aiAdvice.error ? (
                            <div style={{ padding: '30px 40px', fontFamily: "'Montserrat', sans-serif" }}>
                                <p style={{ fontSize: '0.7rem', letterSpacing: '2px', color: '#c00', textTransform: 'uppercase', marginBottom: '12px' }}>
                                    ⚠ AI ERROR
                                </p>
                                <p style={{ fontSize: '0.82rem', color: '#333', lineHeight: 1.8 }}>
                                    {aiAdvice.error}
                                </p>
                            </div>
                        ) : (
                            <div style={{ padding: '35px 40px', background: '#fff' }}>
                                <span style={{ display: 'inline-block', background: '#000', color: '#fff', fontFamily: "'Montserrat', sans-serif", fontSize: '0.58rem', letterSpacing: '3px', padding: '5px 14px', textTransform: 'uppercase', marginBottom: '22px' }}>
                                    ✦ &nbsp; AI GENERATED
                                </span>
                                <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '0.6rem', fontWeight: 700, letterSpacing: '5px', color: '#aaa', textTransform: 'uppercase', margin: '0 0 6px 0' }}>
                                    STYLING GUIDE FOR
                                </p>
                                <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(2.5rem, 5vw, 4.2rem)', fontWeight: 700, lineHeight: 0.88, letterSpacing: '-2px', color: '#000', margin: '0 0 22px 0' }}>
                                    {aiAdvice.style}
                                </h1>
                                <div style={{ width: '45px', height: '3px', background: '#000', marginBottom: '8px' }}></div>
                                {aiAdvice.tips.map((tip, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', padding: '18px 0', borderBottom: '1px solid #ececec' }}>
                                        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2rem', fontWeight: 700, color: '#d0d0d0', lineHeight: 1, minWidth: '40px', flexShrink: 0 }}>
                                            {String(i + 1).padStart(2, '0')}
                                        </span>
                                        <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '0.88rem', fontWeight: 400, color: '#222', lineHeight: 1.8, margin: 0, paddingTop: '5px' }}>
                                            {tip}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Custom Modal for Upload */}
            <div
                id="uploadModal"
                className="custom-modal"
                style={{ display: isUploadOpen ? 'flex' : 'none' }}
                onClick={(e) => {
                    if (e.target.id === 'uploadModal') setIsUploadOpen(false);
                }}
            >
                <div className="modal-content">
                    <span className="close-btn" onClick={() => setIsUploadOpen(false)}>
                        &times;
                    </span>
                    <h3>Add to Trend Matrix</h3>
                    <input
                        type="text"
                        placeholder="Trend Name (e.g. Streetwear)"
                        value={newTrendName}
                        onChange={(e) => setNewTrendName(e.target.value)}
                    />
                    <input
                        type="file"
                        id="fileInput"
                        ref={fileInputRef}
                        multiple
                        onChange={(e) => setNewTrendFiles(e.target.files)}
                    />
                    <button
                        className="auth-submit-btn"
                        id="postTrendBtn"
                        type="button"
                        onClick={handleNewPost}
                    >
                        POST TREND
                    </button>
                </div>
            </div>
        </Layout>
    );
}
