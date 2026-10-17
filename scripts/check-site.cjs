const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
let references = 0;
let scripts = 0;
for (const page of ['index.html', 'hr.html', 'onboard.html']) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) {
        const ref = match[1];
        if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref)) continue;
        const local = decodeURIComponent(ref.split(/[?#]/)[0]);
        if (!local) continue;
        const target = path.resolve(root, path.dirname(page), local);
        assert.ok(target.startsWith(root + path.sep), `${page}: reference outside site`);
        assert.ok(fs.existsSync(target), `${page}: missing ${local}`);
        references++;
    }
    for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
        if (/\bsrc\s*=/.test(match[1]) || !match[2].trim()) continue;
        new vm.Script(match[2], { filename: page + ':inline' });
        scripts++;
    }
}
for (const filename of fs.readdirSync(path.join(root, 'js'))) {
    if (!filename.endsWith('.js')) continue;
    const result = spawnSync(process.execPath, ['--check', path.join(root, 'js', filename)], { encoding: 'utf8' });
    assert.equal(result.status, 0, `${filename}: JavaScript syntax check failed`);
    scripts++;
}

// Exercise the actual quotation calculation without constructing the UI.
const context = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(root, 'js/number-to-words.js'), 'utf8'), context);
const builderSource = fs.readFileSync(path.join(root, 'js/quote-builder.js'), 'utf8');
vm.runInContext(builderSource.replace('window.quoteBuilder = new QuoteBuilder();',
    'window.testBuilder = Object.create(QuoteBuilder.prototype);'), context);
const builder = context.window.testBuilder;
builder.renderTotalsDisplay = () => {};
builder.updateFloatingDock = () => {};
builder.isCrmItem = item => item.testType === 'crm';
builder.isMonthlyNumberItem = () => false;
builder.isMonthlyFeeService = () => false;
builder.isYearlyFeeService = () => false;
builder.isNonVatItem = item => item.testType === 'telecom';
builder.currentQuote = {
    items: [
        { testType: 'crm', quantity: 2, months: 12, price: 100000, discountPercent: 10 },
        { testType: 'telecom', quantity: 1, price: 500000 },
    ],
    overallDiscountPercent: 5,
    vatRate: 8,
};
builder.recalculate();
assert.equal(builder.currentQuote.items[0].amount, 2160000);
assert.equal(builder.currentQuote.amountBeforeTax, 2052000);
assert.equal(builder.currentQuote.vatAmount, 164160);
assert.equal(builder.currentQuote.grandTotal, 2716160);
assert.ok(builder.currentQuote.totalInWords.length > 0);
builder.currentQuote = { items: [], overallDiscountPercent: 0, vatRate: 8 };
builder.recalculate();
assert.equal(builder.currentQuote.grandTotal, 0);
assert.equal(context.window.readVietnameseCurrency(0), 'Không đồng chẵn.');
console.log(`PASS: 3 HTML pages, ${references} local references, ${scripts} scripts, quotation totals and currency conversion.`);
