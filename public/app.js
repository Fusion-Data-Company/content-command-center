/* ═══════════════════════════════════════════════════════════════
   MARKETING STRATEGY LLC — CONTENT COMMAND CENTER
   Application Logic
   ═══════════════════════════════════════════════════════════════ */

// ─── State ───────────────────────────────────────────────────

let fullMarkdown = '';
let parsedContent = {};
let wpPublishStatus = 'draft';

const PLATFORM_LIMITS = {
    facebook: 63206,
    linkedin: 3000,
    instagram: 2200,
    twitter: 280,
    threads: 500,
    pinterest: 500,
    reddit: 40000
};

const SECTION_MARKERS = {
    blog: { start: '---BEGIN BLOG POST---', end: '---END BLOG POST---' },
    facebook: { start: '---BEGIN FACEBOOK---', end: '---END FACEBOOK---' },
    linkedin: { start: '---BEGIN LINKEDIN---', end: '---END LINKEDIN---' },
    instagram: { start: '---BEGIN INSTAGRAM---', end: '---END INSTAGRAM---' },
    twitter: { start: '---BEGIN TWITTER---', end: '---END TWITTER---' },
    threads: { start: '---BEGIN THREADS---', end: '---END THREADS---' },
    pinterest: { start: '---BEGIN PINTEREST---', end: '---END PINTEREST---' },
    reddit: { start: '---BEGIN REDDIT---', end: '---END REDDIT---' }
};

// ─── Platform Toggle ─────────────────────────────────────────

document.querySelectorAll('.platform-check').forEach(el => {
    el.addEventListener('click', (e) => {
        e.preventDefault();
        const cb = el.querySelector('input');
        cb.checked = !cb.checked;
        el.classList.toggle('active', cb.checked);
    });
});

// ─── Form Submit ─────────────────────────────────────────────

document.getElementById('contentForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const topic = document.getElementById('topicInput').value.trim();
    if (!topic) return;

    const industry = document.getElementById('industrySelect').value;
    const audience = document.getElementById('audienceInput').value.trim();
    const tone = document.getElementById('toneSelect').value;
    const painPoints = document.getElementById('painPointsInput').value.trim();

    const platforms = [];
    document.querySelectorAll('.platform-check.active').forEach(el => {
        platforms.push(el.dataset.platform);
    });

    const btn = document.getElementById('generateBtn');
    btn.disabled = true;
    btn.classList.add('loading');

    // Reset state
    fullMarkdown = '';
    parsedContent = {};

    // Show output section & status
    const outputSection = document.getElementById('outputSection');
    outputSection.classList.add('visible');
    outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    setStatus('loading', 'Connecting to Gemini 2.5 Pro...');

    // Clear output panels
    document.getElementById('blogRendered').innerHTML = '<div class="shimmer" style="height:20px;border-radius:4px;margin-bottom:12px;"></div><div class="shimmer" style="height:20px;border-radius:4px;width:80%;margin-bottom:12px;"></div><div class="shimmer" style="height:20px;border-radius:4px;width:60%;"></div>';
    document.getElementById('blogRaw').textContent = '';
    Object.keys(PLATFORM_LIMITS).forEach(p => {
        document.getElementById('content-' + p).innerHTML = '<div class="shimmer" style="height:14px;border-radius:4px;margin-bottom:8px;"></div><div class="shimmer" style="height:14px;border-radius:4px;width:70%;"></div>';
    });

    try {
        const res = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, industry, audience, tone, painPoints, platforms })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Server error ' + res.status);
        }

        setStatus('loading', 'Generating strategic content...');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();
                    if (data === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.content) {
                            fullMarkdown += parsed.content;
                            updateOutputs();
                        }
                        if (parsed.error) {
                            throw new Error(parsed.error);
                        }
                    } catch (e) {
                        if (e.message && !e.message.includes('JSON')) throw e;
                    }
                }
            }
        }

        // Final parse
        parseAllSections();
        updateSocialCards();
        updateBlogStats();
        enablePublishButtons();

        setStatus('success', '✓ Content suite generated successfully');

    } catch (err) {
        console.error('Generation error:', err);
        setStatus('error', '✗ ' + err.message);
    } finally {
        btn.disabled = false;
        btn.classList.remove('loading');
    }
});

// ─── Output Updates ──────────────────────────────────────────

function updateOutputs() {
    // Update blog rendered view (stream in real-time)
    const blogContent = extractSection('blog') || fullMarkdown;
    document.getElementById('blogRendered').innerHTML = marked.parse(blogContent);
    document.getElementById('blogRaw').textContent = blogContent;

    // Auto-scroll blog panel
    const panel = document.getElementById('blogRendered');
    panel.scrollTop = panel.scrollHeight;

    // Update social cards in real-time
    parseAllSections();
    updateSocialCards();
}

function parseAllSections() {
    Object.keys(SECTION_MARKERS).forEach(key => {
        const content = extractSection(key);
        if (content) parsedContent[key] = content.trim();
    });
}

function extractSection(key) {
    const markers = SECTION_MARKERS[key];
    if (!markers) return '';
    const startIdx = fullMarkdown.indexOf(markers.start);
    const endIdx = fullMarkdown.indexOf(markers.end);
    if (startIdx === -1) return '';
    const contentStart = startIdx + markers.start.length;
    if (endIdx === -1) return fullMarkdown.slice(contentStart).trim();
    return fullMarkdown.slice(contentStart, endIdx).trim();
}

function updateSocialCards() {
    Object.keys(PLATFORM_LIMITS).forEach(platform => {
        const content = parsedContent[platform];
        const el = document.getElementById('content-' + platform);
        const charEl = document.getElementById('chars-' + platform);
        if (content) {
            el.textContent = content;
            const len = content.length;
            const limit = PLATFORM_LIMITS[platform];
            charEl.textContent = len.toLocaleString() + ' / ' + limit.toLocaleString();
            charEl.classList.toggle('over', len > limit);
        }
    });
}

function updateBlogStats() {
    const blog = parsedContent.blog || '';
    const words = blog.split(/\s+/).filter(w => w.length > 0).length;
    const readTime = Math.max(1, Math.ceil(words / 250));
    document.getElementById('blogWordCount').textContent = words.toLocaleString() + ' words';
    document.getElementById('blogReadTime').textContent = readTime + ' min read';
}

function enablePublishButtons() {
    document.querySelectorAll('.social-card .publish-btn').forEach(btn => btn.disabled = false);
    document.getElementById('publishAllBtn').disabled = false;
}

// ─── Status Management ───────────────────────────────────────

function setStatus(type, message) {
    const area = document.getElementById('statusArea');
    const text = document.getElementById('statusText');
    area.className = 'status-area visible ' + (type === 'loading' ? '' : type);
    area.querySelector('.mini-spinner').style.display = type === 'loading' ? 'block' : 'none';
    text.textContent = message;
}

// ─── Blog Tab Switching ──────────────────────────────────────

function switchBlogTab(view) {
    document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    const rendered = document.getElementById('blogRendered');
    const raw = document.getElementById('blogRaw');
    if (view === 'rendered') {
        rendered.style.display = 'block';
        raw.style.display = 'none';
    } else {
        rendered.style.display = 'none';
        raw.style.display = 'block';
    }
}

// ─── Copy Functionality ──────────────────────────────────────

async function copyContent(type) {
    let text = '';

    if (type === 'blog-html') {
        text = document.getElementById('blogRendered').innerHTML;
    } else if (type === 'blog-md') {
        text = parsedContent.blog || fullMarkdown;
    } else {
        text = parsedContent[type] || '';
    }

    if (!text) {
        showToast('No content to copy', 'error');
        return;
    }

    try {
        await navigator.clipboard.writeText(text);

        // Find the clicked button and show copied state
        const btn = event.target.closest('.ghost-btn');
        if (btn) {
            const original = btn.textContent;
            btn.textContent = '✓ Copied!';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = original;
                btn.classList.remove('copied');
            }, 2000);
        }
        showToast('Copied to clipboard', 'success');
    } catch (err) {
        showToast('Failed to copy', 'error');
    }
}

// ─── Toast Notifications ─────────────────────────────────────

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast visible ' + type;
    setTimeout(() => { toast.classList.remove('visible'); }, 3000);
}

// ─── Settings Management ─────────────────────────────────────

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('ccc_settings') || '{}');
    if (settings.wpSites && settings.wpSites.length > 0) {
        renderWPSites(settings.wpSites);
    } else {
        renderWPSites([{ url: '', username: '', appPassword: '' }]);
    }
    if (settings.uploadPostKey) {
        document.getElementById('uploadPostKey').value = settings.uploadPostKey;
    }
}

function saveSettings() {
    const wpSites = [];
    document.querySelectorAll('.wp-site-entry').forEach(entry => {
        const url = entry.querySelector('.wp-url')?.value.trim();
        const username = entry.querySelector('.wp-user')?.value.trim();
        const appPassword = entry.querySelector('.wp-pass')?.value.trim();
        if (url || username) {
            wpSites.push({ url, username, appPassword });
        }
    });

    const settings = {
        wpSites,
        uploadPostKey: document.getElementById('uploadPostKey').value.trim()
    };

    localStorage.setItem('ccc_settings', JSON.stringify(settings));
    showToast('Settings saved', 'success');
    closeSettings();
}

function renderWPSites(sites) {
    const container = document.getElementById('wpSitesList');
    container.innerHTML = '';
    sites.forEach((site, i) => {
        container.innerHTML += `
      <div class="wp-site-entry">
        <div class="entry-row full">
          <div class="form-group">
            <label>Site URL</label>
            <input type="url" class="form-input wp-url" placeholder="https://yourblog.com" value="${site.url || ''}">
          </div>
        </div>
        <div class="entry-row">
          <div class="form-group">
            <label>Username</label>
            <input type="text" class="form-input wp-user" placeholder="admin" value="${site.username || ''}">
          </div>
          <div class="form-group">
            <label>Application Password</label>
            <input type="password" class="form-input wp-pass" placeholder="xxxx xxxx xxxx xxxx" value="${site.appPassword || ''}">
          </div>
        </div>
        <div class="entry-actions">
          <button class="ghost-btn" onclick="testWPConnection(this)">🔌 Test Connection</button>
          ${sites.length > 1 ? '<button class="remove-site-btn" onclick="removeWPSite(this)">✕ Remove</button>' : ''}
        </div>
        <div class="test-result-container"></div>
      </div>`;
    });
}

function addWPSite() {
    const container = document.getElementById('wpSitesList');
    const entry = document.createElement('div');
    entry.className = 'wp-site-entry';
    entry.innerHTML = `
    <div class="entry-row full">
      <div class="form-group">
        <label>Site URL</label>
        <input type="url" class="form-input wp-url" placeholder="https://yourblog.com">
      </div>
    </div>
    <div class="entry-row">
      <div class="form-group">
        <label>Username</label>
        <input type="text" class="form-input wp-user" placeholder="admin">
      </div>
      <div class="form-group">
        <label>Application Password</label>
        <input type="password" class="form-input wp-pass" placeholder="xxxx xxxx xxxx xxxx">
      </div>
    </div>
    <div class="entry-actions">
      <button class="ghost-btn" onclick="testWPConnection(this)">🔌 Test Connection</button>
      <button class="remove-site-btn" onclick="removeWPSite(this)">✕ Remove</button>
    </div>
    <div class="test-result-container"></div>`;
    container.appendChild(entry);
}

function removeWPSite(btn) {
    btn.closest('.wp-site-entry').remove();
}

async function testWPConnection(btn) {
    const entry = btn.closest('.wp-site-entry');
    const url = entry.querySelector('.wp-url').value.trim();
    const username = entry.querySelector('.wp-user').value.trim();
    const appPassword = entry.querySelector('.wp-pass').value.trim();
    const resultContainer = entry.querySelector('.test-result-container');

    if (!url || !username || !appPassword) {
        resultContainer.innerHTML = '<div class="test-result error">Please fill in all fields</div>';
        return;
    }

    btn.disabled = true;
    btn.textContent = '⏳ Testing...';
    resultContainer.innerHTML = '';

    try {
        const res = await fetch('/api/test-wordpress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ siteUrl: url, username, appPassword })
        });

        const data = await res.json();

        if (data.success) {
            resultContainer.innerHTML = `<div class="test-result success">✓ ${data.message}</div>`;
        } else {
            resultContainer.innerHTML = `<div class="test-result error">✗ ${data.error}</div>`;
        }
    } catch (err) {
        resultContainer.innerHTML = `<div class="test-result error">✗ Connection failed: ${err.message}</div>`;
    } finally {
        btn.disabled = false;
        btn.textContent = '🔌 Test Connection';
    }
}

function openSettings() {
    loadSettings();
    document.getElementById('settingsModal').classList.add('visible');
}

function closeSettings() {
    document.getElementById('settingsModal').classList.remove('visible');
}

// ─── WordPress Publishing ────────────────────────────────────

function openWPPublish() {
    const settings = JSON.parse(localStorage.getItem('ccc_settings') || '{}');
    const sites = settings.wpSites || [];

    if (sites.length === 0 || !sites[0].url) {
        showToast('Configure WordPress sites in Settings first', 'error');
        return;
    }

    const select = document.getElementById('wpPublishSite');
    select.innerHTML = '';
    sites.forEach((site, i) => {
        if (site.url) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = site.url.replace(/https?:\/\//, '');
            select.appendChild(opt);
        }
    });

    document.getElementById('wpPublishResult').innerHTML = '';
    document.getElementById('wpPublishModal').classList.add('visible');
}

function closeWPPublish() {
    document.getElementById('wpPublishModal').classList.remove('visible');
}

function selectPublishStatus(status) {
    wpPublishStatus = status;
    document.querySelectorAll('.publish-status-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === status);
    });
}

async function publishToWordPress() {
    const settings = JSON.parse(localStorage.getItem('ccc_settings') || '{}');
    const siteIdx = document.getElementById('wpPublishSite').value;
    const site = settings.wpSites[siteIdx];

    if (!site) {
        showToast('No site selected', 'error');
        return;
    }

    const blogContent = parsedContent.blog || '';
    if (!blogContent) {
        showToast('No blog content to publish', 'error');
        return;
    }

    // Extract title from first H1
    const titleMatch = blogContent.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : 'Untitled Post';

    // Convert markdown to HTML for WordPress
    const htmlContent = marked.parse(blogContent);

    const btn = document.getElementById('wpPublishBtn');
    btn.disabled = true;
    const spinner = btn.querySelector('.spinner-sm');
    if (spinner) spinner.style.display = 'inline-block';

    try {
        const res = await fetch('/api/publish/wordpress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                siteUrl: site.url,
                username: site.username,
                appPassword: site.appPassword,
                title,
                content: htmlContent,
                status: wpPublishStatus
            })
        });

        const data = await res.json();

        if (data.success) {
            document.getElementById('wpPublishResult').innerHTML = `
        <div class="test-result success">
          ✓ ${data.message}<br>
          <a href="${data.postUrl}" target="_blank" style="color:var(--accent)">View Post →</a>
        </div>`;
            showToast('Published to WordPress!', 'success');
        } else {
            document.getElementById('wpPublishResult').innerHTML = `
        <div class="test-result error">✗ ${data.error}</div>`;
            showToast('WordPress publish failed', 'error');
        }
    } catch (err) {
        document.getElementById('wpPublishResult').innerHTML = `
      <div class="test-result error">✗ ${err.message}</div>`;
    } finally {
        btn.disabled = false;
        if (spinner) spinner.style.display = 'none';
    }
}

// ─── Social Media Publishing ─────────────────────────────────

async function publishSingle(platform) {
    const settings = JSON.parse(localStorage.getItem('ccc_settings') || '{}');
    const apiKey = settings.uploadPostKey;

    if (!apiKey) {
        showToast('Configure Upload-Post API key in Settings', 'error');
        return;
    }

    const content = parsedContent[platform];
    if (!content) {
        showToast('No content for ' + platform, 'error');
        return;
    }

    const card = document.getElementById('card-' + platform);
    const btn = card.querySelector('.card-footer .publish-btn');
    btn.disabled = true;
    btn.textContent = 'Publishing...';

    try {
        const res = await fetch('/api/publish/social', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                platforms: [platform === 'twitter' ? 'x' : platform],
                title: document.getElementById('topicInput').value,
                content,
                apiKey
            })
        });

        const data = await res.json();

        if (data.success) {
            btn.textContent = '✓ Published';
            btn.style.background = 'var(--accent-bg)';
            btn.style.color = 'var(--accent)';
            btn.style.border = '1px solid var(--accent)';
            showToast(`Published to ${platform}!`, 'success');
        } else {
            throw new Error(data.error || 'Publish failed');
        }
    } catch (err) {
        btn.textContent = 'Retry';
        btn.disabled = false;
        showToast(`${platform}: ${err.message}`, 'error');
    }
}

async function publishAllSocial() {
    const settings = JSON.parse(localStorage.getItem('ccc_settings') || '{}');
    if (!settings.uploadPostKey) {
        showToast('Configure Upload-Post API key in Settings', 'error');
        return;
    }

    const platforms = Object.keys(parsedContent).filter(p => p !== 'blog' && parsedContent[p]);
    if (platforms.length === 0) {
        showToast('No social content to publish', 'error');
        return;
    }

    const btn = document.getElementById('publishAllBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Publishing...';

    for (const platform of platforms) {
        await publishSingle(platform);
        // Small delay between publishes
        await new Promise(r => setTimeout(r, 500));
    }

    btn.textContent = '✓ All Published';
}

// ─── Keyboard Shortcuts ──────────────────────────────────────

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeSettings();
        closeWPPublish();
    }
});

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('visible');
        }
    });
});

// ─── Initialize ──────────────────────────────────────────────

loadSettings();
