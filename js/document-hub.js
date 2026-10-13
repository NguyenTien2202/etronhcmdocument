/**
 * Document Hub Component & Logic
 * Quản lý kho tài liệu sales, tìm kiếm, lọc danh mục, upload tệp hoặc lưu link Cloud
 */

class DocumentHub {
    constructor() {
        this.selectedCategory = 'all';
        this.searchQuery = '';
    }

    init() {
        this.renderCategoryPills();
        this.renderDocumentsList();
    }

    getCategories() {
        return [
            { id: 'all', name: 'Tất cả tài liệu', icon: 'layers' },
            { id: 'Báo giá & Mẫu biểu', name: 'Báo giá & Mẫu biểu', icon: 'file-spreadsheet' },
            { id: 'Bảng giá chính thức', name: 'Bảng giá PDF chính thức', icon: 'file-text' },
            { id: 'Chính sách bán hàng', name: 'Chính sách bán hàng', icon: 'shield-check' },
            { id: 'Hỗ trợ & Chăm sóc khách hàng', name: 'CSKH & Cam kết SLA', icon: 'life-buoy' },
            { id: 'Tài liệu đào tạo', name: 'Tài liệu đào tạo & Tổng hợp', icon: 'book-open' }
        ];
    }

    renderCategoryPills() {
        const container = document.getElementById('doc-categories-container');
        if (!container) return;

        const categories = this.getCategories();
        container.innerHTML = categories.map(cat => `
            <button onclick="window.documentHub.setCategory('${cat.id}')"
                class="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    this.selectedCategory === cat.id 
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }">
                <i data-lucide="${cat.icon}" class="w-3.5 h-3.5"></i>
                <span>${cat.name}</span>
            </button>
        `).join('');

        lucide.createIcons();
    }

    setCategory(catId) {
        this.selectedCategory = catId;
        this.renderCategoryPills();
        this.renderDocumentsList();
    }

    setSearchQuery(query) {
        this.searchQuery = query.toLowerCase().trim();
        this.renderDocumentsList();
    }

    getFilteredDocuments() {
        const docs = window.salesStore.getDocuments();
        return docs.filter(doc => {
            const matchesCat = this.selectedCategory === 'all' || doc.category === this.selectedCategory;
            const matchesSearch = !this.searchQuery || 
                doc.title.toLowerCase().includes(this.searchQuery) ||
                (doc.description && doc.description.toLowerCase().includes(this.searchQuery)) ||
                (doc.tags && doc.tags.some(t => t.toLowerCase().includes(this.searchQuery)));
            return matchesCat && matchesSearch;
        });
    }

    renderDocumentsList() {
        const container = document.getElementById('documents-grid');
        if (!container) return;

        const docs = this.getFilteredDocuments();

        if (docs.length === 0) {
            container.innerHTML = `
                <div class="col-span-full py-16 text-center text-slate-400">
                    <i data-lucide="folder-search" class="w-12 h-12 mx-auto text-slate-300 mb-3"></i>
                    <p class="text-base font-medium text-slate-600">Không tìm thấy tài liệu phù hợp</p>
                    <p class="text-xs text-slate-400 mt-1">Hãy thử tìm với từ khóa khác hoặc bấm nút "Thêm tài liệu mới".</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        container.innerHTML = docs.map(doc => {
            const iconData = this.getFileIcon(doc.fileType, doc.type);
            return `
                <div class="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg hover:border-indigo-200 transition-all flex flex-col justify-between group">
                    <div>
                        <!-- Header Card -->
                        <div class="flex items-start justify-between gap-3 mb-3">
                            <div class="w-11 h-11 rounded-lg ${iconData.bg} ${iconData.color} flex items-center justify-center shrink-0">
                                <i data-lucide="${iconData.icon}" class="w-6 h-6"></i>
                            </div>
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                                ${this.escapeHtml(doc.category)}
                            </span>
                        </div>

                        <!-- Tiêu đề & Mô tả -->
                        <h3 class="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug" title="${this.escapeHtml(doc.title)}">
                            ${this.escapeHtml(doc.title)}
                        </h3>
                        <p class="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                            ${this.escapeHtml(doc.description || 'Chưa có mô tả chi tiết')}
                        </p>

                        <!-- Tags -->
                        ${doc.tags && doc.tags.length > 0 ? `
                            <div class="flex flex-wrap gap-1 mt-3">
                                ${doc.tags.map(tag => `
                                    <span class="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium">#${this.escapeHtml(tag)}</span>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>

                    <!-- Footer & Hành động -->
                    <div class="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                        <span class="flex items-center gap-1">
                            <i data-lucide="clock" class="w-3.5 h-3.5"></i>
                            ${doc.updatedAt || 'Hôm nay'}
                        </span>

                        <div class="flex items-center gap-1.5">
                            <button onclick="window.documentHub.openDocument('${doc.id}')" 
                                class="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 font-semibold text-xs transition-colors flex items-center gap-1"
                                title="Mở / Tải tài liệu">
                                <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                                <span>Mở</span>
                            </button>

                            <button onclick="window.documentHub.copyDocLink('${doc.id}')"
                                class="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                                title="Sao chép liên kết">
                                <i data-lucide="copy" class="w-4 h-4"></i>
                            </button>

                            <button onclick="window.documentHub.deleteDocument('${doc.id}')"
                                class="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Xóa tài liệu">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        lucide.createIcons();
    }

    getFileIcon(fileType, type) {
        if (type === 'link') {
            return { icon: 'link-2', bg: 'bg-sky-50', color: 'text-sky-600' };
        }
        switch ((fileType || '').toLowerCase()) {
            case 'pdf':
                return { icon: 'file-text', bg: 'bg-rose-50', color: 'text-rose-600' };
            case 'doc':
            case 'docx':
                return { icon: 'file-text', bg: 'bg-blue-50', color: 'text-blue-600' };
            case 'xls':
            case 'xlsx':
                return { icon: 'table', bg: 'bg-emerald-50', color: 'text-emerald-600' };
            case 'ppt':
            case 'pptx':
                return { icon: 'presentation', bg: 'bg-amber-50', color: 'text-amber-600' };
            case 'jpg':
            case 'png':
            case 'image':
                return { icon: 'image', bg: 'bg-purple-50', color: 'text-purple-600' };
            default:
                return { icon: 'file', bg: 'bg-slate-100', color: 'text-slate-600' };
        }
    }

    openDocument(id) {
        const docs = window.salesStore.getDocuments();
        const doc = docs.find(d => d.id === id);
        if (!doc) return;

        if (doc.fileUrl) {
            window.open(doc.fileUrl, '_blank');
        } else {
            window.salesApp.showNotification('Không tìm thấy đường dẫn tài liệu', 'error');
        }
    }

    copyDocLink(id) {
        const docs = window.salesStore.getDocuments();
        const doc = docs.find(d => d.id === id);
        if (!doc || !doc.fileUrl) return;

        navigator.clipboard.writeText(doc.fileUrl).then(() => {
            window.salesApp.showNotification('Đã sao chép liên kết tài liệu!', 'success');
        }).catch(() => {
            prompt('Liên kết tài liệu:', doc.fileUrl);
        });
    }

    deleteDocument(id) {
        if (confirm('Bạn có chắc chắn muốn xóa tài liệu này?')) {
            window.salesStore.deleteDocument(id);
            this.renderDocumentsList();
            window.salesApp.showNotification('Đã xóa tài liệu', 'info');
        }
    }

    saveNewDocument(formData) {
        window.salesStore.saveDocument(formData);
        this.renderDocumentsList();
        window.salesApp.showNotification('Đã thêm tài liệu mới vào kho!', 'success');
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

window.documentHub = new DocumentHub();
