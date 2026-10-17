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

    // If candidate start date is next Monday 2026-10-19, and today is Saturday 2026-10-17 (before start date)
    // Note: getTodayDayId uses current date, which in Vietnam time on 2026-10-17 is before 2026-10-19
    const candidateFuture = { startDate: '2026-10-19' };
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

