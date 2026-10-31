const { test, before, after } = require('node:test');
const fs = require('node:fs');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, getDocs, collection, updateDoc, deleteDoc } = require('firebase/firestore');
let env;
const token = 'a'.repeat(64);
const otherToken = 'b'.repeat(64);
const hrUid = 'TmtCY7Bgb2OSPRZXhsK1qRnoI8g1';
before(async () => {
    env = await initializeTestEnvironment({ projectId: 'demo-saleshub', firestore: {
        host: '127.0.0.1', port: 8080, rules: fs.readFileSync('firestore.rules', 'utf8'),
    } });
    await env.withSecurityRulesDisabled(async ctx => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'hr_config/candidates_data'), { items: [{ salaryNote: 'private' }] });
        await setDoc(doc(db, 'hr_config/notes_data'), { items: ['private'] });
        await setDoc(doc(db, 'hr_config/security'), { legacy: true });
        await setDoc(doc(db, 'hr_config/onboarding_roadmap'), { days: [] });
        await setDoc(doc(db, 'onboarding_links', token), { fullName: 'Learner', role: 'Sales', startDate: '', targetDate: '', mentor: '', customRoadmap: [] });
    });
});
after(async () => { if (env) await env.cleanup(); });
test('anonymous SalesHub can edit and restore documents, but cannot hard delete', async () => {
    const db = env.unauthenticatedContext().firestore();
    const ref = doc(db, 'documents/test');
    await assertSucceeds(setDoc(ref, { title: 'Document', deletedAt: null }));
    await assertSucceeds(updateDoc(ref, { deletedAt: 123 }));
    await assertSucceeds(updateDoc(ref, { deletedAt: null }));
    await assertSucceeds(getDocs(collection(db, 'documents')));
    await assertFails(deleteDoc(ref));
});
test('anonymous and non-HR accounts cannot read or write private HR data', async () => {
    for (const db of [env.unauthenticatedContext().firestore(), env.authenticatedContext('not-hr').firestore()]) {
        for (const id of ['candidates_data', 'notes_data', 'templates_data', 'security', 'new_hire_progress']) {
            await assertFails(getDoc(doc(db, 'hr_config', id)));
            await assertFails(setDoc(doc(db, 'hr_config', id), { items: [] }));
        }
        await assertFails(getDocs(collection(db, 'hr_config')));
        await assertSucceeds(getDoc(doc(db, 'hr_config/onboarding_roadmap')));
        await assertFails(setDoc(doc(db, 'hr_config/onboarding_roadmap'), { days: [] }));
        await assertFails(getDoc(doc(db, 'unknown_collection/private')));
    }
});
test('only HR can publish links; link holders can update only boolean progress', async () => {
    const publicDb = env.unauthenticatedContext().firestore();
    const hrDb = env.authenticatedContext(hrUid).firestore();
    await assertSucceeds(getDoc(doc(hrDb, 'hr_config/candidates_data')));
    await assertSucceeds(setDoc(doc(hrDb, 'hr_config/notes_data'), { items: ['updated'] }));
    const publishRef = doc(hrDb, 'onboarding_links', 'c'.repeat(64));
    const learningData = { fullName: 'Learner', role: 'Sales', startDate: '', targetDate: '', mentor: '', customRoadmap: [] };
    await assertSucceeds(setDoc(publishRef, learningData));
    await assertFails(setDoc(publishRef, { ...learningData, salaryNote: 'private' }));
    await assertSucceeds(getDoc(doc(publicDb, 'onboarding_links', token)));
    await assertFails(getDocs(collection(publicDb, 'onboarding_links')));
    await assertFails(setDoc(doc(publicDb, 'onboarding_links', token), { fullName: 'Changed' }));
    const progress = doc(publicDb, 'onboarding_progress', token);
    await assertSucceeds(setDoc(progress, { completedTasks: { task1: true } }));
    await assertSucceeds(setDoc(progress, {
        completedTasks: { task1: true },
        taskSubmissions: { task1: { note: 'Completed assignment', link: 'https://example.com' } }
    }));
    await assertFails(setDoc(progress, { completedTasks: { task1: 'yes' } }));
    await assertFails(setDoc(progress, { completedTasks: { task1: true }, taskSubmissions: 'not-a-map' }));
    await assertFails(setDoc(progress, { completedTasks: {}, salaryNote: 'injected' }));
    await assertFails(setDoc(progress, { completedTasks: {}, taskSubmissions: {}, salaryNote: 'injected' }));
    await assertFails(setDoc(doc(publicDb, 'onboarding_progress', otherToken), { completedTasks: {} }));
    await assertFails(getDocs(collection(publicDb, 'onboarding_progress')));
    await assertSucceeds(deleteDoc(doc(hrDb, 'onboarding_links', token)));
    await assertFails(getDoc(progress));
    await assertFails(setDoc(progress, { completedTasks: {} }));
});
test('onboarding homework chunks are private to HR and the active link holder', async () => {
    const fileToken = 'd'.repeat(64);
    const fileId = '0123456789abcdef';
    const learningData = { fullName: 'Learner', role: 'Sales', startDate: '', targetDate: '', mentor: '', customRoadmap: [] };
    const chunkId = (t, f, i) => `${t}_${f}_${i}`;
    const chunk = (t, f, i, extra = {}) => ({ token: t, fileId: f, index: i, total: 2, data: 'data:text/plain;base64,QQ==', ...extra });
    await env.withSecurityRulesDisabled(async ctx => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'onboarding_links', fileToken), learningData);
        await setDoc(doc(db, 'onboarding_files', chunkId(otherToken, fileId, 0)), chunk(otherToken, fileId, 0));
    });
    const publicDb = env.unauthenticatedContext().firestore();
    const hrDb = env.authenticatedContext(hrUid).firestore();
    const ownRef = doc(publicDb, 'onboarding_files', chunkId(fileToken, fileId, 0));
    await assertSucceeds(setDoc(ownRef, chunk(fileToken, fileId, 0)));
    await assertSucceeds(getDoc(ownRef));
    await assertFails(setDoc(ownRef, chunk(fileToken, fileId, 0, { data: 'changed' })));
    await assertFails(updateDoc(ownRef, { data: 'changed' }));
    await assertFails(setDoc(doc(publicDb, 'onboarding_files', chunkId(fileToken, fileId, 1)), chunk(otherToken, fileId, 1)));
    await assertFails(setDoc(doc(publicDb, 'onboarding_files', chunkId(fileToken, fileId, 1)), chunk(fileToken, fileId, 0)));
    await assertFails(setDoc(doc(publicDb, 'onboarding_files', chunkId(fileToken, fileId, 1)), chunk(fileToken, fileId, 1, { extra: true })));
    await assertFails(setDoc(doc(publicDb, 'onboarding_files', chunkId(fileToken, fileId, 1)), chunk(fileToken, fileId, 1, { data: 'x'.repeat(700001) })));
    await assertFails(setDoc(doc(publicDb, 'onboarding_files', chunkId(fileToken, fileId, 2)), chunk(fileToken, fileId, 2)));
    await assertFails(setDoc(doc(publicDb, 'onboarding_files', chunkId(fileToken, 'abc', 1)), chunk(fileToken, 'abc', 1)));
    await assertFails(getDoc(doc(publicDb, 'onboarding_files', chunkId(otherToken, fileId, 0))));
    await assertFails(deleteDoc(doc(publicDb, 'onboarding_files', chunkId(otherToken, fileId, 0))));
    await assertFails(setDoc(doc(publicDb, 'onboarding_files', chunkId(otherToken, fileId, 1)), chunk(otherToken, fileId, 1)));
    await assertFails(getDocs(collection(publicDb, 'onboarding_files')));
    await assertSucceeds(getDoc(doc(hrDb, 'onboarding_files', chunkId(fileToken, fileId, 0))));
    await assertSucceeds(getDocs(collection(hrDb, 'onboarding_files')));
    await assertSucceeds(deleteDoc(ownRef));
    await env.withSecurityRulesDisabled(async ctx => {
        await deleteDoc(doc(ctx.firestore(), 'onboarding_links', fileToken));
    });
    await assertFails(setDoc(doc(publicDb, 'onboarding_files', chunkId(fileToken, fileId, 1)), chunk(fileToken, fileId, 1)));
});
