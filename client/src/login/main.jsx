import { createRoot } from 'react-dom/client';
import LoginPage from './LoginPage.jsx';

const rootEl = document.getElementById('login-root');
if (rootEl) {
    createRoot(rootEl).render(<LoginPage />);
}
