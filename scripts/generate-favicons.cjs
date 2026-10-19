const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

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

    // 1. Detect badge bounds and generate circular transparent favicons
    const sizes = [16, 32, 48, 64, 192];
    const results = {};

    for (const size of sizes) {
        const res = await page.evaluate((s) => {
            const img = document.getElementById('img');
            
            // First draw to measure badge
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.naturalWidth;
            tempCanvas.height = img.naturalHeight;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(img, 0, 0);
            const data = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;

            let minX = tempCanvas.width, maxX = 0, minY = tempCanvas.height, maxY = 0;
            for (let y = 0; y < tempCanvas.height; y++) {
                for (let x = 0; x < tempCanvas.width; x++) {
                    const idx = (y * tempCanvas.width + x) * 4;
                    const r = data[idx], g = data[idx+1], b = data[idx+2], a = data[idx+3];
                    if (a > 100 && (r < 245 || g < 245 || b < 245)) {
                        if (x < 10 && (y < 10 || y > tempCanvas.height - 10)) continue;
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }

            // Create target canvas with transparent background
            const canvas = document.createElement('canvas');
            canvas.width = s;
            canvas.height = s;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, s, s);

            // Clip strictly to a circle
            ctx.save();
            ctx.beginPath();
            ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();

            // Draw the circular badge centered and scaled
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            const badgeW = maxX - minX;
            const badgeH = maxY - minY;
            ctx.drawImage(img, minX, minY, badgeW, badgeH, 0, 0, s, s);
            ctx.restore();

            // Verify corner pixels are completely transparent (a = 0)
            const outData = ctx.getImageData(0, 0, s, s).data;
            const corner0 = [outData[0], outData[1], outData[2], outData[3]];
            const cornerTR = [outData[(s-1)*4], outData[(s-1)*4+1], outData[(s-1)*4+2], outData[(s-1)*4+3]];

            return {
                base64: canvas.toDataURL('image/png').split(',')[1],
                corner0,
                cornerTR
            };
        }, size);

        results[size] = res.base64;
        console.log(`Size ${size}x${size}: cornerTL=${JSON.stringify(res.corner0)}, cornerTR=${JSON.stringify(res.cornerTR)}`);

        const outPath = path.join(root, 'assets', `favicon-${size}x${size}.png`);
        fs.writeFileSync(outPath, Buffer.from(res.base64, 'base64'));
    }

    // Save 32x32 transparent data URI
    const b64DataUri32 = `data:image/png;base64,${results[32]}`;
    fs.writeFileSync(path.join(root, 'assets', 'favicon-32x32.txt'), b64DataUri32);

    // Generate valid standard .ico containing 32x32 PNG with transparent alpha
    const png32 = Buffer.from(results[32], 'base64');
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(1, 4);

    const dir = Buffer.alloc(16);
    dir.writeUInt8(32, 0);
    dir.writeUInt8(32, 1);
    dir.writeUInt8(0, 2);
    dir.writeUInt8(0, 3);
    dir.writeUInt16LE(1, 4);
    dir.writeUInt16LE(32, 6);
    dir.writeUInt32LE(png32.length, 8);
    dir.writeUInt32LE(22, 12);

    const ico = Buffer.concat([header, dir, png32]);
    fs.writeFileSync(path.join(root, 'favicon.ico'), ico);
    fs.writeFileSync(path.join(root, 'assets', 'favicon.ico'), ico);
    console.log(`Generated transparent favicon.ico (${ico.length} bytes)`);

    await browser.close();
    console.log('All transparent favicon assets generated successfully.');
})();
