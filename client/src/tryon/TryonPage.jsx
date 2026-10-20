import { useEffect, useRef, useState } from 'react';
import Layout from '../common/Layout.jsx';

const LOADING_QUOTES = [
    "Draping the fabric just right...",
    "Consulting the style archives...",
    "Matching light and shadow to the fit...",
    "Tailoring every seam to your shape...",
    "Almost runway-ready...",
    "Fine-tuning the silhouette..."
];

function isLoggedIn() {
    return !!localStorage.getItem('avantUserName');
}

function getUsername() {
    return localStorage.getItem('avantUserName') || null;
}

export default function TryonPage() {
    const [userPhotoFile, setUserPhotoFile] = useState(null);
    const [userPhotoUrl, setUserPhotoUrl] = useState('');

    const [garmentFile, setGarmentFile] = useState(null);
    const [garmentPhotoUrl, setGarmentPhotoUrl] = useState('');

    const [selectedLookUrl, setSelectedLookUrl] = useState(null);
    const [savedLooks, setSavedLooks] = useState([]);
    const [isLoadingLooks, setIsLoadingLooks] = useState(true);

    const [saveToWardrobeChecked, setSaveToWardrobeChecked] = useState(false);
    const [autoSavedItemId, setAutoSavedItemId] = useState(null);

    const [isGenerating, setIsGenerating] = useState(false);
    const [quoteIndex, setQuoteIndex] = useState(0);
    const [tryonResultUrl, setTryonResultUrl] = useState(null);
    const [tryonError, setTryonError] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const photoInputRef = useRef(null);
    const garmentInputRef = useRef(null);

    // Initial load: saved looks & bridge from Outfit Lab
    useEffect(() => {
        async function loadLooks() {
            let items = [];
            try {
                if (isLoggedIn()) {
                    const res = await fetch('/api/my-wardrobe', {
                        headers: { 'x-username': getUsername() }
                    });
                    const data = await res.json();
                    if (data.success) items = data.items.map((i) => i.imageUrl);
                } else {
                    const guest = JSON.parse(localStorage.getItem('avant_wardrobe_guest') || '[]');
                    items = guest.map((i) => i.src).filter(Boolean);
                }
            } catch (err) {
                console.error('Failed to load looks:', err);
            }
            setSavedLooks(items);
            setIsLoadingLooks(false);
        }

        loadLooks();

        // Check bridged garment
        const bridged = localStorage.getItem('avant_tryon_garment_bridge');
        if (bridged) {
            localStorage.removeItem('avant_tryon_garment_bridge');
            try {
                const { dataUrl } = JSON.parse(bridged);
                fetch(dataUrl)
                    .then((r) => r.blob())
                    .then((blob) => {
                        const file = new File([blob], 'avant-generated-look.jpg', {
                            type: blob.type || 'image/jpeg'
                        });
                        setGarmentFile(file);
                        setGarmentPhotoUrl(URL.createObjectURL(file));
                        setSelectedLookUrl(null);
                    })
                    .catch((err) => console.warn('Failed to load bridged garment:', err));
            } catch (err) {
                console.warn('Failed to parse bridged garment:', err);
            }
        }
    }, []);

    // Quote rotation during generation
    useEffect(() => {
        if (!isGenerating) return;
        const interval = setInterval(() => {
            setQuoteIndex((prev) => (prev + 1) % LOADING_QUOTES.length);
        }, 3500);
        return () => clearInterval(interval);
    }, [isGenerating]);

    function handleUserPhotoChange(e) {
        const file = e.target.files[0];
        if (!file) return;
        setUserPhotoFile(file);
        setUserPhotoUrl(URL.createObjectURL(file));
    }

    function removeUserPhoto() {
        setUserPhotoFile(null);
        setUserPhotoUrl('');
        if (photoInputRef.current) photoInputRef.current.value = '';
    }

    function handleGarmentPhotoChange(e) {
        const file = e.target.files[0];
        if (!file) return;
        setGarmentFile(file);
        setGarmentPhotoUrl(URL.createObjectURL(file));
        setSelectedLookUrl(null);
        setSaveToWardrobeChecked(false);
    }

    function removeGarmentPhoto() {
        setGarmentFile(null);
        setGarmentPhotoUrl('');
        setSaveToWardrobeChecked(false);
        if (garmentInputRef.current) garmentInputRef.current.value = '';
    }

    async function handleSaveCheckboxChange(checked) {
        setSaveToWardrobeChecked(checked);
        if (checked && garmentFile) {
            try {
                const fd = new FormData();
                fd.append('image', garmentFile);
                if (isLoggedIn()) fd.append('userName', getUsername());

                const res = await fetch('/api/upload-wardrobe', { method: 'POST', body: fd });
                const data = await res.json();
                if (data.success) {
                    setAutoSavedItemId(data.itemId || null);
                    setSavedLooks((prev) => [data.imageUrl, ...prev]);
                }
            } catch (err) {
                console.warn('Could not save garment to wardrobe:', err);
            }
        } else if (!checked && autoSavedItemId) {
            if (isLoggedIn()) {
                try {
                    await fetch(`/api/my-wardrobe/${autoSavedItemId}`, {
                        method: 'DELETE',
                        headers: { 'x-username': getUsername() }
                    });
                } catch (err) {
                    console.warn('Could not remove saved garment:', err);
                }
            }
            setAutoSavedItemId(null);
        }
    }

    function selectLook(url) {
        setGarmentFile(null);
        setGarmentPhotoUrl('');
        setSaveToWardrobeChecked(false);
        setSelectedLookUrl(url);
    }

    function removeLookItem(e, url) {
        e.stopPropagation();
        setSavedLooks((prev) => prev.filter((u) => u !== url));
        if (selectedLookUrl === url) setSelectedLookUrl(null);
    }

    const canGenerate = userPhotoFile && (garmentFile || selectedLookUrl);

    async function handleGenerateTryon() {
        if (!canGenerate) return;

        setIsGenerating(true);
        setQuoteIndex(0);
        setTryonError(null);
        setTryonResultUrl(null);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 100000);

        try {
            const fd = new FormData();
            fd.append('photo', userPhotoFile);
            if (garmentFile) {
                fd.append('garmentPhoto', garmentFile);
            } else {
                fd.append('lookImageUrl', selectedLookUrl);
            }

            const res = await fetch('/api/virtual-tryon', {
                method: 'POST',
                body: fd,
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const contentType = res.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                throw new Error(`Server error (status ${res.status})`);
            }

            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Try-on failed');

            setTryonResultUrl(data.imageUrl);
        } catch (err) {
            console.error('Try-on error:', err);
            setTryonError(err.message || 'Try-on request failed. Please try again.');
        } finally {
            clearTimeout(timeoutId);
            setIsGenerating(false);
        }
    }

    async function downloadResult() {
        if (!tryonResultUrl) return;
        setIsDownloading(true);
        try {
            const imgRes = await fetch(tryonResultUrl);
            const blob = await imgRes.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = 'avant-tryon.jpg';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
        } catch (err) {
            console.error('Download failed, opening tab:', err);
            window.open(tryonResultUrl, '_blank');
        } finally {
            setIsDownloading(false);
        }
    }

    function resetStage() {
        setTryonResultUrl(null);
        setTryonError(null);
    }

    return (
        <Layout>
            <main className="tryon-page">
                <header className="hero-overlay tryon-hero">
                    <p className="editorial-label-ward">05 / VIRTUAL FITTING ROOM</p>
                    <h1 className="shop-title">
                        TRY&nbsp;IT&nbsp;<span>ON</span>
                    </h1>
                    <p className="shop-quote">
                        Upload your photo, pick a saved look or your own garment photo, and let AI show you exactly how it fits.
                    </p>
                </header>

                <div className="tryon-grid">
                    {/* LEFT: Upload + Selection controls */}
                    <div className="tryon-controls">
                        {/* 01: YOUR PHOTO */}
                        <section className="tryon-panel">
                            <p className="tryon-panel-label">01 — YOUR PHOTO</p>
                            <div
                                className={`tryon-upload-zone ${userPhotoUrl ? 'has-image' : ''}`}
                                id="upload-zone"
                                onClick={() => {
                                    if (!userPhotoUrl && photoInputRef.current) photoInputRef.current.click();
                                }}
                            >
                                <input
                                    type="file"
                                    id="user-photo-input"
                                    accept="image/*"
                                    hidden
                                    ref={photoInputRef}
                                    onChange={handleUserPhotoChange}
                                />
                                <div className="tryon-upload-inner" id="upload-inner">
                                    {userPhotoUrl ? (
                                        <>
                                            <img src={userPhotoUrl} className="tryon-upload-preview" alt="Your photo" />
                                            <button
                                                type="button"
                                                className="tryon-upload-remove"
                                                id="remove-photo-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeUserPhoto();
                                                }}
                                            >
                                                &times;
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                <polyline points="17 8 12 3 7 8" />
                                                <line x1="12" y1="3" x2="12" y2="15" />
                                            </svg>
                                            <p>
                                                Upload a full-body photo<br />
                                                <span>front-facing, plain background works best</span>
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* 02: YOUR OUTFIT */}
                        <section className="tryon-panel">
                            <p className="tryon-panel-label">02 — YOUR OUTFIT</p>

                            <div
                                className={`tryon-upload-zone ${garmentPhotoUrl ? 'has-image' : ''}`}
                                id="garment-upload-zone"
                                onClick={() => {
                                    if (!garmentPhotoUrl && garmentInputRef.current) garmentInputRef.current.click();
                                }}
                            >
                                <input
                                    type="file"
                                    id="garment-photo-input"
                                    accept="image/*"
                                    hidden
                                    ref={garmentInputRef}
                                    onChange={handleGarmentPhotoChange}
                                />
                                <div className="tryon-upload-inner" id="garment-upload-inner">
                                    {garmentPhotoUrl ? (
                                        <>
                                            <img src={garmentPhotoUrl} className="tryon-upload-preview" alt="Your garment" />
                                            <button
                                                type="button"
                                                className="tryon-upload-remove"
                                                id="remove-garment-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeGarmentPhoto();
                                                }}
                                            >
                                                &times;
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                <polyline points="17 8 12 3 7 8" />
                                                <line x1="12" y1="3" x2="12" y2="15" />
                                            </svg>
                                            <p>
                                                Upload a garment photo<br />
                                                <span>clean product shot works best</span>
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Save this look checkbox */}
                            {garmentPhotoUrl && (
                                <div className="tryon-save-look-wrap" id="save-look-wrap" style={{ display: 'flex' }}>
                                    <label className="tryon-save-look-label">
                                        <input
                                            type="checkbox"
                                            id="save-look-checkbox"
                                            checked={saveToWardrobeChecked}
                                            onChange={(e) => handleSaveCheckboxChange(e.target.checked)}
                                        />
                                        Save this look to my Wardrobe
                                    </label>
                                </div>
                            )}

                            {/* Divider (visible when looks exist) */}
                            {savedLooks.length > 0 && (
                                <p className="tryon-or-divider">OR SELECT A SAVED LOOK</p>
                            )}

                            {/* Saved looks grid */}
                            <div className="tryon-looks-grid" id="looks-grid">
                                {isLoadingLooks ? (
                                    <p className="tryon-empty-msg">Loading your saved looks…</p>
                                ) : savedLooks.length === 0 ? (
                                    <p className="tryon-empty-msg">
                                        No saved looks yet — add some in your <a href="wardrobe.html">Wardrobe</a>, or just upload a garment photo above.
                                    </p>
                                ) : (
                                    savedLooks.map((url, idx) => (
                                        <div
                                            key={idx}
                                            className={`tryon-look-item ${selectedLookUrl === url ? 'selected' : ''}`}
                                            onClick={() => selectLook(url)}
                                        >
                                            <img src={url} alt="Saved look" />
                                            <span className="tryon-look-check">✓</span>
                                            <button
                                                type="button"
                                                className="tryon-look-remove"
                                                title="Remove"
                                                onClick={(e) => removeLookItem(e, url)}
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        <button
                            type="button"
                            className="tryon-generate-btn"
                            id="generate-btn"
                            disabled={!canGenerate || isGenerating}
                            onClick={handleGenerateTryon}
                        >
                            {isGenerating ? 'Fitting...' : 'Try It On'}
                        </button>
                    </div>

                    {/* RIGHT: Result stage */}
                    <div className="tryon-stage-wrap">
                        <p className="tryon-panel-label">03 — YOUR FIT</p>
                        <div className="tryon-stage" id="tryon-stage">
                            {isGenerating ? (
                                <div className="tryon-loading-inner">
                                    <div className="loading-bars">
                                        <span></span><span></span><span></span><span></span><span></span>
                                    </div>
                                    <p className="loading-label" id="tryon-loading-quote">
                                        {LOADING_QUOTES[quoteIndex]}
                                    </p>
                                </div>
                            ) : tryonResultUrl ? (
                                <img src={tryonResultUrl} alt="Your try-on result" />
                            ) : tryonError ? (
                                <p className="tryon-stage-placeholder" style={{ color: '#c00' }}>
                                    {tryonError}
                                </p>
                            ) : (
                                <p className="tryon-stage-placeholder" id="stage-placeholder">
                                    Upload your photo and pick a look to begin
                                </p>
                            )}
                        </div>

                        {tryonResultUrl && (
                            <div className="tryon-actions" id="tryon-actions" style={{ display: 'flex' }}>
                                <button
                                    type="button"
                                    className="action-btn action-btn--save"
                                    id="tryon-download-btn"
                                    disabled={isDownloading}
                                    onClick={downloadResult}
                                >
                                    {isDownloading ? 'Downloading...' : 'Download This Look'}
                                </button>
                                <button
                                    type="button"
                                    className="action-btn action-btn--shop"
                                    id="tryon-reset-btn"
                                    onClick={resetStage}
                                >
                                    Try Another
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </Layout>
    );
}
