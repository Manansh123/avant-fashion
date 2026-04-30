require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const User = require('./models/User');
const app = express();

// --- MIDDLEWARE ---
app.use(express.json()); // Frontend se aane wale JSON data ko samajhne ke liye
app.use(express.static(path.join(__dirname, 'Avant')));

// --- DATABASE CONNECTION ---
const dbURI = process.env.MONGO_URI;

mongoose.connect(dbURI)
    .then(() => console.log('✅ Status: MongoDB Connected Successfully!'))
    .catch(err => {
        console.log('❌ Connection Error:', err.message);
        console.log('💡 Tip: Check if MONGO_URI in .env is correct.');
    });

// --- ROUTES ---

// 1. Home Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Avant', 'index.html'));
});

// 2. SIGNUP API (Ab isme 'name' bhi save hoga)
app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body; // Name bhi pakda

        // Check if user exists (MySQL: SELECT * WHERE email=...)
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email already exists!" });
        }

        // Naya User create karna (Schema mein name hona zaroori hai)
        const newUser = new User({ name, email, password });
        await newUser.save();

        res.status(201).json({
            success: true,
            message: "Account created! Now Log In.",
            name: newUser.name // Frontend ko naam wapas bhej diya
        });
    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ success: false, message: "Server error during signup." });
    }
});

// 3. LOGIN API (Naam ke saath return karega)
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found. Please Sign Up." });
        }

        if (user.password !== password) {
            return res.status(401).json({ success: false, message: "Incorrect Password!" });
        }

        // Login success: Naam bhej rahe hain taaki Homepage par "Hello, Name" dikhe
        res.status(200).json({
            success: true,
            message: "Login successful! Welcome to AVANT.",
            name: user.name
        });

    } catch (error) {
        res.status(500).json({ success: false, message: "Server error during login." });
    }
});

// 4. Dynamic Pages (Trends, Wardrobe, etc.)
app.get('/:page', (req, res) => {
    const page = req.params.page;
    res.sendFile(path.join(__dirname, 'Avant', page));
});

// --- SERVER START ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Avant AI is running at http://localhost:${PORT}`);
});

// --- GEMINI AI CONFIGURATION ---
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Force using the stable 1.5-flash model with explicit API version
const model = genAI.getGenerativeModel(
    { model: "gemini-1.5-flash" },
    { apiVersion: 'v1' }
);

app.post('/api/style-advice', async (req, res) => {
    try {
        const { styleType } = req.body;
        console.log("🚀 Requesting AI for:", styleType);

        // Prompt for high-quality tips
        const prompt = `You are the Chief AI Stylist for Avant. A user is exploring "${styleType}". Generate 5 short, futuristic styling tips for 2026. Each tip must be one concise line with emojis. No headings, no bold text, just bullet points.`;

        // Setting a timeout/content generation
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("✅ AI Response Success!");
        res.json({ success: true, advice: text });

    } catch (error) {
        console.log("--- ❌ GEMINI CRASHED (Using Backups) ---");
        console.error("Error Message:", error.message);

        // Backup Data (Formatting remains consistent)
        const backups = {
            "Eclectic Grandpa": "Vintage cardigan with loose trousers and leather loafers 🧥. Patterned sweater over collared shirt with relaxed pants 👓. Earth-tone blazer with knit vest and retro shoes 🍂. Mix stripes + checks with oversized outerwear 🧶. Old-school glasses with muted layered outfits 🧓",
            "Streetwear": "Oversized hoodie with cargo pants and chunky sneakers 🔥. Graphic tee layered with flannel and baggy jeans 🧢. Neutral tracksuit with crossbody bag and caps 🎯. Puffer jacket with joggers and high-tops ❄️. Denim-on-denim with bold sneakers and chains 👟.",
            "Y2K Revival": "Baby tee with low-rise jeans and mini bag ✨. Metallic top with cargo pants and tinted sunglasses 💿. Cropped jacket with flared pants and platform shoes 💫. Shiny fabrics with bold colors and glossy accessories 💖. Denim skirt with boots and retro shades 👢.",
            "Old Money": "Linen shirt with tailored trousers and loafers 🤍. Neutral blazer with polo tee and chinos 🏛️. Cashmere sweater over shirt with formal pants 🧵. Monochrome outfit with minimal accessories 🎩. Classic watch with clean elegant layering ⌚.",
            "Dark Academia": "Brown blazer with turtleneck and pleated pants 📚. Long coat with boots and muted tones 🌫️. Knit sweater with check trousers and loafers 🍁. Layered scarves with vintage shirts and belts 🕯️. Dark palette outfits with structured silhouettes 🖤.",
            "Gender Fluid": "Oversized shirt with wide-leg pants and boots 🌈. Skirt layered with hoodie and sneakers 💫. Fluid silhouettes with soft fabrics and neutral tones 🧵. Blazers styled with unconventional pairings ✨. Mixed masculine and feminine elements with bold confidence 💥."
        };

        // Fallback logic: "Avant Offline Mode" text removed as requested
        const backupAdvice = backups[req.body.styleType] || "Clean white sneakers with straight-fit jeans 👟. Layered lightweight shirt over a plain tee 🌿. Neutral hoodie with joggers and minimal trainers 🧢. Denim jacket with black jeans 🔵. Simple accessories like a watch and backpack 🎒.";
        
        res.json({ 
            success: true, 
            advice: backupAdvice 
        });
    }
});