import { useEffect, useRef, useState } from 'react';
import Layout from '../common/Layout.jsx';

function isLoggedIn() {
    return !!localStorage.getItem('avantUserName');
}

function getUsername() {
    return localStorage.getItem('avantUserName') || null;
}

export default function WardrobePage() {
    const [images, setImages] = useState([]);
    const [uploadingCount, setUploadingCount] = useState(0);
    const [lightboxIndex, setLightboxIndex] = useState(null); // number or null
    const fileInputRef = useRef(null);

    // Initial load
    useEffect(() => {
        async function loadWardrobe() {
            let loaded = [];
            if (isLoggedIn()) {
                try {
                    const res = await fetch('/api/my-wardrobe', {
                        headers: { 'x-username': getUsername() }
                    });
                    const data = await res.json();
                    if (data.success) {
                        loaded = data.items.map((item) => ({
                            src: item.imageUrl,
                            time: new Date(item.createdAt).toLocaleString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            }),
                            id: item._id,
                            isDb: true
                        }));
                    }
                } catch (err) {
                    console.error('Failed to load wardrobe from DB:', err);
                    loaded = JSON.parse(localStorage.getItem('avant_wardrobe_guest') || '[]');
                }
            } else {
                loaded = JSON.parse(localStorage.getItem('avant_wardrobe_guest') || '[]');
            }

            // Bridge from Outfit Lab
            try {
                const bridge = JSON.parse(localStorage.getItem('avant_wardrobe_bridge') || '[]');
                if (bridge.length > 0) {
                    localStorage.removeItem('avant_wardrobe_bridge');
                    const existingUrls = new Set(loaded.map((i) => i.src));
                    const fresh = bridge.filter((i) => i.src && !existingUrls.has(i.src));
                    if (fresh.length > 0) {
                        loaded = [...fresh, ...loaded];
                    }
                }
            } catch (e) {}

            setImages(loaded);
        }

        loadWardrobe();
    }, []);

    // Keyboard navigation for lightbox
    useEffect(() => {
        function handleKeyDown(e) {
            if (lightboxIndex === null) return;
            if (e.key === 'ArrowRight') {
                setLightboxIndex((prev) => (prev + 1 >= images.length ? 0 : prev + 1));
            } else if (e.key === 'ArrowLeft') {
                setLightboxIndex((prev) => (prev - 1 < 0 ? images.length - 1 : prev - 1));
            } else if (e.key === 'Escape') {
                setLightboxIndex(null);
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxIndex, images.length]);

    async function handleUpload(e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploadingCount(files.length);
        const newUploadedItems = [];

        for (const file of files) {
            try {
                const formData = new FormData();
                formData.append('image', file);
                if (isLoggedIn()) formData.append('userName', getUsername());

                const res = await fetch('/api/upload-wardrobe', {
                    method: 'POST',
                    body: formData
                });

                const data = await res.json();
                if (!data.success) throw new Error(data.message);

                const newItem = {
                    src: data.imageUrl,
                    time: data.timestamp || new Date().toLocaleString('en-GB'),
                    id: data.itemId || null,
                    isDb: data.savedToDb || false
                };

                newUploadedItems.push(newItem);
            } catch (err) {
                console.error('Upload failed:', err);
                alert('Upload failed for one image: ' + err.message);
            }
        }

        setImages((prev) => {
            const next = [...newUploadedItems, ...prev];
            if (!isLoggedIn()) {
                const guestItems = next.filter((img) => !img.isDb);
                localStorage.setItem('avant_wardrobe_guest', JSON.stringify(guestItems));
            }
            return next;
        });

        setUploadingCount(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    async function handleDelete(e, index) {
        e.stopPropagation();
        if (!window.confirm('Permanently remove this look?')) return;

        const item = images[index];

        if (item.isDb && item.id && isLoggedIn()) {
            try {
                const res = await fetch(`/api/my-wardrobe/${item.id}`, {
                    method: 'DELETE',
                    headers: { 'x-username': getUsername() }
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.message);
            } catch (err) {
                console.error('DB delete failed:', err);
                alert('Delete failed: ' + err.message);
                return;
            }
        }

        setImages((prev) => {
            const next = prev.filter((_, i) => i !== index);
            if (!isLoggedIn()) {
                const guestItems = next.filter((img) => !img.isDb);
                localStorage.setItem('avant_wardrobe_guest', JSON.stringify(guestItems));
            }
            return next;
        });
    }

    function changeLightboxImage(step) {
        if (images.length === 0) return;
        setLightboxIndex((prev) => {
            let next = prev + step;
            if (next >= images.length) next = 0;
            if (next < 0) next = images.length - 1;
            return next;
        });
    }

    const currentLightboxItem = lightboxIndex !== null ? images[lightboxIndex] : null;

    return (
        <Layout>
            <header className="wardrobe-hero">
                <div className="hero-overlay">
                    <p className="editorial-label-ward">03 / PERSONAL ARCHIVE</p>
                    <h1 className="hero-title">
                        DIGITAL <span>WARDROBE</span>
                    </h1>
                    <div className="upload-box">
                        <input
                            type="file"
                            id="outfit-upload"
                            accept="image/*"
                            hidden
                            multiple
                            ref={fileInputRef}
                            onChange={handleUpload}
                        />
                        <button
                            type="button"
                            className="upload-trigger"
                            onClick={() => fileInputRef.current && fileInputRef.current.click()}
                        >
                            + UPLOAD NEW LOOK
                        </button>
                    </div>
                </div>
            </header>

            <main className="gallery-section">
                <div className="gallery-grid" id="wardrobe-grid">
                    {uploadingCount > 0 && (
                        <p
                            id="upload-loading"
                            style={{
                                textAlign: 'center',
                                padding: '20px',
                                fontFamily: "'Montserrat', sans-serif",
                                fontSize: '0.8rem',
                                letterSpacing: '2px',
                                color: '#999',
                                gridColumn: '1/-1'
                            }}
                        >
                            UPLOADING {uploadingCount} IMAGE{uploadingCount > 1 ? 'S' : ''}...
                        </p>
                    )}

                    {images.length === 0 && uploadingCount === 0 ? (
                        <p
                            className="initial-msg"
                            style={{
                                gridColumn: '1/-1',
                                textAlign: 'center',
                                padding: '50px',
                                color: '#ccc',
                                fontStyle: 'italic'
                            }}
                        >
                            Your archive is empty. Upload your first look.
                        </p>
                    ) : (
                        images.map((img, index) => (
                            <WardrobeGridItem
                                key={img.id || img.src + index}
                                img={img}
                                index={index}
                                onOpenLightbox={() => setLightboxIndex(index)}
                                onDelete={(e) => handleDelete(e, index)}
                            />
                        ))
                    )}
                </div>
            </main>

            {/* Lightbox */}
            {currentLightboxItem && (
                <div id="lightbox" className="lightbox" style={{ display: 'flex' }}>
                    <span className="close-lightbox" onClick={() => setLightboxIndex(null)}>
                        &times;
                    </span>
                    <button
                        type="button"
                        className="nav-btn prev"
                        onClick={() => changeLightboxImage(-1)}
                    >
                        &#10094;
                    </button>
                    <div className="lightbox-content">
                        <img id="lightbox-img" src={currentLightboxItem.src} alt="Full Look" />
                        <div className="image-meta">
                            <p id="image-timestamp">
                                {currentLightboxItem.time ? `ARCHIVED ON: ${currentLightboxItem.time}` : ''}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="nav-btn next"
                        onClick={() => changeLightboxImage(1)}
                    >
                        &#10095;
                    </button>
                </div>
            )}
        </Layout>
    );
}

function WardrobeGridItem({ img, index, onOpenLightbox, onDelete }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className="grid-item"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <img src={img.src} onClick={onOpenLightbox} alt="Wardrobe Item" />
            <button className="delete-btn" type="button" onClick={onDelete}>
                &times;
            </button>
            {img.time && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: '0.6rem',
                        letterSpacing: '1px',
                        padding: '8px 12px',
                        textTransform: 'uppercase',
                        opacity: isHovered ? 1 : 0,
                        transition: 'opacity 0.3s'
                    }}
                >
                    {img.time}
                </div>
            )}
        </div>
    );
}
