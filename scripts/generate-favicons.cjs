const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
    const root = 'D:\\sales-quotation-hub';
    const logoPath = path.join(root, 'assets', 'logo.png');
    const logoBase64 = fs.readFileSync(logoPath).toString('base64');
    const dataUri = `data:image/png;base64,${logoBase64}`;

    const browser = await chromium.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: true
    });
    const page = await browser.newPage();
    
    await page.setContent(`<!DOCTYPE html><html><body><img id="img" src="${dataUri}"></body></html>`);
    await page.waitForSelector('#img');

    const sizes = [16, 32, 48, 64, 192];
    const results = {};

    for (const size of sizes) {
        const pngBase64 = await page.evaluate((s) => {
            const img = document.getElementById('img');
            const canvas = document.createElement('canvas');
            canvas.width = s;
            canvas.height = s;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, s, s);
            return canvas.toDataURL('image/png').split(',')[1];
        }, size);
        results[size] = pngBase64;
        const outPath = path.join(root, 'assets', `favicon-${size}x${size}.png`);
        fs.writeFileSync(outPath, Buffer.from(pngBase64, 'base64'));
        console.log(`Generated favicon-${size}x${size}.png (${Buffer.from(pngBase64, 'base64').length} bytes)`);
    }

    // Save 32x32 base64 for embedding directly into HTML for 100% offline & path-independent rendering
    const b64DataUri32 = `data:image/png;base64,${results[32]}`;
    fs.writeFileSync(path.join(root, 'assets', 'favicon-32x32.txt'), b64DataUri32);

    // Generate valid standard .ico containing 32x32 PNG
    const png32 = Buffer.from(results[32], 'base64');
    // ICO Header: 2 bytes reserved (0), 2 bytes type (1 = ICO), 2 bytes image count (1)
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(1, 4);

    // Directory entry (16 bytes)
    const dir = Buffer.alloc(16);
    dir.writeUInt8(32, 0);       // width
    dir.writeUInt8(32, 1);       // height
    dir.writeUInt8(0, 2);        // color palette
    dir.writeUInt8(0, 3);        // reserved
    dir.writeUInt16LE(1, 4);     // color planes
    dir.writeUInt16LE(32, 6);    // bpp
    dir.writeUInt32LE(png32.length, 8); // size
    dir.writeUInt32LE(22, 12);   // offset (6 + 16 = 22)

    const ico = Buffer.concat([header, dir, png32]);
    fs.writeFileSync(path.join(root, 'favicon.ico'), ico);
    fs.writeFileSync(path.join(root, 'assets', 'favicon.ico'), ico);
    console.log(`Generated favicon.ico (${ico.length} bytes)`);

    await browser.close();
    console.log('All favicon assets successfully generated.');
})();
