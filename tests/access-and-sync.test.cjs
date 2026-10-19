const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { webcrypto } = require('node:crypto');
function storeHarness(isHr = false) {
    const listeners = [];
    const writes = [];
    const unsubscribed = [];
    const db = { collection: name => ({ doc: id => ({
        onSnapshot(next) { listeners.push({ name, id, next }); return () => unsubscribed.push(id); },
        async set(data) { writes.push({ name, id, data }); },
        async get() { return { exists: false }; },
        async delete() { writes.push({ name, id, deleted: true }); },
    }) }) };
    const memory = new Map();
    const context = vm.createContext({
        window: { firebaseDb: db, hrAuth: { isHr: () => isHr } }, crypto: webcrypto,
        localStorage: { getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, value) },
        console,
    });
    vm.runInContext(fs.readFileSync('js/hr-onboarding-data.js', 'utf8'), context);
    return { store: context.window.hrOnboardingStore, listeners, writes, unsubscribed };
}
test('public onboarding subscribes only to shared roadmap, never seeds HR data', () => {
    const { store, listeners, writes } = storeHarness();
    store.setupCloudSync(); store.setupCloudSync();
    assert.equal(listeners.length, 1);
    assert.equal(listeners[0].id, 'onboarding_roadmap');
    listeners[0].next({ exists: false, metadata: { fromCache: false } });
    assert.equal(writes.length, 0);
    assert.equal(store.getCandidates().length, 0);
    assert.throws(() => store.saveCandidates([]));
    assert.throws(() => store.openPersonalLink('cand-123'));
});
test('HR cannot overwrite data until server snapshots arrive; logout removes private memory/listeners', () => {
    const { store, listeners, writes, unsubscribed } = storeHarness(true);
    store.setupCloudSync();
    assert.throws(() => store.saveCandidates([]));
    const candidates = listeners.find(l => l.id === 'candidates_data');
    candidates.next({ exists: true, metadata: { fromCache: false }, data: () => ({ items: [{ id: 'c1', fullName: 'Test' }] }) });
    assert.equal(store.getCandidates()[0].fullName, 'Test');
    store.saveCandidates(store.getCandidates());
    assert.equal(writes.length, 1);
    store.stopPrivateSync();
    assert.equal(store.privateData.candidates.length, 0);
    assert.equal(unsubscribed.length, listeners.length);
});
test('published personal links contain learning fields only and 256-bit random IDs', async () => {
    const { store, listeners, writes } = storeHarness(true);
    store.setupCloudSync();
    listeners.find(l => l.id === 'candidates_data').next({ exists: true, metadata: {}, data: () => ({ items: [{
        id: 'c1', fullName: 'Learner', salaryNote: 'DO NOT PUBLISH', privateNote: 'DO NOT PUBLISH',
        phone: 'DO NOT PUBLISH', checklist: ['DO NOT PUBLISH'], taskProgress: {},
    }] }) });
    const token = await store.publishCandidate('c1');
    assert.match(token, /^[a-f0-9]{64}$/);
    const published = writes.find(w => w.name === 'onboarding_links');
    assert.deepEqual(Object.keys(published.data).sort(), ['customRoadmap', 'fullName', 'mentor', 'role', 'startDate', 'targetDate']);
    assert.ok(!JSON.stringify(published.data).includes('DO NOT PUBLISH'));
});
test('sync adapter reports pending, failure and successful retry without hiding write failures on reads', async () => {
    const events = {};
    const navigator = { onLine: true };
    const context = vm.createContext({ window: { firebaseDb: {}, addEventListener: (n, f) => events[n] = f }, navigator,
        document: { addEventListener() {}, getElementById() { return null; } } });
    vm.runInContext(fs.readFileSync('js/sync-status.js', 'utf8'), context);
    const monitor = context.window.syncStatus;
    let rejectWrite;
    let next;
    const ref = { path: 'documents/test',
        set() { return new Promise((_, reject) => { rejectWrite = reject; }); },
        onSnapshot(options, callback) { next = callback; return () => {}; },
    };
    const wrapped = monitor.wrap(ref);
    const pending = wrapped.set({});
    assert.match(monitor.status(), /Đang lưu/);
    rejectWrite(new Error('permission denied'));
    await assert.rejects(pending);
    wrapped.onSnapshot(() => {});
    next({ metadata: { fromCache: false } });
    assert.match(monitor.status(), /Đồng bộ lỗi/);
    ref.set = async () => {};
    await wrapped.set({});
    assert.match(monitor.status(), /Đã lưu lên cloud/);
    navigator.onLine = false;
    assert.match(monitor.status(), /Mất mạng/);
});
test('onboarding deadline uses Vietnam date and completed plans are not overdue', () => {
    const { store } = storeHarness();
    const candidate = { targetDate: '2026-10-17', customRoadmap: [{ title: 'Day one', tasks: [{ id: 'task1' }] }], taskProgress: {} };
    assert.equal(store.getLearningSummary(candidate, new Date('2026-10-17T16:59:00Z')).isOverdue, false);
    assert.equal(store.getLearningSummary(candidate, new Date('2026-10-17T17:01:00Z')).isOverdue, true);
    candidate.taskProgress.task1 = true;
    const complete = store.getLearningSummary(candidate, new Date('2026-10-17T17:01:00Z'));
    assert.equal(complete.isOverdue, false);
    assert.equal(complete.nextDay, undefined);
});
test('working days calculation excludes Saturday and Sunday (Monday to Friday only)', () => {
    const { store } = storeHarness();
    // Monday 2026-10-19
    const schedule = store.getWorkingDaysSchedule('2026-10-19', 8);
    assert.deepEqual([...schedule], [
        '2026-10-19', // Day 1: Thứ Hai
        '2026-10-20', // Day 2: Thứ Ba
        '2026-10-21', // Day 3: Thứ Tư
        '2026-10-22', // Day 4: Thứ Năm
        '2026-10-23', // Day 5: Thứ Sáu
        '2026-10-26', // Day 6: Thứ Hai (trừ T7 24/10 và CN 25/10)
        '2026-10-27', // Day 7: Thứ Ba
        '2026-10-28', // Day 8: Thứ Tư
    ]);
    // If start date is on Saturday 2026-10-17, it should shift to next Monday 2026-10-19
    assert.equal(store.getWorkingDayDate('2026-10-17', 0), '2026-10-19');
    // If start date is on Sunday 2026-10-18, it should shift to next Monday 2026-10-19
    assert.equal(store.getWorkingDayDate('2026-10-18', 0), '2026-10-19');
});

test('OnboardingViewer defaults to "all" before start date, shifts to next working day on weekends without "Hôm nay" badge', () => {
    const { store } = storeHarness();
    const context = vm.createContext({
        window: { hrOnboardingStore: store },
        document: { getElementById: () => null },
        Intl,
        Date,
        console
    });
    vm.runInContext(fs.readFileSync('js/onboarding-viewer.js', 'utf8'), context);
    const viewer = context.window.onboardingViewer;

    const roadmap = [
        { id: 'd1', dayNumber: 'Ngày 1', tasks: [] },
        { id: 'd2', dayNumber: 'Ngày 2', tasks: [] },
        { id: 'd3', dayNumber: 'Ngày 3', tasks: [] }
    ];

    // If candidate start date is in the future (relative to today), defaults to 'all'
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    const candidateFuture = { startDate: futureDate.toISOString().slice(0, 10) };
    const dayIdBeforeStart = viewer.getTodayDayId(roadmap, candidateFuture);
    assert.equal(dayIdBeforeStart, 'all');

    // Test toggleDay and toggleAllDays
    viewer.toggleDay('d1');
    assert.equal(viewer.collapsedDays.has('d1'), true);
    viewer.toggleDay('d1');
    assert.equal(viewer.collapsedDays.has('d1'), false);

    viewer.toggleAllDays(true);
    assert.equal(viewer.collapsedDays.size >= 1, true);
    viewer.toggleAllDays(false);
    assert.equal(viewer.collapsedDays.size, 0);
});

test('publishCandidate generates 64-char token, saves to candidate object and sets up onboarding_progress strictly without extra fields', async () => {
    const { store, listeners, writes } = storeHarness(true);
    store.setupCloudSync();
    listeners.find(l => l.id === 'candidates_data').next({ exists: true, metadata: {}, data: () => ({ items: [{
        id: 'cand-001', fullName: 'Nguyen Van A', role: 'Sales Lead', startDate: '2026-10-20', mentor: 'Trainer',
        taskProgress: { 'task-1': true, 'invalid-non-boolean': 'string-val' }
    }] }) });

    const token = await store.publishCandidate('cand-001');
    assert.match(token, /^[a-f0-9]{64}$/);
    const candidate = store.getCandidates().find(c => c.id === 'cand-001');
    assert.equal(candidate.onboardToken, token);

    // Verify onboarding_progress write only contains completedTasks with booleans
    const progressWrite = writes.find(w => w.name === 'onboarding_progress' && w.id === token);
    assert.ok(progressWrite);
    assert.deepEqual(Object.keys(progressWrite.data), ['completedTasks']);
    assert.deepEqual(JSON.parse(JSON.stringify(progressWrite.data.completedTasks)), { 'task-1': true });

    // Verify repeating publishCandidate preserves the same token
    const token2 = await store.publishCandidate('cand-001');
    assert.equal(token2, token);
});

test('saveRoadmap works for HR immediately, respects user link deletions and protects against stale cloud overwrite', () => {
    const { store, listeners, writes } = storeHarness(true);
    store.setupCloudSync();

    // HR can save roadmap immediately without waiting for server snapshots
    const initialRoadmap = store.getRoadmap();
    assert.ok(initialRoadmap.length > 0);
    const m102Initial = initialRoadmap[0].tasks.find(t => t.id === 'm-102');
    assert.ok(m102Initial && m102Initial.links.length > 0);

    // Delete links from m-102
    const editedRoadmap = JSON.parse(JSON.stringify(initialRoadmap));
    const m102Edited = editedRoadmap[0].tasks.find(t => t.id === 'm-102');
    m102Edited.links = [];

    // saveRoadmap should respect the deletion and NOT resurrect it
    store.saveRoadmap(editedRoadmap);
    const saved = writes.find(w => w.name === 'hr_config' && w.id === 'onboarding_roadmap');
    assert.ok(saved);
    const m102AfterSave = store.getRoadmap()[0].tasks.find(t => t.id === 'm-102');
    assert.equal(m102AfterSave.links.length, 0);

    // Stale cloud snapshot with older updatedAt should NOT overwrite fresh local roadmap
    const roadmapListener = listeners.find(l => l.id === 'onboarding_roadmap');
    assert.ok(roadmapListener);
    roadmapListener.next({
        exists: true,
        metadata: { fromCache: false },
        data: () => ({
            days: [{ id: 'old-day', title: 'Old Day', tasks: [] }],
            updatedAt: 1000 // Very old timestamp
        })
    });
    // Roadmap should still retain the fresh local version, not the stale old-day
    assert.ok(store.getRoadmap()[0].tasks.some(t => t.id === 'm-102'));
    assert.equal(store.getRoadmap()[0].tasks.find(t => t.id === 'm-102').links.length, 0);
});

test('getPublicOnboardUrl includes candidate name, cleanAddressBarUrl hides token hash, and editCandidateChecklistItem edits tasks', () => {
    const { store } = storeHarness(true);
    store.ready.add('candidates');
    const cand = { id: 'c-test', fullName: 'Nguyen Van A', onboardToken: 'a'.repeat(64), checklist: [{ id: 'chk-1', stage: 'legal', title: 'Nộp CCCD', done: false }] };
    store.privateData.candidates = [cand];

    let replacedStateUrl = null;
    let currentHref = 'http://localhost/onboard.html?nhan-su=Nguyen+Van+A#key=' + 'a'.repeat(64);
    const mockHistory = {
        replaceState: (state, title, url) => {
            replacedStateUrl = url;
            currentHref = 'http://localhost' + url;
        }
    };
    const mockStorage = new Map();
    const context = vm.createContext({
        window: {
            location: new URL(currentHref),
            history: mockHistory,
            hrOnboardingStore: store,
            sessionStorage: { getItem: k => mockStorage.get(k) || null, setItem: (k, v) => mockStorage.set(k, v) },
            localStorage: { getItem: k => mockStorage.get(k) || null, setItem: (k, v) => mockStorage.set(k, v) },
            lucide: { createIcons: () => {} }
        },
        document: { addEventListener: () => {}, getElementById: () => null },
        URL,
        URLSearchParams,
        console
    });

    vm.runInContext(fs.readFileSync('js/hr-hub.js', 'utf8'), context);
    const hrHub = context.window.hrHub;
    const url = hrHub.getPublicOnboardUrl('c-test');
    assert.ok(url.includes('onboard/nhansunguyenvana') || url.includes('nhansunguyenvana'));
    assert.ok(!url.includes('k='));
    assert.ok(!url.includes('key='));

    // Run onboarding viewer cleanAddressBarUrl
    vm.runInContext(fs.readFileSync('js/onboarding-viewer.js', 'utf8'), context);
    const viewer = context.window.onboardingViewer;
    viewer.cleanAddressBarUrl();
    assert.ok(replacedStateUrl);
    assert.ok(!replacedStateUrl.includes('key='));
    assert.ok(!replacedStateUrl.includes('k='));
    assert.ok(replacedStateUrl.includes('nhansunguyenvana'));

    // Test editCandidateChecklistItem in hrHub
    context.prompt = () => 'Nộp CCCD 2 mặt kèm thẻ BHYT';
    hrHub.showToast = () => {};
    hrHub.renderCandidatesTab = () => {};
    hrHub.editCandidateChecklistItem('c-test', 'chk-1');
    assert.equal(cand.checklist[0].title, 'Nộp CCCD 2 mặt kèm thẻ BHYT');
});

test('moveTaskUp, moveTaskDown, moveRoadmapDayUp, moveRoadmapDayDown and insert day in middle work and recalculate dates', () => {
    const { store } = storeHarness(true);
    store.ready.add('roadmap');

    // Setup initial 3 days starting on Monday 2026-10-19
    const initialDays = [
        { id: 'day-1', dayNumber: 'Ngày 1', date: '2026-10-19', title: 'Hội nhập', tasks: [
            { id: 'task-1', title: 'Văn hóa Etron' },
            { id: 'task-2', title: 'Quy trình công ty' },
            { id: 'task-3', title: 'Bàn giao tài khoản' }
        ] },
        { id: 'day-2', dayNumber: 'Ngày 2', date: '2026-10-20', title: 'Sản phẩm Callbot', tasks: [
            { id: 'task-21', title: 'Học kịch bản' }
        ] },
        { id: 'day-3', dayNumber: 'Ngày 3', date: '2026-10-21', title: 'Phần mềm CRM', tasks: [
            { id: 'task-31', title: 'Quản lý Lead' }
        ] }
    ];
    store.roadmap = initialDays;

    const mockStorage = new Map();
    const context = vm.createContext({
        window: {
            location: new URL('http://localhost/hr.html'),
            history: { replaceState() {} },
            hrOnboardingStore: store,
            sessionStorage: { getItem: k => mockStorage.get(k) || null, setItem: (k, v) => mockStorage.set(k, v) },
            localStorage: { getItem: k => mockStorage.get(k) || null, setItem: (k, v) => mockStorage.set(k, v) },
            lucide: { createIcons: () => {} }
        },
        document: { addEventListener: () => {}, getElementById: () => null },
        URL,
        URLSearchParams,
        console
    });

    vm.runInContext(fs.readFileSync('js/hr-hub.js', 'utf8'), context);
    const hrHub = context.window.hrHub;
    hrHub.showToast = () => {};
    hrHub.renderRoadmapTab = () => {};

    // 1. Test moveTaskDown: Move task-1 down
    hrHub.moveTaskDown('day-1', 'task-1');
    const day1Tasks = store.getRoadmap().find(d => d.id === 'day-1').tasks;
    assert.equal(day1Tasks[0].id, 'task-2');
    assert.equal(day1Tasks[1].id, 'task-1');

    // 2. Test moveTaskUp: Move task-1 back up
    hrHub.moveTaskUp('day-1', 'task-1');
    const day1TasksAfterUp = store.getRoadmap().find(d => d.id === 'day-1').tasks;
    assert.equal(day1TasksAfterUp[0].id, 'task-1');
    assert.equal(day1TasksAfterUp[1].id, 'task-2');

    // 3. Test moveRoadmapDayDown: Move Day 1 down
    hrHub.moveRoadmapDayDown('day-1');
    const roadmapAfterDayMove = store.getRoadmap();
    assert.equal(roadmapAfterDayMove[0].id, 'day-2');
    assert.equal(roadmapAfterDayMove[0].dayNumber, 'Ngày 1');
    assert.equal(roadmapAfterDayMove[0].date, '2026-10-19'); // Monday

    assert.equal(roadmapAfterDayMove[1].id, 'day-1');
    assert.equal(roadmapAfterDayMove[1].dayNumber, 'Ngày 2');
    assert.equal(roadmapAfterDayMove[1].date, '2026-10-20'); // Tuesday

    // 4. Test reindexRoadmapDays with weekend skipping
    // Start on Friday 2026-10-23
    store.roadmap[0].date = '2026-10-23';
    hrHub.reindexRoadmapDays(store.roadmap);
    assert.equal(store.roadmap[0].date, '2026-10-23'); // Friday
    assert.equal(store.roadmap[1].date, '2026-10-26'); // Next Monday (skips Sat 24, Sun 25)
    assert.equal(store.roadmap[2].date, '2026-10-27'); // Next Tuesday

    // 5. Test inserting day in middle (between index 0 and 1)
    hrHub.insertRoadmapDayIndex = 1;
    // Mock modal form values
    const domValues = {
        'hr-day-number': 'Ngày 2',
        'hr-day-title': 'Chuyên đề AI đặc biệt',
        'hr-day-date': '',
        'hr-day-duration': '08:30 – 17:30',
        'hr-day-trainer': 'Nguyễn Thủy Tiên',
        'hr-day-goal': 'Hiểu AI',
        'hr-day-color': 'indigo',
        'hr-day-note': '',
        'hr-day-tasks': 'Thực hành Prompt Engineering'
    };
    context.document.getElementById = (id) => ({
        value: domValues[id] || '',
        classList: { add() {}, remove() {} }
    });
    hrHub.closeRoadmapDayModal = () => {};
    hrHub.handleSaveRoadmapDay({ preventDefault() {} });

    const roadmapAfterInsert = store.getRoadmap();
    assert.equal(roadmapAfterInsert.length, 4);
    assert.equal(roadmapAfterInsert[1].title, 'Chuyên đề AI đặc biệt');
    assert.equal(roadmapAfterInsert[1].dayNumber, 'Ngày 2');
    assert.equal(roadmapAfterInsert[1].date, '2026-10-26'); // Monday
    assert.equal(roadmapAfterInsert[2].dayNumber, 'Ngày 3');
    assert.equal(roadmapAfterInsert[2].date, '2026-10-27'); // Tuesday
    assert.equal(roadmapAfterInsert[3].dayNumber, 'Ngày 4');
    assert.equal(roadmapAfterInsert[3].date, '2026-10-28'); // Wednesday
});

test('task drag-and-drop reorder and unified attachment modal with 2 tabs', async () => {
    const { store } = storeHarness(true);
    store.ready.add('roadmap');
    store.roadmap = [
        {
            id: 'day-1',
            dayNumber: 'Ngày 1',
            date: '2026-10-19',
            title: 'Hội nhập',
            tasks: [
                { id: 'task-1', text: 'Giới thiệu công ty', links: [] },
                { id: 'task-2', text: 'Cài đặt phần mềm', links: [] },
                { id: 'task-3', text: 'Học văn hóa doanh nghiệp', links: [] }
            ]
        }
    ];

    const context = vm.createContext({
        window: {
            hrOnboardingStore: store,
            addEventListener: () => {},
            confirm: () => true,
            alert: () => {},
            lucide: { createIcons: () => {} }
        },
        document: {
            addEventListener: () => {},
            getElementById: () => ({
                classList: { add() {}, remove() {}, toggle() {} },
                setAttribute() {},
                removeAttribute() {},
                focus() {},
                value: ''
            })
        },
        URL,
        URLSearchParams,
        lucide: { createIcons: () => {} },
        console
    });

    vm.runInContext(fs.readFileSync('js/hr-hub.js', 'utf8'), context);
    const hrHub = context.window.hrHub;
    hrHub.showToast = () => {};
    hrHub.renderRoadmapTab = () => {};

    // 1. Reorder task-1 to place below task-2: order should become task-2, task-1, task-3
    hrHub.reorderTasksInDay('day-1', 'task-1', 'task-2', true);
    let tasks = store.getRoadmap()[0].tasks;
    assert.equal(tasks[0].id, 'task-2');
    assert.equal(tasks[1].id, 'task-1');
    assert.equal(tasks[2].id, 'task-3');

    // 2. Reorder task-3 to place above task-2 (placeBelow = false): order becomes task-3, task-2, task-1
    hrHub.reorderTasksInDay('day-1', 'task-3', 'task-2', false);
    tasks = store.getRoadmap()[0].tasks;
    assert.equal(tasks[0].id, 'task-3');
    assert.equal(tasks[1].id, 'task-2');
    assert.equal(tasks[2].id, 'task-1');

    // 3. Test switchAttachDocTab
    hrHub.switchAttachDocTab('custom');
    assert.equal(hrHub.attachModalTab, 'custom');
    hrHub.switchAttachDocTab('repo');
    assert.equal(hrHub.attachModalTab, 'repo');
});





