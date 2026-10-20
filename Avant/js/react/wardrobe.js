import { a as __esmMin, i as __commonJSMin, n as require_client, r as require_react, t as require_jsx_runtime } from "./shared-jsx-runtime.js";
import { n as init_Layout, t as Layout } from "./shared-Layout.js";
//#region client/src/wardrobe/WardrobePage.jsx
function isLoggedIn() {
	return !!localStorage.getItem("avantUserName");
}
function getUsername() {
	return localStorage.getItem("avantUserName") || null;
}
function WardrobePage() {
	const [images, setImages] = (0, import_react.useState)([]);
	const [uploadingCount, setUploadingCount] = (0, import_react.useState)(0);
	const [lightboxIndex, setLightboxIndex] = (0, import_react.useState)(null);
	const fileInputRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		async function loadWardrobe() {
			let loaded = [];
			if (isLoggedIn()) try {
				const data = await (await fetch("/api/my-wardrobe", { headers: { "x-username": getUsername() } })).json();
				if (data.success) loaded = data.items.map((item) => ({
					src: item.imageUrl,
					time: new Date(item.createdAt).toLocaleString("en-GB", {
						day: "numeric",
						month: "short",
						year: "numeric",
						hour: "2-digit",
						minute: "2-digit"
					}),
					id: item._id,
					isDb: true
				}));
			} catch (err) {
				console.error("Failed to load wardrobe from DB:", err);
				loaded = JSON.parse(localStorage.getItem("avant_wardrobe_guest") || "[]");
			}
			else loaded = JSON.parse(localStorage.getItem("avant_wardrobe_guest") || "[]");
			try {
				const bridge = JSON.parse(localStorage.getItem("avant_wardrobe_bridge") || "[]");
				if (bridge.length > 0) {
					localStorage.removeItem("avant_wardrobe_bridge");
					const existingUrls = new Set(loaded.map((i) => i.src));
					const fresh = bridge.filter((i) => i.src && !existingUrls.has(i.src));
					if (fresh.length > 0) loaded = [...fresh, ...loaded];
				}
			} catch (e) {}
			setImages(loaded);
		}
		loadWardrobe();
	}, []);
	(0, import_react.useEffect)(() => {
		function handleKeyDown(e) {
			if (lightboxIndex === null) return;
			if (e.key === "ArrowRight") setLightboxIndex((prev) => prev + 1 >= images.length ? 0 : prev + 1);
			else if (e.key === "ArrowLeft") setLightboxIndex((prev) => prev - 1 < 0 ? images.length - 1 : prev - 1);
			else if (e.key === "Escape") setLightboxIndex(null);
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [lightboxIndex, images.length]);
	async function handleUpload(e) {
		const files = Array.from(e.target.files);
		if (files.length === 0) return;
		setUploadingCount(files.length);
		const newUploadedItems = [];
		for (const file of files) try {
			const formData = new FormData();
			formData.append("image", file);
			if (isLoggedIn()) formData.append("userName", getUsername());
			const data = await (await fetch("/api/upload-wardrobe", {
				method: "POST",
				body: formData
			})).json();
			if (!data.success) throw new Error(data.message);
			const newItem = {
				src: data.imageUrl,
				time: data.timestamp || (/* @__PURE__ */ new Date()).toLocaleString("en-GB"),
				id: data.itemId || null,
				isDb: data.savedToDb || false
			};
			newUploadedItems.push(newItem);
		} catch (err) {
			console.error("Upload failed:", err);
			alert("Upload failed for one image: " + err.message);
		}
		setImages((prev) => {
			const next = [...newUploadedItems, ...prev];
			if (!isLoggedIn()) {
				const guestItems = next.filter((img) => !img.isDb);
				localStorage.setItem("avant_wardrobe_guest", JSON.stringify(guestItems));
			}
			return next;
		});
		setUploadingCount(0);
		if (fileInputRef.current) fileInputRef.current.value = "";
	}
	async function handleDelete(e, index) {
		e.stopPropagation();
		if (!window.confirm("Permanently remove this look?")) return;
		const item = images[index];
		if (item.isDb && item.id && isLoggedIn()) try {
			const data = await (await fetch(`/api/my-wardrobe/${item.id}`, {
				method: "DELETE",
				headers: { "x-username": getUsername() }
			})).json();
			if (!data.success) throw new Error(data.message);
		} catch (err) {
			console.error("DB delete failed:", err);
			alert("Delete failed: " + err.message);
			return;
		}
		setImages((prev) => {
			const next = prev.filter((_, i) => i !== index);
			if (!isLoggedIn()) {
				const guestItems = next.filter((img) => !img.isDb);
				localStorage.setItem("avant_wardrobe_guest", JSON.stringify(guestItems));
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
	return /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)(Layout, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("header", {
			className: "wardrobe-hero",
			children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
				className: "hero-overlay",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
						className: "editorial-label-ward",
						children: "03 / PERSONAL ARCHIVE"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("h1", {
						className: "hero-title",
						children: ["DIGITAL ", /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", { children: "WARDROBE" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
						className: "upload-box",
						children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("input", {
							type: "file",
							id: "outfit-upload",
							accept: "image/*",
							hidden: true,
							multiple: true,
							ref: fileInputRef,
							onChange: handleUpload
						}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("button", {
							type: "button",
							className: "upload-trigger",
							onClick: () => fileInputRef.current && fileInputRef.current.click(),
							children: "+ UPLOAD NEW LOOK"
						})]
					})
				]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("main", {
			className: "gallery-section",
			children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
				className: "gallery-grid",
				id: "wardrobe-grid",
				children: [uploadingCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("p", {
					id: "upload-loading",
					style: {
						textAlign: "center",
						padding: "20px",
						fontFamily: "'Montserrat', sans-serif",
						fontSize: "0.8rem",
						letterSpacing: "2px",
						color: "#999",
						gridColumn: "1/-1"
					},
					children: [
						"UPLOADING ",
						uploadingCount,
						" IMAGE",
						uploadingCount > 1 ? "S" : "",
						"..."
					]
				}), images.length === 0 && uploadingCount === 0 ? /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
					className: "initial-msg",
					style: {
						gridColumn: "1/-1",
						textAlign: "center",
						padding: "50px",
						color: "#ccc",
						fontStyle: "italic"
					},
					children: "Your archive is empty. Upload your first look."
				}) : images.map((img, index) => /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)(WardrobeGridItem, {
					img,
					index,
					onOpenLightbox: () => setLightboxIndex(index),
					onDelete: (e) => handleDelete(e, index)
				}, img.id || img.src + index))]
			})
		}),
		currentLightboxItem && /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
			id: "lightbox",
			className: "lightbox",
			style: { display: "flex" },
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {
					className: "close-lightbox",
					onClick: () => setLightboxIndex(null),
					children: "×"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("button", {
					type: "button",
					className: "nav-btn prev",
					onClick: () => changeLightboxImage(-1),
					children: "❮"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
					className: "lightbox-content",
					children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("img", {
						id: "lightbox-img",
						src: currentLightboxItem.src,
						alt: "Full Look"
					}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
						className: "image-meta",
						children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
							id: "image-timestamp",
							children: currentLightboxItem.time ? `ARCHIVED ON: ${currentLightboxItem.time}` : ""
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("button", {
					type: "button",
					className: "nav-btn next",
					onClick: () => changeLightboxImage(1),
					children: "❯"
				})
			]
		})
	] });
}
function WardrobeGridItem({ img, index, onOpenLightbox, onDelete }) {
	const [isHovered, setIsHovered] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
		className: "grid-item",
		onMouseEnter: () => setIsHovered(true),
		onMouseLeave: () => setIsHovered(false),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("img", {
				src: img.src,
				onClick: onOpenLightbox,
				alt: "Wardrobe Item"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("button", {
				className: "delete-btn",
				type: "button",
				onClick: onDelete,
				children: "×"
			}),
			img.time && /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
				style: {
					position: "absolute",
					bottom: 0,
					left: 0,
					right: 0,
					background: "rgba(0,0,0,0.6)",
					color: "#fff",
					fontFamily: "'Montserrat', sans-serif",
					fontSize: "0.6rem",
					letterSpacing: "1px",
					padding: "8px 12px",
					textTransform: "uppercase",
					opacity: isHovered ? 1 : 0,
					transition: "opacity 0.3s"
				},
				children: img.time
			})
		]
	});
}
var import_react, import_jsx_runtime$1;
var init_WardrobePage = __esmMin((() => {
	import_react = require_react();
	init_Layout();
	import_jsx_runtime$1 = require_jsx_runtime();
}));
//#endregion
//#region client/src/wardrobe/main.jsx
var require_main = /* @__PURE__ */ __commonJSMin((() => {
	var import_client = require_client();
	init_WardrobePage();
	var import_jsx_runtime = require_jsx_runtime();
	var rootEl = document.getElementById("wardrobe-root");
	if (rootEl) (0, import_client.createRoot)(rootEl).render(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WardrobePage, {}));
}));
//#endregion
export default require_main();
