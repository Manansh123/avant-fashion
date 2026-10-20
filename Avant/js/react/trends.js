import { a as __esmMin, i as __commonJSMin, n as require_client, r as require_react, t as require_jsx_runtime } from "./shared-jsx-runtime.js";
import { n as init_Layout, t as Layout } from "./shared-Layout.js";
//#region client/src/trends/TrendsPage.jsx
function isLoggedIn() {
	return !!localStorage.getItem("avantUserName");
}
function getCurrentUserKey() {
	const user = localStorage.getItem("avantUserName");
	return user ? `avant_custom_trends_${user}` : `avant_guest_session`;
}
function getStorage() {
	return isLoggedIn() ? localStorage : sessionStorage;
}
function parseTipsToArray(rawText) {
	const lines = rawText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
	const tips = [];
	for (const line of lines) {
		if (/^\|[\s\-|]+\|$/.test(line)) continue;
		if (/^\d+[\.\)]\s+/.test(line)) {
			const tip = line.replace(/^\d+[\.\)]\s+/, "").replace(/\*\*/g, "").replace(/\*/g, "").trim();
			if (tip.length > 8) tips.push(tip);
			continue;
		}
		if (/^[\-\*•]\s+/.test(line)) {
			const tip = line.replace(/^[\-\*•]\s+/, "").replace(/\*\*/g, "").replace(/\*/g, "").trim();
			if (tip.length > 8) tips.push(tip);
		}
	}
	return tips;
}
function TrendsPage() {
	const [hiddenBuiltins, setHiddenBuiltins] = (0, import_react.useState)([]);
	const [customTrends, setCustomTrends] = (0, import_react.useState)([]);
	const [activeTrendKey, setActiveTrendKey] = (0, import_react.useState)(null);
	const [isUploadOpen, setIsUploadOpen] = (0, import_react.useState)(false);
	const [newTrendName, setNewTrendName] = (0, import_react.useState)("");
	const [newTrendFiles, setNewTrendFiles] = (0, import_react.useState)([]);
	const [aiAdvice, setAiAdvice] = (0, import_react.useState)(null);
	const fileInputRef = (0, import_react.useRef)(null);
	const aiSectionRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (!isLoggedIn()) {
			const SESSION_FLAG = "avant_session_alive";
			if (sessionStorage.getItem(SESSION_FLAG)) {
				const key = getCurrentUserKey();
				getStorage().removeItem(key);
			}
			sessionStorage.setItem(SESSION_FLAG, "true");
		}
		if (isLoggedIn()) {
			const hiddenKey = `avant_hidden_builtins_${localStorage.getItem("avantUserName")}`;
			const hidden = JSON.parse(localStorage.getItem(hiddenKey) || "[]");
			setHiddenBuiltins(hidden);
		}
		const saved = JSON.parse(getStorage().getItem(getCurrentUserKey()) || "[]");
		setCustomTrends(saved);
	}, []);
	const visibleBuiltins = BUILTIN_TRENDS.filter((t) => !hiddenBuiltins.includes(t.key));
	async function getAIAdvice(style) {
		setAiAdvice({
			style,
			loading: true,
			tips: [],
			error: null
		});
		setTimeout(() => {
			if (aiSectionRef.current) aiSectionRef.current.scrollIntoView({ behavior: "smooth" });
		}, 50);
		try {
			const data = await (await fetch("/api/trend-style-tips", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ style }),
				signal: AbortSignal.timeout(2e4)
			})).json();
			if (!data.success) throw new Error(data.message || "Trend tips failed");
			const tips = parseTipsToArray(data.text);
			if (tips.length >= 3) setAiAdvice({
				style,
				loading: false,
				tips,
				error: null
			});
			else throw new Error(`Only ${tips.length} tips returned`);
		} catch (err) {
			console.error("🚨 Trend tips failed:", err.message);
			setAiAdvice({
				style,
				loading: false,
				tips: [],
				error: "Our style desk is between appointments right now — give it another moment and try again."
			});
		}
	}
	function checkCloseZone(e) {
		const rect = e.currentTarget.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		const closeZoneRight = rect.width - 15;
		return x >= rect.width - 125 && x <= closeZoneRight && y >= 12 && y <= 50;
	}
	function deleteTrend(trendKey, isBuiltIn) {
		if (!window.confirm("Are you sure you want to delete this trend?")) return;
		if (isBuiltIn) {
			if (isLoggedIn()) {
				const hiddenKey = `avant_hidden_builtins_${localStorage.getItem("avantUserName")}`;
				const hidden = JSON.parse(localStorage.getItem(hiddenKey) || "[]");
				if (!hidden.includes(trendKey)) hidden.push(trendKey);
				localStorage.setItem(hiddenKey, JSON.stringify(hidden));
				setHiddenBuiltins([...hidden]);
			} else setHiddenBuiltins((prev) => [...prev, trendKey]);
		} else {
			const storage = getStorage();
			const storageKey = getCurrentUserKey();
			let trends = JSON.parse(storage.getItem(storageKey) || "[]");
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
			setActiveTrendKey(null);
			setAiAdvice(null);
			return;
		}
		setActiveTrendKey(trendKey);
		getAIAdvice(trendName);
	}
	function handleNewPost() {
		if (!newTrendName.trim() || newTrendFiles.length === 0) {
			alert("Enter name and select at least one image!");
			return;
		}
		const imagePromises = Array.from(newTrendFiles).map((file) => new Promise((resolve) => {
			const reader = new FileReader();
			reader.onload = (e) => resolve(e.target.result);
			reader.readAsDataURL(file);
		}));
		Promise.all(imagePromises).then((base64Images) => {
			const trendData = {
				name: newTrendName.trim(),
				key: newTrendName.toLowerCase().replace(/\s+/g, "") + "_" + Date.now(),
				mainImage: base64Images[0],
				imageUrl: base64Images[0],
				images: base64Images
			};
			const storage = getStorage();
			const key = getCurrentUserKey();
			const existing = JSON.parse(storage.getItem(key) || "[]");
			existing.push(trendData);
			storage.setItem(key, JSON.stringify(existing));
			setCustomTrends(existing);
			setIsUploadOpen(false);
			setNewTrendName("");
			setNewTrendFiles([]);
			if (fileInputRef.current) fileInputRef.current.value = "";
		});
	}
	const activeBuiltin = BUILTIN_TRENDS.find((b) => b.key === activeTrendKey);
	return /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)(Layout, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("main", {
			className: "trends-main",
			children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
				className: "container",
				children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("header", {
					className: "trends-intro",
					children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
						className: "editorial-label-dark-1",
						children: "01 / TREND ATLAS"
					}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("h1", {
						className: "matrix-heading",
						children: [
							"GENZ TREND ",
							/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("br", {}),
							/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", { children: "DISCOVERY" })
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
					className: "trends-matrix",
					id: "styleMatrix",
					children: [
						visibleBuiltins.map((item, index) => {
							const isActive = activeTrendKey === item.key;
							const isGallery = activeBuiltin && !isActive;
							let galleryThumb = null;
							if (isGallery && activeBuiltin) {
								const otherIdx = visibleBuiltins.filter((b) => b.key !== activeBuiltin.key).findIndex((b) => b.key === item.key);
								if (otherIdx >= 0 && activeBuiltin.archives[otherIdx]) galleryThumb = `assets/trends/${activeBuiltin.archives[otherIdx]}`;
							}
							return /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
								className: `matrix-item ${isActive ? "active" : ""} ${isGallery ? "is-gallery" : ""}`,
								"data-trend": item.key,
								onClick: (e) => handleCardClick(e, item.key, item.name, true),
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
										className: "matrix-img",
										children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("img", {
											src: item.img,
											alt: item.name
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
										className: "matrix-info",
										children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("h3", { children: item.name }), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", { children: "EXPLORE AI STYLIST" })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
										className: "trend-gallery-view",
										children: isGallery && galleryThumb && /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("img", {
											src: galleryThumb,
											className: "gallery-thumb-single",
											alt: "Gallery preview"
										})
									})
								]
							}, item.key);
						}),
						customTrends.map((trend) => {
							const isActive = activeTrendKey === trend.key;
							return /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
								className: `matrix-item custom-trend ${isActive ? "active" : ""}`,
								"data-trend": trend.key,
								onClick: (e) => handleCardClick(e, trend.key, trend.name, false),
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
										className: "matrix-img",
										children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("img", {
											src: trend.mainImage || trend.imageUrl,
											alt: trend.name
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
										className: "matrix-info",
										children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("h3", { children: trend.name }), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", { children: "EXPLORE AI STYLIST" })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", { className: "trend-gallery-view" })
								]
							}, trend.key);
						}),
						/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
							className: "matrix-item upload-card",
							onClick: () => setIsUploadOpen(true),
							children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
								className: "upload-inner",
								children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("img", {
									src: "assets/add-image.jpg",
									className: "upload-icon-img",
									alt: "Add trend"
								}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", { children: "ADD NEW TREND" })]
							})
						})
					]
				})]
			})
		}),
		aiAdvice && /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("section", {
			id: "ai-advice-section",
			ref: aiSectionRef,
			style: {
				margin: "40px auto",
				maxWidth: "900px",
				padding: "40px",
				border: "1px solid #000",
				background: "#fff",
				position: "relative"
			},
			children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {
				onClick: () => setAiAdvice(null),
				style: {
					position: "absolute",
					right: "20px",
					top: "10px",
					cursor: "pointer",
					fontSize: "2rem"
				},
				children: "×"
			}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
				id: "ai-response-box",
				style: {
					fontFamily: "'Montserrat', sans-serif",
					lineHeight: 1.8,
					fontSize: "1.1rem",
					color: "#000"
				},
				children: aiAdvice.loading ? /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
					style: {
						textAlert: "center",
						textAlign: "center",
						padding: "50px 20px"
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
						style: {
							fontFamily: "'Montserrat', sans-serif",
							fontSize: "0.68rem",
							letterSpacing: "5px",
							color: "#aaa",
							textTransform: "uppercase"
						},
						children: "✦ \xA0 Generating Style Intelligence \xA0 ✦"
					}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
						style: {
							fontFamily: "'Montserrat', sans-serif",
							fontSize: "0.65rem",
							color: "#ccc",
							marginTop: "8px",
							letterSpacing: "2px"
						},
						children: aiAdvice.style.toUpperCase()
					})]
				}) : aiAdvice.error ? /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
					style: {
						padding: "30px 40px",
						fontFamily: "'Montserrat', sans-serif"
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
						style: {
							fontSize: "0.7rem",
							letterSpacing: "2px",
							color: "#c00",
							textTransform: "uppercase",
							marginBottom: "12px"
						},
						children: "⚠ AI ERROR"
					}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
						style: {
							fontSize: "0.82rem",
							color: "#333",
							lineHeight: 1.8
						},
						children: aiAdvice.error
					})]
				}) : /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
					style: {
						padding: "35px 40px",
						background: "#fff"
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {
							style: {
								display: "inline-block",
								background: "#000",
								color: "#fff",
								fontFamily: "'Montserrat', sans-serif",
								fontSize: "0.58rem",
								letterSpacing: "3px",
								padding: "5px 14px",
								textTransform: "uppercase",
								marginBottom: "22px"
							},
							children: "✦ \xA0 AI GENERATED"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
							style: {
								fontFamily: "'Montserrat', sans-serif",
								fontSize: "0.6rem",
								fontWeight: 700,
								letterSpacing: "5px",
								color: "#aaa",
								textTransform: "uppercase",
								margin: "0 0 6px 0"
							},
							children: "STYLING GUIDE FOR"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("h1", {
							style: {
								fontFamily: "'Cormorant Garamond', serif",
								fontSize: "clamp(2.5rem, 5vw, 4.2rem)",
								fontWeight: 700,
								lineHeight: .88,
								letterSpacing: "-2px",
								color: "#000",
								margin: "0 0 22px 0"
							},
							children: aiAdvice.style
						}),
						/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", { style: {
							width: "45px",
							height: "3px",
							background: "#000",
							marginBottom: "8px"
						} }),
						aiAdvice.tips.map((tip, i) => /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
							style: {
								display: "flex",
								alignItems: "flex-start",
								gap: "20px",
								padding: "18px 0",
								borderBottom: "1px solid #ececec"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {
								style: {
									fontFamily: "'Cormorant Garamond', serif",
									fontSize: "2rem",
									fontWeight: 700,
									color: "#d0d0d0",
									lineHeight: 1,
									minWidth: "40px",
									flexShrink: 0
								},
								children: String(i + 1).padStart(2, "0")
							}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
								style: {
									fontFamily: "'Montserrat', sans-serif",
									fontSize: "0.88rem",
									fontWeight: 400,
									color: "#222",
									lineHeight: 1.8,
									margin: 0,
									paddingTop: "5px"
								},
								children: tip
							})]
						}, i))
					]
				})
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
			id: "uploadModal",
			className: "custom-modal",
			style: { display: isUploadOpen ? "flex" : "none" },
			onClick: (e) => {
				if (e.target.id === "uploadModal") setIsUploadOpen(false);
			},
			children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
				className: "modal-content",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {
						className: "close-btn",
						onClick: () => setIsUploadOpen(false),
						children: "×"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("h3", { children: "Add to Trend Matrix" }),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("input", {
						type: "text",
						placeholder: "Trend Name (e.g. Streetwear)",
						value: newTrendName,
						onChange: (e) => setNewTrendName(e.target.value)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("input", {
						type: "file",
						id: "fileInput",
						ref: fileInputRef,
						multiple: true,
						onChange: (e) => setNewTrendFiles(e.target.files)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("button", {
						className: "auth-submit-btn",
						id: "postTrendBtn",
						type: "button",
						onClick: handleNewPost,
						children: "POST TREND"
					})
				]
			})
		})
	] });
}
var import_react, import_jsx_runtime$1, BUILTIN_TRENDS;
var init_TrendsPage = __esmMin((() => {
	import_react = require_react();
	init_Layout();
	import_jsx_runtime$1 = require_jsx_runtime();
	BUILTIN_TRENDS = [
		{
			key: "grandpa",
			name: "Eclectic Grandpa",
			img: "assets/gp-main.jpg",
			archives: [
				"gp1.jpg",
				"gp2.jpg",
				"gp3.jpg",
				"gp4.jpg",
				"gp5.jpg"
			]
		},
		{
			key: "streetwear",
			name: "Streetwear",
			img: "assets/sl-main.jpg",
			archives: [
				"sl1.jpg",
				"sl2.jpg",
				"sl3.jpg",
				"sl4.jpg",
				"sl5.jpg"
			]
		},
		{
			key: "y2k",
			name: "Y2K Revival",
			img: "assets/y-main.jpg",
			archives: [
				"y1.jpg",
				"y2.jpg",
				"y3.jpg",
				"y4.jpg",
				"y5.jpg"
			]
		},
		{
			key: "oldmoney",
			name: "Old Money",
			img: "assets/om-main.jpg",
			archives: [
				"om1.jpg",
				"om2.jpg",
				"om3.jpg",
				"om4.jpg",
				"om5.jpg"
			]
		},
		{
			key: "academia",
			name: "Dark Academia",
			img: "assets/da-main.jpg",
			archives: [
				"da1.jpg",
				"da2.jpg",
				"da3.jpg",
				"da4.jpg",
				"da5.jpg"
			]
		},
		{
			key: "fluid",
			name: "Gender Fluid",
			img: "assets/gf-main.jpg",
			archives: [
				"gf1.jpg",
				"gf2.jpg",
				"gf3.jpg",
				"gf4.jpg",
				"gf5.jpg"
			]
		}
	];
}));
//#endregion
//#region client/src/trends/main.jsx
var require_main = /* @__PURE__ */ __commonJSMin((() => {
	var import_client = require_client();
	init_TrendsPage();
	var import_jsx_runtime = require_jsx_runtime();
	var rootEl = document.getElementById("trends-root");
	if (rootEl) (0, import_client.createRoot)(rootEl).render(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendsPage, {}));
}));
//#endregion
export default require_main();
