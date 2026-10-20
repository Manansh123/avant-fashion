import { createRoot } from 'react-dom/client';
import WardrobePage from './WardrobePage.jsx';

const rootEl = document.getElementById('wardrobe-root');
if (rootEl) {
    createRoot(rootEl).render(<WardrobePage />);
}
