import { a as __esmMin, i as __commonJSMin, n as require_client, r as require_react, t as require_jsx_runtime } from "./shared-jsx-runtime.js";
import { n as init_Layout, t as Layout } from "./shared-Layout.js";
//#region client/src/tryon/TryonPage.jsx
function isLoggedIn() {
	return !!localStorage.getItem("avantUserName");
}
function getUsername() {
	return localStorage.getItem("avantUserName") || null;
}
function TryonPage() {
	const [userPhotoFile, setUserPhotoFile] = (0, import_react.useState)(null);
	const [userPhotoUrl, setUserPhotoUrl] = (0, import_react.useState)("");
	const [garmentFile, setGarmentFile] = (0, import_react.useState)(null);
	const [garmentPhotoUrl, setGarmentPhotoUrl] = (0, import_react.useState)("");
	const [selectedLookUrl, setSelectedLookUrl] = (0, import_react.useState)(null);
	const [savedLooks, setSavedLooks] = (0, import_react.useState)([]);
	const [isLoadingLooks, setIsLoadingLooks] = (0, import_react.useState)(true);
	const [saveToWardrobeChecked, setSaveToWardrobeChecked] = (0, import_react.useState)(false);
	const [autoSavedItemId, setAutoSavedItemId] = (0, import_react.useState)(null);
	const [isGenerating, setIsGenerating] = (0, import_react.useState)(false);
	const [quoteIndex, setQuoteIndex] = (0, import_react.useState)(0);
	const [tryonResultUrl, setTryonResultUrl] = (0, import_react.useState)(null);
	const [tryonError, setTryonError] = (0, import_react.useState)(null);
	const [isDownloading, setIsDownloading] = (0, import_react.useState)(false);
	const photoInputRef = (0, import_react.useRef)(null);
	const garmentInputRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		async function loadLooks() {
			let items = [];
			try {
				if (isLoggedIn()) {
					const data = await (await fetch("/api/my-wardrobe", { headers: { "x-username": getUsername() } })).json();
					if (data.success) items = data.items.map((i) => i.imageUrl);
				} else items = JSON.parse(localStorage.getItem("avant_wardrobe_guest") || "[]").map((i) => i.src).filter(Boolean);
			} catch (err) {
				console.error("Failed to load looks:", err);
			}
			setSavedLooks(items);
			setIsLoadingLooks(false);
		}
		loadLooks();
		const bridged = localStorage.getItem("avant_tryon_garment_bridge");
		if (bridged) {
			localStorage.removeItem("avant_tryon_garment_bridge");
			try {
				const { dataUrl } = JSON.parse(bridged);
				fetch(dataUrl).then((r) => r.blob()).then((blob) => {
					const file = new File([blob], "avant-generated-look.jpg", { type: blob.type || "image/jpeg" });
					setGarmentFile(file);
					setGarmentPhotoUrl(URL.createObjectURL(file));
					setSelectedLookUrl(null);
				}).catch((err) => console.warn("Failed to load bridged garment:", err));
			} catch (err) {
				console.warn("Failed to parse bridged garment:", err);
			}
		}
	}, []);
	(0, import_react.useEffect)(() => {
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
		setUserPhotoUrl("");
		if (photoInputRef.current) photoInputRef.current.value = "";
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
		setGarmentPhotoUrl("");
		setSaveToWardrobeChecked(false);
		if (garmentInputRef.current) garmentInputRef.current.value = "";
	}
	async function handleSaveCheckboxChange(checked) {
		setSaveToWardrobeChecked(checked);
		if (checked && garmentFile) try {
			const fd = new FormData();
			fd.append("image", garmentFile);
			if (isLoggedIn()) fd.append("userName", getUsername());
			const data = await (await fetch("/api/upload-wardrobe", {
				method: "POST",
				body: fd
			})).json();
			if (data.success) {
				setAutoSavedItemId(data.itemId || null);
				setSavedLooks((prev) => [data.imageUrl, ...prev]);
			}
		} catch (err) {
			console.warn("Could not save garment to wardrobe:", err);
		}
		else if (!checked && autoSavedItemId) {
			if (isLoggedIn()) try {
				await fetch(`/api/my-wardrobe/${autoSavedItemId}`, {
					method: "DELETE",
					headers: { "x-username": getUsername() }
				});
			} catch (err) {
				console.warn("Could not remove saved garment:", err);
			}
			setAutoSavedItemId(null);
		}
	}
	function selectLook(url) {
		setGarmentFile(null);
		setGarmentPhotoUrl("");
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
		const timeoutId = setTimeout(() => controller.abort(), 1e5);
		try {
			const fd = new FormData();
			fd.append("photo", userPhotoFile);
			if (garmentFile) fd.append("garmentPhoto", garmentFile);
			else fd.append("lookImageUrl", selectedLookUrl);
			const res = await fetch("/api/virtual-tryon", {
				method: "POST",
				body: fd,
				signal: controller.signal
			});
			clearTimeout(timeoutId);
			if (!(res.headers.get("content-type") || "").includes("application/json")) throw new Error(`Server error (status ${res.status})`);
			const data = await res.json();
			if (!data.success) throw new Error(data.message || "Try-on failed");
			setTryonResultUrl(data.imageUrl);
		} catch (err) {
			console.error("Try-on error:", err);
			setTryonError(err.message || "Try-on request failed. Please try again.");
		} finally {
			clearTimeout(timeoutId);
			setIsGenerating(false);
		}
	}
	async function downloadResult() {
		if (!tryonResultUrl) return;
		setIsDownloading(true);
		try {
			const blob = await (await fetch(tryonResultUrl)).blob();
			const blobUrl = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = blobUrl;
			a.download = "avant-tryon.jpg";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			setTimeout(() => URL.revokeObjectURL(blobUrl), 2e3);
		} catch (err) {
			console.error("Download failed, opening tab:", err);
			window.open(tryonResultUrl, "_blank");
		} finally {
			setIsDownloading(false);
		}
	}
	function resetStage() {
		setTryonResultUrl(null);
		setTryonError(null);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)(Layout, { children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("main", {
		className: "tryon-page",
		children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("header", {
			className: "hero-overlay tryon-hero",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
					className: "editorial-label-ward",
					children: "05 / VIRTUAL FITTING ROOM"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("h1", {
					className: "shop-title",
					children: ["TRY\xA0IT\xA0", /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", { children: "ON" })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
					className: "shop-quote",
					children: "Upload your photo, pick a saved look or your own garment photo, and let AI show you exactly how it fits."
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
			className: "tryon-grid",
			children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
				className: "tryon-controls",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("section", {
						className: "tryon-panel",
						children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
							className: "tryon-panel-label",
							children: "01 — YOUR PHOTO"
						}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
							className: `tryon-upload-zone ${userPhotoUrl ? "has-image" : ""}`,
							id: "upload-zone",
							onClick: () => {
								if (!userPhotoUrl && photoInputRef.current) photoInputRef.current.click();
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("input", {
								type: "file",
								id: "user-photo-input",
								accept: "image/*",
								hidden: true,
								ref: photoInputRef,
								onChange: handleUserPhotoChange
							}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
								className: "tryon-upload-inner",
								id: "upload-inner",
								children: userPhotoUrl ? /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)(import_jsx_runtime$1.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("img", {
									src: userPhotoUrl,
									className: "tryon-upload-preview",
									alt: "Your photo"
								}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("button", {
									type: "button",
									className: "tryon-upload-remove",
									id: "remove-photo-btn",
									onClick: (e) => {
										e.stopPropagation();
										removeUserPhoto();
									},
									children: "×"
								})] }) : /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)(import_jsx_runtime$1.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("svg", {
									width: "26",
									height: "26",
									viewBox: "0 0 24 24",
									fill: "none",
									stroke: "#000",
									strokeWidth: "1.5",
									strokeLinecap: "round",
									strokeLinejoin: "round",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
										/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("polyline", { points: "17 8 12 3 7 8" }),
										/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("line", {
											x1: "12",
											y1: "3",
											x2: "12",
											y2: "15"
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("p", { children: [
									"Upload a full-body photo",
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("br", {}),
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", { children: "front-facing, plain background works best" })
								] })] })
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("section", {
						className: "tryon-panel",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
								className: "tryon-panel-label",
								children: "02 — YOUR OUTFIT"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
								className: `tryon-upload-zone ${garmentPhotoUrl ? "has-image" : ""}`,
								id: "garment-upload-zone",
								onClick: () => {
									if (!garmentPhotoUrl && garmentInputRef.current) garmentInputRef.current.click();
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("input", {
									type: "file",
									id: "garment-photo-input",
									accept: "image/*",
									hidden: true,
									ref: garmentInputRef,
									onChange: handleGarmentPhotoChange
								}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
									className: "tryon-upload-inner",
									id: "garment-upload-inner",
									children: garmentPhotoUrl ? /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)(import_jsx_runtime$1.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("img", {
										src: garmentPhotoUrl,
										className: "tryon-upload-preview",
										alt: "Your garment"
									}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("button", {
										type: "button",
										className: "tryon-upload-remove",
										id: "remove-garment-btn",
										onClick: (e) => {
											e.stopPropagation();
											removeGarmentPhoto();
										},
										children: "×"
									})] }) : /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)(import_jsx_runtime$1.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("svg", {
										width: "26",
										height: "26",
										viewBox: "0 0 24 24",
										fill: "none",
										stroke: "#000",
										strokeWidth: "1.5",
										strokeLinecap: "round",
										strokeLinejoin: "round",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("polyline", { points: "17 8 12 3 7 8" }),
											/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("line", {
												x1: "12",
												y1: "3",
												x2: "12",
												y2: "15"
											})
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("p", { children: [
										"Upload a garment photo",
										/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("br", {}),
										/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", { children: "clean product shot works best" })
									] })] })
								})]
							}),
							garmentPhotoUrl && /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
								className: "tryon-save-look-wrap",
								id: "save-look-wrap",
								style: { display: "flex" },
								children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("label", {
									className: "tryon-save-look-label",
									children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("input", {
										type: "checkbox",
										id: "save-look-checkbox",
										checked: saveToWardrobeChecked,
										onChange: (e) => handleSaveCheckboxChange(e.target.checked)
									}), "Save this look to my Wardrobe"]
								})
							}),
							savedLooks.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
								className: "tryon-or-divider",
								children: "OR SELECT A SAVED LOOK"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
								className: "tryon-looks-grid",
								id: "looks-grid",
								children: isLoadingLooks ? /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
									className: "tryon-empty-msg",
									children: "Loading your saved looks…"
								}) : savedLooks.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("p", {
									className: "tryon-empty-msg",
									children: [
										"No saved looks yet — add some in your ",
										/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("a", {
											href: "wardrobe.html",
											children: "Wardrobe"
										}),
										", or just upload a garment photo above."
									]
								}) : savedLooks.map((url, idx) => /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
									className: `tryon-look-item ${selectedLookUrl === url ? "selected" : ""}`,
									onClick: () => selectLook(url),
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("img", {
											src: url,
											alt: "Saved look"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {
											className: "tryon-look-check",
											children: "✓"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("button", {
											type: "button",
											className: "tryon-look-remove",
											title: "Remove",
											onClick: (e) => removeLookItem(e, url),
											children: "×"
										})
									]
								}, idx))
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("button", {
						type: "button",
						className: "tryon-generate-btn",
						id: "generate-btn",
						disabled: !canGenerate || isGenerating,
						onClick: handleGenerateTryon,
						children: isGenerating ? "Fitting..." : "Try It On"
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
				className: "tryon-stage-wrap",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
						className: "tryon-panel-label",
						children: "03 — YOUR FIT"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
						className: "tryon-stage",
						id: "tryon-stage",
						children: isGenerating ? /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
							className: "tryon-loading-inner",
							children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
								className: "loading-bars",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {}),
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {}),
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {}),
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {}),
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
								className: "loading-label",
								id: "tryon-loading-quote",
								children: LOADING_QUOTES[quoteIndex]
							})]
						}) : tryonResultUrl ? /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("img", {
							src: tryonResultUrl,
							alt: "Your try-on result"
						}) : tryonError ? /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
							className: "tryon-stage-placeholder",
							style: { color: "#c00" },
							children: tryonError
						}) : /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
							className: "tryon-stage-placeholder",
							id: "stage-placeholder",
							children: "Upload your photo and pick a look to begin"
						})
					}),
					tryonResultUrl && /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
						className: "tryon-actions",
						id: "tryon-actions",
						style: { display: "flex" },
						children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("button", {
							type: "button",
							className: "action-btn action-btn--save",
							id: "tryon-download-btn",
							disabled: isDownloading,
							onClick: downloadResult,
							children: isDownloading ? "Downloading..." : "Download This Look"
						}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("button", {
							type: "button",
							className: "action-btn action-btn--shop",
							id: "tryon-reset-btn",
							onClick: resetStage,
							children: "Try Another"
						})]
					})
				]
			})]
		})]
	}) });
}
var import_react, import_jsx_runtime$1, LOADING_QUOTES;
var init_TryonPage = __esmMin((() => {
	import_react = require_react();
	init_Layout();
	import_jsx_runtime$1 = require_jsx_runtime();
	LOADING_QUOTES = [
		"Draping the fabric just right...",
		"Consulting the style archives...",
		"Matching light and shadow to the fit...",
		"Tailoring every seam to your shape...",
		"Almost runway-ready...",
		"Fine-tuning the silhouette..."
	];
}));
//#endregion
//#region client/src/tryon/main.jsx
var require_main = /* @__PURE__ */ __commonJSMin((() => {
	var import_client = require_client();
	init_TryonPage();
	var import_jsx_runtime = require_jsx_runtime();
	var rootEl = document.getElementById("tryon-root");
	if (rootEl) (0, import_client.createRoot)(rootEl).render(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TryonPage, {}));
}));
//#endregion
export default require_main();
