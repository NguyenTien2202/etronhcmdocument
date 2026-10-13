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
        this.currentUtterance = null;
        this.playingTemplateId = null;
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

    switchSubTab(tabName) {
        this.activeSubTab = tabName;
        document.querySelectorAll('.cb-subtab-btn').forEach(btn => {
            const isMatch = btn.getAttribute('data-cb-tab') === tabName;
            btn.classList.toggle('bg-indigo-600', isMatch);
            btn.classList.toggle('text-white', isMatch);
            btn.classList.toggle('shadow-sm', isMatch);
            btn.classList.toggle('bg-white', !isMatch);
            btn.classList.toggle('text-slate-600', !isMatch);
            btn.classList.toggle('hover:bg-slate-100', !isMatch);
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

        const statTotalKw = document.getElementById('cb-stat-total-keywords');
        const statIndustries = document.getElementById('cb-stat-total-industries');
        const statTemplates = document.getElementById('cb-stat-total-templates');

        if (statTotalKw) statTotalKw.textContent = totalKeywords.toLocaleString('vi-VN') + '+ từ';
        if (statIndustries) statIndustries.textContent = industriesCount + ' ngành nghề';
        if (statTemplates) statTemplates.textContent = templatesCount + ' kịch bản';
    }

    // ==========================================
    // 1. PHÂN KHU BỘ TỪ KHÓA CHUẨN
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
                const matchKw = g.keywords.some(k => k.toLowerCase().includes(query));
                return matchName || matchDesc || matchKw;
            });
        }

        if (filteredGroups.length === 0) {
            container.innerHTML = `
                <div class="col-span-full py-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                    <i data-lucide="search-x" class="w-8 h-8 mx-auto mb-2 text-slate-300"></i>
                    <p class="text-sm font-semibold">${query ? `Không tìm thấy từ khóa chung nào khớp với "${this.escapeHtml(query)}"` : 'Đang tải dữ liệu bộ từ khóa dùng chung...'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredGroups.map(group => {
            const colorMap = {
                emerald: { border: 'border-emerald-200', bg: 'bg-emerald-50/40', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700', iconBg: 'bg-emerald-100 text-emerald-700' },
                rose: { border: 'border-rose-200', bg: 'bg-rose-50/40', badge: 'bg-rose-50 text-rose-700 border-rose-200', text: 'text-rose-700', iconBg: 'bg-rose-100 text-rose-700' },
                indigo: { border: 'border-indigo-200', bg: 'bg-indigo-50/40', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', text: 'text-indigo-700', iconBg: 'bg-indigo-100 text-indigo-700' },
                amber: { border: 'border-amber-200', bg: 'bg-amber-50/40', badge: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700', iconBg: 'bg-amber-100 text-amber-700' },
                slate: { border: 'border-slate-300', bg: 'bg-slate-50/60', badge: 'bg-slate-100 text-slate-700 border-slate-200', text: 'text-slate-700', iconBg: 'bg-slate-200 text-slate-700' },
                blue: { border: 'border-blue-200', bg: 'bg-blue-50/40', badge: 'bg-blue-50 text-blue-700 border-blue-200', text: 'text-blue-700', iconBg: 'bg-blue-100 text-blue-700' }
            };
            const c = colorMap[group.color] || colorMap.indigo;

            return `
                <div class="bg-white rounded-2xl border ${c.border} p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                        <!-- Header Nhóm -->
                        <div class="flex items-start justify-between gap-3 mb-2.5">
                            <div class="flex items-center gap-2.5 min-w-0">
                                <div class="w-8 h-8 rounded-xl ${c.iconBg} flex items-center justify-center shrink-0">
                                    <i data-lucide="${group.icon || 'tag'}" class="w-4 h-4"></i>
                                </div>
                                <div class="min-w-0">
                                    <h4 class="font-bold text-slate-900 text-xs sm:text-sm truncate">${this.escapeHtml(group.name)}</h4>
                                    <span class="text-[10px] text-slate-400 font-mono">${group.keywords.length} từ khóa</span>
                                </div>
                            </div>
                            <button onclick="window.callbotHub.copyGroupKeywords('common', '${group.id}')"
                                class="px-2.5 py-1 rounded-lg ${c.badge} border text-[11px] font-bold hover:opacity-90 active:scale-95 transition-all flex items-center gap-1 shrink-0"
                                title="Sao chép toàn bộ từ khóa trong nhóm này">
                                <i data-lucide="copy" class="w-3 h-3"></i>
                                <span>Copy</span>
                            </button>
                        </div>

                        <!-- Mô tả & Hướng dẫn bot -->
                        <p class="text-[11px] text-slate-500 mb-3 line-clamp-2">${this.escapeHtml(group.description || '')}</p>

                        <!-- Danh sách Keywords tags -->
                        <div class="flex flex-wrap gap-1 max-h-48 overflow-y-auto pr-1">
                            ${group.keywords.map(kw => {
                                const isHighlight = query && kw.toLowerCase().includes(query);
                                return `
                                    <span class="inline-block px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${isHighlight ? 'bg-amber-300 text-slate-900 font-bold ring-2 ring-amber-400' : 'bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'}">
                                        ${this.escapeHtml(kw)}
                                    </span>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    ${group.actionGuide ? `
                        <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-start gap-1.5 text-[10px] text-slate-400">
                            <i data-lucide="sparkles" class="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5"></i>
                            <span class="line-clamp-1"><b class="text-slate-600">Bot action:</b> ${this.escapeHtml(group.actionGuide)}</span>
                        </div>
                    ` : ''}
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

        // Render Tabs Ngành Nghề
        tabsContainer.innerHTML = `
            ${industries.map(ind => {
                const isActive = ind.id === this.selectedIndustry;
                return `
                    <button onclick="window.callbotHub.selectIndustry('${ind.id}')"
                        class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 border ${isActive ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}">
                        <i data-lucide="${ind.icon || 'layers'}" class="w-4 h-4"></i>
                        <span>${this.escapeHtml(ind.name)}</span>
                        <span class="text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-indigo-700/60 text-white' : 'bg-slate-100 text-slate-500'}">
                            ${(ind.groups || []).length} nhóm
                        </span>
                    </button>
                `;
            }).join('')}
            <button onclick="window.callbotHub.openAddIndustryModal()"
                class="px-3 py-2 rounded-xl text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0">
                <i data-lucide="plus-circle" class="w-4 h-4"></i>
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
                const matchKw = g.keywords.some(k => k.toLowerCase().includes(query));
                return matchName || matchDesc || matchKw;
            });
        }

        // Header thông tin ngành + Nút Copy All
        const headerInfo = document.getElementById('cb-industry-header-info');
        if (headerInfo) {
            let totalKw = 0;
            (curInd.groups || []).forEach(g => totalKw += (g.keywords ? g.keywords.length : 0));

            headerInfo.innerHTML = `
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 mb-4">
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
                            class="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-sm flex items-center gap-1.5">
                            <i data-lucide="copy-check" class="w-4 h-4"></i>
                            <span>Sao Chép Toàn Bộ Ngành</span>
                        </button>
                        <button onclick="window.callbotHub.openAddGroupModal('${curInd.id}')"
                            class="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-1">
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

        groupsContainer.innerHTML = filteredGroups.map(group => `
            <div class="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between">
                <div>
                    <!-- Header Nhóm -->
                    <div class="flex items-start justify-between gap-3 mb-2.5">
                        <div class="flex items-center gap-2 min-w-0">
                            <div class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                <i data-lucide="${group.icon || 'tag'}" class="w-4 h-4"></i>
                            </div>
                            <div class="min-w-0">
                                <h4 class="font-bold text-slate-900 text-xs sm:text-sm truncate">${this.escapeHtml(group.name)}</h4>
                                <span class="text-[10px] text-slate-400 font-mono">${group.keywords.length} từ khóa</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-1">
                            <button onclick="window.callbotHub.copyGroupKeywords('${curInd.id}', '${group.id}')"
                                class="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1"
                                title="Sao chép từ khóa nhóm này">
                                <i data-lucide="copy" class="w-3 h-3"></i>
                                <span>Copy</span>
                            </button>
                            <button onclick="window.callbotHub.openEditGroupModal('${curInd.id}', '${group.id}')"
                                class="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                title="Chỉnh sửa nhóm từ khóa">
                                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    </div>

                    <p class="text-[11px] text-slate-500 mb-3 line-clamp-2">${this.escapeHtml(group.description || '')}</p>

                    <!-- Danh sách từ khóa -->
                    <div class="flex flex-wrap gap-1 max-h-52 overflow-y-auto pr-1">
                        ${group.keywords.map(kw => {
                            const isHighlight = query && kw.toLowerCase().includes(query);
                            return `
                                <span class="inline-block px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${isHighlight ? 'bg-amber-300 text-slate-900 font-bold ring-2 ring-amber-400' : 'bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'}">
                                    ${this.escapeHtml(kw)}
                                </span>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    }

    selectIndustry(indId) {
        this.selectedIndustry = indId;
        this.renderKeywords();
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
            navigator.clipboard.writeText(textToCopy).then(() => {
                window.salesApp.showNotification(`Đã sao chép ${targetGroup.keywords.length} từ khóa nhóm "${targetGroup.name}"!`, 'success');
            }).catch(() => {
                this.fallbackCopy(textToCopy, `Đã sao chép ${targetGroup.keywords.length} từ khóa`);
            });
        }
    }

    copyAllCommonKeywords() {
        const data = window.salesStore.getCallbotKeywords();
        const allKw = [];
        (data.common || []).forEach(g => {
            if (g.keywords) allKw.push(...g.keywords);
        });

        const textToCopy = Array.from(new Set(allKw)).join(', ');
        navigator.clipboard.writeText(textToCopy).then(() => {
            window.salesApp.showNotification(`Đã sao chép toàn bộ ${allKw.length} từ khóa dùng chung!`, 'success');
        }).catch(() => {
            this.fallbackCopy(textToCopy, `Đã sao chép ${allKw.length} từ khóa dùng chung`);
        });
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
        navigator.clipboard.writeText(textToCopy).then(() => {
            window.salesApp.showNotification(`Đã sao chép toàn bộ ${allKw.length} từ khóa ngành "${ind.name}"!`, 'success');
        }).catch(() => {
            this.fallbackCopy(textToCopy, `Đã sao chép ${allKw.length} từ khóa ngành`);
        });
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
    // 2. PHÂN KHU KHO KỊCH BẢN MẪU (EXCEL / DRIVE)
    // ==========================================
    renderTemplates() {
        const container = document.getElementById('cb-templates-grid');
        const filterContainer = document.getElementById('cb-template-filters');
        if (!container) return;

        const templates = window.salesStore.getCallbotTemplates();
        const industries = (window.salesStore.getCallbotKeywords().industries || []);

        // Render Filter Buttons
        if (filterContainer) {
            filterContainer.innerHTML = `
                <button onclick="window.callbotHub.filterTemplates('all')"
                    class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${this.templateFilter === 'all' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}">
                    Tất Cả (${templates.length})
                </button>
                ${industries.map(ind => {
                    const count = templates.filter(t => t.industry === ind.id).length;
                    const isActive = this.templateFilter === ind.id;
                    return `
                        <button onclick="window.callbotHub.filterTemplates('${ind.id}')"
                            class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${isActive ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}">
                            <i data-lucide="${ind.icon || 'folder'}" class="w-3.5 h-3.5"></i>
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
                    <p class="text-xs text-slate-400 mt-1">Bấm nút "+ Thêm Kịch Bản Mới" để tải lên file Excel hoặc dán link Google Sheets.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(tpl => {
            const isPlaying = this.playingTemplateId === tpl.id;

            return `
                <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all flex flex-col justify-between group">
                    <div>
                        <!-- Header Card -->
                        <div class="flex items-start justify-between gap-3 mb-3">
                            <div class="flex items-center gap-2">
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    ${this.escapeHtml(tpl.industryName || 'Ngành khác')}
                                </span>
                                ${tpl.pinned ? '<span class="text-amber-500 text-xs" title="Kịch bản mẫu trọng điểm">⭐ Trọng điểm</span>' : ''}
                            </div>
                            <span class="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                                <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                                ${tpl.updatedAt || 'Mới cập nhật'}
                            </span>
                        </div>

                        <!-- Tiêu đề & Khách hàng -->
                        <h4 class="font-extrabold text-slate-900 text-sm sm:text-base group-hover:text-indigo-600 transition-colors cursor-pointer leading-snug"
                            onclick="window.open('${tpl.scriptUrl}', '_blank')">
                            ${this.escapeHtml(tpl.title)}
                        </h4>
                        <p class="text-xs text-indigo-600 font-semibold mt-1 flex items-center gap-1.5">
                            <i data-lucide="user-check" class="w-3.5 h-3.5"></i>
                            <span>Dự án / KH: ${this.escapeHtml(tpl.client || 'Dùng chung')}</span>
                        </p>

                        <!-- Đính kèm Kịch bản File / Sheet -->
                        <div class="mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                            <div class="flex items-center gap-2.5 min-w-0">
                                <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                                    <i data-lucide="file-spreadsheet" class="w-4 h-4"></i>
                                </div>
                                <div class="min-w-0">
                                    <p class="text-xs font-bold text-slate-800 truncate">${this.escapeHtml(tpl.scriptFileName || 'Kich_ban_Callbot.xlsx')}</p>
                                    <p class="text-[10px] text-slate-400">Google Sheets / Excel • ${this.escapeHtml(tpl.keywordsCount || 'Đầy đủ từ khóa')}</p>
                                </div>
                            </div>
                            <a href="${tpl.scriptUrl}" target="_blank" rel="noopener noreferrer"
                                class="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shrink-0 flex items-center gap-1"
                                title="Mở trực tiếp trên Google Sheets / Drive">
                                <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                                <span>Mở Sheet</span>
                            </a>
                        </div>

                        <!-- Trình Nghe Giọng Đọc Mẫu (Voice Demo) -->
                        ${tpl.audioTextSample ? `
                            <div class="mt-3 p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
                                <div class="flex items-center justify-between gap-2 mb-1.5">
                                    <div class="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                                        <i data-lucide="mic" class="w-3.5 h-3.5 text-indigo-600"></i>
                                        <span>Giọng đọc AI: ${this.escapeHtml(tpl.audioVoice || 'Nữ miền Nam')}</span>
                                    </div>
                                    <span class="text-[10px] text-indigo-500 font-mono">${tpl.audioDuration || '0:20'}</span>
                                </div>
                                <p class="text-[11px] text-slate-600 italic line-clamp-2 mb-2">"${this.escapeHtml(tpl.audioTextSample)}"</p>
                                <button onclick="window.callbotHub.playSampleVoice('${tpl.id}')"
                                    class="w-full py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${isPlaying ? 'bg-rose-600 text-white animate-pulse' : 'bg-indigo-600 text-white hover:bg-indigo-700'}">
                                    <i data-lucide="${isPlaying ? 'square' : 'volume-2'}" class="w-3.5 h-3.5"></i>
                                    <span>${isPlaying ? 'Dừng phát âm thanh' : 'Nghe Thử Giọng Đọc AI Mẫu'}</span>
                                </button>
                            </div>
                        ` : ''}

                        <!-- Lưu ý thực chiến / Sales Tips -->
                        ${tpl.salesTips && tpl.salesTips.length > 0 ? `
                            <div class="mt-3.5 space-y-1">
                                <p class="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                    <i data-lucide="zap" class="w-3 h-3 text-amber-500"></i>
                                    <span>Kinh nghiệm & Lưu ý triển khai:</span>
                                </p>
                                <ul class="text-[11px] text-slate-500 space-y-0.5 list-disc list-inside">
                                    ${tpl.salesTips.map(tip => `<li>${this.escapeHtml(tip)}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Footer Thao Tác -->
                    <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <button onclick="window.callbotHub.viewIndustryKeywords('${tpl.industry}')"
                            class="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1">
                            <i data-lucide="tag" class="w-3.5 h-3.5"></i>
                            <span>Xem bộ từ khóa</span>
                        </button>
                        <div class="flex items-center gap-1">
                            <button onclick="window.callbotHub.openEditTemplateModal('${tpl.id}')"
                                class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                title="Chỉnh sửa kịch bản mẫu">
                                <i data-lucide="edit-3" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.callbotHub.deleteTemplate('${tpl.id}')"
                                class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Xóa kịch bản mẫu">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
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

    viewIndustryKeywords(indId) {
        this.selectedIndustry = indId;
        this.switchSubTab('keywords');
    }

    playSampleVoice(tplId) {
        const templates = window.salesStore.getCallbotTemplates();
        const tpl = templates.find(t => t.id === tplId);
        if (!tpl || !tpl.audioTextSample) return;

        // Nếu đang phát chính template này -> dừng lại
        if (this.playingTemplateId === tplId) {
            window.speechSynthesis.cancel();
            this.playingTemplateId = null;
            this.renderTemplates();
            if (window.lucide) lucide.createIcons();
            return;
        }

        // Dừng giọng trước đó
        window.speechSynthesis.cancel();

        if (!('speechSynthesis' in window)) {
            window.salesApp.showNotification('Trình duyệt không hỗ trợ phát giọng đọc tự động!', 'warning');
            return;
        }

        const utterance = new SpeechSynthesisUtterance(tpl.audioTextSample);
        utterance.lang = 'vi-VN';
        utterance.rate = 0.95; // Tốc độ tự nhiên, rõ ràng
        utterance.pitch = 1.05;

        // Chọn giọng nữ tiếng Việt nếu có trong OS
        const voices = window.speechSynthesis.getVoices();
        const viVoice = voices.find(v => v.lang === 'vi-VN' || v.lang.startsWith('vi'));
        if (viVoice) utterance.voice = viVoice;

        this.playingTemplateId = tplId;
        this.renderTemplates();
        if (window.lucide) lucide.createIcons();

        utterance.onend = () => {
            this.playingTemplateId = null;
            this.renderTemplates();
            if (window.lucide) lucide.createIcons();
        };

        utterance.onerror = () => {
            this.playingTemplateId = null;
            this.renderTemplates();
            if (window.lucide) lucide.createIcons();
        };

        window.speechSynthesis.speak(utterance);
        window.salesApp.showNotification(`Đang phát giọng đọc mẫu: ${tpl.audioVoice || 'Nữ miền Nam'}...`, 'info');
    }

    deleteTemplate(id) {
        if (confirm('Bạn có chắc chắn muốn xóa kịch bản mẫu này khỏi kho?')) {
            window.salesStore.deleteCallbotTemplate(id);
            this.render();
            window.salesApp.showNotification('Đã xóa kịch bản mẫu khỏi kho!', 'info');
        }
    }

    // ==========================================
    // 3. PHÂN KHU MEDIA AUDIO & VIDEO
    // ==========================================
    renderMedia() {
        const container = document.getElementById('cb-media-container');
        if (!container) return;

        const templates = window.salesStore.getCallbotTemplates();

        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                ${templates.map(tpl => `
                    <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                        <div class="flex items-center justify-between">
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">
                                ${this.escapeHtml(tpl.industryName)}
                            </span>
                            <span class="text-xs font-mono text-slate-400">${tpl.audioDuration || '0:20'}</span>
                        </div>
                        <h4 class="font-bold text-slate-900 text-sm line-clamp-1">${this.escapeHtml(tpl.audioTitle || tpl.title)}</h4>
                        <p class="text-xs text-slate-500 line-clamp-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                            "${this.escapeHtml(tpl.audioTextSample || 'Chưa có nội dung demo')}"
                        </p>
                        <button onclick="window.callbotHub.playSampleVoice('${tpl.id}')"
                            class="w-full py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all flex items-center justify-center gap-2 shadow-sm">
                            <i data-lucide="${this.playingTemplateId === tpl.id ? 'square' : 'play'}" class="w-4 h-4"></i>
                            <span>${this.playingTemplateId === tpl.id ? 'Dừng phát' : 'Nghe Demo Giọng Đọc'}</span>
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // ==========================================
    // 4. MODALS QUẢN LÝ KỊCH BẢN & TỪ KHÓA
    // ==========================================
    openAddTemplateModal() {
        const modal = document.getElementById('modal-callbot-template');
        if (!modal) return;

        document.getElementById('cb-tpl-form').reset();
        document.getElementById('cb-tpl-id').value = '';
        document.getElementById('cb-tpl-modal-title').textContent = 'Thêm Kịch Bản & Media Mẫu Mới';

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
        document.getElementById('cb-tpl-client').value = tpl.client || '';
        document.getElementById('cb-tpl-industry').value = tpl.industry || '';
        document.getElementById('cb-tpl-url').value = tpl.scriptUrl || '';
        document.getElementById('cb-tpl-filename').value = tpl.scriptFileName || '';
        document.getElementById('cb-tpl-voice').value = tpl.audioVoice || '';
        document.getElementById('cb-tpl-duration').value = tpl.audioDuration || '';
        document.getElementById('cb-tpl-audiosample').value = tpl.audioTextSample || '';
        document.getElementById('cb-tpl-tips').value = (tpl.salesTips || []).join('\n');

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
        const client = document.getElementById('cb-tpl-client').value.trim();
        const industry = document.getElementById('cb-tpl-industry').value;
        const scriptUrl = document.getElementById('cb-tpl-url').value.trim();
        const scriptFileName = document.getElementById('cb-tpl-filename').value.trim();
        const audioVoice = document.getElementById('cb-tpl-voice').value.trim();
        const audioDuration = document.getElementById('cb-tpl-duration').value.trim();
        const audioTextSample = document.getElementById('cb-tpl-audiosample').value.trim();
        const tipsRaw = document.getElementById('cb-tpl-tips').value.trim();

        if (!title || !scriptUrl) {
            window.salesApp.showNotification('Vui lòng nhập tên kịch bản và liên kết Google Sheets/Excel!', 'warning');
            return;
        }

        const industries = (window.salesStore.getCallbotKeywords().industries || []);
        const targetInd = industries.find(i => i.id === industry);

        const salesTips = tipsRaw ? tipsRaw.split('\n').map(t => t.trim()).filter(Boolean) : [];

        const tplData = {
            id: id || null,
            title,
            client,
            industry,
            industryName: targetInd ? targetInd.name : 'Ngành khác',
            scriptUrl,
            scriptFileName: scriptFileName || 'Kich_ban_mau.xlsx',
            audioVoice: audioVoice || 'Nữ miền Nam',
            audioDuration: audioDuration || '0:20',
            audioTextSample,
            salesTips,
            keywordsCount: 'Kịch bản chuẩn',
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
        const ind = (data.industries || []).find(i => i.id === indId);
        if (!ind) return;

        const group = (ind.groups || []).find(g => g.id === groupId);
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
        document.getElementById('cb-grp-modal-title').textContent = 'Thêm Nhóm Từ Khóa Mới';

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
}

// Global Callbot Hub Instance
window.callbotHub = new CallbotHub();
