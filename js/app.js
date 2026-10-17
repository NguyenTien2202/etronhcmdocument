/**
 * Main Application Orchestrator
 * Điều hướng Tab, Quản lý lịch sử báo giá, Cài đặt công ty, và Thông báo
 */

class SalesApp {
    constructor() {
        this.currentTab = 'quote-builder';
    }

    init() {
        // Kích hoạt đồng bộ đám mây Real-time Firebase Firestore trước tiên
        window.salesStore.setupCloudSync();

        this.setupNavigation();
        this.setupEventListeners();
        this.setupModalScrollLock();
        this.renderStats();
        this.renderCompanySettingsForm();
        this.renderQuotesHistory();
        
        // Khởi tạo các module con
        window.documentHub.init();
        window.productCatalog.init();
        if (window.callbotHub) window.callbotHub.init();
        window.quoteBuilder.resetForm();

        // Đồng bộ tức thì khi người dùng mở nhiều tab cùng lúc
        window.addEventListener('storage', () => {
            if (window.documentHub) {
                window.documentHub.renderStats();
                window.documentHub.renderQuickAccess();
                window.documentHub.renderCategoryPills();
                window.documentHub.renderDocumentsList();
            }
            if (window.callbotHub) {
                window.callbotHub.render();
            }
            if (window.productCatalog) {
                window.productCatalog.renderCatalogTable();
            }
        });

        lucide.createIcons();
    }

    setupNavigation() {
        const navButtons = document.querySelectorAll('[data-tab-target]');
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const targetTab = btn.getAttribute('data-tab-target');
                this.switchTab(targetTab);
            });
        });
    }

    switchTab(tabId) {
        this.currentTab = tabId;

        // Cập nhật button nav: di chuyển nền trắng active sang tab được bấm
        document.querySelectorAll('[data-tab-target]').forEach(btn => {
            const isMatch = btn.getAttribute('data-tab-target') === tabId;
            btn.classList.toggle('nav-active', isMatch);
            if (isMatch) {
                btn.classList.add('bg-white', 'shadow-sm', 'text-indigo-600', 'font-bold');
                btn.classList.remove('text-slate-600', 'font-semibold', 'font-medium', 'bg-indigo-50');
            } else {
                btn.classList.remove('bg-white', 'shadow-sm', 'text-indigo-600', 'font-bold', 'bg-indigo-50');
                btn.classList.add('text-slate-600');
                if (btn.closest('nav')) {
                    btn.classList.add('font-semibold');
                } else {
                    btn.classList.add('font-medium');
                }
            }
        });

        // Ẩn/Hiện nội dung view
        document.querySelectorAll('.tab-view').forEach(view => {
            view.classList.toggle('hidden', view.id !== `view-${tabId}`);
        });

        // Trigger updates per view
        if (tabId === 'quote-builder') {
            window.quoteBuilder.renderPreview();
        } else if (tabId === 'documents') {
            window.documentHub.renderDocumentsList();
        } else if (tabId === 'callbot-hub') {
            if (window.callbotHub) window.callbotHub.render();
        } else if (tabId === 'catalog') {
            window.productCatalog.renderCatalogTable();
        } else if (tabId === 'history') {
            this.renderQuotesHistory();
        } else if (tabId === 'settings') {
            this.renderCompanySettingsForm();
        }

        lucide.createIcons();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    renderStats() {
        const quotes = window.salesStore.getQuotes();
        const docs = window.salesStore.getDocuments();
        const prods = window.salesStore.getProducts();

        const totalQuoteVal = quotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0);

        const statQuotesCount = document.getElementById('stat-quotes-count');
        const statQuotesVal = document.getElementById('stat-quotes-val');
        const statDocsCount = document.getElementById('stat-docs-count');
        const statProdsCount = document.getElementById('stat-prods-count');

        if (statQuotesCount) statQuotesCount.textContent = quotes.length;
        if (statQuotesVal) statQuotesVal.textContent = window.formatCurrency(totalQuoteVal);
        if (statDocsCount) statDocsCount.textContent = docs.length;
        if (statProdsCount) statProdsCount.textContent = prods.length;
    }

    renderQuotesHistory() {
        const container = document.getElementById('history-table-body');
        if (!container) return;

        const quotes = window.salesStore.getQuotes();
        this.renderStats();

        if (quotes.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="7" class="py-12 text-center text-slate-400">
                        <i data-lucide="file-spreadsheet" class="w-10 h-10 mx-auto text-slate-300 mb-2"></i>
                        <p class="font-medium text-slate-600">Chưa có bảng báo giá nào được lưu.</p>
                        <p class="text-xs text-slate-400 mt-1">Hãy chuyển sang tab "Tạo Báo Giá" để tạo bảng đầu tiên.</p>
                    </td>
                </tr>
            `;
            lucide.createIcons();
            return;
        }

        container.innerHTML = quotes.map(q => {
            const statusBadge = this.getStatusBadge(q.status);
            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50/70 transition-colors">
                    <td class="py-3 px-4 text-xs font-mono font-bold text-indigo-700">
                        ${this.escapeHtml(q.quoteNumber || '---')}
                    </td>
                    <td class="py-3 px-4">
                        <div class="font-bold text-slate-900 text-sm">${this.escapeHtml(q.customer?.company || 'Quý khách hàng')}</div>
                        <div class="text-xs text-slate-500">${this.escapeHtml(q.customer?.contactPerson || '')} ${q.customer?.phone ? `• ${q.customer.phone}` : ''}</div>
                    </td>
                    <td class="py-3 px-4 text-xs text-slate-600">
                        <div>Ngày: <b>${this.formatDate(q.date)}</b></div>
                        <div class="text-slate-400 text-[11px]">Hạn: ${this.formatDate(q.validUntil)}</div>
                    </td>
                    <td class="py-3 px-4 text-right font-extrabold text-slate-900 text-sm">
                        ${window.formatCurrency(q.grandTotal)}
                    </td>
                    <td class="py-3 px-4 text-center">
                        ${statusBadge}
                    </td>
                    <td class="py-3 px-4 text-xs text-slate-600">
                        ${this.escapeHtml(q.salesRep?.name || '---')}
                    </td>
                    <td class="py-3 px-4 text-right">
                        <div class="flex items-center justify-end gap-1.5">
                            <button onclick="window.salesApp.editQuote('${q.id}')"
                                class="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Mở & Chỉnh sửa">
                                <i data-lucide="edit-3" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.salesApp.duplicateQuote('${q.id}')"
                                class="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded" title="Nhân bản làm báo giá mới">
                                <i data-lucide="copy" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.salesApp.quickExportPdf('${q.id}')"
                                class="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="Xuất PDF nhanh">
                                <i data-lucide="file-down" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.salesApp.deleteQuote('${q.id}')"
                                class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded" title="Xóa">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        lucide.createIcons();
    }

    getStatusBadge(status) {
        switch (status) {
            case 'Accepted':
                return '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Khách duyệt</span>';
            case 'Sent':
                return '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">Đã gửi</span>';
            case 'Rejected':
                return '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">Từ chối</span>';
            default:
                return '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Bản nháp</span>';
        }
    }

    editQuote(id) {
        const quote = window.salesStore.getQuoteById(id);
        if (!quote) return;
        window.quoteBuilder.loadQuote(quote);
        this.switchTab('quote-builder');
        this.showNotification(`Đang mở báo giá ${quote.quoteNumber}`, 'info');
    }

    duplicateQuote(id) {
        const quote = window.salesStore.getQuoteById(id);
        if (!quote) return;
        const copy = JSON.parse(JSON.stringify(quote));
        copy.id = null;
        const today = new Date();
        copy.date = today.toISOString().split('T')[0];
        copy.quoteNumber = 'BG-' + today.getFullYear() + 
            String(today.getMonth() + 1).padStart(2, '0') + 
            String(today.getDate()).padStart(2, '0') + '-' + 
            Math.floor(100 + Math.random() * 900);
        copy.status = 'Draft';

        window.quoteBuilder.loadQuote(copy);
        this.switchTab('quote-builder');
        this.showNotification(`Đã nhân bản thành báo giá mới: ${copy.quoteNumber}`, 'success');
    }

    quickExportPdf(id) {
        const quote = window.salesStore.getQuoteById(id);
        if (!quote) return;
        window.quoteBuilder.loadQuote(quote);
        this.switchTab('quote-builder');
        setTimeout(() => {
            window.pdfExporter.downloadPdf(quote.quoteNumber);
        }, 400);
    }

    deleteQuote(id) {
        if (confirm('Bạn có chắc chắn muốn xóa bản báo giá này?')) {
            window.salesStore.deleteQuote(id);
            this.renderQuotesHistory();
            this.showNotification('Đã xóa báo giá', 'info');
        }
    }

    // Company Settings
    renderCompanySettingsForm() {
        const company = window.salesStore.getCompany();
        const form = document.getElementById('company-settings-form');
        if (!form) return;

        document.getElementById('set-comp-name').value = company.name || '';
        document.getElementById('set-comp-tradeName').value = company.tradeName || '';
        document.getElementById('set-comp-taxCode').value = company.taxCode || '';
        document.getElementById('set-comp-phone').value = company.phone || '';
        document.getElementById('set-comp-email').value = company.email || '';
        document.getElementById('set-comp-website').value = company.website || '';
        document.getElementById('set-comp-address').value = company.address || '';
        document.getElementById('set-comp-bankName').value = company.bankName || '';
        document.getElementById('set-comp-bankAccount').value = company.bankAccount || '';
        document.getElementById('set-comp-bankAccountName').value = company.bankAccountName || '';
        document.getElementById('set-comp-directorName').value = company.directorName || '';
        document.getElementById('set-comp-directorTitle').value = company.directorTitle || '';
        document.getElementById('set-comp-terms').value = (company.defaultTerms || []).join('\n');

        const logoPreview = document.getElementById('set-logo-preview');
        if (logoPreview && company.logoUrl) {
            logoPreview.src = company.logoUrl;
            logoPreview.classList.remove('hidden');
        }
    }

    saveCompanySettings(e) {
        if (e) e.preventDefault();
        const company = window.salesStore.getCompany();

        company.name = document.getElementById('set-comp-name').value.trim();
        company.tradeName = document.getElementById('set-comp-tradeName').value.trim();
        company.taxCode = document.getElementById('set-comp-taxCode').value.trim();
        company.phone = document.getElementById('set-comp-phone').value.trim();
        company.email = document.getElementById('set-comp-email').value.trim();
        company.website = document.getElementById('set-comp-website').value.trim();
        company.address = document.getElementById('set-comp-address').value.trim();
        company.bankName = document.getElementById('set-comp-bankName').value.trim();
        company.bankAccount = document.getElementById('set-comp-bankAccount').value.trim();
        company.bankAccountName = document.getElementById('set-comp-bankAccountName').value.trim();
        company.directorName = document.getElementById('set-comp-directorName').value.trim();
        company.directorTitle = document.getElementById('set-comp-directorTitle').value.trim();
        company.defaultTerms = document.getElementById('set-comp-terms').value.split('\n').filter(t => t.trim().length > 0);

        window.salesStore.saveCompany(company);
        this.showNotification('Đã cập nhật thông tin doanh nghiệp thành công!', 'success');
        window.quoteBuilder.renderPreview();
    }

    handleLogoUpload(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result;
            const company = window.salesStore.getCompany();
            company.logoUrl = base64;
            window.salesStore.saveCompany(company);

            const preview = document.getElementById('set-logo-preview');
            if (preview) {
                preview.src = base64;
                preview.classList.remove('hidden');
            }
            this.showNotification('Đã tải lên logo công ty thành công!', 'success');
            window.quoteBuilder.renderPreview();
        };
        reader.readAsDataURL(file);
    }

    setupEventListeners() {
        // Live update inputs from quote builder form
        const formFields = [
            'qb-date', 'qb-validUntil',
            'qb-custCompany', 'qb-custContact'
        ];

        formFields.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => {
                    window.quoteBuilder.syncFormToCurrentQuote();
                    window.quoteBuilder.renderPreview();
                });
            }
        });

        // Tự động tính hạn hiệu lực là ngày cuối tháng khi đổi ngày lập
        const dateInput = document.getElementById('qb-date');
        if (dateInput) {
            dateInput.addEventListener('change', () => {
                if (dateInput.value) {
                    const endOfMonth = window.quoteBuilder.getEndOfMonth(dateInput.value);
                    const validEl = document.getElementById('qb-validUntil');
                    if (validEl) {
                        validEl.value = endOfMonth;
                        window.quoteBuilder.currentQuote.validUntil = endOfMonth;
                        window.quoteBuilder.updateValidityTerm(endOfMonth);
                    }
                    window.quoteBuilder.syncFormToCurrentQuote();
                    window.quoteBuilder.renderPreview();
                }
            });
        }

        const validUntilInput = document.getElementById('qb-validUntil');
        if (validUntilInput) {
            validUntilInput.addEventListener('change', () => {
                if (validUntilInput.value) {
                    window.quoteBuilder.currentQuote.validUntil = validUntilInput.value;
                    window.quoteBuilder.updateValidityTerm(validUntilInput.value);
                    window.quoteBuilder.syncFormToCurrentQuote();
                    window.quoteBuilder.renderPreview();
                }
            });
        }

        // Discount & VAT live changes
        const overallDiscInput = document.getElementById('qb-overallDiscount');
        if (overallDiscInput) {
            overallDiscInput.addEventListener('input', () => {
                window.quoteBuilder.syncFormToCurrentQuote();
                window.quoteBuilder.recalculate();
                window.quoteBuilder.renderPreview();
            });
        }

        const vatSelect = document.getElementById('qb-vatRate');
        if (vatSelect) {
            vatSelect.addEventListener('change', () => {
                window.quoteBuilder.syncFormToCurrentQuote();
                window.quoteBuilder.recalculate();
                window.quoteBuilder.renderPreview();
            });
        }

        const termsInput = document.getElementById('qb-terms');
        if (termsInput) {
            termsInput.addEventListener('input', () => {
                window.quoteBuilder.syncFormToCurrentQuote();
                window.quoteBuilder.renderPreview();
            });
        }

        const packageDetailsInput = document.getElementById('qb-packageDetails');
        if (packageDetailsInput) {
            packageDetailsInput.addEventListener('input', () => {
                window.quoteBuilder.syncFormToCurrentQuote();
                window.quoteBuilder.renderPreview();
            });
        }
    }

    setupModalScrollLock() {
        this._lockedScrollY = 0;
        this._isBodyLocked = false;
        this._touchStartY = 0;
        this._touchStartX = 0;

        const modalSelector = '#a4-preview-drawer, #product-picker-modal, #document-add-modal, #media-preview-modal, #category-manager-modal, #category-icon-picker-modal, #modal-callbot-template, #modal-callbot-media, #modal-callbot-group, #modal-callbot-industry-manager';

        const updateLock = () => {
            const modals = document.querySelectorAll(modalSelector);
            const anyOpen = Array.from(modals).some(m => !m.classList.contains('hidden'));

            if (anyOpen && !this._isBodyLocked) {
                this._lockedScrollY = window.scrollY || window.pageYOffset || 0;
                this._isBodyLocked = true;
                document.documentElement.classList.add('modal-open-lock');
                document.body.classList.add('modal-open-lock');
                document.body.style.top = `-${this._lockedScrollY}px`;
            } else if (!anyOpen && this._isBodyLocked) {
                this._isBodyLocked = false;
                document.documentElement.classList.remove('modal-open-lock');
                document.body.classList.remove('modal-open-lock');
                document.body.style.top = '';
                window.scrollTo(0, this._lockedScrollY);
            }
        };

        const observer = new MutationObserver(updateLock);
        document.querySelectorAll(modalSelector).forEach(modal => {
            observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
        });

        document.addEventListener('touchstart', (e) => {
            if (!this._isBodyLocked || !e.touches || !e.touches.length) return;
            this._touchStartY = e.touches[0].clientY;
            this._touchStartX = e.touches[0].clientX;
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!this._isBodyLocked || !e.touches || !e.touches.length) return;
            const currentY = e.touches[0].clientY;
            const currentX = e.touches[0].clientX;
            const deltaY = currentY - this._touchStartY;
            const deltaX = currentX - this._touchStartX;

            let el = e.target;
            while (el && el !== document.body && el !== document.documentElement) {
                if (el.tagName === 'INPUT' && el.type === 'range') return;
                const style = window.getComputedStyle(el);
                const overflowY = style.overflowY;
                const overflowX = style.overflowX;
                const canScrollY = (overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1;
                const canScrollX = (overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 1;

                if (canScrollX && Math.abs(deltaX) > Math.abs(deltaY)) {
                    return;
                }

                if (canScrollY) {
                    const isAtTop = el.scrollTop <= 0 && deltaY > 0;
                    const isAtBottom = (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) && deltaY < 0;
                    if (isAtTop || isAtBottom) {
                        if (e.cancelable) e.preventDefault();
                    }
                    return;
                }
                el = el.parentElement;
            }

            if (e.cancelable) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    showNotification(message, type = 'info') {
        // Không hiện thông báo nổi cho các thao tác thường ngày, chỉ giữ thông báo lỗi
        if (type !== 'error') return;

        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `p-4 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-3 transition-all duration-300 transform translate-y-2 opacity-0 ${
            type === 'success' ? 'bg-emerald-800 text-white border-emerald-700' :
            type === 'error' ? 'bg-rose-800 text-white border-rose-700' :
            'bg-indigo-900 text-white border-indigo-800'
        }`;

        let iconName = 'info';
        if (type === 'success') iconName = 'check-circle';
        if (type === 'error') iconName = 'alert-triangle';

        toast.innerHTML = `
            <i data-lucide="${iconName}" class="w-5 h-5 shrink-0"></i>
            <span class="flex-1">${this.escapeHtml(message)}</span>
        `;

        container.appendChild(toast);
        lucide.createIcons();

        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-y-2', 'opacity-0');
        }, 10);

        // Animate out
        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }

    formatDate(dateStr) {
        if (!dateStr) return '---';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    }

    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

// Global App Instance
window.salesApp = new SalesApp();
document.addEventListener('DOMContentLoaded', () => {
    window.salesApp.init();
});
