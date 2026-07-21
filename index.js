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
// ── FALLBACK: MINIMAL SAFE OUTFIT LOGIC (used only if Groq totally fails) ──
// Old giant hardcoded pairing tables removed — Groq is confirmed working,
// this only exists so the app doesn't crash if Groq/key is ever down.
function hardcodedFallback(req, res) {
    try {
        const { item, color, fabric, aesthetic, occasion, weather, footwear, gender, additionalDetails } = req.body;

        const genderNorm = (gender || 'unisex').toLowerCase().trim();
        const neutralBottom   = 'Straight Fit Pants';
        const neutralFootwear = footwear || 'White Sneakers';
        const neutralAcc      = 'Minimal watch, Simple chain';

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


// ── ROUTE 1: OUTFIT LOGIC — Groq generates full pairing + image prompt ──
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
  "imagePrompt": "FULL ready-to-use fashion editorial image generation prompt. Two models standing side by side, one male one female, BOTH wearing the exact same ${garmentDesc} — same color words used for both, no variation. Each with their own bottom/footwear/accessories as specified above. Style aesthetic, occasion, weather mood included. End with: clean white studio background, full body shot, sharp clothing detail, no face visible."
}`
        : `You are a fashion stylist AI. Given user's clothing pick, design a complete complementary outfit and output ONLY valid JSON, no prose, no markdown fences:
{
  "bottom": "string or null (null if item is already complete like Saree/Dress/Co-ord)",
  "footwear": "string",
  "accessories": "2-3 items, comma separated",
  "contrastColor": "string or null",
  "caption": "1-2 line stylist caption for the user",
  "imagePrompt": "FULL ready-to-use fashion editorial image generation prompt. Must include: garment, fabric, color, paired bottom (if any), footwear, accessories, aesthetic, occasion, weather mood. End with: clean white studio background, full body shot, sharp clothing detail, vertical 3:4 portrait, no face visible."
}

The garment (item, color, fabric) is FIXED regardless of gender — pair normally for a ${genderNorm} presentation.

CRITICAL for fabric: never just name the fabric — describe its visual TEXTURE, DRAPE, and SHEEN in the imagePrompt so it looks visually distinct in the image. Examples: Georgette → "flowing sheer georgette with soft, light drape and subtle crinkle texture"; Nylon → "smooth glossy nylon with a slight synthetic sheen and technical finish"; Silk → "lustrous silk with a smooth liquid sheen and fluid drape"; Cotton → "structured matte cotton with a natural woven texture"; Denim → "sturdy denim with visible twill weave and slight stiffness"; Linen → "textured linen with a relaxed, slightly wrinkled matte finish"; Leather → "smooth leather with visible sheen and structured stiffness". Match the given fabric to its real-world texture, don't default everything to a plain/cotton look.`;

    const userMsg = `item:${item}, color:${color}, fabric:${fabric}, aesthetic:${aesthetic}, occasion:${occasion}, weather:${weather}, footwear:${footwear || 'suggest one'}, gender:${genderNorm}, notes:${additionalDetails || 'none'}`;

    // Same fallback chain as trend.js
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
                        parsed.female.bottom, parsed.female.footwear
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
                    parsed.accessories?.split(',')[0]?.trim()
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
    const prompt    = (req.query.prompt || 'fashion lookbook editorial').trim();
    const width     = parseInt(req.query.width)  || 768;
    const height    = parseInt(req.query.height) || 1024;
    const genderRaw = (req.query.gender || '').toLowerCase().trim();
    const genderTerm = genderRaw === 'men' || genderRaw === 'male' ? 'male'
                     : genderRaw === 'women' || genderRaw === 'female' ? 'female'
                     : 'person';

    const seed = Math.floor(Math.random() * 999999);
    const finalPrompt = genderTerm === 'person' && genderRaw === 'unisex'
        ? `fashion editorial photography, ${prompt}, clean white studio background, vertical portrait, no face`
        : `solo portrait, exactly ONE ${genderTerm} model, no other people in frame, single person only, fashion editorial photography, full body shot, ${prompt}, clean white studio background, vertical portrait, no face`;

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