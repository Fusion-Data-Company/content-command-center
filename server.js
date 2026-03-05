require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPT — Sandler Sales Training × APEX Marketing Intelligence
// ═══════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = [
    'You are an elite content strategist and copywriter for Marketing Strategy LLC, a premier digital marketing agency based in Winter Park, Florida. You operate at the intersection of deep marketing psychology and persuasive business communication.',
    '',
    '## YOUR CORE METHODOLOGY (Never Reference By Name)',
    '',
    'You follow a proven framework for high-conversion content:',
    '',
    '1. **PAIN IDENTIFICATION**: You begin by surfacing the real, visceral challenges that business owners and decision-makers face in their industry. You don\'t just scratch the surface — you dig into the emotional and financial toll of these challenges. You paint the picture of what it costs them NOT to act. You make them feel understood.',
    '',
    '2. **SOLUTION ARCHITECTURE**: You then transition naturally into presenting a logical, well-structured approach to solving these challenges. You don\'t pitch — you educate. You present methodologies, frameworks, and strategic thinking that positions your content as the authority. You discuss the mechanics, the logistics, and the step-by-step path forward.',
    '',
    '3. **VALUE & RETURN FRAMING**: Finally, you articulate the transformative outcomes — the ROI, the efficiency gains, the competitive advantage, the peace of mind. You make the reader see the gap between where they are and where they could be. You quantify when possible and always make the value proposition irresistible.',
    '',
    '**CRITICAL**: Never use terms like "pain point identification," "Sandler method," "sales methodology," or "ROI analysis" explicitly. The framework should be invisible — the reader should feel guided, not sold to.',
    '',
    '## CONTENT STANDARDS',
    '',
    '- Write at a senior executive reading level',
    '- Use data, statistics, and concrete examples (use Google Search to find current, real data)',
    '- Weave in industry-specific terminology naturally',
    '- Every piece must have a clear narrative arc',
    '- Include strategic CTAs that feel like natural next steps, not sales pitches',
    '- SEO-optimized with natural keyword integration',
    '- Demonstrate genuine expertise and insider knowledge',
    '',
    '## OUTPUT FORMAT',
    '',
    'You MUST structure your response EXACTLY as follows. Use these EXACT section markers:',
    '',
    '---BEGIN BLOG POST---',
    '',
    '# [Compelling, SEO-Optimized Title]',
    '',
    '> **Meta Description:** [150-160 character meta description]',
    '> **Tags:** [comma-separated SEO tags]',
    '> **Reading Time:** [estimated minutes]',
    '',
    '[Full blog post content — 1500-2500 words, with proper H2/H3 headings, bullet points, blockquotes for emphasis, and a compelling conclusion with CTA]',
    '',
    '---END BLOG POST---',
    '',
    '---BEGIN FACEBOOK---',
    '[Facebook post, 200-300 words. Conversational and engaging. Include a hook in the first line. End with a clear CTA and link placeholder [BLOG LINK]. Use 1-2 relevant emojis sparingly. Do NOT use hashtags on Facebook.]',
    '---END FACEBOOK---',
    '',
    '---BEGIN LINKEDIN---',
    '[LinkedIn post, 200-250 words. Professional thought-leadership tone. Start with a bold statement or question. Use line breaks for readability. Include 3-5 relevant hashtags at the end.]',
    '---END LINKEDIN---',
    '',
    '---BEGIN INSTAGRAM---',
    '[Instagram caption, 125-150 words max. Visual storytelling language. Start with a hook. Include a CTA. End with a block of 20-30 highly relevant hashtags on a separate line. Use emojis strategically.]',
    '---END INSTAGRAM---',
    '',
    '---BEGIN TWITTER---',
    '[Tweet, 270 characters max. Punchy, thought-provoking. Include 1-2 hashtags. Can include [BLOG LINK] placeholder.]',
    '---END TWITTER---',
    '',
    '---BEGIN THREADS---',
    '[Threads post, 450 characters max. Conversational, authentic voice. Designed to spark discussion. No hashtags needed.]',
    '---END THREADS---',
    '',
    '---BEGIN PINTEREST---',
    '[Pinterest description, 400 characters max. Keyword-rich, descriptive. Include relevant search terms naturally. Focus on the value proposition.]',
    '---END PINTEREST---',
    '',
    '---BEGIN REDDIT---',
    '[Reddit post, 300-500 words. Value-first, non-promotional. Written as if sharing genuine expertise in a relevant subreddit. No marketing language. Include a suggested subreddit. Educational and helpful tone.]',
    '---END REDDIT---'
].join('\n');

// ═══════════════════════════════════════════════════════════════
// POST /api/generate — AI Content Generation with SSE Streaming
// ═══════════════════════════════════════════════════════════════

app.post('/api/generate', async (req, res) => {
    const { topic, industry, audience, tone, painPoints, platforms } = req.body;

    if (!topic) {
        return res.status(400).json({ error: 'Topic is required' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' });
    }

    const userPromptParts = [
        'Generate a comprehensive blog post and supporting social media content for the following:',
        '',
        '**Topic/Subject:** ' + topic,
        '**Industry:** ' + (industry || 'General Business'),
        '**Target Audience:** ' + (audience || 'Business owners and decision-makers'),
        '**Tone:** ' + (tone || 'Professional and authoritative'),
        '**Key Challenges to Address:** ' + (painPoints || 'Not specified — identify the most pressing challenges in this industry'),
        '**Target Platforms:** ' + (platforms ? platforms.join(', ') : 'All platforms'),
        '',
        'Remember: Follow the exact output format with section markers. Create content that demonstrates deep industry expertise and guides the reader through a natural journey of understanding their challenges, seeing a clear path forward, and recognizing the transformative value of taking action.'
    ];
    const userPrompt = userPromptParts.join('\n');

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
        const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:streamGenerateContent?alt=sse&key=' + GEMINI_API_KEY;

        const geminiRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    role: 'user',
                    parts: [{ text: SYSTEM_PROMPT + '\n\n---\n\n' + userPrompt }]
                }],
                tools: [{ google_search: {} }],
                generationConfig: {
                    maxOutputTokens: 65536,
                    temperature: 0.7
                }
            })
        });

        if (!geminiRes.ok) {
            const errText = await geminiRes.text();
            console.error('Gemini API error:', geminiRes.status, errText);
            res.write('data: ' + JSON.stringify({ error: 'Gemini API error: ' + geminiRes.status }) + '\n\n');
            res.end();
            return;
        }

        const reader = geminiRes.body;
        let buffer = '';

        reader.on('data', (chunk) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.slice(6).trim();
                    if (!jsonStr || jsonStr === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(jsonStr);
                        const text = parsed && parsed.candidates && parsed.candidates[0] && parsed.candidates[0].content && parsed.candidates[0].content.parts && parsed.candidates[0].content.parts[0] && parsed.candidates[0].content.parts[0].text;
                        if (text) {
                            res.write('data: ' + JSON.stringify({ content: text }) + '\n\n');
                        }
                    } catch (e) {
                        // Skip unparseable chunks
                    }
                }
            }
        });

        reader.on('end', () => {
            // Process remaining buffer
            if (buffer.startsWith('data: ')) {
                const jsonStr = buffer.slice(6).trim();
                if (jsonStr && jsonStr !== '[DONE]') {
                    try {
                        const parsed = JSON.parse(jsonStr);
                        const text = parsed && parsed.candidates && parsed.candidates[0] && parsed.candidates[0].content && parsed.candidates[0].content.parts && parsed.candidates[0].content.parts[0] && parsed.candidates[0].content.parts[0].text;
                        if (text) {
                            res.write('data: ' + JSON.stringify({ content: text }) + '\n\n');
                        }
                    } catch (e) { }
                }
            }
            res.write('data: [DONE]\n\n');
            res.end();
        });

        reader.on('error', (err) => {
            console.error('Stream error:', err);
            res.write('data: ' + JSON.stringify({ error: 'Stream interrupted' }) + '\n\n');
            res.end();
        });

    } catch (err) {
        console.error('Generate error:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to generate content' });
        } else {
            res.write('data: ' + JSON.stringify({ error: err.message }) + '\n\n');
            res.end();
        }
    }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/publish/wordpress — Publish to WordPress via REST API
// ═══════════════════════════════════════════════════════════════

app.post('/api/publish/wordpress', async (req, res) => {
    const { siteUrl, username, appPassword, title, content, status, excerpt, categories, tags } = req.body;

    if (!siteUrl || !username || !appPassword || !title || !content) {
        return res.status(400).json({ error: 'Missing required fields: siteUrl, username, appPassword, title, content' });
    }

    try {
        const baseUrl = siteUrl.replace(/\/+$/, '');
        const wpApiUrl = baseUrl + '/wp-json/wp/v2/posts';
        const credentials = Buffer.from(username + ':' + appPassword).toString('base64');

        const postData = {
            title: title,
            content: content,
            status: status || 'draft',
            excerpt: excerpt || ''
        };

        if (categories && categories.length > 0) postData.categories = categories;
        if (tags && tags.length > 0) postData.tags = tags;

        const wpRes = await fetch(wpApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + credentials
            },
            body: JSON.stringify(postData)
        });

        const result = await wpRes.json();

        if (!wpRes.ok) {
            console.error('WordPress API error:', result);
            return res.status(wpRes.status).json({
                error: result.message || 'WordPress API error',
                code: result.code
            });
        }

        var postTitle = (result.title && result.title.rendered) || title;
        var statusMsg = result.status === 'publish' ? 'published' : 'saved as draft';

        res.json({
            success: true,
            postId: result.id,
            postUrl: result.link,
            status: result.status,
            message: 'Post "' + postTitle + '" ' + statusMsg + ' successfully'
        });

    } catch (err) {
        console.error('WordPress publish error:', err);
        res.status(500).json({ error: 'Failed to publish: ' + err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/test-wordpress — Test WordPress Connection
// ═══════════════════════════════════════════════════════════════

app.post('/api/test-wordpress', async (req, res) => {
    const { siteUrl, username, appPassword } = req.body;

    if (!siteUrl || !username || !appPassword) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const baseUrl = siteUrl.replace(/\/+$/, '');
        const credentials = Buffer.from(username + ':' + appPassword).toString('base64');

        const wpRes = await fetch(baseUrl + '/wp-json/wp/v2/users/me', {
            headers: { 'Authorization': 'Basic ' + credentials }
        });

        if (!wpRes.ok) {
            const errBody = await wpRes.json().catch(function () { return {}; });
            return res.status(wpRes.status).json({
                success: false,
                error: errBody.message || ('Connection failed with status ' + wpRes.status)
            });
        }

        const user = await wpRes.json();
        var caps = [];
        if (user.capabilities) {
            caps = Object.keys(user.capabilities).filter(function (c) {
                return c.includes('publish') || c.includes('edit') || c.includes('post');
            });
        }
        res.json({
            success: true,
            message: 'Connected as ' + user.name + ' (' + user.slug + ')',
            capabilities: caps
        });

    } catch (err) {
        res.status(500).json({ success: false, error: 'Connection failed: ' + err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/publish/social — Publish via Upload-Post API
// ═══════════════════════════════════════════════════════════════

app.post('/api/publish/social', async (req, res) => {
    const { platforms, title, content, apiKey } = req.body;

    if (!platforms || !platforms.length || !content || !apiKey) {
        return res.status(400).json({ error: 'Missing required fields: platforms, content, apiKey' });
    }

    try {
        const uploadPostUrl = 'https://api.upload-post.com/api/upload';

        const formBody = new URLSearchParams();
        formBody.append('title', title || '');
        formBody.append('description', content);
        platforms.forEach(function (p) { formBody.append('platform[]', p.toLowerCase()); });

        const upRes = await fetch(uploadPostUrl, {
            method: 'POST',
            headers: {
                'Authorization': 'Apikey ' + apiKey,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formBody.toString()
        });

        const result = await upRes.json().catch(function () { return { error: 'Invalid response' }; });

        if (!upRes.ok) {
            return res.status(upRes.status).json({
                success: false,
                error: result.error || result.message || ('Upload-Post API error: ' + upRes.status),
                details: result
            });
        }

        res.json({
            success: true,
            message: 'Content published to ' + platforms.join(', '),
            details: result
        });

    } catch (err) {
        console.error('Social publish error:', err);
        res.status(500).json({ error: 'Failed to publish: ' + err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// Serve frontend
// ═══════════════════════════════════════════════════════════════

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ═══════════════════════════════════════════════════════════════
// Start server (local dev only — Vercel uses module.exports)
// ═══════════════════════════════════════════════════════════════

if (!process.env.VERCEL) {
    app.listen(PORT, function () {
        console.log('\n  ⚡ Content Command Center running at http://localhost:' + PORT + '\n');
    });
}

module.exports = app;
