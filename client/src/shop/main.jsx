import { createRoot } from 'react-dom/client';
import ShopPage from './ShopPage.jsx';

const rootEl = document.getElementById('shop-root');
if (rootEl) {
    createRoot(rootEl).render(<ShopPage />);
}
