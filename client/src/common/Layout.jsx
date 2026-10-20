import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';

export default function Layout({ children }) {
    return (
        <>
            <Navbar />
            {children}
            <Footer />
        </>
    );
}
