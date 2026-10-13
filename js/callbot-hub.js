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
        this.templateSearchQuery = '';
        this.mediaTypeFilter = 'all'; // 'all' | 'audio' | 'video'
        this.mediaIndustryFilter = 'all';
        this.mediaSearchQuery = '';
        this.isTplDropdownOpen = false;
        this.isMedDropdownOpen = false;
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
        const tplSearch = document.getElementById('cb-template-search');
        if (tplSearch) {
            tplSearch.addEventListener('input', (e) => {
                this.setTemplateSearch(e.target.value);
            });
        }
        const mediaSearch = document.getElementById('cb-media-search');
        if (mediaSearch) {
            mediaSearch.addEventListener('input', (e) => {
                this.setMediaSearch(e.target.value);
            });
        }

        // Đóng dropdown khi bấm ra ngoài
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#cb-template-ind-filter-wrapper')) {
                if (this.isTplDropdownOpen) {
                    this.isTplDropdownOpen = false;
                    this.renderTemplateDropdown();
                }
            }
            if (!e.target.closest('#cb-media-ind-filter-wrapper')) {
                if (this.isMedDropdownOpen) {
                    this.isMedDropdownOpen = false;
                    this.renderMediaDropdown();
                }
            }
        });
    }

    // ==========================================
    // BỘ MÀU PASTEL GRADIENT ĐỒNG BỘ TOÀN HỆ THỐNG
    // Viền sáng, nền gradient mềm mại, hiệu ứng hover glow
    // ==========================================
    getPastelTheme(index) {
        const themes = [
            {
                name: 'indigo',
                cardBg: 'bg-gradient-to-br from-indigo-50/80 via-blue-50/30 to-white',
                border: 'border-indigo-200/90 hover:border-indigo-400',
                glow: 'hover:shadow-md hover:shadow-indigo-100/60',
                iconBg: 'bg-indigo-100 text-indigo-700',
                badgeBg: 'bg-indigo-100/90 text-indigo-700 border border-indigo-200/60',
                rowBg: 'bg-white/85 hover:bg-white border-indigo-100/70',
                kwText: 'text-indigo-800',
                kwLabel: 'text-indigo-500'
            },
            {
                name: 'emerald',
                cardBg: 'bg-gradient-to-br from-emerald-50/80 via-teal-50/30 to-white',
                border: 'border-emerald-200/90 hover:border-emerald-400',
                glow: 'hover:shadow-md hover:shadow-emerald-100/60',
                iconBg: 'bg-emerald-100 text-emerald-700',
                badgeBg: 'bg-emerald-100/90 text-emerald-700 border border-emerald-200/60',
                rowBg: 'bg-white/85 hover:bg-white border-emerald-100/70',
                kwText: 'text-emerald-800',
                kwLabel: 'text-emerald-500'
            },
            {
                name: 'purple',
                cardBg: 'bg-gradient-to-br from-purple-50/80 via-fuchsia-50/30 to-white',
                border: 'border-purple-200/90 hover:border-purple-400',
                glow: 'hover:shadow-md hover:shadow-purple-100/60',
                iconBg: 'bg-purple-100 text-purple-700',
                badgeBg: 'bg-purple-100/90 text-purple-700 border border-purple-200/60',
                rowBg: 'bg-white/85 hover:bg-white border-purple-100/70',
                kwText: 'text-purple-800',
                kwLabel: 'text-purple-500'
            },
            {
                name: 'amber',
                cardBg: 'bg-gradient-to-br from-amber-50/80 via-orange-50/30 to-white',
                border: 'border-amber-200/90 hover:border-amber-400',
                glow: 'hover:shadow-md hover:shadow-amber-100/60',
                iconBg: 'bg-amber-100 text-amber-700',
                badgeBg: 'bg-amber-100/90 text-amber-700 border border-amber-200/60',
                rowBg: 'bg-white/85 hover:bg-white border-amber-100/70',
                kwText: 'text-amber-800',
                kwLabel: 'text-amber-500'
            },
            {
                name: 'rose',
                cardBg: 'bg-gradient-to-br from-rose-50/80 via-pink-50/30 to-white',
                border: 'border-rose-200/90 hover:border-rose-400',
                glow: 'hover:shadow-md hover:shadow-rose-100/60',
                iconBg: 'bg-rose-100 text-rose-700',
                badgeBg: 'bg-rose-100/90 text-rose-700 border border-rose-200/60',
                rowBg: 'bg-white/85 hover:bg-white border-rose-100/70',
                kwText: 'text-rose-800',
                kwLabel: 'text-rose-500'
            },
            {
                name: 'sky',
                cardBg: 'bg-gradient-to-br from-sky-50/80 via-cyan-50/30 to-white',
                border: 'border-sky-200/90 hover:border-sky-400',
                glow: 'hover:shadow-md hover:shadow-sky-100/60',
                iconBg: 'bg-sky-100 text-sky-700',
                badgeBg: 'bg-sky-100/90 text-sky-700 border border-sky-200/60',
                rowBg: 'bg-white/85 hover:bg-white border-sky-100/70',
                kwText: 'text-sky-800',
                kwLabel: 'text-sky-500'
            }
        ];
        return themes[Math.abs(index) % themes.length];
    }

    setTemplateSearch(val) {
        this.templateSearchQuery = (val || '').trim().toLowerCase();
        this.renderTemplates();
    }

    setMediaSearch(val) {
        this.mediaSearchQuery = (val || '').trim().toLowerCase();
        this.renderMedia();
    }

    filterMediaByIndustry(indId) {
        this.mediaIndustryFilter = indId;
        this.renderMedia();
    }

    // ==========================================
    // 1. CHUYỂN ĐỔI SUB-TAB (Căn giữa, kiểu dáng pastel đồng bộ)
    // ==========================================
    switchSubTab(tabName) {
        this.activeSubTab = tabName;
        document.querySelectorAll('.cb-subtab-btn').forEach(btn => {
            const isMatch = btn.getAttribute('data-cb-tab') === tabName;
            if (isMatch) {
                btn.className = 'cb-subtab-btn flex-1 sm:flex-initial px-3 sm:px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 bg-white text-indigo-700 shadow-sm focus:outline-none border border-slate-200/50';
            } else {
                btn.className = 'cb-subtab-btn flex-1 sm:flex-initial px-3 sm:px-5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all flex items-center justify-center gap-1.5 sm:gap-2 focus:outline-none';
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
        const statsEl = document.getElementById('cb-hub-stats');
        if (!statsEl) return;

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

        statsEl.innerHTML = `
            <div class="flex items-center gap-1.5 text-xs overflow-x-auto no-scrollbar flex-nowrap sm:flex-wrap py-0.5">
                <span class="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 shrink-0 text-[11px] sm:text-xs">
                    <i data-lucide="tag" class="w-3.5 h-3.5"></i>
                    <span>Tổng: <b>${totalKeywords.toLocaleString('vi-VN')}+</b> từ khóa</span>
                </span>
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium shrink-0 text-[11px]">
                    <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
                    ${industriesCount} Ngành nghề
                </span>
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium shrink-0 text-[11px]">
                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                    ${templatesCount} Kịch bản mẫu
                </span>
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium shrink-0 text-[11px]">
                    <span class="w-2 h-2 rounded-full bg-purple-500"></span>
                    ${mediaCount} Media demo
                </span>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
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

        container.innerHTML = filteredGroups.map((group, idx) => {
            const theme = this.getPastelTheme(idx);
            const kwList = group.keywords || [];

            return `
                <div class="${theme.cardBg} ${theme.border} ${theme.glow} rounded-2xl border p-4 shadow-2xs hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group">
                    <!-- Header: Tên + Icon + Số lượng từ + Nút sửa ở góc -->
                    <div class="flex items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200/50">
                        <div class="flex items-center gap-2.5 min-w-0">
                            <div class="w-8 h-8 rounded-xl ${theme.iconBg} flex items-center justify-center shrink-0 shadow-xs">
                                <i data-lucide="${group.icon || 'tag'}" class="w-4 h-4"></i>
                            </div>
                            <div class="min-w-0">
                                <h4 class="font-extrabold text-slate-900 text-xs sm:text-sm truncate group-hover:${theme.kwText} transition-colors">${this.escapeHtml(group.name)}</h4>
                                <span class="inline-block text-[10px] font-bold ${theme.badgeBg} px-2 py-0.2 rounded-full mt-0.5">
                                    ${kwList.length} từ
                                </span>
                            </div>
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                            <button onclick="window.callbotHub.openEditGroupModal('common', '${group.id}')"
                                class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white/80 transition-colors shrink-0"
                                title="Chỉnh sửa nhóm từ khóa">
                                <i data-lucide="edit-3" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.callbotHub.deleteGroup('common', '${group.id}')"
                                class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white/80 transition-colors shrink-0"
                                title="Xóa nhóm từ khóa">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>

                    <!-- 2 Hàng: Hàng 1 Mô tả (có icon copy), Hàng 2 Từ khóa (có icon copy) -->
                    <div class="space-y-2 mt-3">
                        <!-- Hàng 1: Mô tả -->
                        <div class="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl ${theme.rowBg} border transition-colors shadow-2xs">
                            <div class="flex items-center gap-1.5 min-w-0 flex-1">
                                <span class="text-[10px] font-extrabold text-slate-400 shrink-0 uppercase tracking-wider">Mô tả:</span>
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
                        <div class="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl ${theme.rowBg} border transition-colors shadow-2xs">
                            <div class="flex items-center gap-1.5 min-w-0 flex-1">
                                <span class="text-[10px] font-extrabold ${theme.kwLabel} shrink-0 uppercase tracking-wider">Từ khóa:</span>
                                <span class="text-xs ${theme.kwText} font-medium font-mono truncate" title="${this.escapeHtml(kwList.join(', '))}">
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
        tabsContainer.innerHTML = industries.map(ind => {
            const isActive = ind.id === this.selectedIndustry;
            return `
                <button onclick="window.callbotHub.selectIndustry('${ind.id}')"
                    class="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs transition-all flex items-center gap-2 whitespace-nowrap shrink-0 border ${isActive ? 'bg-indigo-50/90 border-indigo-300 text-indigo-800 font-bold shadow-xs ring-1 ring-indigo-200/70' : 'bg-white border-slate-200 text-slate-600 font-medium hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900'}">
                    <i data-lucide="${ind.icon || 'layers'}" class="w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}"></i>
                    <span>${this.escapeHtml(ind.name)}</span>
                    <span class="text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-indigo-100 text-indigo-700 font-bold' : 'bg-slate-100 text-slate-500 font-mono'}">
                        ${(ind.groups || []).length} nhóm
                    </span>
                </button>
            `;
        }).join('');

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

        // Header thông tin ngành + Nút Thêm Nhóm Từ Khóa (Chỉ giữ nút Quản lý ở dòng B theo yêu cầu)
        const headerInfo = document.getElementById('cb-industry-header-info');
        if (headerInfo) {
            let totalKw = 0;
            (curInd.groups || []).forEach(g => totalKw += (g.keywords ? g.keywords.length : 0));

            headerInfo.innerHTML = `
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-indigo-50/70 via-blue-50/30 to-purple-50/20 rounded-2xl p-3.5 sm:p-4 border border-indigo-100/90 mb-4">
                    <div class="space-y-0.5">
                        <div class="flex items-center gap-2">
                            <h3 class="font-extrabold text-slate-900 text-xs sm:text-base flex items-center gap-2">
                                <i data-lucide="${curInd.icon || 'building-2'}" class="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600"></i>
                                <span>Bộ Từ Khóa Ngành: ${this.escapeHtml(curInd.name)}</span>
                            </h3>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 shrink-0">
                                ${totalKw} từ khóa
                            </span>
                        </div>
                        <p class="text-xs text-slate-500 line-clamp-1 sm:line-clamp-none">${this.escapeHtml(curInd.description || 'Dành riêng cho kịch bản cuộc gọi ngành này.')}</p>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                        <button onclick="window.callbotHub.openAddGroupModal('${curInd.id}')"
                            class="px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all flex items-center gap-1.5 shrink-0 shadow-2xs active:scale-95"
                            title="Thêm nhóm từ khóa cho ngành này">
                            <i data-lucide="plus" class="w-4 h-4"></i>
                            <span class="hidden sm:inline">Thêm Nhóm Từ Khóa</span>
                            <span class="sm:hidden">Thêm nhóm</span>
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

        groupsContainer.innerHTML = filteredGroups.map((group, idx) => {
            const theme = this.getPastelTheme(idx);
            const kwList = group.keywords || [];

            return `
                <div class="${theme.cardBg} ${theme.border} ${theme.glow} rounded-2xl border p-4 shadow-2xs hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group">
                    <!-- Header Nhóm: Tên + Icon + Số lượng từ + Nút sửa ở góc -->
                    <div class="flex items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200/50">
                        <div class="flex items-center gap-2 min-w-0">
                            <div class="w-8 h-8 rounded-xl ${theme.iconBg} flex items-center justify-center shrink-0 shadow-xs">
                                <i data-lucide="${group.icon || 'tag'}" class="w-4 h-4"></i>
                            </div>
                            <div class="min-w-0">
                                <h4 class="font-extrabold text-slate-900 text-xs sm:text-sm truncate group-hover:${theme.kwText} transition-colors">${this.escapeHtml(group.name)}</h4>
                                <span class="inline-block text-[10px] font-bold ${theme.badgeBg} px-2 py-0.2 rounded-full mt-0.5">
                                    ${kwList.length} từ
                                </span>
                            </div>
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                            <button onclick="window.callbotHub.openEditGroupModal('${curInd.id}', '${group.id}')"
                                class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white/80 transition-colors shrink-0"
                                title="Chỉnh sửa nhóm từ khóa">
                                <i data-lucide="edit-3" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.callbotHub.deleteGroup('${curInd.id}', '${group.id}')"
                                class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white/80 transition-colors shrink-0"
                                title="Xóa nhóm từ khóa">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>

                    <!-- 2 Hàng: Hàng 1 Mô tả (có icon copy), Hàng 2 Từ khóa (có icon copy) -->
                    <div class="space-y-2 mt-3">
                        <!-- Hàng 1: Mô tả -->
                        <div class="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl ${theme.rowBg} border transition-colors shadow-2xs">
                            <div class="flex items-center gap-1.5 min-w-0 flex-1">
                                <span class="text-[10px] font-extrabold text-slate-400 shrink-0 uppercase tracking-wider">Mô tả:</span>
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
                        <div class="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl ${theme.rowBg} border transition-colors shadow-2xs">
                            <div class="flex items-center gap-1.5 min-w-0 flex-1">
                                <span class="text-[10px] font-extrabold ${theme.kwLabel} shrink-0 uppercase tracking-wider">Từ khóa:</span>
                                <span class="text-xs ${theme.kwText} font-medium font-mono truncate" title="${this.escapeHtml(kwList.join(', '))}">
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
    // 3. PHÂN KHU KHO KỊCH BẢN MẪU (DRIVE & EXCEL)
    // Tối giản: Không trường dự án, không link xem từ khóa, nút mở link & xem file chỉ để icon kèm icon copy
    // Thẻ được phối màu pastel rực rỡ, viền sáng và bóng đổ hover glow
    // ==========================================
    renderTemplates() {
        const container = document.getElementById('cb-templates-grid');
        if (!container) return;

        this.renderTemplateDropdown();

        const templates = window.salesStore.getCallbotTemplates();
        let filtered = templates;

        if (this.templateFilter !== 'all') {
            filtered = templates.filter(t => t.industry === this.templateFilter);
        }

        if (this.templateSearchQuery) {
            const q = this.templateSearchQuery;
            filtered = filtered.filter(t => {
                const matchTitle = (t.title || '').toLowerCase().includes(q);
                const matchInd = (t.industryName || '').toLowerCase().includes(q);
                const matchFile = (t.scriptFileName || '').toLowerCase().includes(q);
                const matchBot = (t.botUrl || '').toLowerCase().includes(q);
                return matchTitle || matchInd || matchFile || matchBot;
            });
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                    <i data-lucide="file-question" class="w-10 h-10 mx-auto mb-2 text-slate-300"></i>
                    <p class="font-bold text-slate-700 text-sm">Chưa có kịch bản mẫu nào khớp</p>
                    <p class="text-xs text-slate-400 mt-1">${this.templateSearchQuery ? `Không tìm thấy kết quả khớp với "${this.escapeHtml(this.templateSearchQuery)}"` : 'Bấm nút "+ Thêm Kịch Bản" để lưu link Google Sheets/Drive, link Bot hệ thống hoặc file Excel.'}</p>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
            return;
        }

        container.innerHTML = filtered.map((tpl, idx) => {
            const theme = this.getPastelTheme(idx);
            const hasUrl = Boolean(tpl.scriptUrl && tpl.scriptUrl.trim());
            const hasBotUrl = Boolean(tpl.botUrl && tpl.botUrl.trim());
            const hasFile = Boolean(tpl.scriptFileName && tpl.scriptFileName.trim());

            return `
                <div class="${theme.cardBg} ${theme.border} ${theme.glow} rounded-2xl border p-4 sm:p-5 shadow-2xs hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group">
                    <div class="space-y-3">
                        <!-- Header Card: Ngành nghề + Ngày cập nhật -->
                        <div class="flex items-center justify-between gap-2">
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${theme.badgeBg}">
                                ${this.escapeHtml(tpl.industryName || 'Ngành khác')}
                            </span>
                            <span class="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                                <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                                ${tpl.updatedAt || 'Mới cập nhật'}
                            </span>
                        </div>

                        <!-- Tiêu đề Kịch bản (Bỏ hoàn toàn trường dự án) -->
                        <h4 class="font-extrabold text-slate-900 text-xs sm:text-sm leading-snug group-hover:${theme.kwText} transition-colors cursor-pointer"
                            onclick="${(hasUrl || hasBotUrl) ? `window.open('${this.escapeHtml(tpl.scriptUrl || tpl.botUrl)}', '_blank')` : ''}">
                            ${this.escapeHtml(tpl.title)}
                        </h4>

                        <!-- Đính kèm: Link Drive, Link Bot hệ thống hoặc File - Nút chỉ để Icon kèm Icon Copy bên cạnh -->
                        <div class="p-2.5 rounded-xl ${theme.rowBg} border space-y-2 shadow-2xs">
                            ${hasUrl ? `
                                <div class="flex items-center justify-between gap-2">
                                    <div class="flex items-center gap-2 min-w-0">
                                        <div class="w-6 h-6 rounded-lg bg-emerald-100/90 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                                            <i data-lucide="link" class="w-3 h-3"></i>
                                        </div>
                                        <span class="text-xs font-semibold text-slate-700 truncate">Google Sheets / Drive</span>
                                    </div>
                                    <div class="flex items-center gap-1 shrink-0">
                                        <a href="${this.escapeHtml(tpl.scriptUrl)}" target="_blank" rel="noopener noreferrer"
                                            class="p-1.5 rounded-lg bg-white hover:bg-emerald-50 text-emerald-700 border border-slate-200 hover:border-emerald-300 transition-colors shadow-2xs"
                                            title="Mở liên kết Drive/Sheets">
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

                            ${hasBotUrl ? `
                                <div class="flex items-center justify-between gap-2 ${hasUrl ? 'pt-2 border-t border-slate-200/60' : ''}">
                                    <div class="flex items-center gap-2 min-w-0">
                                        <div class="w-6 h-6 rounded-lg bg-indigo-100/90 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs">
                                            <i data-lucide="bot" class="w-3 h-3"></i>
                                        </div>
                                        <span class="text-xs font-semibold text-slate-700 truncate">Kịch Bản Bot Hệ Thống</span>
                                    </div>
                                    <div class="flex items-center gap-1 shrink-0">
                                        <a href="${this.escapeHtml(tpl.botUrl)}" target="_blank" rel="noopener noreferrer"
                                            class="p-1.5 rounded-lg bg-white hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-300 transition-colors shadow-2xs"
                                            title="Mở kịch bản trên hệ thống Callbot">
                                            <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                                        </a>
                                        <button onclick="window.callbotHub.copyText('${this.escapeJs(tpl.botUrl)}', 'Đã sao chép link bot!')"
                                            class="p-1.5 rounded-lg bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-300 transition-colors shadow-2xs"
                                            title="Sao chép link bot">
                                            <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                                        </button>
                                    </div>
                                </div>
                            ` : ''}

                            ${hasFile ? `
                                <div class="flex items-center justify-between gap-2 ${(hasUrl || hasBotUrl) ? 'pt-2 border-t border-slate-200/60' : ''}">
                                    <div class="flex items-center gap-2 min-w-0">
                                        <div class="w-6 h-6 rounded-lg bg-blue-100/90 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs">
                                            <i data-lucide="file-spreadsheet" class="w-3 h-3"></i>
                                        </div>
                                        <span class="text-xs font-semibold text-slate-700 truncate" title="${this.escapeHtml(tpl.scriptFileName)}">
                                            ${this.escapeHtml(tpl.scriptFileName)}
                                        </span>
                                    </div>
                                    ${hasUrl ? `
                                        <div class="flex items-center gap-1 shrink-0">
                                            <a href="${this.escapeHtml(tpl.scriptUrl)}" target="_blank" rel="noopener noreferrer"
                                                class="p-1.5 rounded-lg bg-white hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-300 transition-colors shadow-2xs"
                                                title="Xem / Tải file">
                                                <i data-lucide="download" class="w-3.5 h-3.5"></i>
                                            </a>
                                        </div>
                                    ` : ''}
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Footer Thao Tác: Bỏ hoàn toàn xem từ khóa, chỉ còn icon sửa và xóa -->
                    <div class="mt-3 pt-2.5 border-t border-slate-200/50 flex items-center justify-end gap-1">
                        <button onclick="window.callbotHub.openEditTemplateModal('${tpl.id}')"
                            class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white/80 transition-colors"
                            title="Chỉnh sửa kịch bản mẫu">
                            <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                        </button>
                        <button onclick="window.callbotHub.deleteTemplate('${tpl.id}')"
                            class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white/80 transition-colors"
                            title="Xóa kịch bản mẫu">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        if (window.lucide) lucide.createIcons();
    }

    renderTemplateDropdown() {
        const wrapper = document.getElementById('cb-template-ind-filter-wrapper');
        if (!wrapper) return;

        const templates = window.salesStore.getCallbotTemplates();
        const industries = (window.salesStore.getCallbotKeywords().industries || []);

        let currentLabel = 'Tất cả ngành nghề';
        let currentIcon = 'folder';
        let currentCount = templates.length;

        if (this.templateFilter !== 'all') {
            const ind = industries.find(i => i.id === this.templateFilter);
            if (ind) {
                currentLabel = ind.name;
                currentIcon = ind.icon || 'layers';
                currentCount = templates.filter(t => t.industry === ind.id).length;
            }
        }

        wrapper.innerHTML = `
            <button type="button" onclick="window.callbotHub.toggleTemplateDropdown(event)"
                class="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl shadow-2xs hover:border-indigo-300 transition-all focus:outline-none">
                <div class="flex items-center gap-2 truncate">
                    <i data-lucide="${currentIcon}" class="w-3.5 h-3.5 text-indigo-600 shrink-0"></i>
                    <span class="truncate">${this.escapeHtml(currentLabel)}</span>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 font-mono font-bold">${currentCount}</span>
                    <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${this.isTplDropdownOpen ? 'rotate-180' : ''}"></i>
                </div>
            </button>

            <!-- Dropdown Menu -->
            <div class="${this.isTplDropdownOpen ? '' : 'hidden'} absolute left-0 right-0 sm:right-auto sm:w-72 top-full mt-1.5 z-40 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100 max-h-72 overflow-y-auto">
                <!-- Option: Tất cả ngành nghề -->
                <button type="button" onclick="window.callbotHub.selectTemplateIndustry('all')"
                    class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors ${this.templateFilter === 'all' ? 'bg-indigo-50 text-indigo-800 font-bold' : 'text-slate-700 hover:bg-slate-100 font-medium'}">
                    <span class="flex items-center gap-2 truncate">
                        <i data-lucide="folder" class="w-3.5 h-3.5 text-indigo-500"></i>
                        <span>Tất cả ngành nghề</span>
                    </span>
                    <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 font-mono">${templates.length}</span>
                </button>

                <!-- Danh sách ngành nghề -->
                ${industries.map(ind => {
                    const count = templates.filter(t => t.industry === ind.id).length;
                    const isSelected = this.templateFilter === ind.id;
                    return `
                        <button type="button" onclick="window.callbotHub.selectTemplateIndustry('${ind.id}')"
                            class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-800 font-bold' : 'text-slate-700 hover:bg-slate-100 font-medium'}">
                            <span class="flex items-center gap-2 truncate">
                                <i data-lucide="${ind.icon || 'layers'}" class="w-3.5 h-3.5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}"></i>
                                <span class="truncate">${this.escapeHtml(ind.name)}</span>
                            </span>
                            <span class="text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-indigo-100 text-indigo-700 font-bold' : 'bg-slate-100 text-slate-500 font-mono'}">${count}</span>
                        </button>
                    `;
                }).join('')}

                <!-- Action Quản lý ngành nghề ở dòng cuối theo yêu cầu -->
                <div class="border-t border-slate-100 my-1 pt-1"></div>
                <button type="button" onclick="window.callbotHub.openIndustryManagerFromDropdown('templates')"
                    class="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 transition-colors">
                    <span class="flex items-center gap-2">
                        <i data-lucide="sliders-horizontal" class="w-3.5 h-3.5 text-indigo-600"></i>
                        <span>Quản lý ngành nghề...</span>
                    </span>
                    <i data-lucide="chevron-right" class="w-3.5 h-3.5 text-indigo-400"></i>
                </button>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }

    toggleTemplateDropdown(e) {
        if (e) e.stopPropagation();
        this.isTplDropdownOpen = !this.isTplDropdownOpen;
        this.renderTemplateDropdown();
    }

    selectTemplateIndustry(indId) {
        this.templateFilter = indId;
        this.isTplDropdownOpen = false;
        this.renderTemplates();
    }

    filterTemplates(indId) {
        this.selectTemplateIndustry(indId);
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
    // Thẻ được phối màu pastel rực rỡ, viền sáng và bóng đổ hover glow
    // ==========================================
    renderMedia() {
        const container = document.getElementById('cb-media-container');
        if (!container) return;

        this.renderMediaDropdown();

        const mediaList = window.salesStore.getCallbotMedia();

        const typeBtns = document.getElementById('cb-media-type-btns');
        if (typeBtns) {
            const audioCount = mediaList.filter(m => m.type === 'audio').length;
            const videoCount = mediaList.filter(m => m.type === 'video').length;

            typeBtns.innerHTML = `
                <button onclick="window.callbotHub.filterMediaByType('all')"
                    class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${this.mediaTypeFilter === 'all' ? 'bg-white text-slate-800 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}">
                    Tất Cả (${mediaList.length})
                </button>
                <button onclick="window.callbotHub.filterMediaByType('audio')"
                    class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${this.mediaTypeFilter === 'audio' ? 'bg-white text-amber-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}">
                    <i data-lucide="music" class="w-3 h-3 text-amber-500"></i>
                    <span>Audio (${audioCount})</span>
                </button>
                <button onclick="window.callbotHub.filterMediaByType('video')"
                    class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${this.mediaTypeFilter === 'video' ? 'bg-white text-purple-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}">
                    <i data-lucide="video" class="w-3 h-3 text-purple-500"></i>
                    <span>Video (${videoCount})</span>
                </button>
            `;
        }

        let filtered = mediaList;
        if (this.mediaTypeFilter !== 'all') {
            filtered = filtered.filter(m => m.type === this.mediaTypeFilter);
        }
        if (this.mediaIndustryFilter !== 'all') {
            filtered = filtered.filter(m => m.industry === this.mediaIndustryFilter);
        }
        if (this.mediaSearchQuery) {
            const q = this.mediaSearchQuery;
            filtered = filtered.filter(m => {
                const matchTitle = (m.title || '').toLowerCase().includes(q);
                const matchInd = (m.industryName || '').toLowerCase().includes(q);
                const matchFile = (m.fileName || '').toLowerCase().includes(q);
                const matchType = (m.type || '').toLowerCase().includes(q);
                return matchTitle || matchInd || matchFile || matchType;
            });
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                    <i data-lucide="folder-search" class="w-10 h-10 mx-auto mb-2 text-slate-300"></i>
                    <p class="font-bold text-slate-700 text-sm">Chưa có file audio hoặc video mẫu nào khớp</p>
                    <p class="text-xs text-slate-400 mt-1">${this.mediaSearchQuery ? `Không tìm thấy file khớp với "${this.escapeHtml(this.mediaSearchQuery)}"` : 'Bấm "+ Thêm Media" để lưu link demo, file audio (MP3, WAV) hoặc video.'}</p>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
            return;
        }

        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                ${filtered.map((item, idx) => {
                    const theme = this.getPastelTheme(idx);
                    const isAudio = item.type === 'audio';
                    const hasUrl = Boolean(item.mediaUrl && item.mediaUrl.trim());

                    return `
                        <div class="${theme.cardBg} ${theme.border} ${theme.glow} rounded-2xl border p-4 sm:p-5 shadow-2xs hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group">
                            <div class="space-y-3">
                                <!-- Header: Ngành + Badge Audio / Video -->
                                <div class="flex items-center justify-between gap-2">
                                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${theme.badgeBg}">
                                        ${this.escapeHtml(item.industryName || 'Ngành khác')}
                                    </span>
                                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${isAudio ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-purple-50 text-purple-700 border border-purple-200'}">
                                        <i data-lucide="${isAudio ? 'music' : 'video'}" class="w-3 h-3"></i>
                                        <span>${isAudio ? 'Audio' : 'Video'}</span>
                                    </span>
                                </div>

                                <!-- Tiêu đề Media -->
                                <h4 class="font-extrabold text-slate-900 text-xs sm:text-sm leading-snug line-clamp-2 group-hover:${theme.kwText} transition-colors">
                                    ${this.escapeHtml(item.title)}
                                </h4>

                                <!-- Trình phát Audio hoặc Nút Video -->
                                ${isAudio ? `
                                    <div class="p-2.5 ${theme.rowBg} rounded-xl border space-y-2 shadow-2xs">
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
                                    <div class="p-2.5 ${theme.rowBg} rounded-xl border space-y-2 shadow-2xs">
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
                            <div class="mt-3 pt-2.5 border-t border-slate-200/50 flex items-center justify-between text-xs">
                                <span class="text-[11px] text-slate-400 font-mono">${item.updatedAt || '2026-10-14'}</span>
                                <div class="flex items-center gap-1">
                                    <button onclick="window.callbotHub.openEditMediaModal('${item.id}')"
                                        class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white/80 transition-colors"
                                        title="Chỉnh sửa media">
                                        <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                                    </button>
                                    <button onclick="window.callbotHub.deleteMedia('${item.id}')"
                                        class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white/80 transition-colors"
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

    renderMediaDropdown() {
        const wrapper = document.getElementById('cb-media-ind-filter-wrapper');
        if (!wrapper) return;

        const mediaList = window.salesStore.getCallbotMedia();
        const industries = (window.salesStore.getCallbotKeywords().industries || []);

        let currentLabel = 'Tất cả ngành nghề';
        let currentIcon = 'folder';
        let currentCount = mediaList.length;

        if (this.mediaIndustryFilter !== 'all') {
            const ind = industries.find(i => i.id === this.mediaIndustryFilter);
            if (ind) {
                currentLabel = ind.name;
                currentIcon = ind.icon || 'layers';
                currentCount = mediaList.filter(m => m.industry === ind.id).length;
            }
        }

        wrapper.innerHTML = `
            <button type="button" onclick="window.callbotHub.toggleMediaDropdown(event)"
                class="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl shadow-2xs hover:border-indigo-300 transition-all focus:outline-none">
                <div class="flex items-center gap-2 truncate">
                    <i data-lucide="${currentIcon}" class="w-3.5 h-3.5 text-indigo-600 shrink-0"></i>
                    <span class="truncate">${this.escapeHtml(currentLabel)}</span>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 font-mono font-bold">${currentCount}</span>
                    <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${this.isMedDropdownOpen ? 'rotate-180' : ''}"></i>
                </div>
            </button>

            <!-- Dropdown Menu -->
            <div class="${this.isMedDropdownOpen ? '' : 'hidden'} absolute left-0 right-0 sm:right-auto sm:w-72 top-full mt-1.5 z-40 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100 max-h-72 overflow-y-auto">
                <!-- Option: Tất cả ngành nghề -->
                <button type="button" onclick="window.callbotHub.selectMediaIndustry('all')"
                    class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors ${this.mediaIndustryFilter === 'all' ? 'bg-indigo-50 text-indigo-800 font-bold' : 'text-slate-700 hover:bg-slate-100 font-medium'}">
                    <span class="flex items-center gap-2 truncate">
                        <i data-lucide="folder" class="w-3.5 h-3.5 text-indigo-500"></i>
                        <span>Tất cả ngành nghề</span>
                    </span>
                    <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 font-mono">${mediaList.length}</span>
                </button>

                <!-- Danh sách ngành nghề -->
                ${industries.map(ind => {
                    const count = mediaList.filter(m => m.industry === ind.id).length;
                    const isSelected = this.mediaIndustryFilter === ind.id;
                    return `
                        <button type="button" onclick="window.callbotHub.selectMediaIndustry('${ind.id}')"
                            class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-800 font-bold' : 'text-slate-700 hover:bg-slate-100 font-medium'}">
                            <span class="flex items-center gap-2 truncate">
                                <i data-lucide="${ind.icon || 'layers'}" class="w-3.5 h-3.5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}"></i>
                                <span class="truncate">${this.escapeHtml(ind.name)}</span>
                            </span>
                            <span class="text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-indigo-100 text-indigo-700 font-bold' : 'bg-slate-100 text-slate-500 font-mono'}">${count}</span>
                        </button>
                    `;
                }).join('')}

                <!-- Action Quản lý ngành nghề ở dòng cuối theo yêu cầu -->
                <div class="border-t border-slate-100 my-1 pt-1"></div>
                <button type="button" onclick="window.callbotHub.openIndustryManagerFromDropdown('media')"
                    class="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 transition-colors">
                    <span class="flex items-center gap-2">
                        <i data-lucide="sliders-horizontal" class="w-3.5 h-3.5 text-indigo-600"></i>
                        <span>Quản lý ngành nghề...</span>
                    </span>
                    <i data-lucide="chevron-right" class="w-3.5 h-3.5 text-indigo-400"></i>
                </button>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }

    toggleMediaDropdown(e) {
        if (e) e.stopPropagation();
        this.isMedDropdownOpen = !this.isMedDropdownOpen;
        this.renderMediaDropdown();
    }

    selectMediaIndustry(indId) {
        this.mediaIndustryFilter = indId;
        this.isMedDropdownOpen = false;
        this.renderMedia();
    }

    openIndustryManagerFromDropdown(tab) {
        this.isTplDropdownOpen = false;
        this.isMedDropdownOpen = false;
        this.renderTemplateDropdown();
        this.renderMediaDropdown();
        this.openIndustryManagerModal();
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
        const botInput = document.getElementById('cb-tpl-boturl');
        if (botInput) botInput.value = '';
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
        const botInput = document.getElementById('cb-tpl-boturl');
        if (botInput) botInput.value = tpl.botUrl || '';

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
        const botUrl = (document.getElementById('cb-tpl-boturl')?.value || '').trim();

        if (!title) {
            window.salesApp.showNotification('Vui lòng nhập tên kịch bản mẫu!', 'warning');
            return;
        }

        if (!scriptUrl && !scriptFileName && !botUrl) {
            window.salesApp.showNotification('Vui lòng điền link Drive/Sheets, link Bot hệ thống hoặc file Excel!', 'warning');
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
            botUrl,
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

        const delBtn = document.getElementById('cb-grp-delete-btn');
        if (delBtn) delBtn.classList.remove('hidden');

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

        const delBtn = document.getElementById('cb-grp-delete-btn');
        if (delBtn) delBtn.classList.add('hidden');

        document.getElementById('cb-grp-modal-title').textContent = indId === 'common' ? 'Thêm Nhóm Từ Khóa Dùng Chung' : 'Thêm Nhóm Từ Khóa Mới';

        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }

    deleteGroup(indId, groupId) {
        const data = window.salesStore.getCallbotKeywords();
        let groupName = 'nhóm từ khóa này';

        if (indId === 'common') {
            const grp = (data.common || []).find(g => g.id === groupId);
            if (grp) groupName = grp.name;
        } else {
            const ind = (data.industries || []).find(i => i.id === indId);
            if (ind) {
                const grp = (ind.groups || []).find(g => g.id === groupId);
                if (grp) groupName = grp.name;
            }
        }

        if (!confirm(`Bạn có chắc chắn muốn xóa nhóm từ khóa "${groupName}" không?`)) {
            return;
        }

        if (indId === 'common') {
            data.common = (data.common || []).filter(g => g.id !== groupId);
        } else {
            const ind = (data.industries || []).find(i => i.id === indId);
            if (ind && ind.groups) {
                ind.groups = ind.groups.filter(g => g.id !== groupId);
            }
        }

        window.salesStore.saveCallbotKeywords(data);
        const modal = document.getElementById('modal-callbot-group');
        if (modal) modal.classList.add('hidden');
        this.renderKeywords();
        window.salesApp.showNotification(`Đã xóa nhóm từ khóa "${groupName}"!`, 'info');
    }

    deleteGroupFromModal() {
        const indId = document.getElementById('cb-grp-ind-id').value;
        const groupId = document.getElementById('cb-grp-id').value;
        if (!groupId) return;
        this.deleteGroup(indId, groupId);
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

    // ==========================================
    // 6. QUẢN LÝ DANH MỤC NGÀNH NGHỀ (MODAL THỐNG NHẤT)
    // ==========================================
    openIndustryManagerModal() {
        const modal = document.getElementById('modal-callbot-industry-manager');
        if (!modal) return;

        this.cancelEditIndustryInManager();
        this.renderIndustryManagerList();
        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }

    closeIndustryManagerModal() {
        const modal = document.getElementById('modal-callbot-industry-manager');
        if (modal) modal.classList.add('hidden');
    }

    renderIndustryManagerList() {
        const container = document.getElementById('cb-ind-manager-list');
        const countEl = document.getElementById('cb-ind-manager-total-count');
        if (!container) return;

        const data = window.salesStore.getCallbotKeywords();
        const industries = data.industries || [];
        const templates = window.salesStore.getCallbotTemplates();

        if (countEl) countEl.textContent = industries.length;

        if (industries.length === 0) {
            container.innerHTML = '<p class="text-xs text-slate-400 py-4 text-center">Chưa có ngành nghề nào.</p>';
            return;
        }

        container.innerHTML = industries.map(ind => {
            const groupCount = (ind.groups || []).length;
            const tplCount = templates.filter(t => t.industry === ind.id).length;

            return `
                <div class="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs hover:border-indigo-200 transition-all">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                            <i data-lucide="${ind.icon || 'layers'}" class="w-4 h-4"></i>
                        </div>
                        <div class="min-w-0">
                            <p class="text-xs font-bold text-slate-800 truncate">${this.escapeHtml(ind.name)}</p>
                            <span class="text-[10px] text-slate-400 font-mono">${groupCount} nhóm từ khóa • ${tplCount} kịch bản</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                        <button type="button" onclick="window.callbotHub.editIndustryInManager('${ind.id}')"
                            class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Chỉnh sửa ngành nghề">
                            <i data-lucide="edit-2" class="w-4 h-4"></i>
                        </button>
                        <button type="button" onclick="window.callbotHub.deleteIndustryFromManager('${ind.id}')"
                            class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Xóa ngành nghề">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        if (window.lucide) lucide.createIcons();
    }

    editIndustryInManager(indId) {
        const data = window.salesStore.getCallbotKeywords();
        const ind = (data.industries || []).find(i => i.id === indId);
        if (!ind) return;

        const idInput = document.getElementById('cb-mgr-ind-id');
        const nameInput = document.getElementById('cb-mgr-ind-name');
        const descInput = document.getElementById('cb-mgr-ind-desc');
        const iconInput = document.getElementById('cb-mgr-ind-icon');
        const formTitle = document.getElementById('cb-mgr-form-title');
        const submitText = document.getElementById('cb-mgr-submit-text');
        const submitIcon = document.getElementById('cb-mgr-submit-icon');
        const cancelBtn = document.getElementById('cb-mgr-cancel-edit-btn');

        if (idInput) idInput.value = ind.id;
        if (nameInput) nameInput.value = ind.name || '';
        if (descInput) descInput.value = ind.description || '';
        if (iconInput) iconInput.value = ind.icon || 'layers';
        if (formTitle) formTitle.textContent = `Chỉnh sửa: ${ind.name}`;
        if (submitText) submitText.textContent = 'Cập nhật';
        if (submitIcon) submitIcon.setAttribute('data-lucide', 'check');
        if (cancelBtn) cancelBtn.classList.remove('hidden');

        if (nameInput) nameInput.focus();
        if (window.lucide) lucide.createIcons();
    }

    cancelEditIndustryInManager() {
        const form = document.getElementById('cb-ind-quick-form');
        if (form) form.reset();

        const idInput = document.getElementById('cb-mgr-ind-id');
        const formTitle = document.getElementById('cb-mgr-form-title');
        const submitText = document.getElementById('cb-mgr-submit-text');
        const submitIcon = document.getElementById('cb-mgr-submit-icon');
        const cancelBtn = document.getElementById('cb-mgr-cancel-edit-btn');

        if (idInput) idInput.value = '';
        if (formTitle) formTitle.textContent = 'Thêm ngành nghề mới';
        if (submitText) submitText.textContent = 'Thêm';
        if (submitIcon) submitIcon.setAttribute('data-lucide', 'plus');
        if (cancelBtn) cancelBtn.classList.add('hidden');
        if (window.lucide) lucide.createIcons();
    }

    handleSaveIndustryFromManager(e) {
        if (e && e.preventDefault) e.preventDefault();

        const id = document.getElementById('cb-mgr-ind-id')?.value;
        const name = (document.getElementById('cb-mgr-ind-name')?.value || '').trim();
        const description = (document.getElementById('cb-mgr-ind-desc')?.value || '').trim();
        const icon = document.getElementById('cb-mgr-ind-icon')?.value || 'layers';

        if (!name) {
            window.salesApp.showNotification('Vui lòng nhập tên ngành nghề!', 'warning');
            return;
        }

        const data = window.salesStore.getCallbotKeywords();
        if (!data.industries) data.industries = [];

        if (id) {
            const idx = data.industries.findIndex(i => i.id === id);
            if (idx !== -1) {
                data.industries[idx] = {
                    ...data.industries[idx],
                    name,
                    description,
                    icon
                };

                // Đồng bộ tên ngành nghề sang các kịch bản mẫu & media thuộc ngành này
                const templates = window.salesStore.getCallbotTemplates();
                let updatedTpl = false;
                templates.forEach(t => {
                    if (t.industry === id) {
                        t.industryName = name;
                        updatedTpl = true;
                    }
                });
                if (updatedTpl) window.salesStore.saveCallbotTemplates(templates);

                const mediaList = window.salesStore.getCallbotMedia();
                let updatedMedia = false;
                mediaList.forEach(m => {
                    if (m.industry === id) {
                        m.industryName = name;
                        updatedMedia = true;
                    }
                });
                if (updatedMedia) window.salesStore.saveCallbotMedia(mediaList);
            }
            window.salesApp.showNotification(`Đã cập nhật ngành nghề "${name}"!`, 'success');
        } else {
            const newId = 'ind-' + Date.now();
            data.industries.push({
                id: newId,
                name,
                description: description || `Bộ từ khóa nhận diện chuyên sâu ngành ${name}`,
                icon: icon || 'layers',
                groups: []
            });
            this.selectedIndustry = newId;
            window.salesApp.showNotification(`Đã thêm ngành nghề mới "${name}"!`, 'success');
        }

        window.salesStore.saveCallbotKeywords(data);
        this.cancelEditIndustryInManager();
        this.renderIndustryManagerList();
        this.render();
    }

    deleteIndustryFromManager(indId) {
        const data = window.salesStore.getCallbotKeywords();
        const ind = (data.industries || []).find(i => i.id === indId);
        if (!ind) return;

        const groupCount = (ind.groups || []).length;
        const confirmMsg = groupCount > 0
            ? `Bạn có chắc chắn muốn xóa ngành nghề "${ind.name}"?\n(Ngành này đang có ${groupCount} nhóm từ khóa, toàn bộ sẽ bị xóa)`
            : `Bạn có chắc chắn muốn xóa ngành nghề "${ind.name}"?`;

        if (confirm(confirmMsg)) {
            data.industries = data.industries.filter(i => i.id !== indId);
            if (this.selectedIndustry === indId) {
                this.selectedIndustry = data.industries.length > 0 ? data.industries[0].id : '';
            }
            window.salesStore.saveCallbotKeywords(data);
            this.cancelEditIndustryInManager();
            this.renderIndustryManagerList();
            this.render();
            window.salesApp.showNotification(`Đã xóa ngành nghề "${ind.name}"!`, 'info');
        }
    }

    // Backward compatibility aliases
    openAddIndustryModal() {
        this.openIndustryManagerModal();
    }

    openEditIndustryModal(indId) {
        this.openIndustryManagerModal();
        this.editIndustryInManager(indId);
    }

    deleteIndustry(indId) {
        this.deleteIndustryFromManager(indId);
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
