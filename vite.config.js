const path = require('path');
const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');

// Multi-entry library-style build: ES modules dropped into Avant/js/react
// so Express can keep serving existing .html URLs with no SPA rewrite.
module.exports = defineConfig({
    plugins: [react()],
    publicDir: false,
    build: {
        outDir: path.resolve(__dirname, 'Avant/js/react'),
        emptyOutDir: true,
        sourcemap: false,
        minify: false,
        rollupOptions: {
            input: {
                login: path.resolve(__dirname, 'client/src/login/main.jsx'),
                chatbot: path.resolve(__dirname, 'client/src/chatbot/main.jsx'),
                home: path.resolve(__dirname, 'client/src/home/main.jsx'),
                trends: path.resolve(__dirname, 'client/src/trends/main.jsx'),
                outfit: path.resolve(__dirname, 'client/src/outfit/main.jsx'),
                wardrobe: path.resolve(__dirname, 'client/src/wardrobe/main.jsx'),
                shop: path.resolve(__dirname, 'client/src/shop/main.jsx'),
                tryon: path.resolve(__dirname, 'client/src/tryon/main.jsx')
            },
            output: {
                format: 'es',
                entryFileNames: '[name].js',
                chunkFileNames: 'shared-[name].js',
                assetFileNames: '[name][extname]'
            }
        }
    }
});
