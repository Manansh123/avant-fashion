require('dotenv').config();
const express = require('express');
const path = require('path');
const https = require('https');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const User = require('./models/User');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ================================================================
// GEMINI CONFIG — needs GEMINI_API_KEY in .env
// ================================================================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
let geminiModel = null;
try {
    if (GEMINI_API_KEY) {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        console.log('✅ Gemini AI initialised');
    } else {
        console.warn('⚠️ GEMINI_API_KEY not set — Outfit Lab will use fallback captions.');
    }
} catch (e) {
    console.warn('⚠️ Gemini init failed:', e.message);
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'Avant')));

// ================================================================
// CLOUDINARY CONFIG
// .env mein ye 3 lines daalo:
// CLOUDINARY_CLOUD_NAME=your_cloud_name
// CLOUDINARY_API_KEY=your_api_key
// CLOUDINARY_API_SECRET=your_api_secret
// ================================================================
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// ================================================================
// MULTER — memory storage (file disk pe nahi, RAM mein)
// Cloudinary directly stream mein upload karega
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

// User Model (existing)
const userSchema = new mongoose.Schema({
    name:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    email:    { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
// Use existing model if already compiled
const UserModel = mongoose.models.User || mongoose.model('User', userSchema);

// Trend Model (NEW)
const trendSchema = new mongoose.Schema({
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name:        { type: String, required: true },
    imageUrl:    { type: String, required: true },
    cloudinaryId:{ type: String },
    createdAt:   { type: Date, default: Date.now }
});
const Trend = mongoose.models.Trend || mongoose.model('Trend', trendSchema);

// Wardrobe Model (NEW)
const wardrobeSchema = new mongoose.Schema({
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    imageUrl:    { type: String, required: true },
    cloudinaryId:{ type: String },
    createdAt:   { type: Date, default: Date.now }
});
const WardrobeItem = mongoose.models.WardrobeItem || mongoose.model('WardrobeItem', wardrobeSchema);

// ================================================================
// DB CONNECTION
// ================================================================
mongoose.connect(process.env.MONGO_URI)
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
// AUTH MIDDLEWARE — user ID nikalne ke liye
// Simple: username from header ya body se match karo
// (JWT nahi hai abhi, isliye username based auth)
// ================================================================
async function getUserFromRequest(req) {
    const userName = req.headers['x-username'] || req.body.userName;
    if (!userName) return null;
    return await UserModel.findOne({ name: userName.toLowerCase() });
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
// PHASE 3 ROUTE 1: TREND UPLOAD
// Guest   → Cloudinary pe upload, sirf URL return (no DB save)
// LoggedIn → Cloudinary + MongoDB dono mein save
// ================================================================
app.post('/api/upload-trend', upload.single('image'), async (req, res) => {
    try {
        const { trendName, userName } = req.body;

        if (!req.file) return res.status(400).json({ success: false, message: "No image uploaded" });
        if (!trendName) return res.status(400).json({ success: false, message: "Trend name required" });

        console.log(`📸 Trend upload: "${trendName}" by ${userName || 'guest'}`);

        // Cloudinary pe upload (dono cases mein)
        const cloudResult = await uploadToCloudinary(req.file.buffer, 'trends');
        console.log('✅ Cloudinary upload success:', cloudResult.secure_url);

        // Check: logged-in user hai?
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

// ================================================================
// PHASE 3 ROUTE 2: GET USER'S SAVED TRENDS (for logged-in users)
// ================================================================
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

// ================================================================
// PHASE 3 ROUTE 3: DELETE SAVED TREND
// ================================================================
app.delete('/api/my-trends/:id', async (req, res) => {
    try {
        const userName = req.headers['x-username'];
        if (!userName) return res.status(401).json({ success: false, message: "Not logged in" });

        const user = await UserModel.findOne({ name: userName.toLowerCase() });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const trend = await Trend.findOne({ _id: req.params.id, userId: user._id });
        if (!trend) return res.status(404).json({ success: false, message: "Trend not found" });

        // Cloudinary se bhi delete karo
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
// PHASE 3 ROUTE 4: WARDROBE UPLOAD
// Guest   → Cloudinary URL return, no DB
// LoggedIn → Cloudinary + MongoDB
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

// ================================================================
// PHASE 3 ROUTE 5: GET USER'S WARDROBE
// ================================================================
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

// ================================================================
// PHASE 3 ROUTE 6: DELETE WARDROBE ITEM
// ================================================================
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
// PHASE 4 ROUTE: OUTFIT LAB — THE LOGIC ENGINE
// Receives 7 dropdown inputs + additionalDetails
// Returns: { imagePrompt, caption, itemList }
// ================================================================

// Helper: Pollinations text endpoint (used as a free Gemini fallback)
function fetchTextFromPollinations(prompt) {
    return new Promise((resolve, reject) => {
        const encodedPrompt = encodeURIComponent(prompt);
        const options = {
            hostname: 'text.pollinations.ai',
            path: `/${encodedPrompt}`,
            method: 'GET',
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/plain' },
            timeout: 25000
        };
        const req = https.request(options, (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                if (data && data.trim().length > 10) resolve(data.trim());
                else reject(new Error('Empty response from Pollinations text'));
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Pollinations text timeout')); });
        req.end();
    });
}

// Helper: parse Gemini / Pollinations text into { caption, itemList }
// Expected format (we ask for it in the prompt):
//   CAPTION: <line 1>
//   <line 2>
//   ITEMS:
//   - item one
//   - item two
function parseStylistResponse(raw, fallbackItems = []) {
    if (!raw) return { caption: '', itemList: fallbackItems };

    // Strip markdown code fences if any
    const text = raw.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();

    let caption = '';
    let itemList = [];

    const lower = text.toLowerCase();
    const itemsIdx = lower.indexOf('items:');

    if (itemsIdx !== -1) {
        const captionPart = text.slice(0, itemsIdx).replace(/^caption\s*:?/i, '').trim();
        const itemsPart   = text.slice(itemsIdx + 'items:'.length).trim();

        caption = captionPart
            .split('\n')
            .map(l => l.replace(/^caption\s*:?/i, '').trim())
            .filter(Boolean)
            .slice(0, 3)
            .join(' ');

        itemList = itemsPart
            .split('\n')
            .map(l => l.replace(/^[\-\*\d\.\)\s]+/, '').trim())
            .filter(Boolean);
    } else {
        // No structured response → first 2 lines as caption, rest as items
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        caption = lines.slice(0, 2).join(' ');
        itemList = lines.slice(2)
            .map(l => l.replace(/^[\-\*\d\.\)\s]+/, '').trim())
            .filter(Boolean);
    }

    // Trim caption + clean items
    caption = caption.replace(/^["']|["']$/g, '').slice(0, 280);
    itemList = itemList
        .map(i => i.replace(/[.,;]\s*$/, '').slice(0, 60))
        .filter(i => i.length > 1)
        .slice(0, 8);

    if (itemList.length === 0) itemList = fallbackItems;

    return { caption, itemList };
}

app.post('/api/generate-outfit-logic', async (req, res) => {
    try {
        const {
            item, color, fabric, aesthetic, occasion, weather, footwear,
            additionalDetails
        } = req.body || {};

        // Sanitise: collapse blanks / "Others" to neutral words
        const clean = (v, fallback = '') => {
            if (!v || typeof v !== 'string') return fallback;
            const t = v.trim();
            if (!t || t.toLowerCase() === 'others') return fallback;
            return t;
        };

        const _item       = clean(item, 'statement outfit');
        const _color      = clean(color, 'neutral-toned');
        const _fabric     = clean(fabric, 'premium fabric');
        const _aesthetic  = clean(aesthetic, 'editorial');
        const _occasion   = clean(occasion, 'everyday wear');
        const _weather    = clean(weather, 'mild');
        const _footwear   = clean(footwear, 'matching footwear');
        const _details    = clean(additionalDetails, '');

        // ---------- IMAGE PROMPT (for Pollinations image endpoint) ----------
        const imagePrompt = [
            `A 4k high-fashion editorial photograph of a full-body model wearing`,
            `a ${_color} ${_fabric} ${_item},`,
            `styled in ${_aesthetic} aesthetic,`,
            `for ${_occasion} during ${_weather} weather,`,
            `paired with ${_footwear}.`,
            _details ? `Mood and details: ${_details}.` : '',
            `Studio lighting, magazine cover composition, sharp focus, cinematic, vogue-style photography.`
        ].filter(Boolean).join(' ');

        // ---------- TEXT PROMPT (Gemini) ----------
        const textPrompt = `You are a luxury fashion stylist for AVANT magazine.

Outfit parameters:
- Item: ${_item}
- Color: ${_color}
- Fabric: ${_fabric}
- Aesthetic: ${_aesthetic}
- Occasion: ${_occasion}
- Weather: ${_weather}
- Footwear: ${_footwear}
${_details ? `- Additional mood/details: ${_details}` : ''}

Respond in EXACTLY this structured format (and nothing else):

CAPTION:
<a stylish 2-line editorial caption describing this look>

ITEMS:
- <clothing item 1 (specific, shoppable, e.g. "${_color} ${_fabric} ${_item}")>
- <clothing item 2>
- <clothing item 3>
- <clothing item 4 (footwear)>
- <accessory if relevant>

Each item must be a single concrete shoppable product (no full sentences). Do not include any extra commentary.`;

        // Fallback item list if AI fails
        const fallbackItems = [
            `${_color} ${_fabric} ${_item}`.trim(),
            `${_footwear}`.trim(),
            `${_aesthetic} accessories`.trim()
        ].filter(Boolean);

        let rawText = null;
        let usedSource = 'fallback';

        // ---------- TRY GEMINI ----------
        if (geminiModel) {
            try {
                const result = await geminiModel.generateContent(textPrompt);
                rawText = result?.response?.text?.() || null;
                if (rawText && rawText.trim().length > 10) usedSource = 'gemini';
                else rawText = null;
            } catch (e) {
                console.warn('⚠️ Gemini call failed, falling back to Pollinations text:', e.message);
            }
        }

        // ---------- FALLBACK: POLLINATIONS TEXT ----------
        if (!rawText) {
            try {
                rawText = await fetchTextFromPollinations(textPrompt);
                usedSource = 'pollinations';
            } catch (e) {
                console.warn('⚠️ Pollinations text fallback failed:', e.message);
            }
        }

        // ---------- PARSE ----------
        let { caption, itemList } = parseStylistResponse(rawText, fallbackItems);

        // Ultimate fallback caption
        if (!caption) {
            caption = `${_aesthetic} energy meets ${_occasion} versatility. A ${_color} ${_item} that owns every frame.`;
        }
        if (!itemList || itemList.length === 0) itemList = fallbackItems;

        // Build Pollinations image URL (frontend will hit this directly)
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=768&height=1024&nologo=true&enhance=true&seed=${Date.now() % 100000}`;

        console.log(`🎨 Outfit Lab generated [${usedSource}] → ${itemList.length} items`);

        return res.json({
            success:   true,
            source:    usedSource,
            imagePrompt,
            imageUrl,
            caption,
            itemList,
            inputs: {
                item: _item, color: _color, fabric: _fabric, aesthetic: _aesthetic,
                occasion: _occasion, weather: _weather, footwear: _footwear,
                additionalDetails: _details
            }
        });

    } catch (error) {
        console.error('❌ /api/generate-outfit-logic error:', error);
        return res.status(500).json({ success: false, message: error.message || 'Outfit generation failed' });
    }
});

// ================================================================
// PHASE 4 ROUTE: SAVE GENERATED OUTFIT TO TRY-ON CLOSET (Wardrobe)
// Bridge between Outfit Lab → MongoDB Wardrobe
// Accepts a remote imageUrl (Pollinations) and pipes it into Cloudinary,
// then saves to WardrobeItem so Virtual Try-On (Phase 5) can use it.
// ================================================================
function fetchImageBuffer(url) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('http://') ? require('http') : https;
        lib.get(url, (response) => {
            // Follow one redirect
            if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
                return fetchImageBuffer(response.headers.location).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                return reject(new Error(`Image fetch failed with status ${response.statusCode}`));
            }
            const chunks = [];
            response.on('data', c => chunks.push(c));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
        }).on('error', reject).setTimeout(60000, function () { this.destroy(new Error('Image fetch timeout')); });
    });
}

app.post('/api/save-generated-outfit', async (req, res) => {
    try {
        const { imageUrl, userName, caption, itemList, inputs } = req.body || {};
        if (!imageUrl) return res.status(400).json({ success: false, message: 'imageUrl is required' });

        console.log(`💾 Save generated outfit for ${userName || 'guest'}`);

        // Pull the Pollinations image into a buffer, then push to Cloudinary
        const buffer = await fetchImageBuffer(imageUrl);
        const cloudResult = await uploadToCloudinary(buffer, 'wardrobe');

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
                itemId    = item._id;
            }
        }

        return res.json({
            success:  true,
            imageUrl: cloudResult.secure_url,
            itemId,
            savedToDb,
            caption:  caption || '',
            itemList: Array.isArray(itemList) ? itemList : [],
            inputs:   inputs || {},
            timestamp: new Date().toLocaleString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            })
        });
    } catch (error) {
        console.error('❌ /api/save-generated-outfit error:', error);
        return res.status(500).json({ success: false, message: error.message || 'Save failed' });
    }
});

// Static pages
app.get('/:page', (req, res) => {
    res.sendFile(path.join(__dirname, 'Avant', req.params.page));
});

// ================================================================
// SERVER
// ================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Avant running at http://localhost:${PORT}`));

// ================================================================
// POLLINATIONS AI
// ================================================================
function fetchFromPollinations(styleType) {
    return new Promise((resolve, reject) => {
        const prompt = `List exactly 5 styling tips for ${styleType} fashion aesthetic in 2026. Number each tip from 1 to 5. Write each tip on a new line. Keep each tip under 15 words. Only output the 5 numbered tips, nothing else.`;
        const encodedPrompt = encodeURIComponent(prompt);
        const options = {
            hostname: 'text.pollinations.ai',
            path: `/${encodedPrompt}`,
            method: 'GET',
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/plain' },
            timeout: 20000
        };
        const req = https.request(options, (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                if (data && data.trim().length > 10) resolve(data.trim());
                else reject(new Error('Empty response from Pollinations'));
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Pollinations timeout')); });
        req.end();
    });
}

app.post('/api/style-advice', async (req, res) => {
    const { styleType } = req.body;
    console.log(`🎨 AI request: "${styleType}"`);
    try {
        const text = await fetchFromPollinations(styleType);
        res.json({ success: true, isAI: true, advice: text });
    } catch (error) {
        console.error(`❌ Pollinations failed:`, error.message);
        const backups = {
            "Eclectic Grandpa": "1. Layer a vintage cardigan over a collared shirt.\n2. Mix patterned sweaters with earth-tone trousers.\n3. Wear an oversized blazer with a knit vest and retro glasses.\n4. Combine stripes and checks with oversized outerwear.\n5. Accessorize with old-school frames and a structured tote.",
            "Streetwear": "1. Pair an oversized hoodie with cargo pants and chunky sneakers.\n2. Layer a graphic tee under a flannel with baggy jeans.\n3. Rock a neutral tracksuit with a crossbody bag and cap.\n4. Style a puffer jacket with joggers and high-top sneakers.\n5. Try denim-on-denim with bold sneakers and a silver chain.",
            "Y2K Revival": "1. Wear a baby tee with low-rise flared jeans and a mini bag.\n2. Combine a metallic top with cargo pants and tinted sunglasses.\n3. Layer a cropped jacket over a bandeau with wide-leg trousers.\n4. Use glossy fabrics in bold colors with platform shoes.\n5. Style a denim mini skirt with knee-high boots.",
            "Old Money": "1. Tuck a linen shirt into tailored trousers with loafers.\n2. Wear a neutral blazer over a polo tee with chinos.\n3. Layer a cashmere crewneck over a collared shirt.\n4. Build a monochrome outfit in cream or camel tones.\n5. Add a classic watch and structured leather bag.",
            "Dark Academia": "1. Wear a brown blazer over a turtleneck with pleated trousers.\n2. Style a long wool coat with knee-high boots and a plaid scarf.\n3. Layer a knit sweater over a checked shirt with Oxford shoes.\n4. Use dark tones like burgundy, forest green, and charcoal.\n5. Carry a leather satchel and wear vintage-inspired frames.",
            "Gender Fluid": "1. Pair an oversized button-up with wide-leg tailored trousers.\n2. Layer a hoodie under a structured skirt with chunky sneakers.\n3. Mix draped fabrics with sharp blazers for contrast.\n4. Style a longline blazer as a dress with a waist belt.\n5. Combine masculine and feminine silhouettes with bold confidence."
        };
        const fallback = backups[styleType] || "1. Start with a neutral base of white, black, or beige.\n2. Add one statement piece that defines the aesthetic.\n3. Choose footwear that matches the energy of the look.\n4. Keep accessories minimal and intentional.\n5. Prioritize fit above everything else.";
        res.json({ success: true, isAI: false, advice: fallback });
    }
});