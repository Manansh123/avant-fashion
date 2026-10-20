import { a as __esmMin, i as __commonJSMin, n as require_client, r as require_react, t as require_jsx_runtime } from "./shared-jsx-runtime.js";
import { n as init_Layout, t as Layout } from "./shared-Layout.js";
import { n as init_quotes, t as getRandomFashionQuote } from "./shared-quotes.js";
//#region client/src/common/toast.js
function showToast(msg) {
	document.getElementById("avant-toast")?.remove();
	const t = document.createElement("div");
	t.id = "avant-toast";
	t.textContent = msg;
	Object.assign(t.style, {
		position: "fixed",
		bottom: "30px",
		left: "50%",
		transform: "translateX(-50%)",
		background: "#000",
		color: "#fff",
		fontFamily: "'Montserrat', sans-serif",
		fontSize: "0.72rem",
		fontWeight: "600",
		letterSpacing: "1.5px",
		padding: "14px 28px",
		zIndex: "999999",
		pointerEvents: "none",
		opacity: "0",
		transition: "opacity 0.35s ease",
		maxWidth: "90vw",
		textAlign: "center"
	});
	document.body.appendChild(t);
	requestAnimationFrame(() => {
		t.style.opacity = "1";
	});
	setTimeout(() => {
		t.style.opacity = "0";
		setTimeout(() => t.remove(), 400);
	}, 4500);
}
var init_toast = __esmMin((() => {}));
//#endregion
//#region client/src/outfit/OutfitPage.jsx
function OutfitPage() {
	const [item, setItem] = (0, import_react.useState)("");
	const [gender, setGender] = (0, import_react.useState)("");
	const [color, setColor] = (0, import_react.useState)("");
	const [fabric, setFabric] = (0, import_react.useState)("");
	const [aesthetic, setAesthetic] = (0, import_react.useState)("");
	const [occasion, setOccasion] = (0, import_react.useState)("");
	const [weather, setWeather] = (0, import_react.useState)("");
	const [footwear, setFootwear] = (0, import_react.useState)("");
	const [mood, setMood] = (0, import_react.useState)("");
	const [isGenerating, setIsGenerating] = (0, import_react.useState)(false);
	const [mirrorState, setMirrorState] = (0, import_react.useState)("default");
	const [progress, setProgress] = (0, import_react.useState)(0);
	const [currentQuote, setCurrentQuote] = (0, import_react.useState)(() => getRandomFashionQuote());
	const [generatedCaption, setGeneratedCaption] = (0, import_react.useState)("");
	const [shopItems, setShopItems] = (0, import_react.useState)([]);
	const [imageLoaded, setImageLoaded] = (0, import_react.useState)(false);
	const [imageError, setImageError] = (0, import_react.useState)(false);
	const [proxyUrl, setProxyUrl] = (0, import_react.useState)("");
	const [capturedBlob, setCapturedBlob] = (0, import_react.useState)(null);
	const [isSavingWardrobe, setIsSavingWardrobe] = (0, import_react.useState)(false);
	const [isRedirectingShop, setIsRedirectingShop] = (0, import_react.useState)(false);
	const imgRef = (0, import_react.useRef)(null);
	const resultFrameRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		function handlePageShow(e) {
			if (e.persisted) {
				setIsSavingWardrobe(false);
				setIsRedirectingShop(false);
				setIsGenerating(false);
			}
		}
		window.addEventListener("pageshow", handlePageShow);
		return () => window.removeEventListener("pageshow", handlePageShow);
	}, []);
	(0, import_react.useEffect)(() => {
		if ("scrollRestoration" in history) history.scrollRestoration = "manual";
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
		const trimmedGender = (gender || "unisex").trim();
		if (!trimmedItem && !trimmedColor && !trimmedAesthetic) {
			showToast("Fill in at least Item, Color, or Aesthetic first.");
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
		document.querySelector(".visual-output")?.scrollIntoView({
			behavior: "smooth",
			block: "start"
		});
		setIsGenerating(true);
		setMirrorState("loading");
		setCurrentQuote(getRandomFashionQuote());
		setProgress(15);
		setImageLoaded(false);
		setImageError(false);
		setCapturedBlob(null);
		try {
			setProgress(30);
			const res = await fetch("/api/generate-outfit-logic", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
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
			if (!data.success) throw new Error(data.message || "Backend error");
			const shortPrompt = data.imagePrompt || `${trimmedAesthetic} ${trimmedItem}, ${trimmedColor}, editorial fashion, studio lighting`;
			const newProxyUrl = `/api/proxy-image?prompt=${encodeURIComponent(shortPrompt)}&width=768&height=1024&gender=${encodeURIComponent(trimmedGender)}&t=${Date.now()}`;
			const items = Array.isArray(data.shoppingItems) && data.shoppingItems.length > 0 ? data.shoppingItems : inputChips;
			const c = (data.caption || "").trim();
			const captionText = c.length > 5 ? c : `A ${trimmedColor || "curated"} ${trimmedItem || "look"} in ${trimmedAesthetic || "avant-garde"} style.`;
			setShopItems(items);
			setGeneratedCaption(captionText);
			setProxyUrl(newProxyUrl);
			setMirrorState("result");
			setProgress(75);
			if (resultFrameRef.current) {
				resultFrameRef.current.classList.remove("reveal-in");
				resultFrameRef.current.offsetWidth;
				resultFrameRef.current.classList.add("reveal-in");
				setTimeout(() => resultFrameRef.current?.classList.remove("reveal-in"), 600);
			}
		} catch (err) {
			console.error("❌ Generation error:", err.message);
			setProgress(0);
			setMirrorState("default");
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
		if (imgEl) try {
			const canvas = document.createElement("canvas");
			canvas.width = imgEl.naturalWidth;
			canvas.height = imgEl.naturalHeight;
			canvas.getContext("2d").drawImage(imgEl, 0, 0);
			canvas.toBlob((b) => {
				setCapturedBlob(b);
				window._avantCapturedBlob = b;
			}, "image/jpeg", .92);
		} catch (e) {
			console.warn("Canvas capture failed:", e);
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
			const a = document.createElement("a");
			a.href = bUrl;
			a.download = "avant-look.jpg";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			setTimeout(() => URL.revokeObjectURL(bUrl), 2e3);
		} else showToast("Image still loading, try again in a moment.");
	}
	async function goToVirtualTryOn() {
		const blob = capturedBlob || window._avantCapturedBlob;
		if (!blob) {
			showToast("Generate a look first, then wait for the image to fully load.");
			return;
		}
		try {
			const dataUrl = await new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve(reader.result);
				reader.onerror = reject;
				reader.readAsDataURL(blob);
			});
			localStorage.setItem("avant_tryon_garment_bridge", JSON.stringify({ dataUrl }));
			window.location.href = "tryon.html";
		} catch (err) {
			showToast("Could not send this look to Try-On — please try again.");
			console.error("goToVirtualTryOn error:", err);
		}
	}
	async function syncToWardrobeGallery() {
		const blob = capturedBlob || window._avantCapturedBlob;
		if (!blob) {
			showToast("Generate a look first, then wait for image to fully load.");
			return;
		}
		setIsSavingWardrobe(true);
		showToast("Syncing look to Wardrobe...");
		try {
			const fd = new FormData();
			fd.append("image", blob, "avant-outfit.jpg");
			const u = localStorage.getItem("avantUserName");
			if (u) fd.append("userName", u);
			const data = await (await fetch("/api/upload-wardrobe", {
				method: "POST",
				body: fd
			})).json();
			if (!data.success) throw new Error(data.message);
			try {
				const prev = JSON.parse(localStorage.getItem("avant_wardrobe_bridge") || "[]");
				prev.unshift({
					src: data.imageUrl,
					time: data.timestamp || (/* @__PURE__ */ new Date()).toLocaleString("en-GB"),
					id: data.itemId || null,
					isDb: !!data.savedToDb
				});
				localStorage.setItem("avant_wardrobe_bridge", JSON.stringify(prev.slice(0, 20)));
			} catch (e) {}
			showToast("✓ Added to Wardrobe!");
			setTimeout(() => {
				window.location.href = "wardrobe.html";
			}, 700);
		} catch (err) {
			showToast("Couldn't sync to your wardrobe — please try again.");
			setIsSavingWardrobe(false);
		}
	}
	function shopThisLook() {
		if (!shopItems.length) {
			showToast("Generate a look first.");
			return;
		}
		localStorage.setItem("avant_shopping_sync", JSON.stringify(shopItems));
		setIsRedirectingShop(true);
		setTimeout(() => {
			window.location.href = "shop.html";
		}, 250);
	}
	function handleChipShopClick(itemTitle) {
		localStorage.setItem("avant_shopping_sync", JSON.stringify([itemTitle.trim()]));
		showToast(`Syncing ${itemTitle.trim()} parameters to Boutique...`);
		setTimeout(() => {
			window.location.href = "shop.html";
		}, 400);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)(Layout, { children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
		id: "outfit-progress-bar",
		className: progress > 0 && progress < 100 ? "bar-pulse" : "",
		style: { width: `${progress}%` }
	}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("main", {
		className: "build-container",
		children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("section", {
			className: "stylist-panel",
			children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("header", {
				className: "panel-header",
				children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
					className: "editorial-label-dark",
					children: "02 / OUTFIT BUILDER"
				}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("h1", {
					className: "main-heading",
					children: [
						"THE OUTFIT ",
						/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("br", {}),
						/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", { children: "LAB" })
					]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
				className: "style-form",
				id: "style-form",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
						className: "datalist-grid",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
								className: "dl-group",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("label", {
										htmlFor: "dl-item",
										children: "Item"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("input", {
										type: "text",
										id: "dl-item",
										list: "list-item",
										placeholder: "e.g. Blazer",
										autoComplete: "off",
										value: item,
										onChange: (e) => setItem(e.target.value),
										onKeyDown: (e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												handleGenerate();
											}
										}
									}),
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("datalist", {
										id: "list-item",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Oversized T-Shirt" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Graphic Tee" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Plain Tee" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Cargo Pants" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Baggy Jeans" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Straight Fit Jeans" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Wide Leg Jeans" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Parachute Pants" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Joggers" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Hoodie" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Zip Hoodie" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Oversized Hoodie" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Flannel Shirt" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Oversized Shirt" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Polo T-Shirt" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Tank Top" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Crop Top" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Co-ord Set" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Varsity Jacket" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Bomber Jacket" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Denim Jacket" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Leather Jacket" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Kurta" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Saree" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Dress" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Mini Skirt" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Wide Leg Pants" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Others" })
										]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
								className: "dl-group",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("label", { children: "Gender" }),
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("input", {
										type: "text",
										id: "dl-gender",
										list: "genders-list",
										placeholder: "e.g., Male, Female, Unisex",
										autoComplete: "off",
										value: gender,
										onChange: (e) => setGender(e.target.value),
										onKeyDown: (e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												handleGenerate();
											}
										}
									}),
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("datalist", {
										id: "genders-list",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Men" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Women" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Unisex" })
										]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
								className: "dl-group",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("label", {
										htmlFor: "dl-color",
										children: "Color"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("input", {
										type: "text",
										id: "dl-color",
										list: "list-color",
										placeholder: "e.g. Midnight Black",
										autoComplete: "off",
										value: color,
										onChange: (e) => setColor(e.target.value),
										onKeyDown: (e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												handleGenerate();
											}
										}
									}),
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("datalist", {
										id: "list-color",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Black" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "White" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Off White" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Cream" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Grey" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Charcoal" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Silver" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Navy Blue" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Sky Blue" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Denim Blue" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Royal Blue" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Baby Blue" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Olive Green" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Dark Green" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Mint Green" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Sage Green" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Beige" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Tan" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Brown" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Mocha" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Chocolate Brown" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Maroon" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Wine" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Red" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Cherry Red" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Baby Pink" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Hot Pink" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Lavender" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Purple" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Peach" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Orange" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Mustard" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Rust" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Yellow" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Others" })
										]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
								className: "dl-group",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("label", {
										htmlFor: "dl-fabric",
										children: "Fabric"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("input", {
										type: "text",
										id: "dl-fabric",
										list: "list-fabric",
										placeholder: "e.g. Heavy Denim",
										autoComplete: "off",
										value: fabric,
										onChange: (e) => setFabric(e.target.value),
										onKeyDown: (e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												handleGenerate();
											}
										}
									}),
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("datalist", {
										id: "list-fabric",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Bamboo" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Canvas" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Cashmere" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Chiffon" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Cotton Blend" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Crepe" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Denim" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Faux Leather" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Fleece" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Georgette" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Heavy Denim" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Leather" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Linen" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Nylon" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Organic Cotton" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Polyester" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Rayon" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Ribbed Knit" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Satin" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Silk" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Soft Cotton" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Stretch Denim" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Suede" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Tweed" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Twill" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Velvet" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Woven" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Wool" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Others" })
										]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
								className: "dl-group",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("label", {
										htmlFor: "dl-aesthetic",
										children: "Aesthetic"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("input", {
										type: "text",
										id: "dl-aesthetic",
										list: "list-aesthetic",
										placeholder: "e.g. Old Money",
										autoComplete: "off",
										value: aesthetic,
										onChange: (e) => setAesthetic(e.target.value),
										onKeyDown: (e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												handleGenerate();
											}
										}
									}),
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("datalist", {
										id: "list-aesthetic",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Streetwear" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Minimal" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Old Money" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Clean Girl" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Soft Girl" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Y2K" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Vintage" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Casual" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Oversized Fit" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Athleisure" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Korean Style" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Pinterest Style" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Grunge" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Coquette" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Indie" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Skater" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Classy" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Chic" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Monochrome" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Party Wear" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Desi Fusion" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Others" })
										]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
								className: "dl-group",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("label", {
										htmlFor: "dl-occasion",
										children: "Occasion"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("input", {
										type: "text",
										id: "dl-occasion",
										list: "list-occasion",
										placeholder: "e.g. Brunch",
										autoComplete: "off",
										value: occasion,
										onChange: (e) => setOccasion(e.target.value),
										onKeyDown: (e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												handleGenerate();
											}
										}
									}),
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("datalist", {
										id: "list-occasion",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Casual Outing" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "College" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Office" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Party" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Date Night" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Coffee Date" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Dinner" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Brunch" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Shopping" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Travel" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Airport Look" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Concert" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Beach Day" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Vacation" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Wedding" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Festive Wear" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Gym" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Streetwear" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Photoshoot" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Weekend Hangout" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "House Party" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Club Night" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Others" })
										]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
								className: "dl-group",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("label", {
										htmlFor: "dl-weather",
										children: "Weather"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("input", {
										type: "text",
										id: "dl-weather",
										list: "list-weather",
										placeholder: "e.g. Breezy",
										autoComplete: "off",
										value: weather,
										onChange: (e) => setWeather(e.target.value),
										onKeyDown: (e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												handleGenerate();
											}
										}
									}),
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("datalist", {
										id: "list-weather",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Sunny" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Hot" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Warm" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Cool" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Cold" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Windy" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Rainy" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Cloudy" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Humid" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Foggy" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Snowy" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Summer" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Winter" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Monsoon" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Spring" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Autumn" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Others" })
										]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
								className: "dl-group",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("label", {
										htmlFor: "dl-footwear",
										children: "Footwear"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("input", {
										type: "text",
										id: "dl-footwear",
										list: "list-footwear",
										placeholder: "e.g. Chunky Sneakers",
										autoComplete: "off",
										value: footwear,
										onChange: (e) => setFootwear(e.target.value),
										onKeyDown: (e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												handleGenerate();
											}
										}
									}),
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("datalist", {
										id: "list-footwear",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Sneakers" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "White Sneakers" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Chunky Sneakers" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "High Tops" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Low Tops" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Running Shoes" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Skate Shoes" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Basketball Shoes" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Slip Ons" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Slides" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Crocs" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Flip Flops" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Sandals" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Loafers" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Moccasins" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Boat Shoes" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Formal Shoes" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Oxford Shoes" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Derby Shoes" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Chelsea Boots" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Combat Boots" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Ankle Boots" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Knee High Boots" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Platform Shoes" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Platform Sneakers" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Heels" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Block Heels" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Kitten Heels" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Stilettos" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Wedges" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Ballet Flats" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Mary Janes" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Espadrilles" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Kolhapuri Sandals" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Juttis" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Ethnic Sandals" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "School Shoes" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Light Up Sneakers" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Cartoon Sandals" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("option", { value: "Others" })
										]
									})
								]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
						className: "dl-group dl-group--full",
						children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("label", {
							htmlFor: "dl-mood",
							children: "Mood / Additional Details"
						}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("textarea", {
							id: "dl-mood",
							rows: "4",
							placeholder: "Describe your vibe, occasion details, or any specific requests... (e.g. 'Monochrome palette, minimal accessories, Indo-fusion touch')",
							value: mood,
							onChange: (e) => setMood(e.target.value),
							onKeyDown: (e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									handleGenerate();
								}
							}
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("button", {
						type: "button",
						className: "build-btn",
						id: "synthesize-btn",
						disabled: isGenerating,
						onClick: handleGenerate,
						children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {
							className: "btn-text",
							children: isGenerating ? "GENERATING..." : "✦ \xA0 SYNTHESIZE LOOK \xA0 ✦"
						}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {
							className: "btn-sub",
							children: "AI-POWERED GENERATION"
						})]
					})
				]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("section", {
			className: "visual-output",
			children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
				className: "outfit-mirror-frame",
				id: "result-frame",
				ref: resultFrameRef,
				children: [
					mirrorState === "default" && /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
						className: "mirror-default",
						id: "default-msg",
						style: { display: "flex" },
						children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
							className: "mirror-default-inner",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
									className: "mirror-icon",
									children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("svg", {
										width: "48",
										height: "48",
										viewBox: "0 0 48 48",
										fill: "none",
										xmlns: "http://www.w3.org/2000/svg",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("rect", {
												x: "1",
												y: "1",
												width: "46",
												height: "46",
												rx: "1",
												stroke: "#a1a1a1",
												strokeWidth: "1.5",
												strokeDasharray: "4 4"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("path", {
												d: "M16 32L22 24L26 28L30 22L36 32H16Z",
												stroke: "#a1a1a1",
												strokeWidth: "1.2",
												strokeLinejoin: "round"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("circle", {
												cx: "20",
												cy: "20",
												r: "3",
												stroke: "#a1a1a1",
												strokeWidth: "1.2"
											})
										]
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
									className: "mirror-default-title",
									children: "YOUR LOOK APPEARS HERE"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("p", {
									className: "mirror-default-sub",
									children: [
										"Configure your inputs on the left",
										/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("br", {}),
										"and synthesize your outfit."
									]
								})
							]
						})
					}),
					mirrorState === "loading" && /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
						className: "mirror-loading",
						id: "loading-msg",
						style: { display: "flex" },
						children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
							className: "mirror-loading-inner",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
									className: "loading-bars",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {}),
										/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {}),
										/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {}),
										/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {}),
										/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
									className: "loading-label",
									children: "SYNTHESIZING LOOK..."
								}),
								currentQuote && /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
									className: "fashion-quote-block",
									children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("p", {
										className: "fashion-quote-text",
										children: [
											"\"",
											currentQuote.quote,
											"\""
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
										className: "fashion-quote-author",
										children: currentQuote.author
									})]
								})
							]
						})
					}),
					mirrorState === "result" && /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
						className: "result-content",
						id: "result-content",
						style: { display: "flex" },
						children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
							className: "outfit-img-wrap",
							style: { position: "relative" },
							children: [
								!imageLoaded && !imageError && /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
									id: "img-spinner",
									style: {
										position: "absolute",
										inset: 0,
										background: "#f0f0f0",
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										justifyContent: "center",
										gap: "16px",
										zIndex: 10
									},
									children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
										className: "mirror-loading-inner",
										children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
											className: "loading-bars",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {}),
												/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {}),
												/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {}),
												/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {}),
												/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {})
											]
										}), currentQuote && /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
											className: "fashion-quote-block",
											children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("p", {
												className: "fashion-quote-text",
												children: [
													"\"",
													currentQuote.quote,
													"\""
												]
											}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
												className: "fashion-quote-author",
												children: currentQuote.author
											})]
										})]
									})
								}),
								imageError && /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
									style: {
										position: "absolute",
										inset: 0,
										background: "#f0f0f0",
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										justifyContent: "center",
										gap: "16px",
										zIndex: 10,
										padding: "20px"
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("p", {
										style: {
											fontFamily: "'Montserrat', sans-serif",
											fontSize: "0.68rem",
											fontWeight: 700,
											letterSpacing: "2px",
											color: "#c00",
											textAlign: "center",
											lineHeight: 1.8
										},
										children: [
											"AI CLOUD UTILITY BUSY",
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("br", {}),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {
												style: {
													fontWeight: 400,
													fontSize: "0.6rem",
													color: "#aaa",
													textTransform: "none"
												},
												children: "The network timed out. Please try again."
											})
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("button", {
										type: "button",
										onClick: () => {
											setImageError(false);
											setImageLoaded(false);
											setProxyUrl(`${proxyUrl.split("&t=")[0]}&t=${Date.now()}`);
										},
										style: {
											padding: "10px 22px",
											background: "#000",
											color: "#fff",
											border: "none",
											fontFamily: "'Montserrat', sans-serif",
											fontSize: "0.65rem",
											fontWeight: 700,
											letterSpacing: "2px",
											cursor: "pointer",
											textTransform: "uppercase",
											marginTop: "5px"
										},
										children: "↻ RETRY SEQUENCE"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("img", {
									ref: imgRef,
									src: proxyUrl,
									id: "outfit-img",
									alt: "AI Generated Outfit",
									style: {
										opacity: imageLoaded ? 1 : 0,
										transition: "opacity 0.7s ease"
									},
									onLoad: handleImageLoad,
									onError: handleImageError
								}),
								imageLoaded && /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("button", {
									type: "button",
									className: "img-download-btn",
									title: "Download look",
									onClick: (e) => {
										e.stopPropagation();
										downloadLook();
									},
									children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("svg", {
										width: "15",
										height: "15",
										viewBox: "0 0 24 24",
										fill: "none",
										stroke: "#000",
										strokeWidth: "2",
										strokeLinecap: "round",
										strokeLinejoin: "round",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("polyline", { points: "7 10 12 15 17 10" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("line", {
												x1: "12",
												y1: "15",
												x2: "12",
												y2: "3"
											})
										]
									})
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
							className: "result-details",
							children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
								className: "result-caption",
								id: "outfit-caption",
								style: {
									fontFamily: "'Cormorant Garamond', serif",
									fontSize: "1.25rem",
									fontStyle: "italic",
									color: "#222"
								},
								children: generatedCaption
							}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
								className: "result-chips",
								id: "outfit-chips",
								children: shopItems.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)(import_jsx_runtime$1.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
									className: "chips-section-label",
									style: {
										width: "100%",
										fontFamily: "'Montserrat', sans-serif",
										fontSize: "0.65rem",
										fontWeight: 700,
										letterSpacing: "3px",
										color: "#000",
										textTransform: "uppercase",
										margin: "20px 0 10px 0",
										borderTop: "1px solid #eee",
										paddingTop: "15px"
									},
									children: "✦ CLICK ITEM TO SHOP THE LOOK ✦"
								}), shopItems.map((itemTitle, idx) => /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("a", {
									className: "chip chip--shop",
									href: "javascript:void(0);",
									style: {
										display: "inline-block",
										background: "#000",
										color: "#fff",
										padding: "8px 14px",
										margin: "4px",
										fontSize: "0.7rem",
										fontWeight: 600,
										textTransform: "uppercase",
										letterSpacing: "1px",
										textDecoration: "none",
										border: "1px solid #000",
										transition: "all 0.3s ease"
									},
									onClick: () => handleChipShopClick(itemTitle),
									children: [
										"Shop ",
										itemTitle.trim(),
										" ↗"
									]
								}, idx))] })
							})]
						})]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
				className: "mirror-actions",
				id: "mirror-actions",
				style: {
					display: mirrorState === "result" ? "flex" : "none",
					flexDirection: "column",
					gap: "12px",
					width: "100%",
					maxWidth: "420px"
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
						style: { width: "100%" },
						children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("button", {
							type: "button",
							className: "action-btn action-btn--save",
							id: "save-btn",
							onClick: goToVirtualTryOn,
							style: { width: "100%" },
							children: "Try This Look On"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
						style: { width: "100%" },
						children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("button", {
							type: "button",
							className: "action-btn action-btn--shop",
							id: "shop-btn",
							disabled: isSavingWardrobe,
							onClick: syncToWardrobeGallery,
							style: { width: "100%" },
							children: ["\xA0 ", isSavingWardrobe ? "UPLOADING..." : "Add to Wardrobe Page"]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
						style: { width: "100%" },
						children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("button", {
							type: "button",
							className: "action-btn action-btn--shop",
							id: "shop-look-btn",
							disabled: isRedirectingShop,
							onClick: shopThisLook,
							style: { width: "100%" },
							children: isRedirectingShop ? "REDIRECTING..." : "Shop this Look"
						})
					})
				]
			})]
		})]
	})] });
}
var import_react, import_jsx_runtime$1;
var init_OutfitPage = __esmMin((() => {
	import_react = require_react();
	init_Layout();
	init_quotes();
	init_toast();
	import_jsx_runtime$1 = require_jsx_runtime();
}));
//#endregion
//#region client/src/outfit/main.jsx
var require_main = /* @__PURE__ */ __commonJSMin((() => {
	var import_client = require_client();
	init_OutfitPage();
	var import_jsx_runtime = require_jsx_runtime();
	var rootEl = document.getElementById("outfit-root");
	if (rootEl) (0, import_client.createRoot)(rootEl).render(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OutfitPage, {}));
}));
//#endregion
export default require_main();
