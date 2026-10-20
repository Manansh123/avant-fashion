import { a as __esmMin, i as __commonJSMin, n as require_client, r as require_react, t as require_jsx_runtime } from "./shared-jsx-runtime.js";
import { n as init_Layout, t as Layout } from "./shared-Layout.js";
import { n as init_quotes, t as getRandomFashionQuote } from "./shared-quotes.js";
//#region client/src/shop/ShopPage.jsx
function starString(rating) {
	const full = Math.round(rating);
	return "★".repeat(full) + "☆".repeat(5 - full);
}
function parsePrice(priceStr) {
	if (!priceStr) return null;
	const num = parseFloat(String(priceStr).replace(/[^\d.]/g, ""));
	return isNaN(num) ? null : num;
}
function ShopPage() {
	const [searchQuery, setSearchQuery] = (0, import_react.useState)("");
	const [syncPills, setSyncPills] = (0, import_react.useState)([]);
	const [isLoading, setIsLoading] = (0, import_react.useState)(false);
	const [currentQuote, setCurrentQuote] = (0, import_react.useState)(() => getRandomFashionQuote());
	const [searchResults, setSearchResults] = (0, import_react.useState)(null);
	const searchTokenRef = (0, import_react.useRef)(0);
	const chartInstanceRef = (0, import_react.useRef)(null);
	const resultsRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const raw = localStorage.getItem("avant_shopping_sync");
		if (!raw) return;
		try {
			const items = JSON.parse(raw);
			if (!Array.isArray(items) || items.length === 0) return;
			localStorage.removeItem("avant_shopping_sync");
			const cleanItems = items.map((i) => i && i.trim()).filter(Boolean);
			setSyncPills(cleanItems);
			if (cleanItems.length === 1) {
				setSearchQuery(cleanItems[0]);
				setTimeout(() => doSearch(cleanItems[0]), 400);
			} else if (cleanItems.length > 1) {
				setSearchQuery(cleanItems.join(", "));
				setTimeout(() => doMultiSearch(cleanItems), 400);
			}
		} catch (err) {
			console.warn("Could not parse avant_shopping_sync:", err.message);
			localStorage.removeItem("avant_shopping_sync");
		}
	}, []);
	async function fetchComparison(q) {
		try {
			const data = await (await fetch(`/api/shop-compare?q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(45e3) })).json();
			if (!data.success) throw new Error(data.message);
			return data.results;
		} catch (err) {
			console.warn("Comparison fetch failed:", err.message);
			return null;
		}
	}
	async function doSearch(queryOverride) {
		const query = (queryOverride || searchQuery).trim();
		if (!query) {
			alert("Please enter a style or item to search.");
			return;
		}
		if (queryOverride) setSearchQuery(queryOverride);
		const myToken = ++searchTokenRef.current;
		setIsLoading(true);
		setCurrentQuote(getRandomFashionQuote());
		setSearchResults(null);
		resultsRef.current?.scrollIntoView({
			behavior: "smooth",
			block: "start"
		});
		const data = await fetchComparison(query);
		if (myToken !== searchTokenRef.current) return;
		setIsLoading(false);
		setSearchResults([{
			item: query,
			data
		}]);
		resultsRef.current?.scrollIntoView({
			behavior: "smooth",
			block: "start"
		});
	}
	async function doMultiSearch(itemList) {
		const myToken = ++searchTokenRef.current;
		setIsLoading(true);
		setCurrentQuote(getRandomFashionQuote());
		setSearchResults(null);
		resultsRef.current?.scrollIntoView({
			behavior: "smooth",
			block: "start"
		});
		const allResults = await Promise.all(itemList.map(async (item) => ({
			item,
			data: await fetchComparison(item)
		})));
		if (myToken !== searchTokenRef.current) return;
		setIsLoading(false);
		setSearchResults(allResults);
		resultsRef.current?.scrollIntoView({
			behavior: "smooth",
			block: "start"
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)(Layout, { children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("main", {
		className: "shop-page",
		children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("header", {
			className: "shop-hero",
			children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
				className: "hero-overlay",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
						className: "editorial-label-ward",
						children: "04 / CURATED SELECTIONS"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("h1", {
						className: "shop-title",
						children: ["SHOP ", /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", { children: "YOUR LOOK" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("blockquote", {
						className: "shop-quote",
						children: "\"Fashion is the armor to survive the reality of everyday life.\""
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
						className: "search-container",
						children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("input", {
							type: "text",
							id: "shop-search",
							placeholder: "Search for products (e.g. Linen Shirt)...",
							value: searchQuery,
							onChange: (e) => setSearchQuery(e.target.value),
							onKeyDown: (e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									doSearch();
								}
							}
						}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("button", {
							id: "search-btn",
							type: "button",
							onClick: () => doSearch(),
							children: "SEARCH"
						})]
					})
				]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("section", {
			className: "results-section",
			ref: resultsRef,
			children: [syncPills.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
				id: "outfit-sync-banner",
				style: {
					padding: "30px 5%",
					background: "#f9f9f9",
					borderBottom: "1px solid #eee",
					display: "flex",
					flexDirection: "column",
					gap: "14px"
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
					style: {
						fontFamily: "'Montserrat', sans-serif",
						fontSize: "0.65rem",
						fontWeight: 700,
						letterSpacing: "4px",
						color: "#aaa",
						textTransform: "uppercase",
						margin: 0
					},
					children: "✦ \xA0 FROM YOUR OUTFIT LAB"
				}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
					id: "sync-pills",
					style: {
						display: "flex",
						flexWrap: "wrap",
						gap: "10px"
					},
					children: syncPills.map((pillItem, idx) => /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)(SyncPill, {
						label: pillItem,
						onClick: () => doSearch(pillItem)
					}, idx))
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
				className: "results-grid",
				id: "shop-results",
				children: [
					isLoading && /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
						className: "shop-loading-state",
						style: { gridColumn: "1/-1" },
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
					}),
					!isLoading && !searchResults && /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
						className: "initial-msg",
						children: "Enter a product name to begin your curation."
					}),
					!isLoading && searchResults && /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)(import_jsx_runtime$1.Fragment, { children: searchResults.map(({ item, data }, secIdx) => /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
						style: { display: "contents" },
						children: [searchResults.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
							style: {
								gridColumn: "1/-1",
								fontFamily: "'Montserrat', sans-serif",
								fontSize: "0.72rem",
								fontWeight: 700,
								letterSpacing: "3px",
								textTransform: "uppercase",
								color: "#000",
								borderTop: "1px solid #eee",
								paddingTop: "22px",
								marginTop: "10px"
							},
							children: [
								"✦ ",
								item,
								" ✦"
							]
						}), data ? /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)(RealComparisonBlock, {
							query: item,
							realData: data,
							chartRef: chartInstanceRef
						}) : /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)(FallbackLinksBlock, { query: item })]
					}, secIdx)) })
				]
			})]
		})]
	}) });
}
function SyncPill({ label, onClick }) {
	const [hovered, setHovered] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("button", {
		type: "button",
		style: {
			padding: "8px 18px",
			border: "1.5px solid #000",
			background: hovered ? "#000" : "#fff",
			color: hovered ? "#fff" : "#000",
			fontFamily: "'Montserrat', sans-serif",
			fontSize: "0.7rem",
			fontWeight: 700,
			letterSpacing: "1.5px",
			textTransform: "uppercase",
			cursor: "pointer",
			transition: "all 0.25s ease"
		},
		onMouseEnter: () => setHovered(true),
		onMouseLeave: () => setHovered(false),
		onClick,
		children: label
	});
}
function RealComparisonBlock({ query, realData }) {
	const available = realData.filter((r) => r.available && r.rating);
	const avgRating = available.length ? available.reduce((sum, r) => sum + r.rating, 0) / available.length : 0;
	const MIN_VOTES = 50;
	function weightedScore(r) {
		const v = r.reviews || 0;
		const R = r.rating;
		return v / (v + MIN_VOTES) * R + MIN_VOTES / (v + MIN_VOTES) * avgRating;
	}
	const best = available.length ? available.reduce((a, b) => weightedScore(b) > weightedScore(a) ? b : a) : null;
	return /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)(import_jsx_runtime$1.Fragment, { children: [
		realData.map((r, idx) => {
			if (!r.available) return null;
			const platform = PLATFORM_DB[idx];
			const isBest = best && r.site === best.site;
			return /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
				className: "product-box",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {
						className: "platform-tag",
						children: platform.name.toUpperCase()
					}),
					isBest && /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {
						className: "best-rated-badge",
						title: "Weighted by both rating AND review count — not just the highest star number",
						children: "⭐ TOP RATED"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("img", {
						src: r.thumbnail || PLATFORM_IMGS[idx % PLATFORM_IMGS.length],
						alt: r.title || query,
						loading: "lazy"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("h4", { children: (r.title || query).toUpperCase() }),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
						className: "real-stats-row",
						children: [r.price && /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {
							className: "stat-price",
							children: r.price
						}), r.rating && /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)(import_jsx_runtime$1.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {
							className: "stat-stars",
							children: starString(r.rating)
						}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {
							className: "stat-rating-num",
							children: r.rating
						})] })]
					}),
					r.reviews && /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("p", {
						className: "stat-reviews",
						children: [r.reviews.toLocaleString("en-IN"), " reviews"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("p", {
						className: "real-data-note",
						children: ["Confirm stock, size & delivery on ", platform.name]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("a", {
						href: r.link || platform.getUrl(query),
						target: "_blank",
						rel: "noopener noreferrer",
						className: "shop-now-btn",
						children: [
							"VIEW ON ",
							platform.name.toUpperCase(),
							" ↗"
						]
					})
				]
			}, idx);
		}),
		/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)(RadarChartSection, { realData }),
		/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)(ReviewsSection, { realData })
	] });
}
function RadarChartSection({ realData }) {
	const canvasRef = (0, import_react.useRef)(null);
	const chartRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const withData = realData.map((r, idx) => ({
			...r,
			name: PLATFORM_DB[idx].name
		})).filter((r) => r.available && (r.rating || r.reviews || r.price));
		if (withData.length < 2 || typeof window.Chart === "undefined") return;
		const havePrice = withData.filter((r) => r.price).length >= 2;
		const haveRating = withData.filter((r) => r.rating).length >= 2;
		const haveReviews = withData.filter((r) => r.reviews).length >= 2;
		const axes = [];
		if (havePrice) axes.push("price");
		if (haveRating) axes.push("rating");
		if (haveReviews) axes.push("reviews");
		if (axes.length < 2) return;
		const prices = withData.map((r) => parsePrice(r.price)).filter(Boolean);
		const minP = Math.min(...prices);
		const maxP = Math.max(...prices);
		const maxReviews = Math.max(...withData.map((r) => r.reviews || 0), 1);
		const axisLabels = axes.map((a) => a === "price" ? "Price Value" : a === "rating" ? "Rating" : "Popularity");
		const datasets = withData.map((r) => {
			const colors = PLATFORM_COLORS[r.name] || {
				line: "#333",
				fill: "rgba(51,51,51,0.12)"
			};
			const values = axes.map((a) => {
				if (a === "price") {
					const p = parsePrice(r.price);
					if (!p || maxP === minP) return 50;
					return Math.round(100 * (maxP - p) / (maxP - minP));
				}
				if (a === "rating") return r.rating ? Math.round(r.rating / 5 * 100) : 0;
				if (a === "reviews") return Math.round((r.reviews || 0) / maxReviews * 100);
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
		const ctx = canvas.getContext("2d");
		chartRef.current = new window.Chart(ctx, {
			type: "radar",
			data: {
				labels: axisLabels,
				datasets
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				font: { family: "Montserrat" },
				plugins: { legend: {
					position: "bottom",
					labels: {
						font: {
							family: "Montserrat",
							size: 11
						},
						color: "#333",
						boxWidth: 12
					}
				} },
				scales: { r: {
					min: 0,
					max: 100,
					ticks: {
						display: true,
						stepSize: 20,
						backdropColor: "transparent",
						color: "#bbb",
						font: { size: 10 },
						callback: (val) => val === 0 ? "" : String(val / 20)
					},
					grid: { color: "#e5e5e5" },
					angleLines: { color: "#e5e5e5" },
					pointLabels: {
						font: {
							family: "Montserrat",
							size: 12,
							weight: "700"
						},
						color: "#111"
					}
				} }
			}
		});
		return () => {
			if (chartRef.current) chartRef.current.destroy();
		};
	}, [realData]);
	if (realData.filter((r) => r.available && (r.rating || r.reviews || r.price)).length < 2) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
		className: "compare-chart-wrap",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
				className: "compare-chart-label",
				children: "✦ PLATFORM COMPARISON — REAL DATA ✦"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
				className: "compare-chart-canvas-box",
				children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("canvas", {
					ref: canvasRef,
					id: "shop-compare-chart"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
				className: "compare-chart-footnote",
				children: "Scale: 1 (worst) to 5 (best) on each axis — outer edge = better. Price Value: cheaper scores higher. Popularity: relative review volume among matched platforms."
			})
		]
	});
}
function ReviewsSection({ realData }) {
	const withReviews = realData.map((r, idx) => ({
		...r,
		name: PLATFORM_DB[idx].name
	})).filter((r) => r.available && (r.snippets?.length || r.rating));
	const [activeTab, setActiveTab] = (0, import_react.useState)(0);
	if (withReviews.length === 0) return null;
	const currentRev = withReviews[activeTab] || withReviews[0];
	const colors = PLATFORM_COLORS[currentRev.name] || { line: "#333" };
	return /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
		className: "reviews-panel",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
				className: "compare-chart-label",
				children: "✦ CUSTOMER SENTIMENT ✦"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
				className: "reviews-tabs",
				children: withReviews.map((r, i) => {
					const c = PLATFORM_COLORS[r.name] || { line: "#333" };
					return /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("button", {
						type: "button",
						className: `reviews-tab ${activeTab === i ? "active" : ""}`,
						style: { "--tab-color": c.line },
						onClick: () => setActiveTab(i),
						children: r.name
					}, i);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
				className: "reviews-panels",
				children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
					className: "reviews-panel-content active",
					children: [currentRev.rating ? /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
						className: "rp-rating-block",
						children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {
							className: "rp-rating-num",
							children: currentRev.rating
						}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
							className: "rp-rating-side",
							children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {
								className: "rp-stars",
								style: { color: colors.line },
								children: starString(currentRev.rating)
							}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {
								className: "rp-review-count",
								children: currentRev.reviews ? currentRev.reviews.toLocaleString("en-IN") + " ratings" : "Rating on " + currentRev.name
							})]
						})]
					}) : /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
						className: "rp-no-rating",
						children: "No rating data available for this listing yet."
					}), currentRev.snippets?.length ? /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
						className: "rp-snippets",
						children: currentRev.snippets.map((s, idx) => /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
							className: "rp-snippet-card",
							children: [
								s.rating && /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {
									className: "rp-snippet-stars",
									style: { color: colors.line },
									children: starString(s.rating)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("p", {
									className: "rp-snippet-text",
									children: [
										"\"",
										s.text,
										"\""
									]
								}),
								s.source && /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("span", {
									className: "rp-snippet-source",
									children: ["— via ", s.source]
								})
							]
						}, idx))
					}) : /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("p", {
						className: "rp-no-snippets",
						children: [
							"No individual review text surfaced by Google for this listing — see full reviews on ",
							currentRev.name,
							"."
						]
					})]
				})
			})
		]
	});
}
function FallbackLinksBlock({ query }) {
	return /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)(import_jsx_runtime$1.Fragment, { children: PLATFORM_DB.map((platform, idx) => {
		const imgSrc = PLATFORM_IMGS[idx % PLATFORM_IMGS.length] || "assets/1.jpeg";
		const shopLink = platform.getUrl(query);
		return /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
			className: "product-box",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {
					className: "platform-tag",
					children: platform.name.toUpperCase()
				}),
				/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("img", {
					src: imgSrc,
					alt: `${query} on ${platform.name}`,
					loading: "lazy"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("h4", { children: query.toUpperCase() }),
				/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("p", {
					className: "real-data-note",
					children: ["Real price, reviews, sizing & stock — see on ", platform.name]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("a", {
					href: shopLink,
					target: "_blank",
					rel: "noopener noreferrer",
					className: "shop-now-btn",
					children: [
						"VIEW ON ",
						platform.name.toUpperCase(),
						" ↗"
					]
				})
			]
		}, idx);
	}) });
}
var import_react, import_jsx_runtime$1, PLATFORM_DB, PLATFORM_IMGS, PLATFORM_COLORS;
var init_ShopPage = __esmMin((() => {
	import_react = require_react();
	init_Layout();
	init_quotes();
	import_jsx_runtime$1 = require_jsx_runtime();
	PLATFORM_DB = [
		{
			name: "Amazon",
			color: "#FF9900",
			getUrl: (q) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}`
		},
		{
			name: "Flipkart",
			color: "#2874F0",
			getUrl: (q) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}`
		},
		{
			name: "Myntra",
			color: "#FF3F6C",
			getUrl: (q) => `https://www.myntra.com/${encodeURIComponent(q)}`
		},
		{
			name: "Ajio",
			color: "#E31837",
			getUrl: (q) => `https://www.ajio.com/search/?text=${encodeURIComponent(q)}`
		},
		{
			name: "Nykaa Fashion",
			color: "#FC2779",
			getUrl: (q) => `https://www.nykaafashion.com/catalogsearch/result/?q=${encodeURIComponent(q)}`
		},
		{
			name: "TataCliq",
			color: "#E71C24",
			getUrl: (q) => `https://www.tatacliq.com/search/?searchCategory=all&text=${encodeURIComponent(q)}`
		},
		{
			name: "Snapdeal",
			color: "#E40046",
			getUrl: (q) => `https://www.snapdeal.com/search?keyword=${encodeURIComponent(q)}`
		},
		{
			name: "Meesho",
			color: "#9F2089",
			getUrl: (q) => `https://www.meesho.com/search?q=${encodeURIComponent(q)}`
		}
	];
	PLATFORM_IMGS = [
		"assets/1.jpeg",
		"assets/2.jpeg",
		"assets/3.jpeg",
		"assets/4.jpeg"
	];
	PLATFORM_COLORS = {
		Amazon: {
			line: "#FF9900",
			fill: "rgba(255,153,0,0.15)"
		},
		Flipkart: {
			line: "#2874F0",
			fill: "rgba(40,116,240,0.15)"
		},
		Myntra: {
			line: "#FF3F6C",
			fill: "rgba(255,63,108,0.15)"
		},
		Ajio: {
			line: "#111111",
			fill: "rgba(17,17,17,0.10)"
		},
		"Nykaa Fashion": {
			line: "#FC2779",
			fill: "rgba(252,39,121,0.15)"
		},
		TataCliq: {
			line: "#E71C24",
			fill: "rgba(231,28,36,0.15)"
		},
		Snapdeal: {
			line: "#E40046",
			fill: "rgba(228,0,70,0.15)"
		},
		Meesho: {
			line: "#9F2089",
			fill: "rgba(159,32,137,0.15)"
		}
	};
}));
//#endregion
//#region client/src/shop/main.jsx
var require_main = /* @__PURE__ */ __commonJSMin((() => {
	var import_client = require_client();
	init_ShopPage();
	var import_jsx_runtime = require_jsx_runtime();
	var rootEl = document.getElementById("shop-root");
	if (rootEl) (0, import_client.createRoot)(rootEl).render(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShopPage, {}));
}));
//#endregion
export default require_main();
