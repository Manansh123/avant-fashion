import { createRoot } from 'react-dom/client';
import ChatWidget from './ChatWidget.jsx';

function mountChatbot() {
    if (document.getElementById('avant-chat-root')) return;

    const root = document.createElement('div');
    root.id = 'avant-chat-root';
    document.body.appendChild(root);
    createRoot(root).render(<ChatWidget />);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountChatbot);
} else {
    mountChatbot();
}
