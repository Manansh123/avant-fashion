// ================================================================
// ROUTE 3: CHAT AI — Stylist chatbot (text + optional image)
// ================================================================

// Gemini's thinking models can split the answer across multiple
// "parts" — some are internal reasoning (`part.thought === true`),
// one is the real final answer. Grabbing the wrong part = garbled text.
// This keeps ONLY the actual answer content.
function extractGeminiReplyText(response) {
    if (response.text && response.text.trim().length > 0) {
        return response.text.trim();
    }
    const parts = response.candidates?.[0]?.content?.parts || [];
    const answerParts = parts.filter(p => !p.thought && p.text);
    if (answerParts.length > 0) {
        return answerParts.map(p => p.text).join('').trim();
    }
    return null;
}

app.post('/api/chat-ai', upload.single('image'), async (req, res) => {
    try {
        const userMessage = (req.body.message || '').trim();
        const imageFile = req.file;

        if (!userMessage && !imageFile) {
            return res.status(400).json({ success: false, message: 'Message or image required' });
        }

        if (!genAI) {
            console.warn('⚠ GEMINI_API_KEY missing in .env');
            return res.status(500).json({ success: false, message: 'GEMINI_API_KEY missing in .env' });
        }

        let imageUrl = null;
        const parts = [];

        if (imageFile) {
            parts.push({
                inlineData: {
                    mimeType: imageFile.mimetype,
                    data: imageFile.buffer.toString('base64')
                }
            });
            try {
                const cloudResult = await uploadToCloudinary(imageFile.buffer, 'chat');
                imageUrl = cloudResult.secure_url;
            } catch (cloudErr) {
                console.warn('⚠ Cloudinary upload failed (chat image):', cloudErr.message);
            }
        }

        parts.push({ text: userMessage || 'Please analyze this outfit/photo.' });

        const models = ['gemini-flash-latest', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];
        let replyText = null;
        let lastErr = null;

        for (const modelName of models) {
            try {
                // NOTE: no thinkingConfig at all — the budget/level fields kept
                // conflicting across model versions. Removing it entirely avoids
                // the argument error; maxOutputTokens stays high as the safety net.
                const response = await genAI.models.generateContent({
                    model: modelName,
                    contents: [{ role: 'user', parts }],
                    config: {
                        systemInstruction: CHAT_SYSTEM_PROMPT,
                        maxOutputTokens: 2048
                    }
                });

                const finishReason = response.candidates?.[0]?.finishReason;
                console.log(`🔍 [${modelName}] finishReason: ${finishReason} | usage:`, JSON.stringify(response.usageMetadata));

                replyText = extractGeminiReplyText(response);

                if (replyText && replyText.length > 0) {
                    console.log(`✅ Gemini (${modelName}) replied — ${replyText.length} chars`);
                    break;
                } else {
                    console.warn(`⚠ ${modelName}: no usable answer text (finishReason: ${finishReason})`);
                }
            } catch (err) {
                console.warn(`⚠ Gemini ${modelName} failed:`, err.message);
                lastErr = err;
            }
        }

        if (!replyText) {
            throw lastErr || new Error('Gemini returned no usable reply');
        }

        res.json({ success: true, reply: replyText, imageUrl });

    } catch (err) {
        console.error('❌ chat-ai error:', err.message);
        res.status(500).json({ success: false, message: 'Stylist AI is unavailable right now: ' + err.message });
    }
});