const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const https = require('https');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const { OAuth2Client } = require('google-auth-library');
const User = require('./models/User');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'Avant')));

// ================================================================
// GOOGLE OAUTH CLIENT
// ================================================================
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
// MONGOOSE MODELS (Trend / Wardrobe — User model comes from ./models/User)
// ================================================================
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

        const email    = payload.email;
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
            });
            await user.save();
            console.log('✅ New Google user created:', user.name);
        } else if (!user.googleId) {
            // Existing local account, link Google to it
            user.googleId = googleId;
            await user.save();
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
// ── ROUTE 1: OUTFIT LOGIC (FIXED PARAMETERS SYNC) ──
app.post('/api/generate-outfit-logic', (req, res) => {
    try {
        const { item, color, fabric, aesthetic, occasion, weather, footwear, additionalDetails } = req.body;

        // ================================================================
        // COMPLETE OUTFITS — No pairing needed, only accessories
        // ================================================================
        const completeOutfits = {
            'Co-ord Set': {
                description: 'Complete matching set',
                accessories: ['Minimal chain or pendant', 'Clean white sneakers or loafers', 'Small crossbody bag', 'Sunglasses'],
                footwear: 'White Sneakers or Loafers or Mules'
            },
            'Saree': {
                description: 'Complete traditional outfit',
                accessories: ['Statement jhumkas or chandbalis', 'Bangles or kada', 'Potli bag or clutch', 'Bindi'],
                footwear: 'Heels or Kolhapuri Sandals or Juttis'
            },
            'Dress': {
                description: 'Complete outfit',
                accessories: ['Delicate necklace', 'Small handbag or clutch', 'Minimal earrings', 'Belt to cinch waist (optional)'],
                footwear: 'Block Heels or Ballet Flats or White Sneakers'
            },
            'Kurta': {
                description: 'Semi-complete — pairs with bottom',
                bottom: ['Palazzo', 'Straight Pants', 'Churidar', 'Dhoti Pants'],
                accessories: ['Oxidised earrings', 'Potli bag', 'Kolhapuri sandals or Juttis'],
                footwear: 'Juttis or Kolhapuri Sandals'
            },
        };

        // ================================================================
        // BOTTOM PAIRING — Multiple options per item
        // ================================================================
        const bottomPairing = {
            'Oversized T-Shirt': [
                'Baggy Jeans', 'Cargo Pants', 'Parachute Pants',
                'Biker Shorts', 'Wide Leg Joggers', 'Track Pants'
            ],
            'Graphic Tee': [
                'Straight Fit Jeans', 'Cargo Pants', 'Joggers',
                'Baggy Jeans', 'Chinos', 'Denim Shorts'
            ],
            'Plain Tee': [
                'Chinos', 'Slim Fit Jeans', 'Trousers',
                'Linen Pants', 'Cargo Pants', 'Denim Shorts'
            ],
            'Polo T-Shirt': [
                'Chinos', 'Tailored Shorts', 'Slim Fit Jeans',
                'Linen Pants', 'Bermuda Shorts', 'Trousers'
            ],
            'Tank Top': [
                'Cargo Shorts', 'Linen Pants', 'Wide Leg Jeans',
                'Biker Shorts', 'Mini Skirt', 'Denim Shorts'
            ],
            'Crop Top': [
                'High Waist Jeans', 'Mini Skirt', 'Wide Leg Pants',
                'Cargo Pants', 'Maxi Skirt', 'Palazzo'
            ],
            'Flannel Shirt': [
                'Black Skinny Jeans', 'Dark Denim', 'Cargo Pants',
                'Chinos', 'Straight Jeans', 'Joggers'
            ],
            'Oversized Shirt': [
                'Biker Shorts', 'Straight Jeans', 'Linen Shorts',
                'Mini Skirt', 'Slim Trousers', 'Cycling Shorts'
            ],
            'Hoodie': [
                'Sweatpants', 'Cargo Pants', 'Straight Jeans',
                'Joggers', 'Track Pants', 'Biker Shorts'
            ],
            'Zip Hoodie': [
                'Joggers', 'Straight Jeans', 'Cargo Pants',
                'Chinos', 'Track Pants', 'Sweatpants'
            ],
            'Oversized Hoodie': [
                'Biker Shorts', 'Cargo Pants', 'Leggings',
                'Cycling Shorts', 'Mini Skirt', 'Slim Jeans'
            ],
            'Varsity Jacket': [
                'Straight Jeans', 'Joggers', 'Chinos',
                'Track Pants', 'Cargo Pants', 'Mini Skirt'
            ],
            'Bomber Jacket': [
                'Slim Fit Jeans', 'Cargo Pants', 'Chinos',
                'Track Pants', 'Straight Jeans', 'Joggers'
            ],
            'Denim Jacket': [
                'Black Jeans', 'Chinos', 'Floral Dress (layered)',
                'Mini Skirt', 'White Jeans', 'Cargo Pants'
            ],
            'Leather Jacket': [
                'Black Skinny Jeans', 'Dark Trousers', 'Straight Jeans',
                'Leather Pants (tonal)', 'Mini Skirt', 'Cargo Pants'
            ],
            'Blazer': [
                'Tailored Trousers', 'Wide Leg Pants', 'Straight Jeans',
                'Mini Skirt', 'Cigarette Pants', 'Pleated Trousers'
            ],
            'Cargo Pants': [
                'Graphic Tee', 'Oversized Shirt', 'Crop Top',
                'Fitted Tank Top', 'Zip Hoodie', 'Cropped Sweatshirt'
            ],
            'Baggy Jeans': [
                'Fitted Tee', 'Crop Top', 'Hoodie',
                'Corset Top', 'Tank Top', 'Oversized Shirt'
            ],
            'Straight Fit Jeans': [
                'Plain Tee', 'Blazer', 'Flannel Shirt',
                'Polo', 'Crop Top', 'Knit Top'
            ],
            'Wide Leg Jeans': [
                'Crop Top', 'Fitted Turtleneck', 'Corset Top',
                'Knit Vest', 'Bralette with sheer top', 'Fitted Tank'
            ],
            'Parachute Pants': [
                'Plain Tee', 'Zip Hoodie', 'Crop Top',
                'Tank Top', 'Graphic Tee', 'Cropped Jacket'
            ],
            'Joggers': [
                'Hoodie', 'Oversized Tee', 'Zip Hoodie',
                'Fitted Tank', 'Cropped Sweatshirt', 'Jersey Top'
            ],
            'Mini Skirt': [
                'Crop Top', 'Fitted Tee', 'Knotted Shirt',
                'Corset Top', 'Sheer Top', 'Oversized Blazer'
            ],
        };

        // ================================================================
        // FOOTWEAR PAIRING — Multiple options per item
        // ================================================================
        const footwearPairing = {
            'Oversized T-Shirt':  ['Chunky Sneakers', 'Air Force 1s', 'Jordans', 'Slides', 'Skate Shoes'],
            'Graphic Tee':        ['White Sneakers', 'Vans', 'Converse', 'Skate Shoes', 'Low Top Sneakers'],
            'Plain Tee':          ['White Sneakers', 'Loafers', 'Slip Ons', 'Clean Runners', 'Boat Shoes'],
            'Polo T-Shirt':       ['Loafers', 'Boat Shoes', 'Clean White Sneakers', 'Derby Shoes', 'Moccasins'],
            'Tank Top':           ['Slides', 'Flip Flops', 'Chunky Sneakers', 'Sandals', 'Running Shoes'],
            'Crop Top':           ['Platform Sneakers', 'Block Heels', 'Mary Janes', 'Kitten Heels', 'White Sneakers'],
            'Flannel Shirt':      ['Combat Boots', 'Chelsea Boots', 'Ankle Boots', 'Chunky Sneakers', 'Work Boots'],
            'Oversized Shirt':    ['Loafers', 'Mules', 'Sneakers', 'Ballet Flats', 'Ankle Boots'],
            'Hoodie':             ['Slides', 'High Tops', 'Chunky Sneakers', 'Running Shoes', 'Jordans'],
            'Zip Hoodie':         ['High Tops', 'Chunky Sneakers', 'Running Shoes', 'Slides', 'Low Tops'],
            'Oversized Hoodie':   ['Chunky Sneakers', 'Slides', 'Ugg Boots', 'Platform Sneakers', 'Air Force 1s'],
            'Varsity Jacket':     ['High Tops', 'Jordans', 'Chunky Sneakers', 'Air Force 1s', 'Retro Runners'],
            'Bomber Jacket':      ['White Sneakers', 'Chelsea Boots', 'High Tops', 'Derby Shoes', 'Loafers'],
            'Denim Jacket':       ['White Sneakers', 'Ankle Boots', 'Converse', 'Chelsea Boots', 'Ballet Flats'],
            'Leather Jacket':     ['Chelsea Boots', 'Combat Boots', 'Chunky Sneakers', 'Ankle Boots', 'Moto Boots'],
            'Blazer':             ['Oxford Shoes', 'Loafers', 'Pointed Heels', 'Derby Shoes', 'Mules'],
            'Kurta':              ['Juttis', 'Kolhapuri Sandals', 'Ethnic Sandals', 'Mojaris', 'Block Heels'],
            'Cargo Pants':        ['Chunky Sneakers', 'Combat Boots', 'Jordans', 'High Tops', 'Work Boots'],
            'Baggy Jeans':        ['Jordans', 'Chunky Sneakers', 'High Tops', 'Platform Shoes', 'Air Force 1s'],
            'Straight Fit Jeans': ['White Sneakers', 'Loafers', 'Chelsea Boots', 'Oxford Shoes', 'Ankle Boots'],
            'Wide Leg Jeans':     ['Platform Shoes', 'Block Heels', 'Boots', 'Mules', 'Kitten Heels'],
            'Mini Skirt':         ['Mary Janes', 'Platform Sneakers', 'Kitten Heels', 'Ankle Boots', 'Ballet Flats'],
            'Joggers':            ['Slides', 'Running Shoes', 'High Tops', 'Chunky Sneakers', 'Low Tops'],
            'Parachute Pants':    ['Chunky Sneakers', 'High Tops', 'Air Force 1s', 'Jordans', 'Slides'],
        };

        // ================================================================
        // ACCESSORIES — Multiple options per item
        // ================================================================
        const accPairing = {
            'Oversized T-Shirt':  ['Baseball cap', 'Minimal silver chain', 'Crossbody bag', 'Bucket hat'],
            'Graphic Tee':        ['Crossbody bag', 'Snapback', 'Wristband', 'Tote bag'],
            'Plain Tee':          ['Minimal watch', 'Clean tote', 'Stud earrings', 'Simple bracelet'],
            'Polo T-Shirt':       ['Classic watch', 'Belt', 'Clean tote', 'Aviator sunglasses'],
            'Crop Top':           ['Layered necklaces', 'Hoop earrings', 'Mini bag', 'Sunglasses'],
            'Flannel Shirt':      ['Watch', 'Beanie', 'Canvas tote', 'Simple ring'],
            'Oversized Shirt':    ['Belt (to cinch)', 'Mini bag', 'Hoop earrings', 'Sunglasses'],
            'Hoodie':             ['Beanie', 'Backpack', 'Simple chain', 'Cap'],
            'Zip Hoodie':         ['Cap', 'Crossbody bag', 'Simple chain', 'Beanie'],
            'Oversized Hoodie':   ['Beanie', 'Mini backpack', 'Hoop earrings', 'Phone bag'],
            'Varsity Jacket':     ['Snapback', 'Gym bag', 'Simple chain', 'Wristband'],
            'Bomber Jacket':      ['Aviator sunglasses', 'Small backpack', 'Chain necklace', 'Cap'],
            'Denim Jacket':       ['Hoop earrings', 'Tote bag', 'Layered necklaces', 'Sunglasses'],
            'Leather Jacket':     ['Silver chain', 'Dark sunglasses', 'Biker wallet', 'Silver rings'],
            'Blazer':             ['Minimal watch', 'Structured tote', 'Stud earrings', 'Belt'],
            'Kurta':              ['Oxidised earrings', 'Potli bag', 'Bangles', 'Dupatta'],
            'Saree':              ['Jhumkas or Chandbalis', 'Potli bag or clutch', 'Bangles or Kada', 'Bindi'],
            'Co-ord Set':         ['Minimal pendant', 'Small crossbody', 'Sunglasses', 'Hoop earrings'],
            'Dress':              ['Delicate necklace', 'Clutch or mini bag', 'Stud earrings', 'Belt'],
            'Mini Skirt':         ['Hoop earrings', 'Mini bag', 'Layered necklaces', 'Sunglasses'],
            'Cargo Pants':        ['Cap', 'Crossbody or sling bag', 'Chain', 'Minimal watch'],
            'Baggy Jeans':        ['Belt', 'Hoop earrings', 'Crossbody bag', 'Chain necklace'],
        };

        // ================================================================
        // COLOR CONTRAST LOGIC
        // ================================================================
        const colorContrast = {
            'Black':       ['White', 'Cream', 'Beige', 'Olive', 'Red', 'Camel', 'Grey'],
            'White':       ['Black', 'Navy Blue', 'Olive Green', 'Camel', 'Brown', 'Grey'],
            'Navy Blue':   ['White', 'Cream', 'Beige', 'Mustard', 'Camel', 'Light Grey'],
            'Royal Blue':  ['White', 'Grey', 'Beige', 'Camel', 'Cream', 'Tan'],
            'Sky Blue':    ['White', 'Beige', 'Brown', 'Grey', 'Cream'],
            'Olive Green': ['Beige', 'White', 'Brown', 'Cream', 'Camel', 'Tan'],
            'Dark Green':  ['Beige', 'Cream', 'Tan', 'White', 'Camel'],
            'Sage Green':  ['White', 'Beige', 'Cream', 'Brown', 'Tan'],
            'Beige':       ['Brown', 'Olive', 'Navy', 'Camel', 'White', 'Tan'],
            'Grey':        ['Black', 'White', 'Maroon', 'Navy Blue', 'Burgundy'],
            'Charcoal':    ['White', 'Cream', 'Light Grey', 'Beige'],
            'Maroon':      ['Beige', 'Cream', 'Grey', 'Olive', 'Camel'],
            'Red':         ['Black', 'White', 'Grey', 'Denim Blue', 'Beige'],
            'Brown':       ['Beige', 'Cream', 'Olive', 'White', 'Camel', 'Tan'],
            'Camel':       ['White', 'Black', 'Navy', 'Brown', 'Burgundy'],
            'Mustard':     ['Navy Blue', 'Brown', 'Olive', 'White', 'Dark Grey'],
            'Baby Pink':   ['Grey', 'White', 'Black', 'Navy', 'Beige'],
            'Hot Pink':    ['Black', 'White', 'Grey', 'Navy'],
            'Lavender':    ['White', 'Grey', 'Beige', 'Dusty Rose', 'Cream'],
            'Purple':      ['Grey', 'White', 'Beige', 'Black', 'Cream'],
            'Cream':       ['Brown', 'Camel', 'Olive', 'Navy', 'Tan'],
            'Off White':   ['Brown', 'Camel', 'Olive', 'Navy', 'Tan'],
            'Rust':        ['Beige', 'Cream', 'Brown', 'Olive', 'White'],
            'Peach':       ['White', 'Beige', 'Mint', 'Grey', 'Brown'],
            'Mint Green':  ['White', 'Beige', 'Grey', 'Coral', 'Cream'],
            'Denim Blue':  ['White', 'Grey', 'Beige', 'Black', 'Cream'],
        };

        // ================================================================
        // FABRIC CONTRAST
        // ================================================================
        const fabricContrast = {
            'Ribbed Knit':   'Denim or Cotton Canvas',
            'Silk':          'Denim or Linen',
            'Denim':         'Soft Cotton or Ribbed Knit',
            'Leather':       'Cotton or Linen',
            'Velvet':        'Silk or Satin',
            'Fleece':        'Denim or Canvas',
            'Cotton Blend':  'Denim or Linen',
            'Soft Cotton':   'Denim or Canvas',
            'Linen':         'Cotton or Denim',
            'Satin':         'Denim or Cotton',
            'Tweed':         'Cotton or Silk',
            'Chiffon':       'Satin or Cotton Lining',
            'Nylon':         'Cotton or Fleece',
            'Polyester':     'Cotton or Linen',
            'Rayon':         'Denim or Cotton',
            'Suede':         'Cotton or Linen',
            'Canvas':        'Cotton or Linen',
            'Stretch Denim': 'Cotton or Ribbed Knit',
            'Heavy Denim':   'Soft Cotton or Ribbed Knit',
            'Faux Leather':  'Cotton or Jersey',
            'Cashmere':      'Silk or Fine Cotton',
            'Wool':          'Cotton or Silk Lining',
        };

        function pick(arr) {
            if (!arr || arr.length === 0) return null;
            return arr[Math.floor(Math.random() * arr.length)];
        }

        function pickMultiple(arr, count = 2) {
            if (!arr || arr.length === 0) return [];
            const shuffled = [...arr].sort(() => Math.random() - 0.5);
            return shuffled.slice(0, count);
        }

        const isComplete = completeOutfits.hasOwnProperty(item);

        let suggestedBottom   = null;
        let suggestedFootwear = footwear || null;
        let suggestedAcc      = null;
        let contrastColor     = null;
        let bottomFabric      = fabricContrast[fabric] || 'Denim';
        let outfitDescription = '';

        if (isComplete) {
            const completeData = completeOutfits[item];
            suggestedAcc      = pickMultiple(completeData.accessories, 3).join(', ');
            suggestedFootwear = footwear || completeData.footwear;

            if (completeData.bottom) {
                suggestedBottom = pick(completeData.bottom);
            }

            outfitDescription = item === 'Saree' || item === 'Co-ord Set' || item === 'Dress'
                ? `${color} ${fabric || ''} ${item} — complete outfit, no separate pairing needed`
                : `${color} ${item} with ${suggestedBottom}`;

        } else {
            const bottomOptions   = bottomPairing[item]   || ['Straight Fit Jeans', 'Chinos', 'Cargo Pants'];
            const footwearOptions = footwearPairing[item] || ['White Sneakers', 'Loafers', 'Chunky Sneakers'];
            const accOptions      = accPairing[item]      || ['Minimal watch', 'Simple chain', 'Clean bag'];
            const colorOptions    = colorContrast[color]  || ['Beige', 'White', 'Grey'];

            suggestedBottom   = pick(bottomOptions);
            suggestedFootwear = footwear || pick(footwearOptions);
            suggestedAcc      = pickMultiple(accOptions, 2).join(', ');
            contrastColor     = pick(colorOptions);

            outfitDescription = `${color} ${fabric || ''} ${item} paired with ${contrastColor} ${bottomFabric} ${suggestedBottom}`;
        }

        const imagePrompt = isComplete && !completeOutfits[item]?.bottom
            ? `High fashion editorial photography. Full body shot of a ${color} ${fabric || ''} ${item}. Style: ${aesthetic || 'elegant contemporary'}. ${suggestedFootwear} footwear. Occasion: ${occasion || 'event'}. Clean white studio background, professional lighting, vertical portrait, no face visible.`
            : `High fashion editorial lookbook photography. Complete outfit: ${outfitDescription}. Footwear: ${suggestedFootwear}. Accessories: ${suggestedAcc}. Style aesthetic: ${aesthetic || 'modern minimal'}. Occasion: ${occasion || 'street style'}. Weather: ${weather || 'clear'}. Clean white studio background, full body shot, sharp clothing detail, vertical 3:4 portrait, no face.`;

        const caption = isComplete && !completeOutfits[item]?.bottom
            ? `A stunning ${color} ${item} — complete in itself. Elevated with ${suggestedAcc} for a ${aesthetic || 'polished'} finish.`
            : `${color} ${item} paired with ${contrastColor} ${suggestedBottom} — complementary colors for visual balance. ${suggestedFootwear} ties the ${aesthetic || 'clean'} look together.`;

        const shoppingItems = [
            `${color} ${item}`,
            suggestedBottom ? `${contrastColor || ''} ${suggestedBottom}`.trim() : null,
            suggestedFootwear?.split(' or ')[0],
            suggestedAcc?.split(',')[0],
        ].filter(Boolean);

        res.json({
            success: true,
            imagePrompt,
            caption,
            shoppingItems,
            pairingDetails: {
                mainItem:   `${color} ${item}`,
                bottom:     suggestedBottom ? `${contrastColor} ${suggestedBottom}` : 'Complete outfit',
                footwear:   suggestedFootwear,
                accessory:  suggestedAcc,
                colorLogic: contrastColor ? `${color} × ${contrastColor}` : 'Monochrome / complete',
                isComplete: isComplete
            }
        });

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
                return servePicsum(res, seed, width, height);
            }

            if (ct.startsWith('image/')) {
                console.log('✅ Cloudflare direct image! Bytes:', buf.length);
                res.setHeader('Content-Type', ct);
                res.setHeader('Cache-Control', 'no-store');
                return res.send(buf);
            }

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


function servePicsum(res, seed, width, height) {
    console.log('📸 Unsplash fashion fallback...');

    const fashionPhotos = [
        'photo-1539109136881-3be0616acf4b',
        'photo-1515886657613-9f3515b0c78f',
        'photo-1469334031218-e382a71b716b',
        'photo-1558618666-fcd25c85cd64',
        'photo-1496747611176-843222e1e57c',
        'photo-1509631179647-0177331693ae',
        'photo-1581044777550-4cfa60707c03',
        'photo-1475180098004-ca77a66827be',
        'photo-1434389677669-e08b4cac3105',
        'photo-1485968579580-b6d095142e6e',
    ];

    const photoId = fashionPhotos[seed % fashionPhotos.length];
    const url = `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${width}&h=${height}&q=80`;

    console.log('📸 Using Unsplash fashion photo:', photoId);

    https.get(url, { headers: { 'User-Agent': 'AvantApp/1.0' } }, (pRes) => {
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

function serveHardcodedFallback(res) {
    console.log('⚠️ All fallbacks failed');
    res.status(500).json({ success: false, message: 'Image generation failed. Please retry.' });
}


// ================================================================
// SERVER INITIALIZATION
// ================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Avant running at http://localhost:${PORT}`));