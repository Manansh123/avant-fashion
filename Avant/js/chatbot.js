// ================================================================
// AVANT — STYLIST AI CHATBOT (js/chatbot.js)
// Step 1: Floating UI shell. Self-mounting — inject this ONE script
// tag before </body> on any page and the widget builds itself.
// Talks to POST /api/chat-ai (Step 2 backend — not built yet).
// Until Step 2 exists, failed calls show a graceful placeholder
// reply instead of breaking, so this file needs ZERO changes later.
// ================================================================

(function () {

    // ----------------------------------------------------------------
    // STATE
    // ----------------------------------------------------------------
    let isOpen = false;
    let hasOpenedOnce = false;
    let messages = []; // { role: 'user'|'bot', text, imageUrl }
    let pendingImageFile = null;

    // ----------------------------------------------------------------
    // STYLES — injected once, scoped under #avant-chat-root
    // ----------------------------------------------------------------
    const STYLE = `
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

    // ----------------------------------------------------------------
    // MARKUP
    // ----------------------------------------------------------------
    const HTML = `
        <div id="avant-chat-bubble">
            <span id="avant-chat-bubble-icon">✦</span>
            <span id="avant-chat-badge">1</span>
        </div>
        <div id="avant-chat-window">
            <div id="avant-chat-header">
                <div id="avant-chat-header-title">
                    <div class="avatar">✦</div>
                    <div>
                        <div class="name">AVANT Stylist</div>
                        <div class="sub">AI STYLING ASSISTANT</div>
                    </div>
                </div>
                <button id="avant-chat-close">&times;</button>
            </div>
            <div id="avant-chat-body"></div>
            <div id="avant-chat-chips">
                <button class="avant-chip" data-chip="trend">✦ Trend of the Day</button>
                <button class="avant-chip" data-chip="color">✦ Color of the Day</button>
                <button class="avant-chip" data-chip="analyze">✦ Analyze my Fit</button>
            </div>
            <div id="avant-chat-preview">
                <img id="avant-chat-preview-img" src="" alt="preview">
                <span class="remove-img" id="avant-chat-remove-img">Remove</span>
            </div>
            <div id="avant-chat-inputbar">
                <button id="avant-chat-plus" title="Attach a photo">+</button>
                <input type="file" id="avant-chat-file" accept="image/*" hidden>
                <input type="text" id="avant-chat-text" placeholder="Ask your stylist anything...">
                <button id="avant-chat-send" title="Send">➤</button>
            </div>
        </div>
    `;

    // ----------------------------------------------------------------
    // BUILD
    // ----------------------------------------------------------------
    function injectStyles() {
        if (document.getElementById('avant-chat-styles')) return;
        const styleTag = document.createElement('style');
        styleTag.id = 'avant-chat-styles';
        styleTag.textContent = STYLE;
        document.head.appendChild(styleTag);
    }

    function buildWidget() {
        if (document.getElementById('avant-chat-root')) return;
        const root = document.createElement('div');
        root.id = 'avant-chat-root';
        root.innerHTML = HTML;
        document.body.appendChild(root);
    }

    // ----------------------------------------------------------------
    // MESSAGE RENDERING
    // ----------------------------------------------------------------
    function timeNow() {
        return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }

    function formatMessageText(text) {
    if (!text) return '';
    let safe = text.replace(/</g, '&lt;');       // escape HTML first
    safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); // **bold** → <strong>
    safe = safe.replace(/\n/g, '<br>');            // line breaks
    return safe;
}

function appendMessageToDOM(msg) {
    const body = document.getElementById('avant-chat-body');
    const div = document.createElement('div');
    div.className = `avant-msg ${msg.role === 'user' ? 'user' : 'bot'}`;
    const imgHtml = msg.imageUrl ? `<img src="${msg.imageUrl}" alt="attached">` : '';
    div.innerHTML = `${formatMessageText(msg.text)}${imgHtml}<div class="avant-msg-time">${timeNow()}</div>`;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
}

    function addMessage(role, text, imageUrl) {
        const msg = { role, text, imageUrl };
        messages.push(msg);
        appendMessageToDOM(msg);
    }

    function showLoading() {
        const body = document.getElementById('avant-chat-body');
        const div = document.createElement('div');
        div.id = 'avant-chat-loading';
        div.className = 'avant-loading-msg';
        div.textContent = '✦ Generating Style Intelligence...';
        body.appendChild(div);
        body.scrollTop = body.scrollHeight;
    }

    function hideLoading() {
        document.getElementById('avant-chat-loading')?.remove();
    }

    // ----------------------------------------------------------------
    // TOGGLE OPEN/CLOSE
    // ----------------------------------------------------------------
    function toggleWidget() {
        isOpen = !isOpen;
        document.getElementById('avant-chat-window').classList.toggle('is-open', isOpen);
        document.getElementById('avant-chat-bubble').classList.toggle('is-open', isOpen);

        if (isOpen && !hasOpenedOnce) {
            hasOpenedOnce = true;
            document.getElementById('avant-chat-badge').style.display = 'none';
            addMessage('bot', "Hi, I'm your AVANT stylist ✦ How can I help you today?");
        }
    }

    // ----------------------------------------------------------------
    // SENDING — talks to /api/chat-ai (Step 2 backend)
    // ----------------------------------------------------------------
    async function sendMessage(text, imageFile) {
        if (!text && !imageFile) return;

        const userImagePreviewUrl = imageFile ? URL.createObjectURL(imageFile) : null;
        addMessage('user', text, userImagePreviewUrl);

        clearImagePreview();
        document.getElementById('avant-chat-text').value = '';

        showLoading();

        try {
            let res;
            if (imageFile) {
                const fd = new FormData();
                fd.append('message', text || '');
                fd.append('image', imageFile);
                res = await fetch('/api/chat-ai', { method: 'POST', body: fd });
            } else {
                res = await fetch('/api/chat-ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: text })
                });
            }

            const contentType = res.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                throw new Error('backend-not-ready');
            }

            const data = await res.json();
            hideLoading();

            if (data.success) {
                addMessage('bot', data.reply);
            } else {
                addMessage('bot', "Hmm, I couldn't quite get that. Try again in a moment.");
            }
        } catch (err) {
            hideLoading();
            if (err.message === 'backend-not-ready') {
                // Step 2 (backend) not built yet — graceful placeholder, no crash.
                addMessage('bot', "✦ Stylist AI is almost ready — the backend just needs to be wired up (Step 2). Check back soon!");
            } else {
                addMessage('bot', "Something went wrong reaching the server. Please try again.");
            }
            console.error('Chat AI error:', err);
        }
    }

    function handleChipClick(chipType) {
        const chipMessages = {
            trend: "What's trending right now?",
            color: "What's the color of the day?",
            analyze: "Can you analyze my fit? I'll attach a photo."
        };
        sendMessage(chipMessages[chipType] || '', null);
    }

    // ----------------------------------------------------------------
    // IMAGE ATTACH
    // ----------------------------------------------------------------
    function clearImagePreview() {
        pendingImageFile = null;
        document.getElementById('avant-chat-preview').classList.remove('active');
        document.getElementById('avant-chat-preview-img').src = '';
        document.getElementById('avant-chat-file').value = '';
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
        pendingImageFile = file;
        const url = URL.createObjectURL(file);
        document.getElementById('avant-chat-preview-img').src = url;
        document.getElementById('avant-chat-preview').classList.add('active');
    }

    // ----------------------------------------------------------------
    // WIRE EVENTS
    // ----------------------------------------------------------------
    function wireEvents() {
        document.getElementById('avant-chat-bubble').addEventListener('click', toggleWidget);
        document.getElementById('avant-chat-close').addEventListener('click', toggleWidget);

        document.querySelectorAll('.avant-chip').forEach(chip => {
            chip.addEventListener('click', () => handleChipClick(chip.dataset.chip));
        });

        document.getElementById('avant-chat-plus').addEventListener('click', () => {
            document.getElementById('avant-chat-file').click();
        });
        document.getElementById('avant-chat-file').addEventListener('change', handleFileSelect);
        document.getElementById('avant-chat-remove-img').addEventListener('click', clearImagePreview);

        document.getElementById('avant-chat-send').addEventListener('click', () => {
            const text = document.getElementById('avant-chat-text').value.trim();
            sendMessage(text, pendingImageFile);
        });

        document.getElementById('avant-chat-text').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const text = e.target.value.trim();
                sendMessage(text, pendingImageFile);
            }
        });
    }

    // ----------------------------------------------------------------
    // INIT
    // ----------------------------------------------------------------
    function init() {
        injectStyles();
        buildWidget();
        wireEvents();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();