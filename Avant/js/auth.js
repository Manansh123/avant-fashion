// Function jo navbar ko update karega
function updateNavbarAuth() {
    const userName = localStorage.getItem('avantUserName');
    const authBtn = document.getElementById('authBtn');

    if (userName && authBtn) {
        // Username lowercase handle style mein dikhao
        authBtn.innerText = `@${userName.toLowerCase()}`;
        authBtn.href = "#"; 
        authBtn.style.cursor = "pointer";

        // Logout functionality
        authBtn.onclick = function (e) {
            e.preventDefault();
            if (confirm("Logout from Avant Ecosystem?")) {
                localStorage.removeItem('avantUserName');
                window.location.href = "index.html"; 
            }
        };
    }
}

// Function jo components load karega (Navbar/Footer)
async function loadLayout(callback) {
    try {
        const navRes = await fetch('navbar.html');
        const navHtml = await navRes.text();
        document.getElementById('nav-placeholder').innerHTML = navHtml;

        // Navbar load hote hi auth check karo
        updateNavbarAuth();

        // Agar footer placeholder hai toh wo bhi load kar lo
        const footerPlace = document.getElementById('footer-placeholder');
        if (footerPlace) {
            const footRes = await fetch('footer.html');
            const footHtml = await footRes.text();
            footerPlace.innerHTML = footHtml;
        }

        if (callback) callback();
    } catch (err) {
        console.error("Layout error:", err);
    }
}