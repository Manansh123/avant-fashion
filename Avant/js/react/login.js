import { a as __esmMin, i as __commonJSMin, n as require_client, r as require_react, t as require_jsx_runtime } from "./shared-jsx-runtime.js";
//#region client/src/login/LoginPage.jsx
function LoginPage() {
	const [isLoginMode, setIsLoginMode] = (0, import_react.useState)(true);
	const [name, setName] = (0, import_react.useState)("");
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [showPassword, setShowPassword] = (0, import_react.useState)(false);
	const [hideGoogleBtn, setHideGoogleBtn] = (0, import_react.useState)(false);
	const googleBtnRef = (0, import_react.useRef)(null);
	function toggleAuthMode(e) {
		e.preventDefault();
		setIsLoginMode((prev) => {
			const next = !prev;
			if (next) setName("");
			return next;
		});
	}
	function togglePasswordVisibility() {
		setShowPassword((prev) => !prev);
	}
	async function handleSubmit(e) {
		e.preventDefault();
		if (!isLoginMode) {
			if (!USERNAME_REGEX.test(name)) {
				alert("Username Error: Only letters, numbers, dots, and underscores allowed.");
				return;
			}
		}
		const endpoint = isLoginMode ? "/api/login" : "/api/signup";
		const payload = isLoginMode ? {
			email,
			password
		} : {
			name,
			email,
			password
		};
		try {
			const response = await fetch(endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			});
			const data = await response.json();
			if (response.ok) {
				if (data.name) {
					const cleanName = data.name.toLowerCase().replace(/\s+/g, "");
					localStorage.setItem("avantUserName", cleanName);
				}
				alert(data.message);
				window.location.replace("index.html");
			} else alert("Error: " + data.message);
		} catch (error) {
			console.error("Critical Fetch Error:", error);
			alert("Server connection failed! Check console (F12).");
		}
	}
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		let retryTimer = null;
		async function handleGoogleCredential(response) {
			try {
				const res = await fetch("/api/auth/google", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ credential: response.credential })
				});
				const data = await res.json();
				if (res.ok && data.success) {
					localStorage.setItem("avantUserName", data.name.toLowerCase());
					alert(data.message);
					window.location.replace("index.html");
				} else alert("Google Sign-In failed: " + (data.message || "Unknown error"));
			} catch (err) {
				console.error("Google auth request failed:", err);
				alert("Server connection failed during Google Sign-In.");
			}
		}
		async function initGoogleSignIn() {
			try {
				const cfg = await (await fetch("/api/config/google-client-id")).json();
				if (cancelled) return;
				if (!cfg.clientId) {
					console.warn("⚠ GOOGLE_CLIENT_ID not set in .env — hiding Google button");
					setHideGoogleBtn(true);
					return;
				}
				if (!window.google || !window.google.accounts || !window.google.accounts.id) {
					retryTimer = setTimeout(initGoogleSignIn, 200);
					return;
				}
				const btnEl = googleBtnRef.current;
				if (!btnEl) return;
				window.google.accounts.id.initialize({
					client_id: cfg.clientId,
					callback: handleGoogleCredential
				});
				btnEl.innerHTML = "";
				window.google.accounts.id.renderButton(btnEl, GOOGLE_BTN_OPTIONS);
			} catch (err) {
				console.error("Google Sign-In init failed:", err);
				if (!cancelled) setHideGoogleBtn(true);
			}
		}
		initGoogleSignIn();
		return () => {
			cancelled = true;
			if (retryTimer) clearTimeout(retryTimer);
		};
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
		className: "login-split-container",
		children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
			className: "login-auth-side",
			children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
				className: "login-inner-wrap",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("a", {
						href: "index.html",
						className: "login-back-logo",
						children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("img", {
							src: "assets/logoname.png",
							alt: "Avant",
							className: "logo-name-image-login"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
						className: "login-title-section",
						children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("h1", {
							id: "authTitle",
							children: isLoginMode ? "Log In" : "Sign Up"
						}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
							id: "authSubtitle",
							children: "Enter your details to access the AVANT ecosystem."
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
						id: "googleSignInBtn",
						ref: googleBtnRef,
						style: hideGoogleBtn ? { display: "none" } : void 0
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
						className: "auth-divider",
						children: /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", { children: "Or email" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("form", {
						id: "mainLoginForm",
						onSubmit: handleSubmit,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
								className: "auth-input-group",
								id: "nameGroup",
								style: { display: isLoginMode ? "none" : "block" },
								children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("label", { children: "Full Name" }), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("input", {
									type: "text",
									id: "userNameInput",
									placeholder: "Enter Username",
									minLength: 5,
									value: name,
									onChange: (e) => setName(e.target.value),
									required: !isLoginMode
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
								className: "auth-input-group",
								children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("label", { children: "Email" }), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("input", {
									type: "email",
									id: "userEmail",
									placeholder: "Enter Email",
									required: true,
									value: email,
									onChange: (e) => setEmail(e.target.value)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
								className: "auth-input-group password-group",
								children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("label", { children: "Password" }), /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
									style: { position: "relative" },
									children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("input", {
										type: showPassword ? "text" : "password",
										id: "userPassword",
										placeholder: "Enter Password",
										minLength: 8,
										required: true,
										value: password,
										onChange: (e) => setPassword(e.target.value)
									}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("button", {
										type: "button",
										id: "togglePassword",
										onClick: togglePasswordVisibility,
										style: {
											position: "absolute",
											right: "10px",
											top: "50%",
											transform: "translateY(-50%)",
											background: "none",
											border: "none",
											color: "#000000",
											cursor: "pointer",
											fontSize: "12px",
											fontFamily: "Montserrat"
										},
										children: showPassword ? "HIDE" : "SHOW"
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("button", {
								type: "submit",
								className: "auth-submit-btn",
								id: "submitBtn",
								children: isLoginMode ? "Log In" : "Create Account"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("p", {
						className: "auth-footer-text",
						id: "toggleText",
						children: isLoginMode ? /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)(import_jsx_runtime$1.Fragment, { children: ["No account? ", /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("a", {
							href: "#",
							onClick: toggleAuthMode,
							children: "Sign Up here"
						})] }) : /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)(import_jsx_runtime$1.Fragment, { children: ["Already have an account? ", /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("a", {
							href: "#",
							onClick: toggleAuthMode,
							children: "Log In here"
						})] })
					})
				]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
			className: "login-visual-side",
			children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", { className: "visual-overlay" }), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("img", {
				src: "assets/login-img.jpg",
				alt: "Avant Fashion Editorial"
			})]
		})]
	});
}
var import_react, import_jsx_runtime$1, GOOGLE_BTN_OPTIONS, USERNAME_REGEX;
var init_LoginPage = __esmMin((() => {
	import_react = require_react();
	import_jsx_runtime$1 = require_jsx_runtime();
	GOOGLE_BTN_OPTIONS = {
		type: "standard",
		theme: "outline",
		size: "large",
		shape: "pill",
		text: "continue_with",
		logo_alignment: "left",
		width: 400
	};
	USERNAME_REGEX = /^[a-zA-Z0-9._]+$/;
}));
//#endregion
//#region client/src/login/main.jsx
var require_main = /* @__PURE__ */ __commonJSMin((() => {
	var import_client = require_client();
	init_LoginPage();
	var import_jsx_runtime = require_jsx_runtime();
	var rootEl = document.getElementById("login-root");
	if (rootEl) (0, import_client.createRoot)(rootEl).render(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoginPage, {}));
}));
//#endregion
export default require_main();
