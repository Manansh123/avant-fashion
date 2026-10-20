import { a as __esmMin, r as require_react, t as require_jsx_runtime } from "./shared-jsx-runtime.js";
//#region client/src/common/Navbar.jsx
function Navbar() {
	const [scrolled, setScrolled] = (0, import_react.useState)(false);
	const [menuOpen, setMenuOpen] = (0, import_react.useState)(false);
	const [userName, setUserName] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		const storedUser = localStorage.getItem("avantUserName");
		if (storedUser) setUserName(storedUser);
		function handleScroll() {
			setScrolled(window.scrollY > 50);
		}
		window.addEventListener("scroll", handleScroll, { passive: true });
		handleScroll();
		return () => {
			window.removeEventListener("scroll", handleScroll);
		};
	}, []);
	function toggleMenu() {
		setMenuOpen((prev) => !prev);
	}
	function closeMenu() {
		setMenuOpen(false);
	}
	function handleAuthClick(e) {
		if (userName) {
			e.preventDefault();
			if (window.confirm("Logout from Avant Ecosystem?")) {
				localStorage.removeItem("avantUserName");
				setUserName(null);
				window.location.href = "index.html";
			}
		}
	}
	const lightColorStyle = menuOpen ? { color: "#fff" } : void 0;
	const lightLogoStyle = menuOpen ? { filter: "invert(0) brightness(1)" } : void 0;
	return /* @__PURE__ */ (0, import_jsx_runtime$2.jsxs)(import_jsx_runtime$2.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime$2.jsx)("nav", {
			className: `navbar ${scrolled ? "scrolled" : ""}`,
			children: /* @__PURE__ */ (0, import_jsx_runtime$2.jsxs)("div", {
				className: "container",
				children: [/* @__PURE__ */ (0, import_jsx_runtime$2.jsx)("div", {
					className: "logo-container",
					children: /* @__PURE__ */ (0, import_jsx_runtime$2.jsxs)("a", {
						href: "index.html",
						className: "logo-link",
						children: [/* @__PURE__ */ (0, import_jsx_runtime$2.jsx)("img", {
							src: "assets/logo.png",
							alt: "Avant",
							className: "logo-image",
							style: lightLogoStyle
						}), /* @__PURE__ */ (0, import_jsx_runtime$2.jsx)("img", {
							src: "assets/logoname.png",
							alt: "Avant",
							className: "logo-name-image",
							style: lightLogoStyle
						})]
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime$2.jsxs)("div", {
					className: "nav-right-group",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime$2.jsxs)("ul", {
							className: `nav-links ${menuOpen ? "nav-active" : ""}`,
							id: "navLinks",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime$2.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime$2.jsx)("a", {
									href: "index.html",
									style: lightColorStyle,
									onClick: closeMenu,
									children: "Home"
								}) }),
								/* @__PURE__ */ (0, import_jsx_runtime$2.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime$2.jsx)("a", {
									href: "trends.html",
									style: lightColorStyle,
									onClick: closeMenu,
									children: "Trends"
								}) }),
								/* @__PURE__ */ (0, import_jsx_runtime$2.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime$2.jsx)("a", {
									href: "outfit.html",
									style: lightColorStyle,
									onClick: closeMenu,
									children: "Build Outfit"
								}) }),
								/* @__PURE__ */ (0, import_jsx_runtime$2.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime$2.jsx)("a", {
									href: "wardrobe.html",
									style: lightColorStyle,
									onClick: closeMenu,
									children: "Wardrobe"
								}) }),
								/* @__PURE__ */ (0, import_jsx_runtime$2.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime$2.jsx)("a", {
									href: "shop.html",
									style: lightColorStyle,
									onClick: closeMenu,
									children: "Shop"
								}) }),
								/* @__PURE__ */ (0, import_jsx_runtime$2.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime$2.jsx)("a", {
									href: "tryon.html",
									style: lightColorStyle,
									onClick: closeMenu,
									children: "Try-On"
								}) })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime$2.jsx)("a", {
							href: userName ? "#" : "login.html",
							id: "authBtn",
							className: `login-btn ${userName ? "login-btn-active" : ""}`,
							style: userName ? { cursor: "pointer" } : void 0,
							onClick: handleAuthClick,
							children: userName ? `@${userName.toLowerCase()}` : "Log In / Sign Up"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime$2.jsxs)("button", {
							className: `burger-menu ${menuOpen ? "toggle" : ""}`,
							id: "burgerMenu",
							"aria-label": "Toggle menu",
							type: "button",
							onClick: toggleMenu,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime$2.jsx)("span", {}),
								/* @__PURE__ */ (0, import_jsx_runtime$2.jsx)("span", {}),
								/* @__PURE__ */ (0, import_jsx_runtime$2.jsx)("span", {})
							]
						})
					]
				})]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime$2.jsx)("button", {
			className: `mobile-menu-close-btn ${menuOpen ? "active" : ""}`,
			id: "mobileMenuCloseBtn",
			"aria-label": "Close menu",
			type: "button",
			onClick: closeMenu,
			children: "×"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime$2.jsx)("div", {
			className: `nav-overlay ${menuOpen ? "active" : ""}`,
			id: "navOverlay",
			onClick: closeMenu
		})
	] });
}
var import_react, import_jsx_runtime$2;
var init_Navbar = __esmMin((() => {
	import_react = require_react();
	import_jsx_runtime$2 = require_jsx_runtime();
}));
//#endregion
//#region client/src/common/Footer.jsx
function Footer() {
	return /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("footer", {
		className: "footer",
		children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
			className: "container footer-grid",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
					className: "footer-brand-section",
					children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
						className: "footer-logo-wrap",
						children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("img", {
							src: "assets/logo.png",
							alt: "Avant Logo",
							className: "footer-logo"
						}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("img", {
							src: "assets/logoname.png",
							alt: "Avant",
							className: "logo-name-image-footer"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
						className: "footer-mission",
						children: "AVANT utilizes rule-based styling logic to enhance personal expression through algorithmic precision. This technology helps curators align their physical presence with their inner intention."
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
					className: "footer-column",
					children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("h4", { children: "Company" }), /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("ul", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("a", {
							href: "about.html",
							children: "About us"
						}) }),
						/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("a", {
							href: "help.html",
							children: "Help center"
						}) }),
						/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("a", {
							href: "blog.html",
							children: "Blog"
						}) })
					] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
					className: "footer-column",
					children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("h4", { children: "Connect" }), /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("ul", {
						className: "social-links",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("a", {
								href: "#",
								"aria-label": "Instagram",
								children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("svg", {
									xmlns: "http://www.w3.org/2000/svg",
									width: "20",
									height: "20",
									fill: "currentColor",
									className: "bi bi-instagram",
									viewBox: "0 0 16 16",
									children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("path", { d: "M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599s.453.546.598.92c.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233s.008-2.388.046-3.231c.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92s.546-.453.92-.598c.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92m-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217m0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334" })
								})
							}) }),
							/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("a", {
								href: "#",
								"aria-label": "LinkedIn",
								children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("svg", {
									xmlns: "http://www.w3.org/2000/svg",
									width: "20",
									height: "20",
									fill: "currentColor",
									className: "bi bi-linkedin",
									viewBox: "0 0 16 16",
									children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("path", { d: "M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854zm4.943 12.248V6.169H2.542v7.225zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.226 2.4 3.934c0 .694.521 1.248 1.327 1.248zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225z" })
								})
							}) }),
							/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("a", {
								href: "#",
								"aria-label": "YouTube",
								children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("svg", {
									xmlns: "http://www.w3.org/2000/svg",
									width: "20",
									height: "20",
									fill: "currentColor",
									className: "bi bi-youtube",
									viewBox: "0 0 16 16",
									children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("path", { d: "M8.051 1.999h.089c.822.003 4.987.033 6.11.335a2.01 2.01 0 0 1 1.415 1.42c.101.38.172.883.22 1.402l.01.104.022.26.008.104c.065.914.073 1.77.074 1.957v.075c-.001.194-.01 1.108-.082 2.06l-.008.105-.009.104c-.05.572-.124 1.14-.235 1.558a2.01 2.01 0 0 1-1.415 1.42c-1.16.312-5.569.334-6.18.335h-.142c-.309 0-1.587-.006-2.927-.052l-.17-.006-.087-.004-.171-.007-.171-.007c-1.11-.049-2.167-.128-2.654-.26a2.01 2.01 0 0 1-1.415-1.419c-.111-.417-.185-.986-.235-1.558L.09 9.82l-.008-.104A31 31 0 0 1 0 7.68v-.123c.002-.215.01-.958.064-1.778l.007-.103.003-.052.008-.104.022-.26.01-.104c.048-.519.119-1.023.22-1.402a2.01 2.01 0 0 1 1.415-1.42c.487-.13 1.544-.21 2.654-.26l.17-.007.172-.006.086-.003.171-.007A100 100 0 0 1 7.858 2zM6.4 5.209v4.818l4.157-2.408z" })
								})
							}) })
						]
					})]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
			className: "footer-bottom-bar",
			children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
				className: "container",
				children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", { children: "© 2026 AVANT, all rights reserved. | Terms of service | Privacy policy" })
			})
		})]
	});
}
var import_jsx_runtime$1;
var init_Footer = __esmMin((() => {
	import_jsx_runtime$1 = require_jsx_runtime();
}));
//#endregion
//#region client/src/common/Layout.jsx
function Layout({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navbar, {}),
		children,
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Footer, {})
	] });
}
var import_jsx_runtime;
var init_Layout = __esmMin((() => {
	init_Navbar();
	init_Footer();
	import_jsx_runtime = require_jsx_runtime();
}));
//#endregion
export { init_Layout as n, Layout as t };
