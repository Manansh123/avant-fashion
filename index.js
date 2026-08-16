const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const https = require('https');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const { OAuth2Client } = require('google-auth-library');
const { GoogleGenAI } = require('@google/genai');
const User = require('./models/User');
const app = express();
const sharp = require('sharp');
app.use(express.json());
app.use(express.static(path.join(__dirname, 'Avant')));

// ================================================================
// GOOGLE OAUTH CLIENT
// ================================================================
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ================================================================
// GEMINI AI CLIENT (Stylist chatbot)
// ================================================================
const genAI = process.env.GEMINI_API_KEY
    ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    : null;

const CHAT_SYSTEM_PROMPT = `You are an expert AVANT fashion stylist. Only discuss fashion, style, outfits, trends, colors, and personal styling — politely decline anything unrelated.

REPLY LENGTH: Keep every reply SHORT — 2 to 3 sentences maximum, unless the user explicitly asks for a detailed breakdown, a list, or multiple options. Do not pad with extra flair or repeat the same idea twice.

FORMAT: Plain conversational sentences by default. Only use bullet points if the user's question genuinely calls for a list (e.g. "give me 3 outfit ideas").

COLOR QUESTIONS: When asked about a color (e.g. "color of the day"), name the color, then in ONE short sentence say how to actually wear it day-to-day (e.g. what to pair it with, or where to use it — accessory vs statement piece).

TREND QUESTIONS: When asked about trends, name 1-2 specific trends in a short sentence — don't list five things.

TONE: Witty, honest, direct. Reference 2026 fashion when relevant. Never trail off mid-sentence — always finish your thought.`;


// ================================================================
// CLOUDINARY CONFIG
// ================================================================
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// ================================================================
// MULTER CONFIG
// ================================================================
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files allowed'), false);
    }
});

// ================================================================
// MONGOOSE MODELS (Trend / Wardrobe — User model comes from ./models/User)
// ================================================================
const trendSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    imageUrl: { type: String, required: true },
    cloudinaryId: { type: String },
    createdAt: { type: Date, default: Date.now }
});
const Trend = mongoose.models.Trend || mongoose.model('Trend', trendSchema);

const wardrobeSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    imageUrl: { type: String, required: true },
    cloudinaryId: { type: String },
    createdAt: { type: Date, default: Date.now }
});
const WardrobeItem = mongoose.models.WardrobeItem || mongoose.model('WardrobeItem', wardrobeSchema);

// ================================================================
// DB CONNECTION
// ================================================================
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/AvantDB')
    .then(() => console.log('✅ MongoDB Connected!'))
    .catch(err => console.log('❌ DB Error:', err.message));

// ================================================================
// HELPER: Upload buffer to Cloudinary
// ================================================================
function uploadToCloudinary(buffer, folder) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: `avant/${folder}`, resource_type: 'image' },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        const readable = new Readable();
        readable.push(buffer);
        readable.push(null);
        readable.pipe(stream);
    });
}

// ================================================================
// ROUTES
// ================================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Avant', 'index.html'));
});

// Signup
app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "All fields required!" });
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ success: false, message: "Email already exists!" });
        const newUser = new User({ name, email, password });
        await newUser.save();
        res.status(201).json({ success: true, message: "Account created! Now Log In.", name: newUser.name });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error during signup." });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "User not found. Please Sign Up." });
        if (user.authProvider === 'google' && !user.password) {
            return res.status(400).json({ success: false, message: "This account uses Google Sign-In. Please continue with Google." });
        }
        if (user.password !== password) return res.status(401).json({ success: false, message: "Incorrect Password!" });
        res.status(200).json({ success: true, message: "Login successful! Welcome to AVANT.", name: user.name });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error during login." });
    }
});

// Frontend needs the Google Client ID to init the Google Sign-In button —
// served from .env, never hardcoded in HTML/JS
app.get('/api/config/google-client-id', (req, res) => {
    res.json({ clientId: process.env.GOOGLE_CLIENT_ID || null });
});

// ================================================================
// GOOGLE SIGN-IN
// Frontend sends the ID token (credential) from Google Identity Services
// ================================================================
app.post('/api/auth/google', async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({ success: false, message: "Missing Google credential." });
        }

        // Verify the token with Google
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();

        const email = payload.email;
        const googleId = payload.sub;

        if (!email) {
            return res.status(400).json({ success: false, message: "Google account has no email." });
        }

        // Find existing user by googleId OR email
        let user = await User.findOne({ $or: [{ googleId }, { email }] });

        if (!user) {
            // Build a unique username from Google name/email
            let baseName = (payload.name || email.split('@')[0])
                .toLowerCase()
                .replace(/[^a-z0-9._]/g, '');
            if (!baseName) baseName = 'user' + Date.now();

            let candidateName = baseName;
            let suffix = 1;
            while (await User.findOne({ name: candidateName })) {
                candidateName = `${baseName}${suffix}`;
                suffix++;
            }

            user = new User({
                name: candidateName,
                email,
                googleId,
                authProvider: 'google'
                // no password — models/User.js now allows this
            });
            await user.save();
            console.log('✅ New Google user created:', user.name);
        } else if (!user.googleId) {
            // Existing local account, link Google to it
            user.googleId = googleId;
            await user.save();
            console.log('🔗 Linked Google to existing account:', user.name);
        }

        res.status(200).json({
            success: true,
            message: `Welcome, ${user.name}!`,
            name: user.name
        });

    } catch (error) {
        console.error('❌ Google auth error:', error.message);
        res.status(401).json({ success: false, message: "Google authentication failed. Please try again." });
    }
});

// ================================================================
// TREND UPLOAD ROUTES
// ================================================================
app.post('/api/upload-trend', upload.single('image'), async (req, res) => {
    try {
        const { trendName, userName } = req.body;

        if (!req.file) return res.status(400).json({ success: false, message: "No image uploaded" });
        if (!trendName) return res.status(400).json({ success: false, message: "Trend name required" });

        console.log(`📸 Trend upload: "${trendName}" by ${userName || 'guest'}`);

        const cloudResult = await uploadToCloudinary(req.file.buffer, 'trends');
        console.log('✅ Cloudinary upload success:', cloudResult.secure_url);

        let savedToDb = false;
        if (userName) {
            const user = await User.findOne({ name: userName.toLowerCase() });
            if (user) {
                const trend = new Trend({
                    userId: user._id,
                    name: trendName,
                    imageUrl: cloudResult.secure_url,
                    cloudinaryId: cloudResult.public_id
                });
                await trend.save();
                savedToDb = true;
                console.log('✅ Trend saved to MongoDB for user:', userName);
            }
        }

        res.json({
            success: true,
            imageUrl: cloudResult.secure_url,
            savedToDb,
            message: savedToDb ? "Trend saved permanently!" : "Trend uploaded (guest session only)"
        });

    } catch (error) {
        console.error('❌ Trend upload error:', error);
        res.status(500).json({ success: false, message: "Upload failed: " + error.message });
    }
});

app.get('/api/my-trends', async (req, res) => {
    try {
        const userName = req.headers['x-username'];
        if (!userName) return res.json({ success: true, trends: [] });

        const user = await User.findOne({ name: userName.toLowerCase() });
        if (!user) return res.json({ success: true, trends: [] });

        const trends = await Trend.find({ userId: user._id }).sort({ createdAt: -1 });
        res.json({ success: true, trends });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/my-trends/:id', async (req, res) => {
    try {
        const userName = req.headers['x-username'];
        if (!userName) return res.status(401).json({ success: false, message: "Not logged in" });

        const user = await User.findOne({ name: userName.toLowerCase() });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const trend = await Trend.findOne({ _id: req.params.id, userId: user._id });
        if (!trend) return res.status(404).json({ success: false, message: "Trend not found" });

        if (trend.cloudinaryId) {
            await cloudinary.uploader.destroy(trend.cloudinaryId);
        }

        await trend.deleteOne();
        res.json({ success: true, message: "Trend deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ================================================================
// WARDROBE UPLOAD ROUTES
// ================================================================
app.post('/api/upload-wardrobe', upload.single('image'), async (req, res) => {
    try {
        const { userName } = req.body;

        if (!req.file) return res.status(400).json({ success: false, message: "No image uploaded" });

        console.log(`👗 Wardrobe upload by ${userName || 'guest'}`);

        const cloudResult = await uploadToCloudinary(req.file.buffer, 'wardrobe');
        console.log('✅ Cloudinary wardrobe upload:', cloudResult.secure_url);

        let savedToDb = false;
        let itemId = null;

        if (userName) {
            const user = await User.findOne({ name: userName.toLowerCase() });
            if (user) {
                const item = new WardrobeItem({
                    userId: user._id,
                    imageUrl: cloudResult.secure_url,
                    cloudinaryId: cloudResult.public_id
                });
                await item.save();
                savedToDb = true;
                itemId = item._id;
                console.log('✅ Wardrobe item saved to MongoDB');
            }
        }

        res.json({
            success: true,
            imageUrl: cloudResult.secure_url,
            itemId,
            savedToDb,
            timestamp: new Date().toLocaleString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            })
        });

    } catch (error) {
        console.error('❌ Wardrobe upload error:', error);
        res.status(500).json({ success: false, message: "Upload failed: " + error.message });
    }
});

app.get('/api/my-wardrobe', async (req, res) => {
    try {
        const userName = req.headers['x-username'];
        if (!userName) return res.json({ success: true, items: [] });

        const user = await User.findOne({ name: userName.toLowerCase() });
        if (!user) return res.json({ success: true, items: [] });

        const items = await WardrobeItem.find({ userId: user._id }).sort({ createdAt: -1 });
        res.json({ success: true, items });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/my-wardrobe/:id', async (req, res) => {
    try {
        const userName = req.headers['x-username'];
        if (!userName) return res.status(401).json({ success: false, message: "Not logged in" });

        const user = await User.findOne({ name: userName.toLowerCase() });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const item = await WardrobeItem.findOne({ _id: req.params.id, userId: user._id });
        if (!item) return res.status(404).json({ success: false, message: "Item not found" });

        if (item.cloudinaryId) {
            await cloudinary.uploader.destroy(item.cloudinaryId);
        }

        await item.deleteOne();
        res.json({ success: true, message: "Item deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});


// Catch-all static pages route
app.get('/:page', (req, res) => {
    res.sendFile(path.join(__dirname, 'Avant', req.params.page));
});
// ================================================================
// PHASE 4 ROUTES — APPEND AT BOTTOM OF index.js
// DO NOT touch anything above this block
// ================================================================
// ── FALLBACK: MINIMAL SAFE OUTFIT LOGIC (used only if Groq totally fails) ──
function hardcodedFallback(req, res) {
    try {
        const { item, color, fabric, aesthetic, occasion, weather, footwear, gender, additionalDetails } = req.body;

        const neutralBottom = 'Straight Fit Pants';
        const neutralFootwear = footwear || 'White Sneakers';
        const neutralAcc = 'Minimal watch, Simple chain';

        const outfitDescription = `${color} ${fabric || ''} ${item} paired with ${neutralBottom}`.trim();
        const imagePrompt = `High fashion editorial lookbook photography. Complete outfit: ${outfitDescription}. Footwear: ${neutralFootwear}. Accessories: ${neutralAcc}. Style aesthetic: ${aesthetic || 'modern minimal'}. Occasion: ${occasion || 'street style'}. Weather: ${weather || 'clear'}. Clean white studio background, full body shot, sharp clothing detail, vertical 3:4 portrait, no face.`;

        console.log('⚠ Using minimal hardcoded fallback (Groq unavailable)');

        res.json({
            success: true,
            imagePrompt,
            caption: `${color} ${item} styled for ${aesthetic || 'the occasion'}.`,
            shoppingItems: [`${color} ${item}`, neutralBottom, neutralFootwear].filter(Boolean),
            pairingDetails: {
                mainItem: `${color} ${item}`,
                bottom: neutralBottom,
                footwear: neutralFootwear,
                accessory: neutralAcc,
                colorLogic: 'Neutral / fallback',
                isComplete: false
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}


// ── ROUTE 0b: SHOP COMPARE — real price/rating/reviews via SerpApi Google Shopping ──
app.get('/api/shop-compare', async (req, res) => {
    const query = (req.query.q || '').trim();
    if (!query) return res.status(400).json({ success: false, message: 'q required' });

    if (!process.env.SERPAPI_KEY) {
        console.warn('⚠ SERPAPI_KEY missing in .env');
        return res.status(500).json({ success: false, message: 'SERPAPI_KEY missing in .env' });
    }

    const targetSites = [
        'amazon.in', 'flipkart.com', 'myntra.com', 'ajio.com',
        'nykaafashion.com', 'tatacliq.com', 'snapdeal.com', 'meesho.com'
    ];

    function broadenQuery(q) {
        const words = q.trim().split(/\s+/);
        return words.length > 2 ? words.slice(1).join(' ') : q;
    }

    async function fetchShoppingResults(q) {
        const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(q)}&gl=in&hl=en&api_key=${process.env.SERPAPI_KEY}`;
        const sRes = await fetch(url, { signal: AbortSignal.timeout(15000) });
        const data = await sRes.json();
        if (data.error) throw new Error(data.error);
        return data.shopping_results || [];
    }

    const siteKeywords = {
        'nykaafashion.com': ['nykaa'],
        'tatacliq.com': ['tatacliq', 'tata cliq'],
        'snapdeal.com': ['snapdeal'],
        'meesho.com': ['meesho']
    };
    function matchSite(results, site) {
        const keywords = siteKeywords[site] || [site.split('.')[0]];
        return results.find(r => {
            const src = (r.source || '').toLowerCase();
            return keywords.some(k => src.includes(k));
        }) || null;
    }

    async function fetchProductDetail(productId) {
        if (!productId) return null;
        try {
            const url = `https://serpapi.com/search.json?engine=google_product&product_id=${encodeURIComponent(productId)}&gl=in&hl=en&api_key=${process.env.SERPAPI_KEY}`;
            const pRes = await fetch(url, { signal: AbortSignal.timeout(8000) });
            const data = await pRes.json();
            if (data.error) return null;

            const pr = data.product_results || {};
            const snippets = (data.reviews_results?.reviews || [])
                .slice(0, 3)
                .map(rv => ({
                    text: rv.snippet || rv.content || null,
                    rating: rv.rating || null,
                    source: rv.source || null
                }))
                .filter(s => s.text);

            const specs = pr.specifications || [];
            const materialSpec = specs.find(s =>
                /material|fabric/i.test(s.title || '')
            );

            return {
                rating: pr.rating || null,
                reviews: pr.reviews || null,
                snippets,
                material: materialSpec?.value || null
            };
        } catch (err) {
            console.warn('⚠ Product detail fetch failed:', err.message);
            return null;
        }
    }

    try {
        const firstPassResults = await fetchShoppingResults(query);

        let matched = targetSites.map(site => ({ site, found: matchSite(firstPassResults, site) }));
        const stillMissing = matched.filter(m => !m.found).map(m => m.site);

        if (stillMissing.length > 0) {
            const broader = broadenQuery(query);
            if (broader.toLowerCase() !== query.toLowerCase()) {
                try {
                    const secondPassResults = await fetchShoppingResults(broader);
                    const secondSources = [...new Set(secondPassResults.map(r => r.source).filter(Boolean))];
                    console.log(`🔍 Broadened retry ("${broader}") ne ye sources diye:`, secondSources.join(', ') || 'none');
                    matched = matched.map(m => {
                        if (m.found) return m;
                        const retryFound = matchSite(secondPassResults, m.site);
                        return retryFound ? { site: m.site, found: retryFound } : m;
                    });
                } catch (retryErr) {
                    console.warn('⚠ Broadened retry failed, keeping first-pass results:', retryErr.message);
                }
            }
        }

        const detailPromises = matched.map(m =>
            m.found ? fetchProductDetail(m.found.product_id) : Promise.resolve(null)
        );
        const details = await Promise.all(detailPromises);

        const results = matched.map(({ site, found }, i) => {
            if (!found) return { site, available: false };
            const detail = details[i];
            return {
                site,
                available: true,
                title: found.title,
                price: found.price || null,
                rating: found.rating || detail?.rating || null,
                reviews: found.reviews || detail?.reviews || null,
                snippets: detail?.snippets || [],
                thumbnail: found.thumbnail || null,
                link: found.product_link || found.link || null,
                delivery: found.delivery || null,
                badges: found.extensions || [],
                condition: found.second_hand_condition || null,
                material: detail?.material || null
            };
        });

        const uniqueSources = [...new Set(firstPassResults.map(r => r.source).filter(Boolean))];
        console.log(`🔍 SerpApi ne ye sources diye (query: "${query}"):`, uniqueSources.join(', ') || 'none');
        console.log(`✅ SerpApi shop-compare: ${results.filter(m => m.available).length}/${targetSites.length} platforms matched, ${results.filter(m => m.rating).length} have rating, ${results.reduce((a, r) => a + (r.snippets?.length || 0), 0)} review snippets total`);
        return res.json({ success: true, query, results });
    } catch (err) {
        console.error('❌ shop-compare failed:', err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
});


// ── ROUTE 0: TREND STYLE TIPS — trend.js ka Groq call ab backend se (secure) ──
app.post('/api/trend-style-tips', async (req, res) => {
    const { style } = req.body;
    if (!style) return res.status(400).json({ success: false, message: 'style required' });

    if (!process.env.GROQ_API_KEY_TRENDS) {
        console.warn('⚠ GROQ_API_KEY_TRENDS missing in .env');
        return res.status(500).json({ success: false, message: 'GROQ_API_KEY_TRENDS missing in .env' });
    }

    const prompt = `You are a fashion stylist for AVANT. Give exactly 5 styling tips for the "${style}" aesthetic for 2026. Plain text only. No markdown, no bold, no asterisks. Number each tip: 1. tip text. One tip per line. Output ONLY the 5 numbered tips.`;
    const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'];

    for (const model of models) {
        try {
            const gRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY_TRENDS}` },
                body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 300, temperature: 0.7 })
            });
            const json = await gRes.json();
            if (json?.error) {
                if (json.error.message?.includes('decommissioned')) { console.warn(`⚠ ${model} decommissioned`); continue; }
                console.warn(`⚠ ${model}: ${json.error.message}`);
                continue;
            }
            const text = json.choices?.[0]?.message?.content || '';
            if (text.trim().length > 10) {
                console.log(`✅ Trend tips (${model}) success`);
                return res.json({ success: true, text });
            }
        } catch (err) {
            console.warn(`⚠ ${model} failed:`, err.message);
        }
    }
    console.error('❌ All Groq models failed for trend tips');
    return res.status(500).json({ success: false, message: 'All Groq models failed' });
});


// ── ROUTE 1: OUTFIT LOGIC — Groq generates full pairing + image prompt ──
app.post('/api/generate-outfit-logic', async (req, res) => {
    const { item, color, fabric, aesthetic, occasion, weather, footwear, gender, additionalDetails } = req.body;

    if (!process.env.GROQ_API_KEY_OUTFIT) {
        console.warn('⚠ GROQ_API_KEY_OUTFIT missing, using hardcoded fallback');
        return hardcodedFallback(req, res);
    }

    const genderNorm = (gender || 'unisex').toLowerCase().trim();
    const isUnisex = genderNorm === 'unisex';
    console.log(`🎯 Outfit request — gender received: "${gender}" → normalized: "${genderNorm}" → path: ${isUnisex ? 'DUAL (unisex)' : 'SINGLE (' + genderNorm + ')'}`);
    const garmentDesc = `${color} ${fabric || ''} ${item}`.replace(/\s+/g, ' ').trim();

    const sysPrompt = isUnisex
        ? `You are a fashion stylist AI. The user's main garment is: "${garmentDesc}". This EXACT garment is worn by BOTH models — identical color, identical fabric, identical print/pattern, identical fit. Design TWO pairings around this same garment: one for a male model, one for a female model. Each model's bottom/footwear/accessories are chosen INDEPENDENTLY — they can end up the same or different, whichever genuinely fits best. Do not force a difference and do not force sameness.

CRITICAL for imagePrompt: use the EXACT SAME words for the garment's color/fabric/pattern in both model descriptions — do not use synonyms or reinterpret the color (e.g. if user said "Mint Green", write "Mint Green" both times, never "teal" for one and "forest green" for the other). Any color/pattern drift between the two models is a failure.

CRITICAL for fabric: never just name the fabric — describe its visual TEXTURE, DRAPE, and SHEEN so it looks visually distinct in the image. Examples: Georgette → "flowing sheer georgette with soft, light drape and subtle crinkle texture"; Nylon → "smooth glossy nylon with a slight synthetic sheen and technical finish"; Silk → "lustrous silk with a smooth liquid sheen and fluid drape"; Cotton → "structured matte cotton with a natural woven texture"; Denim → "sturdy denim with visible twill weave and slight stiffness"; Linen → "textured linen with a relaxed, slightly wrinkled matte finish"; Leather → "smooth leather with visible sheen and structured stiffness". Match the given fabric to its real-world texture, don't default everything to a plain/cotton look.

Output ONLY valid JSON, no prose, no markdown fences:
{
  "male":   { "bottom": "string or null", "footwear": "string", "accessories": "2-3 items, comma separated" },
  "female": { "bottom": "string or null", "footwear": "string", "accessories": "2-3 items, comma separated" },
  "contrastColor": "string or null",
  "caption": "1-2 line stylist caption mentioning both looks",
  "imagePrompt": "MAX 550 characters. FULL ready-to-use fashion editorial image generation prompt. Two models standing side by side, one male one female, BOTH wearing the exact same ${garmentDesc} — same color words used for both, no variation. Each with their own bottom/footwear/accessories as specified above. Style aesthetic, occasion, weather mood included. End with: clean white studio background, full body shot, sharp clothing detail, no face visible."
}`
        : `You are a fashion stylist AI. Given user's clothing pick, design a complete complementary outfit and output ONLY valid JSON, no prose, no markdown fences:
{
  "bottom": "string or null (null if item is already complete like Saree/Dress/Co-ord)",
  "footwear": "string",
  "accessories": "2-3 items, comma separated",
  "contrastColor": "string or null",
  "caption": "1-2 line stylist caption for the user",
  "imagePrompt": "MAX 550 characters. FULL ready-to-use fashion editorial image generation prompt. Must include: garment, fabric, color, paired bottom (if any), footwear, accessories, aesthetic, occasion, weather mood. End with: clean white studio background, full body shot, sharp clothing detail, vertical 3:4 portrait, no face visible."
}

The garment (item, color, fabric) is FIXED regardless of gender — pair normally for a ${genderNorm} presentation.

CRITICAL for fabric: never just name the fabric — describe its visual TEXTURE, DRAPE, and SHEEN in the imagePrompt so it looks visually distinct in the image. Examples: Georgette → "flowing sheer georgette with soft, light drape and subtle crinkle texture"; Nylon → "smooth glossy nylon with a slight synthetic sheen and technical finish"; Silk → "lustrous silk with a smooth liquid sheen and fluid drape"; Cotton → "structured matte cotton with a natural woven texture"; Denim → "sturdy denim with visible twill weave and slight stiffness"; Linen → "textured linen with a relaxed, slightly wrinkled matte finish"; Leather → "smooth leather with visible sheen and structured stiffness". Match the given fabric to its real-world texture, don't default everything to a plain/cotton look.`;

    const userMsg = `item:${item}, color:${color}, fabric:${fabric}, aesthetic:${aesthetic}, occasion:${occasion}, weather:${weather}, footwear:${footwear || 'suggest one'}, gender:${genderNorm}, notes:${additionalDetails || 'none'}`;

    const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'];

    for (const model of models) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000); // 8s cap per model

            const gRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY_OUTFIT}` },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: userMsg }],
                    max_tokens: 400,
                    temperature: 0.8
                }),
                signal: controller.signal
            });
            clearTimeout(timeout);

            const json = await gRes.json();
            if (json?.error) { console.warn(`⚠ ${model}: ${json.error.message}`); continue; }

            const raw = json.choices?.[0]?.message?.content || '';
            const match = raw.match(/\{[\s\S]*\}/);
            if (!match) { console.warn(`⚠ ${model}: no JSON in response`); continue; }

            const parsed = JSON.parse(match[0]);
            if (!parsed.imagePrompt) { console.warn(`⚠ ${model}: missing imagePrompt`); continue; }

            console.log(`✅ Groq (${model}) generated outfit pairing`);

            if (isUnisex) {
                if (!parsed.male || !parsed.female) { console.warn(`⚠ ${model}: missing male/female pairing`); continue; }
                console.log('🧪 Debug — unisex dual pairing | male:', parsed.male, '| female:', parsed.female);
                return res.json({
                    success: true,
                    imagePrompt: parsed.imagePrompt,
                    caption: parsed.caption || `${color} ${item} styled two ways for ${aesthetic || 'the occasion'}.`,
                    shoppingItems: [
                        `${color} ${item}`,
                        parsed.male.bottom, parsed.male.footwear,
                        parsed.female.bottom, parsed.female.footwear,
                        ...(parsed.male.accessories?.split(',').map(a => a.trim()).filter(Boolean) || []),
                        ...(parsed.female.accessories?.split(',').map(a => a.trim()).filter(Boolean) || [])
                    ].filter(Boolean),
                    pairingDetails: {
                        mainItem: `${color} ${item}`,
                        male: parsed.male,
                        female: parsed.female,
                        colorLogic: parsed.contrastColor ? `${color} × ${parsed.contrastColor}` : 'Monochrome / complete',
                        isComplete: !parsed.male.bottom && !parsed.female.bottom
                    }
                });
            }

            console.log('🧪 Debug — gender:', genderNorm, '| bottom:', parsed.bottom, '| footwear:', parsed.footwear, '| accessories:', parsed.accessories);
            return res.json({
                success: true,
                imagePrompt: parsed.imagePrompt,
                caption: parsed.caption || `${color} ${item} styled for ${aesthetic || 'the occasion'}.`,
                shoppingItems: [
                    `${color} ${item}`,
                    parsed.bottom,
                    parsed.footwear,
                    ...(parsed.accessories?.split(',').map(a => a.trim()).filter(Boolean) || [])
                ].filter(Boolean),
                pairingDetails: {
                    mainItem: `${color} ${item}`,
                    bottom: parsed.bottom || 'Complete outfit',
                    footwear: parsed.footwear,
                    accessory: parsed.accessories,
                    colorLogic: parsed.contrastColor ? `${color} × ${parsed.contrastColor}` : 'Monochrome / complete',
                    isComplete: !parsed.bottom
                }
            });
        } catch (err) {
            console.warn(`⚠ ${model} failed:`, err.message);
        }
    }

    console.error('❌ All Groq models failed, falling back to hardcoded sheet');
    return hardcodedFallback(req, res);
});


// ── ROUTE 2: IMAGE PROXY — always pipes through server, never redirects ──
app.get('/api/proxy-image', async (req, res) => {
    const prompt = (req.query.prompt || 'fashion lookbook editorial').trim();
    const width = parseInt(req.query.width) || 768;
    const height = parseInt(req.query.height) || 1024;
    const genderRaw = (req.query.gender || '').toLowerCase().trim();
    const mode = (req.query.mode || '').toLowerCase().trim();
    const genderTerm = genderRaw === 'men' || genderRaw === 'male' ? 'male'
        : genderRaw === 'women' || genderRaw === 'female' ? 'female'
            : 'person';

    const seed = Math.floor(Math.random() * 999999);
    let finalPrompt = mode === 'product'
        ? `e-commerce product photography, ${prompt}, single garment flat lay or on invisible mannequin, plain white background, studio lighting, sharp detail, no person, no model, no text, no logo, no watermark`
        : genderTerm === 'person' && genderRaw === 'unisex'
            ? `fashion editorial photography, ${prompt}, clean white studio background, vertical portrait, no face`
            : `solo portrait, exactly ONE ${genderTerm} model, no other people in frame, single person only, fashion editorial photography, full body shot, ${prompt}, clean white studio background, vertical portrait, no face`;

    // Cloudflare ka flux-1-schnell bahut lambe prompt pe "Invalid input" de deta —
    // safe length tak cap karo, word-boundary pe cut karo (beech shabd mein nahi)
    const MAX_PROMPT_LEN = 900;
    if (finalPrompt.length > MAX_PROMPT_LEN) {
        finalPrompt = finalPrompt.slice(0, MAX_PROMPT_LEN);
        finalPrompt = finalPrompt.slice(0, finalPrompt.lastIndexOf(' ')); // beech shabd mein mat kaato
    }

    console.log('☁️ Cloudflare Workers AI call...');
    console.log(`📝 Prompt (${finalPrompt.length} chars):`, finalPrompt);

    const CF_TOKEN = process.env.CF_TOKEN;
    const CF_ACCOUNT = process.env.CF_ACCOUNT_ID;

    if (!CF_TOKEN || !CF_ACCOUNT) {
        console.error('❌ CF_TOKEN ya CF_ACCOUNT_ID missing hai .env mein');
        return res.status(500).json({ success: false, message: 'Cloudflare credentials missing in .env' });
    }

    const cfBody = JSON.stringify({ prompt: finalPrompt });

    const options = {
        hostname: 'api.cloudflare.com',
        path: `/client/v4/accounts/${CF_ACCOUNT}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${CF_TOKEN}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(cfBody)
        }
    };

    callCloudflareImage(cfBody, options, 1, 3, (err, result) => {
        if (err) {
            console.error('❌ All Cloudflare attempts failed:', err.message);
            return res.status(500).json({ success: false, message: 'Image generation failed. Please retry.' });
        }
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Cache-Control', 'no-store');
        res.send(result.buffer);
    });
});

// Last last resort - agar Unsplash bhi fail ho
function serveHardcodedFallback(res) {
    console.log('⚠️ All fallbacks failed');
    res.status(500).json({ success: false, message: 'Image generation failed. Please retry.' });
}

function callCloudflareImage(cfBody, options, attempt, maxAttempts, onDone) {
    console.log(`☁️ Cloudflare attempt ${attempt}/${maxAttempts}...`);

    const cfReq = https.request(options, (cfRes) => {
        const chunks = [];
        cfRes.on('data', c => chunks.push(c));
        cfRes.on('end', () => {
            const buf = Buffer.concat(chunks);
            const ct  = cfRes.headers['content-type'] || '';

            console.log(`📊 CF Status: ${cfRes.statusCode} | Content-Type: ${ct}`);

            if (cfRes.statusCode === 200 && ct.startsWith('image/')) {
                console.log('✅ Cloudflare direct image! Bytes:', buf.length);
                return onDone(null, { buffer: buf, contentType: ct });
            }

            if (cfRes.statusCode === 200) {
                try {
                    const json = JSON.parse(buf.toString());
                    if (json.result?.image) {
                        const imgBuf = Buffer.from(json.result.image, 'base64');
                        console.log('✅ Cloudflare base64 image! Bytes:', imgBuf.length);
                        return onDone(null, { buffer: imgBuf, contentType: 'image/png' });
                    }
                } catch (e) { /* fall through to retry */ }
            }

            console.error('❌ CF Error:', buf.toString().slice(0, 300));

            if (attempt < maxAttempts) {
                return callCloudflareImage(cfBody, options, attempt + 1, maxAttempts, onDone);
            }
            onDone(new Error('Image generation failed after multiple attempts'));
        });
    });

    cfReq.on('error', (e) => {
        console.error('❌ CF request error:', e.message);
        if (attempt < maxAttempts) {
            callCloudflareImage(cfBody, options, attempt + 1, maxAttempts, onDone);
        } else {
            onDone(e);
        }
    });

    cfReq.setTimeout(60000, () => {
        cfReq.destroy();
        console.error('❌ CF timeout');
        if (attempt < maxAttempts) {
            callCloudflareImage(cfBody, options, attempt + 1, maxAttempts, onDone);
        } else {
            onDone(new Error('Image generation timed out after multiple attempts'));
        }
    });

    cfReq.write(cfBody);
    cfReq.end();
}

// ================================================================
// ROUTE 3: CHAT AI — Stylist chatbot (text + optional image)
// ================================================================
function extractGeminiReplyText(response) {
    if (response.text && response.text.trim().length > 0) {
        return response.text.trim();
    }
    const parts = response.candidates?.[0]?.content?.parts || [];
    const answerParts = parts.filter(p => !p.thought && p.text);
    if (answerParts.length > 0) {
        return answerParts.map(p => p.text).join('').trim();
    }
    return null;
}


app.post('/api/chat-ai', upload.single('image'), async (req, res) => {
    try {
        const userMessage = (req.body.message || '').trim();
        const imageFile = req.file;

        if (!userMessage && !imageFile) {
            return res.status(400).json({ success: false, message: 'Message or image required' });
        }

        if (!genAI) {
            console.warn('⚠ GEMINI_API_KEY missing in .env');
            return res.status(500).json({ success: false, message: 'GEMINI_API_KEY missing in .env' });
        }

        let imageUrl = null;
        const parts = [];

        if (imageFile) {
            parts.push({
                inlineData: {
                    mimeType: imageFile.mimetype,
                    data: imageFile.buffer.toString('base64')
                }
            });
            try {
                const cloudResult = await uploadToCloudinary(imageFile.buffer, 'chat');
                imageUrl = cloudResult.secure_url;
            } catch (cloudErr) {
                console.warn('⚠ Cloudinary upload failed (chat image):', cloudErr.message);
            }
        }

        parts.push({ text: userMessage || 'Please analyze this outfit/photo.' });

        const models = ['gemini-flash-latest', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];
        let replyText = null;
        let lastErr = null;

        for (const modelName of models) {
            try {
                // NOTE: no thinkingConfig at all — the budget/level fields kept
                // conflicting across model versions. Removing it entirely avoids
                // the argument error; maxOutputTokens stays high as the safety net.
                const response = await genAI.models.generateContent({
                    model: modelName,
                    contents: [{ role: 'user', parts }],
                    config: {
                        systemInstruction: CHAT_SYSTEM_PROMPT,
                        maxOutputTokens: 1024,
                        thinkingConfig: { thinkingLevel: 'LOW' }   // akela field — pehle wala error tha jab budget+level dono saath bheje the
                    }
                });

                const finishReason = response.candidates?.[0]?.finishReason;
                console.log(`🔍 [${modelName}] finishReason: ${finishReason} | usage:`, JSON.stringify(response.usageMetadata));

                replyText = extractGeminiReplyText(response);

                if (replyText && replyText.length > 0) {
                    console.log(`✅ Gemini (${modelName}) replied — ${replyText.length} chars`);
                    break;
                } else {
                    console.warn(`⚠ ${modelName}: no usable answer text (finishReason: ${finishReason})`);
                }
            } catch (err) {
                console.warn(`⚠ Gemini ${modelName} failed:`, err.message);
                lastErr = err;
            }
        }

        if (!replyText) {
            throw lastErr || new Error('Gemini returned no usable reply');
        }

        res.json({ success: true, reply: replyText, imageUrl });

    } catch (err) {
        console.error('❌ chat-ai error:', err.message);
        res.status(500).json({ success: false, message: 'Stylist AI is unavailable right now: ' + err.message });
    }
});


// ================================================================
// ROUTE 4: VIRTUAL TRY-ON — via IDM-VTON (free Hugging Face Space)
// ================================================================
function fetchImageBuffer(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (r) => {
            if (r.statusCode >= 400) {
                return reject(new Error(`Failed to fetch image (status ${r.statusCode})`));
            }
            const chunks = [];
            r.on('data', c => chunks.push(c));
            r.on('end', () => resolve(Buffer.concat(chunks)));
        }).on('error', reject);
    });
}

async function describeGarment(buffer, mimeType) {
    if (!genAI) return 'a clothing item';
    try {
        const response = await genAI.models.generateContent({
            model: 'gemini-flash-latest',
            contents: [{
                role: 'user',
                parts: [
                    { inlineData: { mimeType, data: buffer.toString('base64') } },
                    { text: 'Describe this single clothing item in under 10 words for a virtual try-on system (e.g. "white cotton crew-neck t-shirt"). Output ONLY the description, nothing else.' }
                ]
            }]
        });
        const text = response.text?.trim();
        return text && text.length > 0 ? text : 'a clothing item';
    } catch (err) {
        console.warn('⚠ Garment description failed, using generic fallback:', err.message);
        return 'a clothing item';
    }
}

app.post(
    '/api/virtual-tryon',
    upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'garmentPhoto', maxCount: 1 }]),
    async (req, res) => {
        try {
            const photoFile = req.files?.photo?.[0];
            const garmentUploadFile = req.files?.garmentPhoto?.[0];
            const lookImageUrl = (req.body.lookImageUrl || '').trim();

            if (!photoFile || (!garmentUploadFile && !lookImageUrl)) {
                return res.status(400).json({ success: false, message: 'Your photo and a garment (upload or saved look) are required.' });
            }

            // Garment bytes: either directly uploaded, or fetched from the
            // selected wardrobe look's Cloudinary URL.
            let garmentBuffer, garmentMime;
            if (garmentUploadFile) {
                garmentBuffer = garmentUploadFile.buffer;
                garmentMime = garmentUploadFile.mimetype;
            } else {
                garmentBuffer = await fetchImageBuffer(lookImageUrl);
                garmentMime = lookImageUrl.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
            }

            const garmentDes = await describeGarment(garmentBuffer, garmentMime);
            console.log('🧥 Garment description:', garmentDes);

            const { Client } = await import('@gradio/client');

            console.log('🔌 Connecting to IDM-VTON...');
            const client = await Client.connect('yisol/IDM-VTON', {
                token: process.env.HF_TOKEN || undefined
            });

            // Convert both images to PNG regardless of original format (AVIF, WebP,
            // HEIC, etc.) — IDM-VTON's Python backend may not decode newer formats.
            const personPng = await sharp(photoFile.buffer).png().toBuffer();
            const garmentPng = await sharp(garmentBuffer).png().toBuffer();

            const personBlob = new Blob([personPng], { type: 'image/png' });
            const garmentBlob = new Blob([garmentPng], { type: 'image/png' });

            console.log('🎨 Running try-on...');
            const tryonPromise = client.predict('/tryon', {
    dict: { background: personBlob, layers: [], composite: null },
    garm_img: garmentBlob,
    garment_des: garmentDes,
    is_checked: true,
    is_checked_crop: false,
    denoise_steps: 20,
    seed: Math.floor(Math.random() * 999999)
});

const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('IDM-VTON took too long to respond (over 90s) — the free queue may be stuck or overloaded.')), 90000)
);

const result = await Promise.race([tryonPromise, timeoutPromise]);

            console.log('🔍 IDM-VTON raw result:', JSON.stringify(result.data).slice(0, 300));

            const outputImage = result.data?.[0];
            let resultBuffer;

            if (outputImage?.url) {
                resultBuffer = await fetchImageBuffer(outputImage.url);
            } else if (typeof outputImage === 'string' && outputImage.startsWith('http')) {
                resultBuffer = await fetchImageBuffer(outputImage);
            } else {
                console.error('❌ Unexpected IDM-VTON response shape:', outputImage);
                throw new Error('Could not read the result image from IDM-VTON.');
            }

            const cloudResult = await uploadToCloudinary(resultBuffer, 'tryon');
            res.json({ success: true, imageUrl: cloudResult.secure_url });

        } catch (err) {
            console.error('❌ virtual-tryon error:', err.message);
            console.error('❌ Full error object:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
            res.status(500).json({ success: false, message: 'Virtual try-on failed: ' + err.message });
        }
    }
);

// ================================================================
// SERVER INITIALIZATION
// ================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Avant running at http://localhost:${PORT}`));