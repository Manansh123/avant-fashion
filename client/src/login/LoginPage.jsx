import { useEffect, useRef, useState } from 'react';

const GOOGLE_BTN_OPTIONS = {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    shape: 'pill',
    text: 'continue_with',
    logo_alignment: 'left',
    width: 400
};

const USERNAME_REGEX = /^[a-zA-Z0-9._]+$/;

export default function LoginPage() {
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [hideGoogleBtn, setHideGoogleBtn] = useState(false);
    const googleBtnRef = useRef(null);

    function toggleAuthMode(e) {
        e.preventDefault();
        setIsLoginMode((prev) => {
            const next = !prev;
            if (next) setName('');
            return next;
        });
    }

    function togglePasswordVisibility() {
        setShowPassword((prev) => !prev);
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (!isLoginMode) {
            if (!USERNAME_REGEX.test(name)) {
                alert('Username Error: Only letters, numbers, dots, and underscores allowed.');
                return;
            }
        }

        const endpoint = isLoginMode ? '/api/login' : '/api/signup';
        const payload = isLoginMode ? { email, password } : { name, email, password };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                if (data.name) {
                    const cleanName = data.name.toLowerCase().replace(/\s+/g, '');
                    localStorage.setItem('avantUserName', cleanName);
                }
                alert(data.message);
                window.location.replace('index.html');
            } else {
                alert('Error: ' + data.message);
            }
        } catch (error) {
            console.error('Critical Fetch Error:', error);
            alert('Server connection failed! Check console (F12).');
        }
    }

    useEffect(() => {
        let cancelled = false;
        let retryTimer = null;

        async function handleGoogleCredential(response) {
            try {
                const res = await fetch('/api/auth/google', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ credential: response.credential })
                });
                const data = await res.json();

                if (res.ok && data.success) {
                    localStorage.setItem('avantUserName', data.name.toLowerCase());
                    alert(data.message);
                    window.location.replace('index.html');
                } else {
                    alert('Google Sign-In failed: ' + (data.message || 'Unknown error'));
                }
            } catch (err) {
                console.error('Google auth request failed:', err);
                alert('Server connection failed during Google Sign-In.');
            }
        }

        async function initGoogleSignIn() {
            try {
                const cfgRes = await fetch('/api/config/google-client-id');
                const cfg = await cfgRes.json();

                if (cancelled) return;

                if (!cfg.clientId) {
                    console.warn('⚠ GOOGLE_CLIENT_ID not set in .env — hiding Google button');
                    setHideGoogleBtn(true);
                    return;
                }

                if (!window.google || !window.google.accounts || !window.google.accounts.id) {
                    retryTimer = setTimeout(initGoogleSignIn, 200);
                    return;
                }

                const btnEl = googleBtnRef.current;
                if (!btnEl) return;

                window.google.accounts.id.initialize({
                    client_id: cfg.clientId,
                    callback: handleGoogleCredential
                });

                btnEl.innerHTML = '';
                window.google.accounts.id.renderButton(btnEl, GOOGLE_BTN_OPTIONS);
            } catch (err) {
                console.error('Google Sign-In init failed:', err);
                if (!cancelled) setHideGoogleBtn(true);
            }
        }

        initGoogleSignIn();

        return () => {
            cancelled = true;
            if (retryTimer) clearTimeout(retryTimer);
        };
    }, []);

    return (
        <div className="login-split-container">
            <div className="login-auth-side">
                <div className="login-inner-wrap">
                    <a href="index.html" className="login-back-logo">
                        <img src="assets/logoname.png" alt="Avant" className="logo-name-image-login" />
                    </a>

                    <div className="login-title-section">
                        <h1 id="authTitle">{isLoginMode ? 'Log In' : 'Sign Up'}</h1>
                        <p id="authSubtitle">Enter your details to access the AVANT ecosystem.</p>
                    </div>

                    <div
                        id="googleSignInBtn"
                        ref={googleBtnRef}
                        style={hideGoogleBtn ? { display: 'none' } : undefined}
                    />

                    <div className="auth-divider"><span>Or email</span></div>

                    <form id="mainLoginForm" onSubmit={handleSubmit}>
                        <div
                            className="auth-input-group"
                            id="nameGroup"
                            style={{ display: isLoginMode ? 'none' : 'block' }}
                        >
                            <label>Full Name</label>
                            <input
                                type="text"
                                id="userNameInput"
                                placeholder="Enter Username"
                                minLength={5}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required={!isLoginMode}
                            />
                        </div>

                        <div className="auth-input-group">
                            <label>Email</label>
                            <input
                                type="email"
                                id="userEmail"
                                placeholder="Enter Email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="auth-input-group password-group">
                            <label>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="userPassword"
                                    placeholder="Enter Password"
                                    minLength={8}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    id="togglePassword"
                                    onClick={togglePasswordVisibility}
                                    style={{
                                        position: 'absolute',
                                        right: '10px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: '#000000',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontFamily: 'Montserrat'
                                    }}
                                >
                                    {showPassword ? 'HIDE' : 'SHOW'}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="auth-submit-btn" id="submitBtn">
                            {isLoginMode ? 'Log In' : 'Create Account'}
                        </button>
                    </form>

                    <p className="auth-footer-text" id="toggleText">
                        {isLoginMode ? (
                            <>No account? <a href="#" onClick={toggleAuthMode}>Sign Up here</a></>
                        ) : (
                            <>Already have an account? <a href="#" onClick={toggleAuthMode}>Log In here</a></>
                        )}
                    </p>
                </div>
            </div>

            <div className="login-visual-side">
                <div className="visual-overlay"></div>
                <img src="assets/login-img.jpg" alt="Avant Fashion Editorial" />
            </div>
        </div>
    );
}
