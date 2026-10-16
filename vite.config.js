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
                chatbot: path.resolve(__dirname, 'client/src/chatbot/main.jsx')
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
