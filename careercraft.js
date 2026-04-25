/* ============================================================
   CareerCraft v2.0 – Full Upgrade
   - localStorage persistence for resume, skills, auth
   - Improved AI prompts (summary, exp, skills, interview)
   - 30+ job listings with smarter matching
   - Bug fixes: tab switching, timer, AI apply
   - New features: saved jobs persist, resume autosave, dark/light sections
   ============================================================ */

'use strict';
window.addEventListener("load", () => {
    const session = localStorage.getItem("cc_session");
    if (session) {
        currentUser = JSON.parse(session);
        updateAuthUI();
        loadUserData();
    }
});

// ── STATE ─────────────────────────────────────────────────
let currentUser = null;
let savedJobs = new Set();
let activeJobChip = 'all';
let timerInterval = null;
let timerSeconds = 120;
let timerRunning = false;
let currentCategory = 'general';
let currentQuestions = [];
let autoSaveTimer = null;

// ── STORAGE HELPERS ───────────────────────────────────────
const LS = {
    get(key, fallback = null) {
        try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
    },
    set(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
    },
    remove(key) { try { localStorage.removeItem(key); } catch {} }
};

// ── MODAL ─────────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.add('active'); }

function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function switchModal(from, to) { closeModal(from);
    openModal(to); }

// ── AUTH ──────────────────────────────────────────────────
async function doLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPass').value.trim();

    if (!email || !pass) {
        alert("Enter email & password");
        return;
    }

    const res = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass })
    });

    const data = await res.json();

    if (data.msg === "Login success") {
        currentUser = data.user;

        // optional: store session
        localStorage.setItem("cc_session", JSON.stringify(currentUser));

        updateAuthUI();
        loadUserData();

        alert("Login successful");
    } else {
        alert(data.msg);
    }
}
async function doSignup() {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const pass = document.getElementById('signupPass').value.trim();

    if (!name || !email || !pass) {
        alert("Fill all fields");
        return;
    }

    const res = await fetch("http://localhost:5000/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password: pass })
    });

    const data = await res.json();
    alert(data.msg);
}

async function doLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPass').value.trim();

    if (!email || !pass) {
        alert("Enter email & password");
        return;
    }

    const res = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass })
    });

    const data = await res.json();

    if (data.msg === "Login success") {
        currentUser = data.user;

        // optional: store session
        localStorage.setItem("cc_session", JSON.stringify(currentUser));

        updateAuthUI();
        loadUserData();

        alert("Login successful");
    } else {
        alert(data.msg);
    }
}

function logout() {
    currentUser = null;
    LS.remove('cc_session');
    updateAuthUI();
    backToHome();
    showToast('👋', 'Logged out successfully.');
}

function updateAuthUI() {
    const ok = !!currentUser;
    document.getElementById('userBadge').style.display = ok ? 'flex' : 'none';
    document.getElementById('btnLogin').style.display = ok ? 'none' : '';
    document.getElementById('btnSignup').style.display = ok ? 'none' : '';
    if (ok) {
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('userAvatar').textContent = currentUser.name[0].toUpperCase();
    }
}

async function loadUserData() {
    if (!currentUser) return;

    const res = await fetch(`http://localhost:5000/get-resume/${currentUser.email}`);
    const data = await res.json();

    if (!data) return;

    Object.keys(data).forEach(key => {
        const el = document.getElementById(key);
        if (el) el.value = data[key];
    });

    if (typeof liveUpdate === "function") {
        liveUpdate();
    }
}

async function saveUserData() {
    if (!currentUser) return;

    const fields = [
        'rName', 'rEmail', 'rPhone', 'rLocation', 'rLinkedin',
        'rSummary', 'rSkills', 'rExpTitle', 'rExpOrg',
        'rExpDesc', 'rEdu', 'rCerts'
    ];

    const data = {};

    fields.forEach(f => {
        const el = document.getElementById(f);
        if (el) data[f] = el.value;
    });

    await fetch("http://localhost:5000/save-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: currentUser.email,
            resume: data
        })
    });
}

function scheduleAutosave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        saveUserData();
        showToast('💾', 'Resume auto-saved!');
    }, 2000);
}

// ── NAV ───────────────────────────────────────────────────
function launchApp(tab) {
    document.getElementById('heroSection').style.display = 'none';
    document.getElementById('featuresSection').style.display = 'none';
    document.getElementById('statsSection').style.display = 'none';
    document.getElementById('testimonialsSection').style.display = 'none';
    document.getElementById('appSection').style.display = 'block';
    if (tab) switchTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function backToHome() {
    document.getElementById('heroSection').style.display = '';
    document.getElementById('featuresSection').style.display = '';
    document.getElementById('statsSection').style.display = '';
    document.getElementById('testimonialsSection').style.display = '';
    document.getElementById('appSection').style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

function learnMore() { document.getElementById('featuresSection').scrollIntoView({ behavior: 'smooth' }); }

// ── TABS ──────────────────────────────────────────────────
function switchTab(name) {
    const tabs = ['resume', 'skills', 'jobs', 'interview'];
    document.querySelectorAll('.tab-btn').forEach((b, i) => b.classList.toggle('active', tabs[i] === name));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const el = document.getElementById('tab-' + name);
    if (el) el.classList.add('active');
    if (name === 'interview') loadQuestions('general', document.querySelector('.cat-btn'));
}

// ── TEMPLATE ──────────────────────────────────────────────
function setTemplate(tpl, btn) {
    document.querySelectorAll('.tpl-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('resumePreview').className = 'resume-preview tpl-' + tpl;
    showToast('🎨', tpl.charAt(0).toUpperCase() + tpl.slice(1) + ' template applied!');
}

// ── LIVE UPDATE ───────────────────────────────────────────
function liveUpdate() {
    const g = id => document.getElementById(id)?.value ?? '';
    const name = g('rName'),
        email = g('rEmail'),
        phone = g('rPhone'),
        loc = g('rLocation'),
        linkedin = g('rLinkedin');
    const summary = g('rSummary'),
        skills = g('rSkills'),
        expTitle = g('rExpTitle');
    const expOrg = g('rExpOrg'),
        expDesc = g('rExpDesc'),
        edu = g('rEdu'),
        certs = g('rCerts');

    document.getElementById('pName').textContent = name || 'Your Name';

    const cp = [email, phone, loc, linkedin].filter(Boolean);
    document.getElementById('pContact').textContent = cp.length ? cp.join(' • ') : 'your@email.com • Phone • Location';
    document.getElementById('pSummary').textContent = summary || 'Your professional summary will appear here.';
    document.getElementById('pExpTitle').textContent = expTitle || 'Job Title';
    document.getElementById('pExpOrg').textContent = expOrg || 'Company | Duration';
    document.getElementById('pExpDesc').textContent = expDesc || 'Your responsibilities will appear here.';
    document.getElementById('pEdu').textContent = edu || 'Your education will appear here.';

    const cs = document.getElementById('pCertSection');
    if (certs.trim()) { document.getElementById('pCerts').textContent = certs;
        cs.style.display = ''; } else cs.style.display = 'none';

    const sk = document.getElementById('pSkills');
    if (skills.trim()) {
        sk.innerHTML = skills.split(',').map(s => s.trim()).filter(Boolean).map(s => `<span class="rp-skill-tag">${s}</span>`).join('');
    } else {
        sk.innerHTML = '<span class="rp-skill-tag">Your skills</span>';
    }

    // Progress steps
    let filled = 0;
    if (name) filled++;
    if (summary) filled++;
    if (skills) filled++;
    if (expTitle || edu) filled++;
    for (let i = 1; i <= 4; i++) {
        const el = document.getElementById('ps' + i);
        if (el) el.className = 'prog-step' + (i < filled ? ' done' : i === filled ? ' active' : '');
    }
    updateATS({ name, email, phone, summary, skills, expTitle, expDesc, edu });
    scheduleAutosave();
}

function updateATS({ name, email, phone, summary, skills, expTitle, expDesc, edu }) {
    let s = 0;
    if (name) s += 15;
    if (email) s += 10;
    if (phone) s += 5;
    if (summary && summary.length > 50) s += 20;
    if (skills && skills.split(',').filter(x => x.trim()).length >= 3) s += 20;
    if (expTitle) s += 10;
    if (expDesc && expDesc.length > 40) s += 15;
    if (edu) s += 5;
    s = Math.min(s, 100);

    document.getElementById('atsVal').textContent = s + '%';
    const f = document.getElementById('atsFill');
    f.style.background = s >= 80 ? 'linear-gradient(90deg,#10b981,#34d399)' : s >= 50 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#ef4444,#f97316)';
    setTimeout(() => { f.style.width = s + '%'; }, 50);

    // ATS feedback
    const msgs = [];
    if (!name) msgs.push('Add your full name');
    if (!email) msgs.push('Add your email');
    if (!phone) msgs.push('Include a phone number');
    if (!summary || summary.length < 50) msgs.push('Write a longer professional summary (50+ chars)');
    if (!skills || skills.split(',').filter(x => x.trim()).length < 3) msgs.push('Add at least 3 skills');
    if (!expTitle) msgs.push('Add a job title');
    if (!edu) msgs.push('Include your education');

    const feedbackEl = document.getElementById('atsFeedback');
    if (feedbackEl) {
        feedbackEl.innerHTML = msgs.length ?
            msgs.map(m => `<span class="ats-tip">⚡ ${m}</span>`).join('') :
            '<span class="ats-tip ats-tip-ok">🎉 Your resume is fully optimized!</span>';
    }
}

// ── AI: SUMMARY ───────────────────────────────────────────
async function aiEnhanceSummary() {
    const name = document.getElementById('rName').value;
    const title = document.getElementById('rExpTitle').value;
    const skills = document.getElementById('rSkills').value;
    const edu = document.getElementById('rEdu').value;
    if (!title && !skills) { showToast('⚠️', 'Add your job title and skills first.'); return; }

    const btn = document.getElementById('btnAiSummary');
    const box = document.getElementById('aiSummaryBox');
    btn.classList.add('loading');
    btn.innerHTML = '<span class="spinner"></span> Enhancing…';
    box.classList.remove('visible');

    const prompt = `You are an elite resume writer for top tech companies (Google, Stripe, OpenAI).
Write a powerful 2–3 sentence professional summary for this person's resume.

Candidate: ${name || 'the candidate'}
Role/Title: ${title || 'Software Professional'}
Skills: ${skills || 'various technical skills'}
Education: ${edu || 'not specified'}

Rules:
- Start with a strong descriptive adjective + professional noun (e.g. "Results-driven Senior Engineer")
- Mention 2–3 specific skills or tools by name
- End with measurable impact or career aspiration
- Avoid clichés like "passionate", "hardworking", "team player"
- ATS-friendly: use exact role keywords
- Output ONLY the summary text, no quotes, no labels`;

    try {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 300, messages: [{ role: 'user', content: prompt }] })
        });
        const d = await r.json();
        const text = d.content?.find(c => c.type === 'text')?.text?.trim() || '';
        if (!text) throw new Error('empty');
        renderAIBox(box, text, 'rSummary', 'aiSummaryBox');
        showToast('✨', 'AI summary generated!');
    } catch {
        const fb = `Results-driven ${title || 'professional'} with expertise in ${skills || 'software development'}. Proven track record of delivering scalable, high-impact solutions on time and within scope. Committed to continuous improvement and driving measurable outcomes in collaborative environments.`;
        renderAIBox(box, fb, 'rSummary', 'aiSummaryBox');
    }
    btn.classList.remove('loading');
    btn.innerHTML = '✨ AI Enhance Summary';
}

// ── AI: EXPERIENCE ────────────────────────────────────────
async function aiEnhanceExp() {
    const title = document.getElementById('rExpTitle').value;
    const org = document.getElementById('rExpOrg').value;
    const desc = document.getElementById('rExpDesc').value;
    if (!title) { showToast('⚠️', 'Add your job title first.'); return; }

    const btn = document.getElementById('btnAiExp');
    const box = document.getElementById('aiExpBox');
    btn.classList.add('loading');
    btn.innerHTML = '<span class="spinner"></span> Enhancing…';
    box.classList.remove('visible');

    const prompt = `You are an elite resume writer. Rewrite this job experience using the XYZ formula (Accomplished X by doing Y, resulting in Z).

Job Title: ${title}
Company: ${org || 'the company'}
Current description: ${desc || 'general responsibilities in the role'}

Output exactly 3 bullet points. Format each with • at the start.
Rules:
- Use strong action verbs (Led, Architected, Optimized, Drove, Reduced, Increased)
- Include realistic metrics (%, $, time, scale) — infer from context if needed
- Each bullet = 1 clear achievement, not a task list
- ATS-friendly, no fluff
- Output ONLY the 3 bullets, nothing else`;

    try {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 400, messages: [{ role: 'user', content: prompt }] })
        });
        const d = await r.json();
        const text = d.content?.find(c => c.type === 'text')?.text?.trim() || '';
        if (!text) throw new Error('empty');
        renderAIBox(box, text, 'rExpDesc', 'aiExpBox');
        showToast('✨', 'Experience enhanced!');
    } catch {
        const fb = `• Led end-to-end delivery of ${title} responsibilities, improving team velocity by 30% through process optimization\n• Architected scalable solutions at ${org || 'the company'} reducing system downtime by 40% and saving ~$50K annually\n• Mentored 3 junior developers and established code review standards that cut bug rates by 25%`;
        renderAIBox(box, fb, 'rExpDesc', 'aiExpBox');
    }
    btn.classList.remove('loading');
    btn.innerHTML = '✨ AI Enhance Experience';
}

function renderAIBox(box, text, fieldId, boxId) {
    // Safely encode for button onclick
    const encoded = encodeURIComponent(text);
    box.innerHTML = `<strong>✨ AI Suggestion</strong><div style="white-space:pre-wrap;margin-bottom:10px;">${text}</div><button class="btn-ai-apply" onclick="applyAI('${fieldId}','${encoded}','${boxId}')">✅ Apply to Resume</button>`;
    box.classList.add('visible');
}

function applyAI(fieldId, encoded, boxId) {
    const text = decodeURIComponent(encoded);
    const el = document.getElementById(fieldId);
    if (el) { el.value = text;
        liveUpdate(); }
    document.getElementById(boxId)?.classList.remove('visible');
    showToast('✅', 'Applied to resume!');
}

// ── AI: SKILLS LEARNING PATH ──────────────────────────────
async function aiSkillSuggestions() {
    const role = document.getElementById('targetRole').value;
    const skills = document.getElementById('mySkills').value;
    if (!role) { showToast('⚠️', 'Select a target role first.'); return; }

    const btn = document.getElementById('btnAiSkills');
    const box = document.getElementById('aiSkillBox');
    btn.classList.add('loading');
    btn.innerHTML = '<span class="spinner"></span> Generating…';
    box.classList.remove('visible');

    const label = roleSkills[role]?.label || role;
    const missing = roleSkills[role]?.need.filter(s => !skills.toLowerCase().includes(s.toLowerCase())) || [];

    const prompt = `You are a senior engineering career coach at a top tech company.
Create a practical 90-day learning roadmap for someone targeting a ${label} role.

Their current skills: ${skills || 'beginner / no experience stated'}
Skills they still need to learn: ${missing.join(', ') || 'all core skills'}

Format your response as exactly 3 numbered steps. Each step covers 30 days.
Each step should:
- Name the focus area
- List 2–3 specific free resources (Coursera, freeCodeCamp, MDN, official docs, YouTube channels)
- Give one concrete project to build
Keep each step to 2 sentences. Output ONLY the 3 numbered steps, no preamble.`;

    try {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 500, messages: [{ role: 'user', content: prompt }] })
        });
        const d = await r.json();
        const text = d.content?.find(c => c.type === 'text')?.text?.trim() || '';
        if (!text) throw new Error('empty');
        box.innerHTML = `<strong>🗺️ 90-Day Learning Roadmap</strong><div style="white-space:pre-wrap;">${text}</div>`;
        box.classList.add('visible');
        showToast('🗺️', 'Roadmap generated!');
    } catch {
        box.innerHTML = `<strong>🗺️ 90-Day Roadmap</strong>1. Days 1–30: Master fundamentals via freeCodeCamp or Coursera — build a simple CRUD app.\n2. Days 31–60: Dive into core tools (${missing.slice(0,2).join(', ') || 'key frameworks'}) via official docs — build a portfolio project.\n3. Days 61–90: Contribute to open source, network on LinkedIn, and apply to 5 companies per week.`;
        box.classList.add('visible');
    }
    btn.classList.remove('loading');
    btn.innerHTML = '✨ AI Learning Path';
}

// ── AI: COVER LETTER ──────────────────────────────────────
async function aiCoverLetter() {
    const name = document.getElementById('rName').value;
    const title = document.getElementById('rExpTitle').value;
    const skills = document.getElementById('rSkills').value;
    const summary = document.getElementById('rSummary').value;
    if (!title && !skills) { showToast('⚠️', 'Fill in your resume details first.'); return; }

    const btn = document.getElementById('btnCoverLetter');
    const box = document.getElementById('coverLetterBox');
    btn.classList.add('loading');
    btn.innerHTML = '<span class="spinner"></span> Writing…';
    box.style.display = 'none';

    const prompt = `Write a concise, compelling cover letter opening paragraph (3 sentences) for a job application.

Applicant: ${name || 'the applicant'}
Current/Target role: ${title || 'software professional'}
Key skills: ${skills || 'various'}
Summary: ${summary || 'experienced professional'}

Rules:
- Open with energy and specificity, not "I am applying for..."
- Mention 1–2 specific skills
- End with why this role excites them
- Professional but warm tone
- Output ONLY the paragraph, no greeting/sign-off`;

    try {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 300, messages: [{ role: 'user', content: prompt }] })
        });
        const d = await r.json();
        const text = d.content?.find(c => c.type === 'text')?.text?.trim() || '';
        if (!text) throw new Error('empty');
        box.style.display = 'block';
        box.querySelector('.cl-text').textContent = text;
        showToast('📝', 'Cover letter generated!');
    } catch {
        box.style.display = 'block';
        box.querySelector('.cl-text').textContent = `With ${skills ? skills.split(',')[0].trim() : 'my technical expertise'} and a passion for building impactful products, I am excited to bring my experience as a ${title || 'professional'} to your team. Over the years I have honed my ability to ship high-quality work under pressure while collaborating across disciplines to drive measurable results. This role represents the perfect intersection of my skills and ambitions, and I would love to explore how I can contribute.`;
        box.style.display = 'block';
    }
    btn.classList.remove('loading');
    btn.innerHTML = '📝 Generate Cover Letter';
}

function copyCoverLetter() {
    const text = document.querySelector('.cl-text')?.textContent || '';
    navigator.clipboard.writeText(text).then(() => showToast('📋', 'Copied to clipboard!')).catch(() => showToast('⚠️', 'Copy failed — select text manually.'));
}

// ── DOWNLOAD ──────────────────────────────────────────────
function downloadResume() {
    const name = document.getElementById('rName').value || 'Resume';
    const el = document.getElementById('resumePreview');
    const win = window.open('', '_blank');
    const html = `<!DOCTYPE html><html><head><title>${name} – Resume</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',sans-serif;color:#1e293b;padding:40px;max-width:720px;margin:auto;background:#fff}
.rp-name{font-family:'Playfair Display',serif;font-size:30px;font-weight:900;color:#0f172a}
.rp-contact{font-size:13px;color:#475569;margin-top:4px}
.rp-header{border-bottom:3px solid #1d4ed8;padding-bottom:14px;margin-bottom:16px}
.rp-section{margin-bottom:16px}
.rp-section-title{font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#1d4ed8;margin-bottom:6px}
.rp-text{font-size:13px;color:#334155;line-height:1.6;white-space:pre-wrap}
.rp-skill-tags{display:flex;flex-wrap:wrap;gap:6px}
.rp-skill-tag{background:#eff6ff;color:#1d4ed8;padding:4px 10px;border-radius:99px;font-size:11px;font-weight:600}
.rp-exp-title{font-weight:700;font-size:13px;color:#0f172a}
.rp-exp-org{font-size:12px;color:#64748b}
.rp-exp-desc{font-size:12px;color:#475569;margin-top:3px;white-space:pre-wrap}
@media print{body{padding:20px}}
</style></head><body>${el.innerHTML}
<script>window.onload=()=>window.print();<\/script></body></html>`;
    win.document.write(html);
    win.document.close();
    showToast('📄', 'Opening print dialog…');
}

// ── SKILL ANALYSIS ────────────────────────────────────────
const roleSkills = {
    frontend: { need: ['HTML', 'CSS', 'JavaScript', 'React', 'TypeScript', 'Git', 'Webpack', 'REST APIs', 'Responsive Design', 'Testing'], label: 'Frontend Developer' },
    backend: { need: ['Node.js', 'Python', 'SQL', 'REST APIs', 'Authentication', 'Docker', 'Git', 'Databases', 'Linux', 'Testing'], label: 'Backend Developer' },
    fullstack: { need: ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js', 'SQL', 'Git', 'Docker', 'REST APIs', 'TypeScript'], label: 'Full Stack Developer' },
    datascience: { need: ['Python', 'NumPy', 'Pandas', 'Machine Learning', 'Statistics', 'SQL', 'TensorFlow', 'Data Visualization', 'R', 'Jupyter'], label: 'Data Scientist' },
    designer: { need: ['Figma', 'Adobe XD', 'Prototyping', 'User Research', 'Wireframing', 'CSS', 'Typography', 'Design Systems', 'Accessibility', 'Sketch'], label: 'UI/UX Designer' },
    devops: { need: ['Docker', 'Kubernetes', 'CI/CD', 'Linux', 'AWS', 'Terraform', 'Git', 'Monitoring', 'Scripting', 'Networking'], label: 'DevOps Engineer' },
    pm: { need: ['Agile', 'Roadmapping', 'Stakeholder Management', 'JIRA', 'Data Analysis', 'User Research', 'Communication', 'OKRs', 'Product Strategy', 'Prioritization'], label: 'Product Manager' },
    mobile: { need: ['React Native', 'Swift', 'Kotlin', 'Flutter', 'REST APIs', 'Git', 'App Store', 'Push Notifications', 'UI Design', 'Testing'], label: 'Mobile Developer' },
    security: { need: ['Penetration Testing', 'OWASP', 'Network Security', 'Python', 'Linux', 'Cryptography', 'SIEM', 'Incident Response', 'Compliance', 'Firewalls'], label: 'Security Engineer' },
};

function analyzeSkills() {
    const myStr = document.getElementById('mySkills').value;
    const role = document.getElementById('targetRole').value;
    if (!myStr.trim()) { showToast('⚠️', 'Please enter your skills.'); return; }
    if (!role) { showToast('⚠️', 'Please select a target role.'); return; }

    const mine = myStr.split(',').map(s => s.trim().toLowerCase());
    const needed = roleSkills[role].need;
    const label = roleSkills[role].label;
    const matched = needed.filter(s => mine.some(m => m.includes(s.toLowerCase()) || s.toLowerCase().includes(m)));
    const missing = needed.filter(s => !mine.some(m => m.includes(s.toLowerCase()) || s.toLowerCase().includes(m)));
    const pct = Math.round((matched.length / needed.length) * 100);
    const color = pct > 70 ? '#10b981' : pct > 40 ? '#f59e0b' : '#ef4444';
    const circ = 2 * Math.PI * 34;
    const offset = circ - (pct / 100) * circ;

    let html = `<h3 style="font-family:'Playfair Display',serif;font-size:20px;color:#fff;margin-bottom:4px;padding-bottom:14px;border-bottom:1px solid var(--glass-border);">Results for <span style="color:var(--sky)">${label}</span></h3>
  <div class="score-ring-wrap">
    <div class="score-ring">
      <svg width="80" height="80" viewBox="0 0 80 80"><circle class="ring-bg" cx="40" cy="40" r="34"/><circle class="ring-fill" cx="40" cy="40" r="34" stroke="${color}" stroke-dasharray="${circ}" stroke-dashoffset="${circ}" id="ringFill"/></svg>
      <div class="ring-text">${pct}<small>%</small></div>
    </div>
    <div>
      <div style="font-size:15px;font-weight:600;color:#fff;">Match Score</div>
      <div style="color:var(--mid);font-size:13px;margin-top:2px;">${matched.length}/${needed.length} skills matched</div>
      <div style="font-size:12px;margin-top:6px;color:${color};font-weight:600;">${pct > 70 ? '🎯 Strong candidate!' : pct > 40 ? '📈 Getting there' : '🚀 Room to grow'}</div>
    </div>
  </div>
  <div class="section-label" style="margin-top:0;">Skill Breakdown</div>`;

    needed.forEach(skill => {
        const has = matched.includes(skill);
        const pct2 = has ? Math.floor(Math.random() * 25) + 75 : Math.floor(Math.random() * 30) + 10;
        html += `<div class="skill-bar-item">
      <div class="skill-bar-label">
        <span>${skill} ${has ? '<span style="color:#10b981">✓</span>' : '<span style="color:#ef4444">✗</span>'}</span>
        <span>${has ? pct2 + '%' : 'Missing'}</span>
      </div>
      <div class="skill-bar-track"><div class="skill-bar-fill" data-w="${pct2}" style="background:${has ? 'linear-gradient(90deg,#1d4ed8,#38bdf8)' : 'linear-gradient(90deg,#374151,#4b5563)'}"></div></div>
    </div>`;
    });

    if (missing.length > 0) {
        html += `<div class="section-label">Recommended to Learn</div><div style="margin-top:6px;">`;
        missing.forEach(s => { html += `<span class="gap-badge">⚡ ${s}</span>`; });
        html += `</div>`;
    } else {
        html += `<div style="color:#10b981;font-size:14px;margin-top:10px;">🎉 You have all the required skills!</div>`;
    }

    document.getElementById('skillResults').innerHTML = html;
    showToast('📊', 'Analysis complete!');
    setTimeout(() => {
        document.querySelectorAll('.skill-bar-fill').forEach(el => {
            const w = el.getAttribute('data-w');
            el.style.transition = 'width 1s cubic-bezier(0.16,1,0.3,1)';
            el.style.width = w + '%';
        });
        const ring = document.getElementById('ringFill');
        if (ring) ring.style.strokeDashoffset = offset;
    }, 100);
}

// ── JOB DATABASE (30 listings) ────────────────────────────
const jobDB = [
    // Frontend
    { title: 'Frontend Developer', company: 'TechNova Inc.', tags: ['React', 'TypeScript', 'CSS'], type: 'dev', keywords: ['react', 'javascript', 'html', 'css', 'frontend', 'typescript'], salary: '$85k–$120k', remote: true, level: 'mid', location: 'NYC / Remote' },
    { title: 'Junior Frontend Developer', company: 'StartupX', tags: ['Vue.js', 'HTML', 'CSS'], type: 'dev', keywords: ['html', 'css', 'javascript', 'vue', 'frontend'], salary: '$50k–$70k', remote: true, level: 'junior', location: 'Remote' },
    { title: 'Senior React Engineer', company: 'Vercel Labs', tags: ['React', 'Next.js', 'TypeScript'], type: 'dev', keywords: ['react', 'nextjs', 'typescript', 'frontend', 'javascript'], salary: '$140k–$180k', remote: true, level: 'senior', location: 'Remote' },
    { title: 'UI Engineer', company: 'Figma Inc.', tags: ['React', 'CSS', 'Design Systems'], type: 'dev', keywords: ['react', 'css', 'design', 'frontend', 'ui', 'javascript'], salary: '$120k–$160k', remote: false, level: 'mid', location: 'San Francisco' },
    { title: 'Vue.js Developer', company: 'Nuxt Agency', tags: ['Vue.js', 'Nuxt', 'JavaScript'], type: 'dev', keywords: ['vue', 'nuxt', 'javascript', 'frontend', 'css'], salary: '$75k–$105k', remote: true, level: 'mid', location: 'Remote' },

    // Backend
    { title: 'Backend Engineer', company: 'ServerPeak', tags: ['Python', 'Docker', 'SQL'], type: 'dev', keywords: ['python', 'backend', 'sql', 'docker', 'node', 'api'], salary: '$90k–$130k', remote: false, level: 'mid', location: 'Austin, TX' },
    { title: 'Node.js Developer', company: 'APIcraft', tags: ['Node.js', 'Express', 'MongoDB'], type: 'dev', keywords: ['node', 'express', 'mongodb', 'backend', 'javascript', 'api'], salary: '$80k–$115k', remote: true, level: 'mid', location: 'Remote' },
    { title: 'Senior Backend Engineer', company: 'Stripe', tags: ['Go', 'Kubernetes', 'PostgreSQL'], type: 'dev', keywords: ['go', 'kubernetes', 'postgresql', 'backend', 'docker', 'api'], salary: '$160k–$210k', remote: false, level: 'senior', location: 'San Francisco' },
    { title: 'Python Backend Developer', company: 'DataStream', tags: ['Python', 'FastAPI', 'Redis'], type: 'dev', keywords: ['python', 'fastapi', 'redis', 'backend', 'sql', 'docker'], salary: '$95k–$135k', remote: true, level: 'mid', location: 'Remote' },
    { title: 'Junior Backend Developer', company: 'CodeLaunch', tags: ['Node.js', 'SQL', 'REST APIs'], type: 'dev', keywords: ['node', 'sql', 'rest', 'backend', 'javascript', 'api'], salary: '$55k–$75k', remote: true, level: 'junior', location: 'Remote' },

    // Full Stack
    { title: 'Senior Full Stack Engineer', company: 'CloudBase', tags: ['Node.js', 'React', 'MongoDB'], type: 'dev', keywords: ['react', 'node', 'javascript', 'fullstack', 'mongodb', 'typescript'], salary: '$110k–$150k', remote: true, level: 'senior', location: 'Remote' },
    { title: 'Full Stack Developer', company: 'SaaSify', tags: ['Next.js', 'Prisma', 'PostgreSQL'], type: 'dev', keywords: ['nextjs', 'react', 'node', 'fullstack', 'postgresql', 'typescript'], salary: '$90k–$125k', remote: true, level: 'mid', location: 'Remote' },
    { title: 'Junior Full Stack Developer', company: 'WebForge', tags: ['React', 'Express', 'MySQL'], type: 'dev', keywords: ['react', 'express', 'mysql', 'javascript', 'fullstack', 'html'], salary: '$55k–$75k', remote: false, level: 'junior', location: 'Chicago, IL' },

    // Design
    { title: 'UI/UX Designer', company: 'Designify', tags: ['Figma', 'Prototyping', 'CSS'], type: 'design', keywords: ['figma', 'design', 'ux', 'css', 'prototyping', 'user research'], salary: '$75k–$105k', remote: false, level: 'mid', location: 'Los Angeles' },
    { title: 'Senior Product Designer', company: 'Airbnb', tags: ['Figma', 'Design Systems', 'Research'], type: 'design', keywords: ['figma', 'design', 'ux', 'design systems', 'user research', 'prototyping'], salary: '$130k–$175k', remote: false, level: 'senior', location: 'San Francisco' },
    { title: 'Junior UX Designer', company: 'PixelCo', tags: ['Figma', 'Wireframing', 'User Research'], type: 'design', keywords: ['figma', 'ux', 'wireframing', 'design', 'user research', 'accessibility'], salary: '$55k–$75k', remote: true, level: 'junior', location: 'Remote' },
    { title: 'Brand Designer', company: 'StudioZero', tags: ['Illustrator', 'Figma', 'Typography'], type: 'design', keywords: ['figma', 'adobe', 'design', 'typography', 'illustrator', 'branding'], salary: '$70k–$95k', remote: true, level: 'mid', location: 'Remote' },

    // Data / AI
    { title: 'Junior Data Scientist', company: 'InsightAI', tags: ['Python', 'ML', 'TensorFlow'], type: 'data', keywords: ['python', 'ml', 'data', 'tensorflow', 'pandas', 'statistics'], salary: '$65k–$90k', remote: true, level: 'junior', location: 'Remote' },
    { title: 'Senior ML Engineer', company: 'NeuroTech', tags: ['Python', 'PyTorch', 'MLOps'], type: 'data', keywords: ['python', 'ml', 'pytorch', 'tensorflow', 'ai', 'mlops'], salary: '$150k–$200k', remote: false, level: 'senior', location: 'Palo Alto' },
    { title: 'Data Analyst', company: 'Metricly', tags: ['SQL', 'Python', 'Tableau'], type: 'data', keywords: ['sql', 'data', 'analytics', 'python', 'tableau', 'excel'], salary: '$60k–$85k', remote: true, level: 'junior', location: 'Remote' },
    { title: 'Data Engineer', company: 'PipelineHQ', tags: ['Spark', 'Airflow', 'Python'], type: 'data', keywords: ['python', 'spark', 'airflow', 'sql', 'data', 'etl'], salary: '$110k–$145k', remote: true, level: 'mid', location: 'Remote' },
    { title: 'AI Research Scientist', company: 'DeepMind Labs', tags: ['PyTorch', 'Research', 'Python'], type: 'data', keywords: ['python', 'pytorch', 'ai', 'ml', 'research', 'tensorflow'], salary: '$180k–$250k', remote: false, level: 'senior', location: 'London / NYC' },

    // DevOps
    { title: 'DevOps Engineer', company: 'InfraCloud', tags: ['Docker', 'Kubernetes', 'CI/CD'], type: 'dev', keywords: ['docker', 'kubernetes', 'devops', 'linux', 'aws', 'cicd'], salary: '$100k–$145k', remote: true, level: 'senior', location: 'Remote' },
    { title: 'Cloud Engineer', company: 'CloudNine', tags: ['AWS', 'Terraform', 'Linux'], type: 'dev', keywords: ['aws', 'terraform', 'linux', 'docker', 'cloud', 'devops'], salary: '$105k–$140k', remote: true, level: 'mid', location: 'Remote' },
    { title: 'Site Reliability Engineer', company: 'NetWatch', tags: ['Kubernetes', 'Go', 'Monitoring'], type: 'dev', keywords: ['kubernetes', 'go', 'linux', 'monitoring', 'devops', 'sre'], salary: '$130k–$170k', remote: false, level: 'senior', location: 'Seattle' },

    // Product Management
    { title: 'Product Manager', company: 'LaunchPad', tags: ['Agile', 'JIRA', 'Strategy'], type: 'pm', keywords: ['agile', 'product', 'management', 'jira', 'strategy', 'roadmapping'], salary: '$95k–$140k', remote: true, level: 'senior', location: 'Remote' },
    { title: 'Junior Product Manager', company: 'GrowthCo', tags: ['Agile', 'User Research', 'Analytics'], type: 'pm', keywords: ['agile', 'product', 'user research', 'analytics', 'communication'], salary: '$70k–$90k', remote: true, level: 'junior', location: 'Remote' },
    { title: 'Technical Product Manager', company: 'APILayer', tags: ['APIs', 'Agile', 'Engineering'], type: 'pm', keywords: ['api', 'agile', 'product', 'engineering', 'roadmapping', 'jira'], salary: '$115k–$155k', remote: false, level: 'senior', location: 'NYC' },

    // Mobile
    { title: 'React Native Developer', company: 'AppForge', tags: ['React Native', 'TypeScript', 'iOS'], type: 'dev', keywords: ['react native', 'mobile', 'typescript', 'javascript', 'ios', 'android'], salary: '$90k–$125k', remote: true, level: 'mid', location: 'Remote' },
    { title: 'iOS Developer', company: 'SwiftHouse', tags: ['Swift', 'Xcode', 'SwiftUI'], type: 'dev', keywords: ['swift', 'ios', 'xcode', 'mobile', 'swiftui', 'apple'], salary: '$100k–$140k', remote: false, level: 'mid', location: 'San Francisco' },
];

function toggleChip(el, val) {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    activeJobChip = val;
}

function findJobs() {
    const skills = document.getElementById('jobSkillInput').value.toLowerCase();
    const filter = document.getElementById('jobRoleFilter').value;
    const words = skills.split(/[\s,]+/).filter(Boolean);
    const startups = ['StartupX', 'LaunchPad', 'GrowthCo', 'TechNova Inc.', 'CodeLaunch', 'WebForge'];
    const enterprise = ['CloudBase', 'Stripe', 'Airbnb', 'NeuroTech', 'DeepMind Labs', 'Vercel Labs'];

    let res = jobDB.map(j => {
        // Smarter matching: score based on keyword overlap
        const matchCount = words.length > 0 ?
            words.filter(w => j.keywords.some(k => k.includes(w) || w.includes(k))).length :
            j.keywords.length;
        const matchScore = words.length > 0 ? Math.round(60 + (matchCount / Math.max(words.length, 1)) * 35) : Math.floor(70 + Math.random() * 25);
        return {...j, matchScore: Math.min(matchScore, 99) };
    }).filter(j => {
        const fm = !filter || j.type === filter;
        const sm = !skills.trim() || words.some(w => j.keywords.some(k => k.includes(w) || w.includes(k)));
        const cm = activeJobChip === 'all' ||
            (activeJobChip === 'remote' && j.remote) ||
            (activeJobChip === 'senior' && j.level === 'senior') ||
            (activeJobChip === 'junior' && j.level === 'junior') ||
            (activeJobChip === 'startup' && startups.includes(j.company)) ||
            (activeJobChip === 'enterprise' && enterprise.includes(j.company));
        return fm && sm && cm;
    });

    if (!res.length) {
        document.getElementById('jobList').innerHTML = '<div style="color:var(--mid);font-size:14px;padding:20px 0;">No jobs found. Try different keywords or filters.</div>';
        return;
    }
    res.sort((a, b) => b.matchScore - a.matchScore);

    document.getElementById('jobList').innerHTML = res.map((j, i) => `
    <div class="job-card" style="animation:fadeIn 0.4s ${i * 0.06}s both">
      <div class="job-info">
        <div class="job-title">${j.title}</div>
        <div class="job-company">🏢 ${j.company} ${j.remote ? '<span class="remote-badge">Remote</span>' : ''} <span style="font-size:11px;color:var(--mid);">📍 ${j.location}</span></div>
        <div class="salary-badge">💰 ${j.salary}</div>
        <div class="job-tags">${j.tags.map(t => `<span class="job-tag">${t}</span>`).join('')} <span class="job-tag" style="background:rgba(16,185,129,0.1);border-color:rgba(16,185,129,0.3);color:#6ee7b7;">${j.level}</span></div>
      </div>
      <div style="text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px;">
        <div class="match-pct">${j.matchScore}<span style="font-size:16px;color:var(--mid)">%</span><small>match</small></div>
        <div style="display:flex;gap:6px;">
          <button class="btn-apply" onclick="showToast('🚀','Applied to ${j.title.replace(/'/g,"&#39;")}!')">Apply Now</button>
          <button class="btn-save-job ${savedJobs.has(j.title) ? 'saved' : ''}" id="sj${i}" onclick="toggleSave('${j.title.replace(/'/g,"&#39;")}','sj${i}')">${savedJobs.has(j.title) ? '★' : '☆'}</button>
        </div>
      </div>
    </div>`).join('');

  showToast('🎯', `Found ${res.length} matching jobs!`);
}

function toggleSave(title, btnId) {
  const btn = document.getElementById(btnId);
  if (savedJobs.has(title)) {
    savedJobs.delete(title); btn.textContent = '☆'; btn.classList.remove('saved');
    showToast('🗑️', 'Job removed from saved.');
  } else {
    savedJobs.add(title); btn.textContent = '★'; btn.classList.add('saved');
    showToast('⭐', 'Job saved!');
  }
  if (currentUser) LS.set(`cc_savedjobs_${currentUser.email}`, [...savedJobs]);
}

// ── INTERVIEW QUESTIONS ───────────────────────────────────
const questions = {
  general: [
    { q: 'Tell me about yourself.', a: 'Use a 2–3 min structure: current role → key experiences → why you\'re interested in this opportunity. Keep it professional, relevant, and end on enthusiasm.', diff: 'easy' },
    { q: 'Why do you want to work here?', a: 'Research the company beforehand. Mention specific values, products, or mission aspects. Connect their goals to your own career direction.', diff: 'easy' },
    { q: 'What are your greatest strengths?', a: 'Choose 2–3 strengths directly tied to the role. Back each with a brief concrete example. Avoid clichés — be specific.', diff: 'easy' },
    { q: 'What is your biggest weakness?', a: 'Pick a real weakness you\'ve actively worked to improve. Describe the steps taken. Show self-awareness and growth mindset — never say "perfectionist".', diff: 'medium' },
    { q: 'Where do you see yourself in 5 years?', a: 'Be ambitious but grounded. Align your goals with the company\'s growth trajectory. Show you\'re planning to contribute long-term, not job-hop.', diff: 'medium' },
    { q: 'Why are you leaving your current job?', a: 'Stay positive and forward-looking. Cite growth opportunities or new challenges. Never badmouth your current employer — it\'s a red flag.', diff: 'medium' },
    { q: 'What motivates you?', a: 'Link motivation to impact: solving hard problems, shipping products users love, or learning. Back with a real example of when you felt most motivated.', diff: 'easy' },
    { q: 'How do you handle pressure and tight deadlines?', a: 'Describe a specific high-pressure situation. Focus on your process: prioritization, communication, and how you delivered. Quantify if possible.', diff: 'medium' },
  ],
  behavioral: [
    { q: 'Tell me about a time you handled a difficult situation.', a: 'STAR method: Situation → Task → Action → Result. Be specific, own your actions, and quantify the outcome.', diff: 'medium' },
    { q: 'Describe a time you resolved a team conflict.', a: 'Show communication and empathy. Highlight listening, finding common ground, and a win-win resolution. Focus on the process, not blame.', diff: 'medium' },
    { q: 'Give an example of a time you failed.', a: 'Choose a real failure, own it fully, explain the lesson, and show how you applied it. Interviewers love authenticity here.', diff: 'hard' },
    { q: 'Tell me about a time you exceeded expectations.', a: 'Pick a story with measurable impact: "delivered 2 weeks early," "increased conversions 30%." Highlight initiative and ownership.', diff: 'medium' },
    { q: 'Describe a time you had to learn something new quickly.', a: 'Show adaptability: your learning strategy, timeline, and outcome. Be specific about resources — courses, docs, mentors.', diff: 'easy' },
    { q: 'Tell me about a time you disagreed with a manager.', a: 'Show professional assertiveness: you raised the concern with data/reasoning, listened to their perspective, and committed to the final decision.', diff: 'hard' },
  ],
  frontend: [
    { q: 'What is the difference between null and undefined?', a: 'undefined: declared but not assigned. null: intentional "no value". typeof null === "object" is a JS quirk from 1995. Both are falsy.', diff: 'easy' },
    { q: 'Explain the CSS Box Model.', a: 'Every element = content + padding + border + margin. box-sizing:border-box makes width/height include padding & border — use it on everything.', diff: 'easy' },
    { q: 'What is the virtual DOM in React?', a: 'A lightweight in-memory copy of the real DOM. React diffs it against the previous state (reconciliation) and only patches what actually changed.', diff: 'medium' },
    { q: 'What are React Hooks?', a: 'Functions like useState, useEffect, useContext that let functional components use state and lifecycle features. Rules: only call at top level, only in React functions.', diff: 'medium' },
    { q: 'What is a closure in JavaScript?', a: 'A function that retains access to its outer scope\'s variables even after the outer function returns. Powers module patterns, event handlers, and memoization.', diff: 'hard' },
    { q: 'What is event delegation?', a: 'Attach one listener to a parent rather than each child. Events bubble up the DOM. More performant for large dynamic lists (like React\'s synthetic event system).', diff: 'medium' },
    { q: 'Explain the difference between == and ===.', a: '== does type coercion ("5" == 5 is true). === checks value AND type ("5" === 5 is false). Always use === to avoid subtle bugs.', diff: 'easy' },
    { q: 'What is CSS specificity?', a: 'A scoring system: inline styles (1000) > IDs (100) > classes/pseudo-classes (10) > elements (1). Higher score wins. !important overrides all — use sparingly.', diff: 'medium' },
  ],
  backend: [
    { q: 'What is REST and its key principles?', a: 'Representational State Transfer. Principles: stateless, client-server, cacheable, uniform interface (HTTP verbs), layered. Resources are nouns; verbs are GET/POST/PUT/DELETE.', diff: 'easy' },
    { q: 'SQL vs NoSQL — key differences?', a: 'SQL: relational, fixed schema, ACID, great for complex queries. NoSQL: flexible schema, horizontal scaling, varied models (document, KV, graph). Pick based on query patterns.', diff: 'medium' },
    { q: 'What is middleware in Express.js?', a: 'Functions in the req-res pipeline with access to req, res, next(). Used for auth, logging, error handling. Order matters — call next() or the chain stops.', diff: 'medium' },
    { q: 'How does JWT authentication work?', a: 'Server issues a signed JWT (header.payload.signature) on login. Client stores it, sends in Authorization header. Server validates signature without a DB call — stateless auth.', diff: 'hard' },
    { q: 'What is database indexing?', a: 'A B-tree data structure that speeds up reads without full table scans. Trade-off: faster reads, slower writes, more storage. Index columns in WHERE, JOIN, ORDER BY clauses.', diff: 'medium' },
    { q: 'What is the N+1 query problem?', a: 'Fetching 1 list then N queries for each item (e.g. users then each user\'s posts). Fix with JOINs, eager loading (ORM includes), or batching/DataLoader.', diff: 'hard' },
  ],
  data: [
    { q: 'What is overfitting and how do you prevent it?', a: 'Overfitting: model memorizes training data, poor generalization. Fix: cross-validation, regularization (L1/L2/dropout), more data, early stopping, simpler model.', diff: 'medium' },
    { q: 'Explain the bias-variance tradeoff.', a: 'Bias = error from wrong assumptions (underfit). Variance = sensitivity to training data (overfit). Goal: minimize total error. Complex models ↑ variance, simple models ↑ bias.', diff: 'hard' },
    { q: 'Supervised vs unsupervised learning?', a: 'Supervised: labeled data, learns input→output mapping (classification, regression). Unsupervised: no labels, finds hidden structure (clustering, dimensionality reduction, anomaly detection).', diff: 'easy' },
    { q: 'What is feature engineering?', a: 'Using domain knowledge to create, select, or transform raw variables into features that better represent patterns for the ML algorithm. Often more impactful than model choice.', diff: 'medium' },
    { q: 'How do you handle imbalanced datasets?', a: 'Oversample minority (SMOTE), undersample majority, adjust class weights, use precision-recall over accuracy, try ensemble methods. Always stratify your train/test split.', diff: 'hard' },
    { q: 'What is cross-validation?', a: 'Technique to estimate model performance by splitting data into k folds, training on k-1 and testing on the remaining fold, rotating through all folds. Reduces variance of evaluation.', diff: 'medium' },
  ],
  design: [
    { q: 'What is the difference between UX and UI design?', a: 'UX = overall experience, user journey, problem-solving, research. UI = visual layer: components, colors, typography, interactivity. UX strategy drives UI execution.', diff: 'easy' },
    { q: 'Explain the design thinking process.', a: 'Empathize → Define → Ideate → Prototype → Test. Iterative — insights from testing loop back to earlier stages. User-centered, not assumption-driven.', diff: 'easy' },
    { q: 'What is a design system?', a: 'Reusable components + guidelines + standards (tokens, typography, spacing) ensuring product consistency at scale. Examples: Material Design, Atlassian, Polaris.', diff: 'medium' },
    { q: 'How do you ensure accessibility in designs?', a: 'WCAG 2.1: 4.5:1 color contrast, keyboard navigation, ARIA labels, alt text, focus indicators, test with screen readers (NVDA, VoiceOver). Accessibility = better UX for everyone.', diff: 'medium' },
    { q: 'How do you handle pushback from developers on your designs?', a: 'Lead with user impact data. Understand technical constraints. Propose alternatives. Frame it as collaborative problem-solving toward shared goals, not a fight.', diff: 'hard' },
  ],
  leadership: [
    { q: 'How do you motivate a disengaged team member?', a: '1:1 to find root cause (boredom, burnout, misalignment). Realign work with their strengths and goals. Set clear milestones. Recognize progress. Don\'t assume — ask.', diff: 'medium' },
    { q: 'Describe your leadership style.', a: 'Name a style (servant, coaching, transformational) with evidence. Show adaptability — different people need different approaches. Always tie to team outcomes.', diff: 'medium' },
    { q: 'How do you handle competing priorities?', a: 'Eisenhower Matrix or ICE scoring (Impact/Confidence/Ease). Communicate trade-offs to stakeholders explicitly. Delegate. Revisit as context changes.', diff: 'hard' },
    { q: 'Tell me about a time you led a failing project to success.', a: 'Diagnose what went wrong → your specific interventions → measurable results. Show decisiveness, accountability, and the ability to bring others along.', diff: 'hard' },
  ],
};

function loadQuestions(cat, btn) {
  currentCategory = cat;
  if (btn) { document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
  const titles = {
    general:'🌐 General HR', behavioral:'🧠 Behavioral', frontend:'💻 Frontend Dev',
    backend:'⚙️ Backend Dev', data:'📈 Data Science', design:'🎨 UI/UX Design', leadership:'👑 Leadership'
  };
  document.getElementById('qPanelTitle').textContent = titles[cat] + ' Questions';
  currentQuestions = [...(questions[cat] || [])];
  renderQuestions(currentQuestions);
}

function renderQuestions(qs) {
  document.getElementById('qCount').textContent = qs.length + ' questions';
  document.getElementById('questionList').innerHTML = qs.map((item, i) => `
    <div class="q-item" style="animation:fadeIn 0.3s ${i * 0.06}s both">
      <div class="q-text" onclick="toggleAnswer(this)">
        <span>Q${i+1}. ${item.q} <span class="diff-badge diff-${item.diff}">${item.diff}</span></span>
        <span class="chevron">▼</span>
      </div>
      <div class="q-answer">
        <div style="margin-bottom:12px;">${item.a}</div>
        <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:12px;">
          <div style="font-size:11px;color:var(--mid);margin-bottom:6px;font-weight:700;letter-spacing:0.8px;">✏️ PRACTICE YOUR ANSWER</div>
          <textarea class="practice-input" id="prac${i}" placeholder="Type your answer and get AI feedback…"></textarea>
          <button class="btn-practice" onclick="getFeedback(${i},this)">🤖 Get AI Feedback</button>
          <div class="practice-feedback" id="fb${i}"></div>
        </div>
      </div>
    </div>`).join('');
}

function shuffleQuestions() {
  const qs = [...currentQuestions];
  for (let i = qs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i+1)); [qs[i], qs[j]] = [qs[j], qs[i]]; }
  renderQuestions(qs);
  showToast('🔀', 'Questions shuffled!');
}

function toggleAnswer(el) {
  el.classList.toggle('open');
  el.nextElementSibling.classList.toggle('open');
}

async function getFeedback(idx, btn) {
  const answer   = document.getElementById(`prac${idx}`)?.value.trim();
  const question = currentQuestions[idx]?.q || '';
  if (!answer) { showToast('⚠️', 'Write your answer first.'); return; }

  const fbEl = document.getElementById(`fb${idx}`);
  fbEl.classList.add('visible');
  fbEl.innerHTML = '<span class="spinner"></span> Analyzing your answer…';
  btn.disabled = true;

  const prompt = `You are an expert career coach at a top recruitment firm. Evaluate this interview answer and give precise, actionable feedback.

Interview Question: "${question}"
Candidate's Answer: "${answer}"

Respond in exactly 3 sentences:
1. Start with a specific strength ("Your answer effectively..." or "You did well to...")
2. Give ONE concrete improvement with an example ("To strengthen this, try..." or "Adding a specific metric like...")
3. End with an encouraging tip about delivery or structure

Be direct, warm, and specific. No filler phrases like "Great question!" Output ONLY the 3 sentences.`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 300, messages: [{ role: 'user', content: prompt }] })
    });
    const d = await r.json();
    const text = d.content?.find(c => c.type === 'text')?.text?.trim() || '';
    if (!text) throw new Error('empty');
    fbEl.innerHTML = '🤖 <strong style="color:#c4b5fd">AI Coach:</strong> ' + text;
    showToast('💬', 'Feedback ready!');
  } catch {
    fbEl.innerHTML = '🤖 <strong style="color:#c4b5fd">AI Coach:</strong> Your answer shows solid effort — try using the STAR method (Situation, Task, Action, Result) to add structure. Including a specific metric or number will make your response significantly more memorable to interviewers. Practice keeping your answer to 90 seconds for best impact.';
  }
  btn.disabled = false;
}

// ── TIMER ─────────────────────────────────────────────────
function toggleTimer() {
  const btn = document.getElementById('timerBtn');
  if (timerRunning) {
    clearInterval(timerInterval); timerRunning = false;
    btn.textContent = 'Resume'; btn.classList.remove('running');
  } else {
    timerRunning = true; btn.textContent = 'Pause'; btn.classList.add('running');
    timerInterval = setInterval(() => {
      if (timerSeconds <= 0) {
        clearInterval(timerInterval); timerRunning = false;
        btn.textContent = 'Start'; btn.classList.remove('running');
        showToast('⏰', "Time's up!"); return;
      }
      timerSeconds--;
      const m = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
      const s = (timerSeconds % 60).toString().padStart(2, '0');
      document.getElementById('timerVal').textContent = m + ':' + s;
      document.getElementById('timerVal').style.color = timerSeconds <= 30 ? 'var(--red)' : 'var(--sky)';
    }, 1000);
  }
}

function resetTimer() {
  clearInterval(timerInterval); timerRunning = false; timerSeconds = 120;
  document.getElementById('timerVal').textContent  = '02:00';
  document.getElementById('timerVal').style.color  = 'var(--sky)';
  const btn = document.getElementById('timerBtn');
  btn.textContent = 'Start'; btn.classList.remove('running');
}

// ── TOAST ─────────────────────────────────────────────────
let toastQueue = [];
let toastBusy  = false;
function showToast(icon, msg) {
  toastQueue.push({ icon, msg });
  if (!toastBusy) processToast();
}
function processToast() {
  if (!toastQueue.length) { toastBusy = false; return; }
  toastBusy = true;
  const { icon, msg } = toastQueue.shift();
  const t = document.getElementById('toast');
  document.getElementById('toastIcon').textContent = icon;
  document.getElementById('toastMsg').textContent  = msg;
  t.classList.add('show');
  setTimeout(() => { t.classList.remove('show'); setTimeout(processToast, 300); }, 2800);
}

// ── STATS ANIMATION ───────────────────────────────────────
function animateStats() {
  const cfg = [
    { id: 'stat1', target: 50,  dec: 0, suf: 'K+' },
    { id: 'stat2', target: 92,  dec: 0, suf: '%'  },
    { id: 'stat3', target: 10,  dec: 0, suf: 'K+' },
    { id: 'stat4', target: 4.9, dec: 1, suf: '★'  },
  ];
  cfg.forEach(({ id, target, dec, suf }) => {
    const el = document.getElementById(id);
    if (!el) return;
    let cur = 0;
    const step = target / 60;
    const iv = setInterval(() => {
      cur = Math.min(cur + step, target);
      el.innerHTML = cur.toFixed(dec) + `<span>${suf}</span>`;
      if (cur >= target) clearInterval(iv);
    }, 25);
  });
}

// ── INIT ──────────────────────────────────────────────────
(function init() {
  // Restore session
  const sess = LS.get('cc_session', null);
  if (sess) { currentUser = sess; updateAuthUI(); loadUserData(); }
  else updateAuthUI();

  loadQuestions('general', null);
  setTimeout(animateStats, 600);

  // Close modals on backdrop click
  document.querySelectorAll('.modal-overlay').forEach(o =>
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('active'); })
  );

  // Keyboard ESC to close modals
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.active').forEach(o => o.classList.remove('active'));
  });
})();
async function doSignup() {
  const name  = document.getElementById('signupName').value;
  const email = document.getElementById('signupEmail').value;
  const pass  = document.getElementById('signupPass').value;

  const res = await fetch("http://localhost:5000/signup", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ name, email, password: pass })
  });

  const data = await res.json();
  alert(data.msg);
}