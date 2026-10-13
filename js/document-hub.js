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
    }

    init() {
        this.renderStats();
        this.renderQuickAccess();
        this.renderTypePills();
        this.renderCategoryPills();
        this.updateCategorySelectOptions();
        this.renderAddIconPickerGrid();
        
        const sortSelect = document.getElementById('doc-sort-select');
        if (sortSelect) {
            sortSelect.value = this.sortBy;
        }

        this.renderDocumentsList();
        this.setupModalEventListeners();
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
                                    <i data-lucide="${cat.icon || 'folders'}" class="w-5 h-5"></i>
                                </div>
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase tracking-wider">
                                    Thư mục ghim
                                </span>
                            </div>
                            <div class="flex items-center gap-1 z-10">
                                <button onclick="window.documentHub.toggleCategoryPin('${cat.id}')" class="text-amber-500 hover:text-amber-600 p-1 transition-colors" title="Bỏ ghim danh mục khỏi Truy cập nhanh">
                                    <i data-lucide="star" class="w-4 h-4 fill-amber-400 text-amber-500"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Tiêu đề & Thông tin danh mục -->
                        <h4 class="font-extrabold text-slate-800 text-xs sm:text-sm group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug cursor-pointer"
                            onclick="window.documentHub.openCategoryFromQuickAccess('${cat.id}')" title="${this.escapeHtml(cat.name)}">
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
                        
                        <button onclick="window.documentHub.openCategoryFromQuickAccess('${cat.id}')"
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
                                <button onclick="window.documentHub.openEditModal('${doc.id}')" class="text-slate-300 hover:text-indigo-600 p-1 transition-colors" title="Chỉnh sửa tài liệu">
                                    <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                                </button>
                                <button onclick="window.documentHub.togglePin('${doc.id}')" class="text-amber-500 hover:text-amber-600 p-1 transition-colors" title="Bỏ ghim khỏi mục Truy cập nhanh">
                                    <i data-lucide="star" class="w-4 h-4 fill-amber-400 text-amber-500"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Tiêu đề & Mô tả -->
                        <h4 class="font-bold text-slate-800 text-xs sm:text-sm group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug cursor-pointer"
                            onclick="window.documentHub.openDocument('${doc.id}')" title="${this.escapeHtml(doc.title)}">
                            ${this.escapeHtml(doc.title)}
                        </h4>
                        <p class="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            ${this.escapeHtml(doc.description || 'Chưa có mô tả chi tiết')}
                        </p>
                    </div>

                    <!-- Footer Thẻ -->
                    <div class="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span class="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                            ${this.escapeHtml(doc.fileSize || 'Trực tuyến')}
                        </span>
                        
                        <div class="flex items-center gap-1.5">
                            <button onclick="window.documentHub.openDocument('${doc.id}')"
                                class="px-2.5 sm:px-3 py-1 rounded-lg ${badge.bg} ${badge.color} font-bold text-xs hover:opacity-90 transition-all flex items-center gap-1">
                                <i data-lucide="${isImage ? 'eye' : (isVideo ? 'play' : 'external-link')}" class="w-3.5 h-3.5"></i>
                                <span>${isImage ? 'Xem ảnh' : (isVideo ? 'Phát' : 'Mở')}</span>
                            </button>

                            ${doc.fileUrl ? `
                                <button onclick="window.documentHub.copyDocLink('${doc.id}')"
                                    class="p-1 sm:p-1.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors" title="Sao chép liên kết">
                                    <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                                </button>
                            ` : `
                                <button onclick="window.documentHub.downloadDocument('${doc.id}')"
                                    class="p-1 sm:p-1.5 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Tải về máy">
                                    <i data-lucide="download" class="w-3.5 h-3.5"></i>
                                </button>
                            `}
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
                <button onclick="window.documentHub.setCategory('${cat.id}')"
                    class="px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
                        this.selectedCategory === cat.id 
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200' 
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }">
                    <i data-lucide="${cat.icon || 'tag'}" class="w-3.5 h-3.5"></i>
                    <span>${cat.name}</span>
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

    setSortBy(sortKey) {
        this.sortBy = sortKey;
        localStorage.setItem('etron_doc_sort_by', sortKey);

        const sortSelect = document.getElementById('doc-sort-select');
        if (sortSelect && sortSelect.value !== sortKey) {
            sortSelect.value = sortKey;
        }

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

                                return `
                                    <tr class="hover:bg-indigo-50/40 transition-colors group">
                                        <td class="py-2.5 sm:py-3 px-3 sm:px-4 max-w-[200px] sm:max-w-md">
                                            <div class="flex items-start gap-2.5 sm:gap-3">
                                                <div class="w-8 h-8 rounded-lg ${badge.bg} ${badge.color} flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                                    ${badge.label}
                                                </div>
                                                <div class="min-w-0">
                                                    <div class="flex items-center gap-1.5">
                                                        <h5 class="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors cursor-pointer truncate text-xs sm:text-sm"
                                                            onclick="window.documentHub.openDocument('${doc.id}')" title="${this.escapeHtml(doc.title)}">
                                                            ${this.escapeHtml(doc.title)}
                                                        </h5>
                                                        ${doc.pinned ? `
                                                            <span class="text-amber-500 text-[10px]" title="Đang ghim ở mục Truy cập nhanh">⭐</span>
                                                        ` : ''}
                                                    </div>
                                                    ${doc.description ? `
                                                        <p class="text-[11px] text-slate-400 truncate mt-0.5" title="${this.escapeHtml(doc.description)}">
                                                            ${this.escapeHtml(doc.description)}
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
                                            ${this.escapeHtml(doc.fileSize || (doc.type === 'link' ? 'Cloud Link' : 'Tệp tải lên'))}
                                        </td>

                                        <td class="py-3 px-2 sm:px-3 text-slate-400 text-[11px] hidden sm:table-cell">
                                            ${doc.updatedAt || 'Hôm nay'}
                                        </td>

                                        <td class="py-2.5 sm:py-3 px-3 sm:px-4 text-right">
                                            <div class="flex items-center justify-end gap-1">
                                                <button onclick="window.documentHub.openDocument('${doc.id}')"
                                                    class="px-2 sm:px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white text-xs font-bold transition-colors flex items-center gap-1"
                                                    title="Mở tài liệu">
                                                    <i data-lucide="${isImage ? 'eye' : (isVideo ? 'play' : 'external-link')}" class="w-3.5 h-3.5"></i>
                                                    <span class="hidden sm:inline">${isImage ? 'Xem' : (isVideo ? 'Phát' : 'Mở')}</span>
                                                </button>

                                                ${doc.fileUrl ? `
                                                    <button onclick="window.documentHub.copyDocLink('${doc.id}')"
                                                        class="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors" title="Sao chép liên kết">
                                                        <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                                                    </button>
                                                ` : `
                                                    <button onclick="window.documentHub.downloadDocument('${doc.id}')"
                                                        class="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Tải về máy">
                                                        <i data-lucide="download" class="w-3.5 h-3.5"></i>
                                                    </button>
                                                `}

                                                <button onclick="window.documentHub.openEditModal('${doc.id}')"
                                                    class="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Chỉnh sửa tài liệu">
                                                    <i data-lucide="edit-3" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i>
                                                </button>

                                                <button onclick="window.documentHub.togglePin('${doc.id}')"
                                                    class="p-1 sm:p-1.5 rounded-lg ${doc.pinned ? 'text-amber-500 hover:text-amber-600' : 'text-slate-300 hover:text-amber-500'} hover:bg-amber-50 transition-colors"
                                                    title="${doc.pinned ? 'Bỏ ghim' : 'Ghim lên đầu'}">
                                                    <i data-lucide="star" class="w-4 h-4 ${doc.pinned ? 'fill-amber-400 text-amber-500' : ''}"></i>
                                                </button>

                                                <button onclick="window.documentHub.deleteDocument('${doc.id}')"
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
                                <h4 class="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug cursor-pointer"
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
                            <div class="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
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
                                            class="p-1 sm:p-1.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors" title="Sao chép liên kết">
                                            <i data-lucide="copy" class="w-4 h-4"></i>
                                        </button>
                                    ` : `
                                        <button onclick="window.documentHub.downloadDocument('${doc.id}')"
                                            class="p-1 sm:p-1.5 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Tải về máy">
                                            <i data-lucide="download" class="w-4 h-4"></i>
                                        </button>
                                    `}

                                    <button onclick="window.documentHub.openEditModal('${doc.id}')"
                                        class="p-1 sm:p-1.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Chỉnh sửa tài liệu">
                                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                                    </button>

                                    <button onclick="window.documentHub.deleteDocument('${doc.id}')"
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

    updateCategorySelectOptions(selectedValue = null) {
        const selectEl = document.getElementById('new-doc-category');
        if (!selectEl) return;

        const categories = window.salesStore.getDocumentCategories();
        selectEl.innerHTML = categories.map(cat => `
            <option value="${this.escapeHtml(cat.name)}">${this.escapeHtml(cat.name)}</option>
        `).join('');

        if (selectedValue) {
            selectEl.value = selectedValue;
        }
    }

    openCategoryManagerModal() {
        const modal = document.getElementById('category-manager-modal');
        if (!modal) return;
        this.renderCategoryManagerList();
        modal.classList.remove('hidden');
        lucide.createIcons();
    }

    closeCategoryManagerModal() {
        const modal = document.getElementById('category-manager-modal');
        if (modal) modal.classList.add('hidden');
        const input = document.getElementById('new-category-name-input');
        if (input) input.value = '';
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
        const preview = document.getElementById('new-category-icon-preview');
        if (preview) {
            preview.setAttribute('data-lucide', iconName);
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

        if (titleEl) titleEl.textContent = `Đổi biểu tượng: ${cat.name}`;

        const icons = this.getCuratedCategoryIcons();
        grid.innerHTML = icons.map(ic => `
            <button type="button" onclick="window.documentHub.applyIconToCategory('${cat.id}', '${ic.id}')"
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

        window.salesApp.showNotification(`Đã cập nhật biểu tượng mới cho "${cat.name}"!`, 'success');
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
                <div class="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors group">
                    <div class="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                        <button type="button" onclick="window.documentHub.openIconPickerForCategory('${cat.id}')"
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
                        <button type="button" onclick="window.documentHub.toggleCategoryPin('${cat.id}')"
                            class="p-1.5 rounded-lg transition-colors ${isPinned ? 'text-amber-500 hover:text-amber-600 bg-amber-50' : 'text-slate-300 hover:text-amber-500 hover:bg-slate-100'}"
                            title="${isPinned ? 'Bỏ ghim khỏi mục Truy cập nhanh' : 'Ghim danh mục lên mục Truy cập nhanh'}">
                            <i data-lucide="star" class="w-4 h-4 ${isPinned ? 'fill-amber-400 text-amber-500' : ''}"></i>
                        </button>
                        <button type="button" onclick="window.documentHub.promptRenameCategory('${cat.id}')"
                            class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Đổi tên danh mục">
                            <i data-lucide="edit-2" class="w-4 h-4"></i>
                        </button>
                        <button type="button" onclick="window.documentHub.deleteCategory('${cat.id}')"
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

    handleAddNewCategory(event) {
        event.preventDefault();
        const input = document.getElementById('new-category-name-input');
        const pinnedCheck = document.getElementById('new-category-pinned-check');
        if (!input) return;
        const name = input.value.trim();
        if (!name) return;

        const currentCats = window.salesStore.getDocumentCategories();
        if (currentCats.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            alert(`Danh mục "${name}" đã tồn tại! Vui lòng chọn tên khác.`);
            return;
        }

        const isPinned = Boolean(pinnedCheck && pinnedCheck.checked);
        const assignedIcon = this.selectedNewCategoryIcon || (typeof detectCategoryIcon === 'function' ? detectCategoryIcon(name) : 'folder');

        const newCat = {
            id: 'cat-' + Date.now(),
            name: name,
            icon: assignedIcon,
            pinned: isPinned
        };

        window.salesStore.saveDocumentCategory(newCat);
        input.value = '';
        if (pinnedCheck) pinnedCheck.checked = false;
        this.userPickedAddIcon = false;
        this.selectedNewCategoryIcon = 'folder';
        this.updateAddIconPreview('folder');
        const picker = document.getElementById('new-category-icon-picker');
        if (picker) picker.classList.add('hidden');

        this.renderCategoryManagerList();
        this.renderCategoryPills();
        this.updateCategorySelectOptions(name);
        this.renderQuickAccess();

        window.salesApp.showNotification(`Đã thêm danh mục mới: "${name}"${isPinned ? ' (đã ghim ⭐)' : ''}!`, 'success');
    }

    promptRenameCategory(catId) {
        const categories = window.salesStore.getDocumentCategories();
        const cat = categories.find(c => c.id === catId);
        if (!cat) return;

        const oldName = cat.name;
        const newName = prompt(`Nhập tên mới cho danh mục "${oldName}":`, oldName);
        if (!newName || !newName.trim() || newName.trim() === oldName) return;

        const cleanName = newName.trim();

        // Cập nhật danh mục
        cat.name = cleanName;
        window.salesStore.saveDocumentCategory(cat);

        // Tự động cập nhật các tài liệu đang thuộc danh mục cũ sang tên mới
        const docs = window.salesStore.getDocuments();
        let updatedCount = 0;
        docs.forEach(d => {
            if (d.category === oldName) {
                d.category = cleanName;
                window.salesStore.saveDocument(d);
                updatedCount++;
            }
        });

        this.renderCategoryManagerList();
        this.renderCategoryPills();
        this.updateCategorySelectOptions(cleanName);
        this.renderDocumentsList();
        this.renderQuickAccess();

        window.salesApp.showNotification(`Đã đổi tên danh mục thành "${cleanName}" (${updatedCount} tài liệu được cập nhật)!`, 'success');
    }

    deleteCategory(catId) {
        const categories = window.salesStore.getDocumentCategories();
        const cat = categories.find(c => c.id === catId);
        if (!cat) return;

        const docs = window.salesStore.getDocuments();
        const affectedDocs = docs.filter(d => d.category === cat.name || d.category === cat.id);

        if (affectedDocs.length > 0) {
            const confirmed = confirm(
                `Danh mục "${cat.name}" hiện đang có ${affectedDocs.length} tài liệu.\n` +
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
            const confirmed = confirm(`Bạn có chắc muốn xóa danh mục "${cat.name}" khỏi hệ thống?`);
            if (!confirmed) return;
        }

        window.salesStore.deleteDocumentCategory(catId);

        if (this.selectedCategory === cat.id || this.selectedCategory === cat.name) {
            this.selectedCategory = 'all';
        }

        this.renderCategoryManagerList();
        this.renderCategoryPills();
        this.updateCategorySelectOptions();
        this.renderDocumentsList();
        this.renderQuickAccess();

        window.salesApp.showNotification(`Đã xóa danh mục "${cat.name}"!`, 'info');
    }

    openAddModal() {
        const idInput = document.getElementById('editing-doc-id');
        if (idInput) idInput.value = '';

        const titleText = document.getElementById('doc-modal-title-text');
        if (titleText) titleText.textContent = 'Thêm Tài Nguyên Sales Mới';

        const subTitle = document.getElementById('doc-modal-subtitle');
        if (subTitle) subTitle.textContent = 'Tải tệp từ máy tính (PDF, Word, Excel, Ảnh, Video) hoặc lưu liên kết Cloud.';

        const submitText = document.getElementById('doc-modal-submit-text');
        if (submitText) submitText.textContent = 'Lưu Vào Kho Tài Nguyên';

        this.updateCategorySelectOptions();

        const form = document.getElementById('document-add-form');
        if (form) form.reset();
        this.clearSelectedFile();
        this.switchModalTab('upload');

        const modal = document.getElementById('document-add-modal');
        if (modal) modal.classList.remove('hidden');
        lucide.createIcons();
    }

    openEditModal(id) {
        const docs = window.salesStore.getDocuments();
        const doc = docs.find(d => d.id === id);
        if (!doc) return;

        const idInput = document.getElementById('editing-doc-id');
        if (idInput) idInput.value = doc.id;

        const titleText = document.getElementById('doc-modal-title-text');
        if (titleText) titleText.textContent = 'Chỉnh Sửa Tài Liệu';

        const subTitle = document.getElementById('doc-modal-subtitle');
        if (subTitle) subTitle.textContent = 'Cập nhật tên, danh mục, liên kết hoặc thông tin mô tả.';

        const submitText = document.getElementById('doc-modal-submit-text');
        if (submitText) submitText.textContent = 'Lưu Thay Đổi';

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

        if (doc.type === 'link' || doc.fileUrl) {
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
                delete targetDoc.fileUrl;

                if (type === 'image') {
                    try {
                        targetDoc.thumbnail = await this.createImageThumbnail(file);
                    } catch (e) {}
                }

                await this.fileStore.saveFile(docId, file);
            } else if (!existingDoc) {
                alert('Vui lòng chọn tệp từ máy tính để tải lên!');
                return;
            }
        } else {
            // Chế độ thêm hoặc sửa liên kết Cloud
            const fileUrl = document.getElementById('new-doc-url').value.trim();
            if (!fileUrl) {
                alert('Vui lòng nhập đường dẫn liên kết tài liệu!');
                return;
            }

            targetDoc.type = 'link';
            targetDoc.fileUrl = fileUrl;
            targetDoc.fileSize = 'Cloud Link';

            if (fileUrl.includes('docs.google.com/spreadsheets')) {
                targetDoc.fileType = 'xlsx';
                targetDoc.fileSize = 'Google Sheets';
            } else if (fileUrl.includes('docs.google.com/document')) {
                targetDoc.fileType = 'gdoc';
                targetDoc.fileSize = 'Google Docs';
            } else if (fileUrl.includes('drive.google.com')) {
                targetDoc.fileType = 'drive';
                targetDoc.fileSize = 'Drive Folder';
            } else if (fileUrl.includes('youtube.com') || fileUrl.includes('youtu.be')) {
                targetDoc.fileType = 'youtube';
                targetDoc.type = 'video';
                targetDoc.fileSize = 'Video Link';
            } else if (fileUrl.endsWith('.pdf')) {
                targetDoc.fileType = 'pdf';
            } else {
                targetDoc.fileType = targetDoc.fileType || 'link';
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

        const notifMsg = editingId ? `Đã cập nhật tài liệu: "${title}"!` : `Đã thêm tài liệu mới: "${title}"!`;
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
