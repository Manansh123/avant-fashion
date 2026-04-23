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