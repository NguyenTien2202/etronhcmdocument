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
        this.sortBy = localStorage.getItem('etron_doc_sort_by') || 'date-desc'; // 'date-desc', 'date-asc', 'title-asc', 'title-desc'
        this.viewMode = localStorage.getItem('etron_doc_view_mode') || 'table'; // 'table' hoặc 'grid'
        this.selectedUploadFile = null;
        this.activeModalTab = 'upload'; // 'upload' hoặc 'link'
        this.selectedNewCategoryIcon = 'folder';
        this.userPickedAddIcon = false;
        this.activeCategoryForIconPicker = null;
        this.isModalCatDropdownOpen = false;
        this.selectedModalCategory = null;
        this.isSortDropdownOpen = false;
        this.syncingDocIds = new Set();
    }

    init() {
        this.renderStats();
        this.renderQuickAccess();
        this.renderTypePills();
        this.renderCategoryPills();
        this.updateCategorySelectOptions();
        this.renderAddIconPickerGrid();
        this.renderSortDropdown();

        this.renderDocumentsList();
        this.setupModalEventListeners();

        // Tự động đẩy các tệp đã tải lên trên trình duyệt này lên Cloud (nếu chưa có trên Cloud)
        setTimeout(() => this.syncLocalIndexedDBFilesToCloud(), 1500);

        // Đóng các dropdown khi click ra ngoài
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#doc-modal-cat-dropdown-wrapper')) {
                if (this.isModalCatDropdownOpen) {
                    this.isModalCatDropdownOpen = false;
                    this.renderModalCategoryDropdown();
                }
            }
            if (!e.target.closest('#doc-sort-dropdown-wrapper')) {
                if (this.isSortDropdownOpen) {
                    this.isSortDropdownOpen = false;
                    this.renderSortDropdown();
                }
            }
        });
    }

    getCategories() {
        const customCats = window.salesStore.getDocumentCategories();
        return [
            { id: 'all', name: 'Tất cả danh mục', icon: 'layers' },
            ...customCats
        ];
    }

    getResourceTypes() {
        return [
            { id: 'all', name: 'Tất cả định dạng', icon: 'layout-grid' },
            { id: 'doc', name: 'Tài liệu & PDF', icon: 'file-text', countBadge: 'PDF, Word' },
            { id: 'note', name: 'Thông báo & Ghi chú', icon: 'message-square-text', countBadge: 'Note' },
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
        const notesCount = docs.filter(d => d.type === 'note' || d.fileType === 'note').length;
        const sheetsCount = docs.filter(d => ['xlsx', 'xls', 'gsheet'].includes(d.fileType)).length;
        const mediaCount = docs.filter(d => d.type === 'image' || d.type === 'video' || ['png', 'jpg', 'mp4', 'youtube'].includes(d.fileType)).length;
        const cloudCount = docs.filter(d => d.type === 'link').length;

        statsEl.innerHTML = `
            <div class="flex items-center gap-1.5 text-xs overflow-x-auto no-scrollbar flex-nowrap sm:flex-wrap py-0.5">
                <span class="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 shrink-0 text-[11px] sm:text-xs">
                    <i data-lucide="folder-check" class="w-3.5 h-3.5"></i>
                    <span>Tổng: <b>${docs.length}</b> mục</span>
                </span>
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium shrink-0 text-[11px]">
                    <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                    ${docsCount} Văn bản
                </span>
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium shrink-0 text-[11px]">
                    <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                    ${notesCount} Thông báo
                </span>
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium shrink-0 text-[11px]">
                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                    ${sheetsCount} Bảng tính
                </span>
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium shrink-0 text-[11px]">
                    <span class="w-2 h-2 rounded-full bg-purple-500"></span>
                    ${mediaCount} Ảnh & Video
                </span>
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium shrink-0 text-[11px]">
                    <span class="w-2 h-2 rounded-full bg-sky-500"></span>
                    ${cloudCount} Cloud
                </span>
            </div>
        `;
        lucide.createIcons();
    }

    renderQuickAccess() {
        const container = document.getElementById('doc-quick-access-cards');
        if (!container) return;

        const allDocs = window.salesStore.getDocuments();
        const allCats = window.salesStore.getDocumentCategories();

        const pinnedCats = allCats.filter(c => c.id !== 'all' && c.pinned === true);
        let pinnedDocs = allDocs.filter(d => d.pinned === true);

        // Nếu chưa có danh mục hay tài liệu nào được ghim thủ công, lấy 4 tài liệu đầu tiên làm mặc định
        if (pinnedCats.length === 0 && pinnedDocs.length === 0) {
            pinnedDocs = allDocs.slice(0, 4);
        }

        // 1. Thẻ danh mục ghim (Pinned Categories)
        const catCardsHtml = pinnedCats.map(cat => {
            const catDocs = allDocs.filter(d => d.category === cat.name || d.category === cat.id);
            return `
                <div class="w-[270px] sm:w-auto shrink-0 snap-start bg-gradient-to-br from-indigo-50/80 via-white to-white rounded-xl border-2 border-indigo-200/90 p-3.5 sm:p-4 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all flex flex-col justify-between group relative overflow-hidden">
                    <div class="absolute top-0 right-0 w-24 h-24 bg-indigo-100/40 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110"></div>
                    
                    <div>
                        <!-- Header thẻ Pinned Category -->
                        <div class="flex items-center justify-between gap-2 mb-2.5 sm:mb-3">
                            <div class="flex items-center gap-2">
                                <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-indigo-100 shrink-0">
                                    <i data-lucide="${this.escapeHtml(cat.icon || 'folders')}" class="w-5 h-5"></i>
                                </div>
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase tracking-wider">
                                    Thư mục ghim
                                </span>
                            </div>
                            <div class="flex items-center gap-1 z-10">
                                <button onclick="window.documentHub.toggleCategoryPin('${this.escapeHtml(this.escapeJs(cat.id))}')" class="text-amber-500 hover:text-amber-600 p-1 transition-colors" title="Bỏ ghim danh mục khỏi Truy cập nhanh">
                                    <i data-lucide="star" class="w-4 h-4 fill-amber-400 text-amber-500"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Tiêu đề & Thông tin danh mục -->
                        <h4 class="font-extrabold text-slate-800 text-xs sm:text-sm group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug cursor-pointer"
                            onclick="window.documentHub.openCategoryFromQuickAccess('${this.escapeHtml(this.escapeJs(cat.id))}')" title="${this.escapeHtml(cat.name)}">
                            ${this.escapeHtml(cat.name)}
                        </h4>
                        <p class="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            📁 Bao gồm ${catDocs.length} tài liệu, mẫu biểu & liên kết Sales.
                        </p>
                    </div>

                    <!-- Footer Thẻ -->
                    <div class="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span class="text-[10px] sm:text-[11px] font-bold text-indigo-600 flex items-center gap-1">
                            <i data-lucide="layers" class="w-3.5 h-3.5"></i>
                            <span>${catDocs.length} tài liệu</span>
                        </span>
                        
                        <button onclick="window.documentHub.openCategoryFromQuickAccess('${this.escapeHtml(this.escapeJs(cat.id))}')"
                            class="px-2.5 sm:px-3 py-1 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all flex items-center gap-1 shadow-xs">
                            <span>Mở thư mục</span>
                            <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // 2. Thẻ tài liệu ghim (Pinned Documents)
        const docCardsHtml = pinnedDocs.map(doc => {
            const badge = this.getFileBadge(doc.fileType, doc.type);
            const isImage = doc.type === 'image' || ['png', 'jpg', 'jpeg', 'webp'].includes(doc.fileType);
            const isVideo = doc.type === 'video' || doc.fileType === 'youtube';
            const isNote = doc.type === 'note' || doc.fileType === 'note';
            const displayDesc = doc.description || (isNote && doc.content ? doc.content.replace(/\s+/g, ' ').trim() : 'Chưa có mô tả chi tiết');

            return `
                <div class="w-[270px] sm:w-auto shrink-0 snap-start bg-white rounded-xl border-2 ${badge.border} p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden">
                    <div class="absolute top-0 right-0 w-20 h-20 ${badge.subtleBg} rounded-bl-full pointer-events-none transition-transform group-hover:scale-110"></div>
                    
                    <div>
                        <!-- Header thẻ Quick Access -->
                        <div class="flex items-center justify-between gap-2 mb-2.5 sm:mb-3">
                            <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${badge.bg} ${badge.color} flex items-center justify-center font-bold text-xs shadow-inner shrink-0">
                                ${badge.label}
                            </div>
                            <div class="flex items-center gap-1">
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${badge.bg} ${badge.color} truncate max-w-[110px]">
                                    ${this.escapeHtml(doc.category)}
                                </span>
                                <button onclick="window.documentHub.openEditModal('${this.escapeHtml(this.escapeJs(doc.id))}')" class="text-slate-300 hover:text-indigo-600 p-1 transition-colors" title="Chỉnh sửa tài liệu">
                                    <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                                </button>
                                <button onclick="window.documentHub.togglePin('${this.escapeHtml(this.escapeJs(doc.id))}')" class="text-amber-500 hover:text-amber-600 p-1 transition-colors" title="Bỏ ghim khỏi mục Truy cập nhanh">
                                    <i data-lucide="star" class="w-4 h-4 fill-amber-400 text-amber-500"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Tiêu đề & Mô tả -->
                        <h4 class="font-bold text-slate-800 text-xs sm:text-sm group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug cursor-pointer"
                            onclick="window.documentHub.openDocument('${this.escapeHtml(this.escapeJs(doc.id))}')" title="${this.escapeHtml(doc.title)}">
                            ${this.escapeHtml(doc.title)}
                        </h4>
                        <p class="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            ${this.escapeHtml(displayDesc)}
                        </p>
                    </div>

                    <!-- Footer Thẻ -->
                    <div class="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span class="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                            ${this.escapeHtml(doc.fileSize || (isNote ? 'Thông báo' : 'Trực tuyến'))}
                        </span>
                        
                        <div class="flex items-center gap-1.5">
                            <button onclick="window.documentHub.openDocument('${this.escapeHtml(this.escapeJs(doc.id))}')"
                                class="px-2.5 sm:px-3 py-1 rounded-lg ${badge.bg} ${badge.color} font-bold text-xs hover:opacity-90 transition-all flex items-center gap-1">
                                <i data-lucide="${isImage ? 'eye' : (isVideo ? 'play' : (isNote ? 'book-open' : 'external-link'))}" class="w-3.5 h-3.5"></i>
                                <span>${isImage ? 'Xem ảnh' : (isVideo ? 'Phát' : (isNote ? 'Đọc tin' : 'Mở'))}</span>
                            </button>

                            ${isNote ? `
                                <button onclick="window.documentHub.copyNoteContent('${this.escapeHtml(this.escapeJs(doc.id))}')"
                                    class="p-1 sm:p-1.5 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Sao chép nội dung thông báo">
                                    <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                                </button>
                            ` : (doc.fileUrl ? `
                                <button onclick="window.documentHub.copyDocLink('${this.escapeHtml(this.escapeJs(doc.id))}')"
                                    class="p-1 sm:p-1.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors" title="Sao chép liên kết">
                                    <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                                </button>
                            ` : `
                                <button onclick="window.documentHub.downloadDocument('${this.escapeHtml(this.escapeJs(doc.id))}')"
                                    class="p-1 sm:p-1.5 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Tải về máy">
                                    <i data-lucide="download" class="w-3.5 h-3.5"></i>
                                </button>
                            `)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = catCardsHtml + docCardsHtml;
        lucide.createIcons();
    }

    openCategoryFromQuickAccess(catId) {
        this.setCategory(catId);
        const container = document.getElementById('documents-view-container');
        if (container) {
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        const cat = this.getCategories().find(c => c.id === catId);
        const catName = cat ? cat.name : catId;
        window.salesApp.showNotification(`Đang mở danh mục: "${catName}"`, 'info');
    }

    renderTypePills() {
        const container = document.getElementById('doc-type-pills-container');
        if (!container) return;

        const types = this.getResourceTypes();
        container.innerHTML = types.map(t => `
            <button onclick="window.documentHub.setType('${t.id}')"
                class="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
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
        container.innerHTML = `
            ${categories.map(cat => `
                <button onclick="window.documentHub.setCategory('${this.escapeHtml(this.escapeJs(cat.id))}')"
                    class="px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
                        this.selectedCategory === cat.id 
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200' 
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }">
                    <i data-lucide="${this.escapeHtml(cat.icon || 'tag')}" class="w-3.5 h-3.5"></i>
                    <span>${this.escapeHtml(cat.name)}</span>
                    ${cat.pinned ? `<span class="text-amber-400 text-[10px]" title="Đã ghim ở mục Truy cập nhanh">⭐</span>` : ''}
                </button>
            `).join('')}

            <!-- Nút Mở Modal Quản Lý Danh Mục (Thêm / Sửa / Xóa) -->
            <button type="button" onclick="window.documentHub.openCategoryManagerModal()"
                class="px-2.5 py-1 rounded-full text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all flex items-center gap-1.5 shrink-0 shadow-2xs"
                title="Quản lý, thêm mới, sửa, xóa hoặc ghim danh mục lên Truy Cập Nhanh">
                <i data-lucide="settings-2" class="w-3.5 h-3.5 text-indigo-600"></i>
                <span>Quản lý danh mục</span>
            </button>
        `;

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
                btnTable.className = "px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-indigo-600 shadow-sm flex items-center gap-1.5";
                btnGrid.className = "px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1.5";
            } else {
                btnGrid.className = "px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-indigo-600 shadow-sm flex items-center gap-1.5";
                btnTable.className = "px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1.5";
            }
        }

        this.renderDocumentsList();
    }

    getSortOptions() {
        return [
            { value: 'date-desc', label: 'Mới nhất trước', icon: 'clock' },
            { value: 'date-asc', label: 'Cũ nhất trước', icon: 'history' },
            { value: 'title-asc', label: 'Tên (A ➔ Z)', icon: 'arrow-down-a-z' },
            { value: 'title-desc', label: 'Tên (Z ➔ A)', icon: 'arrow-up-z-a' }
        ];
    }

    renderSortDropdown() {
        const wrapper = document.getElementById('doc-sort-dropdown-wrapper');
        if (!wrapper) return;

        const options = this.getSortOptions();
        const activeObj = options.find(o => o.value === this.sortBy) || options[0];

        wrapper.innerHTML = `
            <input type="hidden" id="doc-sort-select" value="${this.sortBy}">
            <button type="button" onclick="window.documentHub.toggleSortDropdown(event)"
                class="w-full sm:w-auto flex items-center justify-between gap-2 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl shadow-2xs hover:border-indigo-300 transition-all min-w-[165px] focus:outline-none">
                <div class="flex items-center gap-2 truncate">
                    <div class="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <i data-lucide="${activeObj.icon}" class="w-3.5 h-3.5"></i>
                    </div>
                    <span class="truncate">${activeObj.label}</span>
                </div>
                <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${this.isSortDropdownOpen ? 'rotate-180' : ''}"></i>
            </button>

            <!-- Dropdown Menu -->
            <div class="${this.isSortDropdownOpen ? '' : 'hidden'} absolute right-0 top-full mt-1.5 w-52 z-50 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                ${options.map(opt => {
                    const isSelected = opt.value === this.sortBy;
                    return `
                        <button type="button" onclick="window.documentHub.setSortBy('${opt.value}')"
                            class="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-800 font-bold' : 'text-slate-700 hover:bg-slate-100 font-medium'}">
                            <span class="flex items-center gap-2 truncate">
                                <i data-lucide="${opt.icon}" class="w-3.5 h-3.5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}"></i>
                                <span class="truncate">${opt.label}</span>
                            </span>
                            ${isSelected ? '<i data-lucide="check" class="w-3.5 h-3.5 text-indigo-600 shrink-0"></i>' : ''}
                        </button>
                    `;
                }).join('')}
            </div>
        `;

        if (window.lucide) lucide.createIcons();
    }

    toggleSortDropdown(e) {
        if (e) e.stopPropagation();
        this.isSortDropdownOpen = !this.isSortDropdownOpen;
        this.renderSortDropdown();
    }

    setSortBy(sortKey) {
        this.sortBy = sortKey;
        this.isSortDropdownOpen = false;
        localStorage.setItem('etron_doc_sort_by', sortKey);

        this.renderSortDropdown();
        this.renderDocumentsList();
    }

    toggleSort(type) {
        if (type === 'date') {
            const nextSort = this.sortBy === 'date-desc' ? 'date-asc' : 'date-desc';
            this.setSortBy(nextSort);
        } else if (type === 'title') {
            const nextSort = this.sortBy === 'title-asc' ? 'title-desc' : 'title-asc';
            this.setSortBy(nextSort);
        }
    }

    getFilteredDocuments() {
        const docs = window.salesStore.getDocuments();
        const filtered = docs.filter(doc => {
            // Lọc danh mục (so sánh trực tiếp tên hoặc qua ID danh mục)
            const matchedCategoryObj = this.getCategories().find(c => c.id === this.selectedCategory);
            const targetCatName = matchedCategoryObj ? matchedCategoryObj.name : this.selectedCategory;
            const matchesCat = this.selectedCategory === 'all' || doc.category === this.selectedCategory || doc.category === targetCatName;

            // Lọc loại tài nguyên
            let matchesType = true;
            if (this.selectedType === 'doc') {
                matchesType = ['pdf', 'doc', 'docx', 'gdoc'].includes(doc.fileType) || doc.type === 'file';
            } else if (this.selectedType === 'note') {
                matchesType = doc.type === 'note' || doc.fileType === 'note';
            } else if (this.selectedType === 'sheet') {
                matchesType = ['xlsx', 'xls', 'gsheet'].includes(doc.fileType);
            } else if (this.selectedType === 'image') {
                matchesType = doc.type === 'image' || ['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(doc.fileType);
            } else if (this.selectedType === 'video') {
                matchesType = doc.type === 'video' || ['mp4', 'webm', 'mov', 'youtube'].includes(doc.fileType);
            } else if (this.selectedType === 'link') {
                matchesType = doc.type === 'link';
            }

            // Lọc tìm kiếm (bao gồm tìm kiếm toàn văn trong nội dung thông báo/tin nhắn doc.content)
            const matchesSearch = !this.searchQuery || 
                doc.title.toLowerCase().includes(this.searchQuery) ||
                (doc.description && doc.description.toLowerCase().includes(this.searchQuery)) ||
                (doc.content && doc.content.toLowerCase().includes(this.searchQuery)) ||
                (doc.category && doc.category.toLowerCase().includes(this.searchQuery)) ||
                (doc.tags && doc.tags.some(t => t.toLowerCase().includes(this.searchQuery)));

            return matchesCat && matchesType && matchesSearch;
        });

        // Hàm trích xuất mốc thời gian chính xác (timestamp millisecond)
        const getDocTimestamp = (d) => {
            if (d.updatedAtTime) return Number(d.updatedAtTime);
            if (d.createdAt && typeof d.createdAt === 'number') return d.createdAt;
            if (d.id && d.id.startsWith('doc-user-')) {
                const parts = d.id.split('-');
                const ts = Number(parts[parts.length - 1]);
                if (!isNaN(ts) && ts > 0) return ts;
            }
            if (d.updatedAt) {
                const t = new Date(d.updatedAt).getTime();
                if (!isNaN(t)) return t;
            }
            return 0;
        };

        // Sắp xếp dữ liệu theo lựa chọn (Mặc định: Mới nhất lên đầu)
        return filtered.sort((a, b) => {
            if (this.sortBy === 'date-asc') {
                const diff = getDocTimestamp(a) - getDocTimestamp(b);
                return diff !== 0 ? diff : (a.id || '').localeCompare(b.id || '');
            }
            if (this.sortBy === 'title-asc') {
                return (a.title || '').localeCompare(b.title || '', 'vi');
            }
            if (this.sortBy === 'title-desc') {
                return (b.title || '').localeCompare(a.title || '', 'vi');
            }
            // 'date-desc' (Mặc định: Mới nhất trước)
            const diff = getDocTimestamp(b) - getDocTimestamp(a);
            return diff !== 0 ? diff : (b.id || '').localeCompare(a.id || '');
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
                        Thử điều chỉnh lại bộ lọc hoặc bấm nút <b class="text-indigo-600 font-semibold cursor-pointer" onclick="window.documentHub.openAddModal()">"+ Thêm tài liệu mới"</b> để tải tệp, liên kết hoặc dán thông báo vào kho.
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
                        <thead class="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 select-none">
                            <tr>
                                <th class="py-3 px-3 sm:px-4 cursor-pointer hover:bg-slate-100 hover:text-indigo-600 transition-colors" onclick="window.documentHub.toggleSort('title')" title="Bấm để sắp xếp theo tên tài liệu">
                                    <div class="flex items-center gap-1.5">
                                        <span>Tên Tài Liệu & Nội Dung</span>
                                        ${this.sortBy === 'title-asc' ? '<i data-lucide="arrow-up" class="w-3 h-3 text-indigo-600 inline"></i>' : (this.sortBy === 'title-desc' ? '<i data-lucide="arrow-down" class="w-3 h-3 text-indigo-600 inline"></i>' : '<i data-lucide="arrow-up-down" class="w-3 h-3 text-slate-400 opacity-60 inline"></i>')}
                                    </div>
                                </th>
                                <th class="py-3 px-2 sm:px-3 hidden sm:table-cell">Định Dạng</th>
                                <th class="py-3 px-2 sm:px-3 hidden md:table-cell">Phân Loại Danh Mục</th>
                                <th class="py-3 px-2 sm:px-3 hidden lg:table-cell">Dung Lượng / Nguồn</th>
                                <th class="py-3 px-2 sm:px-3 hidden sm:table-cell cursor-pointer hover:bg-slate-100 hover:text-indigo-600 transition-colors" onclick="window.documentHub.toggleSort('date')" title="Bấm để sắp xếp theo ngày cập nhật">
                                    <div class="flex items-center gap-1.5">
                                        <span>Cập Nhật</span>
                                        ${this.sortBy === 'date-asc' ? '<i data-lucide="arrow-up" class="w-3 h-3 text-indigo-600 inline"></i>' : (this.sortBy === 'date-desc' ? '<i data-lucide="arrow-down" class="w-3 h-3 text-indigo-600 inline"></i>' : '<i data-lucide="arrow-up-down" class="w-3 h-3 text-slate-400 opacity-60 inline"></i>')}
                                    </div>
                                </th>
                                <th class="py-3 px-3 sm:px-4 text-right">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${docs.map(doc => {
                                const badge = this.getFileBadge(doc.fileType, doc.type);
                                const isImage = doc.type === 'image' || ['png', 'jpg', 'jpeg', 'webp'].includes(doc.fileType);
                                const isVideo = doc.type === 'video' || doc.fileType === 'youtube';
                                const isNote = doc.type === 'note' || doc.fileType === 'note';
                                const displayDesc = doc.description || (isNote && doc.content ? doc.content.replace(/\s+/g, ' ').trim() : '');

                                return `
                                    <tr class="hover:bg-indigo-50/40 transition-colors group">
                                        <td class="py-2.5 sm:py-3 px-3 sm:px-4 max-w-[200px] sm:max-w-md cursor-pointer" onclick="window.documentHub.openDocument('${this.escapeHtml(this.escapeJs(doc.id))}')">
                                            <div class="flex items-start gap-2.5 sm:gap-3">
                                                <div class="w-8 h-8 rounded-lg ${badge.bg} ${badge.color} flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                                    ${badge.label}
                                                </div>
                                                <div class="min-w-0">
                                                    <div class="flex items-center gap-1.5">
                                                        <h5 class="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate text-xs sm:text-sm"
                                                            title="${this.escapeHtml(doc.title)}">
                                                            ${this.escapeHtml(doc.title)}
                                                        </h5>
                                                        ${doc.pinned ? `
                                                            <span class="text-amber-500 text-[10px]" title="Đang ghim ở mục Truy cập nhanh">⭐</span>
                                                        ` : ''}
                                                    </div>
                                                    ${displayDesc ? `
                                                        <p class="text-[11px] text-slate-400 truncate mt-0.5" title="${this.escapeHtml(displayDesc)}">
                                                            ${this.escapeHtml(displayDesc)}
                                                        </p>
                                                    ` : ''}
                                                    ${doc.tags && doc.tags.length > 0 ? `
                                                        <div class="hidden sm:flex flex-wrap gap-1 mt-1">
                                                            ${doc.tags.map(t => `<span class="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">#${this.escapeHtml(t)}</span>`).join('')}
                                                        </div>
                                                    ` : ''}
                                                </div>
                                            </div>
                                        </td>

                                        <td class="py-3 px-2 sm:px-3 hidden sm:table-cell">
                                            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${badge.bg} ${badge.color}">
                                                ${badge.fullName}
                                            </span>
                                        </td>

                                        <td class="py-3 px-2 sm:px-3 text-slate-600 font-medium hidden md:table-cell">
                                            ${this.escapeHtml(doc.category)}
                                        </td>

                                        <td class="py-3 px-2 sm:px-3 text-slate-500 font-mono text-[11px] hidden lg:table-cell">
                                            ${this.escapeHtml(doc.fileSize || (isNote ? 'Văn bản / Thông báo' : (doc.type === 'link' ? 'Cloud Link' : 'Tệp tải lên')))}
                                        </td>

                                        <td class="py-3 px-2 sm:px-3 text-slate-400 text-[11px] hidden sm:table-cell">
                                            ${this.escapeHtml(doc.updatedAt || 'Hôm nay')}
                                        </td>

                                        <td class="py-2.5 sm:py-3 px-3 sm:px-4 text-right">
                                            <div class="flex items-center justify-end gap-1">
                                                <button onclick="window.documentHub.openDocument('${this.escapeHtml(this.escapeJs(doc.id))}')"
                                                    class="px-2 sm:px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white text-xs font-bold transition-colors flex items-center gap-1"
                                                    title="${isNote ? 'Đọc nội dung thông báo' : 'Mở tài liệu'}">
                                                    <i data-lucide="${isImage ? 'eye' : (isVideo ? 'play' : (isNote ? 'book-open' : 'external-link'))}" class="w-3.5 h-3.5"></i>
                                                    <span class="hidden sm:inline">${isImage ? 'Xem' : (isVideo ? 'Phát' : (isNote ? 'Đọc' : 'Mở'))}</span>
                                                </button>

                                                ${isNote ? `
                                                    <button onclick="window.documentHub.copyNoteContent('${this.escapeHtml(this.escapeJs(doc.id))}')"
                                                        class="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Sao chép toàn bộ nội dung thông báo">
                                                        <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                                                    </button>
                                                ` : (doc.fileUrl ? `
                                                    <button onclick="window.documentHub.copyDocLink('${this.escapeHtml(this.escapeJs(doc.id))}')"
                                                        class="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors" title="Sao chép liên kết">
                                                        <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                                                    </button>
                                                ` : `
                                                    <button onclick="window.documentHub.downloadDocument('${this.escapeHtml(this.escapeJs(doc.id))}')"
                                                        class="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Tải về máy">
                                                        <i data-lucide="download" class="w-3.5 h-3.5"></i>
                                                    </button>
                                                `)}

                                                <button onclick="window.documentHub.openEditModal('${this.escapeHtml(this.escapeJs(doc.id))}')"
                                                    class="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Chỉnh sửa tài liệu">
                                                    <i data-lucide="edit-3" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i>
                                                </button>

                                                <button onclick="window.documentHub.togglePin('${this.escapeHtml(this.escapeJs(doc.id))}')"
                                                    class="p-1 sm:p-1.5 rounded-lg ${doc.pinned ? 'text-amber-500 hover:text-amber-600' : 'text-slate-300 hover:text-amber-500'} hover:bg-amber-50 transition-colors"
                                                    title="${doc.pinned ? 'Bỏ ghim' : 'Ghim lên đầu'}">
                                                    <i data-lucide="star" class="w-4 h-4 ${doc.pinned ? 'fill-amber-400 text-amber-500' : ''}"></i>
                                                </button>

                                                <button onclick="window.documentHub.deleteDocument('${this.escapeHtml(this.escapeJs(doc.id))}')"
                                                    class="p-1 sm:p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Xóa tài liệu">
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
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
                ${docs.map(doc => {
                    const badge = this.getFileBadge(doc.fileType, doc.type);
                    const isImage = doc.type === 'image' || ['png', 'jpg', 'jpeg', 'webp'].includes(doc.fileType);
                    const isVideo = doc.type === 'video' || doc.fileType === 'youtube';
                    const isNote = doc.type === 'note' || doc.fileType === 'note';

                    return `
                        <div class="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-4 sm:p-5 hover:shadow-lg hover:border-indigo-200 transition-all flex flex-col justify-between group">
                            <div>
                                <!-- Header Card -->
                                <div class="flex items-start justify-between gap-3 mb-3">
                                    <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${badge.bg} ${badge.color} flex items-center justify-center font-bold text-sm shadow-inner shrink-0">
                                        ${badge.label}
                                    </div>
                                    <div class="flex items-center gap-1">
                                        <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 truncate max-w-[140px]">
                                            ${this.escapeHtml(doc.category)}
                                        </span>
                                        <button onclick="window.documentHub.togglePin('${this.escapeHtml(this.escapeJs(doc.id))}')"
                                            class="p-1 rounded ${doc.pinned ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'} transition-colors"
                                            title="${doc.pinned ? 'Bỏ ghim' : 'Ghim lên đầu'}">
                                            <i data-lucide="star" class="w-3.5 h-3.5 ${doc.pinned ? 'fill-amber-400 text-amber-500' : ''}"></i>
                                        </button>
                                    </div>
                                </div>

                                <!-- Hình ảnh xem trước (nếu có) -->
                                ${isImage && (doc.thumbnail || doc.fileUrl) ? `
                                    <div class="w-full h-32 mb-3 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center cursor-pointer group-hover:opacity-95"
                                        onclick="window.documentHub.openDocument('${this.escapeHtml(this.escapeJs(doc.id))}')">
                                        <img src="${doc.thumbnail || doc.fileUrl}" alt="${this.escapeHtml(doc.title)}" class="w-full h-full object-cover">
                                    </div>
                                ` : ''}

                                <!-- Video banner (nếu là video) -->
                                ${isVideo ? `
                                    <div class="w-full h-24 mb-3 rounded-lg overflow-hidden bg-gradient-to-r from-rose-900 to-indigo-900 text-white flex items-center justify-center cursor-pointer relative"
                                        onclick="window.documentHub.openDocument('${this.escapeHtml(this.escapeJs(doc.id))}')">
                                        <div class="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-lg">
                                            <i data-lucide="play" class="w-5 h-5 fill-white ml-0.5"></i>
                                        </div>
                                        <span class="absolute bottom-1.5 right-2 text-[10px] bg-black/50 px-1.5 py-0.5 rounded">Video Demo</span>
                                    </div>
                                ` : ''}

                                <!-- Trích đoạn thông báo / ghi chú (nếu là note) -->
                                ${isNote && doc.content ? `
                                    <div class="w-full mb-3 rounded-lg bg-amber-50/70 border border-amber-200/80 p-2.5 text-[11px] text-slate-700 line-clamp-3 whitespace-pre-line leading-relaxed cursor-pointer hover:bg-amber-100/50 transition-colors"
                                        onclick="window.documentHub.openDocument('${this.escapeHtml(this.escapeJs(doc.id))}')" title="Bấm để đọc toàn bộ nội dung thông báo">
                                        ${this.escapeHtml(doc.content)}
                                    </div>
                                ` : ''}

                                <!-- Tiêu đề & Mô tả -->
                                <h4 class="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug cursor-pointer"
                                    onclick="window.documentHub.openDocument('${this.escapeHtml(this.escapeJs(doc.id))}')" title="${this.escapeHtml(doc.title)}">
                                    ${this.escapeHtml(doc.title)}
                                </h4>
                                <p class="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                                    ${this.escapeHtml(doc.description || (isNote ? 'Bấm để đọc chi tiết thông báo / tin nhắn' : 'Chưa có mô tả chi tiết'))}
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
                            <div class="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                                <span class="flex items-center gap-1 text-[11px]">
                                    <i data-lucide="clock" class="w-3.5 h-3.5"></i>
                                    ${this.escapeHtml(doc.updatedAt || 'Hôm nay')}
                                </span>

                                <div class="flex items-center gap-1.5">
                                    <button onclick="window.documentHub.openDocument('${this.escapeHtml(this.escapeJs(doc.id))}')"
                                        class="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 font-semibold text-xs transition-colors flex items-center gap-1"
                                        title="${isNote ? 'Đọc nội dung thông báo' : 'Mở / Xem tài liệu'}">
                                        <i data-lucide="${isImage ? 'eye' : (isVideo ? 'play' : (isNote ? 'book-open' : 'external-link'))}" class="w-3.5 h-3.5"></i>
                                        <span>${isImage ? 'Xem' : (isVideo ? 'Phát' : (isNote ? 'Đọc' : 'Mở'))}</span>
                                    </button>

                                    ${isNote ? `
                                        <button onclick="window.documentHub.copyNoteContent('${this.escapeHtml(this.escapeJs(doc.id))}')"
                                            class="p-1 sm:p-1.5 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Sao chép toàn bộ nội dung thông báo">
                                            <i data-lucide="copy" class="w-4 h-4"></i>
                                        </button>
                                    ` : (doc.fileUrl ? `
                                        <button onclick="window.documentHub.copyDocLink('${this.escapeHtml(this.escapeJs(doc.id))}')"
                                            class="p-1 sm:p-1.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors" title="Sao chép liên kết">
                                            <i data-lucide="copy" class="w-4 h-4"></i>
                                        </button>
                                    ` : `
                                        <button onclick="window.documentHub.downloadDocument('${this.escapeHtml(this.escapeJs(doc.id))}')"
                                            class="p-1 sm:p-1.5 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Tải về máy">
                                            <i data-lucide="download" class="w-4 h-4"></i>
                                        </button>
                                    `)}

                                    <button onclick="window.documentHub.openEditModal('${this.escapeHtml(this.escapeJs(doc.id))}')"
                                        class="p-1 sm:p-1.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Chỉnh sửa tài liệu">
                                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                                    </button>

                                    <button onclick="window.documentHub.deleteDocument('${this.escapeHtml(this.escapeJs(doc.id))}')"
                                        class="p-1 sm:p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Xóa tài liệu">
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
        if (ft === 'note' || type === 'note') {
            return { label: 'NOTE', fullName: 'Thông báo / Ghi chú', bg: 'bg-amber-100 text-amber-800', color: 'text-amber-800', border: 'border-amber-200', subtleBg: 'bg-amber-500/10' };
        }
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
        let docs = window.salesStore ? window.salesStore.getDocuments() : [];
        let doc = docs.find(d => d.id === id);
        if (!doc) {
            // Thử chờ một nhịp nếu trang vừa mở và Firestore đang đồng bộ danh sách tài liệu
            await new Promise(r => setTimeout(r, 600));
            docs = window.salesStore ? window.salesStore.getDocuments() : [];
            doc = docs.find(d => d.id === id);
        }
        if (!doc) return;

        if (doc.fileUrl && !this.isSafeResourceUrl(doc.fileUrl)) {
            window.salesApp.showNotification('Liên kết tài liệu không hợp lệ.', 'error');
            return;
        }
        // Nếu là Thông báo / Ghi chú văn bản (Note)
        if (doc.type === 'note' || doc.fileType === 'note') {
            this.openNotePreview(doc);
            return;
        }

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
            if (doc.thumbnail && !doc.hasCloudFile) {
                // Nếu máy khác chưa có file gốc nhưng có thumbnail ảnh thì ưu tiên thử lấy file gốc, nếu không có thì mở thumbnail
                const fileData = await this.getOrFetchFile(doc);
                if (fileData && fileData.blob) {
                    const objectUrl = URL.createObjectURL(fileData.blob);
                    this.openImagePreview(objectUrl, doc.title, doc.fileSize);
                } else {
                    this.openImagePreview(doc.thumbnail, doc.title, doc.fileSize);
                }
                return;
            }
            // Đọc từ IndexedDB hoặc tải tự động từ Cloud
            const fileData = await this.getOrFetchFile(doc);
            if (fileData && fileData.blob) {
                const objectUrl = URL.createObjectURL(fileData.blob);
                this.openImagePreview(objectUrl, doc.title, doc.fileSize);
            } else if (doc.thumbnail) {
                this.openImagePreview(doc.thumbnail, doc.title, doc.fileSize);
            } else {
                window.salesApp.showNotification('Tệp ảnh này đang ở trên thiết bị đã tải lên. Hãy mở lại trang trên máy tính một lần để tự động đồng bộ lên Cloud nhé!', 'info');
            }
            return;
        }

        // Nếu là video file tải lên
        if (doc.type === 'video' || ['mp4', 'webm', 'mov'].includes(doc.fileType)) {
            if (doc.fileUrl) {
                this.openVideoPreview(doc.fileUrl, doc.title);
                return;
            }
            const fileData = await this.getOrFetchFile(doc);
            if (fileData && fileData.blob) {
                const objectUrl = URL.createObjectURL(fileData.blob);
                this.openVideoPreview(objectUrl, doc.title);
            } else {
                window.salesApp.showNotification('Tệp video này đang ở trên thiết bị đã tải lên. Hãy mở lại trang trên máy tính một lần để đồng bộ lên Cloud nhé!', 'info');
            }
            return;
        }

        // Nếu là tài liệu PDF tải lên
        if (doc.fileType === 'pdf' && !doc.fileUrl) {
            this.openPdfDocument(doc);
            return;
        }

        // Nếu là tài liệu Word tải lên
        if (['doc', 'docx'].includes(doc.fileType) && !doc.fileUrl) {
            this.openWordDocument(doc);
            return;
        }

        // Nếu là bảng tính Excel tải lên
        if (['xls', 'xlsx', 'csv'].includes(doc.fileType) && !doc.fileUrl) {
            this.openExcelDocument(doc);
            return;
        }

        // Nếu là tệp file khác được tải lên
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

        if (doc.type === 'note' || doc.fileType === 'note') {
            this.copyNoteContent(id);
            return;
        }

        if (doc.fileUrl) {
            window.open(doc.fileUrl, '_blank');
            return;
        }

        const fileData = await this.getOrFetchFile(doc);
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
            window.salesApp.showNotification('Tệp này đang nằm trên máy tính đã tải lên. Hãy mở lại trang trên máy tính 1 lần để tự động đồng bộ lên Cloud nhé!', 'info');
        }
    }

    copyNoteContent(id) {
        const docs = window.salesStore.getDocuments();
        const doc = docs.find(d => d.id === id);
        if (!doc) return;

        const textToCopy = doc.content || doc.description || doc.title || '';
        if (!textToCopy) {
            window.salesApp.showNotification('Không có nội dung để sao chép!', 'error');
            return;
        }

        navigator.clipboard.writeText(textToCopy).then(() => {
            window.salesApp.showNotification('Đã sao chép toàn bộ nội dung thông báo!', 'success');
        }).catch(() => {
            prompt('Sao chép nội dung thông báo:', textToCopy);
        });
    }

    copyDocLink(id) {
        const docs = window.salesStore.getDocuments();
        const doc = docs.find(d => d.id === id);
        if (!doc) return;

        if (doc.type === 'note' || doc.fileType === 'note') {
            this.copyNoteContent(id);
            return;
        }

        if (doc.fileUrl) {
            navigator.clipboard.writeText(doc.fileUrl).then(() => {
                window.salesApp.showNotification('Đã sao chép liên kết tài liệu!', 'success');
            }).catch(() => {
                prompt('Liên kết tài liệu:', doc.fileUrl);
            });
        } else {
            window.salesApp.showNotification('Tệp này là tệp tải lên trực tiếp. Bạn hãy bấm "Tải về" để gửi tệp cho khách nhé!', 'info');
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
        if (!confirm('Chuyển tài liệu vào thùng rác? Bạn có thể khôi phục sau.')) return;
        try {
            await window.salesStore.deleteDocument(id);
            this.renderStats(); this.renderQuickAccess(); this.renderDocumentsList();
            window.salesApp.showNotification('Đã chuyển vào thùng rác; tệp đính kèm được giữ lại.', 'info');
        } catch (_) { window.salesApp.showNotification('Chưa chuyển được vào thùng rác. Hãy thử lại.', 'error'); }
    }
    async permanentlyDeleteDocument(id) {
        if (!confirm('Bạn có chắc chắn muốn xóa vĩnh viễn tài liệu này? Thao tác này không thể hoàn tác.')) return;
        try {
            await window.salesStore.permanentlyDeleteDocument(id);
            if (this.db) {
                try {
                    const tx = this.db.transaction(['files'], 'readwrite');
                    tx.objectStore('files').delete(id);
                } catch (_) {}
            }
            this.renderStats();
            this.renderQuickAccess();
            this.renderDocumentsList();
            this.showTrash();
            window.salesApp.showNotification('Đã xóa vĩnh viễn tài liệu.', 'info');
        } catch (err) {
            console.error('Lỗi khi xóa vĩnh viễn tài liệu:', err);
            window.salesApp.showNotification('Chưa xóa được tài liệu. Hãy thử lại.', 'error');
        }
    }
    showTrash() {
        let dialog = document.getElementById('document-trash-dialog');
        if (!dialog) {
            dialog = document.createElement('dialog');
            dialog.id = 'document-trash-dialog';
            dialog.className = 'fixed inset-0 m-auto z-50 p-0 rounded-2xl w-[92vw] max-w-lg bg-transparent shadow-none border-none overflow-hidden';
            dialog.onclick = (e) => {
                if (e.target === dialog) dialog.close();
            };
            document.body.append(dialog);
        } else {
            dialog.className = 'fixed inset-0 m-auto z-50 p-0 rounded-2xl w-[92vw] max-w-lg bg-transparent shadow-none border-none overflow-hidden';
            dialog.onclick = (e) => {
                if (e.target === dialog) dialog.close();
            };
        }
        dialog.replaceChildren();

        const docs = (window.salesStore?.getTrashedDocuments ? window.salesStore.getTrashedDocuments() : []) || [];

        const wrapper = document.createElement('div');
        wrapper.className = 'bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col max-h-[85vh] overflow-hidden';

        // Header
        const header = document.createElement('div');
        header.className = 'px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80';
        header.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-2xs shrink-0">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <h2 class="text-sm font-extrabold text-slate-900 tracking-tight">Thùng rác tài liệu</h2>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">${docs.length}</span>
                    </div>
                    <p class="text-[11px] text-slate-500 mt-0.5">Khôi phục tài liệu đã xóa về kho tài nguyên Sales</p>
                </div>
            </div>
            <button type="button" class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all" title="Đóng" aria-label="Đóng">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        `;
        const closeBtn = header.querySelector('button');
        closeBtn.onclick = () => dialog.close();
        wrapper.append(header);

        // Body
        const body = document.createElement('div');
        body.className = 'p-4 sm:p-5 overflow-y-auto space-y-2.5 max-h-[55vh] overscroll-contain';

        if (!docs.length) {
            const empty = document.createElement('div');
            empty.className = 'py-10 text-center flex flex-col items-center justify-center text-slate-400';
            empty.innerHTML = `
                <div class="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-2.5 text-slate-400">
                    <i data-lucide="archive" class="w-6 h-6"></i>
                </div>
                <p class="text-xs font-bold text-slate-700">Thùng rác trống</p>
                <p class="text-[11px] text-slate-400 mt-0.5">Chưa có tài liệu nào bị xóa gần đây.</p>
            `;
            body.append(empty);
        } else {
            for (const doc of docs) {
                const row = document.createElement('div');
                row.className = 'flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all';

                const left = document.createElement('div');
                left.className = 'flex items-center gap-3 min-w-0';

                const iconBox = document.createElement('div');
                iconBox.className = 'w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0';
                iconBox.innerHTML = '<i data-lucide="file-text" class="w-4 h-4"></i>';

                const textCol = document.createElement('div');
                textCol.className = 'min-w-0';

                const name = document.createElement('p');
                name.className = 'text-xs font-bold text-slate-800 truncate';
                name.textContent = doc.title || 'Tài liệu không tên';

                const sub = document.createElement('div');
                sub.className = 'flex items-center gap-2 text-[10px] text-slate-400 mt-0.5';
                const catBadge = document.createElement('span');
                catBadge.className = 'px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700 font-medium';
                catBadge.textContent = doc.category || 'Chung';
                sub.append(catBadge);
                if (doc.type) {
                    const typeSpan = document.createElement('span');
                    typeSpan.className = 'uppercase';
                    typeSpan.textContent = doc.type;
                    sub.append(typeSpan);
                }

                textCol.append(name, sub);
                left.append(iconBox, textCol);

                const actions = document.createElement('div');
                actions.className = 'flex items-center gap-1.5 shrink-0';

                const restore = document.createElement('button');
                restore.type = 'button';
                restore.setAttribute('aria-label', 'Khôi phục');
                restore.title = 'Khôi phục tài liệu';
                restore.className = 'w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border border-emerald-200 flex items-center justify-center transition-all shadow-2xs shrink-0 active:scale-95';
                restore.innerHTML = '<i data-lucide="rotate-ccw" class="w-4 h-4"></i>';
                restore.onclick = async () => {
                    restore.disabled = true;
                    try {
                        await window.salesStore.restoreDocument(doc.id);
                        this.renderStats();
                        this.renderQuickAccess();
                        this.renderDocumentsList();
                        this.showTrash();
                    } catch (_) {
                        restore.disabled = false;
                        window.salesApp.showNotification('Chưa khôi phục được. Hãy thử lại.', 'error');
                    }
                };

                const permDelete = document.createElement('button');
                permDelete.type = 'button';
                permDelete.setAttribute('aria-label', 'Xóa vĩnh viễn');
                permDelete.title = 'Xóa vĩnh viễn';
                permDelete.className = 'w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 flex items-center justify-center transition-all shadow-2xs shrink-0 active:scale-95';
                permDelete.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i>';
                permDelete.onclick = async () => {
                    permDelete.disabled = true;
                    try {
                        await this.permanentlyDeleteDocument(doc.id);
                    } finally {
                        permDelete.disabled = false;
                    }
                };

                actions.append(restore, permDelete);
                row.append(left, actions);
                body.append(row);
            }
        }
        wrapper.append(body);

        // Footer
        const footer = document.createElement('div');
        footer.className = 'px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs';
        footer.innerHTML = '<span class="text-[11px] text-slate-400">Tài liệu trong thùng rác không hiển thị ở màn hình chính.</span>';

        const closeBtnBottom = document.createElement('button');
        closeBtnBottom.type = 'button';
        closeBtnBottom.className = 'px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 transition-colors';
        closeBtnBottom.textContent = 'Đóng';
        closeBtnBottom.onclick = () => dialog.close();
        footer.append(closeBtnBottom);
        wrapper.append(footer);

        dialog.append(wrapper);
        if (window.lucide) lucide.createIcons();
        if (!dialog.open) dialog.showModal();
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

        const noteContentInput = document.getElementById('new-doc-content');
        if (noteContentInput) {
            noteContentInput.addEventListener('paste', () => {
                setTimeout(() => {
                    this.autoSuggestTitleFromNote(noteContentInput.value);
                }, 50);
            });
        }
    }

    autoSuggestTitleFromNote(text) {
        const titleInput = document.getElementById('new-doc-title');
        if (!titleInput || titleInput.value.trim()) return;
        const firstLine = (text || '')
            .split(/\r?\n/)
            .map(l => l.trim())
            .find(l => l.length > 0);
        if (firstLine) {
            titleInput.value = firstLine.length > 75 ? firstLine.substring(0, 75) + '...' : firstLine;
        }
    }

    async pasteFromClipboardToNote() {
        const noteContentInput = document.getElementById('new-doc-content');
        if (!noteContentInput) return;
        try {
            const text = await navigator.clipboard.readText();
            if (text && text.trim()) {
                noteContentInput.value = text;
                this.autoSuggestTitleFromNote(text);
                noteContentInput.focus();
                window.salesApp.showNotification('Đã dán nội dung từ Clipboard!', 'success');
            } else {
                window.salesApp.showNotification('Clipboard hiện đang trống!', 'info');
            }
        } catch (err) {
            noteContentInput.focus();
            window.salesApp.showNotification('Hãy nhấn Ctrl+V (hoặc chạm giữ -> Dán) vào ô nội dung nhé!', 'info');
        }
    }

    switchModalTab(tab) {
        this.activeModalTab = tab;
        const tabUpload = document.getElementById('modal-tab-upload');
        const tabLink = document.getElementById('modal-tab-link');
        const tabNote = document.getElementById('modal-tab-note');
        const sectionUpload = document.getElementById('modal-section-upload');
        const sectionLink = document.getElementById('modal-section-link');
        const sectionNote = document.getElementById('modal-section-note');

        const activeClass = "px-2 py-2 text-xs font-bold rounded-lg bg-white text-indigo-600 shadow-sm border border-slate-200 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap";
        const inactiveClass = "px-2 py-2 text-xs font-semibold rounded-lg text-slate-500 hover:text-slate-900 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap";

        if (tabUpload) tabUpload.className = tab === 'upload' ? activeClass : inactiveClass;
        if (tabLink) tabLink.className = tab === 'link' ? activeClass : inactiveClass;
        if (tabNote) tabNote.className = tab === 'note' ? activeClass : inactiveClass;

        if (sectionUpload) sectionUpload.classList.toggle('hidden', tab !== 'upload');
        if (sectionLink) sectionLink.classList.toggle('hidden', tab !== 'link');
        if (sectionNote) sectionNote.classList.toggle('hidden', tab !== 'note');
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
            if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'mp4', 'webm'].includes(ext)) {
                if (this.selectedModalCategory === 'Báo giá & Mẫu biểu' || (!this.selectedModalCategory && this.getCategories()[1]?.name === 'Báo giá & Mẫu biểu')) {
                    this.selectModalCategory('Salekit & Giới thiệu');
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

    // ==========================================
    // DROPDOWN PHÂN LOẠI DANH MỤC (STYLE CALLBOT HUB PASTEL + QUẢN LÝ DANH MỤC TRONG DROPDOWN)
    // ==========================================
    renderModalCategoryDropdown(selectedValue = null) {
        const wrapper = document.getElementById('doc-modal-cat-dropdown-wrapper');
        if (!wrapper) return;

        const categories = window.salesStore.getDocumentCategories();
        if (!categories || categories.length === 0) {
            categories.push({ id: 'cat-default', name: 'Báo giá & Mẫu biểu', icon: 'file-text' });
        }

        if (selectedValue) {
            this.selectedModalCategory = selectedValue;
        } else if (!this.selectedModalCategory) {
            const hiddenVal = document.getElementById('new-doc-category')?.value;
            if (hiddenVal && categories.some(c => c.name === hiddenVal)) {
                this.selectedModalCategory = hiddenVal;
            } else {
                this.selectedModalCategory = categories[0]?.name || 'Báo giá & Mẫu biểu';
            }
        } else {
            // Kiểm tra xem danh mục hiện tại còn tồn tại trong kho không
            if (!categories.some(c => c.name === this.selectedModalCategory)) {
                this.selectedModalCategory = categories[0]?.name || 'Báo giá & Mẫu biểu';
            }
        }

        const currentCat = categories.find(c => c.name === this.selectedModalCategory) || categories[0];
        const currentIcon = currentCat ? (currentCat.icon || 'folder') : 'folder';
        const currentName = currentCat ? currentCat.name : this.selectedModalCategory;

        wrapper.innerHTML = `
            <input type="hidden" id="new-doc-category" value="${this.escapeHtml(currentName)}">
            <button type="button" onclick="window.documentHub.toggleModalCategoryDropdown(event)"
                class="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl shadow-2xs hover:border-indigo-300 transition-all focus:outline-none">
                <div class="flex items-center gap-2 truncate">
                    <div class="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <i data-lucide="${currentIcon}" class="w-3.5 h-3.5"></i>
                    </div>
                    <span class="truncate">${this.escapeHtml(currentName)}</span>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${this.isModalCatDropdownOpen ? 'rotate-180' : ''}"></i>
                </div>
            </button>

            <!-- Dropdown Menu -->
            <div class="${this.isModalCatDropdownOpen ? '' : 'hidden'} absolute left-0 right-0 top-full mt-1.5 z-50 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto no-scrollbar">
                ${categories.map(cat => {
                    const isSelected = (cat.name === currentName);
                    return `
                        <button type="button" onclick="window.documentHub.selectModalCategory('${this.escapeJs(cat.name)}')"
                            class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-800 font-bold' : 'text-slate-700 hover:bg-slate-100 font-medium'}">
                            <span class="flex items-center gap-2 truncate">
                                <i data-lucide="${cat.icon || 'folder'}" class="w-3.5 h-3.5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}"></i>
                                <span class="truncate">${this.escapeHtml(cat.name)}</span>
                            </span>
                            ${cat.pinned ? '<span class="text-[10px] text-amber-500 font-mono">⭐</span>' : ''}
                        </button>
                    `;
                }).join('')}

                <!-- Action Quản lý danh mục ở dòng cuối theo yêu cầu đồng bộ với ngành nghề -->
                <div class="border-t border-slate-100 my-1 pt-1"></div>
                <button type="button" onclick="window.documentHub.openCategoryManagerFromDropdown()"
                    class="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 transition-colors">
                    <span class="flex items-center gap-2">
                        <i data-lucide="settings-2" class="w-3.5 h-3.5 text-indigo-600"></i>
                        <span>Quản lý danh mục...</span>
                    </span>
                    <i data-lucide="chevron-right" class="w-3.5 h-3.5 text-indigo-400"></i>
                </button>
            </div>
        `;

        if (window.lucide) lucide.createIcons();
    }

    toggleModalCategoryDropdown(e) {
        if (e) e.stopPropagation();
        this.isModalCatDropdownOpen = !this.isModalCatDropdownOpen;
        this.renderModalCategoryDropdown();
    }

    selectModalCategory(catName) {
        this.selectedModalCategory = catName;
        this.isModalCatDropdownOpen = false;
        this.renderModalCategoryDropdown(catName);
    }

    openCategoryManagerFromDropdown() {
        this.isModalCatDropdownOpen = false;
        this.renderModalCategoryDropdown();
        this.openCategoryManagerModal();
    }

    updateCategorySelectOptions(selectedValue = null) {
        this.renderModalCategoryDropdown(selectedValue);
    }

    openCategoryManagerModal() {
        const modal = document.getElementById('category-manager-modal');
        if (!modal) return;
        this.cancelEditCategoryInManager();
        this.renderCategoryManagerList();
        modal.classList.remove('hidden');
        lucide.createIcons();
    }

    closeCategoryManagerModal() {
        const modal = document.getElementById('category-manager-modal');
        if (modal) modal.classList.add('hidden');
        this.cancelEditCategoryInManager();
        this.renderModalCategoryDropdown();
    }

    getCuratedCategoryIcons() {
        return [
            { id: 'folder', name: 'Thư mục chung' },
            { id: 'folder-heart', name: 'Yêu thích' },
            { id: 'folder-kanban', name: 'Dự án' },
            { id: 'folder-check', name: 'Duyệt / Hoàn tất' },
            { id: 'file-text', name: 'Tài liệu / PDF' },
            { id: 'file-spreadsheet', name: 'Bảng tính Excel' },
            { id: 'file-check', name: 'Hợp đồng & Pháp lý' },
            { id: 'video', name: 'Video hướng dẫn' },
            { id: 'play-circle', name: 'Demo / Clip' },
            { id: 'users', name: 'Nhân sự / HR / Team' },
            { id: 'headphones', name: 'CSKH / Hỗ trợ' },
            { id: 'dollar-sign', name: 'Bảng giá / Cước' },
            { id: 'badge-percent', name: 'Hoa hồng / Chiết khấu' },
            { id: 'sparkles', name: 'Salekit / Giới thiệu' },
            { id: 'book-open', name: 'Đào tạo / Hướng dẫn' },
            { id: 'graduation-cap', name: 'Giáo trình / Học' },
            { id: 'shield-check', name: 'Chính sách / Bảo mật' },
            { id: 'briefcase', name: 'Hồ sơ / Doanh nghiệp' },
            { id: 'trending-up', name: 'Báo cáo / Doanh số' },
            { id: 'award', name: 'Chứng nhận' },
            { id: 'layers', name: 'Tổng hợp' },
            { id: 'cpu', name: 'Kỹ thuật / Thiết bị' },
            { id: 'wrench', name: 'Cài đặt' },
            { id: 'megaphone', name: 'Thông báo' },
            { id: 'bookmark', name: 'Quan trọng' },
            { id: 'star', name: 'Nổi bật' },
            { id: 'boxes', name: 'Gói sản phẩm' },
            { id: 'clipboard-list', name: 'Biểu mẫu' },
            { id: 'compass', name: 'Định hướng' }
        ];
    }

    renderAddIconPickerGrid() {
        const grid = document.getElementById('add-icon-grid');
        if (!grid) return;
        const icons = this.getCuratedCategoryIcons();
        grid.innerHTML = icons.map(ic => `
            <button type="button" onclick="window.documentHub.selectAddIcon('${ic.id}')"
                class="p-2 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 flex flex-col items-center justify-center gap-1 transition-all ${this.selectedNewCategoryIcon === ic.id ? 'ring-2 ring-indigo-500 bg-indigo-50 text-indigo-700 border-indigo-400 font-bold' : ''}"
                title="${ic.name}">
                <i data-lucide="${ic.id}" class="w-4 h-4"></i>
            </button>
        `).join('');
        lucide.createIcons();
    }

    handleCategoryNameInput(value) {
        if (this.userPickedAddIcon) return; // Nếu người dùng đã tự bấm chọn icon riêng, không tự động ghi đè
        if (typeof detectCategoryIcon === 'function') {
            const detected = detectCategoryIcon(value);
            this.selectedNewCategoryIcon = detected;
            this.updateAddIconPreview(detected);
        }
    }

    updateAddIconPreview(iconName) {
        const btn = document.getElementById('new-category-icon-btn');
        if (btn) {
            btn.innerHTML = `
                <i id="new-category-icon-preview" data-lucide="${iconName}" class="w-4 h-4"></i>
                <i data-lucide="chevron-down" class="w-3 h-3 text-slate-400"></i>
            `;
            lucide.createIcons();
        }
    }

    toggleAddIconPicker() {
        const picker = document.getElementById('new-category-icon-picker');
        if (!picker) return;
        picker.classList.toggle('hidden');
        if (!picker.classList.contains('hidden')) {
            this.renderAddIconPickerGrid();
        }
    }

    selectAddIcon(iconName) {
        this.selectedNewCategoryIcon = iconName;
        this.userPickedAddIcon = true;
        this.updateAddIconPreview(iconName);
        const picker = document.getElementById('new-category-icon-picker');
        if (picker) picker.classList.add('hidden');
    }

    openIconPickerForCategory(catId) {
        this.activeCategoryForIconPicker = catId;
        const modal = document.getElementById('category-icon-picker-modal');
        const titleEl = document.getElementById('picker-category-name');
        const grid = document.getElementById('category-icons-grid');
        if (!modal || !grid) return;

        const categories = window.salesStore.getDocumentCategories();
        const cat = categories.find(c => c.id === catId);
        if (!cat) return;

        if (titleEl) titleEl.textContent = `Đổi biểu tượng: ${this.escapeHtml(cat.name)}`;

        const icons = this.getCuratedCategoryIcons();
        grid.innerHTML = icons.map(ic => `
            <button type="button" onclick="window.documentHub.applyIconToCategory('${this.escapeHtml(this.escapeJs(cat.id))}', '${ic.id}')"
                class="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 flex flex-col items-center justify-center gap-1.5 transition-all group ${cat.icon === ic.id ? 'ring-2 ring-indigo-500 bg-indigo-50 text-indigo-700 font-bold border-indigo-400' : ''}"
                title="${ic.name}">
                <i data-lucide="${ic.id}" class="w-5 h-5 group-hover:scale-110 transition-transform"></i>
                <span class="text-[9px] truncate max-w-full text-slate-500">${ic.name.split('/')[0].trim()}</span>
            </button>
        `).join('');

        modal.classList.remove('hidden');
        lucide.createIcons();
    }

    closeCategoryIconPicker() {
        const modal = document.getElementById('category-icon-picker-modal');
        if (modal) modal.classList.add('hidden');
        this.activeCategoryForIconPicker = null;
    }

    applyIconToCategory(catId, iconName) {
        const categories = window.salesStore.getDocumentCategories();
        const cat = categories.find(c => c.id === catId);
        if (!cat) return;

        cat.icon = iconName;
        window.salesStore.saveDocumentCategory(cat);

        this.renderCategoryManagerList();
        this.renderCategoryPills();
        this.renderQuickAccess();
        this.closeCategoryIconPicker();

        window.salesApp.showNotification(`Đã cập nhật biểu tượng mới cho "${this.escapeHtml(cat.name)}"!`, 'success');
    }

    randomizeCategoryIcon() {
        if (!this.activeCategoryForIconPicker) return;
        const icons = this.getCuratedCategoryIcons();
        const randomIcon = icons[Math.floor(Math.random() * icons.length)];
        this.applyIconToCategory(this.activeCategoryForIconPicker, randomIcon.id);
    }

    renderCategoryManagerList() {
        const container = document.getElementById('category-manager-list');
        const totalCountEl = document.getElementById('cat-manager-total-count');
        if (!container) return;

        const categories = window.salesStore.getDocumentCategories();
        const docs = window.salesStore.getDocuments();

        if (totalCountEl) totalCountEl.textContent = categories.length;

        if (categories.length === 0) {
            container.innerHTML = '<div class="py-6 text-center text-slate-400 text-xs">Chưa có danh mục nào. Hãy thêm danh mục đầu tiên bên trên!</div>';
            return;
        }

        container.innerHTML = categories.map(cat => {
            const count = docs.filter(d => d.category === cat.name || d.category === cat.id).length;
            const isPinned = cat.pinned === true;
            return `
                <div class="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-indigo-200 transition-all group">
                    <div class="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                        <button type="button" onclick="window.documentHub.openIconPickerForCategory('${this.escapeHtml(this.escapeJs(cat.id))}')"
                            class="w-8 h-8 rounded-lg ${isPinned ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'} hover:ring-2 hover:ring-indigo-300 hover:scale-105 flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-2xs"
                            title="Bấm để đổi biểu tượng cho danh mục này">
                            <i data-lucide="${cat.icon || 'folder'}" class="w-4 h-4"></i>
                        </button>
                        <div class="min-w-0">
                            <p class="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                                <span>${this.escapeHtml(cat.name)}</span>
                                ${isPinned ? `<span class="px-1.5 py-0.5 bg-amber-100 text-amber-700 font-bold text-[9px] rounded-full inline-flex items-center gap-0.5">⭐ Ghim</span>` : ''}
                            </p>
                            <span class="text-[10px] text-slate-400 font-mono">${count} tài liệu • Bấm icon để đổi</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                        <button type="button" onclick="window.documentHub.toggleCategoryPin('${this.escapeHtml(this.escapeJs(cat.id))}')"
                            class="p-1.5 rounded-lg transition-colors ${isPinned ? 'text-amber-500 hover:text-amber-600 bg-amber-50' : 'text-slate-300 hover:text-amber-500 hover:bg-slate-100'}"
                            title="${isPinned ? 'Bỏ ghim khỏi mục Truy cập nhanh' : 'Ghim danh mục lên mục Truy cập nhanh'}">
                            <i data-lucide="star" class="w-4 h-4 ${isPinned ? 'fill-amber-400 text-amber-500' : ''}"></i>
                        </button>
                        <button type="button" onclick="window.documentHub.editCategoryInManager('${this.escapeHtml(this.escapeJs(cat.id))}')"
                            class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Chỉnh sửa danh mục">
                            <i data-lucide="edit-2" class="w-4 h-4"></i>
                        </button>
                        <button type="button" onclick="window.documentHub.deleteCategory('${this.escapeHtml(this.escapeJs(cat.id))}')"
                            class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Xóa danh mục">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        lucide.createIcons();
    }

    toggleCategoryPin(catId) {
        const isPinned = window.salesStore.toggleCategoryPin(catId);
        const cat = this.getCategories().find(c => c.id === catId);
        const catName = cat ? cat.name : 'Danh mục';

        this.renderCategoryPills();
        this.renderCategoryManagerList();
        this.renderQuickAccess();

        const msg = isPinned
            ? `⭐ Đã ghim danh mục "${catName}" vào mục Truy Cập Nhanh!`
            : `Đã bỏ ghim danh mục "${catName}" khỏi mục Truy Cập Nhanh.`;
        window.salesApp.showNotification(msg, 'success');
    }

    editCategoryInManager(catId) {
        const categories = window.salesStore.getDocumentCategories();
        const cat = categories.find(c => c.id === catId);
        if (!cat) return;

        const idInput = document.getElementById('edit-category-id');
        const nameInput = document.getElementById('new-category-name-input');
        const pinnedCheck = document.getElementById('new-category-pinned-check');
        const formTitle = document.getElementById('cat-mgr-form-title');
        const submitBtn = document.getElementById('cat-mgr-submit-btn');
        const cancelBtn = document.getElementById('cat-mgr-cancel-edit-btn');

        if (idInput) idInput.value = cat.id;
        if (nameInput) nameInput.value = cat.name || '';
        if (pinnedCheck) pinnedCheck.checked = Boolean(cat.pinned);

        this.selectedNewCategoryIcon = cat.icon || 'folder';
        this.userPickedAddIcon = true;
        this.updateAddIconPreview(this.selectedNewCategoryIcon);

        if (formTitle) formTitle.textContent = `Chỉnh sửa: ${this.escapeHtml(cat.name)}`;
        if (submitBtn) {
            submitBtn.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5"></i><span>Cập nhật</span>`;
        }
        if (cancelBtn) cancelBtn.classList.remove('hidden');

        if (nameInput) nameInput.focus();
        lucide.createIcons();
    }

    cancelEditCategoryInManager() {
        const idInput = document.getElementById('edit-category-id');
        const nameInput = document.getElementById('new-category-name-input');
        const pinnedCheck = document.getElementById('new-category-pinned-check');
        const formTitle = document.getElementById('cat-mgr-form-title');
        const submitBtn = document.getElementById('cat-mgr-submit-btn');
        const cancelBtn = document.getElementById('cat-mgr-cancel-edit-btn');
        const picker = document.getElementById('new-category-icon-picker');

        if (idInput) idInput.value = '';
        if (nameInput) nameInput.value = '';
        if (pinnedCheck) pinnedCheck.checked = false;
        if (picker) picker.classList.add('hidden');

        this.userPickedAddIcon = false;
        this.selectedNewCategoryIcon = 'folder';
        this.updateAddIconPreview('folder');

        if (formTitle) formTitle.textContent = 'Thêm danh mục mới';
        if (submitBtn) {
            submitBtn.innerHTML = `<i data-lucide="plus" class="w-3.5 h-3.5"></i><span>Thêm</span>`;
        }
        if (cancelBtn) cancelBtn.classList.add('hidden');
        lucide.createIcons();
    }

    handleAddNewCategory(event) {
        event.preventDefault();
        const idInput = document.getElementById('edit-category-id');
        const editingCatId = idInput ? idInput.value.trim() : '';
        const input = document.getElementById('new-category-name-input');
        const pinnedCheck = document.getElementById('new-category-pinned-check');
        if (!input) return;
        const name = input.value.trim();
        if (!name) return;

        const currentCats = window.salesStore.getDocumentCategories();
        const isPinned = Boolean(pinnedCheck && pinnedCheck.checked);
        const assignedIcon = this.selectedNewCategoryIcon || (typeof detectCategoryIcon === 'function' ? detectCategoryIcon(name) : 'folder');

        if (editingCatId) {
            const cat = currentCats.find(c => c.id === editingCatId);
            if (!cat) {
                this.cancelEditCategoryInManager();
                return;
            }
            if (currentCats.some(c => c.id !== editingCatId && c.name.toLowerCase() === name.toLowerCase())) {
                window.salesApp.showNotification(`Danh mục "${name}" đã tồn tại! Vui lòng chọn tên khác.`, 'warning');
                return;
            }

            const oldName = cat.name;
            cat.name = name;
            cat.icon = assignedIcon;
            cat.pinned = isPinned;
            window.salesStore.saveDocumentCategory(cat);

            // Tự động đồng bộ tên danh mục sang các tài liệu đang thuộc danh mục cũ
            if (oldName !== name) {
                const docs = window.salesStore.getDocuments();
                docs.forEach(d => {
                    if (d.category === oldName) {
                        d.category = name;
                        window.salesStore.saveDocument(d);
                    }
                });
                if (this.selectedCategory === oldName) {
                    this.selectedCategory = name;
                }
                if (this.selectedModalCategory === oldName) {
                    this.selectedModalCategory = name;
                }
            }

            this.cancelEditCategoryInManager();
            this.renderCategoryManagerList();
            this.renderCategoryPills();
            this.updateCategorySelectOptions(name);
            this.renderDocumentsList();
            this.renderQuickAccess();

            window.salesApp.showNotification(`Đã cập nhật danh mục "${name}"!`, 'success');
            return;
        }

        if (currentCats.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            window.salesApp.showNotification(`Danh mục "${name}" đã tồn tại! Vui lòng chọn tên khác.`, 'warning');
            return;
        }

        const newCat = {
            id: 'cat-' + Date.now(),
            name: name,
            icon: assignedIcon,
            pinned: isPinned
        };

        window.salesStore.saveDocumentCategory(newCat);
        this.cancelEditCategoryInManager();

        this.renderCategoryManagerList();
        this.renderCategoryPills();
        this.updateCategorySelectOptions(name);
        this.renderQuickAccess();

        window.salesApp.showNotification(`Đã thêm danh mục mới: "${name}"${isPinned ? ' (đã ghim ⭐)' : ''}!`, 'success');
    }

    promptRenameCategory(catId) {
        this.editCategoryInManager(catId);
    }

    deleteCategory(catId) {
        const categories = window.salesStore.getDocumentCategories();
        const cat = categories.find(c => c.id === catId);
        if (!cat) return;

        const docs = window.salesStore.getDocuments();
        const affectedDocs = docs.filter(d => d.category === cat.name || d.category === cat.id);

        if (affectedDocs.length > 0) {
            const confirmed = confirm(
                `Danh mục "${this.escapeHtml(cat.name)}" hiện đang có ${affectedDocs.length} tài liệu.\n` +
                `Nếu bạn xóa, các tài liệu này sẽ tự động chuyển về danh mục "Chung / Khác".\n\n` +
                `Bạn có chắc chắn muốn xóa không?`
            );
            if (!confirmed) return;

            // Đổi danh mục tài liệu sang "Chung"
            affectedDocs.forEach(d => {
                d.category = 'Chung';
                window.salesStore.saveDocument(d);
            });
        } else {
            const confirmed = confirm(`Bạn có chắc muốn xóa danh mục "${this.escapeHtml(cat.name)}" khỏi hệ thống?`);
            if (!confirmed) return;
        }

        window.salesStore.deleteDocumentCategory(catId);

        if (this.selectedCategory === cat.id || this.selectedCategory === cat.name) {
            this.selectedCategory = 'all';
        }

        this.cancelEditCategoryInManager();
        this.renderCategoryManagerList();
        this.renderCategoryPills();
        this.updateCategorySelectOptions();
        this.renderDocumentsList();
        this.renderQuickAccess();

        window.salesApp.showNotification(`Đã xóa danh mục "${this.escapeHtml(cat.name)}"!`, 'info');
    }

    openAddModal(defaultTab = null) {
        const form = document.getElementById('document-add-form');
        if (form) form.reset();

        const idInput = document.getElementById('editing-doc-id');
        if (idInput) idInput.value = '';

        const noteContentInput = document.getElementById('new-doc-content');
        if (noteContentInput) noteContentInput.value = '';

        const titleText = document.getElementById('doc-modal-title-text');
        if (titleText) titleText.textContent = 'Thêm Tài Nguyên Sales Mới';

        const subTitle = document.getElementById('doc-modal-subtitle');
        if (subTitle) subTitle.textContent = 'Tải tệp từ máy tính, lưu liên kết Cloud hoặc dán văn bản thông báo / tin nhắn.';

        const submitText = document.getElementById('doc-modal-submit-text');
        if (submitText) submitText.textContent = 'Lưu Vào Kho Tài Nguyên';

        this.selectedModalCategory = null;
        this.isModalCatDropdownOpen = false;
        this.updateCategorySelectOptions();

        this.clearSelectedFile();
        const initialTab = defaultTab || (this.selectedType === 'note' ? 'note' : (this.selectedType === 'link' ? 'link' : 'upload'));
        this.switchModalTab(initialTab);

        const modal = document.getElementById('document-add-modal');
        if (modal) modal.classList.remove('hidden');
        lucide.createIcons();
    }

    openEditModal(id) {
        const docs = window.salesStore.getDocuments();
        const doc = docs.find(d => d.id === id);
        if (!doc) return;

        const form = document.getElementById('document-add-form');
        if (form) form.reset();

        const idInput = document.getElementById('editing-doc-id');
        if (idInput) idInput.value = doc.id;

        const titleText = document.getElementById('doc-modal-title-text');
        if (titleText) titleText.textContent = 'Chỉnh Sửa Tài Liệu';

        const subTitle = document.getElementById('doc-modal-subtitle');
        if (subTitle) subTitle.textContent = 'Cập nhật tên, danh mục, nội dung thông báo, liên kết hoặc mô tả.';

        const submitText = document.getElementById('doc-modal-submit-text');
        if (submitText) submitText.textContent = 'Lưu Thay Đổi';

        this.isModalCatDropdownOpen = false;
        this.updateCategorySelectOptions(doc.category);

        // Điền dữ liệu cũ vào form
        const titleInput = document.getElementById('new-doc-title');
        if (titleInput) titleInput.value = doc.title || '';

        const descInput = document.getElementById('new-doc-desc');
        if (descInput) descInput.value = doc.description || '';

        const tagsInput = document.getElementById('new-doc-tags');
        if (tagsInput) tagsInput.value = (doc.tags || []).join(', ');

        const pinnedInput = document.getElementById('new-doc-pinned');
        if (pinnedInput) pinnedInput.checked = Boolean(doc.pinned);

        this.clearSelectedFile();

        if (doc.type === 'note' || doc.fileType === 'note') {
            this.switchModalTab('note');
            const noteContentInput = document.getElementById('new-doc-content');
            if (noteContentInput) noteContentInput.value = doc.content || doc.description || '';
        } else if (doc.type === 'link' || doc.fileUrl) {
            this.switchModalTab('link');
            const urlInput = document.getElementById('new-doc-url');
            if (urlInput) urlInput.value = doc.fileUrl || '';
        } else {
            this.switchModalTab('upload');
            const dropContent = document.getElementById('doc-dropzone-content');
            const filePreview = document.getElementById('doc-selected-file-preview');
            const fileNameEl = document.getElementById('doc-selected-filename');
            const fileSizeEl = document.getElementById('doc-selected-filesize');
            if (dropContent && filePreview) {
                dropContent.classList.add('hidden');
                filePreview.classList.remove('hidden');
                if (fileNameEl) fileNameEl.textContent = doc.fileName || doc.title;
                if (fileSizeEl) fileSizeEl.textContent = `${doc.fileSize || ''} (Tệp hiện tại - Chọn tệp mới nếu muốn thay thế)`;
            }
        }

        const modal = document.getElementById('document-add-modal');
        if (modal) modal.classList.remove('hidden');
        lucide.createIcons();
    }

    closeModal() {
        const modal = document.getElementById('document-add-modal');
        if (modal) modal.classList.add('hidden');
        const form = document.getElementById('document-add-form');
        if (form) form.reset();
        this.clearSelectedFile();
        this.isModalCatDropdownOpen = false;
        const idInput = document.getElementById('editing-doc-id');
        if (idInput) idInput.value = '';
    }

    async saveNewDocument(event) {
        event.preventDefault();

        const editingId = document.getElementById('editing-doc-id') ? document.getElementById('editing-doc-id').value : '';
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

        const nowTs = Date.now();
        const todayStr = new Date().toISOString().split('T')[0];

        const docs = window.salesStore.getDocuments();
        const existingDoc = editingId ? docs.find(d => d.id === editingId) : null;
        const docId = existingDoc ? existingDoc.id : ('doc-user-' + nowTs);

        let targetDoc = existingDoc ? { ...existingDoc } : {
            id: docId,
            createdAt: nowTs
        };

        targetDoc.title = title;
        targetDoc.category = category;
        targetDoc.description = desc;
        targetDoc.tags = tags;
        targetDoc.pinned = isPinned;
        targetDoc.updatedAt = todayStr;
        targetDoc.updatedAtTime = nowTs;

        if (this.activeModalTab === 'upload') {
            if (this.selectedUploadFile) {
                const file = this.selectedUploadFile;
                const ext = file.name.split('.').pop().toLowerCase();

                // Kiểm tra giới hạn dung lượng tối đa 35MB để đồng bộ Cloud
                const MAX_FILE_SIZE = 35 * 1024 * 1024;
                if (file.size > MAX_FILE_SIZE) {
                    alert(`Tệp "${file.name}" có dung lượng ${(file.size / 1024 / 1024).toFixed(1)}MB, vượt quá mức tối đa 35MB cho phép đồng bộ trực tiếp lên Cloud.\n\nĐể ứng viên và nhân sự mở nhanh trên mọi thiết bị, vui lòng nén tệp nhỏ hơn 35MB hoặc tải lên Google Drive / OneDrive rồi dán link vào tab "Liên kết Cloud"!`);
                    return;
                }

                let type = 'file';
                if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) {
                    type = 'image';
                } else if (['mp4', 'webm', 'mov'].includes(ext)) {
                    type = 'video';
                }

                targetDoc.type = type;
                targetDoc.fileType = ext;
                targetDoc.fileName = file.name;
                targetDoc.fileSize = this.formatFileSize(file.size);
                targetDoc.mimeType = file.type || (ext === 'pdf' ? 'application/pdf' : '');
                delete targetDoc.fileUrl;
                delete targetDoc.content;

                if (type === 'image') {
                    try {
                        targetDoc.thumbnail = await this.createImageThumbnail(file);
                    } catch (e) {}
                }

                await this.fileStore.saveFile(docId, file);

                // Đồng bộ tệp tải lên sang Firebase Cloud để điện thoại / thiết bị khác mở được ngay
                if (window.salesApp?.showNotification) {
                    window.salesApp.showNotification(`Đang đồng bộ tệp "${targetDoc.title}" lên Cloud...`, 'info');
                }
                this.uploadFileToCloud(docId, file, file.name, targetDoc.mimeType)
                    .then(ok => {
                        if (ok && window.salesApp?.showNotification) {
                            window.salesApp.showNotification(`Đã đồng bộ tệp "${targetDoc.title}" lên Cloud thành công! Người khác có thể xem trực tiếp.`, 'success');
                        }
                    })
                    .catch(err => {
                        console.warn('Cloud file sync warning:', err);
                    });
            } else if (!existingDoc) {
                alert('Vui lòng chọn tệp từ máy tính để tải lên!');
                return;
            }
        } else if (this.activeModalTab === 'note') {
            // Chế độ thêm hoặc sửa Thông báo / Ghi chú văn bản (dán từ tin nhắn)
            const noteContentEl = document.getElementById('new-doc-content');
            const noteContent = noteContentEl ? noteContentEl.value.trim() : '';
            if (!noteContent) {
                alert('Vui lòng dán nội dung thông báo / tin nhắn cần lưu!');
                return;
            }

            targetDoc.type = 'note';
            targetDoc.fileType = 'note';
            targetDoc.content = noteContent;
            targetDoc.fileSize = 'Văn bản / Thông báo';
            delete targetDoc.fileUrl;
            delete targetDoc.fileName;
            delete targetDoc.thumbnail;

            // Nếu người dùng để trống ô mô tả tóm tắt, tự tạo trích đoạn ngắn từ nội dung tin nhắn
            if (!targetDoc.description) {
                const cleanSnippet = noteContent.replace(/\s+/g, ' ').trim();
                targetDoc.description = cleanSnippet.length > 140 ? cleanSnippet.substring(0, 140) + '...' : cleanSnippet;
            }
        } else {
            // Chế độ thêm hoặc sửa liên kết Cloud
            const fileUrl = document.getElementById('new-doc-url').value.trim();
            if (!fileUrl) {
                alert('Vui lòng nhập đường dẫn liên kết tài liệu!');
                return;
            }

            targetDoc.fileUrl = fileUrl;
            delete targetDoc.content;
            const lowerUrl = fileUrl.toLowerCase();

            if (lowerUrl.includes('docs.google.com/spreadsheets')) {
                targetDoc.type = 'link';
                targetDoc.fileType = 'xlsx';
                targetDoc.fileSize = 'Google Sheets';
            } else if (lowerUrl.includes('docs.google.com/document')) {
                targetDoc.type = 'link';
                targetDoc.fileType = 'gdoc';
                targetDoc.fileSize = 'Google Docs';
            } else if (lowerUrl.includes('drive.google.com')) {
                targetDoc.type = 'link';
                targetDoc.fileType = 'drive';
                targetDoc.fileSize = 'Drive Folder';
            } else if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
                targetDoc.fileType = 'youtube';
                targetDoc.type = 'video';
                targetDoc.fileSize = 'Video Link';
            } else if (/\.(png|jpg|jpeg|webp|svg)(\?.*)?$/i.test(lowerUrl)) {
                targetDoc.type = 'image';
                targetDoc.fileType = lowerUrl.match(/\.(png|jpg|jpeg|webp|svg)/i)[1];
                targetDoc.fileSize = existingDoc?.fileSize || 'Hình ảnh';
            } else if (lowerUrl.endsWith('.pdf')) {
                targetDoc.type = 'link';
                targetDoc.fileType = 'pdf';
                targetDoc.fileSize = 'Cloud Link';
            } else {
                targetDoc.type = (existingDoc && existingDoc.fileUrl === fileUrl && existingDoc.type) ? existingDoc.type : 'link';
                targetDoc.fileType = targetDoc.fileType || 'link';
                targetDoc.fileSize = existingDoc?.fileSize || 'Cloud Link';
            }
        }

        // Lưu metadata vào SalesStore (tự động đồng bộ lên Firebase Firestore)
        window.salesStore.saveDocument(targetDoc);

        // Reset form & đóng modal
        this.closeModal();

        // Cập nhật lại giao diện
        this.renderStats();
        this.renderQuickAccess();
        this.renderDocumentsList();

        const notifMsg = editingId ? `Đã cập nhật tài liệu: "${title}"!` : `Đã thêm vào kho tài liệu: "${title}"!`;
        window.salesApp.showNotification(notifMsg, 'success');
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
    // 5. ĐỒNG BỘ TỆP LÊN CLOUD (FIRESTORE CHUNKS) CHO ĐIỆN THOẠI & ĐA THIẾT BỊ
    // ==========================================
    blobToDataURL(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(blob);
        });
    }

    dataURLToBlob(dataUrl, fallbackMime = 'application/octet-stream') {
        try {
            const parts = dataUrl.split(',');
            const header = parts[0] || '';
            const base64 = parts[1] || '';
            const mimeMatch = header.match(/:(.*?);/);
            const mime = (mimeMatch && mimeMatch[1]) ? mimeMatch[1] : fallbackMime;
            const binary = atob(base64);
            const len = binary.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            return new Blob([bytes], { type: mime });
        } catch (err) {
            console.error('dataURLToBlob error:', err);
            return null;
        }
    }

    async uploadFileToCloud(docId, fileOrBlob, fileName, mimeType) {
        if (!window.firebaseDb || !docId || !fileOrBlob) return false;
        // Giới hạn tối đa 35MB cho đồng bộ Firestore Chunk để tránh quá tải
        const MAX_SIZE = 35 * 1024 * 1024;
        if (fileOrBlob.size > MAX_SIZE) {
            console.warn(`File ${fileName} lớn hơn 35MB (${(fileOrBlob.size / 1024 / 1024).toFixed(1)}MB), bỏ qua đồng bộ trực tiếp qua Firestore chunks.`);
            return false;
        }
        if (this.syncingDocIds.has(docId)) return false;
        this.syncingDocIds.add(docId);

        try {
            const dataUrl = await this.blobToDataURL(fileOrBlob);
            const CHUNK_SIZE = 650000; // ~650KB mỗi chunk (an toàn dưới ngưỡng 1MB của Firestore)
            const totalChunks = Math.ceil(dataUrl.length / CHUNK_SIZE);

            // Upload chunks theo nhóm 4 chunk song song để đẩy nhanh tốc độ gấp 4 lần
            const BATCH_SIZE = 4;
            for (let i = 0; i < totalChunks; i += BATCH_SIZE) {
                const batchPromises = [];
                for (let j = i; j < Math.min(i + BATCH_SIZE, totalChunks); j++) {
                    const chunkData = dataUrl.slice(j * CHUNK_SIZE, (j + 1) * CHUNK_SIZE);
                    batchPromises.push(
                        window.firebaseDb.collection('document_files').doc(`${docId}_chunk_${j}`).set({
                            docId: docId,
                            index: j,
                            totalChunks: totalChunks,
                            data: chunkData,
                            fileName: fileName || '',
                            mimeType: mimeType || fileOrBlob.type || 'application/octet-stream',
                            fileSize: fileOrBlob.size || 0,
                            updatedAt: Date.now()
                        })
                    );
                }
                await Promise.all(batchPromises);
            }

            // Cập nhật cờ hasCloudFile vào metadata tài liệu
            const docs = window.salesStore.getDocuments();
            const doc = docs.find(d => d.id === docId);
            if (doc) {
                doc.hasCloudFile = true;
                doc.cloudChunkCount = totalChunks;
                if (mimeType || fileOrBlob.type) {
                    doc.mimeType = mimeType || fileOrBlob.type;
                }
                window.salesStore.saveDocument(doc);
            }
            this.syncingDocIds.delete(docId);
            return true;
        } catch (err) {
            console.warn('Không thể đồng bộ tệp lên Cloud:', err);
            this.syncingDocIds.delete(docId);
            return false;
        }
    }

    async deleteCloudFileChunks(docId, chunkCount = 0) {
        if (!window.firebaseDb || !docId) return;
        const maxChunks = Math.max(chunkCount || 0, 5);
        for (let i = 0; i < maxChunks; i++) {
            window.firebaseDb.collection('document_files').doc(`${docId}_chunk_${i}`).delete().catch(() => {});
        }
    }

    async fetchCloudChunkViaRest(docId, chunkIndex) {
        try {
            const url = `https://firestore.googleapis.com/v1/projects/etron-sales-hub-ec234/databases/(default)/documents/document_files/${encodeURIComponent(docId + '_chunk_' + chunkIndex)}`;
            const res = await fetch(url);
            if (!res.ok) return null;
            const json = await res.json();
            if (!json || !json.fields) return null;
            const f = json.fields;
            return {
                data: f.data?.stringValue || '',
                totalChunks: Number(f.totalChunks?.integerValue || 1),
                fileName: f.fileName?.stringValue || '',
                mimeType: f.mimeType?.stringValue || ''
            };
        } catch (err) {
            return null;
        }
    }

    async getOrFetchFile(doc) {
        if (!doc || !doc.id) return null;

        // 1. Ưu tiên đọc từ IndexedDB cục bộ trên thiết bị
        try {
            const localData = await this.fileStore.getFile(doc.id);
            if (localData && localData.blob) {
                if (!doc.hasCloudFile && window.firebaseDb) {
                    this.uploadFileToCloud(
                        doc.id,
                        localData.blob,
                        localData.fileName || doc.fileName || doc.title,
                        localData.fileType || doc.mimeType || ''
                    );
                }
                return localData;
            }
        } catch (localErr) {
            console.warn('IndexedDB read warning:', localErr);
        }

        // 2. Nếu thiết bị hiện tại (ví dụ: điện thoại, ứng viên qua link) chưa có tệp trong IndexedDB, tải từ Firebase Cloud về
        try {
            let firstChunk = null;

            if (window.firebaseDb) {
                try {
                    const firstChunkSnap = await window.firebaseDb.collection('document_files').doc(`${doc.id}_chunk_0`).get();
                    if (firstChunkSnap && firstChunkSnap.exists) {
                        firstChunk = firstChunkSnap.data();
                    }
                } catch (sdkErr) {
                    console.warn('Firestore SDK chunk read fallback to REST:', sdkErr);
                }
            }

            if (!firstChunk) {
                firstChunk = await this.fetchCloudChunkViaRest(doc.id, 0);
            }

            if (!firstChunk || !firstChunk.data) {
                return null;
            }

            const totalChunks = firstChunk.totalChunks || doc.cloudChunkCount || 1;
            const chunks = new Array(totalChunks);
            chunks[0] = firstChunk.data || '';

            if (totalChunks > 1) {
                // Tải theo nhóm 6 chunks song song để tải về siêu nhanh
                const FETCH_BATCH = 6;
                for (let i = 1; i < totalChunks; i += FETCH_BATCH) {
                    const batchIndices = [];
                    for (let j = i; j < Math.min(i + FETCH_BATCH, totalChunks); j++) {
                        batchIndices.push(j);
                    }
                    const batchResults = await Promise.all(batchIndices.map(async (idx) => {
                        if (window.firebaseDb) {
                            try {
                                const snap = await window.firebaseDb.collection('document_files').doc(`${doc.id}_chunk_${idx}`).get();
                                if (snap && snap.exists) return { idx, data: snap.data().data || '' };
                            } catch (e) {}
                        }
                        const restChunk = await this.fetchCloudChunkViaRest(doc.id, idx);
                        return { idx, data: restChunk ? (restChunk.data || '') : null };
                    }));
                    for (const res of batchResults) {
                        if (res.data === null) return null;
                        chunks[res.idx] = res.data;
                    }
                }
            }

            const fullDataUrl = chunks.join('');
            const fallbackMime = firstChunk.mimeType || doc.mimeType || (doc.fileType === 'pdf' ? 'application/pdf' : 'application/octet-stream');
            const blob = this.dataURLToBlob(fullDataUrl, fallbackMime);
            if (!blob) return null;

            const fileName = firstChunk.fileName || doc.fileName || (doc.title + (doc.fileType ? `.${doc.fileType}` : ''));

            // Lưu đệm vào IndexedDB của thiết bị người xem để lần sau mở tức thì
            try {
                await this.fileStore.saveFile(doc.id, blob);
            } catch (cacheErr) {
                console.warn('Mobile IndexedDB cache skip:', cacheErr);
            }

            return {
                id: doc.id,
                blob: blob,
                fileName: fileName,
                fileType: blob.type || fallbackMime,
                fileSize: blob.size
            };
        } catch (err) {
            console.error('Lỗi khi tải tệp từ Cloud:', err);
            return null;
        }
    }

    async syncLocalIndexedDBFilesToCloud() {
        if (!window.firebaseDb || !window.salesStore) return;
        const docs = window.salesStore.getDocuments() || [];

        for (const doc of docs) {
            // Chỉ kiểm tra các tài liệu dạng tệp tải lên mà chưa được đánh dấu hasCloudFile
            if (!doc.fileUrl && doc.type !== 'note' && doc.fileType !== 'note' && !doc.hasCloudFile) {
                try {
                    const localData = await this.fileStore.getFile(doc.id);
                    if (localData && localData.blob) {
                        console.log(`[DocumentHub] Bắt đầu tự động đồng bộ tệp "${doc.title}" (${(localData.blob.size / 1024 / 1024).toFixed(1)} MB) lên Cloud...`);
                        const ok = await this.uploadFileToCloud(
                            doc.id,
                            localData.blob,
                            localData.fileName || doc.fileName || doc.title,
                            localData.fileType || doc.mimeType || (doc.fileType === 'pdf' ? 'application/pdf' : '')
                        );
                        if (ok) {
                            console.log(`☁️ Đã đồng bộ tệp "${doc.title}" từ máy tính lên Cloud thành công!`);
                            if (window.salesApp && typeof window.salesApp.showNotification === 'function') {
                                window.salesApp.showNotification(`Đã tự động đồng bộ tệp "${doc.title}" lên Cloud! Người khác có thể xem trực tiếp.`, 'success');
                            }
                        }
                    }
                } catch (err) {
                    console.warn('[DocumentHub] Lỗi đồng bộ tệp cục bộ lên Cloud:', err);
                }
            }
        }
    }

    // ==========================================
    // 6. MEDIA, PDF & NOTE PREVIEWS (LIGHTBOX, PDF VIEWER, VIDEO, NOTE READER)
    // ==========================================
    ensurePdfJsLoaded() {
        if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
        if (this.pdfJsLoadingPromise) return this.pdfJsLoadingPromise;

        this.pdfJsLoadingPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => {
                if (window.pdfjsLib) {
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                    resolve(window.pdfjsLib);
                } else {
                    reject(new Error('PDF.js failed to initialize'));
                }
            };
            script.onerror = (err) => {
                this.pdfJsLoadingPromise = null;
                reject(err);
            };
            document.head.appendChild(script);
        });

        return this.pdfJsLoadingPromise;
    }

    async getArrayBufferFromData(data) {
        if (!data) throw new Error('Dữ liệu rỗng');
        if (data instanceof ArrayBuffer) return data;
        if (data instanceof Blob) return await data.arrayBuffer();
        if (typeof data === 'string' && data.startsWith('data:')) {
            const commaIdx = data.indexOf(',');
            const base64 = commaIdx >= 0 ? data.slice(commaIdx + 1) : data;
            const binaryString = atob(base64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes.buffer;
        }
        if (typeof data === 'string') {
            const res = await fetch(data);
            return await res.arrayBuffer();
        }
        throw new Error('Định dạng dữ liệu không được hỗ trợ');
    }

    ensureXlsxLoaded() {
        if (window.XLSX) return Promise.resolve(window.XLSX);
        if (this.xlsxLoadingPromise) return this.xlsxLoadingPromise;

        this.xlsxLoadingPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'js/xlsx.full.min.js';
            script.onload = () => {
                if (window.XLSX) resolve(window.XLSX);
                else reject(new Error('XLSX failed to initialize'));
            };
            script.onerror = () => {
                const cdnScript = document.createElement('script');
                cdnScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
                cdnScript.onload = () => {
                    if (window.XLSX) resolve(window.XLSX);
                    else reject(new Error('XLSX CDN failed to initialize'));
                };
                cdnScript.onerror = (err) => {
                    this.xlsxLoadingPromise = null;
                    reject(err);
                };
                document.head.appendChild(cdnScript);
            };
            document.head.appendChild(script);
        });

        return this.xlsxLoadingPromise;
    }

    ensureMammothLoaded() {
        if (window.mammoth) return Promise.resolve(window.mammoth);
        if (this.mammothLoadingPromise) return this.mammothLoadingPromise;

        this.mammothLoadingPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'js/mammoth.browser.min.js';
            script.onload = () => {
                if (window.mammoth) resolve(window.mammoth);
                else reject(new Error('Mammoth failed to initialize'));
            };
            script.onerror = () => {
                const cdnScript = document.createElement('script');
                cdnScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
                cdnScript.onload = () => {
                    if (window.mammoth) resolve(window.mammoth);
                    else reject(new Error('Mammoth CDN failed to initialize'));
                };
                cdnScript.onerror = (err) => {
                    this.mammothLoadingPromise = null;
                    reject(err);
                };
                document.head.appendChild(cdnScript);
            };
            document.head.appendChild(script);
        });

        return this.mammothLoadingPromise;
    }

    async openPdfDocument(doc) {
        const modal = document.getElementById('media-preview-modal');
        const titleEl = document.getElementById('media-preview-title');
        const container = document.getElementById('media-preview-content');
        const downloadBtn = document.getElementById('media-preview-download-btn');

        if (!modal || !container || !doc) return;

        // Mở ngay lập tức cửa sổ xem trước để phản hồi tức thì khi chạm trên điện thoại
        titleEl.textContent = doc.title || 'Xem tài liệu PDF';
        if (downloadBtn) downloadBtn.classList.add('hidden');
        container.scrollTop = 0;
        container.innerHTML = `
            <div class="w-full py-16 flex flex-col items-center justify-center text-slate-600 gap-3">
                <div class="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-xs sm:text-sm font-bold text-slate-700">Đang mở tài liệu PDF...</p>
                <p class="text-[11px] text-slate-400">Vui lòng đợi trong giây lát</p>
            </div>
        `;
        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();

        const fileData = await this.getOrFetchFile(doc);
        if (fileData && fileData.blob) {
            await this.openPdfPreview(fileData.blob, doc);
        } else {
            container.innerHTML = `
                <div class="w-full max-w-md mx-auto my-8 bg-white rounded-2xl border border-rose-200 p-6 text-center space-y-3.5 shadow-sm">
                    <div class="w-12 h-12 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
                        <i data-lucide="file-warning" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <h5 class="text-sm font-bold text-slate-800">Chưa tìm thấy dữ liệu tệp PDF trên Cloud</h5>
                        <p class="text-[11px] text-slate-400 font-medium mt-0.5">${this.escapeHtml(doc.title || '')} ${doc.fileSize ? `(${this.escapeHtml(doc.fileSize)})` : ''}</p>
                    </div>
                    <p class="text-xs text-slate-500 leading-relaxed">
                        Tệp này được tải lên trước đó từ máy tính của HR. Khi HR mở lại trang web trên máy tính đó, hệ thống sẽ tự động đồng bộ tệp lên Cloud cho bạn xem nhé!
                    </p>
                    <div class="pt-1 flex items-center justify-center gap-2">
                        <button type="button" onclick="window.documentHub.openPdfDocument(window.salesStore ? (window.salesStore.getDocuments().find(d => d.id === '${this.escapeHtml(this.escapeJs(doc.id))}') || { id: '${this.escapeHtml(this.escapeJs(doc.id))}', title: '${this.escapeHtml(this.escapeJs(doc.title || ''))}', fileType: 'pdf' }) : { id: '${this.escapeHtml(this.escapeJs(doc.id))}', title: '${this.escapeHtml(this.escapeJs(doc.title || ''))}', fileType: 'pdf' })"
                            class="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs">
                            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
                            <span>Thử tải lại từ Cloud</span>
                        </button>
                    </div>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
        }
    }

    async openWordDocument(doc) {
        const modal = document.getElementById('media-preview-modal');
        const titleEl = document.getElementById('media-preview-title');
        const container = document.getElementById('media-preview-content');
        const downloadBtn = document.getElementById('media-preview-download-btn');

        if (!modal || !container || !doc) return;

        titleEl.textContent = doc.title || 'Xem tài liệu Word';
        if (downloadBtn) downloadBtn.classList.add('hidden');
        container.scrollTop = 0;
        container.innerHTML = `
            <div class="w-full py-16 flex flex-col items-center justify-center text-slate-600 gap-3">
                <div class="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-xs sm:text-sm font-bold text-slate-700">Đang đọc tài liệu Word...</p>
                <p class="text-[11px] text-slate-400">Vui lòng đợi trong giây lát</p>
            </div>
        `;
        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();

        const fileData = await this.getOrFetchFile(doc);
        if (fileData && fileData.blob) {
            try {
                const arrayBuffer = await fileData.blob.arrayBuffer();
                await this.openWordPreview(arrayBuffer, doc);
            } catch (err) {
                console.warn('[DocumentHub] Không thể parse Word, chuyển về tải về:', err);
                this.downloadDocument(doc.id);
            }
        } else {
            container.innerHTML = `
                <div class="w-full max-w-md mx-auto my-8 bg-white rounded-2xl border border-rose-200 p-6 text-center space-y-3.5 shadow-sm">
                    <div class="w-12 h-12 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
                        <i data-lucide="file-warning" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <h5 class="text-sm font-bold text-slate-800">Chưa tìm thấy dữ liệu tệp Word trên Cloud</h5>
                        <p class="text-[11px] text-slate-400 font-medium mt-0.5">${this.escapeHtml(doc.title || '')} ${doc.fileSize ? `(${this.escapeHtml(doc.fileSize)})` : ''}</p>
                    </div>
                    <p class="text-xs text-slate-500 leading-relaxed">
                        Tệp này được tải lên trước đó từ máy tính của HR. Khi HR mở lại trang web trên máy tính đó, hệ thống sẽ tự động đồng bộ tệp lên Cloud cho bạn xem nhé!
                    </p>
                    <div class="pt-1 flex items-center justify-center gap-2">
                        <button type="button" onclick="window.documentHub.openWordDocument(window.salesStore ? (window.salesStore.getDocuments().find(d => d.id === '${this.escapeHtml(this.escapeJs(doc.id))}') || { id: '${this.escapeHtml(this.escapeJs(doc.id))}', title: '${this.escapeHtml(this.escapeJs(doc.title || ''))}', fileType: 'docx' }) : { id: '${this.escapeHtml(this.escapeJs(doc.id))}', title: '${this.escapeHtml(this.escapeJs(doc.title || ''))}', fileType: 'docx' })"
                            class="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs">
                            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
                            <span>Thử tải lại từ Cloud</span>
                        </button>
                    </div>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
        }
    }

    async openExcelDocument(doc) {
        const modal = document.getElementById('media-preview-modal');
        const titleEl = document.getElementById('media-preview-title');
        const container = document.getElementById('media-preview-content');
        const downloadBtn = document.getElementById('media-preview-download-btn');

        if (!modal || !container || !doc) return;

        titleEl.textContent = doc.title || 'Xem bảng tính Excel';
        if (downloadBtn) downloadBtn.classList.add('hidden');
        container.scrollTop = 0;
        container.innerHTML = `
            <div class="w-full py-16 flex flex-col items-center justify-center text-slate-600 gap-3">
                <div class="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-xs sm:text-sm font-bold text-slate-700">Đang đọc bảng tính Excel...</p>
                <p class="text-[11px] text-slate-400">Vui lòng đợi trong giây lát</p>
            </div>
        `;
        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();

        const fileData = await this.getOrFetchFile(doc);
        if (fileData && fileData.blob) {
            try {
                const arrayBuffer = await fileData.blob.arrayBuffer();
                await this.openExcelPreview(arrayBuffer, doc);
            } catch (err) {
                console.warn('[DocumentHub] Không thể parse Excel, chuyển về tải về:', err);
                this.downloadDocument(doc.id);
            }
        } else {
            container.innerHTML = `
                <div class="w-full max-w-md mx-auto my-8 bg-white rounded-2xl border border-rose-200 p-6 text-center space-y-3.5 shadow-sm">
                    <div class="w-12 h-12 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
                        <i data-lucide="file-warning" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <h5 class="text-sm font-bold text-slate-800">Chưa tìm thấy dữ liệu tệp Excel trên Cloud</h5>
                        <p class="text-[11px] text-slate-400 font-medium mt-0.5">${this.escapeHtml(doc.title || '')} ${doc.fileSize ? `(${this.escapeHtml(doc.fileSize)})` : ''}</p>
                    </div>
                    <p class="text-xs text-slate-500 leading-relaxed">
                        Tệp này được tải lên trước đó từ máy tính của HR. Khi HR mở lại trang web trên máy tính đó, hệ thống sẽ tự động đồng bộ tệp lên Cloud cho bạn xem nhé!
                    </p>
                    <div class="pt-1 flex items-center justify-center gap-2">
                        <button type="button" onclick="window.documentHub.openExcelDocument(window.salesStore ? (window.salesStore.getDocuments().find(d => d.id === '${this.escapeHtml(this.escapeJs(doc.id))}') || { id: '${this.escapeHtml(this.escapeJs(doc.id))}', title: '${this.escapeHtml(this.escapeJs(doc.title || ''))}', fileType: 'xlsx' }) : { id: '${this.escapeHtml(this.escapeJs(doc.id))}', title: '${this.escapeHtml(this.escapeJs(doc.title || ''))}', fileType: 'xlsx' })"
                            class="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs">
                            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
                            <span>Thử tải lại từ Cloud</span>
                        </button>
                    </div>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
        }
    }

    async openPdfPreview(blob, doc) {
        const modal = document.getElementById('media-preview-modal');
        const titleEl = document.getElementById('media-preview-title');
        const container = document.getElementById('media-preview-content');
        const downloadBtn = document.getElementById('media-preview-download-btn');

        if (!modal || !container || !blob) return;

        const pdfBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
        const objectUrl = URL.createObjectURL(pdfBlob);
        const fileName = (doc && (doc.fileName || `${doc.title || 'tai-lieu'}.pdf`)) || 'tai-lieu.pdf';

        titleEl.textContent = (doc && doc.title) ? doc.title : 'Xem tài liệu PDF';
        container.scrollTop = 0;

        container.innerHTML = `
            <div class="w-full max-w-4xl mx-auto space-y-3">
                <div class="w-full flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <div class="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <span class="px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 font-bold border border-rose-200/60">PDF</span>
                        <span id="pdf-viewer-page-info">Đang hiển thị các trang...</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <a href="${objectUrl}" target="_blank" rel="noopener noreferrer"
                            class="px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center gap-1">
                            <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                            <span>Mở tab mới</span>
                        </a>
                    </div>
                </div>
                <div id="pdf-pages-wrapper" class="w-full space-y-4 pb-4">
                    <div class="py-12 flex flex-col items-center justify-center text-slate-500 gap-2 bg-white rounded-xl border border-slate-200">
                        <div class="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <span class="text-xs font-medium">Đang kết xuất trang PDF sắc nét...</span>
                    </div>
                </div>
            </div>
        `;

        if (downloadBtn) {
            downloadBtn.classList.remove('hidden');
            downloadBtn.innerHTML = `
                <i data-lucide="download" class="w-3.5 h-3.5"></i>
                <span>Tải PDF</span>
            `;
            downloadBtn.onclick = () => {
                const a = document.createElement('a');
                a.href = objectUrl;
                a.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            };
        }

        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();

        // Đợi 1 nhịp khung hình để trình duyệt tính xong kích thước thực tế của modal
        await new Promise(r => requestAnimationFrame(r));

        try {
            const pdfjsLib = await this.ensurePdfJsLoaded();
            const arrayBuffer = await pdfBlob.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            const wrapper = document.getElementById('pdf-pages-wrapper');
            const pageInfo = document.getElementById('pdf-viewer-page-info');
            if (!wrapper) return;

            if (pageInfo) {
                pageInfo.textContent = `Tổng cộng ${pdf.numPages} trang • Cuộn xuống để xem tiếp`;
            }
            wrapper.innerHTML = '';

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const unscaledViewport = page.getViewport({ scale: 1 });
                const availWidth = Math.max((wrapper.clientWidth || container.clientWidth || 340) - 16, 260);
                const dpr = Math.min(window.devicePixelRatio || 1.5, 2);
                const cssScale = availWidth / unscaledViewport.width;
                const renderViewport = page.getViewport({ scale: cssScale * dpr });

                const pageCard = document.createElement('div');
                pageCard.className = 'w-full bg-white rounded-xl shadow-sm border border-slate-200 p-1.5 sm:p-3';

                const pageHeader = document.createElement('div');
                pageHeader.className = 'flex items-center justify-between px-2 pb-1.5 mb-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400';
                pageHeader.innerHTML = `<span>Trang ${pageNum} / ${pdf.numPages}</span><span>${this.escapeHtml(doc?.title || '')}</span>`;

                const canvas = document.createElement('canvas');
                canvas.width = renderViewport.width;
                canvas.height = renderViewport.height;
                canvas.style.width = '100%';
                canvas.style.height = 'auto';
                canvas.style.display = 'block';
                canvas.className = 'rounded-lg';

                pageCard.appendChild(pageHeader);
                pageCard.appendChild(canvas);
                wrapper.appendChild(pageCard);

                const ctx = canvas.getContext('2d');
                await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;
            }
        } catch (err) {
            console.warn('Fallback iframe cho PDF:', err);
            const wrapper = document.getElementById('pdf-pages-wrapper');
            if (wrapper) {
                wrapper.innerHTML = `
                    <iframe src="${objectUrl}" class="w-full h-[72vh] rounded-xl bg-white border border-slate-200"></iframe>
                `;
            }
        }
    }

    async openWordPreview(arrayBuffer, doc = {}) {
        const modal = document.getElementById('media-preview-modal');
        const titleEl = document.getElementById('media-preview-title');
        const container = document.getElementById('media-preview-content');
        const downloadBtn = document.getElementById('media-preview-download-btn');
        if (!modal || !container || !arrayBuffer) return;

        const fileName = doc.fileName || `${doc.title || 'tai-lieu'}.docx`;
        titleEl.textContent = doc.title || fileName || 'Xem tài liệu Word';
        container.scrollTop = 0;

        container.innerHTML = `
            <div class="w-full py-16 flex flex-col items-center justify-center text-slate-600 gap-3">
                <div class="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-xs sm:text-sm font-bold text-slate-700">Đang đọc và kết xuất tài liệu Word...</p>
                <p class="text-[11px] text-slate-400">Vui lòng đợi trong giây lát</p>
            </div>
        `;
        modal.classList.remove('hidden');

        try {
            const mammoth = await this.ensureMammothLoaded();
            const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
            const docHtml = result.value || '<p class="text-slate-400 italic">Tài liệu không có nội dung chữ.</p>';

            container.innerHTML = `
                <div class="w-full max-w-4xl mx-auto space-y-4 pb-6">
                    <div class="w-full flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                        <div class="flex items-center gap-2 text-xs font-semibold text-slate-700 min-w-0">
                            <span class="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-extrabold border border-blue-200/80 flex items-center gap-1 shrink-0">
                                <i data-lucide="file-text" class="w-3.5 h-3.5"></i> DOCX
                            </span>
                            <span class="truncate font-bold">${this.escapeHtml(fileName)}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-[11px] text-slate-400">Xem trực tiếp trên trình duyệt</span>
                        </div>
                    </div>

                    <div class="w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-10 select-text leading-relaxed text-slate-800 word-doc-content overflow-x-auto min-h-[300px]">
                        ${docHtml}
                    </div>

                    ${doc.note ? `
                        <div class="p-3.5 bg-white rounded-2xl border border-amber-200 shadow-2xs text-xs space-y-1">
                            <span class="font-extrabold text-amber-900 block text-[11px] flex items-center gap-1.5">
                                <i data-lucide="message-square" class="w-3.5 h-3.5 text-amber-700"></i>
                                Ghi chú của học viên:
                            </span>
                            <p class="text-slate-800 whitespace-pre-wrap leading-relaxed select-text">${this.escapeHtml(doc.note)}</p>
                        </div>
                    ` : ''}

                    ${doc.link ? `
                        <div class="p-3 bg-white rounded-2xl border border-indigo-100 shadow-2xs flex items-center justify-between gap-3 text-xs">
                            <div class="min-w-0">
                                <span class="font-bold text-slate-500 block text-[10px]">Đường link bài làm nộp kèm:</span>
                                <a href="${this.escapeHtml(doc.link)}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 font-bold underline truncate block mt-0.5">${this.escapeHtml(doc.link)}</a>
                            </div>
                            <a href="${this.escapeHtml(doc.link)}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shrink-0 flex items-center gap-1 shadow-2xs">
                                <span>Mở link</span>
                                <i data-lucide="arrow-up-right" class="w-3 h-3"></i>
                            </a>
                        </div>
                    ` : ''}
                </div>
            `;

            if (downloadBtn) {
                downloadBtn.classList.remove('hidden');
                downloadBtn.innerHTML = `<i data-lucide="download" class="w-3.5 h-3.5"></i> <span>Tải Word</span>`;
                downloadBtn.onclick = () => {
                    let downloadUrl = typeof doc.fileData === 'string' && doc.fileData ? doc.fileData : null;
                    let revoke = false;
                    if (!downloadUrl) {
                        const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
                        downloadUrl = URL.createObjectURL(blob);
                        revoke = true;
                    }
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    if (revoke) {
                        setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
                    }
                };
            }
            if (window.lucide) lucide.createIcons();
        } catch (err) {
            console.error('[DocumentHub] Lỗi render Word DOCX:', err);
            throw err;
        }
    }

    async openExcelPreview(arrayBuffer, doc = {}) {
        const modal = document.getElementById('media-preview-modal');
        const titleEl = document.getElementById('media-preview-title');
        const container = document.getElementById('media-preview-content');
        const downloadBtn = document.getElementById('media-preview-download-btn');
        if (!modal || !container || !arrayBuffer) return;

        const fileName = doc.fileName || `${doc.title || 'bang-tinh'}.xlsx`;
        titleEl.textContent = doc.title || fileName || 'Xem bảng tính Excel';
        container.scrollTop = 0;

        container.innerHTML = `
            <div class="w-full py-16 flex flex-col items-center justify-center text-slate-600 gap-3">
                <div class="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-xs sm:text-sm font-bold text-slate-700">Đang đọc dữ liệu bảng tính Excel...</p>
                <p class="text-[11px] text-slate-400">Vui lòng đợi trong giây lát</p>
            </div>
        `;
        modal.classList.remove('hidden');

        try {
            const XLSX = await this.ensureXlsxLoaded();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const sheetNames = workbook.SheetNames || [];

            if (sheetNames.length === 0) {
                container.innerHTML = `<div class="p-8 text-center text-slate-500 text-xs">File Excel rỗng, không có Sheet nào.</div>`;
                return;
            }

            let currentSheetIndex = 0;

            const renderSheet = (index) => {
                currentSheetIndex = index;
                const sheetName = sheetNames[index];
                const worksheet = workbook.Sheets[sheetName];
                const htmlTable = XLSX.utils.sheet_to_html(worksheet, { id: 'excel-preview-table', editable: false });

                const sheetTabsHtml = sheetNames.map((name, i) => `
                    <button type="button" data-sheet-idx="${i}"
                        class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${i === currentSheetIndex ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
                        <i data-lucide="sheet" class="w-3.5 h-3.5"></i>
                        <span>${this.escapeHtml(name)}</span>
                    </button>
                `).join('');

                container.innerHTML = `
                    <div class="w-full max-w-5xl mx-auto space-y-3 pb-6">
                        <!-- Top Toolbar with Sheet tabs -->
                        <div class="w-full flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                            <div class="flex items-center gap-2 text-xs font-semibold text-slate-700 min-w-0">
                                <span class="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-200/80 flex items-center gap-1 shrink-0">
                                    <i data-lucide="file-spreadsheet" class="w-3.5 h-3.5"></i> EXCEL
                                </span>
                                <span class="truncate font-bold">${this.escapeHtml(fileName)}</span>
                            </div>
                            <div class="flex items-center gap-1.5 overflow-x-auto max-w-full py-1">
                                ${sheetTabsHtml}
                            </div>
                        </div>

                        <!-- Excel Table Container -->
                        <div class="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div class="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
                                <span class="font-bold text-slate-700 flex items-center gap-1.5">
                                    <i data-lucide="table" class="w-4 h-4 text-emerald-600"></i>
                                    <span>Đang xem Sheet: <span class="text-emerald-700">${this.escapeHtml(sheetName)}</span></span>
                                </span>
                                <span class="text-[11px] text-slate-400">Cuộn ngang/dọc để xem toàn bộ ô tính</span>
                            </div>
                            <div class="w-full overflow-auto max-h-[65vh] p-2 excel-preview-wrapper select-text">
                                ${htmlTable}
                            </div>
                        </div>

                        ${doc.note ? `
                            <div class="p-3.5 bg-white rounded-2xl border border-amber-200 shadow-2xs text-xs space-y-1">
                                <span class="font-extrabold text-amber-900 block text-[11px] flex items-center gap-1.5">
                                    <i data-lucide="message-square" class="w-3.5 h-3.5 text-amber-700"></i>
                                    Ghi chú của học viên:
                                </span>
                                <p class="text-slate-800 whitespace-pre-wrap leading-relaxed select-text">${this.escapeHtml(doc.note)}</p>
                            </div>
                        ` : ''}

                        ${doc.link ? `
                            <div class="p-3 bg-white rounded-2xl border border-indigo-100 shadow-2xs flex items-center justify-between gap-3 text-xs">
                                <div class="min-w-0">
                                    <span class="font-bold text-slate-500 block text-[10px]">Đường link bài làm nộp kèm:</span>
                                    <a href="${this.escapeHtml(doc.link)}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 font-bold underline truncate block mt-0.5">${this.escapeHtml(doc.link)}</a>
                                </div>
                                <a href="${this.escapeHtml(doc.link)}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shrink-0 flex items-center gap-1 shadow-2xs">
                                    <span>Mở link</span>
                                    <i data-lucide="arrow-up-right" class="w-3 h-3"></i>
                                </a>
                            </div>
                        ` : ''}
                    </div>
                `;

                container.querySelectorAll('button[data-sheet-idx]').forEach(btn => {
                    btn.onclick = () => {
                        const idx = parseInt(btn.getAttribute('data-sheet-idx'), 10);
                        renderSheet(idx);
                    };
                });

                if (window.lucide) lucide.createIcons();
            };

            renderSheet(0);

            if (downloadBtn) {
                downloadBtn.classList.remove('hidden');
                downloadBtn.innerHTML = `<i data-lucide="download" class="w-3.5 h-3.5"></i> <span>Tải Excel</span>`;
                downloadBtn.onclick = () => {
                    let downloadUrl = typeof doc.fileData === 'string' && doc.fileData ? doc.fileData : null;
                    let revoke = false;
                    if (!downloadUrl) {
                        const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                        downloadUrl = URL.createObjectURL(blob);
                        revoke = true;
                    }
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    if (revoke) {
                        setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
                    }
                };
            }
        } catch (err) {
            console.error('[DocumentHub] Lỗi render Excel XLSX:', err);
            throw err;
        }
    }

    formatNoteContentHtml(rawText) {
        const escaped = this.escapeHtml(rawText || '');
        // Tự động chuyển các URL http/https trong tin nhắn thành liên kết bấm được
        return escaped.replace(/(https?:\/\/[^\s<]+)/g, (url) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-800 underline font-medium break-all">${url}</a>`;
        });
    }

    openNotePreview(doc) {
        const modal = document.getElementById('media-preview-modal');
        const titleEl = document.getElementById('media-preview-title');
        const container = document.getElementById('media-preview-content');
        const downloadBtn = document.getElementById('media-preview-download-btn');

        if (!modal || !container || !doc) return;

        titleEl.textContent = doc.title || 'Nội dung thông báo';
        const bodyText = doc.content || doc.description || '';
        container.scrollTop = 0;

        container.innerHTML = `
            <div class="w-full max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 text-left space-y-4">
                <!-- Metadata Bar -->
                <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                            <i data-lucide="message-square-text" class="w-3 h-3"></i>
                            <span>Thông báo / Ghi chú</span>
                        </span>
                        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                            ${this.escapeHtml(doc.category || 'Chung')}
                        </span>
                        <span class="text-[11px] text-slate-400 flex items-center gap-1">
                            <i data-lucide="clock" class="w-3 h-3"></i>
                            <span>Cập nhật: ${this.escapeHtml(doc.updatedAt || 'Hôm nay')}</span>
                        </span>
                    </div>
                    ${document.getElementById('document-add-modal') ? `
                        <button type="button" onclick="window.documentHub.closeMediaPreview(); window.documentHub.openEditModal('${this.escapeHtml(this.escapeJs(doc.id))}')"
                            class="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition-colors flex items-center gap-1">
                            <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                            <span>Chỉnh sửa</span>
                        </button>
                    ` : ''}
                </div>

                <!-- Nội dung văn bản / tin nhắn -->
                <div class="bg-slate-50/80 rounded-xl p-4 sm:p-5 border border-slate-200/80">
                    <div class="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap break-words leading-relaxed select-text font-sans">${this.formatNoteContentHtml(bodyText)}</div>
                </div>

                <!-- Tags (nếu có) -->
                ${doc.tags && doc.tags.length > 0 ? `
                    <div class="flex flex-wrap items-center gap-1.5 pt-1">
                        <span class="text-[11px] text-slate-400 font-medium mr-1">Tags:</span>
                        ${doc.tags.map(tag => `
                            <span class="text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-medium">#${this.escapeHtml(tag)}</span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        if (downloadBtn) {
            downloadBtn.classList.remove('hidden');
            downloadBtn.innerHTML = `
                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                <span>Sao chép nội dung</span>
            `;
            downloadBtn.onclick = () => {
                this.copyNoteContent(doc.id);
            };
        }

        modal.classList.remove('hidden');
        lucide.createIcons();
    }

    openImagePreview(src, title, size) {
        const modal = document.getElementById('media-preview-modal');
        const titleEl = document.getElementById('media-preview-title');
        const container = document.getElementById('media-preview-content');
        const downloadBtn = document.getElementById('media-preview-download-btn');

        if (!modal || !container) return;

        titleEl.textContent = title || 'Xem trước hình ảnh';
        container.scrollTop = 0;
        container.innerHTML = `
            <div class="w-full flex items-center justify-center p-2">
                <img src="${this.escapeHtml(src)}" alt="${this.escapeHtml(title)}" class="max-h-[75vh] max-w-full object-contain rounded-xl shadow-lg border border-slate-200 bg-white">
            </div>
        `;

        if (downloadBtn) {
            downloadBtn.classList.remove('hidden');
            downloadBtn.innerHTML = `
                <i data-lucide="download" class="w-3.5 h-3.5"></i>
                <span>Tải về</span>
            `;
            downloadBtn.onclick = () => {
                const a = document.createElement('a');
                a.href = src;
                a.download = (title || 'hinh-anh-etron').replace(/\s+/g, '_') + '.png';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            };
        }

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
        container.scrollTop = 0;

        // Kiểm tra YouTube URL
        const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const ytMatch = src.match(ytRegExp);

        if (ytMatch && ytMatch[2].length === 11) {
            const embedUrl = `https://www.youtube.com/embed/${ytMatch[2]}?autoplay=1`;
            container.innerHTML = `
                <div class="w-full max-w-4xl mx-auto aspect-video rounded-xl overflow-hidden shadow-xl bg-black">
                    <iframe src="${this.escapeHtml(embedUrl)}" class="w-full h-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                </div>
            `;
            if (downloadBtn) downloadBtn.classList.add('hidden');
        } else {
            // HTML5 Video Player
            container.innerHTML = `
                <div class="w-full max-w-4xl mx-auto aspect-video rounded-xl overflow-hidden shadow-xl bg-black flex items-center justify-center">
                    <video src="${this.escapeHtml(src)}" controls autoplay class="w-full h-full object-contain"></video>
                </div>
            `;
            if (downloadBtn) {
                downloadBtn.classList.remove('hidden');
                downloadBtn.innerHTML = `
                    <i data-lucide="download" class="w-3.5 h-3.5"></i>
                    <span>Tải về</span>
                `;
                downloadBtn.onclick = () => {
                    const a = document.createElement('a');
                    a.href = src;
                    a.download = (title || 'video-demo-etron').replace(/\s+/g, '_') + '.mp4';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                };
            }
        }

        modal.classList.remove('hidden');
        lucide.createIcons();
    }

    async previewFilePayload(payload = {}) {
        const { fileName = '', fileData = '', fileType = '', title = '', note = '', link = '' } = payload;
        const modal = document.getElementById('media-preview-modal');
        const titleEl = document.getElementById('media-preview-title');
        const container = document.getElementById('media-preview-content');
        const downloadBtn = document.getElementById('media-preview-download-btn');

        if (!modal || !container) return;

        const effectiveTitle = title || fileName || 'Xem trước bài nộp';
        titleEl.textContent = effectiveTitle;
        container.scrollTop = 0;

        const lowerName = String(fileName || '').toLowerCase();
        const lowerType = String(fileType || '').toLowerCase();
        const strData = typeof fileData === 'string' ? fileData : '';

        // 1. PDF
        const isPdf = lowerType === 'application/pdf' ||
                      lowerName.endsWith('.pdf') ||
                      strData.startsWith('data:application/pdf');

        // 2. Image
        const isImg = lowerType.startsWith('image/') ||
                      /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(lowerName) ||
                      strData.startsWith('data:image/');

        // 3. Audio / Video
        const isVideo = lowerType.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(lowerName);
        const isAudio = lowerType.startsWith('audio/') || /\.(mp3|wav|ogg|m4a)$/i.test(lowerName);

        // 4. Word (.docx, .doc)
        const isWord = lowerType.includes('wordprocessingml') ||
                       lowerType.includes('msword') ||
                       /\.(docx|doc)$/i.test(lowerName) ||
                       strData.startsWith('data:application/vnd.openxmlformats-officedocument.wordprocessingml') ||
                       strData.startsWith('data:application/msword');

        // 5. Excel (.xlsx, .xls, .csv)
        const isExcel = lowerType.includes('spreadsheetml') ||
                        lowerType.includes('ms-excel') ||
                        /\.(xlsx|xls|csv)$/i.test(lowerName) ||
                        strData.startsWith('data:application/vnd.openxmlformats-officedocument.spreadsheetml') ||
                        strData.startsWith('data:application/vnd.ms-excel');

        // 6. Text / Markdown / Code / JSON
        const isText = lowerType.startsWith('text/') || lowerType === 'application/json' ||
                       /\.(txt|md|json|js|html|css|xml|log)$/i.test(lowerName);

        if (isPdf && fileData) {
            try {
                let blob;
                if (fileData instanceof Blob) {
                    blob = fileData;
                } else if (strData.startsWith('data:')) {
                    const parts = strData.split(',');
                    const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/pdf';
                    const bstr = atob(parts[1]);
                    let n = bstr.length;
                    const u8arr = new Uint8Array(n);
                    while (n--) {
                        u8arr[n] = bstr.charCodeAt(n);
                    }
                    blob = new Blob([u8arr], { type: mime });
                } else {
                    const res = await fetch(fileData);
                    blob = await res.blob();
                }

                await this.openPdfPreview(blob, { title: effectiveTitle, fileName: fileName || 'bai-nop.pdf' });

                // Thêm thẻ ghi chú / link của học viên ở cuối trang xem PDF
                if (note || link) {
                    const wrapper = document.getElementById('pdf-pages-wrapper') || container;
                    const infoCard = document.createElement('div');
                    infoCard.className = 'w-full max-w-4xl mx-auto p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 mt-4';
                    infoCard.innerHTML = `
                        ${note ? `
                            <div class="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-1">
                                <span class="font-extrabold text-amber-900 block text-[11px] flex items-center gap-1.5">
                                    <i data-lucide="message-square" class="w-3.5 h-3.5 text-amber-700"></i>
                                    Ghi chú của học viên:
                                </span>
                                <p class="text-slate-800 whitespace-pre-wrap leading-relaxed select-text">${this.escapeHtml(note)}</p>
                            </div>
                        ` : ''}
                        ${link ? `
                            <div class="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs flex items-center justify-between gap-3">
                                <div class="min-w-0">
                                    <span class="font-bold text-slate-500 block text-[10px]">Đường link bài làm nộp kèm:</span>
                                    <a href="${this.escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 font-bold underline truncate block mt-0.5">${this.escapeHtml(link)}</a>
                                </div>
                                <a href="${this.escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shrink-0 flex items-center gap-1 shadow-2xs">
                                    <span>Mở link</span>
                                    <i data-lucide="arrow-up-right" class="w-3 h-3"></i>
                                </a>
                            </div>
                        ` : ''}
                    `;
                    wrapper.appendChild(infoCard);
                    if (window.lucide) lucide.createIcons();
                }
                return;
            } catch (pdfErr) {
                console.warn('[DocumentHub] Lỗi render PDF, chuyển sang khung iframe:', pdfErr);
            }
        }

        if (isWord && fileData) {
            try {
                const arrayBuffer = await this.getArrayBufferFromData(fileData);
                await this.openWordPreview(arrayBuffer, { ...payload, title: effectiveTitle, fileName: fileName || 'tai-lieu.docx' });
                return;
            } catch (wordErr) {
                console.warn('[DocumentHub] Không thể parse Word trực tiếp, chuyển sang tải về:', wordErr);
            }
        }

        if (isExcel && fileData) {
            try {
                const arrayBuffer = await this.getArrayBufferFromData(fileData);
                await this.openExcelPreview(arrayBuffer, { ...payload, title: effectiveTitle, fileName: fileName || 'bang-tinh.xlsx' });
                return;
            } catch (excelErr) {
                console.warn('[DocumentHub] Không thể parse Excel trực tiếp, chuyển sang tải về:', excelErr);
            }
        }

        if (isImg && fileData) {
            titleEl.textContent = effectiveTitle;
            container.innerHTML = `
                <div class="w-full max-w-4xl mx-auto space-y-3">
                    <div class="w-full flex items-center justify-center p-3 bg-slate-900/5 rounded-2xl border border-slate-200/80">
                        <img src="${this.escapeHtml(fileData)}" alt="${this.escapeHtml(fileName || 'Bài nộp')}"
                            class="max-h-[72vh] max-w-full object-contain rounded-xl shadow-md bg-white">
                    </div>
                    ${note ? `
                        <div class="p-3.5 bg-white rounded-2xl border border-amber-200 shadow-2xs text-xs space-y-1">
                            <span class="font-extrabold text-amber-900 block text-[11px] flex items-center gap-1.5">
                                <i data-lucide="message-square" class="w-3.5 h-3.5 text-amber-700"></i>
                                Ghi chú của học viên:
                            </span>
                            <p class="text-slate-800 whitespace-pre-wrap leading-relaxed select-text">${this.escapeHtml(note)}</p>
                        </div>
                    ` : ''}
                    ${link ? `
                        <div class="p-3 bg-white rounded-2xl border border-indigo-100 shadow-2xs flex items-center justify-between gap-3 text-xs">
                            <div class="min-w-0">
                                <span class="font-bold text-slate-500 block text-[10px]">Đường link bài làm nộp kèm:</span>
                                <a href="${this.escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 font-bold underline truncate block mt-0.5">${this.escapeHtml(link)}</a>
                            </div>
                            <a href="${this.escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shrink-0 flex items-center gap-1 shadow-2xs">
                                <span>Mở link</span>
                                <i data-lucide="arrow-up-right" class="w-3 h-3"></i>
                            </a>
                        </div>
                    ` : ''}
                </div>
            `;
            if (downloadBtn) {
                downloadBtn.classList.remove('hidden');
                downloadBtn.innerHTML = `<i data-lucide="download" class="w-3.5 h-3.5"></i> <span>Tải ảnh</span>`;
                downloadBtn.onclick = () => {
                    const a = document.createElement('a');
                    a.href = fileData;
                    a.download = fileName || 'anh-bai-nop.png';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                };
            }
            modal.classList.remove('hidden');
            if (window.lucide) lucide.createIcons();
            return;
        }

        if (isVideo && fileData) {
            titleEl.textContent = effectiveTitle;
            container.innerHTML = `
                <div class="w-full max-w-4xl mx-auto space-y-3">
                    <div class="aspect-video bg-black rounded-2xl overflow-hidden shadow-xl flex items-center justify-center">
                        <video src="${this.escapeHtml(fileData)}" controls autoplay class="w-full h-full object-contain"></video>
                    </div>
                    ${note ? `
                        <div class="p-3.5 bg-white rounded-2xl border border-amber-200 text-xs">
                            <span class="font-extrabold text-amber-900 block mb-0.5">Ghi chú của học viên:</span>
                            <p class="text-slate-800 whitespace-pre-wrap leading-relaxed select-text">${this.escapeHtml(note)}</p>
                        </div>
                    ` : ''}
                </div>
            `;
            if (downloadBtn) {
                downloadBtn.classList.remove('hidden');
                downloadBtn.innerHTML = `<i data-lucide="download" class="w-3.5 h-3.5"></i> <span>Tải video</span>`;
                downloadBtn.onclick = () => {
                    const a = document.createElement('a');
                    a.href = fileData;
                    a.download = fileName || 'video-bai-nop.mp4';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                };
            }
            modal.classList.remove('hidden');
            if (window.lucide) lucide.createIcons();
            return;
        }

        // Generic File / Office / Text fallback
        titleEl.textContent = effectiveTitle;
        let textDecoded = '';
        if (isText && strData.startsWith('data:')) {
            try {
                const base64Part = strData.split(',')[1];
                textDecoded = decodeURIComponent(escape(atob(base64Part)));
            } catch (_) {
                try { textDecoded = atob(strData.split(',')[1]); } catch (_) {}
            }
        }

        container.innerHTML = `
            <div class="w-full max-w-2xl mx-auto space-y-4 py-4">
                <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-center space-y-3">
                    <div class="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center shadow-2xs border border-indigo-100">
                        <i data-lucide="${isText ? 'file-code' : (isWord ? 'file-text' : (isExcel ? 'file-spreadsheet' : (lowerName.endsWith('.pdf') ? 'file-text' : 'file')))}" class="w-8 h-8"></i>
                    </div>
                    <div class="space-y-1">
                        <h4 class="text-base font-extrabold text-slate-800 break-all">${this.escapeHtml(fileName || 'Tệp bài tập nộp')}</h4>
                        <p class="text-xs text-slate-400">Định dạng: ${this.escapeHtml(fileType || 'Tệp đính kèm')}</p>
                    </div>
                    ${fileData ? `
                        <div class="pt-2 flex flex-wrap items-center justify-center gap-2.5">
                            <a href="${fileData}" download="${this.escapeHtml(fileName || 'bai-nop')}"
                                class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm inline-flex items-center gap-2 transition-all">
                                <i data-lucide="download" class="w-4 h-4"></i>
                                <span>Tải tệp về máy</span>
                            </a>
                            <a href="${fileData}" target="_blank" rel="noopener noreferrer"
                                class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 inline-flex items-center gap-2 transition-all">
                                <i data-lucide="external-link" class="w-4 h-4"></i>
                                <span>Mở tab mới</span>
                            </a>
                        </div>
                    ` : ''}
                </div>

                ${textDecoded ? `
                    <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2">
                        <span class="text-xs font-extrabold text-slate-700 block">Nội dung tệp:</span>
                        <pre class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 max-h-64 overflow-auto whitespace-pre-wrap select-text leading-relaxed">${this.escapeHtml(textDecoded)}</pre>
                    </div>
                ` : ''}

                ${note ? `
                    <div class="bg-white rounded-2xl border border-amber-200 p-4 shadow-sm space-y-1.5">
                        <span class="text-xs font-extrabold text-amber-900 block flex items-center gap-1.5">
                            <i data-lucide="message-square" class="w-3.5 h-3.5 text-amber-600"></i>
                            <span>Ghi chú của học viên:</span>
                        </span>
                        <p class="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed select-text">${this.escapeHtml(note)}</p>
                    </div>
                ` : ''}

                ${link ? `
                    <div class="bg-white rounded-2xl border border-indigo-100 p-4 shadow-sm flex items-center justify-between gap-3">
                        <div class="min-w-0 text-xs">
                            <span class="font-bold text-slate-500 block text-[11px]">Đường link bài làm:</span>
                            <a href="${this.escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-800 font-bold underline truncate block mt-0.5">${this.escapeHtml(link)}</a>
                        </div>
                        <a href="${this.escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-2xs">
                            <span>Mở link</span>
                            <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i>
                        </a>
                    </div>
                ` : ''}
            </div>
        `;

        if (downloadBtn) {
            if (fileData) {
                downloadBtn.classList.remove('hidden');
                downloadBtn.innerHTML = `<i data-lucide="download" class="w-3.5 h-3.5"></i> <span>Tải về</span>`;
                downloadBtn.onclick = () => {
                    const a = document.createElement('a');
                    a.href = fileData;
                    a.download = fileName || 'bai-nop';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                };
            } else {
                downloadBtn.classList.add('hidden');
            }
        }

        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }

    closeMediaPreview() {
        const modal = document.getElementById('media-preview-modal');
        const container = document.getElementById('media-preview-content');
        if (modal) modal.classList.add('hidden');
        if (container) container.innerHTML = ''; // Dừng phát video
    }

    isSafeResourceUrl(value) {
        try {
            const url = new URL(value, window.location.href);
            return ['http:', 'https:', 'blob:'].includes(url.protocol) || /^data:image\/(png|jpeg|gif|webp);base64,/i.test(value);
        } catch (_) { return false; }
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

    escapeJs(str) {
        if (!str) return '';
        return String(str)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '');
    }
}

window.documentHub = new DocumentHub();
