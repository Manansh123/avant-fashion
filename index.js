const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const https = require('https');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const User = require('./models/User');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'Avant')));

// ================================================================
// CLOUDINARY CONFIG
// ================================================================
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
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
// MONGOOSE MODELS
// ================================================================
const userSchema = new mongoose.Schema({
    name:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    email:    { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const UserModel = mongoose.models.User || mongoose.model('User', userSchema);

const trendSchema = new mongoose.Schema({
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name:         { type: String, required: true },
    imageUrl:     { type: String, required: true },
    cloudinaryId: { type: String },
    createdAt:    { type: Date, default: Date.now }
});
const Trend = mongoose.models.Trend || mongoose.model('Trend', trendSchema);

const wardrobeSchema = new mongoose.Schema({
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    imageUrl:     { type: String, required: true },
    cloudinaryId: { type: String },
    createdAt:    { type: Date, default: Date.now }
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
        const existingUser = await UserModel.findOne({ email });
        if (existingUser) return res.status(400).json({ success: false, message: "Email already exists!" });
        const newUser = new UserModel({ name, email, password });
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
        const user = await UserModel.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "User not found. Please Sign Up." });
        if (user.password !== password) return res.status(401).json({ success: false, message: "Incorrect Password!" });
        res.status(200).json({ success: true, message: "Login successful! Welcome to AVANT.", name: user.name });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error during login." });
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
            const user = await UserModel.findOne({ name: userName.toLowerCase() });
            if (user) {
                const trend = new Trend({
                    userId:       user._id,
                    name:         trendName,
                    imageUrl:     cloudResult.secure_url,
                    cloudinaryId: cloudResult.public_id
                });
                await trend.save();
                savedToDb = true;
                console.log('✅ Trend saved to MongoDB for user:', userName);
            }
        }

        res.json({
            success:    true,
            imageUrl:   cloudResult.secure_url,
            savedToDb,
            message:    savedToDb ? "Trend saved permanently!" : "Trend uploaded (guest session only)"
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

        const user = await UserModel.findOne({ name: userName.toLowerCase() });
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

        const user = await UserModel.findOne({ name: userName.toLowerCase() });
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
            const user = await UserModel.findOne({ name: userName.toLowerCase() });
            if (user) {
                const item = new WardrobeItem({
                    userId:       user._id,
                    imageUrl:     cloudResult.secure_url,
                    cloudinaryId: cloudResult.public_id
                });
                await item.save();
                savedToDb = true;
                itemId = item._id;
                console.log('✅ Wardrobe item saved to MongoDB');
            }
        }

        res.json({
            success:  true,
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

        const user = await UserModel.findOne({ name: userName.toLowerCase() });
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

        const user = await UserModel.findOne({ name: userName.toLowerCase() });
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

// ================================================================
// CLEAN ROUTE: HANDLED DIRECTLY ON FRONTEND VIA CLIENT SCRIPT (GROQ)
// ================================================================
app.post('/api/style-advice', (req, res) => {
    res.json({ success: true, message: "Routing managed securely on the frontend loop." });
});

// OUTFIT BUILDER LOGIC (POLLINATIONS)
app.post('/api/generate-outfit-logic', async (req, res) => {
    try {
        const { item, aesthetic, color } = req.body;
        if (!item || !aesthetic || !color) {
            return res.status(400).json({ success: false, message: "Missing item, aesthetic, or color" });
        }
        const textPrompt = `Based on these details (Item: ${item}, Style: ${aesthetic}, Color: ${color}), write a 1-line caption explaining why this outfit matches the trend. Keep it clean, no hashtags, no markdown.`;
        const encodedTextTarget = encodeURIComponent(textPrompt);
        const options = {
            hostname: 'text.pollinations.ai',
            path: `/${encodedTextTarget}`,
            method: 'GET',
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 8000
        };
        const apiRequest = https.request(options, (apiResponse) => {
            let buffer = '';
            apiResponse.on('data', chunk => buffer += chunk);
            apiResponse.on('end', () => {
                if (buffer.trim().length > 5) {
                    res.json({ success: true, caption: buffer.trim() });
                } else {
                    res.json({ success: true, caption: `Perfect choice! This ${color} ${item} captures the pure essence of ${aesthetic} design.` });
                }
            });
        });
        apiRequest.on('error', () => {
            res.json({ success: true, caption: `Perfect choice! This ${color} ${item} captures the pure essence of ${aesthetic} design.` });
        });
        apiRequest.end();
    } catch (err) {
        res.json({ success: true, caption: "Looks flawless. Ready to wear." });
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

// ── ROUTE 1: OUTFIT LOGIC (caption + shopping list) ─────────────
app.post('/api/generate-outfit-logic', async (req, res) => {
    const {
        item            = 'outfit',
        color           = 'neutral',
        fabric          = 'cotton',
        aesthetic       = 'minimal',
        occasion        = 'casual',
        weather         = 'mild',
        footwear        = 'sneakers',
        additionalDetails = ''
    } = req.body;

    // Short prompt — safe for Pollinations text API
    const imagePrompt = `${aesthetic} ${item}, ${color} ${fabric}, editorial fashion, studio lighting`;

    const textPrompt = `Fashion stylist for AVANT. Outfit: ${color} ${fabric} ${item}, ${aesthetic} aesthetic, ${occasion}, ${footwear}. ${additionalDetails}
Return EXACTLY this format only:
CAPTION: [one poetic editorial line, max 15 words]
ITEMS: [5 comma-separated shopping items]`;

    let caption      = `A ${color} ${item} in ${aesthetic} style — made for ${occasion}.`;
    let shoppingItems = [item, footwear, `${color} accessories`, `${fabric} layer`, 'minimal watch'];

    try {
        const rawText = await new Promise((resolve, reject) => {
            const request = https.request({
                hostname: 'text.pollinations.ai',
                path: '/' + encodeURIComponent(textPrompt),
                method: 'GET',
                headers: { 'User-Agent': 'AVANT-App/1.0', Accept: 'text/plain' },
                timeout: 18000
            }, (response) => {
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => data.trim().length > 5 ? resolve(data.trim()) : reject(new Error('Empty')));
            });
            request.on('error', reject);
            request.on('timeout', () => { request.destroy(); reject(new Error('Timeout')); });
            request.end();
        });

        const captionMatch = rawText.match(/CAPTION:\s*(.+)/i);
        if (captionMatch?.[1]?.trim().length > 3) caption = captionMatch[1].trim();

        const itemsMatch = rawText.match(/ITEMS:\s*(.+)/i);
        if (itemsMatch?.[1]?.trim().length > 3)
            shoppingItems = itemsMatch[1].split(',').map(s => s.trim()).filter(Boolean);

        console.log('✅ Outfit logic OK | Caption:', caption);
    } catch (err) {
        console.warn('⚠️ Text API fallback:', err.message);
    }

    res.json({ success: true, imagePrompt, caption, shoppingItems });
});


// ── ROUTE 2: IMAGE PROXY ─────────────────────────────────────────
// Browser requests /api/proxy-image?prompt=xxx
// Server fetches from Pollinations (waits up to 90s)
// If Pollinations fails → redirects to Unsplash fashion photo
// ────────────────────────────────────────────────────────────────
app.get('/api/proxy-image', async (req, res) => {
    const prompt    = (req.query.prompt || 'fashion editorial').trim();
    const width     = req.query.width  || '512';
    const height    = req.query.height || '640';

    const pollinationsUrl =
        `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
        `?width=${width}&height=${height}&nologo=true`;

    console.log('🖼 Proxy image request:', prompt.substring(0, 60));

    try {
        // AbortController for 90-second hard timeout
        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), 90000);

        const imageRes = await fetch(pollinationsUrl, {
            signal:  controller.signal,
            headers: { 'User-Agent': 'AVANT-App/1.0' }
        });
        clearTimeout(timeoutId);

        if (!imageRes.ok) throw new Error(`Pollinations HTTP ${imageRes.status}`);

        const contentType = imageRes.headers.get('content-type') || '';
        if (!contentType.includes('image')) throw new Error('Non-image response from Pollinations');

        // Stream image back to browser
        const buffer = await imageRes.arrayBuffer();
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.send(Buffer.from(buffer));

        console.log('✅ Proxy image delivered | size:', buffer.byteLength, 'bytes');

    } catch (err) {
        console.warn('⚠️ Pollinations proxy failed:', err.message, '→ Unsplash fallback');

        // Unsplash instant fallback — real fashion photo, no API key needed
        const keywords = prompt.split(',').slice(0, 2)
            .join(' ').replace(/[^a-zA-Z0-9 ]/g, '').trim()
            .split(' ').filter(Boolean).slice(0, 3).join(',');

        const unsplashUrl = `https://source.unsplash.com/${width}x${height}/?fashion,${keywords || 'style'}`;
        res.redirect(302, unsplashUrl);
    }
});

// ================================================================
// END OF PHASE 4 ROUTES
// ================================================================


// ================================================================
// SERVER INITIALIZATION
// ================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Avant running at http://localhost:${PORT}`));