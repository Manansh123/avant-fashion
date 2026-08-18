<div align="center">

# AVANT

### The Future of Personal Styling

*A rule-based + AI-powered fashion platform — discover trends, build outfits, manage your digital wardrobe, shop the look, and try it on virtually.*

![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![Cloudinary](https://img.shields.io/badge/Cloudinary-Media-3448C5?logo=cloudinary&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-AI-8E75B2?logo=googlegemini&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-LLM-F55036)
![License](https://img.shields.io/badge/status-in--development-yellow)

</div>

---

## ✦ About

**AVANT** is a full-stack fashion-tech platform built around a simple idea: styling shouldn't be guesswork. It blends editorial design with AI-driven tools so users can discover trends, build complete outfits from scratch, digitize their wardrobe, shop curated looks, and even see how an outfit fits them — before they buy.

The frontend is deliberately minimalist and editorial (black/white, Cormorant Garamond serif + Montserrat sans, sharp geometric layouts), while the backend stitches together several AI providers and services to power the "smart" features.

---

## ✦ Features

### 🏠 Home
Editorial landing page introducing the AVANT philosophy — "a dialogue between logic and intuition" — with animated stat counters and a tool showcase.

### 📈 Trend Discovery
A GenZ trend matrix (Eclectic Grandpa, Streetwear, Y2K Revival, Old Money, Dark Academia, Gender Fluid, and user-uploaded custom trends) with an AI stylist that generates 5 personalized styling tips per aesthetic.

### 🧵 The Outfit Lab (Build Outfit)
Configure item, color, fabric, aesthetic, occasion, weather, footwear, and gender — AI generates a complete, styled outfit pairing (bottom, footwear, accessories, contrast color logic) and renders an editorial fashion photo of it. Supports single-gender and side-by-side unisex (male + female) generation from the same garment.

### 👗 Digital Wardrobe
A personal gallery of saved looks — upload directly, or sync generated outfits from the Outfit Lab. Full lightbox viewer with keyboard navigation, timestamps, and delete controls. Works for guests (session-only) and logged-in users (persisted to MongoDB + Cloudinary).

### 🛍️ Shop the Look
Cross-platform product search across Amazon, Flipkart, Myntra, Ajio, Nykaa Fashion, TataCliq, Snapdeal, and Meesho — with real pricing, ratings, and review snippets pulled live via Google Shopping data. Auto-populates from items generated in the Outfit Lab.

### 🪞 Virtual Fitting Room (Try-On)
Upload a photo of yourself and a garment (or pick a saved look), and get an AI-composited image of you wearing it — powered by a diffusion-based virtual try-on model. Includes an in-flow "save this look to my wardrobe" option and direct hand-off from the Outfit Lab ("Try This Look On").

### 💬 AVANT Stylist (AI Chatbot)
A floating assistant available site-wide — ask fashion questions, get the trend/color of the day, or upload a photo for a styling read. Powered by Gemini with a dedicated fashion-focused system persona; replies are kept short, practical, and on-topic.

### 🔐 Authentication
Email/password signup & login, plus Google Sign-In (Google Identity Services) with automatic account linking for existing email accounts.

---

## ✦ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js, Express 5 |
| **Database** | MongoDB (Atlas) via Mongoose |
| **Media storage** | Cloudinary |
| **Auth** | Local (email/password) + Google OAuth (`google-auth-library`) |
| **Outfit pairing logic** | Groq (Llama / GPT-OSS / Qwen models via Groq API) |
| **Outfit image generation** | Cloudflare Workers AI (`flux-1-schnell`) |
| **Stylist chatbot** | Google Gemini (`@google/genai`) |
| **Virtual try-on** | Diffusion-based garment transfer via Hugging Face (`@gradio/client`) |
| **Shopping data** | SerpApi (Google Shopping) |
| **Frontend** | Vanilla HTML/CSS/JS — no framework, no build step |
| **Fonts** | Cormorant Garamond (serif headings), Montserrat (sans body) |
| **Hosting** | Render |

---

## ✦ Project Structure

```
Manansh_project/
├── index.js                  # Express server — all API routes
├── models/
│   └── User.js                # Mongoose user schema (local + Google auth)
├── package.json
├── Avant/                     # Static frontend root
│   ├── index.html              # Home
│   ├── trends.html             # Trend Discovery
│   ├── outfit.html             # The Outfit Lab
│   ├── wardrobe.html           # Digital Wardrobe
│   ├── shop.html               # Shop the Look
│   ├── tryon.html              # Virtual Fitting Room
│   ├── login.html              # Auth
│   ├── navbar.html / footer.html   # Shared layout partials
│   ├── css/
│   │   └── style.css            # Single master stylesheet
│   ├── js/
│   │   ├── main.js               # Layout loader, scroll effects, nav
│   │   ├── auth.js               # Login state, navbar auth UI
│   │   ├── outfit.js             # Outfit Lab logic
│   │   ├── wardrobe.js           # Wardrobe gallery logic
│   │   ├── shop.js               # Shop search + sync
│   │   ├── tryon.js              # Virtual try-on logic
│   │   ├── trend.js              # Trend matrix + AI tips
│   │   └── chatbot.js            # Self-mounting AI stylist widget
│   └── assets/                 # Images, logos, hero banners
└── .env                        # Environment variables (not committed)
```

---

## ✦ Getting Started

### Prerequisites
- Node.js 18+
- A MongoDB Atlas cluster (free tier is fine)
- API keys for: Cloudinary, Google OAuth, Groq, Gemini, Cloudflare Workers AI, SerpApi, Hugging Face

### Installation

```bash
git clone <repo-url>
cd Manansh_project
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
# Database
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/AvantDB

# Cloudinary (media storage)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Google Sign-In
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Groq (outfit pairing logic + trend tips)
GROQ_API_KEY_OUTFIT=
GROQ_API_KEY_TRENDS=

# Cloudflare Workers AI (outfit image generation)
CF_TOKEN=
CF_ACCOUNT_ID=

# Gemini (stylist chatbot + garment description)
GEMINI_API_KEY=

# Hugging Face (virtual try-on)
HF_TOKEN=

# SerpApi (shop price/rating comparison)
SERPAPI_KEY=

PORT=3000
```

### Run locally

```bash
node index.js
```

Visit **http://localhost:3000**

### Deploying (e.g. on Render)

1. Push to GitHub (note: `.env` is gitignored — it will **not** be included).
2. In your hosting provider's dashboard, manually add every variable from `.env` under **Environment Variables**.
3. Ensure your MongoDB Atlas cluster's **Network Access** allows connections from anywhere (`0.0.0.0/0`), since cloud hosts don't have a fixed IP.
4. Add your deployed URL to Google Cloud Console under **Authorized JavaScript origins** and **Authorized redirect URIs** for Google Sign-In to work in production.

---

## ✦ Notes on Third-Party AI Services

Several features depend on external AI providers with usage limits worth knowing about:

- **Outfit pairing (Groq):** free tier, but individual models are deprecated periodically — the app tries a list of fallback models automatically, with a hardcoded pairing logic as a last resort.
- **Outfit images (Cloudflare Workers AI):** retries automatically on failure; no third-party stock-photo fallback is used.
- **Virtual try-on (Hugging Face):** runs on a shared free GPU pool with a small daily quota — occasional "please try again later" responses are expected on the free tier. For guaranteed availability, an HF PRO subscription or a paid image-generation API can be swapped in.
- **Stylist chatbot (Gemini):** uses the current Gemini Flash model family; the code checks multiple model name fallbacks since Google periodically renames/retires models.

---

<div align="center">

**AVANT** — *We don't create outfits, we curate alignments.*

</div>