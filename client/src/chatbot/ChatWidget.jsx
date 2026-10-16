import { useEffect, useRef, useState } from 'react';
import { CHAT_STYLES } from './chatStyles.js';

const CHIP_MESSAGES = {
    trend: "What's trending right now?",
    color: "What's the color of the day?",
    analyze: "Can you analyze my fit? I'll attach a photo."
};

function timeNow() {
    return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatMessageText(text) {
    if (!text) return '';
    let safe = text.replace(/</g, '&lt;');
    safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/\n/g, '<br>');
    return safe;
}

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [hasOpenedOnce, setHasOpenedOnce] = useState(false);
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState('');
    const [pendingImageFile, setPendingImageFile] = useState(null);
    const [pendingPreviewUrl, setPendingPreviewUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const bodyRef = useRef(null);
    const fileRef = useRef(null);
    const msgIdRef = useRef(0);

    useEffect(() => {
        if (document.getElementById('avant-chat-styles')) return undefined;
        const styleTag = document.createElement('style');
        styleTag.id = 'avant-chat-styles';
        styleTag.textContent = CHAT_STYLES;
        document.head.appendChild(styleTag);
        return undefined;
    }, []);

    useEffect(() => {
        const body = bodyRef.current;
        if (body) body.scrollTop = body.scrollHeight;
    }, [messages, isLoading]);

    function addMessage(role, text, imageUrl) {
        msgIdRef.current += 1;
        const msg = { id: msgIdRef.current, role, text, imageUrl, time: timeNow() };
        setMessages((prev) => [...prev, msg]);
        return msg;
    }

    function toggleWidget() {
        const next = !isOpen;
        setIsOpen(next);
        if (next && !hasOpenedOnce) {
            setHasOpenedOnce(true);
            addMessage('bot', "Hi, I'm your AVANT stylist ✦ How can I help you today?");
        }
    }

    function clearImagePreview() {
        setPendingImageFile(null);
        setPendingPreviewUrl('');
        if (fileRef.current) fileRef.current.value = '';
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
        setPendingImageFile(file);
        setPendingPreviewUrl(URL.createObjectURL(file));
    }

    async function sendMessage(text, imageFile) {
        if (!text && !imageFile) return;

        const userImagePreviewUrl = imageFile ? URL.createObjectURL(imageFile) : null;
        addMessage('user', text, userImagePreviewUrl);

        clearImagePreview();
        setDraft('');
        setIsLoading(true);

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
            setIsLoading(false);

            if (data.success) {
                addMessage('bot', data.reply);
            } else {
                addMessage('bot', "Hmm, I couldn't quite get that. Try again in a moment.");
            }
        } catch (err) {
            setIsLoading(false);
            if (err.message === 'backend-not-ready') {
                addMessage('bot', '✦ Stylist AI is almost ready — the backend just needs to be wired up (Step 2). Check back soon!');
            } else {
                addMessage('bot', 'Something went wrong reaching the server. Please try again.');
            }
            console.error('Chat AI error:', err);
        }
    }

    function handleChipClick(chipType) {
        sendMessage(CHIP_MESSAGES[chipType] || '', null);
    }

    return (
        <>
            <div
                id="avant-chat-bubble"
                className={isOpen ? 'is-open' : ''}
                onClick={toggleWidget}
            >
                <span id="avant-chat-bubble-icon">✦</span>
                <span id="avant-chat-badge" style={hasOpenedOnce ? { display: 'none' } : undefined}>1</span>
            </div>
            <div id="avant-chat-window" className={isOpen ? 'is-open' : ''}>
                <div id="avant-chat-header">
                    <div id="avant-chat-header-title">
                        <div className="avatar">✦</div>
                        <div>
                            <div className="name">AVANT Stylist</div>
                            <div className="sub">AI STYLING ASSISTANT</div>
                        </div>
                    </div>
                    <button id="avant-chat-close" type="button" onClick={toggleWidget}>&times;</button>
                </div>
                <div id="avant-chat-body" ref={bodyRef}>
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`avant-msg ${msg.role === 'user' ? 'user' : 'bot'}`}
                        >
                            <span dangerouslySetInnerHTML={{ __html: formatMessageText(msg.text) }} />
                            {msg.imageUrl ? <img src={msg.imageUrl} alt="attached" /> : null}
                            <div className="avant-msg-time">{msg.time}</div>
                        </div>
                    ))}
                    {isLoading ? (
                        <div id="avant-chat-loading" className="avant-loading-msg">
                            ✦ Generating Style Intelligence...
                        </div>
                    ) : null}
                </div>
                <div id="avant-chat-chips">
                    <button type="button" className="avant-chip" data-chip="trend" onClick={() => handleChipClick('trend')}>✦ Trend of the Day</button>
                    <button type="button" className="avant-chip" data-chip="color" onClick={() => handleChipClick('color')}>✦ Color of the Day</button>
                    <button type="button" className="avant-chip" data-chip="analyze" onClick={() => handleChipClick('analyze')}>✦ Analyze my Fit</button>
                </div>
                <div id="avant-chat-preview" className={pendingImageFile ? 'active' : ''}>
                    <img id="avant-chat-preview-img" src={pendingPreviewUrl} alt="preview" />
                    <span className="remove-img" id="avant-chat-remove-img" onClick={clearImagePreview}>Remove</span>
                </div>
                <div id="avant-chat-inputbar">
                    <button
                        type="button"
                        id="avant-chat-plus"
                        title="Attach a photo"
                        onClick={() => fileRef.current && fileRef.current.click()}
                    >
                        +
                    </button>
                    <input
                        type="file"
                        id="avant-chat-file"
                        accept="image/*"
                        hidden
                        ref={fileRef}
                        onChange={handleFileSelect}
                    />
                    <input
                        type="text"
                        id="avant-chat-text"
                        placeholder="Ask your stylist anything..."
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                sendMessage(e.target.value.trim(), pendingImageFile);
                            }
                        }}
                    />
                    <button
                        type="button"
                        id="avant-chat-send"
                        title="Send"
                        onClick={() => sendMessage(draft.trim(), pendingImageFile)}
                    >
                        ➤
                    </button>
                </div>
            </div>
        </>
    );
}
