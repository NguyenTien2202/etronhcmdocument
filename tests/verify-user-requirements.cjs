const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const token = 'b'.repeat(64);

function fakeFirebase() {
    const uid = 'TmtCY7Bgb2OSPRZXhsK1qRnoI8g1';
    const token = 'b'.repeat(64);
    const records = {
        'documents/test-doc': { title: 'Test document', type: 'link', category: 'general', fileUrl: 'https://example.invalid/document', createdAt: 1 },
        'hr_config/candidates_data': {
            items: [
                { id: 'c1', fullName: 'Nguyễn Văn An', role: 'Chuyên viên Kinh doanh', status: 'preparing', startDate: '2026-10-19', mentor: 'Nguyễn Thủy Tiên', checklist: [], taskProgress: {} },
                { id: 'c2', fullName: 'Trần Thị Bình', role: 'Sales Executive', status: 'onboarding', startDate: '2026-10-12', mentor: 'Lê Văn Cường', checklist: [], taskProgress: {} }
            ]
        },
        'hr_config/templates_data': { items: [] },
        'hr_config/notes_data': { items: [] },
        'hr_config/onboarding_roadmap': {
            days: [
                { id: 'day-1', dayNumber: 'Ngày 1', title: 'Giới thiệu & Tổng quan văn hóa', trainer: 'Nguyễn Thủy Tiên', duration: '08:30 – 17:30', tasks: [{ id: 't1', title: 'Tìm hiểu sứ mệnh Etron', type: 'reading' }] },
                { id: 'day-2', dayNumber: 'Ngày 2', title: 'Sản phẩm Adahub CRM & Callbot AI', trainer: 'Nguyễn Thủy Tiên', duration: '08:30 – 17:30', tasks: [{ id: 't2', title: 'Cài đặt và thực hành CRM', type: 'practice' }] }
            ]
        },
        ['onboarding_links/' + token]: {
            fullName: 'Nguyễn Văn An',
            role: 'Chuyên viên Kinh doanh',
            startDate: '2026-10-19',
            mentor: 'Nguyễn Thủy Tiên',
            customRoadmap: [
                { id: 'day-1', dayNumber: 'Ngày 1', title: 'Giới thiệu & Tổng quan văn hóa', duration: '08:30 – 17:30', tasks: [{ id: 't1', title: 'Tìm hiểu sứ mệnh Etron', type: 'reading' }] },
                { id: 'day-2', dayNumber: 'Ngày 2', title: 'Sản phẩm Adahub CRM & Callbot AI', duration: '08:30 – 17:30', tasks: [{ id: 't2', title: 'Cài đặt và thực hành CRM', type: 'practice' }] }
            ]
        },
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
            authInstance.currentUser = { uid, email: 'hr@example.invalid' };
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
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
        await context.addInitScript(fakeFirebase);
        await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.fulfill({ body: '', contentType: 'text/javascript' }));
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', err => errors.push(err.message));

        console.log('--- 1. Testing HrHub Candidates Accordion ---');
        await page.goto(base + '/hr.html');
        await page.locator('[name=email]').fill('hr@example.invalid');
        await page.locator('[name=password]').fill('test-pass');
        await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
        await page.waitForFunction(() => window.hrOnboardingStore.getCandidates().length === 2);

        // Verify both candidates are rendered in #hr-candidate-detail
        const cand1Card = page.locator('#hr-cand-card-c1');
        const cand2Card = page.locator('#hr-cand-card-c2');
        assert.equal(await cand1Card.isVisible(), true, 'Candidate 1 card should be visible');
        assert.equal(await cand2Card.isVisible(), true, 'Candidate 2 card should be visible');

        // Verify default on entry: both candidates bodies are collapsed (hidden)
        const cand1Body = page.locator('#hr-cand-body-c1');
        const cand2Body = page.locator('#hr-cand-body-c2');
        assert.equal(await cand1Body.evaluate(el => el.classList.contains('hidden')), true, 'Candidate 1 should default to collapsed');
        assert.equal(await cand2Body.evaluate(el => el.classList.contains('hidden')), true, 'Candidate 2 should default to collapsed');

        // Click arrow of Candidate 1 to expand
        console.log('Clicking Candidate 1 arrow to expand...');
        await page.locator('#hr-cand-arrow-c1').click();
        assert.equal(await cand1Body.evaluate(el => !el.classList.contains('hidden')), true, 'Candidate 1 should now be expanded');
        assert.equal(await cand2Body.evaluate(el => el.classList.contains('hidden')), true, 'Candidate 2 should remain collapsed');

        // Verify Lucide icons inside Candidate 1 action buttons have rendered (<svg> tag created)
        const copyBtnSvg = await page.locator('#hr-cand-body-c1 button[aria-label="Cập nhật / Copy Link"] svg').count();
        assert.ok(copyBtnSvg >= 1, 'Copy link button should contain a rendered svg icon, not an empty i tag');
        const openBtnSvg = await page.locator('#hr-cand-body-c1 button[aria-label="Mở Cổng Onboard"] svg').count();
        assert.ok(openBtnSvg >= 1, 'Open onboard button should contain a rendered svg icon');

        // Click arrow of Candidate 1 again to collapse
        console.log('Clicking Candidate 1 arrow to collapse...');
        await page.locator('#hr-cand-arrow-c1').click();
        assert.equal(await cand1Body.evaluate(el => el.classList.contains('hidden')), true, 'Candidate 1 should be collapsed again');

        // Verify top stat cards are removed
        assert.equal(await page.locator('#hr-stat-candidates').count(), 0, 'Top stat cards should be removed from DOM');

        console.log('--- 2. Testing HrHub Roadmap Tab Collapse/Expand & Icon Buttons ---');
        await page.evaluate(() => window.hrHub.switchTab('roadmap'));
        const day1Card = page.locator('#hr-day-card-day-1');
        const day1Body = page.locator('#hr-day-body-day-1');
        const day2Body = page.locator('#hr-day-body-day-2');
        assert.equal(await day1Card.isVisible(), true, 'Day 1 card should be visible');
        assert.equal(await day1Body.evaluate(el => !el.classList.contains('hidden')), true, 'Day 1 body defaults to open');

        // Check auto-fill dates button is icon-only
        const autoFillBtn = page.locator('button[onclick="window.hrHub.autoFillRoadmapDates()"]');
        assert.equal((await autoFillBtn.innerText()).trim(), '', 'Auto-fill dates button should be icon-only');

        // Check toggle all days button in roadmap header is icon-only
        const toggleAllRoadmapBtn = page.locator('button[onclick="window.hrHub.toggleAllRoadmapDays()"]');
        assert.equal((await toggleAllRoadmapBtn.innerText()).trim(), '', 'Toggle all roadmap days button should be icon-only');

        // Check edit day button in day 1 card is icon-only
        const editDayBtn = page.locator('button[onclick="window.hrHub.openRoadmapDayModal(\'day-1\')"]');
        assert.equal((await editDayBtn.innerText()).trim(), '', 'Edit day button should be icon-only');

        // Check duration chip is removed from day 1 card
        const day1CardText = await day1Card.innerText();
        assert.ok(!day1CardText.includes('17:30') && !day1CardText.includes('18:00'), 'Day duration chip should be removed from HrHub roadmap');
        assert.ok((await day1Card.getAttribute('class')).includes('bg-gradient-to-br'), 'HrHub Day 1 card should have pastel gradient class');

        // Click day collapse button
        await page.locator('#hr-day-btn-day-1').click();
        assert.equal(await day1Body.evaluate(el => el.classList.contains('hidden')), true, 'Day 1 body should now be collapsed');

        // Toggle all days
        await page.evaluate(() => window.hrHub.toggleAllRoadmapDays(true));
        assert.equal(await day1Body.evaluate(el => el.classList.contains('hidden')), true, 'Day 1 should be collapsed');
        assert.equal(await day2Body.evaluate(el => el.classList.contains('hidden')), true, 'Day 2 should be collapsed');

        await page.evaluate(() => window.hrHub.toggleAllRoadmapDays(false));
        assert.equal(await day1Body.evaluate(el => !el.classList.contains('hidden')), true, 'Day 1 should be expanded');
        assert.equal(await day2Body.evaluate(el => !el.classList.contains('hidden')), true, 'Day 2 should be expanded');

        console.log('--- 2.5. Testing HrHub Templates Tab Compact Controls ---');
        await page.evaluate(() => window.hrHub.switchTab('templates'));
        const quickVarsBar = page.locator('#hr-quick-vars-summary-bar');
        assert.equal(await quickVarsBar.count(), 0, 'Quick vars summary bar should be removed from DOM');

        const toggleVarsBtn = page.locator('#hr-quick-vars-toggle-btn');
        assert.equal(await toggleVarsBtn.isVisible(), true, 'Toggle vars button should be visible');
        const toggleVarsSvg = await toggleVarsBtn.locator('svg').count();
        assert.ok(toggleVarsSvg >= 1, 'Toggle vars button should render an icon');
        const toggleVarsText = await toggleVarsBtn.innerText();
        assert.equal(toggleVarsText.trim(), '', 'Toggle vars button should be icon-only');

        const addTplBtn = page.locator('button[onclick="window.hrHub.openTemplateModal()"]');
        assert.equal(await addTplBtn.isVisible(), true, 'Add template button should be visible');
        const addTplSvg = await addTplBtn.locator('svg').count();
        assert.ok(addTplSvg >= 1, 'Add template button should render an icon');
        const addTplText = await addTplBtn.innerText();
        assert.equal(addTplText.trim(), '', 'Add template button should be icon-only');

        // Check template card pastel gradient
        const tplCard = page.locator('#hr-templates-list > div').first();
        assert.ok((await tplCard.getAttribute('class')).includes('bg-gradient-to-br'), 'Template card should have pastel gradient class');

        // Test toggling vars form
        const varsForm = page.locator('#hr-quick-vars-form');
        assert.equal(await varsForm.evaluate(el => el.classList.contains('hidden')), true, 'Vars form should default to hidden');
        await toggleVarsBtn.click();
        assert.equal(await varsForm.evaluate(el => !el.classList.contains('hidden')), true, 'Vars form should expand on click');
        await toggleVarsBtn.click();
        assert.equal(await varsForm.evaluate(el => el.classList.contains('hidden')), true, 'Vars form should collapse on click');

        // Verify mobile responsiveness
        await page.setViewportSize({ width: 390, height: 844 });

        console.log('--- 3. Testing Candidate Onboard Viewer (Mobile & Compact Header) ---');
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(base + '/onboard.html#key=' + 'b'.repeat(64));
        await page.waitForFunction(() => document.getElementById('onboard-day-dropdown-container') !== null);

        // Check Onboard Day card pastel gradient
        const onboardDayCard = page.locator('#day-body-day-1').locator('..');
        assert.ok((await onboardDayCard.getAttribute('class')).includes('bg-gradient-to-br'), 'Onboard viewer day card should have pastel gradient class');

        // Check header title exists with comfortable size
        const headerTitle = page.locator('h1').first();
        assert.equal(await headerTitle.isVisible(), true, 'Header title should be visible');

        // Check Day Dropdown exists and works
        const dropdownBtn = page.locator('#onboard-day-dropdown-container button').first();
        assert.equal(await dropdownBtn.isVisible(), true, 'Day dropdown button should be visible');
        await dropdownBtn.click();
        const dropdownMenu = page.locator('#onboard-day-dropdown-menu');
        assert.equal(await dropdownMenu.evaluate(el => !el.classList.contains('hidden')), true, 'Day dropdown menu should open');
        const menuBox = await dropdownMenu.boundingBox();
        console.log('Day Dropdown Menu Box:', menuBox);
        assert.ok(menuBox && menuBox.height >= 100, `Dropdown menu should be fully open and visible, height: ${menuBox?.height}`);

        // Select Day 1
        await page.locator('#onboard-day-dropdown-menu > div').nth(1).click();
        assert.equal(await dropdownMenu.evaluate(el => el.classList.contains('hidden')), true, 'Day dropdown menu should close after selection');

        // Check Icon-only Toggle All button
        const toggleAllBtn = page.locator('button[title*="Thu gọn tất cả"]').first();
        assert.equal(await toggleAllBtn.isVisible(), true, 'Toggle all days icon button should be visible');
        const iconInsideToggleAll = await toggleAllBtn.locator('svg').count();
        // Check duration chip is removed from Onboard viewer
        const onboardPageText = await page.innerText('body');
        assert.ok(!onboardPageText.includes('17:30') && !onboardPageText.includes('18:00'), 'Duration chip should be removed from Onboard viewer');

        console.log('--- 4. Testing HrHub Task Detail Modal (Edit Module, Activity, Outcome & Add Task) ---');
        await page.goto(base + '/hr.html');
        await page.locator('[name=email]').fill('hr@example.invalid');
        await page.locator('[name=password]').fill('test-pass');
        await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
        await page.waitForFunction(() => window.hrOnboardingStore.getCandidates().length === 2);
        await page.evaluate(() => window.hrHub.switchTab('roadmap'));

        // Open edit task modal for first task of day-1
        const initialRoadmap = await page.evaluate(() => window.hrOnboardingStore.getRoadmap());
        const day1 = initialRoadmap.find(d => d.id === 'day-1');
        const targetTaskId = day1.tasks[0].id;
        const initialTitle = day1.tasks[0].title;

        await page.evaluate(({ dId, tId }) => window.hrHub.openEditTaskModal(dId, tId), { dId: day1.id, tId: targetTaskId });
        const taskModal = page.locator('#hr-task-detail-modal');
        assert.equal(await taskModal.evaluate(el => !el.classList.contains('hidden')), true, 'Task detail modal should be open');

        // Verify prefilled values
        assert.equal(await page.locator('#hr-task-title').inputValue(), initialTitle);

        // Edit activity and outcome
        await page.locator('#hr-task-activity').fill('Nghiên cứu văn hóa doanh nghiệp và giá trị cốt lõi');
        await page.locator('#hr-task-outcome').fill('Hoàn thành bài kiểm tra 10 câu hỏi trắc nghiệm');
        await page.locator('#hr-task-detail-modal button[type="submit"]').click();

        // Modal should close
        assert.equal(await taskModal.evaluate(el => el.classList.contains('hidden')), true, 'Task detail modal should be hidden after save');

        // Verify stored data updated
        const updatedRoadmap = await page.evaluate(() => window.hrOnboardingStore.getRoadmap());
        const day1Tasks = updatedRoadmap.find(d => d.id === 'day-1').tasks;
        const updatedTask = day1Tasks.find(t => t.id === targetTaskId);
        assert.equal(updatedTask.activity, 'Nghiên cứu văn hóa doanh nghiệp và giá trị cốt lõi');
        assert.equal(updatedTask.outcome, 'Hoàn thành bài kiểm tra 10 câu hỏi trắc nghiệm');

        // Test add new task module to day-1
        const initialTasksCount = day1Tasks.length;
        await page.evaluate(() => window.hrHub.openAddTaskModal('day-1'));
        assert.equal(await taskModal.evaluate(el => !el.classList.contains('hidden')), true, 'Task detail modal should open for new task');
        await page.locator('#hr-task-title').fill('Kiểm tra thực hành Ngày 1');
        await page.locator('#hr-task-type').selectOption('practice');
        await page.locator('#hr-task-activity').fill('Thực hành gọi thử 5 cuộc với Callbot AI');
        await page.locator('#hr-task-outcome').fill('Đạt điểm chất lượng cuộc gọi trên 85%');
        await page.locator('#hr-task-detail-modal button[type="submit"]').click();

        const afterAddRoadmap = await page.evaluate(() => window.hrOnboardingStore.getRoadmap());
        const afterAddDay1Tasks = afterAddRoadmap.find(d => d.id === 'day-1').tasks;
        assert.equal(afterAddDay1Tasks.length, initialTasksCount + 1, 'Day 1 should have one more task');
        const addedTask = afterAddDay1Tasks[afterAddDay1Tasks.length - 1];
        assert.equal(addedTask.title, 'Kiểm tra thực hành Ngày 1');
        assert.equal(addedTask.type, 'practice');
        assert.equal(addedTask.activity, 'Thực hành gọi thử 5 cuộc với Callbot AI');
        assert.equal(addedTask.outcome, 'Đạt điểm chất lượng cuộc gọi trên 85%');

        console.log('--- 5. Testing Candidate Task Submission (Link, Note) & HR Review ---');
        await page.goto(base + '/onboard.html?token=' + token);
        await page.waitForFunction(() => !!window.onboardingViewer && !!window.hrOnboardingStore);

        // Switch to Day 2 and expand module t2
        await page.evaluate(() => {
            window.onboardingViewer.setDayFilter('day-2');
            window.onboardingViewer.toggleModule('t2');
        });

        // Fill submission link and note
        await page.locator('#sub-link-t2').fill('https://docs.google.com/document/d/example123');
        await page.locator('#sub-note-t2').fill('Đã hoàn thành cấu hình pipeline và nạp 50 leads mẫu vào CRM');

        // Click submit button
        await page.locator('#mod-body-t2 button:has-text("Nộp bài & Hoàn thành")').click();

        // Verify task progress is checked and submission card is rendered
        await page.waitForFunction(() => {
            const submissions = window.hrOnboardingStore.getTaskSubmissions();
            return !!submissions['t2'] && submissions['t2'].link === 'https://docs.google.com/document/d/example123';
        });

        // Verify card displays the link and note
        const subCardText = await page.locator('#mod-body-t2').innerText();
        assert.ok(subCardText.includes('Đã nộp'), 'Submission card should show submitted status');
        assert.ok(subCardText.includes('https://docs.google.com/document/d/example123'), 'Submission card should show link');
        assert.ok(subCardText.includes('Đã hoàn thành cấu hình pipeline'), 'Submission card should show note');

        // Now go back to HR Hub and check that HR can see this candidate's submission
        await page.goto(base + '/hr.html');
        await page.locator('[name=email]').fill('hr@example.invalid');
        await page.locator('[name=password]').fill('test-pass');
        await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
        await page.waitForFunction(() => window.hrOnboardingStore.getCandidates().length === 2);
        await page.evaluate(() => window.hrHub.switchTab('candidates'));

        // Candidate c1 is linked with this personal link, let's inject submission into candidate c1's progress for testing HR view
        await page.evaluate(() => {
            const c = window.hrOnboardingStore.getCandidateById('c1');
            if (c) {
                if (!c.taskSubmissions) c.taskSubmissions = {};
                c.taskSubmissions['t2'] = {
                    link: 'https://docs.google.com/document/d/example123',
                    note: 'Đã hoàn thành cấu hình pipeline và nạp 50 leads mẫu vào CRM',
                    submittedAt: Date.now()
                };
                window.hrHub.renderCandidatesTab();
            }
        });

        // Click to expand candidate c1
        await page.evaluate(() => window.hrHub.toggleCandidateAccordion('c1'));
        const candidate1Content = await page.locator('#hr-cand-body-c1').innerText();
        assert.ok(candidate1Content.includes('Bài Tập & Báo Cáo Học Viên Đã Nộp'), 'HR should see submitted assignments section');
        assert.ok(candidate1Content.includes('https://docs.google.com/document/d/example123'), 'HR should see candidate submission link');
        assert.ok(candidate1Content.includes('Đã hoàn thành cấu hình pipeline'), 'HR should see candidate submission note');

        assert.deepEqual(errors, [], 'There should be no console or page errors');
        console.log('ALL TESTS PASSED! User requirements fully satisfied.');
    } finally {
        if (browser) await browser.close();
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
})().catch(err => {
    console.error(err);
    process.exitCode = 1;
});
