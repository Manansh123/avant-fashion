import { a as __esmMin, i as __commonJSMin, n as require_client, r as require_react, t as require_jsx_runtime } from "./shared-jsx-runtime.js";
import { n as init_Layout, t as Layout } from "./shared-Layout.js";
//#region client/src/home/HomePage.jsx
function StatItem({ target, suffix, label }) {
	const [count, setCount] = (0, import_react.useState)(0);
	const statRef = (0, import_react.useRef)(null);
	const hasAnimatedRef = (0, import_react.useRef)(false);
	(0, import_react.useEffect)(() => {
		const el = statRef.current;
		if (!el) return;
		const observer = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting && !hasAnimatedRef.current) {
					hasAnimatedRef.current = true;
					const inc = target / (1500 / 16);
					let current = 0;
					const step = () => {
						current += inc;
						if (current < target) {
							setCount(Math.ceil(current));
							requestAnimationFrame(step);
						} else setCount(target);
					};
					requestAnimationFrame(step);
					observer.unobserve(el);
				}
			});
		}, { threshold: .3 });
		observer.observe(el);
		return () => {
			observer.disconnect();
		};
	}, [target]);
	return /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
		className: "stat-item",
		ref: statRef,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {
				className: "stat-number",
				children: count
			}),
			/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {
				className: "stat-plus",
				children: suffix
			}),
			/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
				className: "stat-label",
				children: label
			})
		]
	});
}
function HomePage() {
	const bannerRef = (0, import_react.useRef)(null);
	const heroRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if ("scrollRestoration" in history) history.scrollRestoration = "manual";
		window.scrollTo(0, 0);
		const banner = bannerRef.current;
		const heroSection = heroRef.current;
		function handleBannerLoad() {
			if (window.innerWidth <= 768 && heroSection) {
				heroSection.style.height = "auto";
				heroSection.style.minHeight = "auto";
			}
		}
		if (banner) {
			if (banner.complete) handleBannerLoad();
			else banner.addEventListener("load", handleBannerLoad);
		}
		function applyBannerScrollEffect() {
			const scrollValue = window.scrollY;
			if (!banner) return;
			if (window.innerWidth > 768 && scrollValue < 600) {
				const scale = 1 - scrollValue / 1e4;
				const borderRadius = scrollValue / 10;
				const width = 100 - scrollValue / 500;
				banner.style.transform = `scale(${scale > .85 ? scale : .85})`;
				banner.style.borderRadius = `${borderRadius > 60 ? 60 : borderRadius}px`;
				banner.style.width = `${width < 90 ? 90 : width}%`;
			} else if (window.innerWidth <= 768) {
				const mScroll = Math.min(scrollValue, 400);
				const scale = 1 - mScroll / 7e3;
				const borderRadius = mScroll / 12;
				banner.style.transform = `scale(${scale > .88 ? scale : .88})`;
				banner.style.width = "100%";
				banner.style.borderRadius = `${borderRadius > 40 ? 40 : borderRadius}px`;
			}
		}
		window.addEventListener("scroll", applyBannerScrollEffect, { passive: true });
		applyBannerScrollEffect();
		let rowObserver = null;
		const toolRows = document.querySelectorAll(".tool-row");
		if (toolRows.length && window.innerWidth <= 768) {
			rowObserver = new IntersectionObserver((entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) entry.target.classList.add("in-view");
				});
			}, { threshold: .4 });
			toolRows.forEach((row) => rowObserver.observe(row));
		}
		return () => {
			window.removeEventListener("scroll", applyBannerScrollEffect);
			if (banner) banner.removeEventListener("load", handleBannerLoad);
			if (rowObserver) rowObserver.disconnect();
		};
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)(Layout, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("section", {
			className: "hero",
			ref: heroRef,
			children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("img", {
				src: "assets/Designed.png",
				alt: "Avant Banner",
				className: "banner-image",
				ref: bannerRef
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("section", {
			className: "brand-vision",
			children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
				className: "container",
				children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
					className: "vision-wrapper",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
							className: "vision-subtext",
							children: "00 / Philosophy"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("h1", {
							className: "vision-main-heading",
							children: [
								"AVANT IS A DIALOGUE ",
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("br", {}),
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", { children: "BETWEEN LOGIC AND INTUITION" })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
							className: "vision-grid",
							children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
								className: "vision-left",
								children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
									className: "vision-intro",
									children: "Fashion is not just what you wear — it’s how you think, how you feel, and how you move through the world. Avant represents what comes next: a forward-thinking approach."
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
								className: "vision-right",
								children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
									className: "vision-system-title",
									children: "The System of Balance:"
								}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("ul", {
									className: "vision-list",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("strong", { children: "LOGIC" }), " — to understand structure and proportion."] }),
										/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("strong", { children: "MIND" }), " — to reflect intention and confidence."] }),
										/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("strong", { children: "BODY" }), " — to respect fit and fabric."] })
									]
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("h2", {
							className: "vision-outro",
							children: [
								"“We don’t create outfits, ",
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("br", {}),
								"We curate ",
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", { children: "alignments" }),
								".”"
							]
						})
					]
				})
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("section", {
			className: "tech-stats",
			children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
				className: "container stats-grid",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)(StatItem, {
						target: 500,
						suffix: "+",
						label: "Color Harmonies"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)(StatItem, {
						target: 24,
						suffix: "/7",
						label: "Style Logic"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)(StatItem, {
						target: 100,
						suffix: "%",
						label: "Avant Approved"
					})
				]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("section", {
			className: "explore-tools",
			children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
				className: "container content-wrapper",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("h2", {
						className: "section-heading",
						children: [
							"The Future of ",
							/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("br", {}),
							"Personal Styling."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
						className: "tool-row",
						children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
							className: "tool-text",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {
									className: "tool-number",
									children: "01"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("h3", { children: "Trend Discovery" }),
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", { children: "Decoding the visual language of the now. We parse global fashion data to bring you curated insights into Y2K revivals and Modern Minimalist movements." }),
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("a", {
									href: "trends.html",
									className: "btn",
									children: "Explore Trends"
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
							className: "tool-image",
							children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("img", {
								src: "assets/trend-discovery.jpeg",
								alt: "Trend Discovery"
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
						className: "tool-row reverse",
						children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
							className: "tool-text",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {
									className: "tool-number",
									children: "02"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("h3", { children: "Outfit Builder" }),
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", { children: "Styling as a science. Our rule-based system harmonizes color theory and occasion-appropriateness for an \"Avant Approved\" look." }),
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("a", {
									href: "outfit.html",
									className: "btn",
									children: "Start Building"
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
							className: "tool-image",
							children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("img", {
								src: "assets/outfit-builder.jpg",
								alt: "Outfit Builder"
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
						className: "tool-row",
						children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
							className: "tool-text",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {
									className: "tool-number",
									children: "03"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("h3", { children: "Digital Wardrobe" }),
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", { children: "Digitize your wardrobe to identify missing links and suggest new ways to style your existing favorites sustainably." }),
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("a", {
									href: "wardrobe.html",
									className: "btn",
									children: "My Wardrobe"
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
							className: "tool-image",
							children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("img", {
								src: "assets/virtual-wardrobe.jpg",
								alt: "Virtual Wardrobe"
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
						className: "tool-row reverse",
						children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
							className: "tool-text",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {
									className: "tool-number",
									children: "04"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("h3", { children: "Shop the Look" }),
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", { children: "Directly shop curated outfits tailored to your style profile, connecting you with top brands for a seamless styling journey." }),
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("a", {
									href: "shop.html",
									className: "btn",
									children: "Shop Now"
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
							className: "tool-image",
							children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("img", {
								src: "assets/shop-the-look.jpg",
								alt: "Shop the Look"
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
						className: "tool-row",
						children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
							className: "tool-text",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {
									className: "tool-number",
									children: "05"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("h3", { children: "Virtual Try-On" }),
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", { children: "See how new styles look on you before you buy, making every outfit choice more confident and personal." }),
								/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("a", {
									href: "tryon.html",
									className: "btn",
									children: "Try On Now"
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
							className: "tool-image",
							children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("img", {
								src: "assets/try-on.png",
								alt: "Virtual Try-On"
							})
						})]
					})
				]
			})
		})
	] });
}
var import_react, import_jsx_runtime$1;
var init_HomePage = __esmMin((() => {
	import_react = require_react();
	init_Layout();
	import_jsx_runtime$1 = require_jsx_runtime();
}));
//#endregion
//#region client/src/home/main.jsx
var require_main = /* @__PURE__ */ __commonJSMin((() => {
	var import_client = require_client();
	init_HomePage();
	var import_jsx_runtime = require_jsx_runtime();
	var rootEl = document.getElementById("home-root");
	if (rootEl) (0, import_client.createRoot)(rootEl).render(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HomePage, {}));
}));
//#endregion
export default require_main();
