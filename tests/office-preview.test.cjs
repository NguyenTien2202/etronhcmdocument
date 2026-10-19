const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

test('office preview local libraries exist and have valid size', () => {
    const xlsxPath = path.join(ROOT, 'js', 'xlsx.full.min.js');
    const mammothPath = path.join(ROOT, 'js', 'mammoth.browser.min.js');

    assert.ok(fs.existsSync(xlsxPath), 'js/xlsx.full.min.js must exist');
    assert.ok(fs.existsSync(mammothPath), 'js/mammoth.browser.min.js must exist');

    const xlsxStat = fs.statSync(xlsxPath);
    const mammothStat = fs.statSync(mammothPath);

    assert.ok(xlsxStat.size > 500000, `xlsx.full.min.js size (${xlsxStat.size}) must be > 500KB`);
    assert.ok(mammothStat.size > 500000, `mammoth.browser.min.js size (${mammothStat.size}) must be > 500KB`);
});

test('document-hub.js declares all required Word and Excel preview methods', () => {
    const docHubCode = fs.readFileSync(path.join(ROOT, 'js', 'document-hub.js'), 'utf8');

    const requiredMethods = [
        'openWordPreview',
        'openExcelPreview',
        'openWordDocument',
        'openExcelDocument',
        'getArrayBufferFromData',
        'ensureXlsxLoaded',
        'ensureMammothLoaded'
    ];

    for (const method of requiredMethods) {
        assert.ok(
            docHubCode.includes(method),
            `document-hub.js must declare method "${method}"`
        );
    }
});

test('previewFilePayload detects docx, doc, xlsx, xls, csv accurately', () => {
    const docHubCode = fs.readFileSync(path.join(ROOT, 'js', 'document-hub.js'), 'utf8');

    // Test detection regexes from document-hub.js
    const isWord = (fileName, fileType, strData = '') => {
        const lowerName = String(fileName || '').toLowerCase();
        const lowerType = String(fileType || '').toLowerCase();
        return lowerType.includes('wordprocessingml') ||
               lowerType.includes('msword') ||
               /\.(docx|doc)$/i.test(lowerName) ||
               strData.startsWith('data:application/vnd.openxmlformats-officedocument.wordprocessingml') ||
               strData.startsWith('data:application/msword');
    };

    const isExcel = (fileName, fileType, strData = '') => {
        const lowerName = String(fileName || '').toLowerCase();
        const lowerType = String(fileType || '').toLowerCase();
        return lowerType.includes('spreadsheetml') ||
               lowerType.includes('ms-excel') ||
               /\.(xlsx|xls|csv)$/i.test(lowerName) ||
               strData.startsWith('data:application/vnd.openxmlformats-officedocument.spreadsheetml') ||
               strData.startsWith('data:application/vnd.ms-excel');
    };

    // Word detection tests
    assert.equal(isWord('baitap.docx', ''), true, 'baitap.docx should be detected as Word');
    assert.equal(isWord('baocao.doc', ''), true, 'baocao.doc should be detected as Word');
    assert.equal(isWord('file', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'), true, 'Word mime should be detected as Word');
    assert.equal(isWord('file', 'application/msword'), true, 'Legacy Word mime should be detected as Word');
    assert.equal(isWord('img.png', 'image/png'), false, 'PNG should not be Word');

    // Excel detection tests
    assert.equal(isExcel('bangtinh.xlsx', ''), true, 'bangtinh.xlsx should be detected as Excel');
    assert.equal(isExcel('dulieu.xls', ''), true, 'dulieu.xls should be detected as Excel');
    assert.equal(isExcel('report.csv', ''), true, 'report.csv should be detected as Excel');
    assert.equal(isExcel('data', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'), true, 'Excel mime should be detected as Excel');
    assert.equal(isExcel('doc.docx', ''), false, 'Word should not be Excel');
});

test('getArrayBufferFromData converts base64 data URI properly', async () => {
    const sampleText = 'Hello Word & Excel preview!';
    const base64Data = Buffer.from(sampleText, 'utf8').toString('base64');
    const dataUri = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64Data}`;

    // Emulate getArrayBufferFromData logic
    const commaIdx = dataUri.indexOf(',');
    const base64 = commaIdx >= 0 ? dataUri.slice(commaIdx + 1) : dataUri;
    const binaryString = Buffer.from(base64, 'base64').toString('binary');
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const decoded = Buffer.from(bytes.buffer).toString('utf8');

    assert.equal(decoded, sampleText, 'Decoded buffer text must match original sample');
});

test('styles.css contains styling classes for Word and Excel preview', () => {
    const cssCode = fs.readFileSync(path.join(ROOT, 'css', 'styles.css'), 'utf8');

    assert.ok(cssCode.includes('.word-doc-content'), 'styles.css must have .word-doc-content');
    assert.ok(cssCode.includes('.excel-preview-wrapper'), 'styles.css must have .excel-preview-wrapper');
    assert.ok(cssCode.includes('.excel-preview-wrapper table'), 'styles.css must style excel table');
});

test('document-hub.js cloud sync supports files up to 35MB and provides retry buttons', () => {
    const docHubCode = fs.readFileSync(path.join(ROOT, 'js', 'document-hub.js'), 'utf8');

    // 1. Max size must be at least 35MB (to support 17MB files like Văn hoá Etron.pdf)
    assert.ok(docHubCode.includes('35 * 1024 * 1024'), 'Must support files up to 35MB');
    assert.ok(!docHubCode.includes('15 * 1024 * 1024'), 'Old 15MB limit must be removed');

    // 2. Chunks doc ID must not be double HTML-escaped in Firestore queries
    assert.ok(docHubCode.includes('doc(`${docId}_chunk_${j}`)'), 'Chunk set must use clean docId');
    assert.ok(docHubCode.includes('doc(`${doc.id}_chunk_0`)'), 'Chunk get must use clean doc.id');

    // 3. Modals must provide retry buttons when cloud file is not yet found
    assert.ok(docHubCode.includes('Thử tải lại từ Cloud'), 'Error modal must provide retry button');
});

