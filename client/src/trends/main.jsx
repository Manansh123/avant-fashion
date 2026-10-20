import { createRoot } from 'react-dom/client';
import TrendsPage from './TrendsPage.jsx';

const rootEl = document.getElementById('trends-root');
if (rootEl) {
    createRoot(rootEl).render(<TrendsPage />);
}
