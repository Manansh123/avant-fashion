import { useEffect, useRef, useState } from 'react';
import Layout from '../common/Layout.jsx';
import { getRandomFashionQuote } from '../common/quotes.js';
import { showToast } from '../common/toast.js';

export default function OutfitPage() {
    // Form inputs
    const [item, setItem] = useState('');
    const [gender, setGender] = useState('');
    const [color, setColor] = useState('');
    const [fabric, setFabric] = useState('');
    const [aesthetic, setAesthetic] = useState('');
    const [occasion, setOccasion] = useState('');
    const [weather, setWeather] = useState('');
    const [footwear, setFootwear] = useState('');
    const [mood, setMood] = useState('');

    // Generation state
    const [isGenerating, setIsGenerating] = useState(false);
    const [mirrorState, setMirrorState] = useState('default'); // 'default' | 'loading' | 'result'
    const [progress, setProgress] = useState(0);
    const [currentQuote, setCurrentQuote] = useState(() => getRandomFashionQuote());

    // Result state
    const [generatedCaption, setGeneratedCaption] = useState('');
    const [shopItems, setShopItems] = useState([]);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [proxyUrl, setProxyUrl] = useState('');
    const [capturedBlob, setCapturedBlob] = useState(null);

    // Button states
    const [isSavingWardrobe, setIsSavingWardrobe] = useState(false);
    const [isRedirectingShop, setIsRedirectingShop] = useState(false);

    const imgRef = useRef(null);
    const resultFrameRef = useRef(null);

    // Handle bfcache / pageshow
    useEffect(() => {
        function handlePageShow(e) {
            if (e.persisted) {
                setIsSavingWardrobe(false);
                setIsRedirectingShop(false);
                setIsGenerating(false);
            }
        }
        window.addEventListener('pageshow', handlePageShow);
        return () => window.removeEventListener('pageshow', handlePageShow);
    }, []);

    // Scroll to top on mount
    useEffect(() => {
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }
        window.scrollTo(0, 0);
    }, []);

    async function handleGenerate() {
        const trimmedItem = item.trim();
        const trimmedColor = color.trim();
        const trimmedFabric = fabric.trim();
        const trimmedAesthetic = aesthetic.trim();
        const trimmedOccasion = occasion.trim();
        const trimmedWeather = weather.trim();
        const trimmedFootwear = footwear.trim();
        const trimmedMood = mood.trim();
        const trimmedGender = (gender || 'unisex').trim();

        if (!trimmedItem && !trimmedColor && !trimmedAesthetic) {
            showToast('Fill in at least Item, Color, or Aesthetic first.');
            return;
        }

        const inputChips = [
            trimmedItem,
            trimmedColor,
            trimmedFabric,
            trimmedAesthetic,
            trimmedOccasion,
            trimmedWeather,
            trimmedFootwear
        ].filter(Boolean);

        document.querySelector('.visual-output')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

        setIsGenerating(true);
        setMirrorState('loading');
        setCurrentQuote(getRandomFashionQuote());
        setProgress(15);
        setImageLoaded(false);
        setImageError(false);
        setCapturedBlob(null);

        try {
            setProgress(30);
            const res = await fetch('/api/generate-outfit-logic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    item: trimmedItem,
                    color: trimmedColor,
                    fabric: trimmedFabric,
                    aesthetic: trimmedAesthetic,
                    occasion: trimmedOccasion,
                    weather: trimmedWeather,
                    footwear: trimmedFootwear,
                    gender: trimmedGender,
                    additionalDetails: trimmedMood
                })
            });

            setProgress(55);
            if (!res.ok) throw new Error(`Server ${res.status}`);
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Backend error');

            const shortPrompt =
                data.imagePrompt ||
                `${trimmedAesthetic} ${trimmedItem}, ${trimmedColor}, editorial fashion, studio lighting`;

            const newProxyUrl = `/api/proxy-image?prompt=${encodeURIComponent(shortPrompt)}&width=768&height=1024&gender=${encodeURIComponent(trimmedGender)}&t=${Date.now()}`;

            const items =
                Array.isArray(data.shoppingItems) && data.shoppingItems.length > 0
                    ? data.shoppingItems
                    : inputChips;

            const c = (data.caption || '').trim();
            const captionText =
                c.length > 5
                    ? c
                    : `A ${trimmedColor || 'curated'} ${trimmedItem || 'look'} in ${trimmedAesthetic || 'avant-garde'} style.`;

            setShopItems(items);
            setGeneratedCaption(captionText);
            setProxyUrl(newProxyUrl);

            setMirrorState('result');
            setProgress(75);

            if (resultFrameRef.current) {
                resultFrameRef.current.classList.remove('reveal-in');
                void resultFrameRef.current.offsetWidth;
                resultFrameRef.current.classList.add('reveal-in');
                setTimeout(() => resultFrameRef.current?.classList.remove('reveal-in'), 600);
            }
        } catch (err) {
            console.error('❌ Generation error:', err.message);
            setProgress(0);
            setMirrorState('default');
            showToast("Couldn't synthesize that look — please try again.");
        } finally {
            setIsGenerating(false);
        }
    }

    function handleImageLoad() {
        setImageLoaded(true);
        setImageError(false);
        setProgress(100);
        setTimeout(() => setProgress(0), 900);

        const imgEl = imgRef.current;
        if (imgEl) {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = imgEl.naturalWidth;
                canvas.height = imgEl.naturalHeight;
                canvas.getContext('2d').drawImage(imgEl, 0, 0);
                canvas.toBlob((b) => {
                    setCapturedBlob(b);
                    window._avantCapturedBlob = b;
                }, 'image/jpeg', 0.92);
            } catch (e) {
                console.warn('Canvas capture failed:', e);
            }
        }
    }

    function handleImageError() {
        setImageError(true);
        setProgress(0);
    }

    function downloadLook() {
        const blob = capturedBlob || window._avantCapturedBlob;
        if (blob) {
            const bUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = bUrl;
            a.download = 'avant-look.jpg';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(bUrl), 2000);
        } else {
            showToast('Image still loading, try again in a moment.');
        }
    }

    async function goToVirtualTryOn() {
        const blob = capturedBlob || window._avantCapturedBlob;
        if (!blob) {
            showToast('Generate a look first, then wait for the image to fully load.');
            return;
        }

        try {
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });

            localStorage.setItem('avant_tryon_garment_bridge', JSON.stringify({ dataUrl }));
            window.location.href = 'tryon.html';
        } catch (err) {
            showToast('Could not send this look to Try-On — please try again.');
            console.error('goToVirtualTryOn error:', err);
        }
    }

    async function syncToWardrobeGallery() {
        const blob = capturedBlob || window._avantCapturedBlob;
        if (!blob) {
            showToast('Generate a look first, then wait for image to fully load.');
            return;
        }

        setIsSavingWardrobe(true);
        showToast('Syncing look to Wardrobe...');

        try {
            const fd = new FormData();
            fd.append('image', blob, 'avant-outfit.jpg');
            const u = localStorage.getItem('avantUserName');
            if (u) fd.append('userName', u);

            const res = await fetch('/api/upload-wardrobe', { method: 'POST', body: fd });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            try {
                const prev = JSON.parse(localStorage.getItem('avant_wardrobe_bridge') || '[]');
                prev.unshift({
                    src: data.imageUrl,
                    time: data.timestamp || new Date().toLocaleString('en-GB'),
                    id: data.itemId || null,
                    isDb: !!data.savedToDb
                });
                localStorage.setItem('avant_wardrobe_bridge', JSON.stringify(prev.slice(0, 20)));
            } catch (e) {}

            showToast('✓ Added to Wardrobe!');
            setTimeout(() => {
                window.location.href = 'wardrobe.html';
            }, 700);
        } catch (err) {
            showToast("Couldn't sync to your wardrobe — please try again.");
            setIsSavingWardrobe(false);
        }
    }

    function shopThisLook() {
        if (!shopItems.length) {
            showToast('Generate a look first.');
            return;
        }

        localStorage.setItem('avant_shopping_sync', JSON.stringify(shopItems));
        setIsRedirectingShop(true);
        setTimeout(() => {
            window.location.href = 'shop.html';
        }, 250);
    }

    function handleChipShopClick(itemTitle) {
        localStorage.setItem('avant_shopping_sync', JSON.stringify([itemTitle.trim()]));
        showToast(`Syncing ${itemTitle.trim()} parameters to Boutique...`);
        setTimeout(() => {
            window.location.href = 'shop.html';
        }, 400);
    }

    return (
        <Layout>
            {/* Global progress bar */}
            <div
                id="outfit-progress-bar"
                className={progress > 0 && progress < 100 ? 'bar-pulse' : ''}
                style={{ width: `${progress}%` }}
            />

            <main className="build-container">
                {/* LEFT PANEL: CONTROLS */}
                <section className="stylist-panel">
                    <header className="panel-header">
                        <p className="editorial-label-dark">02 / OUTFIT BUILDER</p>
                        <h1 className="main-heading">
                            THE OUTFIT <br />
                            <span>LAB</span>
                        </h1>
                    </header>

                    <div className="style-form" id="style-form">
                        <div className="datalist-grid">
                            {/* 1. Item */}
                            <div className="dl-group">
                                <label htmlFor="dl-item">Item</label>
                                <input
                                    type="text"
                                    id="dl-item"
                                    list="list-item"
                                    placeholder="e.g. Blazer"
                                    autoComplete="off"
                                    value={item}
                                    onChange={(e) => setItem(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleGenerate();
                                        }
                                    }}
                                />
                                <datalist id="list-item">
                                    <option value="Oversized T-Shirt" />
                                    <option value="Graphic Tee" />
                                    <option value="Plain Tee" />
                                    <option value="Cargo Pants" />
                                    <option value="Baggy Jeans" />
                                    <option value="Straight Fit Jeans" />
                                    <option value="Wide Leg Jeans" />
                                    <option value="Parachute Pants" />
                                    <option value="Joggers" />
                                    <option value="Hoodie" />
                                    <option value="Zip Hoodie" />
                                    <option value="Oversized Hoodie" />
                                    <option value="Flannel Shirt" />
                                    <option value="Oversized Shirt" />
                                    <option value="Polo T-Shirt" />
                                    <option value="Tank Top" />
                                    <option value="Crop Top" />
                                    <option value="Co-ord Set" />
                                    <option value="Varsity Jacket" />
                                    <option value="Bomber Jacket" />
                                    <option value="Denim Jacket" />
                                    <option value="Leather Jacket" />
                                    <option value="Kurta" />
                                    <option value="Saree" />
                                    <option value="Dress" />
                                    <option value="Mini Skirt" />
                                    <option value="Wide Leg Pants" />
                                    <option value="Others" />
                                </datalist>
                            </div>

                            {/* 2. Gender */}
                            <div className="dl-group">
                                <label>Gender</label>
                                <input
                                    type="text"
                                    id="dl-gender"
                                    list="genders-list"
                                    placeholder="e.g., Male, Female, Unisex"
                                    autoComplete="off"
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleGenerate();
                                        }
                                    }}
                                />
                                <datalist id="genders-list">
                                    <option value="Men" />
                                    <option value="Women" />
                                    <option value="Unisex" />
                                </datalist>
                            </div>

                            {/* 3. Color */}
                            <div className="dl-group">
                                <label htmlFor="dl-color">Color</label>
                                <input
                                    type="text"
                                    id="dl-color"
                                    list="list-color"
                                    placeholder="e.g. Midnight Black"
                                    autoComplete="off"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleGenerate();
                                        }
                                    }}
                                />
                                <datalist id="list-color">
                                    <option value="Black" />
                                    <option value="White" />
                                    <option value="Off White" />
                                    <option value="Cream" />
                                    <option value="Grey" />
                                    <option value="Charcoal" />
                                    <option value="Silver" />
                                    <option value="Navy Blue" />
                                    <option value="Sky Blue" />
                                    <option value="Denim Blue" />
                                    <option value="Royal Blue" />
                                    <option value="Baby Blue" />
                                    <option value="Olive Green" />
                                    <option value="Dark Green" />
                                    <option value="Mint Green" />
                                    <option value="Sage Green" />
                                    <option value="Beige" />
                                    <option value="Tan" />
                                    <option value="Brown" />
                                    <option value="Mocha" />
                                    <option value="Chocolate Brown" />
                                    <option value="Maroon" />
                                    <option value="Wine" />
                                    <option value="Red" />
                                    <option value="Cherry Red" />
                                    <option value="Baby Pink" />
                                    <option value="Hot Pink" />
                                    <option value="Lavender" />
                                    <option value="Purple" />
                                    <option value="Peach" />
                                    <option value="Orange" />
                                    <option value="Mustard" />
                                    <option value="Rust" />
                                    <option value="Yellow" />
                                    <option value="Others" />
                                </datalist>
                            </div>

                            {/* 4. Fabric */}
                            <div className="dl-group">
                                <label htmlFor="dl-fabric">Fabric</label>
                                <input
                                    type="text"
                                    id="dl-fabric"
                                    list="list-fabric"
                                    placeholder="e.g. Heavy Denim"
                                    autoComplete="off"
                                    value={fabric}
                                    onChange={(e) => setFabric(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleGenerate();
                                        }
                                    }}
                                />
                                <datalist id="list-fabric">
                                    <option value="Bamboo" />
                                    <option value="Canvas" />
                                    <option value="Cashmere" />
                                    <option value="Chiffon" />
                                    <option value="Cotton Blend" />
                                    <option value="Crepe" />
                                    <option value="Denim" />
                                    <option value="Faux Leather" />
                                    <option value="Fleece" />
                                    <option value="Georgette" />
                                    <option value="Heavy Denim" />
                                    <option value="Leather" />
                                    <option value="Linen" />
                                    <option value="Nylon" />
                                    <option value="Organic Cotton" />
                                    <option value="Polyester" />
                                    <option value="Rayon" />
                                    <option value="Ribbed Knit" />
                                    <option value="Satin" />
                                    <option value="Silk" />
                                    <option value="Soft Cotton" />
                                    <option value="Stretch Denim" />
                                    <option value="Suede" />
                                    <option value="Tweed" />
                                    <option value="Twill" />
                                    <option value="Velvet" />
                                    <option value="Woven" />
                                    <option value="Wool" />
                                    <option value="Others" />
                                </datalist>
                            </div>

                            {/* 5. Aesthetic */}
                            <div className="dl-group">
                                <label htmlFor="dl-aesthetic">Aesthetic</label>
                                <input
                                    type="text"
                                    id="dl-aesthetic"
                                    list="list-aesthetic"
                                    placeholder="e.g. Old Money"
                                    autoComplete="off"
                                    value={aesthetic}
                                    onChange={(e) => setAesthetic(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleGenerate();
                                        }
                                    }}
                                />
                                <datalist id="list-aesthetic">
                                    <option value="Streetwear" />
                                    <option value="Minimal" />
                                    <option value="Old Money" />
                                    <option value="Clean Girl" />
                                    <option value="Soft Girl" />
                                    <option value="Y2K" />
                                    <option value="Vintage" />
                                    <option value="Casual" />
                                    <option value="Oversized Fit" />
                                    <option value="Athleisure" />
                                    <option value="Korean Style" />
                                    <option value="Pinterest Style" />
                                    <option value="Grunge" />
                                    <option value="Coquette" />
                                    <option value="Indie" />
                                    <option value="Skater" />
                                    <option value="Classy" />
                                    <option value="Chic" />
                                    <option value="Monochrome" />
                                    <option value="Party Wear" />
                                    <option value="Desi Fusion" />
                                    <option value="Others" />
                                </datalist>
                            </div>

                            {/* 6. Occasion */}
                            <div className="dl-group">
                                <label htmlFor="dl-occasion">Occasion</label>
                                <input
                                    type="text"
                                    id="dl-occasion"
                                    list="list-occasion"
                                    placeholder="e.g. Brunch"
                                    autoComplete="off"
                                    value={occasion}
                                    onChange={(e) => setOccasion(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleGenerate();
                                        }
                                    }}
                                />
                                <datalist id="list-occasion">
                                    <option value="Casual Outing" />
                                    <option value="College" />
                                    <option value="Office" />
                                    <option value="Party" />
                                    <option value="Date Night" />
                                    <option value="Coffee Date" />
                                    <option value="Dinner" />
                                    <option value="Brunch" />
                                    <option value="Shopping" />
                                    <option value="Travel" />
                                    <option value="Airport Look" />
                                    <option value="Concert" />
                                    <option value="Beach Day" />
                                    <option value="Vacation" />
                                    <option value="Wedding" />
                                    <option value="Festive Wear" />
                                    <option value="Gym" />
                                    <option value="Streetwear" />
                                    <option value="Photoshoot" />
                                    <option value="Weekend Hangout" />
                                    <option value="House Party" />
                                    <option value="Club Night" />
                                    <option value="Others" />
                                </datalist>
                            </div>

                            {/* 7. Weather */}
                            <div className="dl-group">
                                <label htmlFor="dl-weather">Weather</label>
                                <input
                                    type="text"
                                    id="dl-weather"
                                    list="list-weather"
                                    placeholder="e.g. Breezy"
                                    autoComplete="off"
                                    value={weather}
                                    onChange={(e) => setWeather(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleGenerate();
                                        }
                                    }}
                                />
                                <datalist id="list-weather">
                                    <option value="Sunny" />
                                    <option value="Hot" />
                                    <option value="Warm" />
                                    <option value="Cool" />
                                    <option value="Cold" />
                                    <option value="Windy" />
                                    <option value="Rainy" />
                                    <option value="Cloudy" />
                                    <option value="Humid" />
                                    <option value="Foggy" />
                                    <option value="Snowy" />
                                    <option value="Summer" />
                                    <option value="Winter" />
                                    <option value="Monsoon" />
                                    <option value="Spring" />
                                    <option value="Autumn" />
                                    <option value="Others" />
                                </datalist>
                            </div>

                            {/* 8. Footwear */}
                            <div className="dl-group">
                                <label htmlFor="dl-footwear">Footwear</label>
                                <input
                                    type="text"
                                    id="dl-footwear"
                                    list="list-footwear"
                                    placeholder="e.g. Chunky Sneakers"
                                    autoComplete="off"
                                    value={footwear}
                                    onChange={(e) => setFootwear(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleGenerate();
                                        }
                                    }}
                                />
                                <datalist id="list-footwear">
                                    <option value="Sneakers" />
                                    <option value="White Sneakers" />
                                    <option value="Chunky Sneakers" />
                                    <option value="High Tops" />
                                    <option value="Low Tops" />
                                    <option value="Running Shoes" />
                                    <option value="Skate Shoes" />
                                    <option value="Basketball Shoes" />
                                    <option value="Slip Ons" />
                                    <option value="Slides" />
                                    <option value="Crocs" />
                                    <option value="Flip Flops" />
                                    <option value="Sandals" />
                                    <option value="Loafers" />
                                    <option value="Moccasins" />
                                    <option value="Boat Shoes" />
                                    <option value="Formal Shoes" />
                                    <option value="Oxford Shoes" />
                                    <option value="Derby Shoes" />
                                    <option value="Chelsea Boots" />
                                    <option value="Combat Boots" />
                                    <option value="Ankle Boots" />
                                    <option value="Knee High Boots" />
                                    <option value="Platform Shoes" />
                                    <option value="Platform Sneakers" />
                                    <option value="Heels" />
                                    <option value="Block Heels" />
                                    <option value="Kitten Heels" />
                                    <option value="Stilettos" />
                                    <option value="Wedges" />
                                    <option value="Ballet Flats" />
                                    <option value="Mary Janes" />
                                    <option value="Espadrilles" />
                                    <option value="Kolhapuri Sandals" />
                                    <option value="Juttis" />
                                    <option value="Ethnic Sandals" />
                                    <option value="School Shoes" />
                                    <option value="Light Up Sneakers" />
                                    <option value="Cartoon Sandals" />
                                    <option value="Others" />
                                </datalist>
                            </div>
                        </div>

                        {/* MOOD / ADDITIONAL DETAILS */}
                        <div className="dl-group dl-group--full">
                            <label htmlFor="dl-mood">Mood / Additional Details</label>
                            <textarea
                                id="dl-mood"
                                rows="4"
                                placeholder="Describe your vibe, occasion details, or any specific requests... (e.g. 'Monochrome palette, minimal accessories, Indo-fusion touch')"
                                value={mood}
                                onChange={(e) => setMood(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleGenerate();
                                    }
                                }}
                            />
                        </div>

                        {/* GENERATE BUTTON */}
                        <button
                            type="button"
                            className="build-btn"
                            id="synthesize-btn"
                            disabled={isGenerating}
                            onClick={handleGenerate}
                        >
                            <span className="btn-text">
                                {isGenerating ? 'GENERATING...' : '✦ \u00A0 SYNTHESIZE LOOK \u00A0 ✦'}
                            </span>
                            <span className="btn-sub">AI-POWERED GENERATION</span>
                        </button>
                    </div>
                </section>

                {/* RIGHT PANEL: MIRROR */}
                <section className="visual-output">
                    <div className="outfit-mirror-frame" id="result-frame" ref={resultFrameRef}>
                        {/* Default State */}
                        {mirrorState === 'default' && (
                            <div className="mirror-default" id="default-msg" style={{ display: 'flex' }}>
                                <div className="mirror-default-inner">
                                    <div className="mirror-icon">
                                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <rect x="1" y="1" width="46" height="46" rx="1" stroke="#a1a1a1" strokeWidth="1.5" strokeDasharray="4 4" />
                                            <path d="M16 32L22 24L26 28L30 22L36 32H16Z" stroke="#a1a1a1" strokeWidth="1.2" strokeLinejoin="round" />
                                            <circle cx="20" cy="20" r="3" stroke="#a1a1a1" strokeWidth="1.2" />
                                        </svg>
                                    </div>
                                    <p className="mirror-default-title">YOUR LOOK APPEARS HERE</p>
                                    <p className="mirror-default-sub">
                                        Configure your inputs on the left<br />and synthesize your outfit.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Loading State */}
                        {mirrorState === 'loading' && (
                            <div className="mirror-loading" id="loading-msg" style={{ display: 'flex' }}>
                                <div className="mirror-loading-inner">
                                    <div className="loading-bars">
                                        <span></span><span></span><span></span><span></span><span></span>
                                    </div>
                                    <p className="loading-label">SYNTHESIZING LOOK...</p>
                                    {currentQuote && (
                                        <div className="fashion-quote-block">
                                            <p className="fashion-quote-text">"{currentQuote.quote}"</p>
                                            <p className="fashion-quote-author">{currentQuote.author}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Generated Result */}
                        {mirrorState === 'result' && (
                            <div className="result-content" id="result-content" style={{ display: 'flex' }}>
                                <div className="outfit-img-wrap" style={{ position: 'relative' }}>
                                    {!imageLoaded && !imageError && (
                                        <div
                                            id="img-spinner"
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                background: '#f0f0f0',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '16px',
                                                zIndex: 10
                                            }}
                                        >
                                            <div className="mirror-loading-inner">
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
                                        </div>
                                    )}

                                    {imageError && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                background: '#f0f0f0',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '16px',
                                                zIndex: 10,
                                                padding: '20px'
                                            }}
                                        >
                                            <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '0.68rem', fontWeight: 700, letterSpacing: '2px', color: '#c00', textAlign: 'center', lineHeight: 1.8 }}>
                                                AI CLOUD UTILITY BUSY<br />
                                                <span style={{ fontWeight: 400, fontSize: '0.6rem', color: '#aaa', textTransform: 'none' }}>
                                                    The network timed out. Please try again.
                                                </span>
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setImageError(false);
                                                    setImageLoaded(false);
                                                    setProxyUrl(`${proxyUrl.split('&t=')[0]}&t=${Date.now()}`);
                                                }}
                                                style={{
                                                    padding: '10px 22px',
                                                    background: '#000',
                                                    color: '#fff',
                                                    border: 'none',
                                                    fontFamily: "'Montserrat', sans-serif",
                                                    fontSize: '0.65rem',
                                                    fontWeight: 700,
                                                    letterSpacing: '2px',
                                                    cursor: 'pointer',
                                                    textTransform: 'uppercase',
                                                    marginTop: '5px'
                                                }}
                                            >
                                                ↻ RETRY SEQUENCE
                                            </button>
                                        </div>
                                    )}

                                    <img
                                        ref={imgRef}
                                        src={proxyUrl}
                                        id="outfit-img"
                                        alt="AI Generated Outfit"
                                        style={{
                                            opacity: imageLoaded ? 1 : 0,
                                            transition: 'opacity 0.7s ease'
                                        }}
                                        onLoad={handleImageLoad}
                                        onError={handleImageError}
                                    />

                                    {imageLoaded && (
                                        <button
                                            type="button"
                                            className="img-download-btn"
                                            title="Download look"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                downloadLook();
                                            }}
                                        >
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                <polyline points="7 10 12 15 17 10" />
                                                <line x1="12" y1="15" x2="12" y2="3" />
                                            </svg>
                                        </button>
                                    )}
                                </div>

                                <div className="result-details">
                                    <p
                                        className="result-caption"
                                        id="outfit-caption"
                                        style={{
                                            fontFamily: "'Cormorant Garamond', serif",
                                            fontSize: '1.25rem',
                                            fontStyle: 'italic',
                                            color: '#222'
                                        }}
                                    >
                                        {generatedCaption}
                                    </p>

                                    <div className="result-chips" id="outfit-chips">
                                        {shopItems.length > 0 && (
                                            <>
                                                <div
                                                    className="chips-section-label"
                                                    style={{
                                                        width: '100%',
                                                        fontFamily: "'Montserrat', sans-serif",
                                                        fontSize: '0.65rem',
                                                        fontWeight: 700,
                                                        letterSpacing: '3px',
                                                        color: '#000',
                                                        textTransform: 'uppercase',
                                                        margin: '20px 0 10px 0',
                                                        borderTop: '1px solid #eee',
                                                        paddingTop: '15px'
                                                    }}
                                                >
                                                    ✦ CLICK ITEM TO SHOP THE LOOK ✦
                                                </div>

                                                {shopItems.map((itemTitle, idx) => (
                                                    <a
                                                        key={idx}
                                                        className="chip chip--shop"
                                                        href="javascript:void(0);"
                                                        style={{
                                                            display: 'inline-block',
                                                            background: '#000',
                                                            color: '#fff',
                                                            padding: '8px 14px',
                                                            margin: '4px',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 600,
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '1px',
                                                            textDecoration: 'none',
                                                            border: '1px solid #000',
                                                            transition: 'all 0.3s ease'
                                                        }}
                                                        onClick={() => handleChipShopClick(itemTitle)}
                                                    >
                                                        Shop {itemTitle.trim()} ↗
                                                    </a>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ACTION BUTTONS (hidden until generated) */}
                    <div
                        className="mirror-actions"
                        id="mirror-actions"
                        style={{
                            display: mirrorState === 'result' ? 'flex' : 'none',
                            flexDirection: 'column',
                            gap: '12px',
                            width: '100%',
                            maxWidth: '420px'
                        }}
                    >
                        <div style={{ width: '100%' }}>
                            <button
                                type="button"
                                className="action-btn action-btn--save"
                                id="save-btn"
                                onClick={goToVirtualTryOn}
                                style={{ width: '100%' }}
                            >
                                Try This Look On
                            </button>
                        </div>
                        <div style={{ width: '100%' }}>
                            <button
                                type="button"
                                className="action-btn action-btn--shop"
                                id="shop-btn"
                                disabled={isSavingWardrobe}
                                onClick={syncToWardrobeGallery}
                                style={{ width: '100%' }}
                            >
                                &nbsp; {isSavingWardrobe ? 'UPLOADING...' : 'Add to Wardrobe Page'}
                            </button>
                        </div>
                        <div style={{ width: '100%' }}>
                            <button
                                type="button"
                                className="action-btn action-btn--shop"
                                id="shop-look-btn"
                                disabled={isRedirectingShop}
                                onClick={shopThisLook}
                                style={{ width: '100%' }}
                            >
                                {isRedirectingShop ? 'REDIRECTING...' : 'Shop this Look'}
                            </button>
                        </div>
                    </div>
                </section>
            </main>
        </Layout>
    );
}
