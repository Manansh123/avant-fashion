export const CHAT_STYLES = `
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
