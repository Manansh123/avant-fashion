import { createRoot } from 'react-dom/client';
import TryonPage from './TryonPage.jsx';

const rootEl = document.getElementById('tryon-root');
if (rootEl) {
    createRoot(rootEl).render(<TryonPage />);
}
