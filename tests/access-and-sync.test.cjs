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
