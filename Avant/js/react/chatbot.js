import { a as __esmMin, i as __commonJSMin, n as require_client, r as require_react, t as require_jsx_runtime } from "./shared-jsx-runtime.js";
//#region client/src/chatbot/chatStyles.js
var CHAT_STYLES;
var init_chatStyles = __esmMin((() => {
	CHAT_STYLES = `
        #avant-chat-root {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 5000;
            font-family: 'Montserrat', sans-serif;
        }

        /* ---------- BUBBLE ---------- */
        #avant-chat-bubble {
            width: 58px;
            height: 58px;
            border-radius: 50%;
            background: #000;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.4rem;
            cursor: pointer;
            box-shadow: 0 15px 40px rgba(0,0,0,0.25);
            border: none;
            transition: transform 0.3s cubic-bezier(0.19,1,0.22,1);
            position: relative;
        }
        #avant-chat-bubble:hover { transform: scale(1.08); }
        #avant-chat-bubble.is-open { transform: rotate(90deg) scale(1); }

        #avant-chat-badge {
            position: absolute;
            top: -4px;
            right: -4px;
            background: #ff4d4d;
            color: #fff;
            font-size: 0.6rem;
            font-weight: 700;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #fff;
        }

        /* ---------- WINDOW ---------- */
        #avant-chat-window {
            position: absolute;
            bottom: 74px;
            right: 0;
            width: 380px;
            max-width: calc(100vw - 40px);
            height: 560px;
            max-height: calc(100vh - 130px);
            background: #fff;
            box-shadow: 0 30px 80px rgba(0,0,0,0.18), 0 5px 20px rgba(0,0,0,0.08);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            opacity: 0;
            transform: translateY(20px) scale(0.98);
            pointer-events: none;
            transition: opacity 0.3s cubic-bezier(0.19,1,0.22,1), transform 0.3s cubic-bezier(0.19,1,0.22,1);
        }
        #avant-chat-window.is-open {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: auto;
        }

        #avant-chat-header {
            background: #000;
            color: #fff;
            padding: 18px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-shrink: 0;
        }
        #avant-chat-header-title {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        #avant-chat-header-title .avatar {
            width: 30px; height: 30px;
            border-radius: 50%;
            background: #fff;
            color: #000;
            display: flex; align-items: center; justify-content: center;
            font-size: 0.9rem;
        }
        #avant-chat-header-title .name {
            font-family: 'Cormorant Garamond', serif;
            font-weight: 700;
            font-size: 1.15rem;
            letter-spacing: 0.5px;
        }
        #avant-chat-header-title .sub {
            font-size: 0.55rem;
            letter-spacing: 2px;
            color: #aaa;
            text-transform: uppercase;
            margin-top: 1px;
        }
        #avant-chat-close {
            background: none; border: none; color: #fff;
            font-size: 1.3rem; cursor: pointer; opacity: 0.7;
            line-height: 1; padding: 4px;
        }
        #avant-chat-close:hover { opacity: 1; }

        #avant-chat-body {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            background: #fafafa;
        }
        #avant-chat-body::-webkit-scrollbar { width: 4px; }
        #avant-chat-body::-webkit-scrollbar-thumb { background: #ccc; }

        .avant-msg {
            max-width: 82%;
            padding: 11px 15px;
            font-size: 0.85rem;
            line-height: 1.6;
            border: 1px solid #ececec;
        }
        .avant-msg.bot {
            background: #fff;
            color: #111;
            align-self: flex-start;
            border-bottom-left-radius: 2px;
        }
        .avant-msg.user {
            background: #000;
            color: #fff;
            align-self: flex-end;
            border: none;
            border-bottom-right-radius: 2px;
        }
        .avant-msg img {
            width: 100%;
            max-width: 200px;
            display: block;
            margin-top: 8px;
        }
        .avant-msg-time {
            font-size: 0.55rem;
            color: #bbb;
            margin-top: 4px;
            letter-spacing: 1px;
        }

        .avant-loading-msg {
    align-self: flex-start;
    font-size: 0.68rem;
    letter-spacing: 2px;
    color: #999;
    text-transform: uppercase;
    padding: 8px 4px;
    animation: avantLoadingPulse 1.3s ease-in-out infinite;
}
@keyframes avantLoadingPulse {
    0%, 100% { opacity: 0.3; filter: blur(0.4px); }
    50%       { opacity: 1;   filter: blur(0px); }
}

        /* ---------- QUICK CHIPS ---------- */
        #avant-chat-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            padding: 0 20px 16px 20px;
            background: #fafafa;
            flex-shrink: 0;
        }
        .avant-chip {
            background: #fff;
            border: 1.5px solid #000;
            color: #000;
            font-family: 'Montserrat', sans-serif;
            font-size: 0.65rem;
            font-weight: 700;
            letter-spacing: 1px;
            text-transform: uppercase;
            padding: 8px 12px;
            cursor: pointer;
            transition: all 0.25s ease;
        }
        .avant-chip:hover { background: #000; color: #fff; }

        /* ---------- INPUT BAR ---------- */
        #avant-chat-inputbar {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 14px;
            border-top: 1px solid #eee;
            background: #fff;
            flex-shrink: 0;
        }
        #avant-chat-plus {
            background: none;
            border: 1.5px solid #ddd;
            width: 34px; height: 34px;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer;
            font-size: 1.1rem;
            color: #555;
            flex-shrink: 0;
            transition: border-color 0.2s ease, color 0.2s ease;
        }
        #avant-chat-plus:hover { border-color: #000; color: #000; }
        #avant-chat-text {
            flex: 1;
            border: none;
            outline: none;
            font-family: 'Montserrat', sans-serif;
            font-size: 0.82rem;
            padding: 8px 4px;
            background: transparent;
        }
        #avant-chat-send {
            background: #000;
            color: #fff;
            border: none;
            width: 34px; height: 34px;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer;
            flex-shrink: 0;
            transition: opacity 0.2s ease;
        }
        #avant-chat-send:hover { opacity: 0.75; }
        #avant-chat-send:disabled { opacity: 0.3; cursor: not-allowed; }

        #avant-chat-preview {
            display: none;
            align-items: center;
            gap: 8px;
            padding: 0 14px 10px 14px;
            background: #fff;
        }
        #avant-chat-preview.active { display: flex; }
        #avant-chat-preview img {
            width: 40px; height: 40px; object-fit: cover;
        }
        #avant-chat-preview .remove-img {
            font-size: 0.65rem;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: #999;
            cursor: pointer;
            border-bottom: 1px solid #999;
        }

        @media (max-width: 480px) {
            #avant-chat-window {
                width: calc(100vw - 24px);
                right: -12px;
                height: calc(100vh - 160px);
            }
        }
    `;
}));
//#endregion
//#region client/src/chatbot/ChatWidget.jsx
function timeNow() {
	return (/* @__PURE__ */ new Date()).toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit"
	});
}
function formatMessageText(text) {
	if (!text) return "";
	let safe = text.replace(/</g, "&lt;");
	safe = safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
	safe = safe.replace(/\n/g, "<br>");
	return safe;
}
function ChatWidget() {
	const [isOpen, setIsOpen] = (0, import_react.useState)(false);
	const [hasOpenedOnce, setHasOpenedOnce] = (0, import_react.useState)(false);
	const [messages, setMessages] = (0, import_react.useState)([]);
	const [draft, setDraft] = (0, import_react.useState)("");
	const [pendingImageFile, setPendingImageFile] = (0, import_react.useState)(null);
	const [pendingPreviewUrl, setPendingPreviewUrl] = (0, import_react.useState)("");
	const [isLoading, setIsLoading] = (0, import_react.useState)(false);
	const bodyRef = (0, import_react.useRef)(null);
	const fileRef = (0, import_react.useRef)(null);
	const msgIdRef = (0, import_react.useRef)(0);
	(0, import_react.useEffect)(() => {
		if (document.getElementById("avant-chat-styles")) return void 0;
		const styleTag = document.createElement("style");
		styleTag.id = "avant-chat-styles";
		styleTag.textContent = CHAT_STYLES;
		document.head.appendChild(styleTag);
	}, []);
	(0, import_react.useEffect)(() => {
		const body = bodyRef.current;
		if (body) body.scrollTop = body.scrollHeight;
	}, [messages, isLoading]);
	function addMessage(role, text, imageUrl) {
		msgIdRef.current += 1;
		const msg = {
			id: msgIdRef.current,
			role,
			text,
			imageUrl,
			time: timeNow()
		};
		setMessages((prev) => [...prev, msg]);
		return msg;
	}
	function toggleWidget() {
		const next = !isOpen;
		setIsOpen(next);
		if (next && !hasOpenedOnce) {
			setHasOpenedOnce(true);
			addMessage("bot", "Hi, I'm your AVANT stylist. How can I help you today?");
		}
	}
	function clearImagePreview() {
		setPendingImageFile(null);
		setPendingPreviewUrl("");
		if (fileRef.current) fileRef.current.value = "";
	}
	function handleFileSelect(e) {
		const file = e.target.files[0];
		if (!file) return;
		setPendingImageFile(file);
		setPendingPreviewUrl(URL.createObjectURL(file));
	}
	async function sendMessage(text, imageFile) {
		if (!text && !imageFile) return;
		addMessage("user", text, imageFile ? URL.createObjectURL(imageFile) : null);
		clearImagePreview();
		setDraft("");
		setIsLoading(true);
		try {
			let res;
			if (imageFile) {
				const fd = new FormData();
				fd.append("message", text || "");
				fd.append("image", imageFile);
				res = await fetch("/api/chat-ai", {
					method: "POST",
					body: fd
				});
			} else res = await fetch("/api/chat-ai", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ message: text })
			});
			if (!(res.headers.get("content-type") || "").includes("application/json")) throw new Error("backend-not-ready");
			const data = await res.json();
			setIsLoading(false);
			if (data.success) addMessage("bot", data.reply);
			else addMessage("bot", "Hmm, I couldn't quite get that. Try again in a moment.");
		} catch (err) {
			setIsLoading(false);
			if (err.message === "backend-not-ready") addMessage("bot", "✦ Stylist AI is almost ready — the backend just needs to be wired up (Step 2). Check back soon!");
			else addMessage("bot", "Something went wrong reaching the server. Please try again.");
			console.error("Chat AI error:", err);
		}
	}
	function handleChipClick(chipType) {
		sendMessage(CHIP_MESSAGES[chipType] || "", null);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)(import_jsx_runtime$1.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
		id: "avant-chat-bubble",
		className: isOpen ? "is-open" : "",
		onClick: toggleWidget,
		children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {
			id: "avant-chat-bubble-icon",
			children: "✦"
		}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {
			id: "avant-chat-badge",
			style: hasOpenedOnce ? { display: "none" } : void 0,
			children: "1"
		})]
	}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
		id: "avant-chat-window",
		className: isOpen ? "is-open" : "",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
				id: "avant-chat-header",
				children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
					id: "avant-chat-header-title",
					children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
						className: "avatar",
						children: "✦"
					}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
						className: "name",
						children: "AVANT Stylist"
					}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
						className: "sub",
						children: "AI STYLING ASSISTANT"
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("button", {
					id: "avant-chat-close",
					type: "button",
					onClick: toggleWidget,
					children: "×"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
				id: "avant-chat-body",
				ref: bodyRef,
				children: [messages.map((msg) => /* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
					className: `avant-msg ${msg.role === "user" ? "user" : "bot"}`,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", { dangerouslySetInnerHTML: { __html: formatMessageText(msg.text) } }),
						msg.imageUrl ? /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("img", {
							src: msg.imageUrl,
							alt: "attached"
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
							className: "avant-msg-time",
							children: msg.time
						})
					]
				}, msg.id)), isLoading ? /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("div", {
					id: "avant-chat-loading",
					className: "avant-loading-msg",
					children: "✦ Generating Style Intelligence..."
				}) : null]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
				id: "avant-chat-chips",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("button", {
						type: "button",
						className: "avant-chip",
						"data-chip": "trend",
						onClick: () => handleChipClick("trend"),
						children: "Trend of the Day"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("button", {
						type: "button",
						className: "avant-chip",
						"data-chip": "color",
						onClick: () => handleChipClick("color"),
						children: "Color of the Day"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("button", {
						type: "button",
						className: "avant-chip",
						"data-chip": "analyze",
						onClick: () => handleChipClick("analyze"),
						children: "Analyze my Fit"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
				id: "avant-chat-preview",
				className: pendingImageFile ? "active" : "",
				children: [/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("img", {
					id: "avant-chat-preview-img",
					src: pendingPreviewUrl,
					alt: "preview"
				}), /* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("span", {
					className: "remove-img",
					id: "avant-chat-remove-img",
					onClick: clearImagePreview,
					children: "Remove"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime$1.jsxs)("div", {
				id: "avant-chat-inputbar",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("button", {
						type: "button",
						id: "avant-chat-plus",
						title: "Attach a photo",
						onClick: () => fileRef.current && fileRef.current.click(),
						children: "+"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("input", {
						type: "file",
						id: "avant-chat-file",
						accept: "image/*",
						hidden: true,
						ref: fileRef,
						onChange: handleFileSelect
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("input", {
						type: "text",
						id: "avant-chat-text",
						placeholder: "Ask your stylist anything...",
						value: draft,
						onChange: (e) => setDraft(e.target.value),
						onKeyDown: (e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								sendMessage(e.target.value.trim(), pendingImageFile);
							}
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime$1.jsx)("button", {
						type: "button",
						id: "avant-chat-send",
						title: "Send",
						onClick: () => sendMessage(draft.trim(), pendingImageFile),
						children: "➤"
					})
				]
			})
		]
	})] });
}
var import_react, import_jsx_runtime$1, CHIP_MESSAGES;
var init_ChatWidget = __esmMin((() => {
	import_react = require_react();
	init_chatStyles();
	import_jsx_runtime$1 = require_jsx_runtime();
	CHIP_MESSAGES = {
		trend: "What's trending right now?",
		color: "What's the color of the day?",
		analyze: "Can you analyze my fit? I'll attach a photo."
	};
}));
//#endregion
//#region client/src/chatbot/main.jsx
var require_main = /* @__PURE__ */ __commonJSMin((() => {
	var import_client = require_client();
	init_ChatWidget();
	var import_jsx_runtime = require_jsx_runtime();
	function mountChatbot() {
		if (document.getElementById("avant-chat-root")) return;
		const root = document.createElement("div");
		root.id = "avant-chat-root";
		document.body.appendChild(root);
		(0, import_client.createRoot)(root).render(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatWidget, {}));
	}
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountChatbot);
	else mountChatbot();
}));
//#endregion
export default require_main();
