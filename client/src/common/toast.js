export function showToast(msg) {
    document.getElementById('avant-toast')?.remove();
    const t = document.createElement('div');
    t.id = 'avant-toast';
    t.textContent = msg;
    Object.assign(t.style, {
        position: 'fixed',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#000',
        color: '#fff',
        fontFamily: "'Montserrat', sans-serif",
        fontSize: '0.72rem',
        fontWeight: '600',
        letterSpacing: '1.5px',
        padding: '14px 28px',
        zIndex: '999999',
        pointerEvents: 'none',
        opacity: '0',
        transition: 'opacity 0.35s ease',
        maxWidth: '90vw',
        textAlign: 'center'
    });
    document.body.appendChild(t);
    requestAnimationFrame(() => { t.style.opacity = '1'; });
    setTimeout(() => {
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 400);
    }, 4500);
}
