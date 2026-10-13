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

        const filename = this.buildFilename(quoteNumber);
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

            const opt = {
                margin: [10, 0, 12, 0], // mm: trên, phải, dưới, trái
                filename: filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
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
