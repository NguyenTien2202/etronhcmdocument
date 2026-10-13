/**
 * Callbot & Template Warehouse Logic - Etron Solutions
 * Quản lý kho bộ từ khóa nhận diện, kịch bản mẫu Excel/Google Sheets, Audio & Video demo theo ngành nghề.
 */

class CallbotHub {
    constructor() {
        this.activeSubTab = 'keywords'; // 'keywords' | 'templates' | 'media'
        this.selectedIndustry = 'ind-bds';
        this.searchQuery = '';
        this.templateFilter = 'all';
        this.mediaTypeFilter = 'all'; // 'all' | 'audio' | 'video'
    }

    init() {
        this.setupEventListeners();
        this.render();
    }

    setupEventListeners() {
        const searchInput = document.getElementById('cb-keyword-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.trim().toLowerCase();
                this.renderKeywords();
            });
        }
    }

    // ==========================================
    // 1. CHUYỂN ĐỔI SUB-TAB (Căn giữa, kiểu dáng pastel đồng bộ)
    // ==========================================
    switchSubTab(tabName) {
        this.activeSubTab = tabName;
        document.querySelectorAll('.cb-subtab-btn').forEach(btn => {
            const isMatch = btn.getAttribute('data-cb-tab') === tabName;
            if (isMatch) {
                btn.className = 'cb-subtab-btn flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 bg-white text-indigo-700 shadow-sm focus:outline-none border border-slate-200/50';
            } else {
                btn.className = 'cb-subtab-btn flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all flex items-center justify-center gap-2 focus:outline-none';
            }
        });

        document.getElementById('cb-tab-keywords')?.classList.toggle('hidden', tabName !== 'keywords');
        document.getElementById('cb-tab-templates')?.classList.toggle('hidden', tabName !== 'templates');
        document.getElementById('cb-tab-media')?.classList.toggle('hidden', tabName !== 'media');

        this.render();
    }

    render() {
        this.renderStats();
        if (this.activeSubTab === 'keywords') {
            this.renderKeywords();
        } else if (this.activeSubTab === 'templates') {
            this.renderTemplates();
        } else if (this.activeSubTab === 'media') {
            this.renderMedia();
        }
        if (window.lucide) lucide.createIcons();
    }

    renderStats() {
        const data = window.salesStore.getCallbotKeywords();
        const templates = window.salesStore.getCallbotTemplates();
        const mediaList = window.salesStore.getCallbotMedia();

        let totalKeywords = 0;
        if (data.common) {
            data.common.forEach(g => totalKeywords += (g.keywords ? g.keywords.length : 0));
        }
        if (data.industries) {
            data.industries.forEach(ind => {
                if (ind.groups) {
                    ind.groups.forEach(g => totalKeywords += (g.keywords ? g.keywords.length : 0));
                }
            });
        }

        const industriesCount = (data.industries || []).length;
        const templatesCount = templates.length;
        const mediaCount = mediaList.length;

        const statTotalKw = document.getElementById('cb-stat-total-keywords');
        const statIndustries = document.getElementById('cb-stat-total-industries');
        const statTemplates = document.getElementById('cb-stat-total-templates');
        const statMedia = document.getElementById('cb-stat-total-media');

        if (statTotalKw) statTotalKw.textContent = totalKeywords.toLocaleString('vi-VN') + '+ từ';
        if (statIndustries) statIndustries.textContent = industriesCount + ' ngành nghề';
        if (statTemplates) statTemplates.textContent = templatesCount + ' kịch bản';
        if (statMedia) statMedia.textContent = mediaCount + ' files demo';
    }

    // ==========================================
    // 2. PHÂN KHU BỘ TỪ KHÓA (CHUNG & THEO NGÀNH)
    // Tối giản: 1 hàng mô tả, 1 hàng từ khóa, có nút icon copy
    // ==========================================
    renderKeywords() {
        this.renderStats();
        const data = window.salesStore.getCallbotKeywords();
        this.renderCommonKeywords(data.common || []);
        this.renderIndustryKeywords(data.industries || []);
        if (window.lucide) lucide.createIcons();
    }

    renderCommonKeywords(commonGroups) {
        const container = document.getElementById('cb-common-keywords-container');
        if (!container) return;

        const query = this.searchQuery;
        let filteredGroups = commonGroups;

        if (query) {
            filteredGroups = commonGroups.filter(g => {
                const matchName = g.name.toLowerCase().includes(query);
                const matchDesc = (g.description || '').toLowerCase().includes(query);
                const matchKw = (g.keywords || []).some(k => k.toLowerCase().includes(query));
                return matchName || matchDesc || matchKw;
            });
        }

        if (filteredGroups.length === 0) {
            container.innerHTML = `
                <div class="col-span-full py-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                    <i data-lucide="search-x" class="w-8 h-8 mx-auto mb-2 text-slate-300"></i>
                    <p class="text-sm font-semibold">${query ? `Không tìm thấy từ khóa chung nào khớp với "${this.escapeHtml(query)}"` : 'Đang tải dữ liệu...'}</p>
                </div>
            `;
            return;
        }

        const colorMap = {
            emerald: { iconBg: 'bg-emerald-100 text-emerald-700' },
            rose: { iconBg: 'bg-rose-100 text-rose-700' },
            indigo: { iconBg: 'bg-indigo-100 text-indigo-700' },
            amber: { iconBg: 'bg-amber-100 text-amber-700' },
            slate: { iconBg: 'bg-slate-200 text-slate-700' },
            blue: { iconBg: 'bg-blue-100 text-blue-700' }
        };

        container.innerHTML = filteredGroups.map(group => {
            const c = colorMap[group.color] || colorMap.indigo;
            const kwList = group.keywords || [];

            return `
                <div class="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between group">
                    <!-- Header: Tên + Icon + Số lượng từ + Nút sửa ở góc -->
                    <div class="flex items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                        <div class="flex items-center gap-2.5 min-w-0">
                            <div class="w-8 h-8 rounded-xl ${c.iconBg} flex items-center justify-center shrink-0">
                                <i data-lucide="${group.icon || 'tag'}" class="w-4 h-4"></i>
                            </div>
                            <div class="min-w-0">
                                <h4 class="font-bold text-slate-900 text-xs sm:text-sm truncate">${this.escapeHtml(group.name)}</h4>
                                <span class="inline-block text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.2 rounded-full mt-0.5">
                                    ${kwList.length} từ
                                </span>
                            </div>
                        </div>
                        <button onclick="window.callbotHub.openEditGroupModal('common', '${group.id}')"
                            class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/80 transition-colors shrink-0"
                            title="Chỉnh sửa nhóm từ khóa">
                            <i data-lucide="edit-3" class="w-4 h-4"></i>
                        </button>
                    </div>

                    <!-- 2 Hàng: Hàng 1 Mô tả (có icon copy), Hàng 2 Từ khóa (có icon copy) -->
                    <div class="space-y-2 mt-3">
                        <!-- Hàng 1: Mô tả -->
                        <div class="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50/90 border border-slate-200/60">
                            <div class="flex items-center gap-1.5 min-w-0 flex-1">
                                <span class="text-[10px] font-bold text-slate-400 shrink-0 uppercase tracking-wider">Mô tả:</span>
                                <span class="text-xs text-slate-600 truncate" title="${this.escapeHtml(group.description || 'Chưa có mô tả')}">
                                    ${this.escapeHtml(group.description || 'Chưa có mô tả')}
                                </span>
                            </div>
                            <button onclick="window.callbotHub.copyText('${this.escapeJs(group.description || '')}', 'Đã sao chép mô tả!')"
                                class="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white transition-all shrink-0 active:scale-90"
                                title="Sao chép mô tả">
                                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>

                        <!-- Hàng 2: Từ khóa -->
                        <div class="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-indigo-50/40 border border-indigo-100/70">
                            <div class="flex items-center gap-1.5 min-w-0 flex-1">
                                <span class="text-[10px] font-bold text-indigo-400 shrink-0 uppercase tracking-wider">Từ khóa:</span>
                                <span class="text-xs text-indigo-900 font-mono truncate" title="${this.escapeHtml(kwList.join(', '))}">
                                    ${this.escapeHtml(kwList.join(', '))}
                                </span>
                            </div>
                            <button onclick="window.callbotHub.copyGroupKeywords('common', '${group.id}')"
                                class="p-1 rounded-lg text-indigo-500 hover:text-indigo-700 hover:bg-white transition-all shrink-0 active:scale-90"
                                title="Sao chép tất cả từ khóa">
                                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderIndustryKeywords(industries) {
        const tabsContainer = document.getElementById('cb-industry-tabs-container');
        const groupsContainer = document.getElementById('cb-industry-groups-container');
        if (!tabsContainer || !groupsContainer) return;

        if (industries.length === 0) {
            tabsContainer.innerHTML = '';
            groupsContainer.innerHTML = '<p class="text-sm text-slate-400 py-6 text-center">Chưa có danh mục ngành nghề nào.</p>';
            return;
        }

        // Đảm bảo selectedIndustry hợp lệ
        if (!industries.some(i => i.id === this.selectedIndustry)) {
            this.selectedIndustry = industries[0].id;
        }

        // Render Tabs Ngành Nghề - Phong cách Pastel đồng bộ Quote Builder
        tabsContainer.innerHTML = `
            ${industries.map(ind => {
                const isActive = ind.id === this.selectedIndustry;
                return `
                    <button onclick="window.callbotHub.selectIndustry('${ind.id}')"
                        class="px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-2 whitespace-nowrap shrink-0 border ${isActive ? 'bg-indigo-50/90 border-indigo-300 text-indigo-800 font-bold shadow-xs ring-1 ring-indigo-200/70' : 'bg-white border-slate-200 text-slate-600 font-medium hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900'}">
                        <i data-lucide="${ind.icon || 'layers'}" class="w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}"></i>
                        <span>${this.escapeHtml(ind.name)}</span>
                        <span class="text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-indigo-100 text-indigo-700 font-bold' : 'bg-slate-100 text-slate-500'}">
                            ${(ind.groups || []).length} nhóm
                        </span>
                    </button>
                `;
            }).join('')}
            <button onclick="window.callbotHub.openAddIndustryModal()"
                class="px-3 py-2 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50/80 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-2xs">
                <i data-lucide="plus-circle" class="w-4 h-4 text-emerald-600"></i>
                <span>Thêm Ngành Mới</span>
            </button>
        `;

        // Render Groups của Ngành đang chọn
        const curInd = industries.find(i => i.id === this.selectedIndustry);
        if (!curInd) return;

        const query = this.searchQuery;
        let filteredGroups = curInd.groups || [];

        if (query) {
            filteredGroups = filteredGroups.filter(g => {
                const matchName = g.name.toLowerCase().includes(query);
                const matchDesc = (g.description || '').toLowerCase().includes(query);
                const matchKw = (g.keywords || []).some(k => k.toLowerCase().includes(query));
                return matchName || matchDesc || matchKw;
            });
        }

        // Header thông tin ngành + Nút Copy All - Phong cách Pastel
        const headerInfo = document.getElementById('cb-industry-header-info');
        if (headerInfo) {
            let totalKw = 0;
            (curInd.groups || []).forEach(g => totalKw += (g.keywords ? g.keywords.length : 0));

            headerInfo.innerHTML = `
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/40 rounded-2xl p-4 border border-indigo-100/80 mb-4">
                    <div class="space-y-0.5">
                        <div class="flex items-center gap-2">
                            <h3 class="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                                <i data-lucide="${curInd.icon || 'building-2'}" class="w-5 h-5 text-indigo-600"></i>
                                <span>Bộ Từ Khóa Ngành: ${this.escapeHtml(curInd.name)}</span>
                            </h3>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                                ${totalKw} từ khóa
                            </span>
                        </div>
                        <p class="text-xs text-slate-500">${this.escapeHtml(curInd.description || 'Dành riêng cho kịch bản cuộc gọi ngành này.')}</p>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <button onclick="window.callbotHub.copyAllIndustryKeywords('${curInd.id}')"
                            class="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95">
                            <i data-lucide="copy-check" class="w-4 h-4"></i>
                            <span>Sao Chép Toàn Bộ Ngành</span>
                        </button>
                        <button onclick="window.callbotHub.openAddGroupModal('${curInd.id}')"
                            class="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95">
                            <i data-lucide="plus" class="w-4 h-4"></i>
                            <span>Thêm Nhóm Từ Khóa</span>
                        </button>
                    </div>
                </div>
            `;
        }

        if (filteredGroups.length === 0) {
            groupsContainer.innerHTML = `
                <div class="col-span-full py-10 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                    <i data-lucide="search-x" class="w-9 h-9 mx-auto mb-2 text-slate-300"></i>
                    <p class="text-sm font-semibold text-slate-700">Không tìm thấy nhóm từ khóa nào khớp trong ngành này</p>
                </div>
            `;
            return;
        }

        groupsContainer.innerHTML = filteredGroups.map(group => {
            const kwList = group.keywords || [];

            return `
                <div class="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between group">
                    <!-- Header Nhóm: Tên + Icon + Số lượng từ + Nút sửa ở góc -->
                    <div class="flex items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                        <div class="flex items-center gap-2 min-w-0">
                            <div class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                <i data-lucide="${group.icon || 'tag'}" class="w-4 h-4"></i>
                            </div>
                            <div class="min-w-0">
                                <h4 class="font-bold text-slate-900 text-xs sm:text-sm truncate">${this.escapeHtml(group.name)}</h4>
                                <span class="inline-block text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.2 rounded-full mt-0.5">
                                    ${kwList.length} từ
                                </span>
                            </div>
                        </div>
                        <button onclick="window.callbotHub.openEditGroupModal('${curInd.id}', '${group.id}')"
                            class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/80 transition-colors shrink-0"
                            title="Chỉnh sửa nhóm từ khóa">
                            <i data-lucide="edit-3" class="w-4 h-4"></i>
                        </button>
                    </div>

                    <!-- 2 Hàng: Hàng 1 Mô tả (có icon copy), Hàng 2 Từ khóa (có icon copy) -->
                    <div class="space-y-2 mt-3">
                        <!-- Hàng 1: Mô tả -->
                        <div class="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50/90 border border-slate-200/60">
                            <div class="flex items-center gap-1.5 min-w-0 flex-1">
                                <span class="text-[10px] font-bold text-slate-400 shrink-0 uppercase tracking-wider">Mô tả:</span>
                                <span class="text-xs text-slate-600 truncate" title="${this.escapeHtml(group.description || 'Chưa có mô tả')}">
                                    ${this.escapeHtml(group.description || 'Chưa có mô tả')}
                                </span>
                            </div>
                            <button onclick="window.callbotHub.copyText('${this.escapeJs(group.description || '')}', 'Đã sao chép mô tả!')"
                                class="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white transition-all shrink-0 active:scale-90"
                                title="Sao chép mô tả">
                                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>

                        <!-- Hàng 2: Từ khóa -->
                        <div class="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-indigo-50/40 border border-indigo-100/70">
                            <div class="flex items-center gap-1.5 min-w-0 flex-1">
                                <span class="text-[10px] font-bold text-indigo-400 shrink-0 uppercase tracking-wider">Từ khóa:</span>
                                <span class="text-xs text-indigo-900 font-mono truncate" title="${this.escapeHtml(kwList.join(', '))}">
                                    ${this.escapeHtml(kwList.join(', '))}
                                </span>
                            </div>
                            <button onclick="window.callbotHub.copyGroupKeywords('${curInd.id}', '${group.id}')"
                                class="p-1 rounded-lg text-indigo-500 hover:text-indigo-700 hover:bg-white transition-all shrink-0 active:scale-90"
                                title="Sao chép tất cả từ khóa">
                                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    selectIndustry(indId) {
        this.selectedIndustry = indId;
        this.renderKeywords();
    }

    copyText(text, msg) {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            window.salesApp.showNotification(msg || 'Đã sao chép!', 'success');
        }).catch(() => {
            this.fallbackCopy(text, msg || 'Đã sao chép!');
        });
    }

    copyGroupKeywords(indId, groupId) {
        const data = window.salesStore.getCallbotKeywords();
        let targetGroup = null;

        if (indId === 'common') {
            targetGroup = (data.common || []).find(g => g.id === groupId);
        } else {
            const ind = (data.industries || []).find(i => i.id === indId);
            if (ind) targetGroup = (ind.groups || []).find(g => g.id === groupId);
        }

        if (targetGroup && targetGroup.keywords) {
            const textToCopy = targetGroup.keywords.join(', ');
            this.copyText(textToCopy, `Đã sao chép ${targetGroup.keywords.length} từ khóa nhóm "${targetGroup.name}"!`);
        }
    }

    copyAllIndustryKeywords(indId) {
        const data = window.salesStore.getCallbotKeywords();
        const ind = (data.industries || []).find(i => i.id === indId);
        if (!ind) return;

        const allKw = [];
        (ind.groups || []).forEach(g => {
            if (g.keywords) allKw.push(...g.keywords);
        });

        const textToCopy = Array.from(new Set(allKw)).join(', ');
        this.copyText(textToCopy, `Đã sao chép toàn bộ ${allKw.length} từ khóa ngành "${ind.name}"!`);
    }

    fallbackCopy(text, msg) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            window.salesApp.showNotification(msg, 'success');
        } catch (e) {
            window.salesApp.showNotification('Không thể sao chép tự động, vui lòng chọn thủ công.', 'error');
        }
        document.body.removeChild(ta);
    }

    // ==========================================
    // 3. PHÂN KHU KHO KỊCH BẢN MẪU (EXCEL / DRIVE)
    // Tối giản: Không trường dự án, không link xem từ khóa, nút mở link & xem file chỉ để icon kèm icon copy
    // ==========================================
    renderTemplates() {
        const container = document.getElementById('cb-templates-grid');
        const filterContainer = document.getElementById('cb-template-filters');
        if (!container) return;

        const templates = window.salesStore.getCallbotTemplates();
        const industries = (window.salesStore.getCallbotKeywords().industries || []);

        // Render Filter Buttons - Phong cách Pastel đồng bộ Quote Builder
        if (filterContainer) {
            filterContainer.innerHTML = `
                <button onclick="window.callbotHub.filterTemplates('all')"
                    class="px-3 py-1.5 rounded-xl text-xs transition-all border ${this.templateFilter === 'all' ? 'bg-indigo-50/90 border-indigo-300 text-indigo-800 font-bold shadow-xs ring-1 ring-indigo-200/70' : 'bg-white border-slate-200 text-slate-600 font-medium hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900'}">
                    Tất Cả (${templates.length})
                </button>
                ${industries.map(ind => {
                    const count = templates.filter(t => t.industry === ind.id).length;
                    const isActive = this.templateFilter === ind.id;
                    return `
                        <button onclick="window.callbotHub.filterTemplates('${ind.id}')"
                            class="px-3 py-1.5 rounded-xl text-xs transition-all border flex items-center gap-1.5 ${isActive ? 'bg-indigo-50/90 border-indigo-300 text-indigo-800 font-bold shadow-xs ring-1 ring-indigo-200/70' : 'bg-white border-slate-200 text-slate-600 font-medium hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900'}">
                            <i data-lucide="${ind.icon || 'folder'}" class="w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}"></i>
                            <span>${this.escapeHtml(ind.name)} (${count})</span>
                        </button>
                    `;
                }).join('')}
            `;
        }

        let filtered = templates;
        if (this.templateFilter !== 'all') {
            filtered = templates.filter(t => t.industry === this.templateFilter);
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                    <i data-lucide="file-question" class="w-10 h-10 mx-auto mb-2 text-slate-300"></i>
                    <p class="font-bold text-slate-700 text-sm">Chưa có kịch bản mẫu nào trong danh mục này</p>
                    <p class="text-xs text-slate-400 mt-1">Bấm nút "+ Thêm Kịch Bản Mẫu" để lưu link Google Sheets/Drive hoặc file Excel.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(tpl => {
            const hasUrl = Boolean(tpl.scriptUrl && tpl.scriptUrl.trim());
            const hasFile = Boolean(tpl.scriptFileName && tpl.scriptFileName.trim());

            return `
                <div class="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between group">
                    <div class="space-y-3">
                        <!-- Header Card: Ngành nghề + Ngày cập nhật -->
                        <div class="flex items-center justify-between gap-2">
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                                ${this.escapeHtml(tpl.industryName || 'Ngành khác')}
                            </span>
                            <span class="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                                <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                                ${tpl.updatedAt || 'Mới cập nhật'}
                            </span>
                        </div>

                        <!-- Tiêu đề Kịch bản (Bỏ hoàn toàn trường dự án) -->
                        <h4 class="font-extrabold text-slate-900 text-xs sm:text-sm leading-snug group-hover:text-indigo-600 transition-colors cursor-pointer"
                            onclick="${hasUrl ? `window.open('${this.escapeHtml(tpl.scriptUrl)}', '_blank')` : ''}">
                            ${this.escapeHtml(tpl.title)}
                        </h4>

                        <!-- Đính kèm: Link hoặc File hoặc Cả hai - Nút chỉ để Icon kèm Icon Copy bên cạnh -->
                        <div class="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-2">
                            ${hasUrl ? `
                                <div class="flex items-center justify-between gap-2">
                                    <div class="flex items-center gap-2 min-w-0">
                                        <div class="w-6 h-6 rounded-lg bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0">
                                            <i data-lucide="link" class="w-3 h-3"></i>
                                        </div>
                                        <span class="text-xs font-semibold text-slate-700 truncate">Google Sheets / Drive</span>
                                    </div>
                                    <div class="flex items-center gap-1 shrink-0">
                                        <a href="${this.escapeHtml(tpl.scriptUrl)}" target="_blank" rel="noopener noreferrer"
                                            class="p-1.5 rounded-lg bg-white hover:bg-emerald-50 text-emerald-700 border border-slate-200 hover:border-emerald-300 transition-colors shadow-2xs"
                                            title="Mở liên kết">
                                            <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                                        </a>
                                        <button onclick="window.callbotHub.copyText('${this.escapeJs(tpl.scriptUrl)}', 'Đã sao chép liên kết!')"
                                            class="p-1.5 rounded-lg bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-300 transition-colors shadow-2xs"
                                            title="Sao chép link">
                                            <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                                        </button>
                                    </div>
                                </div>
                            ` : ''}

                            ${hasFile ? `
                                <div class="flex items-center justify-between gap-2 ${hasUrl ? 'pt-2 border-t border-slate-200/60' : ''}">
                                    <div class="flex items-center gap-2 min-w-0">
                                        <div class="w-6 h-6 rounded-lg bg-indigo-100/80 text-indigo-700 flex items-center justify-center shrink-0">
                                            <i data-lucide="file-spreadsheet" class="w-3 h-3"></i>
                                        </div>
                                        <span class="text-xs font-semibold text-slate-700 truncate" title="${this.escapeHtml(tpl.scriptFileName)}">
                                            ${this.escapeHtml(tpl.scriptFileName)}
                                        </span>
                                    </div>
                                    <div class="flex items-center gap-1 shrink-0">
                                        ${hasUrl ? `
                                            <a href="${this.escapeHtml(tpl.scriptUrl)}" target="_blank" rel="noopener noreferrer"
                                                class="p-1.5 rounded-lg bg-white hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-300 transition-colors shadow-2xs"
                                                title="Xem / Tải file">
                                                <i data-lucide="download" class="w-3.5 h-3.5"></i>
                                            </a>
                                        ` : ''}
                                        <button onclick="window.callbotHub.copyText('${this.escapeJs(tpl.scriptFileName)}', 'Đã sao chép tên file!')"
                                            class="p-1.5 rounded-lg bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-300 transition-colors shadow-2xs"
                                            title="Sao chép tên file">
                                            <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                                        </button>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Footer Thao Tác: Bỏ hoàn toàn xem từ khóa, chỉ còn icon sửa và xóa -->
                    <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-end gap-1">
                        <button onclick="window.callbotHub.openEditTemplateModal('${tpl.id}')"
                            class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Chỉnh sửa kịch bản mẫu">
                            <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                        </button>
                        <button onclick="window.callbotHub.deleteTemplate('${tpl.id}')"
                            class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Xóa kịch bản mẫu">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    filterTemplates(indId) {
        this.templateFilter = indId;
        this.renderTemplates();
        if (window.lucide) lucide.createIcons();
    }

    deleteTemplate(id) {
        if (confirm('Bạn có chắc chắn muốn xóa kịch bản mẫu này khỏi kho?')) {
            window.salesStore.deleteCallbotTemplate(id);
            this.render();
            window.salesApp.showNotification('Đã xóa kịch bản mẫu khỏi kho!', 'info');
        }
    }

    // ==========================================
    // 4. PHÂN KHU THƯ VIỆN (CHỈ CẦN AUDIO HOẶC VIDEO)
    // Tối giản: Bộ lọc chuyển đổi giữa Audio hoặc Video, thẻ hiển thị gọn gàng
    // ==========================================
    renderMedia() {
        const container = document.getElementById('cb-media-container');
        const filterContainer = document.getElementById('cb-media-filters');
        if (!container) return;

        const mediaList = window.salesStore.getCallbotMedia();

        // Filter Bar - Phong cách Pastel đồng bộ Quote Builder
        if (filterContainer) {
            filterContainer.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-500 shrink-0">Loại Media:</span>
                    <button onclick="window.callbotHub.filterMediaByType('all')"
                        class="px-3 py-1.5 rounded-xl text-xs transition-all border ${this.mediaTypeFilter === 'all' ? 'bg-slate-100 border-slate-300 text-slate-800 font-bold shadow-xs' : 'bg-white border-slate-200 text-slate-600 font-medium hover:bg-slate-50'}">
                        Tất Cả (${mediaList.length})
                    </button>
                    <button onclick="window.callbotHub.filterMediaByType('audio')"
                        class="px-3 py-1.5 rounded-xl text-xs transition-all border flex items-center gap-1.5 ${this.mediaTypeFilter === 'audio' ? 'bg-amber-50 border-amber-300 text-amber-800 font-bold shadow-xs ring-1 ring-amber-200' : 'bg-white border-slate-200 text-slate-600 font-medium hover:bg-amber-50/50 hover:border-amber-200'}">
                        <i data-lucide="music" class="w-3.5 h-3.5 text-amber-600"></i>
                        <span>Audio / Giọng đọc</span>
                    </button>
                    <button onclick="window.callbotHub.filterMediaByType('video')"
                        class="px-3 py-1.5 rounded-xl text-xs transition-all border flex items-center gap-1.5 ${this.mediaTypeFilter === 'video' ? 'bg-purple-50 border-purple-300 text-purple-800 font-bold shadow-xs ring-1 ring-purple-200' : 'bg-white border-slate-200 text-slate-600 font-medium hover:bg-purple-50/50 hover:border-purple-200'}">
                        <i data-lucide="video" class="w-3.5 h-3.5 text-purple-600"></i>
                        <span>Video Demo</span>
                    </button>
                </div>
            `;
        }

        let filtered = mediaList;
        if (this.mediaTypeFilter !== 'all') {
            filtered = filtered.filter(m => m.type === this.mediaTypeFilter);
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                    <i data-lucide="folder-search" class="w-10 h-10 mx-auto mb-2 text-slate-300"></i>
                    <p class="font-bold text-slate-700 text-sm">Chưa có file audio hoặc video mẫu nào</p>
                    <p class="text-xs text-slate-400 mt-1">Bấm "+ Thêm Media Mới" để lưu link demo, file audio (MP3, WAV) hoặc video.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                ${filtered.map(item => {
                    const isAudio = item.type === 'audio';
                    const hasUrl = Boolean(item.mediaUrl && item.mediaUrl.trim());

                    return `
                        <div class="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between">
                            <div class="space-y-3">
                                <!-- Header: Ngành + Badge Audio / Video -->
                                <div class="flex items-center justify-between gap-2">
                                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                        ${this.escapeHtml(item.industryName || 'Ngành khác')}
                                    </span>
                                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${isAudio ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-purple-50 text-purple-700 border border-purple-200'}">
                                        <i data-lucide="${isAudio ? 'music' : 'video'}" class="w-3 h-3"></i>
                                        <span>${isAudio ? 'Audio' : 'Video'}</span>
                                    </span>
                                </div>

                                <!-- Tiêu đề Media -->
                                <h4 class="font-bold text-slate-900 text-xs sm:text-sm leading-snug line-clamp-2">
                                    ${this.escapeHtml(item.title)}
                                </h4>

                                <!-- Trình phát Audio hoặc Nút Video -->
                                ${isAudio ? `
                                    <div class="p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/70 space-y-2">
                                        ${hasUrl ? `
                                            <audio controls class="w-full h-8" preload="none">
                                                <source src="${this.escapeHtml(item.mediaUrl)}" type="audio/mpeg">
                                                <source src="${this.escapeHtml(item.mediaUrl)}" type="audio/wav">
                                            </audio>
                                            <div class="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/50">
                                                <span class="text-slate-400 font-mono text-[10px] truncate max-w-[140px]">${this.escapeHtml(item.fileName || 'Audio demo')}</span>
                                                <div class="flex items-center gap-1">
                                                    <a href="${this.escapeHtml(item.mediaUrl)}" target="_blank" rel="noopener noreferrer"
                                                        class="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-white transition-colors"
                                                        title="Mở file trực tiếp">
                                                        <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                                                    </a>
                                                    <button onclick="window.callbotHub.copyText('${this.escapeJs(item.mediaUrl)}', 'Đã sao chép link audio!')"
                                                        class="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-white transition-colors"
                                                        title="Sao chép link">
                                                        <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        ` : `
                                            <p class="text-xs text-slate-400 italic">Chưa có link audio</p>
                                        `}
                                    </div>
                                ` : `
                                    <div class="p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/70 space-y-2">
                                        ${hasUrl ? `
                                            <div class="flex items-center gap-2">
                                                <a href="${this.escapeHtml(item.mediaUrl)}" target="_blank" rel="noopener noreferrer"
                                                    class="flex-1 py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs">
                                                    <i data-lucide="play-circle" class="w-4 h-4"></i>
                                                    <span>Xem Video Demo</span>
                                                </a>
                                                <button onclick="window.callbotHub.copyText('${this.escapeJs(item.mediaUrl)}', 'Đã sao chép link video!')"
                                                    class="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors shadow-2xs"
                                                    title="Sao chép link video">
                                                    <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                                                </button>
                                            </div>
                                        ` : `
                                            <p class="text-xs text-slate-400 italic">Chưa có link video</p>
                                        `}
                                    </div>
                                `}
                            </div>

                            <!-- Footer Card: Ngày cập nhật + Sửa & Xóa bằng icon -->
                            <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                                <span class="text-[11px] text-slate-400 font-mono">${item.updatedAt || '2026-10-14'}</span>
                                <div class="flex items-center gap-1">
                                    <button onclick="window.callbotHub.openEditMediaModal('${item.id}')"
                                        class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                        title="Chỉnh sửa media">
                                        <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                                    </button>
                                    <button onclick="window.callbotHub.deleteMedia('${item.id}')"
                                        class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                        title="Xóa media này">
                                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }

    filterMediaByType(type) {
        this.mediaTypeFilter = type;
        this.renderMedia();
    }

    openAddMediaModal() {
        const modal = document.getElementById('modal-callbot-media');
        if (!modal) return;

        document.getElementById('cb-med-form').reset();
        document.getElementById('cb-med-id').value = '';
        document.getElementById('cb-med-modal-title').textContent = 'Thêm Audio / Video Demo Mới';

        this.updateMediaIndustrySelectOptions();
        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }

    openEditMediaModal(id) {
        const modal = document.getElementById('modal-callbot-media');
        if (!modal) return;

        const mediaList = window.salesStore.getCallbotMedia();
        const item = mediaList.find(m => m.id === id);
        if (!item) return;

        this.updateMediaIndustrySelectOptions();

        document.getElementById('cb-med-id').value = item.id;
        document.getElementById('cb-med-title').value = item.title || '';
        document.getElementById('cb-med-industry').value = item.industry || '';
        document.getElementById('cb-med-type').value = item.type || 'audio';
        document.getElementById('cb-med-url').value = item.mediaUrl || '';
        document.getElementById('cb-med-filename').value = item.fileName || '';

        document.getElementById('cb-med-modal-title').textContent = 'Chỉnh Sửa Audio / Video Demo';
        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }

    updateMediaIndustrySelectOptions() {
        const sel = document.getElementById('cb-med-industry');
        if (!sel) return;

        const industries = (window.salesStore.getCallbotKeywords().industries || []);
        sel.innerHTML = industries.map(ind => `
            <option value="${ind.id}">${this.escapeHtml(ind.name)}</option>
        `).join('');
    }

    saveMediaFromModal(e) {
        e.preventDefault();
        const id = document.getElementById('cb-med-id').value;
        const title = document.getElementById('cb-med-title').value.trim();
        const industry = document.getElementById('cb-med-industry').value;
        const type = document.getElementById('cb-med-type').value;
        const mediaUrl = document.getElementById('cb-med-url').value.trim();
        const fileName = document.getElementById('cb-med-filename').value.trim();
        const fileInput = document.getElementById('cb-med-file');

        if (!title) {
            window.salesApp.showNotification('Vui lòng nhập tên media demo!', 'warning');
            return;
        }

        const industries = (window.salesStore.getCallbotKeywords().industries || []);
        const targetInd = industries.find(i => i.id === industry);

        const finalizeSave = (resolvedUrl, resolvedFileName) => {
            const mediaData = {
                id: id || null,
                title,
                industry,
                industryName: targetInd ? targetInd.name : 'Ngành khác',
                type,
                mediaUrl: resolvedUrl || mediaUrl,
                fileName: resolvedFileName || fileName || (type === 'audio' ? 'demo_audio.mp3' : 'demo_video.mp4'),
                fileSize: type === 'audio' ? 'Audio MP3/WAV' : 'Video MP4/Web'
            };

            window.salesStore.saveCallbotMedia(mediaData);
            document.getElementById('modal-callbot-media').classList.add('hidden');
            this.renderMedia();
            this.renderStats();
            window.salesApp.showNotification(id ? 'Đã cập nhật media thành công!' : 'Đã thêm media mới vào thư viện!', 'success');
        };

        // Nếu người dùng chọn file trực tiếp từ máy
        if (fileInput && fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            if (file.size < 2.5 * 1024 * 1024) {
                const reader = new FileReader();
                reader.onload = (re) => finalizeSave(re.target.result, file.name);
                reader.readAsDataURL(file);
            } else {
                finalizeSave(mediaUrl, file.name);
            }
        } else {
            finalizeSave(mediaUrl, fileName);
        }
    }

    deleteMedia(id) {
        if (confirm('Bạn có chắc chắn muốn xóa file media này khỏi thư viện?')) {
            window.salesStore.deleteCallbotMedia(id);
            this.renderMedia();
            this.renderStats();
            window.salesApp.showNotification('Đã xóa media khỏi thư viện!', 'info');
        }
    }

    // ==========================================
    // 5. MODALS QUẢN LÝ KỊCH BẢN & TỪ KHÓA
    // ==========================================
    openAddTemplateModal() {
        const modal = document.getElementById('modal-callbot-template');
        if (!modal) return;

        document.getElementById('cb-tpl-form').reset();
        document.getElementById('cb-tpl-id').value = '';
        document.getElementById('cb-tpl-modal-title').textContent = 'Thêm Kịch Bản Mẫu Mới';

        this.updateIndustrySelectOptions();
        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }

    openEditTemplateModal(id) {
        const modal = document.getElementById('modal-callbot-template');
        if (!modal) return;

        const templates = window.salesStore.getCallbotTemplates();
        const tpl = templates.find(t => t.id === id);
        if (!tpl) return;

        this.updateIndustrySelectOptions();

        document.getElementById('cb-tpl-id').value = tpl.id;
        document.getElementById('cb-tpl-title').value = tpl.title || '';
        document.getElementById('cb-tpl-industry').value = tpl.industry || '';
        document.getElementById('cb-tpl-url').value = tpl.scriptUrl || '';
        document.getElementById('cb-tpl-filename').value = tpl.scriptFileName || '';

        document.getElementById('cb-tpl-modal-title').textContent = 'Chỉnh Sửa Kịch Bản Mẫu';
        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }

    updateIndustrySelectOptions() {
        const sel = document.getElementById('cb-tpl-industry');
        if (!sel) return;

        const industries = (window.salesStore.getCallbotKeywords().industries || []);
        sel.innerHTML = industries.map(ind => `
            <option value="${ind.id}">${this.escapeHtml(ind.name)}</option>
        `).join('');
    }

    saveTemplateFromModal(e) {
        e.preventDefault();
        const id = document.getElementById('cb-tpl-id').value;
        const title = document.getElementById('cb-tpl-title').value.trim();
        const industry = document.getElementById('cb-tpl-industry').value;
        const scriptUrl = document.getElementById('cb-tpl-url').value.trim();
        const scriptFileName = document.getElementById('cb-tpl-filename').value.trim();

        if (!title) {
            window.salesApp.showNotification('Vui lòng nhập tên kịch bản mẫu!', 'warning');
            return;
        }

        if (!scriptUrl && !scriptFileName) {
            window.salesApp.showNotification('Vui lòng điền link Google Sheets/Drive hoặc tên file Excel (hoặc cả hai)!', 'warning');
            return;
        }

        const industries = (window.salesStore.getCallbotKeywords().industries || []);
        const targetInd = industries.find(i => i.id === industry);

        const tplData = {
            id: id || null,
            title,
            industry,
            industryName: targetInd ? targetInd.name : 'Ngành khác',
            scriptUrl,
            scriptFileName: scriptFileName || (scriptUrl ? 'Kich_ban.xlsx' : ''),
            pinned: false
        };

        window.salesStore.saveCallbotTemplate(tplData);
        document.getElementById('modal-callbot-template').classList.add('hidden');
        this.render();
        window.salesApp.showNotification(id ? 'Đã cập nhật kịch bản mẫu!' : 'Đã thêm kịch bản mẫu mới vào kho!', 'success');
    }

    openEditGroupModal(indId, groupId) {
        const modal = document.getElementById('modal-callbot-group');
        if (!modal) return;

        const data = window.salesStore.getCallbotKeywords();
        let group = null;

        if (indId === 'common') {
            group = (data.common || []).find(g => g.id === groupId);
        } else {
            const ind = (data.industries || []).find(i => i.id === indId);
            if (ind) group = (ind.groups || []).find(g => g.id === groupId);
        }

        if (!group) return;

        document.getElementById('cb-grp-ind-id').value = indId;
        document.getElementById('cb-grp-id').value = groupId;
        document.getElementById('cb-grp-name').value = group.name || '';
        document.getElementById('cb-grp-desc').value = group.description || '';
        document.getElementById('cb-grp-keywords').value = (group.keywords || []).join(', ');

        document.getElementById('cb-grp-modal-title').textContent = `Chỉnh Sửa Nhóm Từ Khóa: ${group.name}`;
        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }

    openAddGroupModal(indId) {
        const modal = document.getElementById('modal-callbot-group');
        if (!modal) return;

        document.getElementById('cb-grp-form').reset();
        document.getElementById('cb-grp-ind-id').value = indId;
        document.getElementById('cb-grp-id').value = '';
        document.getElementById('cb-grp-modal-title').textContent = indId === 'common' ? 'Thêm Nhóm Từ Khóa Dùng Chung' : 'Thêm Nhóm Từ Khóa Mới';

        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }

    saveGroupFromModal(e) {
        e.preventDefault();
        const indId = document.getElementById('cb-grp-ind-id').value;
        const groupId = document.getElementById('cb-grp-id').value;
        const name = document.getElementById('cb-grp-name').value.trim();
        const description = document.getElementById('cb-grp-desc').value.trim();
        const kwRaw = document.getElementById('cb-grp-keywords').value.trim();

        if (!name || !kwRaw) {
            window.salesApp.showNotification('Vui lòng nhập tên nhóm và danh sách từ khóa!', 'warning');
            return;
        }

        const keywords = kwRaw.split(/[,;\n]+/).map(k => k.trim()).filter(Boolean);
        const data = window.salesStore.getCallbotKeywords();

        if (indId === 'common') {
            if (!data.common) data.common = [];
            if (groupId) {
                const idx = data.common.findIndex(g => g.id === groupId);
                if (idx !== -1) {
                    data.common[idx] = { ...data.common[idx], name, description, keywords };
                }
            } else {
                data.common.push({
                    id: 'grp-cmn-' + Date.now(),
                    name,
                    icon: 'tag',
                    color: 'indigo',
                    description,
                    keywords
                });
            }
        } else {
            const ind = (data.industries || []).find(i => i.id === indId);
            if (!ind) return;

            if (!ind.groups) ind.groups = [];

            if (groupId) {
                const idx = ind.groups.findIndex(g => g.id === groupId);
                if (idx !== -1) {
                    ind.groups[idx] = { ...ind.groups[idx], name, description, keywords };
                }
            } else {
                ind.groups.push({
                    id: 'grp-' + Date.now(),
                    name,
                    icon: 'tag',
                    description,
                    keywords
                });
            }
        }

        window.salesStore.saveCallbotKeywords(data);
        document.getElementById('modal-callbot-group').classList.add('hidden');
        this.renderKeywords();
        window.salesApp.showNotification('Đã lưu nhóm từ khóa thành công!', 'success');
    }

    openAddIndustryModal() {
        const name = prompt('Nhập tên ngành nghề mới bạn muốn thêm:');
        if (!name || !name.trim()) return;

        const data = window.salesStore.getCallbotKeywords();
        if (!data.industries) data.industries = [];

        const newId = 'ind-' + Date.now();
        data.industries.push({
            id: newId,
            name: name.trim(),
            icon: 'layers',
            description: `Bộ từ khóa nhận diện chuyên sâu ngành ${name.trim()}`,
            groups: []
        });

        window.salesStore.saveCallbotKeywords(data);
        this.selectedIndustry = newId;
        this.renderKeywords();
        window.salesApp.showNotification(`Đã tạo ngành nghề mới: "${name.trim()}"!`, 'success');
    }

    escapeHtml(text) {
        if (!text) return '';
        return String(text)
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

// Global Callbot Hub Instance
window.callbotHub = new CallbotHub();
