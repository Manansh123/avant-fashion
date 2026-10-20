import { createRoot } from 'react-dom/client';
import OutfitPage from './OutfitPage.jsx';

const rootEl = document.getElementById('outfit-root');
if (rootEl) {
    createRoot(rootEl).render(<OutfitPage />);
}
