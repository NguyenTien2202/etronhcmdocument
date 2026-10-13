/**
 * Document Hub Component & Logic - Modern Workspace Architecture
 * Quản lý kho tài nguyên & tài liệu sales: Bảng giá, Template, Tài liệu, Hình ảnh Salekit, Video Demo, Link Cloud
 * Hỗ trợ lưu trữ tệp qua IndexedDB, xem trước ảnh lightbox, phát video trực tiếp, chuyển đổi Table/Grid view
 */

// ==========================================
// 1. INDEXEDDB STORAGE FOR FILES & MEDIA
// ==========================================
class DocumentFileStore {
    constructor() {
        this.dbName = 'EtronSalesFilesDB';
        this.storeName = 'files';
        this.db = null;
        this.initPromise = this.init();
    }

    init() {
        return new Promise((resolve) => {
            if (!window.indexedDB) {
                console.warn('IndexedDB không khả dụng trên trình duyệt này');
                resolve(null);
                return;
            }
            try {
                const request = indexedDB.open(this.dbName, 1);
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(this.storeName)) {
                        db.createObjectStore(this.storeName, { keyPath: 'id' });
                    }
                };
                request.onsuccess = (e) => {
                    this.db = e.target.result;
                    resolve(this.db);
                };
                request.onerror = (e) => {
                    console.error('Lỗi khởi tạo IndexedDB:', e);
                    resolve(null);
                };
            } catch (err) {
                console.error('Lỗi mở IndexedDB:', err);
                resolve(null);
            }
        });
    }

    async saveFile(id, file) {
        await this.initPromise;
        if (!this.db) return null;
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction([this.storeName], 'readwrite');
                const store = tx.objectStore(this.storeName);
                const req = store.put({
                    id: id,
                    blob: file,
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    updatedAt: Date.now()
                });
                req.onsuccess = () => resolve(true);
                req.onerror = () => reject(req.error);
            } catch (err) {
                reject(err);
            }
        });
    }

    async getFile(id) {
        await this.initPromise;
        if (!this.db) return null;
        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction([this.storeName], 'readonly');
                const store = tx.objectStore(this.storeName);
                const req = store.get(id);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(null);
            } catch (err) {
                resolve(null);
            }
        });
    }

    async deleteFile(id) {
        await this.initPromise;
        if (!this.db) return;
        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction([this.storeName], 'readwrite');
                const store = tx.objectStore(this.storeName);
                const req = store.delete(id);
                req.onsuccess = () => resolve(true);
                req.onerror = () => resolve(false);
            } catch (err) {
                resolve(false);
            }
        });
    }
}


// ==========================================
// 2. DOCUMENT HUB MAIN COMPONENT
// ==========================================
class DocumentHub {
    constructor() {
        this.fileStore = new DocumentFileStore();
        this.selectedCategory = 'all';
        this.selectedType = 'all'; // 'all', 'doc', 'sheet', 'image', 'video', 'link'
        this.searchQuery = '';
        this.viewMode = localStorage.getItem('etron_doc_view_mode') || 'table'; // 'table' hoặc 'grid'
        this.selectedUploadFile = null;
        this.activeModalTab = 'upload'; // 'upload' hoặc 'link'
    }

    init() {
        this.renderStats();
        this.renderQuickAccess();
        this.renderTypePills();
        this.renderCategoryPills();
        this.renderDocumentsList();
        this.setupModalEventListeners();
    }

    getCategories() {
        return [
            { id: 'all', name: 'Tất cả danh mục', icon: 'layers' },
            { id: 'Bảng giá chính thức', name: 'Bảng giá chính thức', icon: 'file-text' },
            { id: 'Báo giá & Mẫu biểu', name: 'Báo giá & Mẫu biểu', icon: 'file-spreadsheet' },
            { id: 'Salekit & Giới thiệu', name: 'Salekit & Giới thiệu', icon: 'sparkles' },
            { id: 'Chính sách bán hàng', name: 'Chính sách & Hoa hồng', icon: 'shield-check' },
            { id: 'Hỗ trợ & Chăm sóc khách hàng', name: 'CSKH & Cam kết SLA', icon: 'life-buoy' },
            { id: 'Tài liệu đào tạo', name: 'Tài liệu đào tạo', icon: 'book-open' }
        ];
    }

    getResourceTypes() {
        return [
            { id: 'all', name: 'Tất cả định dạng', icon: 'layout-grid' },
            { id: 'doc', name: 'Tài liệu & PDF', icon: 'file-text', countBadge: 'PDF, Word' },
            { id: 'sheet', name: 'Bảng tính', icon: 'table', countBadge: 'Sheets' },
            { id: 'image', name: 'Hình ảnh & Salekit', icon: 'image', countBadge: 'Ảnh' },
            { id: 'video', name: 'Video Demo', icon: 'video', countBadge: 'Video' },
            { id: 'link', name: 'Liên kết Cloud', icon: 'link-2', countBadge: 'Drive' }
        ];
    }

    renderStats() {
        const statsEl = document.getElementById('doc-hub-stats');
        if (!statsEl) return;

        const docs = window.salesStore.getDocuments();
        const docsCount = docs.filter(d => ['pdf', 'doc', 'docx', 'gdoc'].includes(d.fileType) || d.type === 'file').length;
        const sheetsCount = docs.filter(d => ['xlsx', 'xls', 'gsheet'].includes(d.fileType)).length;
        const mediaCount = docs.filter(d => d.type === 'image' || d.type === 'video' || ['png', 'jpg', 'mp4', 'youtube'].includes(d.fileType)).length;
        const cloudCount = docs.filter(d => d.type === 'link').length;

        statsEl.innerHTML = `
            <div class="flex flex-wrap items-center gap-2 text-xs">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                    <i data-lucide="folder-check" class="w-3.5 h-3.5"></i>
                    Tổng cộng: <b>${docs.length}</b> tài nguyên
                </span>
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                    <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                    ${docsCount} Văn bản
                </span>
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                    ${sheetsCount} Bảng tính
                </span>
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                    <span class="w-2 h-2 rounded-full bg-purple-500"></span>
                    ${mediaCount} Ảnh & Video
                </span>
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                    <span class="w-2 h-2 rounded-full bg-sky-500"></span>
                    ${cloudCount} Liên kết Cloud
                </span>
            </div>
        `;
        lucide.createIcons();
    }

    renderQuickAccess() {
        const container = document.getElementById('doc-quick-access-cards');
        if (!container) return;

        const allDocs = window.salesStore.getDocuments();
        let pinnedDocs = allDocs.filter(d => d.pinned === true);

        // Nếu chưa có tài liệu nào ghim, lấy 4 tài liệu đầu tiên làm mặc định
        if (pinnedDocs.length === 0) {
            pinnedDocs = allDocs.slice(0, 4);
        }

        container.innerHTML = pinnedDocs.map(doc => {
            const badge = this.getFileBadge(doc.fileType, doc.type);
            const isImage = doc.type === 'image' || ['png', 'jpg', 'jpeg', 'webp'].includes(doc.fileType);
            const isVideo = doc.type === 'video' || doc.fileType === 'youtube';

            return `
                <div class="bg-white rounded-xl border-2 ${badge.border} p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden">
                    <div class="absolute top-0 right-0 w-20 h-20 ${badge.subtleBg} rounded-bl-full pointer-events-none transition-transform group-hover:scale-110"></div>
                    
                    <div>
                        <!-- Header thẻ Quick Access -->
                        <div class="flex items-center justify-between gap-2 mb-3">
                            <div class="w-10 h-10 rounded-xl ${badge.bg} ${badge.color} flex items-center justify-center font-bold text-xs shadow-inner shrink-0">
                                ${badge.label}
                            </div>
                            <div class="flex items-center gap-1">
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${badge.bg} ${badge.color}">
                                    ${this.escapeHtml(doc.category)}
                                </span>
                                <button onclick="window.documentHub.togglePin('${doc.id}')" class="text-amber-500 hover:text-amber-600 p-0.5 transition-colors" title="Bỏ ghim khỏi mục Truy cập nhanh">
                                    <i data-lucide="star" class="w-4 h-4 fill-amber-400 text-amber-500"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Tiêu đề & Mô tả -->
                        <h4 class="font-bold text-slate-800 text-xs sm:text-sm group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug cursor-pointer"
                            onclick="window.documentHub.openDocument('${doc.id}')" title="${this.escapeHtml(doc.title)}">
                            ${this.escapeHtml(doc.title)}
                        </h4>
                        <p class="text-[11px] text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                            ${this.escapeHtml(doc.description || 'Chưa có mô tả chi tiết')}
                        </p>
                    </div>

                    <!-- Footer Thẻ -->
                    <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span class="text-[11px] text-slate-400 font-medium">
                            ${this.escapeHtml(doc.fileSize || 'Trực tuyến')}
                        </span>
                        
                        <div class="flex items-center gap-1.5">
                            <button onclick="window.documentHub.openDocument('${doc.id}')"
                                class="px-3 py-1 rounded-lg ${badge.bg} ${badge.color} font-bold text-xs hover:opacity-90 transition-all flex items-center gap-1">
                                <i data-lucide="${isImage ? 'eye' : (isVideo ? 'play' : 'external-link')}" class="w-3.5 h-3.5"></i>
                                <span>${isImage ? 'Xem ảnh' : (isVideo ? 'Phát' : 'Mở')}</span>
                            </button>

                            ${doc.fileUrl ? `
                                <button onclick="window.documentHub.copyDocLink('${doc.id}')"
                                    class="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors" title="Sao chép liên kết">
                                    <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                                </button>
                            ` : `
                                <button onclick="window.documentHub.downloadDocument('${doc.id}')"
                                    class="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Tải về máy">
                                    <i data-lucide="download" class="w-3.5 h-3.5"></i>
                                </button>
                            `}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        lucide.createIcons();
    }

    renderTypePills() {
        const container = document.getElementById('doc-type-pills-container');
        if (!container) return;

        const types = this.getResourceTypes();
        container.innerHTML = types.map(t => `
            <button onclick="window.documentHub.setType('${t.id}')"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    this.selectedType === t.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }">
                <i data-lucide="${t.icon}" class="w-3.5 h-3.5"></i>
                <span>${t.name}</span>
            </button>
        `).join('');

        lucide.createIcons();
    }

    renderCategoryPills() {
        const container = document.getElementById('doc-categories-container');
        if (!container) return;

        const categories = this.getCategories();
        container.innerHTML = categories.map(cat => `
            <button onclick="window.documentHub.setCategory('${cat.id}')"
                class="px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
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

    setType(typeId) {
        this.selectedType = typeId;
        this.renderTypePills();
        this.renderDocumentsList();
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

    clearSearch() {
        const input = document.getElementById('doc-search-input');
        if (input) input.value = '';
        this.searchQuery = '';
        this.renderDocumentsList();
    }

    setViewMode(mode) {
        this.viewMode = mode;
        localStorage.setItem('etron_doc_view_mode', mode);

        // Cập nhật giao diện nút toggle
        const btnTable = document.getElementById('btn-mode-table');
        const btnGrid = document.getElementById('btn-mode-grid');
        if (btnTable && btnGrid) {
            if (mode === 'table') {
                btnTable.className = "px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-indigo-600 shadow-sm flex items-center gap-1.5";
                btnGrid.className = "px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1.5";
            } else {
                btnGrid.className = "px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-indigo-600 shadow-sm flex items-center gap-1.5";
                btnTable.className = "px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1.5";
            }
        }

        this.renderDocumentsList();
    }

    getFilteredDocuments() {
        const docs = window.salesStore.getDocuments();
        return docs.filter(doc => {
            // Lọc danh mục
            const matchesCat = this.selectedCategory === 'all' || doc.category === this.selectedCategory;

            // Lọc loại tài nguyên
            let matchesType = true;
            if (this.selectedType === 'doc') {
                matchesType = ['pdf', 'doc', 'docx', 'gdoc'].includes(doc.fileType) || doc.type === 'file';
            } else if (this.selectedType === 'sheet') {
                matchesType = ['xlsx', 'xls', 'gsheet'].includes(doc.fileType);
            } else if (this.selectedType === 'image') {
                matchesType = doc.type === 'image' || ['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(doc.fileType);
            } else if (this.selectedType === 'video') {
                matchesType = doc.type === 'video' || ['mp4', 'webm', 'mov', 'youtube'].includes(doc.fileType);
            } else if (this.selectedType === 'link') {
                matchesType = doc.type === 'link';
            }

            // Lọc tìm kiếm
            const matchesSearch = !this.searchQuery || 
                doc.title.toLowerCase().includes(this.searchQuery) ||
                (doc.description && doc.description.toLowerCase().includes(this.searchQuery)) ||
                (doc.category && doc.category.toLowerCase().includes(this.searchQuery)) ||
                (doc.tags && doc.tags.some(t => t.toLowerCase().includes(this.searchQuery)));

            return matchesCat && matchesType && matchesSearch;
        });
    }

    renderDocumentsList() {
        const container = document.getElementById('documents-view-container');
        if (!container) return;

        const docs = this.getFilteredDocuments();

        if (docs.length === 0) {
            container.innerHTML = `
                <div class="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 shadow-sm">
                    <div class="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                        <i data-lucide="folder-search" class="w-7 h-7"></i>
                    </div>
                    <p class="text-sm font-bold text-slate-700">Không tìm thấy tài liệu phù hợp</p>
                    <p class="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                        Thử điều chỉnh lại bộ lọc hoặc bấm nút <b class="text-indigo-600 font-semibold cursor-pointer" onclick="document.getElementById('document-add-modal').classList.remove('hidden')">"+ Thêm tài liệu mới"</b> để tải tệp hoặc liên kết vào kho.
                    </p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        if (this.viewMode === 'table') {
            this.renderTableView(container, docs);
        } else {
            this.renderGridView(container, docs);
        }

        lucide.createIcons();
    }

    renderTableView(container, docs) {
        container.innerHTML = `
            <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs border-collapse">
                        <thead class="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                            <tr>
                                <th class="py-3 px-4">Tên Tài Liệu & Nội Dung</th>
                                <th class="py-3 px-3">Định Dạng</th>
                                <th class="py-3 px-3">Phân Loại Danh Mục</th>
                                <th class="py-3 px-3">Dung Lượng / Nguồn</th>
                                <th class="py-3 px-3">Cập Nhật</th>
                                <th class="py-3 px-4 text-right">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${docs.map(doc => {
                                const badge = this.getFileBadge(doc.fileType, doc.type);
                                const isImage = doc.type === 'image' || ['png', 'jpg', 'jpeg', 'webp'].includes(doc.fileType);
                                const isVideo = doc.type === 'video' || doc.fileType === 'youtube';

                                return `
                                    <tr class="hover:bg-indigo-50/40 transition-colors group">
                                        <td class="py-3 px-4 max-w-xs sm:max-w-md">
                                            <div class="flex items-start gap-3">
                                                <div class="w-8 h-8 rounded-lg ${badge.bg} ${badge.color} flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                                    ${badge.label}
                                                </div>
                                                <div class="min-w-0">
                                                    <div class="flex items-center gap-1.5">
                                                        <h5 class="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors cursor-pointer truncate"
                                                            onclick="window.documentHub.openDocument('${doc.id}')" title="${this.escapeHtml(doc.title)}">
                                                            ${this.escapeHtml(doc.title)}
                                                        </h5>
                                                        ${doc.pinned ? `
                                                            <span class="text-amber-500 text-[10px]" title="Đang ghim ở mục Truy cập nhanh">⭐</span>
                                                        ` : ''}
                                                    </div>
                                                    <p class="text-[11px] text-slate-400 truncate mt-0.5">
                                                        ${this.escapeHtml(doc.description || 'Chưa có mô tả chi tiết')}
                                                    </p>
                                                    ${doc.tags && doc.tags.length > 0 ? `
                                                        <div class="flex flex-wrap gap-1 mt-1">
                                                            ${doc.tags.map(t => `<span class="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">#${this.escapeHtml(t)}</span>`).join('')}
                                                        </div>
                                                    ` : ''}
                                                </div>
                                            </div>
                                        </td>

                                        <td class="py-3 px-3">
                                            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${badge.bg} ${badge.color}">
                                                ${badge.fullName}
                                            </span>
                                        </td>

                                        <td class="py-3 px-3 text-slate-600 font-medium">
                                            ${this.escapeHtml(doc.category)}
                                        </td>

                                        <td class="py-3 px-3 text-slate-500 font-mono text-[11px]">
                                            ${this.escapeHtml(doc.fileSize || (doc.type === 'link' ? 'Cloud Link' : 'Tệp tải lên'))}
                                        </td>

                                        <td class="py-3 px-3 text-slate-400 text-[11px]">
                                            ${doc.updatedAt || 'Hôm nay'}
                                        </td>

                                        <td class="py-3 px-4 text-right">
                                            <div class="flex items-center justify-end gap-1.5">
                                                <button onclick="window.documentHub.openDocument('${doc.id}')"
                                                    class="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white text-xs font-bold transition-colors flex items-center gap-1"
                                                    title="Mở tài liệu">
                                                    <i data-lucide="${isImage ? 'eye' : (isVideo ? 'play' : 'external-link')}" class="w-3.5 h-3.5"></i>
                                                    <span>${isImage ? 'Xem' : (isVideo ? 'Phát' : 'Mở')}</span>
                                                </button>

                                                ${doc.fileUrl ? `
                                                    <button onclick="window.documentHub.copyDocLink('${doc.id}')"
                                                        class="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors" title="Sao chép liên kết">
                                                        <i data-lucide="copy" class="w-4 h-4"></i>
                                                    </button>
                                                ` : `
                                                    <button onclick="window.documentHub.downloadDocument('${doc.id}')"
                                                        class="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Tải về máy">
                                                        <i data-lucide="download" class="w-4 h-4"></i>
                                                    </button>
                                                `}

                                                <button onclick="window.documentHub.togglePin('${doc.id}')"
                                                    class="p-1 rounded ${doc.pinned ? 'text-amber-500 hover:text-amber-600' : 'text-slate-300 hover:text-amber-500'} hover:bg-amber-50 transition-colors"
                                                    title="${doc.pinned ? 'Bỏ ghim' : 'Ghim lên đầu'}">
                                                    <i data-lucide="star" class="w-4 h-4 ${doc.pinned ? 'fill-amber-400 text-amber-500' : ''}"></i>
                                                </button>

                                                <button onclick="window.documentHub.deleteDocument('${doc.id}')"
                                                    class="p-1 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Xóa tài liệu">
                                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderGridView(container, docs) {
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                ${docs.map(doc => {
                    const badge = this.getFileBadge(doc.fileType, doc.type);
                    const isImage = doc.type === 'image' || ['png', 'jpg', 'jpeg', 'webp'].includes(doc.fileType);
                    const isVideo = doc.type === 'video' || doc.fileType === 'youtube';

                    return `
                        <div class="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-indigo-200 transition-all flex flex-col justify-between group">
                            <div>
                                <!-- Header Card -->
                                <div class="flex items-start justify-between gap-3 mb-3">
                                    <div class="w-11 h-11 rounded-xl ${badge.bg} ${badge.color} flex items-center justify-center font-bold text-sm shadow-inner shrink-0">
                                        ${badge.label}
                                    </div>
                                    <div class="flex items-center gap-1">
                                        <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                                            ${this.escapeHtml(doc.category)}
                                        </span>
                                        <button onclick="window.documentHub.togglePin('${doc.id}')"
                                            class="p-1 rounded ${doc.pinned ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'} transition-colors"
                                            title="${doc.pinned ? 'Bỏ ghim' : 'Ghim lên đầu'}">
                                            <i data-lucide="star" class="w-3.5 h-3.5 ${doc.pinned ? 'fill-amber-400 text-amber-500' : ''}"></i>
                                        </button>
                                    </div>
                                </div>

                                <!-- Hình ảnh xem trước (nếu có) -->
                                ${isImage && (doc.thumbnail || doc.fileUrl) ? `
                                    <div class="w-full h-32 mb-3 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center cursor-pointer group-hover:opacity-95"
                                        onclick="window.documentHub.openDocument('${doc.id}')">
                                        <img src="${doc.thumbnail || doc.fileUrl}" alt="${this.escapeHtml(doc.title)}" class="w-full h-full object-cover">
                                    </div>
                                ` : ''}

                                <!-- Video banner (nếu là video) -->
                                ${isVideo ? `
                                    <div class="w-full h-24 mb-3 rounded-lg overflow-hidden bg-gradient-to-r from-rose-900 to-indigo-900 text-white flex items-center justify-center cursor-pointer relative"
                                        onclick="window.documentHub.openDocument('${doc.id}')">
                                        <div class="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-lg">
                                            <i data-lucide="play" class="w-5 h-5 fill-white ml-0.5"></i>
                                        </div>
                                        <span class="absolute bottom-1.5 right-2 text-[10px] bg-black/50 px-1.5 py-0.5 rounded">Video Demo</span>
                                    </div>
                                ` : ''}

                                <!-- Tiêu đề & Mô tả -->
                                <h4 class="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug cursor-pointer"
                                    onclick="window.documentHub.openDocument('${doc.id}')" title="${this.escapeHtml(doc.title)}">
                                    ${this.escapeHtml(doc.title)}
                                </h4>
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
                                <span class="flex items-center gap-1 text-[11px]">
                                    <i data-lucide="clock" class="w-3.5 h-3.5"></i>
                                    ${doc.updatedAt || 'Hôm nay'}
                                </span>

                                <div class="flex items-center gap-1.5">
                                    <button onclick="window.documentHub.openDocument('${doc.id}')" 
                                        class="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 font-semibold text-xs transition-colors flex items-center gap-1"
                                        title="Mở / Xem tài liệu">
                                        <i data-lucide="${isImage ? 'eye' : (isVideo ? 'play' : 'external-link')}" class="w-3.5 h-3.5"></i>
                                        <span>${isImage ? 'Xem' : (isVideo ? 'Phát' : 'Mở')}</span>
                                    </button>

                                    ${doc.fileUrl ? `
                                        <button onclick="window.documentHub.copyDocLink('${doc.id}')"
                                            class="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors" title="Sao chép liên kết">
                                            <i data-lucide="copy" class="w-4 h-4"></i>
                                        </button>
                                    ` : `
                                        <button onclick="window.documentHub.downloadDocument('${doc.id}')"
                                            class="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Tải về máy">
                                            <i data-lucide="download" class="w-4 h-4"></i>
                                        </button>
                                    `}

                                    <button onclick="window.documentHub.deleteDocument('${doc.id}')"
                                        class="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Xóa tài liệu">
                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    getFileBadge(fileType, type) {
        const ft = (fileType || '').toLowerCase();
        if (ft === 'pdf') {
            return { label: 'PDF', fullName: 'PDF Document', bg: 'bg-rose-100 text-rose-700', color: 'text-rose-700', border: 'border-rose-200', subtleBg: 'bg-rose-500/10' };
        }
        if (ft === 'xls' || ft === 'xlsx' || ft === 'gsheet') {
            return { label: 'XLS', fullName: 'Bảng tính Sheets', bg: 'bg-emerald-100 text-emerald-700', color: 'text-emerald-700', border: 'border-emerald-200', subtleBg: 'bg-emerald-500/10' };
        }
        if (ft === 'doc' || ft === 'docx' || ft === 'gdoc') {
            return { label: 'DOC', fullName: 'Văn bản Word', bg: 'bg-blue-100 text-blue-700', color: 'text-blue-700', border: 'border-blue-200', subtleBg: 'bg-blue-500/10' };
        }
        if (ft === 'ppt' || ft === 'pptx') {
            return { label: 'PPT', fullName: 'Slide Thuyết trình', bg: 'bg-amber-100 text-amber-700', color: 'text-amber-700', border: 'border-amber-200', subtleBg: 'bg-amber-500/10' };
        }
        if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ft) || type === 'image') {
            return { label: 'IMG', fullName: 'Hình ảnh Salekit', bg: 'bg-purple-100 text-purple-700', color: 'text-purple-700', border: 'border-purple-200', subtleBg: 'bg-purple-500/10' };
        }
        if (['mp4', 'webm', 'mov', 'youtube'].includes(ft) || type === 'video') {
            return { label: 'VID', fullName: 'Video Demo', bg: 'bg-rose-100 text-rose-700', color: 'text-rose-700', border: 'border-rose-200', subtleBg: 'bg-rose-500/10' };
        }
        if (ft === 'drive' || ft === 'folder') {
            return { label: '📁', fullName: 'Thư mục Drive', bg: 'bg-amber-100 text-amber-800', color: 'text-amber-800', border: 'border-amber-200', subtleBg: 'bg-amber-500/10' };
        }
        return { label: 'LINK', fullName: 'Liên kết Cloud', bg: 'bg-sky-100 text-sky-700', color: 'text-sky-700', border: 'border-sky-200', subtleBg: 'bg-sky-500/10' };
    }

    // ==========================================
    // 3. ACTIONS & INTERACTION HANDLERS
    // ==========================================
    async openDocument(id) {
        const docs = window.salesStore.getDocuments();
        const doc = docs.find(d => d.id === id);
        if (!doc) return;

        // Nếu là YouTube link
        if (doc.fileType === 'youtube' || (doc.fileUrl && doc.fileUrl.includes('youtube.com')) || (doc.fileUrl && doc.fileUrl.includes('youtu.be'))) {
            this.openVideoPreview(doc.fileUrl, doc.title);
            return;
        }

        // Nếu là hình ảnh
        if (doc.type === 'image' || ['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(doc.fileType)) {
            if (doc.fileUrl) {
                this.openImagePreview(doc.fileUrl, doc.title, doc.fileSize);
                return;
            }
            // Đọc từ IndexedDB
            const fileData = await this.fileStore.getFile(id);
            if (fileData && fileData.blob) {
                const objectUrl = URL.createObjectURL(fileData.blob);
                this.openImagePreview(objectUrl, doc.title, doc.fileSize);
            } else {
                window.salesApp.showNotification('Không tìm thấy tệp ảnh lưu trữ!', 'error');
            }
            return;
        }

        // Nếu là video file tải lên
        if (doc.type === 'video' || ['mp4', 'webm', 'mov'].includes(doc.fileType)) {
            if (doc.fileUrl) {
                this.openVideoPreview(doc.fileUrl, doc.title);
                return;
            }
            const fileData = await this.fileStore.getFile(id);
            if (fileData && fileData.blob) {
                const objectUrl = URL.createObjectURL(fileData.blob);
                this.openVideoPreview(objectUrl, doc.title);
            } else {
                window.salesApp.showNotification('Không tìm thấy tệp video lưu trữ!', 'error');
            }
            return;
        }

        // Nếu là tài liệu PDF tải lên
        if (doc.fileType === 'pdf' && !doc.fileUrl) {
            const fileData = await this.fileStore.getFile(id);
            if (fileData && fileData.blob) {
                const objectUrl = URL.createObjectURL(fileData.blob);
                window.open(objectUrl, '_blank');
            } else {
                window.salesApp.showNotification('Không tìm thấy tệp PDF lưu trữ!', 'error');
            }
            return;
        }

        // Nếu là tệp file khác (Word, Excel) được tải lên
        if (!doc.fileUrl) {
            this.downloadDocument(id);
            return;
        }

        // Mặc định là đường dẫn Cloud URL
        window.open(doc.fileUrl, '_blank');
    }

    async downloadDocument(id) {
        const docs = window.salesStore.getDocuments();
        const doc = docs.find(d => d.id === id);
        if (!doc) return;

        if (doc.fileUrl) {
            window.open(doc.fileUrl, '_blank');
            return;
        }

        const fileData = await this.fileStore.getFile(id);
        if (fileData && fileData.blob) {
            const url = URL.createObjectURL(fileData.blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = doc.fileName || doc.title || 'tai-lieu-etron';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            window.salesApp.showNotification(`Đang tải xuống: ${doc.title}`, 'success');
        } else {
            window.salesApp.showNotification('Không tìm thấy dữ liệu tệp để tải về', 'error');
        }
    }

    copyDocLink(id) {
        const docs = window.salesStore.getDocuments();
        const doc = docs.find(d => d.id === id);
        if (!doc) return;

        if (doc.fileUrl) {
            navigator.clipboard.writeText(doc.fileUrl).then(() => {
                window.salesApp.showNotification('Đã sao chép liên kết tài liệu!', 'success');
            }).catch(() => {
                prompt('Liên kết tài liệu:', doc.fileUrl);
            });
        } else {
            window.salesApp.showNotification('Tệp này được lưu trên thiết bị của bạn. Bạn hãy bấm "Tải về" để gửi tệp trực tiếp cho khách nhé!', 'info');
        }
    }

    togglePin(id) {
        const docs = window.salesStore.getDocuments();
        const doc = docs.find(d => d.id === id);
        if (!doc) return;

        doc.pinned = !doc.pinned;
        window.salesStore.saveDocument(doc);
        this.renderQuickAccess();
        this.renderDocumentsList();

        if (doc.pinned) {
            window.salesApp.showNotification(`Đã ghim "${doc.title}" lên mục Truy Cập Nhanh!`, 'success');
        } else {
            window.salesApp.showNotification(`Đã bỏ ghim "${doc.title}"`, 'info');
        }
    }

    async deleteDocument(id) {
        if (confirm('Bạn có chắc chắn muốn xóa tài liệu này khỏi kho?')) {
            window.salesStore.deleteDocument(id);
            await this.fileStore.deleteFile(id);
            this.renderStats();
            this.renderQuickAccess();
            this.renderDocumentsList();
            window.salesApp.showNotification('Đã xóa tài liệu khỏi kho', 'info');
        }
    }

    // ==========================================
    // 4. MODAL THÊM TÀI LIỆU / TỆP / MEDIA MỚI
    // ==========================================
    setupModalEventListeners() {
        const dropzone = document.getElementById('doc-dropzone');
        const fileInput = document.getElementById('doc-file-input');

        if (dropzone && fileInput) {
            // Drag and drop events
            ['dragenter', 'dragover'].forEach(eventName => {
                dropzone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    dropzone.classList.add('border-indigo-500', 'bg-indigo-50/50');
                }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropzone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    dropzone.classList.remove('border-indigo-500', 'bg-indigo-50/50');
                }, false);
            });

            dropzone.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                if (files && files.length > 0) {
                    this.handleFileSelect(files[0]);
                }
            });

            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    this.handleFileSelect(e.target.files[0]);
                }
            });
        }
    }

    switchModalTab(tab) {
        this.activeModalTab = tab;
        const tabUpload = document.getElementById('modal-tab-upload');
        const tabLink = document.getElementById('modal-tab-link');
        const sectionUpload = document.getElementById('modal-section-upload');
        const sectionLink = document.getElementById('modal-section-link');

        if (tab === 'upload') {
            tabUpload.className = "flex-1 py-2 text-xs font-bold rounded-lg bg-white text-indigo-600 shadow-sm border border-slate-200 transition-all";
            tabLink.className = "flex-1 py-2 text-xs font-semibold rounded-lg text-slate-500 hover:text-slate-900 transition-all";
            sectionUpload.classList.remove('hidden');
            sectionLink.classList.add('hidden');
        } else {
            tabLink.className = "flex-1 py-2 text-xs font-bold rounded-lg bg-white text-indigo-600 shadow-sm border border-slate-200 transition-all";
            tabUpload.className = "flex-1 py-2 text-xs font-semibold rounded-lg text-slate-500 hover:text-slate-900 transition-all";
            sectionLink.classList.remove('hidden');
            sectionUpload.classList.add('hidden');
        }
    }

    handleFileSelect(file) {
        if (!file) return;

        // Giới hạn 100MB
        if (file.size > 100 * 1024 * 1024) {
            alert('Tệp quá lớn! Vui lòng chọn tệp nhỏ hơn 100MB.');
            return;
        }

        this.selectedUploadFile = file;

        // Cập nhật UI hiển thị tệp đã chọn
        const dropContent = document.getElementById('doc-dropzone-content');
        const filePreview = document.getElementById('doc-selected-file-preview');
        const fileNameEl = document.getElementById('doc-selected-filename');
        const fileSizeEl = document.getElementById('doc-selected-filesize');
        const fileIconEl = document.getElementById('doc-selected-fileicon');

        if (dropContent && filePreview) {
            dropContent.classList.add('hidden');
            filePreview.classList.remove('hidden');
            fileNameEl.textContent = file.name;
            fileSizeEl.textContent = this.formatFileSize(file.size);

            // Tự động điền tiêu đề nếu chưa có
            const titleInput = document.getElementById('new-doc-title');
            if (titleInput && !titleInput.value.trim()) {
                const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                titleInput.value = nameWithoutExt.replace(/[-_]/g, ' ');
            }

            // Tự động nhận diện danh mục & loại tệp
            const ext = file.name.split('.').pop().toLowerCase();
            const categorySelect = document.getElementById('new-doc-category');
            if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'mp4', 'webm'].includes(ext)) {
                if (categorySelect && categorySelect.value === 'Báo giá & Mẫu biểu') {
                    categorySelect.value = 'Salekit & Giới thiệu';
                }
            }
        }
    }

    clearSelectedFile() {
        this.selectedUploadFile = null;
        const fileInput = document.getElementById('doc-file-input');
        if (fileInput) fileInput.value = '';

        const dropContent = document.getElementById('doc-dropzone-content');
        const filePreview = document.getElementById('doc-selected-file-preview');
        if (dropContent && filePreview) {
            dropContent.classList.remove('hidden');
            filePreview.classList.add('hidden');
        }
    }

    async saveNewDocument(event) {
        event.preventDefault();

        const title = document.getElementById('new-doc-title').value.trim();
        const category = document.getElementById('new-doc-category').value;
        const desc = document.getElementById('new-doc-desc').value.trim();
        const tagsStr = document.getElementById('new-doc-tags').value.trim();
        const isPinned = document.getElementById('new-doc-pinned').checked;
        const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];

        if (!title) {
            alert('Vui lòng nhập tiêu đề tài liệu!');
            return;
        }

        const docId = 'doc-user-' + Date.now();
        let newDoc = {
            id: docId,
            title: title,
            category: category,
            description: desc,
            tags: tags,
            pinned: isPinned,
            updatedAt: new Date().toISOString().split('T')[0]
        };

        if (this.activeModalTab === 'upload') {
            if (!this.selectedUploadFile) {
                alert('Vui lòng chọn tệp từ máy tính để tải lên!');
                return;
            }

            const file = this.selectedUploadFile;
            const ext = file.name.split('.').pop().toLowerCase();

            let type = 'file';
            if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) {
                type = 'image';
            } else if (['mp4', 'webm', 'mov'].includes(ext)) {
                type = 'video';
            }

            newDoc.type = type;
            newDoc.fileType = ext;
            newDoc.fileName = file.name;
            newDoc.fileSize = this.formatFileSize(file.size);

            // Nếu là ảnh, tạo thumbnail nhỏ lưu trực tiếp để tải tức thì
            if (type === 'image') {
                try {
                    newDoc.thumbnail = await this.createImageThumbnail(file);
                } catch (e) { /* bỏ qua */ }
            }

            // Lưu file vào IndexedDB
            await this.fileStore.saveFile(docId, file);
        } else {
            // Chế độ thêm URL Link
            const fileUrl = document.getElementById('new-doc-url').value.trim();
            if (!fileUrl) {
                alert('Vui lòng nhập đường dẫn liên kết tài liệu!');
                return;
            }

            newDoc.type = 'link';
            newDoc.fileUrl = fileUrl;
            newDoc.fileSize = 'Cloud Link';

            // Nhận diện loại link
            if (fileUrl.includes('docs.google.com/spreadsheets')) {
                newDoc.fileType = 'xlsx';
                newDoc.fileSize = 'Google Sheets';
            } else if (fileUrl.includes('docs.google.com/document')) {
                newDoc.fileType = 'gdoc';
                newDoc.fileSize = 'Google Docs';
            } else if (fileUrl.includes('drive.google.com')) {
                newDoc.fileType = 'drive';
                newDoc.fileSize = 'Drive Folder';
            } else if (fileUrl.includes('youtube.com') || fileUrl.includes('youtu.be')) {
                newDoc.fileType = 'youtube';
                newDoc.type = 'video';
                newDoc.fileSize = 'Video Link';
            } else if (fileUrl.endsWith('.pdf')) {
                newDoc.fileType = 'pdf';
            } else {
                newDoc.fileType = 'link';
            }
        }

        // Lưu metadata vào SalesStore
        window.salesStore.saveDocument(newDoc);

        // Reset form & đóng modal
        document.getElementById('document-add-modal').classList.add('hidden');
        document.getElementById('document-add-form').reset();
        this.clearSelectedFile();

        // Cập nhật lại giao diện
        this.renderStats();
        this.renderQuickAccess();
        this.renderDocumentsList();

        window.salesApp.showNotification('Đã thêm tài liệu mới vào kho thành công!', 'success');
    }

    createImageThumbnail(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 400;
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    // ==========================================
    // 5. MEDIA PREVIEWS (LIGHTBOX & VIDEO PLAYER)
    // ==========================================
    openImagePreview(src, title, size) {
        const modal = document.getElementById('media-preview-modal');
        const titleEl = document.getElementById('media-preview-title');
        const container = document.getElementById('media-preview-content');
        const downloadBtn = document.getElementById('media-preview-download-btn');

        if (!modal || !container) return;

        titleEl.textContent = title || 'Xem trước hình ảnh';
        container.innerHTML = `
            <div class="flex items-center justify-center p-2 max-h-[75vh]">
                <img src="${src}" alt="${this.escapeHtml(title)}" class="max-h-[70vh] max-w-full object-contain rounded-xl shadow-lg border border-slate-200">
            </div>
        `;

        downloadBtn.onclick = () => {
            const a = document.createElement('a');
            a.href = src;
            a.download = (title || 'hinh-anh-etron').replace(/\s+/g, '_') + '.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };

        modal.classList.remove('hidden');
        lucide.createIcons();
    }

    openVideoPreview(src, title) {
        const modal = document.getElementById('media-preview-modal');
        const titleEl = document.getElementById('media-preview-title');
        const container = document.getElementById('media-preview-content');
        const downloadBtn = document.getElementById('media-preview-download-btn');

        if (!modal || !container) return;

        titleEl.textContent = title || 'Phát Video Demo';

        // Kiểm tra YouTube URL
        const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const ytMatch = src.match(ytRegExp);

        if (ytMatch && ytMatch[2].length === 11) {
            const embedUrl = `https://www.youtube.com/embed/${ytMatch[2]}?autoplay=1`;
            container.innerHTML = `
                <div class="w-full aspect-video rounded-xl overflow-hidden shadow-xl bg-black">
                    <iframe src="${embedUrl}" class="w-full h-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                </div>
            `;
            downloadBtn.classList.add('hidden');
        } else {
            // HTML5 Video Player
            container.innerHTML = `
                <div class="w-full aspect-video rounded-xl overflow-hidden shadow-xl bg-black flex items-center justify-center">
                    <video src="${src}" controls autoplay class="w-full h-full object-contain"></video>
                </div>
            `;
            downloadBtn.classList.remove('hidden');
            downloadBtn.onclick = () => {
                const a = document.createElement('a');
                a.href = src;
                a.download = (title || 'video-demo-etron').replace(/\s+/g, '_') + '.mp4';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            };
        }

        modal.classList.remove('hidden');
        lucide.createIcons();
    }

    closeMediaPreview() {
        const modal = document.getElementById('media-preview-modal');
        const container = document.getElementById('media-preview-content');
        if (modal) modal.classList.add('hidden');
        if (container) container.innerHTML = ''; // Dừng phát video
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
