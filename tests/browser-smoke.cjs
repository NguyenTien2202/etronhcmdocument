const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

function fakeFirebase() {
    const uid = 'TmtCY7Bgb2OSPRZXhsK1qRnoI8g1';
    const token = 'a'.repeat(64);
    const records = {
        'documents/test-doc': { title: 'Test document', type: 'link', category: 'general', fileUrl: 'https://example.invalid/document', createdAt: 1 },
        'hr_config/candidates_data': { items: [{ id: 'c1', fullName: 'Test learner', salaryNote: 'PRIVATE-SALARY', checklist: [], taskProgress: {} }] },
        'hr_config/templates_data': { items: [] }, 'hr_config/notes_data': { items: [] },
        ['onboarding_links/' + token]: { fullName: 'Test learner', role: 'Sales', startDate: '', mentor: '', customRoadmap: [{ id: 'd1', dayNumber: 'Ngày 1', title: 'Learn', tasks: [{ id: 't1', title: 'Read', type: 'reading' }] }] },
        ['onboarding_progress/' + token]: { completedTasks: {} },
    };
    const watchers = [];
    window.__reads = [];
    window.__writes = [];
    const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
    function snapshot(key, isCollection) {
        if (isCollection) {
            const entries = Object.entries(records).filter(([p]) => p.startsWith(key + '/') && p.split('/').length === key.split('/').length + 1);
            return { empty: !entries.length, metadata: { fromCache: false }, forEach: cb => entries.forEach(([p, data]) => cb({ id: p.split('/').pop(), data: () => clone(data) })) };
        }
        return { exists: !!records[key], metadata: { fromCache: false }, data: () => clone(records[key]) };
    }
    function notify() { setTimeout(() => watchers.slice().forEach(w => w.next(snapshot(w.key, w.isCollection))), 0); }
    function ref(key, isCollection = false) {
        return {
            path: key,
            doc: id => ref(key + '/' + id),
            onSnapshot(options, next) {
                if (typeof options === 'function') next = options;
                const watcher = { key, isCollection, next }; watchers.push(watcher); window.__reads.push(key);
                setTimeout(() => { if (watchers.includes(watcher)) next(snapshot(key, isCollection)); }, 0);
                return () => { const index = watchers.indexOf(watcher); if (index >= 0) watchers.splice(index, 1); };
            },
            async get() { window.__reads.push(key); return snapshot(key, isCollection); },
            async set(data, options) {
                records[key] = options?.merge ? { ...records[key], ...clone(data) } : clone(data);
                window.__writes.push(key); notify();
            },
            async update(data, value) {
                if (!records[key]) throw new Error('not-found');
                if (data.parts) records[key][data.parts[0]][data.parts[1]] = value;
                else Object.assign(records[key], clone(data));
                window.__writes.push(key); notify();
            },
            async delete() { delete records[key]; window.__writes.push(key); notify(); },
        };
    }
    const authListeners = [];
    const authInstance = {
        currentUser: null,
        async setPersistence() {},
        onAuthStateChanged(cb) { authListeners.push(cb); setTimeout(() => cb(authInstance.currentUser), 0); },
        async signInWithEmailAndPassword() {
            authInstance.currentUser = { uid: window.__denyHr ? 'other-user' : uid, email: 'hr@example.invalid' };
            authListeners.forEach(cb => cb(authInstance.currentUser));
        },
        async signOut() { authInstance.currentUser = null; authListeners.forEach(cb => cb(null)); },
        async sendPasswordResetEmail() {},
    };
    function auth() { return authInstance; }
    auth.Auth = { Persistence: { NONE: 'none', LOCAL: 'local', SESSION: 'session' } };
    function firestore() { return { collection: name => ref(name, true) }; }
    firestore.FieldPath = class { constructor(...parts) { this.parts = parts; } };
    window.firebase = { apps: [], initializeApp() { this.apps.push({}); }, firestore, auth };
}

(async () => {
    const root = path.resolve(__dirname, '..');
    const server = http.createServer((req, res) => {
        const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\//, '') || 'index.html';
        const file = path.resolve(root, relative);
        if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
        const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png' };
        res.setHeader('Content-Type', types[path.extname(file)] || 'text/plain');
        res.end(fs.readFileSync(file));
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = 'http://127.0.0.1:' + server.address().port;
    let browser;
    try {
        browser = await chromium.launch(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE, headless: true } : { headless: true });
        const context = await browser.newContext();
        context.setDefaultTimeout(10000);
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
        await context.addInitScript(fakeFirebase);
        await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.fulfill({ body: '', contentType: 'text/javascript' }));
        const page = await context.newPage();
        const errors = []; page.on('pageerror', error => errors.push(error.message));
        await page.goto(base + '/index.html');
        await page.waitForFunction(() => window.salesStore?.getDocuments().length === 1);
        assert.equal(await page.evaluate(() => window.__reads.some(p => /^hr_config\/(?!onboarding_roadmap)/.test(p))), false);
        await page.evaluate(() => window.salesApp.switchTab('documents'));
        page.on('dialog', dialog => dialog.accept());
        await page.evaluate(() => window.documentHub.deleteDocument('test-doc'));
        assert.equal(await page.evaluate(() => window.salesStore.getDocuments().length), 0);
        await page.getByRole('button', { name: 'Thùng rác', exact: true }).click();
        await page.getByRole('button', { name: 'Khôi phục', exact: true }).click();
        await page.waitForFunction(() => window.salesStore.getDocuments().length === 1);

        await page.goto(base + '/hr.html');
        await page.getByRole('heading', { name: 'Đăng nhập Etron HrHub' }).waitFor();
        assert.equal(await page.locator('#hr-private-content').isVisible(), false);
        assert.equal(await page.evaluate(() => window.__reads.some(p => p.includes('candidates_data'))), false);
        await page.locator('[name=email]').fill('hr@example.invalid');
        await page.locator('[name=password]').fill('test-only-placeholder');
        await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
        await page.waitForFunction(() => window.hrOnboardingStore.getCandidates().length === 1);
        assert.equal(await page.locator('#hr-login-screen').isVisible(), false);
        await page.evaluate(() => window.hrHub.openCandidateModal('c1'));
        await page.locator('#hr-cand-start').fill('2026-10-19');
        await page.locator('#hr-cand-deadline').fill('2026-10-23');
        await page.getByRole('button', { name: 'Lưu Hồ Sơ', exact: true }).click();
        await page.waitForFunction(() => window.hrOnboardingStore.getCandidates()[0].targetDate === '2026-10-23');
        await page.getByRole('button', { name: 'Cập nhật / Copy Link', exact: true }).first().click();
        await page.waitForFunction(() => /^[a-f0-9]{64}$/.test(window.hrOnboardingStore.getCandidates()[0].onboardToken || ''));
        assert.equal(await page.evaluate(() => window.hrHub.getPublicOnboardUrl('c1').includes('#key=')), true);
        await page.locator('button[title="Đăng xuất HR"]').click();
        await page.getByRole('heading', { name: 'Đăng nhập Etron HrHub' }).waitFor();
        assert.equal(await page.evaluate(() => window.hrOnboardingStore.privateData.candidates.length), 0);

        await page.evaluate(() => { window.__denyHr = true; });
        await page.locator('[name=email]').fill('other@example.invalid');
        await page.locator('[name=password]').fill('test-only-placeholder');
        await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
        await page.waitForFunction(() => document.getElementById('hr-auth-error').textContent.includes('chưa được cấp quyền'));
        assert.equal(await page.locator('#hr-private-content').isVisible(), false);

        await page.goto(base + '/onboard.html#key=' + 'a'.repeat(64));
        await page.getByText('Read', { exact: true }).waitFor();
        await page.getByRole('checkbox').first().check();
        await page.waitForFunction(() => window.hrOnboardingStore.personalProgress.t1 === true);
        assert.equal(await page.evaluate(() => window.__reads.some(p => p.includes('candidates_data'))), false);
        await page.goto(base + '/onboard.html?id=c1');
        await page.getByText('Liên kết cũ đã ngừng dùng.', { exact: false }).waitFor();
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(base + '/hr.html');
        assert.equal(await page.getByRole('button', { name: 'Đăng nhập', exact: true }).isVisible(), true);
        assert.deepEqual(errors, []);
        console.log('PASS: public SalesHub, trash/restore, HR login/logout/denied role, personal progress, legacy links, mobile login; no live Firebase requests.');
    } finally {
        if (browser) await browser.close();
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
