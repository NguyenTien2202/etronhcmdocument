/**
 * PDF Exporter Module
 * Tải trực tiếp file PDF qua thư viện html2pdf.js (Offline & Online).
 *
 * Lưu ý kỹ thuật: html2pdf sẽ CLONE phần tử được truyền vào sang container riêng của nó.
 * Nếu phần tử truyền vào có position absolute/fixed thì bản clone bị rút khỏi luồng layout,
 * container cao 0px → canvas cao 0 → PDF trắng trơn. Vì vậy luôn truyền vào chính tờ A4
 * (.a4-sheet, position tĩnh), còn khung chứa tạm thì đặt ngoài màn hình.
 */

class PdfExporter {
    constructor() {
        this.isExporting = false;
    }

    buildFilename(quoteNumber) {
        const q = window.quoteBuilder?.currentQuote;
        const cust = (q?.customer?.company || '').trim();
        const base = cust ? `Bao_Gia_${cust}` : (quoteNumber || q?.quoteNumber || 'Bao_Gia_Etron');
        // Bỏ dấu tiếng Việt để tên file an toàn trên mọi hệ điều hành
        const ascii = base.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
        const clean = ascii.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_') || 'Bao_Gia_Etron';
        const now = new Date();
        const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        return `${clean}_${ymd}.pdf`;
    }

    // Làm sạch tên file do người dùng nhập (giữ tiếng Việt, bỏ ký tự cấm trên Windows/Mac)
    sanitizeFilename(name, fallback) {
        let clean = String(name || '')
            .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/\.pdf$/i, '')
            .replace(/[. ]+$/, '');
        if (!clean) clean = String(fallback || 'Bao_Gia_Etron').replace(/\.pdf$/i, '');
        if (clean.length > 150) clean = clean.slice(0, 150).trim();
        return clean + '.pdf';
    }

    // Hộp thoại đặt tên file PDF trước khi tải (Enter = Tải, Esc = Hủy)
    askFilename(defaultName) {
        return new Promise(resolve => {
            const old = document.getElementById('pdf-name-dialog');
            if (old) old.remove();
            const base = String(defaultName || '').replace(/\.pdf$/i, '');
            const overlay = document.createElement('div');
            overlay.id = 'pdf-name-dialog';
            overlay.className = 'no-print';
            overlay.style.cssText = 'position:fixed; inset:0; z-index:90; background:rgba(2,6,23,0.55); display:flex; align-items:center; justify-content:center; padding:16px;';
            overlay.innerHTML = `
                <form style="background:#fff; border-radius:18px; padding:20px; width:100%; max-width:440px; box-shadow:0 20px 50px rgba(0,0,0,.3); font-family:inherit;">
                    <div style="font-weight:800; font-size:15px; color:#0f172a;">Đặt tên file PDF</div>
                    <div style="font-size:12px; color:#64748b; margin:4px 0 12px;">Nhập tên file bạn muốn lưu (không cần gõ .pdf).</div>
                    <div style="display:flex; align-items:center; border:1px solid #cbd5e1; border-radius:12px; overflow:hidden;">
                        <input id="pdf-name-input" type="text" autocomplete="off" spellcheck="false"
                            style="flex:1; min-width:0; padding:11px 12px; font-size:14px; border:none; outline:none; color:#0f172a;">
                        <span style="padding:0 12px; font-size:13px; font-weight:700; color:#64748b; background:#f8fafc; align-self:stretch; display:flex; align-items:center; border-left:1px solid #e2e8f0;">.pdf</span>
                    </div>
                    <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
                        <button type="button" id="pdf-name-cancel" style="padding:10px 16px; border-radius:12px; background:#f1f5f9; color:#334155; font-weight:700; font-size:13px; border:none; cursor:pointer;">Hủy</button>
                        <button type="submit" style="padding:10px 18px; border-radius:12px; background:#059669; color:#fff; font-weight:700; font-size:13px; border:none; cursor:pointer;">Tải PDF</button>
                    </div>
                </form>`;
            const input = overlay.querySelector('#pdf-name-input');
            input.value = base;
            const finish = (value) => {
                document.removeEventListener('keydown', onKey, true);
                overlay.remove();
                resolve(value);
            };
            const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); finish(null); } };
            overlay.querySelector('form').addEventListener('submit', (e) => {
                e.preventDefault();
                finish(this.sanitizeFilename(input.value, base));
            });
            overlay.querySelector('#pdf-name-cancel').addEventListener('click', () => finish(null));
            overlay.addEventListener('click', (e) => { if (e.target === overlay) finish(null); });
            document.addEventListener('keydown', onKey, true);
            document.body.appendChild(overlay);
            setTimeout(() => { input.focus(); input.select(); }, 30);
        });
    }

    /**
     * Kẻ lưới bảng đúng 0.5pt cho file PDF.
     * Trình duyệt luôn làm tròn viền nhỏ hơn 1px lên 1px (= 0.75pt), nên khi xuất PDF ta ẩn màu viền
     * (giữ nguyên bố cục) và vẽ từng đường kẻ bằng thẻ mỏng 0.667px (= 0.5pt) nằm giữa dải viền cũ.
     * Mỗi cạnh chỉ vẽ 1 lần theo quy ước CSS (phải + dưới, cột đầu thêm trái, dòng đầu thêm trên) → nét đều nhau.
     */
    applyHairlineGrid(container, lineWidthPx = 2 / 3) {
        if (!container) return;
        if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
        const cRect = container.getBoundingClientRect();
        const lines = [];
        const cells = Array.from(container.querySelectorAll('table th, table td'));
        cells.forEach(cell => {
            const cs = getComputedStyle(cell);
            const r = cell.getBoundingClientRect();
            const L = r.left - cRect.left, T = r.top - cRect.top, R = r.right - cRect.left, B = r.bottom - cRect.top;
            const w = side => (cs[`border${side}Style`] !== 'none' ? parseFloat(cs[`border${side}Width`]) || 0 : 0);
            const top = w('Top'), right = w('Right'), bottom = w('Bottom'), left = w('Left');
            const half = lineWidthPx / 2;
            if (right) lines.push([R - right / 2 - half, T, lineWidthPx, B - T]);
            if (left) lines.push([L + left / 2 - half, T, lineWidthPx, B - T]);
            if (bottom) lines.push([L, B - bottom / 2 - half, R - L, lineWidthPx]);
            if (top) lines.push([L, T + top / 2 - half, R - L, lineWidthPx]);
        });
        if (!lines.length) return;
        cells.forEach(cell => cell.style.setProperty('border-color', 'transparent', 'important'));
        const layer = document.createElement('div');
        layer.style.cssText = 'position:absolute; left:0; top:0; width:0; height:0; pointer-events:none;';
        lines.forEach(([x, y, lw, lh]) => {
            const d = document.createElement('div');
            d.style.cssText = `position:absolute; left:${x}px; top:${y}px; width:${lw}px; height:${lh}px; background:#000000;`;
            layer.appendChild(d);
        });
        container.appendChild(layer);
    }

    // Tạo tờ A4 sạch dành riêng cho xuất PDF (đặt trong khung tạm nằm ngoài màn hình)
    createExportSheet() {
        const host = document.createElement('div');
        host.id = 'pdf-export-host';
        host.style.cssText = 'position:fixed; left:-10000px; top:0; width:210mm; background:#ffffff; pointer-events:none;';
        host.innerHTML = window.quoteBuilder.getA4Html();

        const sheet = host.querySelector('.a4-sheet');
        if (sheet) {
            // Lề trên/dưới do PDF (margin của jsPDF) đảm nhận để mọi trang đều có lề đều nhau
            sheet.style.cssText += ';position:static !important; width:210mm !important; min-height:0 !important; height:auto !important;' +
                'max-height:none !important; margin:0 !important; padding:0 16mm !important; box-shadow:none !important;' +
                'border:none !important; transform:none !important; background:#ffffff !important; overflow:visible !important;';
            sheet.classList.remove('shadow-2xl', 'a4-page');
        }

        document.body.appendChild(host);
        return { host, sheet };
    }

    isMobileDevice() {
        return (window.matchMedia && window.matchMedia('(max-width: 767px)').matches) ||
            /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
    }

    // Trạng thái "Đang tạo..." trên các nút Tải PDF (thay cho thông báo nổi)
    setBusy(busy) {
        document.querySelectorAll('button[onclick*="pdfExporter.downloadPdf"]').forEach(btn => {
            if (busy) {
                if (btn.dataset.origHtml === undefined) btn.dataset.origHtml = btn.innerHTML;
                btn.disabled = true;
                btn.style.opacity = '0.75';
                btn.style.cursor = 'wait';
                btn.innerHTML = '<span class="pdf-spinner"></span><span class="pdf-busy-text">Đang tạo...</span>';
            } else if (btn.dataset.origHtml !== undefined) {
                btn.innerHTML = btn.dataset.origHtml;
                delete btn.dataset.origHtml;
                btn.disabled = false;
                btn.style.opacity = '';
                btn.style.cursor = '';
            }
        });
    }

    // Điện thoại: hộp "File PDF đã sẵn sàng" để người dùng tự bấm Tải / Chia sẻ / Mở xem
    showReadyDialog(blob, filename) {
        const old = document.getElementById('pdf-ready-dialog');
        if (old) old.remove();

        const url = URL.createObjectURL(blob);
        let file = null;
        try { file = new File([blob], filename, { type: 'application/pdf' }); } catch (e) { file = null; }
        const canShare = !!(file && navigator.canShare && navigator.share && navigator.canShare({ files: [file] }));

        const overlay = document.createElement('div');
        overlay.id = 'pdf-ready-dialog';
        overlay.className = 'no-print';
        overlay.style.cssText = 'position:fixed; inset:0; z-index:80; background:rgba(2,6,23,0.6); display:flex; align-items:flex-end; justify-content:center; padding:12px;';
        overlay.innerHTML = `
            <div style="background:#fff; border-radius:18px; padding:20px; width:100%; max-width:380px; box-shadow:0 20px 50px rgba(0,0,0,.3); font-family:inherit;">
                <div style="font-weight:800; font-size:15px; color:#0f172a;">File PDF đã sẵn sàng</div>
                <div style="font-size:12px; color:#64748b; margin:4px 0 16px; word-break:break-all;">${filename}</div>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <a id="pdf-ready-download" href="${url}" download="${filename}"
                        style="display:block; text-align:center; padding:12px; border-radius:12px; background:#059669; color:#fff; font-weight:700; font-size:14px; text-decoration:none;">Tải về máy</a>
                    ${canShare ? `<button type="button" id="pdf-ready-share"
                        style="padding:12px; border-radius:12px; background:#2563eb; color:#fff; font-weight:700; font-size:14px; border:none;">Chia sẻ / Lưu vào Tệp (Zalo, Mail...)</button>` : ''}
                    <a id="pdf-ready-open" href="${url}" target="_blank" rel="noopener"
                        style="display:block; text-align:center; padding:12px; border-radius:12px; background:#f1f5f9; color:#0f172a; font-weight:700; font-size:14px; text-decoration:none;">Mở xem PDF</a>
                    <button type="button" id="pdf-ready-close"
                        style="padding:10px; border-radius:12px; background:transparent; color:#64748b; font-weight:600; font-size:13px; border:none;">Đóng</button>
                </div>
            </div>`;

        const close = () => {
            overlay.remove();
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        };
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        overlay.querySelector('#pdf-ready-close').addEventListener('click', close);
        const shareBtn = overlay.querySelector('#pdf-ready-share');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                navigator.share({ files: [file], title: filename }).catch(() => {});
            });
        }
        document.body.appendChild(overlay);
    }

    async downloadPdf(quoteNumber) {
        if (this.isExporting) return;

        // Đồng bộ dữ liệu mới nhất từ form
        window.quoteBuilder.syncFormToCurrentQuote();
        window.quoteBuilder.recalculate();
        window.quoteBuilder.renderPreview();

        if (!window.html2pdf) {
            window.salesApp.showNotification('Không tải được thư viện xuất PDF. Vui lòng tải lại trang (Ctrl + F5).', 'error');
            return;
        }

        const filename = await this.askFilename(this.buildFilename(quoteNumber));
        if (!filename) return; // Người dùng bấm Hủy
        const mobile = this.isMobileDevice();
        this.isExporting = true;
        this.setBusy(true);

        const { host, sheet } = this.createExportSheet();

        try {
            // Chờ logo/ảnh decode xong để không bị thiếu hình (tối đa 3 giây, tránh treo)
            const imgs = Array.from(host.querySelectorAll('img'));
            const imgsReady = Promise.all(imgs.map(img => (img.complete ? Promise.resolve() : new Promise(res => {
                img.addEventListener('load', res, { once: true });
                img.addEventListener('error', res, { once: true });
            }))));
            await Promise.race([imgsReady, new Promise(res => setTimeout(res, 3000))]);
            // Chờ trình duyệt dựng layout (requestAnimationFrame có thể bị dừng ở tab nền / vài trình duyệt điện thoại)
            await Promise.race([
                new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res))),
                new Promise(res => setTimeout(res, 150))
            ]);

            // Độ nét: chụp ở độ phân giải cao để nét kẻ 0.5pt sắc và đều (giới hạn theo bộ nhớ, điện thoại thấp hơn)
            const cssW = sheet.offsetWidth || 794;
            const cssH = Math.max(sheet.scrollHeight || 0, 1123);
            const maxPixels = mobile ? 16000000 : 48000000;
            const renderScale = Math.max(2, Math.min(4, Math.sqrt(maxPixels / (cssW * cssH))));

            const opt = {
                margin: [10, 0, 12, 0], // mm: trên, phải, dưới, trái
                filename: filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: renderScale,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff',
                    scrollX: 0,
                    scrollY: 0
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                // Tự phân trang: không cắt ngang dòng bảng, gạch đầu dòng, khối chữ ký
                pagebreak: { mode: ['css'], avoid: ['tr', 'li', '.signature-section', '.avoid-break'] }
            };

            const worker = window.html2pdf().set(opt).from(sheet);
            // Sau khi html2pdf chèn khoảng đệm ngắt trang (thẻ div ngay trước dòng bị đẩy sang trang mới),
            // đánh dấu dòng đó để vẽ thêm cạnh trên → bảng ở trang mới luôn có viền trên
            await worker.toContainer();
            const container = worker.prop && worker.prop.container;
            if (container) {
                container.querySelectorAll('tr').forEach(tr => {
                    const prev = tr.previousElementSibling;
                    if (prev && prev.tagName === 'DIV') tr.classList.add('pdf-page-start');
                });
                this.applyHairlineGrid(container);
            }
            if (mobile) {
                // Điện thoại chặn tự tải sau khi xử lý lâu -> tạo file trước, người dùng bấm tải sau
                const blob = await worker.outputPdf('blob');
                this.showReadyDialog(blob, filename);
            } else {
                await worker.save();
            }
        } catch (err) {
            console.error('Lỗi khi xuất PDF:', err);
            window.salesApp.showNotification('Xuất PDF thất bại: ' + (err && err.message ? err.message : err), 'error');
        } finally {
            if (host.parentNode) host.parentNode.removeChild(host);
            this.isExporting = false;
            this.setBusy(false);
        }
    }
}

window.pdfExporter = new PdfExporter();
