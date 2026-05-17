require('dotenv').config();
const express = require('express');
const path = require('path');
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
// MULTER — memory storage
// ================================================================
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
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
// MONGODB CONNECTION — PERMANENT FIX
// ================================================================
// Fix 1: /avant database name URI mein add karo agar missing hai
const rawUri = process.env.MONGO_URI || '';
let MONGO_URI = rawUri;

// Agar URI mein database name nahi hai, inject karo
if (rawUri.includes('mongodb.net/') && !rawUri.includes('mongodb.net/avant')) {
    MONGO_URI = rawUri.replace('mongodb.net/?', 'mongodb.net/avant?')
                      .replace('mongodb.net/', 'mongodb.net/avant?').replace('??', '?');
}
// Local MongoDB fallback
if (!MONGO_URI) MONGO_URI = 'mongodb://127.0.0.1:27017/AvantDB';

const MONGOOSE_OPTIONS = {
    serverSelectionTimeoutMS: 10000,  // 10 seconds wait
    socketTimeoutMS:          45000,  // 45 seconds socket timeout
    connectTimeoutMS:         10000,
    maxPoolSize:              10,
    retryWrites:              true,
};

// Fix 2: Auto-retry on connection failure
let retryCount = 0;
const MAX_RETRIES = 5;

function connectWithRetry() {
    console.log(`🔌 MongoDB connecting... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
    mongoose.connect(MONGO_URI, MONGOOSE_OPTIONS)
        .then(() => {
            retryCount = 0;
            console.log('✅ MongoDB Connected!');
        })
        .catch(err => {
            retryCount++;
            console.log(`❌ DB Error: ${err.message}`);
            if (retryCount < MAX_RETRIES) {
                const delay = Math.min(5000 * retryCount, 30000);
                console.log(`🔄 Retrying in ${delay / 1000}s...`);
                setTimeout(connectWithRetry, delay);
            } else {
                console.error('💀 Max retries reached. Check Atlas IP whitelist!');
                console.error('   Fix: cloud.mongodb.com → Network Access → Add 0.0.0.0/0');
            }
        });
}

// Fix 3: Handle disconnect events — auto reconnect
mongoose.connection.on('disconnected', () => {
    console.log('⚠️  MongoDB disconnected! Reconnecting...');
    if (retryCount < MAX_RETRIES) setTimeout(connectWithRetry, 5000);
});

mongoose.connection.on('connected', () => console.log('🟢 MongoDB connection active'));
mongoose.connection.on('error', (err) => console.log('🔴 MongoDB error:', err.message));

connectWithRetry();

// ================================================================
// HELPER: Upload buffer to Cloudinary
// ================================================================
function uploadToCloudinary(buffer, folder) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: `avant/${folder}`, resource_type: 'image' },
            (error, result) => { if (error) reject(error); else resolve(result); }
        );
        const readable = new Readable();
        readable.push(buffer);
        readable.push(null);
        readable.pipe(stream);
    });
}

// ================================================================
// HELPER: Pollinations Text API (server-side GET)
// ================================================================
function fetchPollinationsText(prompt) {
    return new Promise((resolve, reject) => {
        const encoded = encodeURIComponent(prompt);
        const options = {
            hostname: 'text.pollinations.ai',
            path: `/${encoded}`,
            method: 'GET',
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/plain' },
            timeout: 25000
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (data && data.trim().length > 5) resolve(data.trim());
                else reject(new Error('Empty response from Pollinations'));
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Pollinations timeout')); });
        req.end();
    });
}

// ================================================================
// ROUTES
// ================================================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Avant', 'index.html'));
});

// ── AUTH ────────────────────────────────────────────────────────
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

// ── PHASE 3: TREND ROUTES ────────────────────────────────────────
app.post('/api/upload-trend', upload.single('image'), async (req, res) => {
    try {
        const { trendName, userName } = req.body;
        if (!req.file) return res.status(400).json({ success: false, message: "No image uploaded" });
        if (!trendName) return res.status(400).json({ success: false, message: "Trend name required" });
        console.log(`📸 Trend upload: "${trendName}" by ${userName || 'guest'}`);
        const cloudResult = await uploadToCloudinary(req.file.buffer, 'trends');
        let savedToDb = false;
        if (userName) {
            const user = await UserModel.findOne({ name: userName.toLowerCase() });
            if (user) {
                await new Trend({ userId: user._id, name: trendName, imageUrl: cloudResult.secure_url, cloudinaryId: cloudResult.public_id }).save();
                savedToDb = true;
            }
        }
        res.json({ success: true, imageUrl: cloudResult.secure_url, savedToDb, message: savedToDb ? "Trend saved permanently!" : "Trend uploaded (guest session only)" });
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
        if (trend.cloudinaryId) await cloudinary.uploader.destroy(trend.cloudinaryId);
        await trend.deleteOne();
        res.json({ success: true, message: "Trend deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ── PHASE 3: WARDROBE ROUTES ─────────────────────────────────────
app.post('/api/upload-wardrobe', upload.single('image'), async (req, res) => {
    try {
        const { userName } = req.body;
        if (!req.file) return res.status(400).json({ success: false, message: "No image uploaded" });
        console.log(`👗 Wardrobe upload by ${userName || 'guest'}`);
        const cloudResult = await uploadToCloudinary(req.file.buffer, 'wardrobe');
        let savedToDb = false;
        let itemId = null;
        if (userName) {
            const user = await UserModel.findOne({ name: userName.toLowerCase() });
            if (user) {
                const item = await new WardrobeItem({ userId: user._id, imageUrl: cloudResult.secure_url, cloudinaryId: cloudResult.public_id }).save();
                savedToDb = true;
                itemId = item._id;
            }
        }
        res.json({
            success: true, imageUrl: cloudResult.secure_url, itemId, savedToDb,
            timestamp: new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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
        if (item.cloudinaryId) await cloudinary.uploader.destroy(item.cloudinaryId);
        await item.deleteOne();
        res.json({ success: true, message: "Item deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ================================================================
// LEGACY: Style Advice route (Trends page uses backups or local fallback)
// ================================================================
app.post('/api/style-advice', async (req, res) => {
    const { styleType } = req.body;
    const backups = {
        "Eclectic Grandpa":  "1. Layer a vintage cardigan over a collared shirt.\n2. Mix patterned sweaters with earth-tone trousers.\n3. Oversized blazer with a knit vest and retro glasses.\n4. Combine stripes and checks with oversized outerwear.\n5. Accessorize with old-school frames and a structured tote.",
        "Streetwear":        "1. Pair an oversized hoodie with cargo pants and chunky sneakers.\n2. Layer a graphic tee under a flannel with baggy jeans.\n3. Rock a neutral tracksuit with a crossbody bag and cap.\n4. Style a puffer jacket with joggers and high-top sneakers.\n5. Try denim-on-denim with bold sneakers and a silver chain.",
        "Y2K Revival":       "1. Wear a baby tee with low-rise flared jeans and a mini bag.\n2. Combine a metallic top with cargo pants and tinted sunglasses.\n3. Layer a cropped jacket over a bandeau with wide-leg trousers.\n4. Use glossy fabrics in bold colors with platform shoes.\n5. Style a denim mini skirt with knee-high boots.",
        "Old Money":         "1. Tuck a linen shirt into tailored trousers with loafers.\n2. Wear a neutral blazer over a polo tee with chinos.\n3. Layer a cashmere crewneck over a collared shirt.\n4. Build a monochrome outfit in cream or camel tones.\n5. Add a classic watch and structured leather bag.",
        "Dark Academia":     "1. Wear a brown blazer over a turtleneck with pleated trousers.\n2. Style a long wool coat with knee-high boots and a plaid scarf.\n3. Layer a knit sweater over a checked shirt with Oxford shoes.\n4. Use dark tones: burgundy, forest green, and charcoal.\n5. Carry a leather satchel and wear vintage-inspired frames.",
        "Gender Fluid":      "1. Pair an oversized button-up with wide-leg tailored trousers.\n2. Layer a hoodie under a structured skirt with chunky sneakers.\n3. Mix draped fabrics with sharp blazers for contrast.\n4. Style a longline blazer as a dress with a waist belt.\n5. Combine masculine and feminine silhouettes with bold confidence."
    };
    const fallback = "1. Start with a neutral base of white, black, or beige.\n2. Add one statement piece that defines the aesthetic.\n3. Choose footwear that matches the energy of the look.\n4. Keep accessories minimal and intentional.\n5. Prioritize fit above everything else.";
    res.json({ success: true, isAI: false, advice: backups[styleType] || fallback });
});

// ================================================================
// PHASE 4 & 5: OUTFIT BUILDER ISOLATED ENGINE (FINAL CRASH PROOF)
// ================================================================
const https = require('https');

app.post('/api/generate-outfit-logic', (req, res) => {
    try {
        const { item, color, fabric, aesthetic, occasion, weather, footwear, additionalDetails } = req.body;

        const engineeredImagePrompt = `Professional high-fashion editorial portrait shot, 8k resolution, studio lighting, sharp focus, symmetrical anatomy, hyper-realistic, a fashion model wearing a ${color || 'Neutral'} ${fabric || 'Premium'} ${item || 'Outfit'} in ${aesthetic || 'Casual'} style for a ${occasion || 'Casual Outing'} during ${weather || 'Mild'} weather, paired with ${footwear || 'Sneakers'}. ${additionalDetails ? 'Details: ' + additionalDetails + '.' : ''} Masterpiece, clean fabric texture, no distortion, no extra limbs, no bad anatomy, no blur, crisp details.`;

        const textPrompt = `Based on these details (Item: ${item}, Style: ${aesthetic}, Color: ${color}), write a 1-line caption and list the pieces. Keep it simple, no markdown, separate using three hyphens like this: Caption text --- Item1, Item2, Item3`;

        const encodedTextTarget = encodeURIComponent(textPrompt);
        
        const options = {
            hostname: 'text.pollinations.ai',
            path: `/${encodedTextTarget}`,
            method: 'GET',
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 8000
        };

        const apiRequest = https.request(options, (apiResponse) => {
            let dataChunk = '';
            apiResponse.on('data', chunk => dataChunk += chunk);
            apiResponse.on('end', () => {
                let textResult = dataChunk.trim();
                let captionPart = `Curated premium ${aesthetic || 'modern'} look by AVANT.`;
                let piecesArray = [item || 'Outfit', footwear || 'Sneakers', fabric || 'Accent'];

                if (textResult.includes('---')) {
                    const sections = textResult.split('---');
                    captionPart = sections[0].trim();
                    piecesArray = sections[1].split(',').map(i => i.trim()).filter(i => i.length > 0);
                } else if (textResult.length > 10) {
                    captionPart = textResult;
                }

                res.json({
                    success: true,
                    imagePrompt: engineeredImagePrompt,
                    caption: captionPart,
                    itemList: piecesArray
                });
            });
        });

        apiRequest.on('error', () => {
            res.json({
                success: true,
                imagePrompt: engineeredImagePrompt,
                caption: `Exquisite premium ${aesthetic || 'curated'} look.`,
                itemList: [item || 'Outfit', footwear || 'Sneakers', fabric || 'Fabric']
            });
        });

        apiRequest.on('timeout', () => { apiRequest.destroy(); });
        apiRequest.end();

    } catch (error) {
        console.error("Ecosystem backend error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// Static pages catch-all (Keep this at the very bottom of your routes)
app.get('/:page', (req, res) => {
    res.sendFile(path.join(__dirname, 'Avant', req.params.page));
});

// ================================================================
// SERVER
// ================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Avant running at http://localhost:${PORT}`));