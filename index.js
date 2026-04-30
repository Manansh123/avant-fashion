require('dotenv').config();
const express = require('express');
const path = require('path');
const https = require('https');
const mongoose = require('mongoose');
const User = require('./models/User');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'Avant')));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected!'))
    .catch(err => console.log('❌ DB Error:', err.message));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Avant', 'index.html'));
});

app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ success: false, message: "Email already exists!" });
        const newUser = new User({ name, email, password });
        await newUser.save();
        res.status(201).json({ success: true, message: "Account created! Now Log In.", name: newUser.name });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error during signup." });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "User not found. Please Sign Up." });
        if (user.password !== password) return res.status(401).json({ success: false, message: "Incorrect Password!" });
        res.status(200).json({ success: true, message: "Login successful! Welcome to AVANT.", name: user.name });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error during login." });
    }
});

app.get('/:page', (req, res) => {
    res.sendFile(path.join(__dirname, 'Avant', req.params.page));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Avant running at http://localhost:${PORT}`));

// ================================================================
// POLLINATIONS HELPER — proper URL build karo
// ================================================================
function fetchFromPollinations(styleType) {
    return new Promise((resolve, reject) => {

        // Simple, clear prompt — no quotes, clean text
        const prompt = `List exactly 5 styling tips for ${styleType} fashion aesthetic in 2026. Number each tip from 1 to 5. Write each tip on a new line. Keep each tip under 15 words. Only output the 5 numbered tips, nothing else.`;

        // encodeURIComponent se spaces %20 bante hain — proper encoding
        const encodedPrompt = encodeURIComponent(prompt);
        const fullUrl = `https://text.pollinations.ai/${encodedPrompt}`;

        console.log('📡 Calling Pollinations...');
        console.log('🔗 URL (first 80 chars):', fullUrl.substring(0, 80));

        const options = {
            hostname: 'text.pollinations.ai',
            path: `/${encodedPrompt}`,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'text/plain'
            },
            timeout: 20000
        };

        const req = https.request(options, (response) => {
            console.log('📥 Pollinations status code:', response.statusCode);

            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                console.log('📝 Raw response (first 150 chars):', data.substring(0, 150));
                if (data && data.trim().length > 10) {
                    resolve(data.trim());
                } else {
                    reject(new Error('Empty response from Pollinations'));
                }
            });
        });

        req.on('error', (err) => {
            console.error('❌ Request error:', err.message);
            reject(err);
        });

        req.on('timeout', () => {
            console.error('⏱ Request timed out');
            req.destroy();
            reject(new Error('Pollinations timeout'));
        });

        req.end();
    });
}

// ================================================================
// AI ROUTE
// ================================================================
app.post('/api/style-advice', async (req, res) => {
    const { styleType } = req.body;
    console.log(`\n=============================`);
    console.log(`🎨 AI request: "${styleType}"`);
    console.log(`=============================`);

    try {
        const text = await fetchFromPollinations(styleType);
        console.log(`✅ SUCCESS — sending AI response`);
        res.json({ success: true, isAI: true, advice: text });

    } catch (error) {
        console.error(`❌ FAILED: ${error.message}`);
        console.log(`⚠ Using backup tips`);

        const backups = {
            "Eclectic Grandpa": "1. Layer a vintage cardigan over a collared shirt.\n2. Mix patterned sweaters with earth-tone trousers.\n3. Wear an oversized blazer with a knit vest and retro glasses.\n4. Combine stripes and checks with oversized outerwear.\n5. Accessorize with old-school frames and a structured tote.",
            "Streetwear": "1. Pair an oversized hoodie with cargo pants and chunky sneakers.\n2. Layer a graphic tee under a flannel with baggy jeans.\n3. Rock a neutral tracksuit with a crossbody bag and cap.\n4. Style a puffer jacket with joggers and high-top sneakers.\n5. Try denim-on-denim with bold sneakers and a silver chain.",
            "Y2K Revival": "1. Wear a baby tee with low-rise flared jeans and a mini bag.\n2. Combine a metallic top with cargo pants and tinted sunglasses.\n3. Layer a cropped jacket over a bandeau with wide-leg trousers.\n4. Use glossy fabrics in bold colors with platform shoes.\n5. Style a denim mini skirt with knee-high boots.",
            "Old Money": "1. Tuck a linen shirt into tailored trousers with loafers.\n2. Wear a neutral blazer over a polo tee with chinos.\n3. Layer a cashmere crewneck over a collared shirt.\n4. Build a monochrome outfit in cream or camel tones.\n5. Add a classic watch and structured leather bag.",
            "Dark Academia": "1. Wear a brown blazer over a turtleneck with pleated trousers.\n2. Style a long wool coat with knee-high boots and a plaid scarf.\n3. Layer a knit sweater over a checked shirt with Oxford shoes.\n4. Use dark tones like burgundy, forest green, and charcoal.\n5. Carry a leather satchel and wear vintage-inspired frames.",
            "Gender Fluid": "1. Pair an oversized button-up with wide-leg tailored trousers.\n2. Layer a hoodie under a structured skirt with chunky sneakers.\n3. Mix draped fabrics with sharp blazers for contrast.\n4. Style a longline blazer as a dress with a waist belt.\n5. Combine masculine and feminine silhouettes with bold confidence."
        };

        const fallback = backups[styleType] ||
            "1. Start with a neutral base of white, black, or beige.\n2. Add one statement piece that defines the aesthetic.\n3. Choose footwear that matches the energy of the look.\n4. Keep accessories minimal and intentional.\n5. Prioritize fit above everything else.";

        res.json({ success: true, isAI: false, advice: fallback });
    }
});