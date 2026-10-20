import { createRoot } from 'react-dom/client';
import HomePage from './HomePage.jsx';

const rootEl = document.getElementById('home-root');
if (rootEl) {
    createRoot(rootEl).render(<HomePage />);
}
