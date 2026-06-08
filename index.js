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


// Catch-all static pages route
app.get('/:page', (req, res) => {
    res.sendFile(path.join(__dirname, 'Avant', req.params.page));
});
// ================================================================
// PHASE 4 ROUTES — APPEND AT BOTTOM OF index.js
// DO NOT touch anything above this block
// ================================================================
// ── ROUTE 1: OUTFIT LOGIC (FIXED PARAMETERS SYNC) ──
app.post('/api/generate-outfit-logic', (req, res) => {
    try {
        const { item, color, fabric, aesthetic, occasion, weather, footwear, additionalDetails } = req.body;

        // Structured single string logic to command Pollinations to draw 3:4 portrait clothing layout
        const imagePrompt = `Full length professional lookbook presentation displaying a highly coordinated clothing outfit ensemble. Model wearing a tailored premium ${color || 'neutral'} ${fabric || 'textured'} ${item || 'Garment'} fully embodying the pure details of ${aesthetic || 'minimalist'} style, curated beautifully for ${occasion || 'presentation'} during ${weather || 'clear'} conditions, matching high fashion ${footwear || 'shoes'}. Clean minimal studio background, vertical 3:4 ratio clothing framing, hyper-detailed apparel, no visible human faces or heads.`;

        const shoppingItems = [];
        if (item) shoppingItems.push(`${color || ''} ${fabric || ''} ${item}`.trim());
        if (footwear) shoppingItems.push(`${color || 'Matching'} ${footwear}`.trim());

        const caption = `The crisp ${color || 'clean'} visual layers matching elements built around a high-end ${aesthetic || 'minimalist'} focus. Calibrated perfectly for ${occasion || 'your presentation'}.`;

        res.json({ success: true, imagePrompt, caption, shoppingItems });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


// ── ROUTE 2: IMAGE PROXY — always pipes through server, never redirects ──
app.get('/api/proxy-image', async (req, res) => {
    const prompt    = (req.query.prompt || 'fashion lookbook editorial').trim();
    const width     = parseInt(req.query.width)  || 768;
    const height    = parseInt(req.query.height) || 1024;
    const genderRaw = (req.query.gender || '').toLowerCase().trim();
    const genderTerm = genderRaw === 'men' || genderRaw === 'male' ? 'male'
                     : genderRaw === 'women' || genderRaw === 'female' ? 'female'
                     : 'person';

    const seed = Math.floor(Math.random() * 999999);
    const finalPrompt = `fashion editorial photography, single ${genderTerm} model, full body portrait, ${prompt}, clean white studio background, vertical portrait, no face`;

    console.log('☁️ Cloudflare Workers AI call...');
    console.log('📝 Prompt:', finalPrompt.slice(0, 80) + '...');

    const CF_TOKEN   = process.env.CF_TOKEN;
    const CF_ACCOUNT = process.env.CF_ACCOUNT_ID;

    if (!CF_TOKEN || !CF_ACCOUNT) {
        console.error('❌ CF_TOKEN ya CF_ACCOUNT_ID missing hai .env mein');
        return res.status(500).json({ success: false, message: 'Cloudflare credentials missing in .env' });
    }

    const cfBody = JSON.stringify({
        prompt: finalPrompt,
        num_steps: 8,
        width:  width,
        height: height
    });

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

    const cfReq = https.request(options, (cfRes) => {
        const chunks = [];
        cfRes.on('data', c => chunks.push(c));
        cfRes.on('end', () => {
            const buf = Buffer.concat(chunks);
            const ct  = cfRes.headers['content-type'] || '';

            console.log('📊 CF Status:', cfRes.statusCode);
            console.log('📊 CF Content-Type:', ct);

            if (cfRes.statusCode !== 200) {
                console.error('❌ CF Error:', buf.toString().slice(0, 200));
                // Picsum fallback
                return servePicsum(res, seed, width, height);
            }

            // Case 1: Direct image response
            if (ct.startsWith('image/')) {
                console.log('✅ Cloudflare direct image! Bytes:', buf.length);
                res.setHeader('Content-Type', ct);
                res.setHeader('Cache-Control', 'no-store');
                return res.send(buf);
            }

            // Case 2: JSON with base64
            try {
                const json = JSON.parse(buf.toString());
                if (json.result?.image) {
                    const imgBuf = Buffer.from(json.result.image, 'base64');
                    console.log('✅ Cloudflare base64 image! Bytes:', imgBuf.length);
                    res.setHeader('Content-Type', 'image/png');
                    res.setHeader('Cache-Control', 'no-store');
                    return res.send(imgBuf);
                }
                console.error('❌ CF JSON no image field:', JSON.stringify(json).slice(0, 200));
            } catch (e) {
                console.error('❌ CF parse error:', e.message);
            }

            // Fallback
            return servePicsum(res, seed, width, height);
        });
    });

    cfReq.on('error', (e) => {
        console.error('❌ CF request error:', e.message);
        servePicsum(res, seed, width, height);
    });

    cfReq.setTimeout(60000, () => {
        cfReq.destroy();
        console.error('❌ CF timeout');
        servePicsum(res, seed, width, height);
    });

    cfReq.write(cfBody);
    cfReq.end();
});


// Picsum helper — sirf last resort
function servePicsum(res, seed, width, height) {
    console.log('📸 Unsplash fashion fallback...');
    
    // Fashion specific Unsplash photo IDs - yeh sab fashion/outfit images hain
    const fashionPhotos = [
        'photo-1539109136881-3be0616acf4b', // fashion model street
        'photo-1515886657613-9f3515b0c78f', // fashion model studio
        'photo-1469334031218-e382a71b716b', // fashion editorial
        'photo-1558618666-fcd25c85cd64', // outfit flat lay
        'photo-1496747611176-843222e1e57c', // model walking
        'photo-1509631179647-0177331693ae', // fashion shoot
        'photo-1581044777550-4cfa60707c03', // editorial fashion
        'photo-1475180098004-ca77a66827be', // model outfit
        'photo-1434389677669-e08b4cac3105', // fashion street
        'photo-1485968579580-b6d095142e6e', // model lookbook
    ];
    
    // Seed se consistent but varied selection
    const photoId = fashionPhotos[seed % fashionPhotos.length];
    const url = `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${width}&h=${height}&q=80`;
    
    console.log('📸 Using Unsplash fashion photo:', photoId);
    
    https.get(url, { headers: { 'User-Agent': 'AvantApp/1.0' } }, (pRes) => {
        // Unsplash redirects karta hai - follow karna padega
        if (pRes.statusCode === 301 || pRes.statusCode === 302) {
            const redirectUrl = pRes.headers.location;
            https.get(redirectUrl, { headers: { 'User-Agent': 'AvantApp/1.0' } }, (rRes) => {
                const chunks = [];
                rRes.on('data', c => chunks.push(c));
                rRes.on('end', () => {
                    res.setHeader('Content-Type', 'image/jpeg');
                    res.setHeader('Cache-Control', 'no-store');
                    res.send(Buffer.concat(chunks));
                });
            }).on('error', () => serveHardcodedFallback(res));
            return;
        }
        
        const chunks = [];
        pRes.on('data', c => chunks.push(c));
        pRes.on('end', () => {
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Cache-Control', 'no-store');
            res.send(Buffer.concat(chunks));
        });
    }).on('error', () => serveHardcodedFallback(res));
}

// Last last resort - agar Unsplash bhi fail ho
function serveHardcodedFallback(res) {
    console.log('⚠️ All fallbacks failed');
    res.status(500).json({ success: false, message: 'Image generation failed. Please retry.' });
}


// ================================================================
// SERVER INITIALIZATION
// ================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Avant running at http://localhost:${PORT}`));