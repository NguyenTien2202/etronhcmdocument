/**
 * Etron HrHub Controller (js/hr-hub.js)
 * Hệ thống Quản trị Nhân sự, Hồ sơ & Checklist Onboard, Thiết kế Lộ trình Onboard & Kho Mẫu Mail/Tin nhắn HR
 * Dành riêng cho HR (Đăng nhập Firebase Authentication, tách biệt hoàn toàn với trang SalesHub của nhân viên kinh doanh)
 */

class HrHubApp {
    constructor() {
        this.currentTab = 'candidates'; // candidates | roadmap | templates | notes
        this.selectedCandidateId = null;
        this.candidateFilter = 'all';
        this.candidateSearch = '';

        this.templateCategoryFilter = 'all';
        this.templateSearch = '';
        this.quickVars = {
            ten_ung_vien: 'Bạn',
            vi_tri: 'Nhân viên Kinh doanh',
            ngay_onboard: 'Thứ Hai',
            gio_onboard: '08:30 sáng',
            dia_diem: '718/2/18 Quốc lộ 13, Phường Hiệp Bình, TP. Thủ Đức, HCM',
            nguoi_lien_he: 'Nguyễn Thủy Tiên (Ms. Tiên)',
            sdt_lien_he: '0968.064.432',
            link_onboard: this.getPublicOnboardUrl()
        };

        this.noteSearch = '';
        this.editingDayId = null;
        this.attachingDayId = null;
        this.docPickerSearch = '';
        this.expandedModules = new Set();
        this.linkTargetDayId = null;
        this.linkTargetTaskId = null;
        this.expandedCandidateIds = new Set(); // Mặc định khi vào là toàn bộ ứng viên ở dạng thu gọn
        this.collapsedRoadmapDays = new Set(); // Thu gọn ngày trong tab Lộ trình
        this.isMobileCandDropdownOpen = false;
        this.isTplCandDropdownOpen = false;
        this.isTplCatDropdownOpen = false;
        this.isQuickVarsExpanded = false;
    }

    toggleCandidateAccordion(candId) {
        if (this.expandedCandidateIds.has(candId)) {
            this.expandedCandidateIds.delete(candId);
        } else {
            this.expandedCandidateIds.add(candId);
            this.selectedCandidateId = candId;
            const cand = window.hrOnboardingStore.getCandidates().find(c => c.id === candId);
            if (cand) this.syncQuickVarsFromCandidate(cand);
        }
        const bodyEl = document.getElementById(`hr-cand-body-${candId}`);
        const arrowEl = document.getElementById(`hr-cand-arrow-${candId}`);
        if (bodyEl) {
            const isExpanded = this.expandedCandidateIds.has(candId);
            bodyEl.classList.toggle('hidden', !isExpanded);
            if (arrowEl) {
                arrowEl.classList.toggle('rotate-180', isExpanded);
                arrowEl.classList.toggle('text-emerald-600', isExpanded);
                arrowEl.classList.toggle('bg-emerald-50', isExpanded);
            }
            if (window.lucide) lucide.createIcons();
        } else {
            this.renderCandidatesTab();
        }
    }

    toggleRoadmapDay(dayId) {
        if (this.collapsedRoadmapDays.has(dayId)) {
            this.collapsedRoadmapDays.delete(dayId);
        } else {
            this.collapsedRoadmapDays.add(dayId);
        }
        const bodyEl = document.getElementById(`hr-day-body-${dayId}`);
        const chevronEl = document.getElementById(`hr-day-chevron-${dayId}`);
        if (bodyEl) {
            const isCollapsed = this.collapsedRoadmapDays.has(dayId);
            bodyEl.classList.toggle('hidden', isCollapsed);
            if (chevronEl) {
                chevronEl.classList.toggle('rotate-180', !isCollapsed);
                chevronEl.classList.toggle('text-indigo-600', !isCollapsed);
            }
            if (window.lucide) lucide.createIcons();
        } else {
            this.renderRoadmapTab();
        }
    }

    toggleAllRoadmapDays(forceCollapse = null) {
        const roadmap = window.hrOnboardingStore.getRoadmap();
        const shouldCollapse = forceCollapse !== null ? forceCollapse : (this.collapsedRoadmapDays.size === 0);
        if (shouldCollapse) {
            roadmap.forEach(d => this.collapsedRoadmapDays.add(d.id));
        } else {
            this.collapsedRoadmapDays.clear();
        }
        this.renderRoadmapTab();
        if (window.lucide) lucide.createIcons();
    }

    toggleModule(taskId) {
        const bodyEl = document.getElementById('hr-mod-body-' + taskId);
        const iconEl = document.getElementById('hr-mod-icon-' + taskId);
        if (!bodyEl) return;
        const isHidden = bodyEl.classList.contains('hidden');
        if (isHidden) {
            bodyEl.classList.remove('hidden');
            if (iconEl) iconEl.classList.add('rotate-180', 'text-indigo-600');
            this.expandedModules.add(taskId);
        } else {
            bodyEl.classList.add('hidden');
            if (iconEl) iconEl.classList.remove('rotate-180', 'text-indigo-600');
            this.expandedModules.delete(taskId);
        }
        if (window.lucide) lucide.createIcons();
    }

    getPublicOnboardUrl(candidateId = null) {
        try {
            const url = new URL('onboard.html', window.location.href);
            if (candidateId) {
                const token = window.hrOnboardingStore.getCandidates().find(c => c.id === candidateId)?.onboardToken;
                if (token) url.hash = 'key=' + token;
            }
            return url.href;
        } catch (e) {
            return 'https://nguyentien2202.github.io/etronhcmdocument/onboard.html';
        }
    }

    init() {
        if (!window.hrAuth?.isHr()) return;
        if (window.salesStore) {
            window.salesStore.setupCloudSync();
        }
        if (window.documentHub) {
            window.documentHub.init();
        }
        if (window.hrOnboardingStore) {
            window.hrOnboardingStore.setupCloudSync();
            window.hrOnboardingStore.onChange(() => {
                this.autoSyncIfOutdated();
                this.renderAll();
            });
        }

        this.checkLockState();
        this.setupModalScrollLock();

        const candidates = window.hrOnboardingStore.getCandidates();
        if (candidates.length > 0) {
            this.syncQuickVarsFromCandidate(candidates[0]);
        }

        // Tự động đóng các dropdown popover khi người dùng bấm ra ngoài
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#hr-mobile-cand-dropdown-wrapper')) {
                if (this.isMobileCandDropdownOpen) {
                    this.isMobileCandDropdownOpen = false;
                    this.renderMobileCandidateDropdown();
                }
            }
            if (!e.target.closest('#hr-tpl-cand-dropdown-wrapper')) {
                if (this.isTplCandDropdownOpen) {
                    this.isTplCandDropdownOpen = false;
                    this.renderTplCandidateDropdown();
                }
            }
            if (!e.target.closest('#hr-tpl-cat-dropdown-wrapper')) {
                if (this.isTplCatDropdownOpen) {
                    this.isTplCatDropdownOpen = false;
                    this.renderTemplateCategoryDropdown();
                }
            }
        });

        this.renderAll();

        window.addEventListener('storage', () => {
            this.renderAll();
        });

        if (window.lucide) lucide.createIcons();
    }

    checkLockState() { return window.hrAuth?.isHr(); }
    lockHrHub() { return window.hrAuth.logout(); }
    openChangePinModal() {
        document.querySelector('#hr-login-form [name="email"]').value = firebase.auth().currentUser?.email || '';
        return window.hrAuth.resetPassword();
    }

    // ==========================================
    // 2. NAVIGATION & GLOBAL HELPERS
    // ==========================================
    switchTab(tabId) {
        this.currentTab = tabId;
        document.querySelectorAll('[data-hr-tab]').forEach(btn => {
            const active = btn.getAttribute('data-hr-tab') === tabId;
            if (active) {
                btn.classList.add('bg-white', 'text-emerald-700', 'shadow-sm', 'font-bold');
                btn.classList.remove('text-slate-600', 'font-semibold');
            } else {
                btn.classList.remove('bg-white', 'text-emerald-700', 'shadow-sm', 'font-bold');
                btn.classList.add('text-slate-600', 'font-semibold');
            }
        });

        document.querySelectorAll('.hr-tab-view').forEach(view => {
            view.classList.toggle('hidden', view.id !== `hr-view-${tabId}`);
        });

        this.renderAll();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    renderAll() {
        if (!window.hrAuth?.isHr()) return;
        this.renderHeaderStats();
        this.renderCandidatesTab();
        this.renderRoadmapTab();
        this.renderTemplatesTab();
        this.renderNotesTab();
        if (window.lucide) lucide.createIcons();
    }

    renderHeaderStats() {
        const candidates = window.hrOnboardingStore.getCandidates();
        const roadmap = window.hrOnboardingStore.getRoadmap();
        const templates = window.hrOnboardingStore.getTemplates();

        const elCand = document.getElementById('hr-stat-candidates');
        const elDays = document.getElementById('hr-stat-days');
        const elTpl = document.getElementById('hr-stat-templates');

        if (elCand) elCand.textContent = candidates.length;
        if (elDays) elDays.textContent = `${roadmap.length} ngày`;
        if (elTpl) elTpl.textContent = templates.length;
    }

    copyOnboardLink(candidateId = null) {
        const link = this.getPublicOnboardUrl(candidateId);
        navigator.clipboard.writeText(link).then(() => {
            this.showToast('Đã copy link Cổng Onboard để gửi cho nhân sự mới!', 'success');
        }).catch(() => {
            prompt('Copy đường dẫn Cổng Onboard dưới đây:', link);
        });
    }

    async openCandidateOnboard(candId) {
        const candidate = window.hrOnboardingStore.getCandidates().find(c => c.id === candId);
        if (!candidate?.onboardToken) {
            this.showToast('Hãy dùng Cập nhật / Copy Link trước để tạo liên kết cá nhân.', 'info');
            return;
        }
        window.open(this.getPublicOnboardUrl(candId), '_blank', 'noopener,noreferrer');
    }
    async copyCandidateOnboardLink(candId) {
        try {
            await window.hrOnboardingStore.publishCandidate(candId);
            const url = this.getPublicOnboardUrl(candId);
            await navigator.clipboard.writeText(url);
            this.renderAll();
            this.showToast('Đã cập nhật và copy liên kết cá nhân. Chỉ gửi cho đúng người nhận.', 'success');
        } catch (_) { this.showToast('Chưa tạo/copy được liên kết. Kiểm tra kết nối hoặc quyền và thử lại.', 'error'); }
    }
    async revokeOnboardLink(candId) {
        if (!confirm('Thu hồi liên kết onboarding hiện tại? Liên kết cũ sẽ ngừng hoạt động.')) return;
        try { await window.hrOnboardingStore.revokeCandidateLink(candId); this.renderAll(); }
        catch (_) { this.showToast('Chưa thu hồi được liên kết. Hãy thử lại.', 'error'); }
    }

    getStatusMeta(status) {
        const map = {
            preparing: { label: 'Sắp Onboard', bg: 'bg-amber-100 text-amber-800 border-amber-200' },
            onboarding: { label: 'Đang Onboard', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
            probation: { label: 'Đang thử việc', bg: 'bg-blue-100 text-blue-800 border-blue-200' },
            official: { label: 'Đã chính thức', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
            paused: { label: 'Tạm dừng', bg: 'bg-slate-100 text-slate-600 border-slate-200' }
        };
        return map[status] || map.preparing;
    }

    selectCandidate(id) {
        this.selectedCandidateId = id;
        if (id) {
            this.expandedCandidateIds.add(id);
            const cand = window.hrOnboardingStore.getCandidates().find(c => c.id === id);
            if (cand) {
                this.syncQuickVarsFromCandidate(cand);
            }
        }
        this.renderCandidatesTab();
        if (this.currentTab === 'templates') {
            this.renderTemplatesTab();
        }
        if (id) {
            setTimeout(() => {
                const cardEl = document.getElementById(`hr-cand-card-${id}`);
                if (cardEl) {
                    cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 100);
        }
        if (window.lucide) lucide.createIcons();
    }

    syncQuickVarsFromCandidate(cand) {
        if (!cand) return;
        this.quickVars.ten_ung_vien = cand.fullName || 'Bạn';
        this.quickVars.vi_tri = cand.role || 'Nhân viên Kinh doanh';
        this.quickVars.ngay_onboard = window.hrOnboardingStore.formatDateDisplay(cand.startDate) || 'Thứ Hai';
        if (cand.mentor) {
            this.quickVars.nguoi_lien_he = cand.mentor;
        }
        this.quickVars.link_onboard = cand.onboardToken ? this.getPublicOnboardUrl(cand.id) : '[HR cần tạo liên kết cá nhân bằng Cập nhật / Copy Link]';
    }

    jumpToTemplatesForCandidate(candId) {
        const cand = window.hrOnboardingStore.getCandidates().find(c => c.id === candId);
        if (cand) {
            this.syncQuickVarsFromCandidate(cand);
        }
        this.switchTab('templates');
        this.showToast(`Đã điền sẵn thông tin của "${cand ? cand.fullName : 'ứng viên'}" vào các mẫu Email/Tin nhắn!`, 'success');
    }

    renderBirthdayAlertWidget() {
        const container = document.getElementById('hr-birthday-alert-container');
        if (!container) return;

        const upcoming = (window.hrOnboardingStore && typeof window.hrOnboardingStore.getUpcomingBirthdays === 'function')
            ? window.hrOnboardingStore.getUpcomingBirthdays(7)
            : [];

        if (!upcoming || upcoming.length === 0) {
            container.innerHTML = '';
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        container.innerHTML = `
            <div class="bg-gradient-to-r from-amber-500/10 via-pink-500/10 to-rose-500/10 border border-amber-300/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2.5">
                        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 text-white flex items-center justify-center shadow-xs shrink-0">
                            <i data-lucide="cake" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <h3 class="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2">
                                <span>Nhắc Nhở Sinh Nhật Sắp Tới (${upcoming.length} nhân sự)</span>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white">Trong 7 ngày tới</span>
                            </h3>
                            <p class="text-[11px] sm:text-xs text-slate-600">Chuẩn bị lời chúc hoặc quà sinh nhật từ Etron HCM để tạo niềm vui cho bạn ấy nhé!</p>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    ${upcoming.map(item => {
                        const cand = item.candidate;
                        const isToday = item.daysLeft === 0;
                        return `
                            <div class="bg-white/95 rounded-xl border ${isToday ? 'border-rose-300 ring-2 ring-rose-500/20' : 'border-amber-200'} p-3 flex items-center justify-between gap-3 shadow-2xs">
                                <div class="min-w-0 flex-1">
                                    <div class="flex items-center gap-2">
                                        <h4 class="text-xs font-extrabold text-slate-900 truncate">${this.escapeHtml(cand.fullName)}</h4>
                                        ${isToday
                                            ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white animate-pulse shrink-0">🎉 Sinh nhật hôm nay!</span>`
                                            : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 shrink-0">Còn ${item.daysLeft} ngày</span>`
                                        }
                                    </div>
                                    <p class="text-[11px] text-slate-500 truncate mt-0.5">
                                        Sinh nhật: <strong class="text-slate-800">${item.formattedDate}</strong> (tròn ${item.turningAge} tuổi) • ${this.escapeHtml(cand.role || 'Sales')}
                                    </p>
                                </div>
                                <div class="flex items-center gap-1.5 shrink-0">
                                    <button type="button" onclick="window.hrHub.jumpToTemplatesForCandidate('${cand.id}')"
                                        class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1 transition-all"
                                        title="Soạn tin nhắn chúc mừng sinh nhật">
                                        <i data-lucide="send" class="w-3 h-3"></i>
                                        <span class="hidden sm:inline">Chúc mừng</span>
                                    </button>
                                    <button type="button" onclick="window.hrHub.selectCandidate('${cand.id}')"
                                        class="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all"
                                        title="Xem hồ sơ">
                                        <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    toggleMobileCandDropdown(e, forceState = null) {
        if (e) {
            e.stopPropagation();
            if (e.target && e.target.closest && e.target.closest('#hr-mobile-cand-dropdown-menu')) {
                return;
            }
        }
        this.isMobileCandDropdownOpen = forceState !== null ? forceState : !this.isMobileCandDropdownOpen;
        if (this.isMobileCandDropdownOpen) {
            this.isTplCandDropdownOpen = false;
            this.isTplCatDropdownOpen = false;
        }
        this.renderMobileCandidateDropdown();
        if (window.lucide) lucide.createIcons();
    }

    renderMobileCandidateDropdown() {
        const wrapper = document.getElementById('hr-mobile-cand-dropdown-wrapper');
        if (!wrapper) return;

        const allCandidates = window.hrOnboardingStore.getCandidates();
        const activeCand = allCandidates.find(c => c.id === this.selectedCandidateId);
        const isAll = !this.selectedCandidateId || !activeCand;

        if (allCandidates.length === 0) {
            wrapper.innerHTML = `
                <div class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-xs flex items-center justify-between">
                    <span>Chưa có hồ sơ nhân sự nào</span>
                </div>
            `;
            return;
        }

        const activeStatusMeta = activeCand ? this.getStatusMeta(activeCand.status) : null;

        wrapper.innerHTML = `
            <button type="button" onclick="window.hrHub.toggleMobileCandDropdown(event)"
                class="w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 rounded-xl border border-slate-200/90 shadow-2xs transition-all active:scale-[0.99] text-left">
                <div class="flex items-center gap-2.5 min-w-0 flex-1">
                    <div class="w-7 h-7 rounded-lg ${isAll ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-700'} flex items-center justify-center shrink-0 font-extrabold text-xs">
                        <i data-lucide="${isAll ? 'users' : 'user'}" class="w-3.5 h-3.5"></i>
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-extrabold text-slate-900 truncate">${isAll ? `Tất cả hồ sơ nhân sự (${allCandidates.length} bạn)` : this.escapeHtml(activeCand.fullName)}</span>
                            ${activeCand ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${activeStatusMeta.bg}">${activeStatusMeta.label}</span>` : ''}
                        </div>
                        <p class="text-[11px] text-slate-500 truncate">${isAll ? 'Hiển thị toàn bộ nhân sự ở dạng thu gọn' : `${this.escapeHtml(activeCand.role || 'Nhân viên')} • Bắt đầu: ${this.escapeHtml(window.hrOnboardingStore.formatDateDisplay(activeCand.startDate))}`}</p>
                    </div>
                </div>
                <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 shrink-0 transition-transform ${this.isMobileCandDropdownOpen ? 'rotate-180 text-emerald-600' : ''}"></i>
            </button>

            <!-- Dropdown Menu -->
            <div id="hr-mobile-cand-dropdown-menu" class="${this.isMobileCandDropdownOpen ? '' : 'hidden'} absolute left-0 right-0 top-full mt-1.5 z-50 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100 max-h-72 overflow-y-auto">
                <!-- Option 1: Tất cả -->
                <div onclick="window.hrHub.selectCandidate(null); window.hrHub.toggleMobileCandDropdown(null, false);"
                    class="flex items-center justify-between gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all ${
                        isAll ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }">
                    <div class="flex items-center gap-2.5 min-w-0 flex-1">
                        <div class="w-7 h-7 rounded-lg ${isAll ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'} flex items-center justify-center shrink-0 font-bold text-xs">
                            <i data-lucide="users" class="w-3.5 h-3.5"></i>
                        </div>
                        <div class="min-w-0">
                            <p class="text-xs font-extrabold truncate ${isAll ? 'text-emerald-900' : 'text-slate-900'}">Tất cả hồ sơ nhân sự</p>
                            <p class="text-[10px] text-slate-500 truncate">${allCandidates.length} bạn nhân sự trong hệ thống</p>
                        </div>
                    </div>
                    ${isAll ? `<i data-lucide="check" class="w-4 h-4 text-emerald-600 shrink-0"></i>` : ''}
                </div>

                ${allCandidates.map(c => {
                    const isSelected = c.id === this.selectedCandidateId;
                    const statusMeta = this.getStatusMeta(c.status);
                    return `
                        <div onclick="window.hrHub.selectCandidate('${c.id}'); window.hrHub.toggleMobileCandDropdown(null, false);"
                            class="flex items-center justify-between gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all ${
                                isSelected ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                            }">
                            <div class="flex items-center gap-2.5 min-w-0 flex-1">
                                <div class="w-7 h-7 rounded-lg ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'} flex items-center justify-center shrink-0 font-bold text-xs">
                                    ${this.escapeHtml((c.fullName || 'U').charAt(0).toUpperCase())}
                                </div>
                                <div class="min-w-0">
                                    <div class="flex items-center gap-1.5">
                                        <p class="text-xs font-extrabold truncate ${isSelected ? 'text-emerald-900' : 'text-slate-900'}">${this.escapeHtml(c.fullName)}</p>
                                        <span class="px-1.5 py-0.2 rounded text-[9px] font-bold border shrink-0 ${statusMeta.bg}">${statusMeta.label}</span>
                                    </div>
                                    <p class="text-[10px] text-slate-500 truncate">${this.escapeHtml(c.role || 'Sales')} • ${this.escapeHtml(window.hrOnboardingStore.formatDateDisplay(c.startDate))}</p>
                                </div>
                            </div>
                            ${isSelected ? `<i data-lucide="check" class="w-4 h-4 text-emerald-600 shrink-0"></i>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
            <!-- Hidden input fallback for tests / scripts -->
            <input type="hidden" id="hr-mobile-candidate-select" value="${activeCand ? activeCand.id : ''}">
        `;
    }

    renderCandidatesTab() {
        this.renderBirthdayAlertWidget();

        const listEl = document.getElementById('hr-candidates-list');
        const detailEl = document.getElementById('hr-candidate-detail');
        if (!listEl || !detailEl) return;

        const allCandidates = window.hrOnboardingStore.getCandidates();
        const upcomingBirthdays = (typeof window.hrOnboardingStore.getUpcomingBirthdays === 'function')
            ? window.hrOnboardingStore.getUpcomingBirthdays(7)
            : [];
        const roadmap = window.hrOnboardingStore.getRoadmap();

        const filtered = allCandidates.filter(c => {
            if (this.candidateFilter !== 'all' && c.status !== this.candidateFilter) return false;
            if (this.candidateSearch) {
                const q = this.candidateSearch.toLowerCase();
                const matchName = (c.fullName || '').toLowerCase().includes(q);
                const matchRole = (c.role || '').toLowerCase().includes(q);
                const matchPhone = (c.phone || '').toLowerCase().includes(q);
                if (!matchName && !matchRole && !matchPhone) return false;
            }
            return true;
        });

        // Render Mobile Dropdown Selector (Đồng bộ chuẩn hệ thống)
        this.renderMobileCandidateDropdown();

        // Render Left Sidebar List
        if (filtered.length === 0) {
            listEl.innerHTML = `
                <div class="p-6 text-center text-xs text-slate-400">
                    Chưa có hồ sơ nhân sự nào khớp bộ lọc.
                </div>
            `;
        } else {
            listEl.innerHTML = filtered.map(c => {
                const isSelected = c.id === this.selectedCandidateId;
                const statusMeta = this.getStatusMeta(c.status);
                const checklist = c.checklist || [];
                const doneCount = checklist.filter(i => i.done).length;
                const pct = checklist.length > 0 ? Math.round((doneCount / checklist.length) * 100) : 0;

                // Tiến độ học riêng của bạn này
                const candProgress = c.taskProgress || {};
                let candTotalLearn = 0;
                let candDoneLearn = 0;
                roadmap.forEach(d => (d.tasks || []).forEach(t => {
                    candTotalLearn++;
                    if (candProgress[t.id]) candDoneLearn++;
                }));
                const candLearnPct = candTotalLearn > 0 ? Math.round((candDoneLearn / candTotalLearn) * 100) : 0;

                // Huy hiệu sinh nhật sắp tới
                let bdayBadge = '';
                const bdayInfo = upcomingBirthdays.find(u => u.candidate.id === c.id);
                if (bdayInfo) {
                    if (bdayInfo.daysLeft === 0) {
                        bdayBadge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-500 text-white flex items-center gap-0.5 animate-pulse shrink-0"><i data-lucide="cake" class="w-3 h-3"></i> Sinh nhật!</span>`;
                    } else {
                        bdayBadge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-0.5 shrink-0"><i data-lucide="cake" class="w-3 h-3 text-amber-600"></i> ${bdayInfo.daysLeft} ngày</span>`;
                    }
                }

                const displayStartDate = window.hrOnboardingStore.formatDateDisplay(c.startDate);

                return `
                    <div onclick="window.hrHub.selectCandidate('${c.id}')"
                        class="p-3.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                                ? 'bg-emerald-50/70 border-emerald-300 shadow-xs ring-1 ring-emerald-500/20'
                                : 'bg-white hover:bg-slate-50 border-slate-200/80'
                        }">
                        <div class="flex items-start justify-between gap-2 mb-1">
                            <h4 class="text-xs sm:text-sm font-extrabold text-slate-900 truncate">${this.escapeHtml(c.fullName)} ${window.hrOnboardingStore.getLearningSummary(c).isOverdue ? '<span class="text-rose-700">• Quá hạn học</span>' : ''}</h4>
                            <div class="flex items-center gap-1 shrink-0">
                                ${bdayBadge}
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusMeta.bg}">
                                    ${statusMeta.label}
                                </span>
                            </div>
                        </div>
                        <p class="text-[11px] text-slate-600 truncate">${this.escapeHtml(c.role || 'Nhân viên Kinh doanh')}</p>
                        <div class="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                            <span class="flex items-center gap-1">
                                <i data-lucide="calendar" class="w-3 h-3 text-emerald-600"></i>
                                <span>${this.escapeHtml(displayStartDate)}</span>
                            </span>
                            <span class="font-bold text-slate-700">
                                Checklist: ${doneCount}/${checklist.length} • Học: <span class="${candLearnPct === 100 ? 'text-emerald-600 font-extrabold' : 'text-indigo-600'}">${candLearnPct}%</span>
                            </span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Render Right Detail Panel (Tất cả ứng viên dạng Accordion có thể thu gọn / mở rộng)
        if (filtered.length === 0) {
            detailEl.innerHTML = `
                <div class="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
                    <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                        <i data-lucide="user-plus" class="w-6 h-6"></i>
                    </div>
                    <h3 class="text-sm font-bold text-slate-800">Không tìm thấy hồ sơ nhân sự phù hợp</h3>
                    <p class="text-xs text-slate-500 max-w-md mx-auto">Thử tìm kiếm với từ khóa khác hoặc bấm nút thêm hồ sơ nhân sự mới.</p>
                    <button type="button" onclick="window.hrHub.openCandidateModal()"
                        class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs">
                        <i data-lucide="plus" class="w-4 h-4"></i>
                        <span>Thêm Hồ Sơ Nhân Sự Mới</span>
                    </button>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
            return;
        }

        const stages = [
            { id: 'preboard', title: '1. Chuẩn bị trước ngày Onboard (Pre-boarding)', icon: 'calendar-check', color: 'amber' },
            { id: 'admin', title: '2. Hồ sơ Hành chính & Pháp lý (CCCD, STK, Hợp đồng)', icon: 'file-check-2', color: 'blue' },
            { id: 'accounts', title: '3. Cấp phát Tài khoản & Công cụ làm việc', icon: 'key-round', color: 'indigo' },
            { id: 'evaluation', title: '4. Theo dõi & Đánh giá quá trình Onboard / Thử việc', icon: 'award', color: 'emerald' }
        ];

        detailEl.innerHTML = `
            <div class="space-y-4">
                ${filtered.map(cand => {
                    const isExpanded = this.expandedCandidateIds.has(cand.id);
                    const statusMeta = this.getStatusMeta(cand.status);
                    const checklist = cand.checklist || [];
                    const doneCount = checklist.filter(i => i.done).length;
                    const pct = checklist.length > 0 ? Math.round((doneCount / checklist.length) * 100) : 0;

                    // Tiến độ học riêng của bạn này
                    const candLearnProgress = cand.taskProgress || {};
                    let totalLearn = 0;
                    let doneLearn = 0;
                    roadmap.forEach(d => (d.tasks || []).forEach(t => {
                        totalLearn++;
                        if (candLearnProgress[t.id]) doneLearn++;
                    }));
                    const learnPct = totalLearn > 0 ? Math.round((doneLearn / totalLearn) * 100) : 0;

                    const displayStartDate = window.hrOnboardingStore.formatDateDisplay(cand.startDate);
                    const activeBdayInfo = upcomingBirthdays.find(u => u.candidate.id === cand.id);
                    let dobDisplay = 'Chưa cập nhật';
                    if (cand.dob && /^\d{4}-\d{2}-\d{2}$/.test(cand.dob)) {
                        const [bYear, bMonth, bDay] = cand.dob.split('-');
                        const age = new Date().getFullYear() - Number(bYear);
                        dobDisplay = `${bDay}/${bMonth}/${bYear} (${age} tuổi)`;
                        if (activeBdayInfo) {
                            if (activeBdayInfo.daysLeft === 0) {
                                dobDisplay += ` • <span class="text-rose-600 font-extrabold">🎉 Sinh nhật hôm nay!</span>`;
                            } else {
                                dobDisplay += ` • <span class="text-amber-600 font-bold">(còn ${activeBdayInfo.daysLeft} ngày)</span>`;
                            }
                        }
                    }

                    const learningSummary = window.hrOnboardingStore.getLearningSummary(cand);

                    return `
                        <div id="hr-cand-card-${cand.id}" class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-slate-300">
                            <!-- Candidate Card Header (Accordion Clickable) -->
                            <div onclick="window.hrHub.toggleCandidateAccordion('${cand.id}')"
                                class="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer select-none bg-white hover:bg-slate-50/80 transition-colors">
                                <div class="flex items-center gap-3 min-w-0 flex-1">
                                    <div class="w-10 h-10 rounded-xl ${isExpanded ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'} flex items-center justify-center shrink-0 font-black text-sm">
                                        ${this.escapeHtml((cand.fullName || 'U').charAt(0).toUpperCase())}
                                    </div>
                                    <div class="min-w-0 space-y-1">
                                        <div class="flex items-center gap-2 flex-wrap">
                                            <h3 class="text-sm sm:text-base font-extrabold text-slate-900 truncate">${this.escapeHtml(cand.fullName)}</h3>
                                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${statusMeta.bg}">${statusMeta.label}</span>
                                            ${learningSummary.isOverdue ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 shrink-0 flex items-center gap-1"><i data-lucide="alert-triangle" class="w-3 h-3"></i> Quá hạn</span>` : ''}
                                        </div>
                                        <p class="text-xs text-slate-500 truncate">
                                            ${this.escapeHtml(cand.role || 'Chuyên viên Kinh doanh')} • Bắt đầu: ${this.escapeHtml(displayStartDate)} • Phụ trách: <strong class="text-slate-700 font-semibold">${this.escapeHtml(cand.mentor || 'Quản lý / HR')}</strong>
                                        </p>
                                    </div>
                                </div>

                                <div class="flex items-center gap-2 shrink-0">
                                    <!-- Mini Badge Tiến độ khi thu gọn -->
                                    <span class="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
                                        Checklist: ${doneCount}/${checklist.length} • Học: ${learnPct}%
                                    </span>
                                    <button type="button" aria-label="Xổ xuống xem hồ sơ" id="hr-cand-arrow-${cand.id}"
                                        class="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all ${isExpanded ? 'rotate-180 text-emerald-600 bg-emerald-50' : ''}">
                                        <i data-lucide="chevron-down" class="w-4 h-4"></i>
                                    </button>
                                </div>
                            </div>

                            <!-- Candidate Card Body (Collapsible) -->
                            <div id="hr-cand-body-${cand.id}" class="${isExpanded ? '' : 'hidden'} border-t border-slate-100 p-4 sm:p-6 space-y-5 bg-slate-50/20">
                                <!-- Thanh Thao Tác (Action Icons with Full Lucide Support) -->
                                <div class="flex flex-wrap items-center justify-between gap-2 pb-2">
                                    <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                        <button type="button" onclick="event.stopPropagation(); window.hrHub.copyCandidateOnboardLink('${cand.id}')"
                                            aria-label="Cập nhật / Copy Link"
                                            class="p-2 sm:p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all flex items-center justify-center active:scale-95"
                                            title="Cập nhật & Copy Link Cổng Onboard riêng">
                                            <i data-lucide="link" class="w-4 h-4"></i>
                                        </button>
                                        <button type="button" onclick="event.stopPropagation(); window.hrHub.openCandidateOnboard('${cand.id}')"
                                            aria-label="Mở Cổng Onboard"
                                            class="p-2 sm:p-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 transition-all flex items-center justify-center active:scale-95"
                                            title="Mở xem Cổng Onboard của bạn ấy">
                                            <i data-lucide="external-link" class="w-4 h-4"></i>
                                        </button>
                                        <button type="button" onclick="event.stopPropagation(); window.hrHub.jumpToTemplatesForCandidate('${cand.id}')"
                                            aria-label="Mẫu tin"
                                            class="p-2 sm:p-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all flex items-center justify-center active:scale-95 shadow-2xs"
                                            title="Soạn Email / Tin nhắn Zalo cho nhân sự này">
                                            <i data-lucide="mail-plus" class="w-4 h-4"></i>
                                        </button>
                                        <button type="button" onclick="event.stopPropagation(); window.hrHub.openCandidateModal('${cand.id}')"
                                            aria-label="Sửa hồ sơ"
                                            class="p-2 sm:p-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all flex items-center justify-center active:scale-95 shadow-2xs"
                                            title="Chỉnh sửa hồ sơ nhân sự">
                                            <i data-lucide="edit-3" class="w-4 h-4"></i>
                                        </button>
                                        ${cand.onboardToken ? `
                                            <button type="button" onclick="event.stopPropagation(); window.hrHub.revokeOnboardLink('${cand.id}')"
                                                aria-label="Thu hồi link"
                                                class="p-2 sm:p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 transition-all flex items-center justify-center active:scale-95"
                                                title="Thu hồi liên kết Onboard hiện tại">
                                                <i data-lucide="link-2-off" class="w-4 h-4"></i>
                                            </button>
                                        ` : ''}
                                    </div>
                                    <button type="button" onclick="event.stopPropagation(); window.hrHub.deleteCandidate('${cand.id}')"
                                        aria-label="Xóa hồ sơ"
                                        class="p-2 sm:p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all flex items-center justify-center active:scale-95 ml-auto"
                                        title="Xóa hồ sơ nhân sự này">
                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                    </button>
                                </div>

                                <!-- Lưới thông tin chi tiết -->
                                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                                    <div class="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                                        <span class="text-[11px] text-slate-400 block mb-0.5">Ngày bắt đầu Onboard</span>
                                        <strong class="text-slate-800 font-bold flex items-center gap-1.5">
                                            <i data-lucide="calendar" class="w-3.5 h-3.5 text-emerald-600"></i>
                                            <span>${this.escapeHtml(displayStartDate)}</span>
                                        </strong>
                                    </div>
                                    <div class="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                                        <span class="text-[11px] text-slate-400 block mb-0.5">Ngày sinh nhật</span>
                                        <strong class="text-slate-800 font-bold flex items-center gap-1.5">
                                            <i data-lucide="cake" class="w-3.5 h-3.5 text-pink-500"></i>
                                            <span>${dobDisplay}</span>
                                        </strong>
                                    </div>
                                    <div class="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                                        <span class="text-[11px] text-slate-400 block mb-0.5">Số điện thoại / Zalo</span>
                                        <strong class="text-slate-800 font-bold flex items-center gap-1.5">
                                            <i data-lucide="phone" class="w-3.5 h-3.5 text-indigo-600"></i>
                                            <span>${this.escapeHtml(cand.phone || 'Chưa cập nhật')}</span>
                                        </strong>
                                    </div>
                                    <div class="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                                        <span class="text-[11px] text-slate-400 block mb-0.5">Email cá nhân</span>
                                        <strong class="text-slate-800 font-bold truncate block">
                                            ${this.escapeHtml(cand.email || 'Chưa cập nhật')}
                                        </strong>
                                    </div>
                                    <div class="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                                        <span class="text-[11px] text-slate-400 block mb-0.5">Người hướng dẫn (Mentor)</span>
                                        <strong class="text-slate-800 font-bold truncate block">
                                            ${this.escapeHtml(cand.mentor || 'Quản lý / HR')}
                                        </strong>
                                    </div>
                                    <div class="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between shadow-2xs">
                                        <div class="min-w-0 pr-2">
                                            <span class="text-[11px] text-emerald-800 font-bold block mb-0.5">Link Onboard riêng:</span>
                                            <span class="text-[10px] text-slate-500 font-mono truncate block">${cand.fullName} (?id=${cand.id})</span>
                                        </div>
                                        <button type="button" onclick="event.stopPropagation(); window.hrHub.copyCandidateOnboardLink('${cand.id}')"
                                            class="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-2xs" title="Copy link">
                                            <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                                        </button>
                                    </div>
                                </div>

                                <!-- Ghi chú Tài khoản & Lương/Chính sách -->
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                    <div class="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-start gap-2.5">
                                        <i data-lucide="key-round" class="w-4 h-4 text-indigo-600 shrink-0 mt-0.5"></i>
                                        <div class="min-w-0 flex-1">
                                            <span class="text-[11px] font-bold text-indigo-900 block">Trạng thái Tài khoản (CRM / Callbot / Email):</span>
                                            <p class="text-slate-700 mt-0.5 break-words">${this.escapeHtml(cand.accountsInfo || 'Chưa ghi chú tài khoản')}</p>
                                        </div>
                                    </div>
                                    <div class="p-3 rounded-xl bg-amber-50/50 border border-amber-100 flex items-start gap-2.5">
                                        <i data-lucide="shield-lock" class="w-4 h-4 text-amber-600 shrink-0 mt-0.5"></i>
                                        <div class="min-w-0 flex-1">
                                            <span class="text-[11px] font-bold text-amber-900 block">Chính sách / Thỏa thuận riêng (Chỉ HR thấy):</span>
                                            <p class="text-slate-700 mt-0.5 break-words">${this.escapeHtml(cand.salaryNote || 'Chưa có ghi chú thỏa thuận')}</p>
                                        </div>
                                    </div>
                                </div>

                                <!-- Thanh Tiến độ -->
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                    <div class="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                                        <div class="flex items-center justify-between text-xs mb-1.5">
                                            <span class="font-bold text-emerald-950 flex items-center gap-1.5">
                                                <i data-lucide="clipboard-check" class="w-4 h-4 text-emerald-600"></i>
                                                Tiến độ Checklist HR
                                            </span>
                                            <span class="font-extrabold text-emerald-700">${doneCount}/${checklist.length} (${pct}%)</span>
                                        </div>
                                        <div class="w-full h-2 bg-emerald-200/70 rounded-full overflow-hidden">
                                            <div class="h-full bg-emerald-600 rounded-full transition-all duration-300" style="width: ${pct}%"></div>
                                        </div>
                                    </div>

                                    <div class="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200/80">
                                        <div class="flex items-center justify-between text-xs mb-1.5">
                                            <span class="font-bold text-indigo-950 flex items-center gap-1.5">
                                                <i data-lucide="graduation-cap" class="w-4 h-4 text-indigo-600"></i>
                                                Tiến độ tự học của bạn ấy
                                            </span>
                                            <span class="font-extrabold text-indigo-700">${doneLearn}/${totalLearn} (${learnPct}%)</span>
                                        </div>
                                        <div class="w-full h-2 bg-indigo-200/70 rounded-full overflow-hidden">
                                            <div class="h-full bg-indigo-600 rounded-full transition-all duration-300" style="width: ${learnPct}%"></div>
                                        </div>
                                    </div>
                                </div>

                                <!-- 4 Giai đoạn Checklist HR -->
                                <div class="space-y-4 pt-2">
                                    <div class="flex items-center justify-between border-b border-slate-200 pb-2">
                                        <h4 class="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2">
                                            <i data-lucide="list-todo" class="w-4 h-4 text-emerald-600"></i>
                                            <span>Checklist Quy Trình Onboard (Dành riêng cho HR)</span>
                                        </h4>
                                    </div>

                                    <div class="space-y-3">
                                        ${stages.map(stage => {
                                            const stageItems = checklist.filter(i => i.stage === stage.id);
                                            const stageDone = stageItems.filter(i => i.done).length;
                                            return `
                                                <div class="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-2xs">
                                                    <div class="px-4 py-2.5 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between gap-2">
                                                        <div class="flex items-center gap-2">
                                                            <i data-lucide="${stage.icon}" class="w-3.5 h-3.5 text-emerald-600"></i>
                                                            <h5 class="text-xs font-extrabold text-slate-800">${stage.title}</h5>
                                                        </div>
                                                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                            stageDone === stageItems.length && stageItems.length > 0
                                                                ? 'bg-emerald-100 text-emerald-800'
                                                                : 'bg-white text-slate-600 border border-slate-200'
                                                        }">
                                                            ${stageDone}/${stageItems.length} xong
                                                        </span>
                                                    </div>

                                                    <div class="divide-y divide-slate-100 bg-white">
                                                        ${stageItems.map(item => `
                                                            <div class="flex items-center justify-between gap-2 p-2.5 sm:p-3 hover:bg-slate-50/80 transition-colors group">
                                                                <label class="flex items-start gap-2.5 flex-1 min-w-0 cursor-pointer select-none">
                                                                    <input type="checkbox" ${item.done ? 'checked' : ''}
                                                                        onchange="window.hrHub.toggleCandidateChecklistItem('${cand.id}', '${item.id}')"
                                                                        class="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0">
                                                                    <span class="text-xs sm:text-sm leading-relaxed ${item.done ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}">
                                                                        ${this.escapeHtml(item.title)}
                                                                    </span>
                                                                </label>
                                                                <button type="button" onclick="window.hrHub.deleteCandidateChecklistItem('${cand.id}', '${item.id}')"
                                                                    class="opacity-70 sm:opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all shrink-0"
                                                                    title="Xóa mục này">
                                                                    <i data-lucide="x" class="w-3.5 h-3.5"></i>
                                                                </button>
                                                            </div>
                                                        `).join('')}

                                                        <!-- Thêm nhanh đầu việc -->
                                                        <div class="p-2 bg-slate-50/50 flex items-center gap-2">
                                                            <input type="text" id="new-chk-${cand.id}-${stage.id}"
                                                                placeholder="+ Thêm mục kiểm tra cho giai đoạn này..."
                                                                onkeydown="if(event.key==='Enter'){event.preventDefault();window.hrHub.addCandidateChecklistItem('${cand.id}', '${stage.id}');}"
                                                                class="flex-1 min-w-0 text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500">
                                                            <button type="button" onclick="window.hrHub.addCandidateChecklistItem('${cand.id}', '${stage.id}')"
                                                                class="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
                                                                Thêm
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>

                                <!-- Ghi Chú Đánh Giá Nội Bộ Của HR -->
                                <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-3">
                                    <div class="flex items-center justify-between">
                                        <h4 class="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2">
                                            <i data-lucide="file-lock-2" class="w-4 h-4 text-amber-600"></i>
                                            <span>Ghi Chú Đánh Giá Nội Bộ Của HR (Chỉ mình bạn xem)</span>
                                        </h4>
                                        <button type="button" onclick="window.hrHub.saveCandidatePrivateNote('${cand.id}')"
                                            class="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs flex items-center gap-1.5">
                                            <i data-lucide="save" class="w-3.5 h-3.5"></i>
                                            <span>Lưu ghi chú</span>
                                        </button>
                                    </div>
                                    <textarea id="hr-cand-private-note-${cand.id}" rows="3"
                                        placeholder="Ghi chú thái độ làm việc, tiến độ tiếp thu sản phẩm Adahub/Callbot, điểm mạnh/yếu hoặc các lưu ý riêng trong thời gian thử việc..."
                                        class="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-slate-200 bg-amber-50/20 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 leading-relaxed">${this.escapeHtml(cand.privateNote || '')}</textarea>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        if (window.lucide) lucide.createIcons();
    }

    toggleCandidateInfo() {
        if (this.selectedCandidateId) {
            this.toggleCandidateAccordion(this.selectedCandidateId);
        }
    }

    toggleCandidateChecklistItem(candId, itemId) {
        const list = window.hrOnboardingStore.getCandidates();
        const cand = list.find(c => c.id === candId);
        if (!cand || !Array.isArray(cand.checklist)) return;
        const item = cand.checklist.find(i => i.id === itemId);
        if (item) {
            item.done = !item.done;
            cand.updatedAt = Date.now();
            window.hrOnboardingStore.saveCandidates(list);
            this.renderCandidatesTab();
        }
    }

    addCandidateChecklistItem(candId, stageId) {
        const input = document.getElementById(`new-chk-${candId}-${stageId}`) || document.getElementById(`new-chk-${stageId}`);
        if (!input || !input.value.trim()) return;
        const title = input.value.trim();

        const list = window.hrOnboardingStore.getCandidates();
        const cand = list.find(c => c.id === candId);
        if (!cand) return;
        if (!Array.isArray(cand.checklist)) cand.checklist = [];

        cand.checklist.push({
            id: 'chk-' + Date.now(),
            stage: stageId,
            title: title,
            done: false
        });
        cand.updatedAt = Date.now();
        input.value = '';
        window.hrOnboardingStore.saveCandidates(list);
        this.renderCandidatesTab();
    }

    deleteCandidateChecklistItem(candId, itemId) {
        const list = window.hrOnboardingStore.getCandidates();
        const cand = list.find(c => c.id === candId);
        if (!cand || !Array.isArray(cand.checklist)) return;
        cand.checklist = cand.checklist.filter(i => i.id !== itemId);
        cand.updatedAt = Date.now();
        window.hrOnboardingStore.saveCandidates(list);
        this.renderCandidatesTab();
    }

    saveCandidatePrivateNote(candId) {
        const noteEl = document.getElementById(`hr-cand-private-note-${candId}`) || document.getElementById('hr-cand-private-note');
        if (!noteEl) return;
        const list = window.hrOnboardingStore.getCandidates();
        const cand = list.find(c => c.id === candId);
        if (!cand) return;
        cand.privateNote = noteEl.value;
        cand.updatedAt = Date.now();
        window.hrOnboardingStore.saveCandidates(list);
        this.showToast('Đã lưu ghi chú đánh giá nhân sự lên Cloud!', 'success');
    }

    openCandidateModal(candId = null) {
        if (candId) {
            this.selectedCandidateId = candId;
            this.expandedCandidateIds.add(candId);
        }
        const modal = document.getElementById('hr-candidate-modal');
        if (!modal) return;

        const list = window.hrOnboardingStore.getCandidates();
        const cand = candId ? list.find(c => c.id === candId) : null;

        document.getElementById('hr-cand-id').value = cand ? cand.id : '';
        document.getElementById('hr-cand-modal-title').textContent = cand ? 'Cập Nhật Hồ Sơ Nhân Sự' : 'Thêm Hồ Sơ Nhân Sự Mới';
        document.getElementById('hr-cand-name').value = cand ? (cand.fullName || '') : '';
        document.getElementById('hr-cand-role').value = cand ? (cand.role || 'Chuyên viên Kinh doanh (Sales Executive)') : 'Chuyên viên Kinh doanh (Sales Executive)';

        // Start Date: pick existing ISO date or compute next Monday
        let defaultStart = '';
        if (cand && cand.startDate && /^\d{4}-\d{2}-\d{2}$/.test(cand.startDate)) {
            defaultStart = cand.startDate;
        } else if (!cand) {
            const today = new Date();
            const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday
            const daysUntilMonday = ((1 + 7 - dayOfWeek) % 7) || 7;
            const nextMon = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysUntilMonday);
            const y = nextMon.getFullYear();
            const m = String(nextMon.getMonth() + 1).padStart(2, '0');
            const d = String(nextMon.getDate()).padStart(2, '0');
            defaultStart = `${y}-${m}-${d}`;
        }
        document.getElementById('hr-cand-start').value = defaultStart;
        const defaultDeadline = cand?.targetDate || (defaultStart && window.hrOnboardingStore ? window.hrOnboardingStore.getWorkingDayDate(defaultStart, 7) : '');
        const deadlineEl = document.getElementById('hr-cand-deadline');
        if (deadlineEl) {
            deadlineEl.value = defaultDeadline;
            deadlineEl.dataset.autoFilled = cand?.targetDate ? 'false' : 'true';
        }
        document.getElementById('hr-cand-dob').value = (cand && cand.dob) ? cand.dob : '';
        document.getElementById('hr-cand-phone').value = cand ? (cand.phone || '') : '';
        document.getElementById('hr-cand-email').value = cand ? (cand.email || '') : '';
        document.getElementById('hr-cand-mentor').value = cand ? (cand.mentor || 'Quản lý / HR Etron HCM') : 'Quản lý / HR Etron HCM';
        document.getElementById('hr-cand-status').value = cand ? (cand.status || 'preparing') : 'preparing';
        document.getElementById('hr-cand-accounts').value = cand ? (cand.accountsInfo || '') : 'Adahub CRM: Chưa cấp | Callbot Ucall: Chưa cấp';
        document.getElementById('hr-cand-salary').value = cand ? (cand.salaryNote || '') : '';

        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }

    closeCandidateModal() {
        const modal = document.getElementById('hr-candidate-modal');
        if (modal) modal.classList.add('hidden');
    }

    handleSaveCandidate(e) {
        if (e) e.preventDefault();
        const id = document.getElementById('hr-cand-id').value.trim();
        const fullName = document.getElementById('hr-cand-name').value.trim();
        if (!fullName) {
            alert('Vui lòng nhập Họ và tên nhân sự!');
            return;
        }

        const startDate = document.getElementById('hr-cand-start').value.trim();
        const dob = document.getElementById('hr-cand-dob').value.trim();
        const targetDate = document.getElementById('hr-cand-deadline').value;
        if (targetDate && targetDate < startDate) { alert('Hạn hoàn thành không được trước ngày bắt đầu.'); return; }
        if (!startDate) {
            alert('Vui lòng chọn Ngày bắt đầu Onboard!');
            return;
        }

        const list = window.hrOnboardingStore.getCandidates();
        let target = id ? list.find(c => c.id === id) : null;

        if (target) {
            target.fullName = fullName;
            target.role = document.getElementById('hr-cand-role').value.trim();
            target.startDate = startDate;
            target.targetDate = targetDate;
            target.dob = dob;
            target.phone = document.getElementById('hr-cand-phone').value.trim();
            target.email = document.getElementById('hr-cand-email').value.trim();
            target.mentor = document.getElementById('hr-cand-mentor').value.trim();
            target.status = document.getElementById('hr-cand-status').value;
            target.accountsInfo = document.getElementById('hr-cand-accounts').value.trim();
            target.salaryNote = document.getElementById('hr-cand-salary').value.trim();
            if (!target.taskProgress) target.taskProgress = {};
            target.updatedAt = Date.now();
        } else {
            target = {
                id: 'cand-' + Date.now(),
                fullName: fullName,
                role: document.getElementById('hr-cand-role').value.trim(),
                department: 'Kinh doanh - Etron HCM',
                startDate: startDate,
                targetDate: targetDate,
                dob: dob,
                phone: document.getElementById('hr-cand-phone').value.trim(),
                email: document.getElementById('hr-cand-email').value.trim(),
                mentor: document.getElementById('hr-cand-mentor').value.trim(),
                status: document.getElementById('hr-cand-status').value,
                accountsInfo: document.getElementById('hr-cand-accounts').value.trim(),
                salaryNote: document.getElementById('hr-cand-salary').value.trim(),
                privateNote: '',
                taskProgress: {},
                checklist: window.hrOnboardingStore.createDefaultChecklist(),
                updatedAt: Date.now()
            };
            list.unshift(target);
        }

        this.selectedCandidateId = target.id;
        this.expandedCandidateIds.add(target.id);
        this.syncQuickVarsFromCandidate(target);
        window.hrOnboardingStore.saveCandidates(list);
        this.closeCandidateModal();
        this.showToast(`Đã lưu hồ sơ nhân sự "${fullName}"!`, 'success');
    }

    async deleteCandidate(candId) {
        const list = window.hrOnboardingStore.getCandidates();
        const target = list.find(c => c.id === candId);
        if (!target) return;
        if (!confirm(`Bạn có chắc muốn xóa hồ sơ nhân sự "${target.fullName}" không?`)) return;

        try { await window.hrOnboardingStore.revokeCandidateLink(candId); }
        catch (_) { this.showToast('Không thể thu hồi liên kết, chưa xóa hồ sơ.', 'error'); return; }
        const nextList = list.filter(c => c.id !== candId);
        this.selectedCandidateId = nextList[0] ? nextList[0].id : null;
        window.hrOnboardingStore.saveCandidates(nextList);
        this.showToast('Đã xóa hồ sơ nhân sự.', 'info');
    }

    // ==========================================
    // BỘ MÀU PASTEL GRADIENT ĐỒNG BỘ TOÀN HỆ THỐNG
    // Tương thích với Kho từ khóa & Media Callbot Hub
    // ==========================================
    getPastelTheme(index) {
        const themes = [
            {
                name: 'indigo',
                cardBg: 'bg-gradient-to-br from-indigo-50/80 via-blue-50/30 to-white',
                headerBg: 'bg-indigo-50/50',
                border: 'border-indigo-200/90 hover:border-indigo-400',
                glow: 'hover:shadow-md hover:shadow-indigo-100/60',
                iconBg: 'bg-indigo-100 text-indigo-700',
                badgeBg: 'bg-indigo-100/90 text-indigo-700 border border-indigo-200/60',
                rowBg: 'bg-white/90 hover:bg-white border-indigo-100/70',
                kwText: 'text-indigo-800',
                kwLabel: 'text-indigo-500',
                pill: 'bg-indigo-600 text-white',
                btnBg: 'bg-indigo-600 hover:bg-indigo-700 text-white',
                tagBg: 'bg-indigo-50 text-indigo-700 border border-indigo-200/80',
                icon: 'text-indigo-600'
            },
            {
                name: 'emerald',
                cardBg: 'bg-gradient-to-br from-emerald-50/80 via-teal-50/30 to-white',
                headerBg: 'bg-emerald-50/50',
                border: 'border-emerald-200/90 hover:border-emerald-400',
                glow: 'hover:shadow-md hover:shadow-emerald-100/60',
                iconBg: 'bg-emerald-100 text-emerald-700',
                badgeBg: 'bg-emerald-100/90 text-emerald-700 border border-emerald-200/60',
                rowBg: 'bg-white/90 hover:bg-white border-emerald-100/70',
                kwText: 'text-emerald-800',
                kwLabel: 'text-emerald-500',
                pill: 'bg-emerald-600 text-white',
                btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
                tagBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
                icon: 'text-emerald-600'
            },
            {
                name: 'purple',
                cardBg: 'bg-gradient-to-br from-purple-50/80 via-fuchsia-50/30 to-white',
                headerBg: 'bg-purple-50/50',
                border: 'border-purple-200/90 hover:border-purple-400',
                glow: 'hover:shadow-md hover:shadow-purple-100/60',
                iconBg: 'bg-purple-100 text-purple-700',
                badgeBg: 'bg-purple-100/90 text-purple-700 border border-purple-200/60',
                rowBg: 'bg-white/90 hover:bg-white border-purple-100/70',
                kwText: 'text-purple-800',
                kwLabel: 'text-purple-500',
                pill: 'bg-purple-600 text-white',
                btnBg: 'bg-purple-600 hover:bg-purple-700 text-white',
                tagBg: 'bg-purple-50 text-purple-700 border border-purple-200/80',
                icon: 'text-purple-600'
            },
            {
                name: 'amber',
                cardBg: 'bg-gradient-to-br from-amber-50/80 via-orange-50/30 to-white',
                headerBg: 'bg-amber-50/50',
                border: 'border-amber-200/90 hover:border-amber-400',
                glow: 'hover:shadow-md hover:shadow-amber-100/60',
                iconBg: 'bg-amber-100 text-amber-700',
                badgeBg: 'bg-amber-100/90 text-amber-700 border border-amber-200/60',
                rowBg: 'bg-white/90 hover:bg-white border-amber-100/70',
                kwText: 'text-amber-800',
                kwLabel: 'text-amber-500',
                pill: 'bg-amber-600 text-white',
                btnBg: 'bg-amber-600 hover:bg-amber-700 text-white',
                tagBg: 'bg-amber-50 text-amber-800 border border-amber-200/80',
                icon: 'text-amber-600'
            },
            {
                name: 'rose',
                cardBg: 'bg-gradient-to-br from-rose-50/80 via-pink-50/30 to-white',
                headerBg: 'bg-rose-50/50',
                border: 'border-rose-200/90 hover:border-rose-400',
                glow: 'hover:shadow-md hover:shadow-rose-100/60',
                iconBg: 'bg-rose-100 text-rose-700',
                badgeBg: 'bg-rose-100/90 text-rose-700 border border-rose-200/60',
                rowBg: 'bg-white/90 hover:bg-white border-rose-100/70',
                kwText: 'text-rose-800',
                kwLabel: 'text-rose-500',
                pill: 'bg-rose-600 text-white',
                btnBg: 'bg-rose-600 hover:bg-rose-700 text-white',
                tagBg: 'bg-rose-50 text-rose-700 border border-rose-200/80',
                icon: 'text-rose-600'
            },
            {
                name: 'sky',
                cardBg: 'bg-gradient-to-br from-sky-50/80 via-cyan-50/30 to-white',
                headerBg: 'bg-sky-50/50',
                border: 'border-sky-200/90 hover:border-sky-400',
                glow: 'hover:shadow-md hover:shadow-sky-100/60',
                iconBg: 'bg-sky-100 text-sky-700',
                badgeBg: 'bg-sky-100/90 text-sky-700 border border-sky-200/60',
                rowBg: 'bg-white/90 hover:bg-white border-sky-100/70',
                kwText: 'text-sky-800',
                kwLabel: 'text-sky-500',
                pill: 'bg-sky-600 text-white',
                btnBg: 'bg-sky-600 hover:bg-sky-700 text-white',
                tagBg: 'bg-sky-50 text-sky-700 border border-sky-200/80',
                icon: 'text-sky-600'
            },
            {
                name: 'teal',
                cardBg: 'bg-gradient-to-br from-teal-50/80 via-emerald-50/30 to-white',
                headerBg: 'bg-teal-50/50',
                border: 'border-teal-200/90 hover:border-teal-400',
                glow: 'hover:shadow-md hover:shadow-teal-100/60',
                iconBg: 'bg-teal-100 text-teal-700',
                badgeBg: 'bg-teal-100/90 text-teal-700 border border-teal-200/60',
                rowBg: 'bg-white/90 hover:bg-white border-teal-100/70',
                kwText: 'text-teal-800',
                kwLabel: 'text-teal-500',
                pill: 'bg-teal-600 text-white',
                btnBg: 'bg-teal-600 hover:bg-teal-700 text-white',
                tagBg: 'bg-teal-50 text-teal-700 border border-teal-200/80',
                icon: 'text-teal-600'
            },
            {
                name: 'blue',
                cardBg: 'bg-gradient-to-br from-blue-50/80 via-indigo-50/30 to-white',
                headerBg: 'bg-blue-50/50',
                border: 'border-blue-200/90 hover:border-blue-400',
                glow: 'hover:shadow-md hover:shadow-blue-100/60',
                iconBg: 'bg-blue-100 text-blue-700',
                badgeBg: 'bg-blue-100/90 text-blue-700 border border-blue-200/60',
                rowBg: 'bg-white/90 hover:bg-white border-blue-100/70',
                kwText: 'text-blue-800',
                kwLabel: 'text-blue-500',
                pill: 'bg-blue-600 text-white',
                btnBg: 'bg-blue-600 hover:bg-blue-700 text-white',
                tagBg: 'bg-blue-50 text-blue-700 border border-blue-200/80',
                icon: 'text-blue-600'
            }
        ];
        return themes[Math.abs(index) % themes.length];
    }

    // ==========================================
    // 4. TAB 2: QUẢN LÝ KẾ HOẠCH & TÀI LIỆU ONBOARD
    // ==========================================
    renderRoadmapTab() {
        const container = document.getElementById('hr-roadmap-builder-list');
        if (!container) return;

        const roadmap = window.hrOnboardingStore.getRoadmap();
        const allDocs = (window.salesStore && typeof window.salesStore.getDocuments === 'function')
            ? window.salesStore.getDocuments()
            : [];

        container.innerHTML = roadmap.map((day, idx) => {
            const attachedDocs = (day.attachedDocIds || [])
                .map(id => allDocs.find(d => d.id === id))
                .filter(Boolean);
            const tasks = day.tasks || [];
            const customLinks = day.customLinks || [];
            const isDayCollapsed = this.collapsedRoadmapDays.has(day.id);
            const theme = this.getPastelTheme(idx);

            return `
                <div id="hr-day-card-${day.id}" class="${theme.cardBg} rounded-2xl border ${theme.border} shadow-2xs ${theme.glow} overflow-hidden transition-all duration-200">
                    <!-- Day Header -->
                    <div class="p-4 sm:p-5 ${theme.headerBg} border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div class="space-y-1">
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="px-2.5 py-1 rounded-lg text-xs font-extrabold ${theme.pill} shadow-xs">
                                    ${this.escapeHtml(day.dayNumber)}
                                </span>
                                <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200/90 bg-white/90 text-xs hover:border-indigo-400 transition-colors shadow-2xs"
                                    title="Chọn ngày đào tạo thực tế từ lịch cho ngày này">
                                    <i data-lucide="calendar" class="w-3.5 h-3.5 ${theme.icon} shrink-0"></i>
                                    <span class="text-[11px] font-bold text-slate-500 whitespace-nowrap">Ngày:</span>
                                    <input type="date" value="${day.date || ''}"
                                        onchange="window.hrHub.handleQuickDayDateChange('${day.id}', this.value)"
                                        class="text-xs font-bold text-slate-800 bg-transparent border-0 p-0 focus:outline-none cursor-pointer"
                                        aria-label="Chọn ngày trên lịch">
                                    ${day.date ? `<span class="text-[11px] font-bold ${theme.tagBg} px-1.5 py-0.5 rounded shadow-2xs">${this.formatDayDate(day.date)}</span>` : ''}
                                </div>
                                <span class="px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${theme.tagBg} flex items-center gap-1 shadow-2xs">
                                    <i data-lucide="user-check" class="w-3 h-3 ${theme.icon}"></i>
                                    <span>Phụ trách: ${this.escapeHtml(day.trainer || 'Nguyễn Thủy Tiên')}</span>
                                </span>
                                <span class="text-[11px] font-semibold text-slate-500">
                                    • ${tasks.length} nội dung đào tạo
                                </span>
                            </div>
                            <h3 class="text-base font-extrabold text-slate-900 pt-0.5 group-hover:${theme.kwText} transition-colors">${this.escapeHtml(this.cleanTaskTitle(day.title))}</h3>
                            ${day.goal ? `<p class="text-xs text-slate-600"><strong>Mục tiêu:</strong> ${this.escapeHtml(day.goal)}</p>` : ''}
                        </div>

                        <div class="flex flex-wrap items-center gap-2 shrink-0">
                            <button type="button" onclick="window.hrHub.openAttachDocModal('${day.id}')"
                                class="relative w-8 h-8 rounded-xl bg-white/90 hover:bg-white text-indigo-700 border border-slate-200/90 flex items-center justify-center transition-all shadow-2xs"
                                title="Kho Tài Liệu SalesHub (${attachedDocs.length} tài liệu)">
                                <i data-lucide="folder-plus" class="w-4 h-4"></i>
                                ${attachedDocs.length > 0 ? `
                                    <span class="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full ${theme.pill} text-[10px] font-bold flex items-center justify-center leading-none shadow-xs">
                                        ${attachedDocs.length}
                                    </span>
                                ` : ''}
                            </button>
                            <button type="button" onclick="window.hrHub.openAddLinkModal('${day.id}')"
                                class="w-8 h-8 rounded-xl bg-white/90 hover:bg-white text-emerald-800 border border-slate-200/90 flex items-center justify-center transition-all shadow-2xs"
                                title="Thêm link ngoài (Drive, Docs, Sheets, Canva)">
                                <i data-lucide="link" class="w-4 h-4"></i>
                            </button>
                            <button type="button" onclick="window.hrHub.openRoadmapDayModal('${day.id}')"
                                class="w-8 h-8 rounded-xl bg-white/90 hover:bg-white text-slate-700 border border-slate-200/90 flex items-center justify-center transition-all shadow-2xs"
                                title="Sửa thông tin ngày" aria-label="Sửa thông tin ngày">
                                <i data-lucide="edit-3" class="w-4 h-4"></i>
                            </button>
                            ${roadmap.length > 1 ? `
                                <button type="button" onclick="window.hrHub.deleteRoadmapDay('${day.id}')"
                                    class="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all" title="Xóa ngày này">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            ` : ''}
                            <button type="button" onclick="window.hrHub.toggleRoadmapDay('${day.id}')"
                                id="hr-day-btn-${day.id}"
                                class="p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-white/90 border border-slate-200/90 transition-all shadow-2xs"
                                title="${isDayCollapsed ? 'Mở rộng ngày này' : 'Thu gọn ngày này'}">
                                <i id="hr-day-chevron-${day.id}" data-lucide="chevron-down" class="w-4 h-4 transition-transform ${isDayCollapsed ? '' : 'rotate-180 text-indigo-600'}"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Day Body (Collapsible) -->
                    <div id="hr-day-body-${day.id}" class="${isDayCollapsed ? 'hidden' : ''} p-4 sm:p-5 space-y-4 bg-white/60">
                        <!-- Modules List (Accordion) -->
                        <div class="space-y-2">
                            <div class="flex items-center justify-between">
                                <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                    <i data-lucide="layers" class="w-3.5 h-3.5 text-indigo-600"></i>
                                    <span>Nội dung học tập (${tasks.length} mục - Bấm để xổ xuống xem nội dung & link):</span>
                                </span>
                            </div>

                            <div class="space-y-2">
                                ${tasks.map(task => {
                                    const isExpanded = this.expandedModules.has(task.id);
                                    const taskLinks = task.links || [];

                                    return `
                                        <div class="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-2xs transition-all hover:border-indigo-300">
                                            <!-- Task Header -->
                                            <div class="p-3 sm:p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none bg-white hover:bg-slate-50/70 transition-colors"
                                                onclick="window.hrHub.toggleModule('${task.id}')">
                                                <div class="flex items-center gap-3 min-w-0 flex-1">
                                                    <i data-lucide="check-square" class="w-4 h-4 text-indigo-500 shrink-0"></i>
                                                    <span class="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                                                        ${this.escapeHtml(this.cleanTaskTitle(task.title))}
                                                    </span>
                                                </div>
                                                <div class="flex items-center gap-1.5 shrink-0">
                                                    ${taskLinks.length > 0 ? `
                                                        <span class="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                            <i data-lucide="paperclip" class="w-3 h-3 text-indigo-500"></i>
                                                            <span>${taskLinks.length} tài liệu</span>
                                                        </span>
                                                    ` : ''}
                                                    ${window.onboardingViewer ? window.onboardingViewer.getTaskTypeBadge(task.type) : ''}
                                                    <button type="button" onclick="event.stopPropagation(); window.hrHub.openEditTaskModal('${day.id}', '${task.id}')"
                                                        class="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-indigo-600 border border-slate-200/90 flex items-center justify-center transition-colors shadow-2xs"
                                                        title="Chỉnh sửa nội dung & kết quả cần đạt của mục này">
                                                        <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                                                    </button>
                                                    <button type="button" onclick="event.stopPropagation(); window.hrHub.openAttachDocModal('${day.id}', '${task.id}')"
                                                        class="w-7 h-7 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center transition-colors shadow-2xs"
                                                        title="Gắn tài liệu từ Kho SalesHub vào mục này">
                                                        <i data-lucide="folder-plus" class="w-3.5 h-3.5"></i>
                                                    </button>
                                                    <button type="button" onclick="event.stopPropagation(); window.hrHub.openAddLinkModal('${day.id}', '${task.id}')"
                                                        class="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center transition-colors shadow-2xs"
                                                        title="Thêm link ngoài (Drive, Docs, Sheets, Canva) vào mục này">
                                                        <i data-lucide="link" class="w-3.5 h-3.5"></i>
                                                    </button>
                                                    <button type="button" onclick="event.stopPropagation(); window.hrHub.deleteTaskFromDay('${day.id}', '${task.id}')"
                                                        class="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                                                        title="Xóa mục học tập này">
                                                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                                    </button>
                                                    <button type="button" aria-label="Xổ xuống" id="hr-mod-icon-${task.id}"
                                                        class="p-1 rounded-lg text-slate-400 hover:text-indigo-600 transition-transform ${isExpanded ? 'rotate-180 text-indigo-600' : ''}">
                                                        <i data-lucide="chevron-down" class="w-4 h-4"></i>
                                                    </button>
                                                </div>
                                            </div>

                                            <!-- Module Expanded Content -->
                                            <div id="hr-mod-body-${task.id}" class="${isExpanded ? '' : 'hidden'} border-t border-slate-100 bg-slate-50/70 p-3.5 sm:p-4 space-y-3">
                                                <!-- Quick edit button bar -->
                                                <div class="flex items-center justify-between pb-2 border-b border-slate-200/60">
                                                    <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                                        <i data-lucide="info" class="w-3.5 h-3.5 text-indigo-500"></i>
                                                        <span>Chi tiết nội dung & yêu cầu</span>
                                                    </span>
                                                    <button type="button" onclick="window.hrHub.openEditTaskModal('${day.id}', '${task.id}')"
                                                        class="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95">
                                                        <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                                                        <span>Chỉnh sửa nội dung</span>
                                                    </button>
                                                </div>

                                                <!-- Hoạt động & Nội dung kèm theo (Clickable to edit) -->
                                                <div class="space-y-1 group/act cursor-pointer rounded-xl p-2 -mx-2 hover:bg-white/80 transition-colors border border-transparent hover:border-slate-200/80"
                                                    onclick="window.hrHub.openEditTaskModal('${day.id}', '${task.id}')" title="Bấm để chỉnh sửa nội dung hoạt động">
                                                    <div class="flex items-center justify-between">
                                                        <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 group-hover/act:text-indigo-600 transition-colors">
                                                            <i data-lucide="sparkles" class="w-3.5 h-3.5 text-amber-500"></i>
                                                            <span>Hoạt động & Nội dung kèm theo:</span>
                                                        </span>
                                                        <span class="text-[10px] text-indigo-600 font-bold opacity-0 group-hover/act:opacity-100 transition-opacity flex items-center gap-1">
                                                            <i data-lucide="edit-3" class="w-3 h-3"></i>
                                                            <span>Sửa</span>
                                                        </span>
                                                    </div>
                                                    <p class="text-xs sm:text-sm text-slate-700 leading-relaxed pl-5 group-hover/act:text-slate-900 transition-colors">
                                                        ${task.activity ? this.escapeHtml(task.activity) : '<span class="italic text-slate-400">Chưa có mô tả hoạt động. Bấm để thêm nội dung...</span>'}
                                                    </p>
                                                </div>

                                                <!-- Kết quả cần đạt (Clickable to edit) -->
                                                <div class="space-y-1 group/out cursor-pointer rounded-xl p-2 -mx-2 hover:bg-white/80 transition-colors border border-transparent hover:border-slate-200/80"
                                                    onclick="window.hrHub.openEditTaskModal('${day.id}', '${task.id}')" title="Bấm để chỉnh sửa kết quả cần đạt">
                                                    <div class="flex items-center justify-between">
                                                        <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 group-hover/out:text-indigo-600 transition-colors">
                                                            <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-600"></i>
                                                            <span>Kết quả cần đạt:</span>
                                                        </span>
                                                        <span class="text-[10px] text-indigo-600 font-bold opacity-0 group-hover/out:opacity-100 transition-opacity flex items-center gap-1">
                                                            <i data-lucide="edit-3" class="w-3 h-3"></i>
                                                            <span>Sửa</span>
                                                        </span>
                                                    </div>
                                                    <p class="text-xs sm:text-sm text-slate-700 leading-relaxed pl-5 group-hover/out:text-slate-900 transition-colors">
                                                        ${task.outcome ? this.escapeHtml(task.outcome) : '<span class="italic text-slate-400">Chưa có kết quả cần đạt. Bấm để thêm mục tiêu...</span>'}
                                                    </p>
                                                </div>

                                                <!-- Links đính kèm của mục -->
                                                <div class="space-y-1.5 pt-1">
                                                    <div class="flex items-center justify-between">
                                                        <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                                            <i data-lucide="link-2" class="w-3.5 h-3.5 text-indigo-600"></i>
                                                            <span>Tài liệu & Link đính kèm (${taskLinks.length}):</span>
                                                        </span>
                                                    </div>

                                                    ${taskLinks.length === 0 ? `
                                                        <div class="p-2.5 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 pl-5">
                                                            Chưa có tài liệu đính kèm riêng cho mục này. Dùng 2 icon kho tài liệu hoặc link ở trên để thêm.
                                                        </div>
                                                    ` : `
                                                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-5">
                                                             ${taskLinks.map((link, lIdx) => {
                                                                const isInternalDoc = !!(link.docId || (link.url && link.url.includes('doc=')));
                                                                const docId = link.docId || (link.url && link.url.includes('doc=') ? link.url.split('doc=')[1].split('&')[0] : null);
                                                                return `
                                                                <div class="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs group hover:border-indigo-300">
                                                                    <div class="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                                                                        onclick="${(isInternalDoc && docId) ? `window.documentHub && window.documentHub.openDocument('${this.escapeJs(docId)}')` : `window.open('${this.escapeJs(link.url)}', '_blank')`}">
                                                                        <i data-lucide="${link.type === 'internal' ? 'folder' : 'external-link'}" class="w-3.5 h-3.5 text-indigo-500 shrink-0"></i>
                                                                        <div class="min-w-0">
                                                                            <p class="text-xs font-bold text-slate-800 hover:text-indigo-600 truncate">${this.escapeHtml(link.title)}</p>
                                                                            ${link.note ? `<p class="text-[10px] text-slate-400 truncate">${this.escapeHtml(link.note)}</p>` : ''}
                                                                        </div>
                                                                    </div>
                                                                    <div class="flex items-center gap-1 shrink-0">
                                                                        <button type="button"
                                                                            onclick="${(isInternalDoc && docId) ? `window.documentHub && window.documentHub.openDocument('${this.escapeJs(docId)}')` : `window.open('${this.escapeJs(link.url)}', '_blank')`}"
                                                                            class="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50" title="Mở xem tài liệu">
                                                                            <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i>
                                                                        </button>
                                                                        <button type="button" onclick="window.hrHub.deleteLinkFromModule('${day.id}', '${task.id}', ${lIdx})"
                                                                            class="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50" title="Xóa khỏi mục này">
                                                                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                             `;}).join('')}
                                                        </div>
                                                    `}
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}

                                <!-- Nút thêm nội dung đào tạo mới vào ngày -->
                                <button type="button" onclick="window.hrHub.openAddTaskModal('${day.id}')"
                                    class="w-full py-2.5 px-3 border border-dashed border-indigo-200 hover:border-indigo-400 bg-white/70 hover:bg-indigo-50/60 rounded-xl text-xs font-bold text-indigo-700 flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] shadow-2xs">
                                    <i data-lucide="plus-circle" class="w-4 h-4"></i>
                                    <span>+ Thêm nội dung đào tạo mới vào ${this.escapeHtml(day.dayNumber)}</span>
                                </button>
                            </div>
                        </div>

                        <!-- Tài liệu đính kèm từ Kho Tài Liệu (Cấp Ngày) -->
                        ${attachedDocs.length > 0 ? `
                            <div class="space-y-2 pt-2 border-t border-slate-100">
                                <div class="flex items-center justify-between">
                                    <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                        <i data-lucide="folder" class="w-3.5 h-3.5 text-indigo-600"></i>
                                        <span>Tài liệu đính kèm từ Kho Tài Liệu SalesHub (${attachedDocs.length}):</span>
                                    </span>
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    ${attachedDocs.map(doc => {
                                        const badge = window.documentHub ? window.documentHub.getFileBadge(doc.fileType, doc.type) : { bg: 'bg-indigo-50', color: 'text-indigo-700', label: 'DOC' };
                                        return `
                                            <div class="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-indigo-50/40 border border-indigo-200/80">
                                                <div onclick="window.documentHub && window.documentHub.openDocument('${this.escapeHtml(this.escapeJs(doc.id))}')"
                                                    class="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group">
                                                    <div class="w-8 h-8 rounded-lg ${badge.bg} ${badge.color} font-bold text-[11px] flex items-center justify-center shrink-0">
                                                        ${badge.label}
                                                    </div>
                                                    <div class="min-w-0">
                                                        <p class="text-xs font-bold text-slate-800 group-hover:text-indigo-600 truncate">${this.escapeHtml(doc.title)}</p>
                                                        <p class="text-[10px] text-slate-500 truncate">${this.escapeHtml(doc.category || '')} • Bấm để xem thử</p>
                                                    </div>
                                                </div>
                                                <button type="button" onclick="window.hrHub.toggleAttachDocToDay('${day.id}', '${this.escapeHtml(this.escapeJs(doc.id))}')"
                                                    class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0" title="Gỡ tài liệu khỏi ngày này">
                                                    <i data-lucide="x" class="w-3.5 h-3.5"></i>
                                                </button>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <!-- Custom Links Cấp Ngày (nếu có) -->
                        ${customLinks.length > 0 ? `
                            <div class="space-y-1.5 pt-2 border-t border-slate-100">
                                <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Liên kết ngoài cấp ngày (${customLinks.length}):</span>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    ${customLinks.map((link, cIdx) => `
                                        <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                                            <a href="${this.escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer"
                                                class="flex items-center gap-2 min-w-0 flex-1 font-semibold text-slate-700 hover:text-indigo-700">
                                                <i data-lucide="external-link" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
                                                <span class="truncate">${this.escapeHtml(link.title)}</span>
                                            </a>
                                            <button type="button" onclick="window.hrHub.deleteCustomLinkFromDay('${day.id}', ${cIdx})"
                                                class="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0" title="Xóa link">
                                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                            </button>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        ${day.mentorNote ? `
                            <div class="p-3 rounded-xl bg-amber-50/60 border border-amber-200/70 text-xs text-amber-950 flex items-start gap-2">
                                <i data-lucide="sparkles" class="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5"></i>
                                <span class="leading-relaxed">${this.escapeHtml(this.cleanMentorNote(day.mentorNote))}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        if (window.lucide) lucide.createIcons();
    }

    openRoadmapDayModal(dayId = null) {
        const modal = document.getElementById('hr-roadmap-day-modal');
        if (!modal) return;

        const roadmap = window.hrOnboardingStore.getRoadmap();
        const day = dayId ? roadmap.find(d => d.id === dayId) : null;
        this.editingDayId = day ? day.id : null;

        document.getElementById('hr-day-modal-title').textContent = day ? `Chỉnh Sửa ${day.dayNumber}` : 'Thêm Ngày / Giai Đoạn Onboard Mới';
        document.getElementById('hr-day-number').value = day ? (day.dayNumber || '') : `Ngày ${roadmap.length + 1}`;
        const dayDateEl = document.getElementById('hr-day-date');
        if (dayDateEl) dayDateEl.value = day ? (day.date || '') : '';
        document.getElementById('hr-day-duration').value = day ? (day.duration || '08:30 – 17:30') : '08:30 – 17:30';
        document.getElementById('hr-day-title').value = day ? (day.title || '') : '';
        const trainerEl = document.getElementById('hr-day-trainer');
        if (trainerEl) trainerEl.value = day ? (day.trainer || 'Nguyễn Thủy Tiên') : 'Nguyễn Thủy Tiên';
        document.getElementById('hr-day-goal').value = day ? (day.goal || '') : '';
        document.getElementById('hr-day-color').value = day ? (day.badgeColor || 'indigo') : 'indigo';
        document.getElementById('hr-day-note').value = day ? (day.mentorNote || '') : '';

        const tasksText = day && Array.isArray(day.tasks)
            ? day.tasks.map(t => t.title).join('\n')
            : '';
        document.getElementById('hr-day-tasks').value = tasksText;

        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }

    closeRoadmapDayModal() {
        const modal = document.getElementById('hr-roadmap-day-modal');
        if (modal) modal.classList.add('hidden');
    }

    handleSaveRoadmapDay(e) {
        if (e) e.preventDefault();
        const dayNumber = document.getElementById('hr-day-number').value.trim();
        const title = document.getElementById('hr-day-title').value.trim();
        if (!dayNumber || !title) {
            alert('Vui lòng nhập Tên ngày (VD: Ngày 1) và Tiêu đề ngày học!');
            return;
        }

        const dayDate = (document.getElementById('hr-day-date')?.value || '').trim();
        const duration = document.getElementById('hr-day-duration').value.trim();
        const trainerEl = document.getElementById('hr-day-trainer');
        const trainer = (trainerEl && trainerEl.value.trim()) ? trainerEl.value.trim() : 'Nguyễn Thủy Tiên';
        const goal = document.getElementById('hr-day-goal').value.trim();
        const badgeColor = document.getElementById('hr-day-color').value;
        const mentorNote = document.getElementById('hr-day-note').value.trim();
        const rawLines = document.getElementById('hr-day-tasks').value
            .split('\n')
            .map(s => s.trim())
            .filter(Boolean);

        const roadmap = window.hrOnboardingStore.getRoadmap();
        let target = this.editingDayId ? roadmap.find(d => d.id === this.editingDayId) : null;

        if (target) {
            const oldTasks = target.tasks || [];
            target.dayNumber = dayNumber;
            target.date = dayDate;
            target.title = title;
            target.duration = duration;
            target.trainer = trainer;
            target.goal = goal;
            target.badgeColor = badgeColor;
            target.mentorNote = mentorNote;
            target.tasks = rawLines.map((line, idx) => {
                const existing = oldTasks.find(t => t && t.title && t.title.trim().toLowerCase() === line.trim().toLowerCase()) || oldTasks[idx];
                return {
                    id: existing ? existing.id : `t-${Date.now()}-${idx}`,
                    title: line,
                    type: existing ? existing.type : (line.toLowerCase().includes('thực hành') ? 'practice' : 'learn'),
                    activity: existing ? existing.activity : '',
                    outcome: existing ? existing.outcome : '',
                    links: existing ? existing.links : []
                };
            });
        } else {
            target = {
                id: 'day-' + Date.now(),
                dayNumber,
                date: dayDate,
                title,
                duration,
                trainer,
                goal,
                badgeColor,
                mentorNote,
                attachedDocIds: [],
                customLinks: [],
                tasks: rawLines.map((line, idx) => ({
                    id: `t-${Date.now()}-${idx}`,
                    title: line,
                    type: line.toLowerCase().includes('thực hành') ? 'practice' : 'learn',
                    activity: '',
                    outcome: '',
                    links: []
                }))
            };
            roadmap.push(target);
        }

        window.hrOnboardingStore.saveRoadmap(roadmap);
        this.closeRoadmapDayModal();
        this.renderRoadmapTab();
        this.showToast(`Đã lưu cập nhật "${dayNumber}" lên Cloud (Trang Onboard của nhân sự mới đã tự động cập nhật)!`, 'success');
    }

    deleteRoadmapDay(dayId) {
        const roadmap = window.hrOnboardingStore.getRoadmap();
        const target = roadmap.find(d => d.id === dayId);
        if (!target) return;
        if (!confirm(`Bạn có chắc muốn xóa "${target.dayNumber}: ${target.title}" khỏi lộ trình Onboard?`)) return;

        const next = roadmap.filter(d => d.id !== dayId);
        window.hrOnboardingStore.saveRoadmap(next);
        this.renderRoadmapTab();
        this.showToast('Đã xóa ngày khỏi lộ trình.', 'info');
    }

    async resetRoadmapToDefault() {
        if (!confirm('Bạn có chắc muốn khôi phục Lộ trình Onboard về 8 ngày đào tạo chuẩn của Etron (Hội nhập, Callbot AI, Adahub CRM, Tổng đài VoIP, Bảng giá & Lập báo giá, Quy trình bán hàng & Gọi điện, Kỹ năng Meeting & HDSD, Nghiên cứu tài liệu & CSKH)?')) return;
        try {
            await window.hrOnboardingStore.saveRoadmap(DEFAULT_ONBOARDING_ROADMAP);
            this.renderRoadmapTab();
            this.showToast('Đã khôi phục và đồng bộ Lộ trình 8 ngày chuẩn của Etron lên Cloud!', 'success');
        } catch (e) {
            this.showToast('Chưa lưu được lộ trình. Vui lòng kiểm tra kết nối mạng!', 'error');
        }
    }

    // ==========================================
    // CHỈNH SỬA / THÊM MỚI NỘI DUNG ĐÀO TẠO (TASK DETAIL MODAL)
    // ==========================================
    openEditTaskModal(dayId, taskId) {
        const roadmap = window.hrOnboardingStore.getRoadmap();
        const day = roadmap.find(d => d.id === dayId);
        if (!day) return;
        const task = (day.tasks || []).find(t => t.id === taskId);
        if (!task) return;

        const modal = document.getElementById('hr-task-detail-modal');
        if (!modal) return;

        document.getElementById('hr-task-day-id').value = dayId;
        document.getElementById('hr-task-id').value = taskId;
        document.getElementById('hr-task-modal-title').textContent = 'Chỉnh Sửa Nội Dung Học Tập';
        document.getElementById('hr-task-modal-subtitle').textContent = `${day.dayNumber}: ${this.cleanTaskTitle(task.title)}`;

        document.getElementById('hr-task-title').value = task.title || '';
        document.getElementById('hr-task-type').value = task.type || 'learn';
        document.getElementById('hr-task-activity').value = task.activity || '';
        document.getElementById('hr-task-outcome').value = task.outcome || '';

        const deleteBtn = document.getElementById('hr-task-delete-btn');
        if (deleteBtn) deleteBtn.classList.remove('hidden');

        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }

    openAddTaskModal(dayId) {
        const roadmap = window.hrOnboardingStore.getRoadmap();
        const day = roadmap.find(d => d.id === dayId);
        if (!day) return;

        const modal = document.getElementById('hr-task-detail-modal');
        if (!modal) return;

        document.getElementById('hr-task-day-id').value = dayId;
        document.getElementById('hr-task-id').value = '';
        document.getElementById('hr-task-modal-title').textContent = 'Thêm Nội Dung Đào Tạo Mới';
        document.getElementById('hr-task-modal-subtitle').textContent = `Thêm bài học / bài tập vào ${day.dayNumber}: ${this.cleanTaskTitle(day.title)}`;

        document.getElementById('hr-task-title').value = '';
        document.getElementById('hr-task-type').value = 'learn';
        document.getElementById('hr-task-activity').value = '';
        document.getElementById('hr-task-outcome').value = '';

        const deleteBtn = document.getElementById('hr-task-delete-btn');
        if (deleteBtn) deleteBtn.classList.add('hidden');

        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }

    closeTaskDetailModal() {
        const modal = document.getElementById('hr-task-detail-modal');
        if (modal) modal.classList.add('hidden');
    }

    async handleSaveTaskDetail(e) {
        if (e) e.preventDefault();
        const dayId = document.getElementById('hr-task-day-id').value;
        const taskId = document.getElementById('hr-task-id').value;
        const title = document.getElementById('hr-task-title').value.trim();
        const type = document.getElementById('hr-task-type').value;
        const activity = document.getElementById('hr-task-activity').value.trim();
        const outcome = document.getElementById('hr-task-outcome').value.trim();

        if (!title) {
            alert('Vui lòng nhập Tiêu đề bài học / bài tập!');
            return;
        }

        const roadmap = window.hrOnboardingStore.getRoadmap();
        const day = roadmap.find(d => d.id === dayId);
        if (!day) return;

        if (!Array.isArray(day.tasks)) day.tasks = [];

        if (taskId) {
            const task = day.tasks.find(t => t.id === taskId);
            if (task) {
                task.title = title;
                task.type = type;
                task.activity = activity;
                task.outcome = outcome;
                this.expandedModules.add(task.id);
            }
        } else {
            const newTaskId = 't-' + Date.now();
            const newTask = {
                id: newTaskId,
                title,
                type,
                activity,
                outcome,
                links: []
            };
            day.tasks.push(newTask);
            this.expandedModules.add(newTaskId);
            this.collapsedRoadmapDays.delete(day.id);
        }

        try {
            await window.hrOnboardingStore.saveRoadmap(roadmap);
            this.closeTaskDetailModal();
            this.renderRoadmapTab();
            this.showToast(`Đã lưu nội dung "${title}" thành công!`, 'success');
        } catch (err) {
            this.showToast('Chưa lưu được nội dung. Vui lòng thử lại!', 'error');
        }
    }

    handleDeleteCurrentTask() {
        const dayId = document.getElementById('hr-task-day-id').value;
        const taskId = document.getElementById('hr-task-id').value;
        if (!dayId || !taskId) return;
        this.deleteTaskFromDay(dayId, taskId, false);
    }

    async deleteTaskFromDay(dayId, taskId, skipModalClose = true) {
        const roadmap = window.hrOnboardingStore.getRoadmap();
        const day = roadmap.find(d => d.id === dayId);
        if (!day || !Array.isArray(day.tasks)) return;

        const task = day.tasks.find(t => t.id === taskId);
        if (!task) return;

        if (!confirm(`Bạn có chắc muốn xóa "${task.title}" khỏi ${day.dayNumber}?`)) return;

        day.tasks = day.tasks.filter(t => t.id !== taskId);
        this.expandedModules.delete(taskId);

        try {
            await window.hrOnboardingStore.saveRoadmap(roadmap);
            if (!skipModalClose) this.closeTaskDetailModal();
            this.renderRoadmapTab();
            this.showToast(`Đã xóa "${task.title}".`, 'info');
        } catch (err) {
            this.showToast('Chưa xóa được. Vui lòng thử lại!', 'error');
        }
    }

    openAddLinkModal(dayId, taskId = null) {
        this.linkTargetDayId = dayId;
        this.linkTargetTaskId = taskId;
        const modal = document.getElementById('hr-add-link-modal');
        if (!modal) return;

        const day = window.hrOnboardingStore.getRoadmap().find(d => d.id === dayId);
        const task = taskId && day ? (day.tasks || []).find(t => t.id === taskId) : null;

        const targetDescEl = document.getElementById('hr-link-target-desc');
        if (targetDescEl) {
            targetDescEl.textContent = task
                ? `Thêm link ngoài cho ${day.dayNumber} > ${this.cleanTaskTitle(task.title)}`
                : `Thêm link ngoài chung cho ${day ? day.dayNumber : ''}`;
        }
        document.getElementById('hr-link-title').value = '';
        document.getElementById('hr-link-url').value = '';
        document.getElementById('hr-link-note').value = '';
        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }

    closeAddLinkModal() {
        const modal = document.getElementById('hr-add-link-modal');
        if (modal) modal.classList.add('hidden');
    }

    handleSaveCustomLink(e) {
        if (e) e.preventDefault();
        const title = document.getElementById('hr-link-title').value.trim();
        const url = document.getElementById('hr-link-url').value.trim();
        const note = document.getElementById('hr-link-note').value.trim();
        if (!title || !url) {
            alert('Vui lòng nhập Tên tài liệu và Đường dẫn URL!');
            return;
        }

        const roadmap = window.hrOnboardingStore.getRoadmap();
        const day = roadmap.find(d => d.id === this.linkTargetDayId);
        if (!day) return;

        const newLink = {
            title,
            url,
            note: note || undefined,
            type: url.startsWith('http') ? 'external' : 'internal'
        };

        if (this.linkTargetTaskId) {
            const task = (day.tasks || []).find(t => t.id === this.linkTargetTaskId);
            if (task) {
                if (!Array.isArray(task.links)) task.links = [];
                task.links.push(newLink);
                this.expandedModules.add(task.id);
            }
        } else {
            if (!Array.isArray(day.customLinks)) day.customLinks = [];
            day.customLinks.push(newLink);
        }

        window.hrOnboardingStore.saveRoadmap(roadmap);
        this.closeAddLinkModal();
        this.renderRoadmapTab();
        this.showToast('Đã lưu link tài liệu thành công!', 'success');
    }

    deleteLinkFromModule(dayId, taskId, linkIdx) {
        if (!confirm('Bạn có chắc muốn xóa link tài liệu này?')) return;
        const roadmap = window.hrOnboardingStore.getRoadmap();
        const day = roadmap.find(d => d.id === dayId);
        if (!day) return;
        const task = (day.tasks || []).find(t => t.id === taskId);
        if (!task || !Array.isArray(task.links)) return;
        task.links.splice(linkIdx, 1);
        window.hrOnboardingStore.saveRoadmap(roadmap);
        this.renderRoadmapTab();
        this.showToast('Đã xóa link tài liệu.', 'info');
    }

    deleteCustomLinkFromDay(dayId, linkIdx) {
        if (!confirm('Bạn có chắc muốn xóa link tài liệu này khỏi ngày?')) return;
        const roadmap = window.hrOnboardingStore.getRoadmap();
        const day = roadmap.find(d => d.id === dayId);
        if (!day || !Array.isArray(day.customLinks)) return;
        day.customLinks.splice(linkIdx, 1);
        window.hrOnboardingStore.saveRoadmap(roadmap);
        this.renderRoadmapTab();
        this.showToast('Đã xóa link tài liệu khỏi ngày.', 'info');
    }

    openAttachDocModal(dayId, taskId = null) {
        this.attachingDayId = dayId;
        this.attachingTaskId = taskId;
        this.docPickerSearch = '';
        const searchInput = document.getElementById('hr-doc-picker-search');
        if (searchInput) searchInput.value = '';

        const modal = document.getElementById('hr-attach-doc-modal');
        if (!modal) return;
        this.renderAttachDocModalList();
        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }

    closeAttachDocModal() {
        const modal = document.getElementById('hr-attach-doc-modal');
        if (modal) modal.classList.add('hidden');
    }

    renderAttachDocModalList() {
        const listEl = document.getElementById('hr-doc-picker-list');
        const subtitleEl = document.getElementById('hr-doc-picker-subtitle');
        if (!listEl) return;

        const roadmap = window.hrOnboardingStore.getRoadmap();
        const day = roadmap.find(d => d.id === this.attachingDayId);
        if (!day) return;

        const isTaskLevel = !!this.attachingTaskId;
        const task = isTaskLevel ? (day.tasks || []).find(t => t.id === this.attachingTaskId) : null;

        if (subtitleEl) {
            subtitleEl.textContent = task
                ? `Tích chọn tài liệu từ Kho SalesHub để gắn vào: "${this.cleanTaskTitle(task.title)}"`
                : `Tích chọn các tài liệu từ Kho SalesHub để hiển thị trong ${day.dayNumber}: ${this.cleanTaskTitle(day.title)}`;
        }

        const taskLinks = task ? (task.links || []) : [];
        const attachedSet = isTaskLevel
            ? new Set(taskLinks.map(l => l.docId || (l.url && l.url.includes('doc=') ? l.url.split('doc=')[1].split('&')[0] : null)).filter(Boolean))
            : new Set(day.attachedDocIds || []);

        const allDocs = (window.salesStore && typeof window.salesStore.getDocuments === 'function')
            ? window.salesStore.getDocuments()
            : [];

        const q = (this.docPickerSearch || '').toLowerCase().trim();
        const filtered = allDocs.filter(d => {
            if (!q) return true;
            return (d.title || '').toLowerCase().includes(q) || (d.category || '').toLowerCase().includes(q);
        });

        if (filtered.length === 0) {
            listEl.innerHTML = `<div class="p-8 text-center text-xs text-slate-400">Không tìm thấy tài liệu nào khớp từ khóa.</div>`;
            return;
        }

        listEl.innerHTML = filtered.map(doc => {
            const isAttached = attachedSet.has(doc.id);
            const badge = window.documentHub ? window.documentHub.getFileBadge(doc.fileType, doc.type) : { bg: 'bg-indigo-50', color: 'text-indigo-700', label: 'DOC' };

            const clickHandler = isTaskLevel
                ? `window.hrHub.toggleAttachDocToTask('${day.id}', '${task.id}', '${this.escapeHtml(this.escapeJs(doc.id))}')`
                : `window.hrHub.toggleAttachDocToDay('${day.id}', '${this.escapeHtml(this.escapeJs(doc.id))}')`;

            return `
                <div onclick="${clickHandler}"
                    class="flex items-center justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                        isAttached
                            ? 'bg-indigo-50/80 border-indigo-300 shadow-2xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200/80'
                    }">
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                        <div class="w-9 h-9 rounded-lg ${badge.bg} ${badge.color} font-bold text-xs flex items-center justify-center shrink-0">
                            ${badge.label}
                        </div>
                        <div class="min-w-0">
                            <p class="text-xs sm:text-sm font-bold text-slate-900 truncate">${this.escapeHtml(doc.title)}</p>
                            <p class="text-[11px] text-slate-500 truncate">${this.escapeHtml(doc.category || 'Chung')} • ${this.escapeHtml(doc.fileSize || '')}</p>
                        </div>
                    </div>
                    <div class="shrink-0">
                        <span class="px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1 ${
                            isAttached
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }">
                            <i data-lucide="${isAttached ? 'check' : 'plus'}" class="w-3.5 h-3.5"></i>
                            <span>${isAttached ? 'Đã gắn' : 'Gắn vào'}</span>
                        </span>
                    </div>
                </div>
            `;
        }).join('');

        if (window.lucide) lucide.createIcons();
    }

    toggleAttachDocToTask(dayId, taskId, docId) {
        const roadmap = window.hrOnboardingStore.getRoadmap();
        const day = roadmap.find(d => d.id === dayId);
        if (!day) return;
        const task = (day.tasks || []).find(t => t.id === taskId);
        if (!task) return;
        if (!Array.isArray(task.links)) task.links = [];

        const allDocs = (window.salesStore && typeof window.salesStore.getDocuments === 'function')
            ? window.salesStore.getDocuments()
            : [];
        const doc = allDocs.find(d => d.id === docId);

        const existingIdx = task.links.findIndex(l => l.docId === docId || (l.url && l.url.includes(`doc=${docId}`)));
        if (existingIdx >= 0) {
            task.links.splice(existingIdx, 1);
        } else if (doc) {
            task.links.push({
                docId: doc.id,
                title: doc.title,
                url: `index.html?tab=documents&doc=${doc.id}`,
                note: doc.category || 'Kho tài liệu SalesHub',
                type: 'internal'
            });
            this.expandedModules.add(task.id);
        }

        window.hrOnboardingStore.saveRoadmap(roadmap);
        this.renderAttachDocModalList();
        this.renderRoadmapTab();
    }

    toggleAttachDocToDay(dayId, docId) {
        const roadmap = window.hrOnboardingStore.getRoadmap();
        const day = roadmap.find(d => d.id === dayId);
        if (!day) return;
        if (!Array.isArray(day.attachedDocIds)) day.attachedDocIds = [];

        const idx = day.attachedDocIds.indexOf(docId);
        if (idx >= 0) {
            day.attachedDocIds.splice(idx, 1);
        } else {
            day.attachedDocIds.push(docId);
        }

        window.hrOnboardingStore.saveRoadmap(roadmap);
        this.renderAttachDocModalList();
        this.renderRoadmapTab();
    }

    // ==========================================
    // 5. TAB 3: KHO MẪU EMAIL & TIN NHẮN HR
    // ==========================================
    toggleTplCandDropdown(e, forceState = null) {
        if (e) {
            e.stopPropagation();
            if (e.target && e.target.closest && e.target.closest('#hr-tpl-cand-dropdown-menu')) {
                return;
            }
        }
        this.isTplCandDropdownOpen = forceState !== null ? forceState : !this.isTplCandDropdownOpen;
        if (this.isTplCandDropdownOpen) {
            this.isMobileCandDropdownOpen = false;
            this.isTplCatDropdownOpen = false;
        }
        this.renderTplCandidateDropdown();
        if (window.lucide) lucide.createIcons();
    }

    renderTplCandidateDropdown() {
        const wrapper = document.getElementById('hr-tpl-cand-dropdown-wrapper');
        if (!wrapper) return;

        const allCandidates = window.hrOnboardingStore.getCandidates();
        const activeCand = allCandidates.find(c => c.id === this.selectedCandidateId);

        wrapper.innerHTML = `
            <button type="button" onclick="window.hrHub.toggleTplCandDropdown(event)"
                class="flex items-center justify-between gap-2 px-3 py-2 bg-white hover:bg-slate-50 rounded-xl border border-slate-200/90 shadow-2xs transition-all active:scale-[0.99] text-left text-xs h-9">
                <div class="flex items-center gap-2 min-w-0">
                    <i data-lucide="user-check" class="w-3.5 h-3.5 text-emerald-600 shrink-0"></i>
                    <span class="font-bold text-slate-800 truncate max-w-[140px] sm:max-w-[200px]">
                        ${activeCand ? this.escapeHtml(activeCand.fullName) : '-- Chọn ứng viên --'}
                    </span>
                </div>
                <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${this.isTplCandDropdownOpen ? 'rotate-180 text-emerald-600' : ''}"></i>
            </button>

            <!-- Dropdown Menu -->
            <div id="hr-tpl-cand-dropdown-menu" class="${this.isTplCandDropdownOpen ? '' : 'hidden'} absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 z-50 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100 max-h-72 overflow-y-auto">
                <div onclick="window.hrHub.handleQuickCandidateSelect(''); window.hrHub.toggleTplCandDropdown(null, false);"
                    class="flex items-center gap-2 p-2 rounded-xl cursor-pointer hover:bg-slate-50 text-xs text-slate-500">
                    <i data-lucide="user-x" class="w-3.5 h-3.5"></i>
                    <span>-- Không chọn (Nhập thủ công) --</span>
                </div>
                ${allCandidates.map(c => {
                    const isSelected = c.id === this.selectedCandidateId;
                    return `
                        <div onclick="window.hrHub.handleQuickCandidateSelect('${c.id}'); window.hrHub.toggleTplCandDropdown(null, false);"
                            class="flex items-center justify-between gap-2 p-2 rounded-xl cursor-pointer transition-all ${
                                isSelected ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-slate-50 text-slate-700 text-xs'
                            }">
                            <div class="min-w-0">
                                <p class="text-xs font-bold truncate">${this.escapeHtml(c.fullName)}</p>
                                <p class="text-[10px] text-slate-400 truncate">${this.escapeHtml(c.role || 'Sales')} • ${this.escapeHtml(window.hrOnboardingStore.formatDateDisplay(c.startDate))}</p>
                            </div>
                            ${isSelected ? `<i data-lucide="check" class="w-3.5 h-3.5 text-emerald-600 shrink-0"></i>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
            <!-- Hidden input fallback for tests / scripts -->
            <input type="hidden" id="hr-tpl-candidate-select" value="${activeCand ? activeCand.id : ''}">
        `;
    }

    toggleQuickVarsExpanded() {
        this.isQuickVarsExpanded = !this.isQuickVarsExpanded;
        const formEl = document.getElementById('hr-quick-vars-form');
        const toggleBtn = document.getElementById('hr-quick-vars-toggle-btn');
        const toggleText = document.getElementById('hr-quick-vars-toggle-text');
        if (formEl) {
            formEl.classList.toggle('hidden', !this.isQuickVarsExpanded);
        }
        if (toggleBtn) {
            if (this.isQuickVarsExpanded) {
                toggleBtn.classList.remove('bg-white', 'text-slate-600', 'border-slate-200/90');
                toggleBtn.classList.add('bg-emerald-100', 'text-emerald-800', 'border-emerald-300');
                toggleBtn.setAttribute('title', 'Đóng tùy chỉnh biến');
            } else {
                toggleBtn.classList.remove('bg-emerald-100', 'text-emerald-800', 'border-emerald-300');
                toggleBtn.classList.add('bg-white', 'text-slate-600', 'border-slate-200/90');
                toggleBtn.setAttribute('title', 'Tùy chỉnh biến điền mẫu');
            }
        }
        if (toggleText) {
            toggleText.textContent = this.isQuickVarsExpanded ? 'Đóng tùy chỉnh biến' : 'Tùy chỉnh biến (7)';
        }
        if (window.lucide) lucide.createIcons();
    }

    renderQuickVarsSummary() {
        const bar = document.getElementById('hr-quick-vars-summary-bar');
        if (bar) bar.innerHTML = '';
    }

    getTemplateCategories() {
        const templates = window.hrOnboardingStore.getTemplates();
        const baseCats = [
            { id: 'all', label: 'Tất cả mẫu tin', icon: 'layers', color: 'indigo' },
            { id: 'preboard', label: 'Dặn dò trước Onboard', icon: 'clock', color: 'amber' },
            { id: 'welcome', label: 'Chào mừng ngày đầu', icon: 'sparkles', color: 'emerald' },
            { id: 'offer', label: 'Thư mời nhận việc (Offer)', icon: 'file-check', color: 'blue' },
            { id: 'interview', label: 'Mời phỏng vấn', icon: 'calendar', color: 'indigo' },
            { id: 'probation', label: 'Đánh giá thử việc', icon: 'award', color: 'violet' },
            { id: 'reject', label: 'Thư từ chối lịch sự', icon: 'x-circle', color: 'rose' }
        ];

        return baseCats.map(cat => {
            const count = cat.id === 'all'
                ? templates.length
                : templates.filter(t => t.category === cat.id).length;
            return { ...cat, count };
        });
    }

    toggleTemplateCategoryDropdown(e, forceState = null) {
        if (e) {
            e.stopPropagation();
            if (e.target && e.target.closest && e.target.closest('#hr-tpl-cat-dropdown-menu')) {
                return;
            }
        }
        this.isTplCatDropdownOpen = forceState !== null ? forceState : !this.isTplCatDropdownOpen;
        if (this.isTplCatDropdownOpen) {
            this.isMobileCandDropdownOpen = false;
            this.isTplCandDropdownOpen = false;
        }
        this.renderTemplateCategoryDropdown();
        if (window.lucide) lucide.createIcons();
    }

    setTemplateCategory(catId) {
        this.templateCategoryFilter = catId || 'all';
        this.isTplCatDropdownOpen = false;
        this.renderTemplateCategoryDropdown();
        this.renderTemplatesListOnly();
        if (window.lucide) lucide.createIcons();
    }

    renderTemplateCategoryDropdown() {
        const wrapper = document.getElementById('hr-tpl-cat-dropdown-wrapper');
        if (!wrapper) return;

        const categories = this.getTemplateCategories();
        const activeCat = categories.find(c => c.id === this.templateCategoryFilter) || categories[0];

        wrapper.innerHTML = `
            <button type="button" onclick="window.hrHub.toggleTemplateCategoryDropdown(event)"
                class="w-full sm:w-auto min-w-[200px] flex items-center justify-between gap-2.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 rounded-xl border border-slate-200/90 shadow-2xs transition-all active:scale-[0.99] text-left text-xs">
                <div class="flex items-center gap-2 min-w-0">
                    <div class="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                        <i data-lucide="${activeCat.icon}" class="w-3.5 h-3.5"></i>
                    </div>
                    <span class="font-bold text-slate-800 truncate">${this.escapeHtml(activeCat.label)}</span>
                    <span class="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                        ${activeCat.count}
                    </span>
                </div>
                <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 shrink-0 transition-transform ${this.isTplCatDropdownOpen ? 'rotate-180 text-emerald-600' : ''}"></i>
            </button>

            <!-- Dropdown Menu -->
            <div id="hr-tpl-cat-dropdown-menu" class="${this.isTplCatDropdownOpen ? '' : 'hidden'} absolute left-0 top-full mt-1.5 z-50 w-72 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100 max-h-72 overflow-y-auto">
                <div class="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Chọn danh mục mẫu
                </div>
                ${categories.map(cat => {
                    const isSelected = cat.id === this.templateCategoryFilter;
                    return `
                        <div onclick="window.hrHub.setTemplateCategory('${cat.id}')"
                            class="flex items-center justify-between gap-2.5 p-2 rounded-xl cursor-pointer transition-all ${
                                isSelected ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-slate-50 text-slate-700 text-xs'
                            }">
                            <div class="flex items-center gap-2 min-w-0">
                                <i data-lucide="${cat.icon}" class="w-3.5 h-3.5 ${isSelected ? 'text-emerald-600' : 'text-slate-400'} shrink-0"></i>
                                <span class="truncate">${this.escapeHtml(cat.label)}</span>
                            </div>
                            <div class="flex items-center gap-1.5 shrink-0">
                                <span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isSelected ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-100 text-slate-500'}">
                                    ${cat.count}
                                </span>
                                ${isSelected ? `<i data-lucide="check" class="w-3.5 h-3.5 text-emerald-600"></i>` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    updateQuickVar(key, val) {
        this.quickVars[key] = val;
        this.renderQuickVarsSummary();
        this.renderTemplatesListOnly();
    }

    handleQuickCandidateSelect(candId) {
        this.selectedCandidateId = candId || null;
        if (!candId) {
            this.quickVars.ten_ung_vien = '';
            this.quickVars.vi_tri = '';
            this.quickVars.ngay_onboard = '';
            this.quickVars.link_onboard = '';
        } else {
            const cand = window.hrOnboardingStore.getCandidates().find(c => c.id === candId);
            if (cand) {
                this.syncQuickVarsFromCandidate(cand);
            }
        }
        this.renderTemplatesTab();
        this.renderCandidatesTab();
    }

    applyVariables(rawText) {
        if (!rawText) return '';
        let out = String(rawText);
        Object.keys(this.quickVars).forEach(k => {
            const val = this.quickVars[k] || `{{${k}}}`;
            const regex = new RegExp(`\\{\\{${k}\\}\\}`, 'g');
            out = out.replace(regex, val);
        });
        return out;
    }

    renderTemplatesTab() {
        this.renderTplCandidateDropdown();
        this.renderQuickVarsSummary();
        this.renderTemplateCategoryDropdown();

        const varFields = ['ten_ung_vien', 'vi_tri', 'ngay_onboard', 'gio_onboard', 'dia_diem', 'nguoi_lien_he', 'sdt_lien_he'];
        varFields.forEach(k => {
            const el = document.getElementById(`hr-var-${k}`);
            if (el && document.activeElement !== el) {
                el.value = this.quickVars[k] || '';
            }
        });

        this.renderTemplatesListOnly();
    }

    renderTemplatesListOnly() {
        const listEl = document.getElementById('hr-templates-list');
        if (!listEl) return;

        const templates = window.hrOnboardingStore.getTemplates();
        const filtered = templates.filter(t => {
            if (this.templateCategoryFilter !== 'all' && t.category !== this.templateCategoryFilter) return false;
            if (this.templateSearch) {
                const q = this.templateSearch.toLowerCase();
                const matchTitle = (t.title || '').toLowerCase().includes(q);
                const matchContent = (t.content || '').toLowerCase().includes(q);
                if (!matchTitle && !matchContent) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            listEl.innerHTML = `<div class="col-span-full p-10 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">Không có mẫu Email / Tin nhắn nào khớp bộ lọc.</div>`;
            return;
        }

        const catBadgeStyles = {
            preboard: { bg: 'bg-amber-50 text-amber-800 border-amber-200/80', icon: 'clock' },
            welcome: { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200/80', icon: 'sparkles' },
            offer: { bg: 'bg-blue-50 text-blue-800 border-blue-200/80', icon: 'file-check' },
            interview: { bg: 'bg-indigo-50 text-indigo-800 border-indigo-200/80', icon: 'calendar' },
            probation: { bg: 'bg-violet-50 text-violet-800 border-violet-200/80', icon: 'award' },
            reject: { bg: 'bg-rose-50 text-rose-800 border-rose-200/80', icon: 'x-circle' }
        };

        listEl.innerHTML = filtered.map((tpl, tIdx) => {
            const resolvedSubject = this.applyVariables(tpl.subject || tpl.title);
            const resolvedContent = this.applyVariables(tpl.content || '');
            const catStyle = catBadgeStyles[tpl.category] || { bg: 'bg-slate-100 text-slate-700 border-slate-200', icon: 'mail' };
            const theme = this.getPastelTheme(tIdx);

            return `
                <div class="${theme.cardBg} rounded-2xl border ${theme.border} shadow-2xs ${theme.glow} p-5 flex flex-col justify-between gap-4 transition-all duration-200 group">
                    <div class="space-y-3">
                        <div class="flex items-start justify-between gap-2">
                            <div>
                                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${theme.badgeBg} shadow-2xs">
                                    <i data-lucide="${catStyle.icon || 'mail'}" class="w-3.5 h-3.5"></i>
                                    <span>${this.escapeHtml(tpl.categoryLabel || 'Mẫu HR')}</span>
                                </span>
                                <h4 class="text-sm sm:text-base font-extrabold text-slate-900 mt-2 group-hover:${theme.kwText} transition-colors">${this.escapeHtml(tpl.title)}</h4>
                            </div>
                            <div class="flex items-center gap-1 shrink-0">
                                <button type="button" onclick="window.hrHub.openTemplateModal('${tpl.id}')"
                                    class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white/80 transition-colors" title="Chỉnh sửa mẫu">
                                    <i data-lucide="edit-3" class="w-4 h-4"></i>
                                </button>
                                <button type="button" onclick="window.hrHub.deleteTemplate('${tpl.id}')"
                                    class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white/80 transition-colors" title="Xóa mẫu">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Tiêu đề Email -->
                        <div class="p-2.5 rounded-xl bg-white/90 border border-slate-200/80 flex items-center justify-between gap-2 shadow-2xs">
                            <div class="min-w-0 flex-1">
                                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Tiêu đề Email / Tin nhắn:</span>
                                <p class="text-xs font-bold text-slate-800 truncate">${this.escapeHtml(resolvedSubject)}</p>
                            </div>
                            <button type="button" onclick="window.hrHub.copyTemplateSubject('${tpl.id}')"
                                class="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold shrink-0 flex items-center gap-1 shadow-2xs active:scale-95 transition-all">
                                <i data-lucide="copy" class="w-3 h-3"></i>
                                <span>Copy tiêu đề</span>
                            </button>
                        </div>

                        <!-- Nội dung đã tự động điền tên -->
                        <div class="p-3.5 rounded-xl bg-white/90 border border-slate-200/80 max-h-60 overflow-y-auto shadow-2xs">
                            <div class="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed select-text font-sans">${this.escapeHtml(resolvedContent)}</div>
                        </div>
                    </div>

                    <div class="pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2">
                        <span class="text-[11px] ${theme.kwText} font-semibold flex items-center gap-1">
                            <i data-lucide="sparkles" class="w-3.5 h-3.5 ${theme.icon}"></i>
                            <span>Tự điền theo biến</span>
                        </span>
                        <button type="button" onclick="window.hrHub.copyTemplateContent('${tpl.id}')"
                            class="px-3.5 py-2 rounded-xl ${theme.btnBg} text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all">
                            <i data-lucide="copy-check" class="w-4 h-4"></i>
                            <span>Sao chép nội dung gửi ngay</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        if (window.lucide) lucide.createIcons();
    }

    copyTemplateSubject(tplId) {
        const tpl = window.hrOnboardingStore.getTemplates().find(t => t.id === tplId);
        if (!tpl) return;
        const text = this.applyVariables(tpl.subject || tpl.title);
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Đã copy Tiêu đề Email!', 'success');
        });
    }

    copyTemplateContent(tplId) {
        const tpl = window.hrOnboardingStore.getTemplates().find(t => t.id === tplId);
        if (!tpl) return;
        const text = this.applyVariables(tpl.content || '');
        navigator.clipboard.writeText(text).then(() => {
            this.showToast(`Đã copy nội dung "${tpl.title}" (đã điền sẵn tên ứng viên)!`, 'success');
        });
    }

    openTemplateModal(tplId = null) {
        const modal = document.getElementById('hr-template-modal');
        if (!modal) return;

        const tpl = tplId ? window.hrOnboardingStore.getTemplates().find(t => t.id === tplId) : null;
        document.getElementById('hr-tpl-id').value = tpl ? tpl.id : '';
        document.getElementById('hr-tpl-modal-title').textContent = tpl ? 'Chỉnh Sửa Mẫu Email / Tin Nhắn HR' : 'Thêm Mẫu Email / Tin Nhắn HR Mới';
        document.getElementById('hr-tpl-title').value = tpl ? (tpl.title || '') : '';
        document.getElementById('hr-tpl-category').value = tpl ? (tpl.category || 'preboard') : 'preboard';
        document.getElementById('hr-tpl-subject').value = tpl ? (tpl.subject || '') : '';
        document.getElementById('hr-tpl-content').value = tpl ? (tpl.content || '') : '';

        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }

    closeTemplateModal() {
        const modal = document.getElementById('hr-template-modal');
        if (modal) modal.classList.add('hidden');
    }

    handleSaveTemplate(e) {
        if (e) e.preventDefault();
        const id = document.getElementById('hr-tpl-id').value.trim();
        const title = document.getElementById('hr-tpl-title').value.trim();
        const category = document.getElementById('hr-tpl-category').value;
        const subject = document.getElementById('hr-tpl-subject').value.trim();
        const content = document.getElementById('hr-tpl-content').value.trim();

        if (!title || !content) {
            alert('Vui lòng nhập Tên mẫu và Nội dung mẫu!');
            return;
        }

        const catLabels = {
            preboard: 'Dặn dò trước Onboard',
            welcome: 'Chào mừng ngày đầu',
            offer: 'Mời nhận việc (Offer)',
            interview: 'Mời phỏng vấn',
            reject: 'Từ chối / Cảm ơn',
            internal: 'Đánh giá & Nội bộ'
        };

        const list = window.hrOnboardingStore.getTemplates();
        let target = id ? list.find(t => t.id === id) : null;
        if (target) {
            target.title = title;
            target.category = category;
            target.categoryLabel = catLabels[category] || 'Mẫu HR';
            target.subject = subject || title;
            target.content = content;
            target.updatedAt = Date.now();
        } else {
            list.unshift({
                id: 'tpl-hr-' + Date.now(),
                title,
                category,
                categoryLabel: catLabels[category] || 'Mẫu HR',
                subject: subject || title,
                content,
                updatedAt: Date.now()
            });
        }

        window.hrOnboardingStore.saveTemplates(list);
        this.closeTemplateModal();
        this.showToast(`Đã lưu mẫu "${title}"!`, 'success');
    }

    deleteTemplate(tplId) {
        const list = window.hrOnboardingStore.getTemplates();
        const target = list.find(t => t.id === tplId);
        if (!target) return;
        if (!confirm(`Bạn có chắc muốn xóa mẫu "${target.title}"?`)) return;

        window.hrOnboardingStore.saveTemplates(list.filter(t => t.id !== tplId));
        this.showToast('Đã xóa mẫu tin nhắn/email.', 'info');
    }

    async resetTemplatesToDefault() {
        if (!confirm('Bạn có chắc muốn khôi phục toàn bộ Mẫu Email/Tin nhắn về bộ mẫu chuẩn chính thức của Etron (Offer Letter ĐẬU, Thư cảm ơn RỚT, Thư mời phỏng vấn, Từ chối CV, Tin nhắn Zalo...)?')) return;
        try {
            await window.hrOnboardingStore.saveTemplates(DEFAULT_HR_TEMPLATES);
            this.renderTemplatesTab();
            this.showToast('Đã khôi phục và đồng bộ toàn bộ Mẫu Email/Tin nhắn chuẩn của Etron lên Cloud!', 'success');
        } catch (e) {
            this.showToast('Chưa lưu được mẫu. Vui lòng kiểm tra kết nối mạng!', 'error');
        }
    }

    // ==========================================
    // 6. TAB 4: SỔ TAY & GHI CHÚ MẬT HR
    // ==========================================
    renderNotesTab() {
        const container = document.getElementById('hr-notes-list');
        if (!container) return;

        const notes = window.hrOnboardingStore.getNotes();
        const q = (this.noteSearch || '').toLowerCase().trim();
        const filtered = notes
            .filter(n => !q || (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q) || (n.category || '').toLowerCase().includes(q))
            .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

        if (filtered.length === 0) {
            container.innerHTML = `<div class="col-span-full p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">Chưa có ghi chú nội bộ HR nào.</div>`;
            return;
        }

        container.innerHTML = filtered.map(note => `
            <div class="bg-white rounded-2xl border ${note.isPinned ? 'border-amber-300 ring-1 ring-amber-400/20' : 'border-slate-200'} shadow-xs p-5 flex flex-col justify-between gap-3">
                <div class="space-y-2.5">
                    <div class="flex items-start justify-between gap-2">
                        <div class="space-y-1">
                            <div class="flex items-center gap-1.5">
                                <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">${this.escapeHtml(note.category || 'Ghi chú HR')}</span>
                                ${note.isPinned ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">⭐ Đã ghim</span>` : ''}
                            </div>
                            <h4 class="text-sm sm:text-base font-extrabold text-slate-900">${this.escapeHtml(note.title)}</h4>
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                            <button type="button" onclick="window.hrHub.openNoteModal('${note.id}')"
                                class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50" title="Sửa ghi chú">
                                <i data-lucide="edit-3" class="w-4 h-4"></i>
                            </button>
                            <button type="button" onclick="window.hrHub.deleteNote('${note.id}')"
                                class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50" title="Xóa ghi chú">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>
                    <div class="p-3.5 rounded-xl bg-amber-50/30 border border-amber-200/60 text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed select-text">${this.escapeHtml(note.content)}</div>
                </div>
                <div class="flex justify-end pt-1">
                    <button type="button" onclick="window.hrHub.copyNoteText('${note.id}')"
                        class="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5">
                        <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                        <span>Copy ghi chú</span>
                    </button>
                </div>
            </div>
        `).join('');

        if (window.lucide) lucide.createIcons();
    }

    openNoteModal(noteId = null) {
        const modal = document.getElementById('hr-note-modal');
        if (!modal) return;
        const note = noteId ? window.hrOnboardingStore.getNotes().find(n => n.id === noteId) : null;

        document.getElementById('hr-note-id').value = note ? note.id : '';
        document.getElementById('hr-note-modal-title').textContent = note ? 'Chỉnh Sửa Ghi Chú Nội Bộ HR' : 'Thêm Ghi Chú / Quy Định Nội Bộ HR';
        document.getElementById('hr-note-title').value = note ? (note.title || '') : '';
        document.getElementById('hr-note-category').value = note ? (note.category || 'Quy trình Onboard') : 'Quy trình Onboard';
        document.getElementById('hr-note-content').value = note ? (note.content || '') : '';
        document.getElementById('hr-note-pinned').checked = note ? !!note.isPinned : false;

        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }

    closeNoteModal() {
        const modal = document.getElementById('hr-note-modal');
        if (modal) modal.classList.add('hidden');
    }

    handleSaveNote(e) {
        if (e) e.preventDefault();
        const id = document.getElementById('hr-note-id').value.trim();
        const title = document.getElementById('hr-note-title').value.trim();
        const category = document.getElementById('hr-note-category').value.trim() || 'Ghi chú HR';
        const content = document.getElementById('hr-note-content').value.trim();
        const isPinned = document.getElementById('hr-note-pinned').checked;

        if (!title || !content) {
            alert('Vui lòng nhập Tiêu đề và Nội dung ghi chú!');
            return;
        }

        const list = window.hrOnboardingStore.getNotes();
        let target = id ? list.find(n => n.id === id) : null;
        if (target) {
            target.title = title;
            target.category = category;
            target.content = content;
            target.isPinned = isPinned;
            target.updatedAt = Date.now();
        } else {
            list.unshift({
                id: 'hr-note-' + Date.now(),
                title,
                category,
                content,
                isPinned,
                updatedAt: Date.now()
            });
        }

        window.hrOnboardingStore.saveNotes(list);
        this.closeNoteModal();
        this.showToast('Đã lưu ghi chú mật HR!', 'success');
    }

    deleteNote(noteId) {
        const list = window.hrOnboardingStore.getNotes();
        const target = list.find(n => n.id === noteId);
        if (!target) return;
        if (!confirm(`Xóa ghi chú "${target.title}"?`)) return;
        window.hrOnboardingStore.saveNotes(list.filter(n => n.id !== noteId));
    }

    copyNoteText(noteId) {
        const note = window.hrOnboardingStore.getNotes().find(n => n.id === noteId);
        if (!note) return;
        navigator.clipboard.writeText(note.content || '').then(() => {
            this.showToast('Đã copy nội dung ghi chú!', 'success');
        });
    }

    // ==========================================
    // 7. MOBILE MODAL SCROLL LOCK & TOAST
    // ==========================================
    setupModalScrollLock() {
        this._lockedScrollY = 0;
        this._isBodyLocked = false;
        const modalSelector = '#hr-candidate-modal, #hr-roadmap-day-modal, #hr-attach-doc-modal, #hr-template-modal, #hr-note-modal, #media-preview-modal';

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
        document.querySelectorAll(modalSelector).forEach(m => {
            observer.observe(m, { attributes: true, attributeFilter: ['class'] });
        });
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `p-3.5 px-4 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2.5 transition-all duration-300 ${
            type === 'error'
                ? 'bg-rose-800 text-white border-rose-700'
                : 'bg-emerald-800 text-white border-emerald-700'
        }`;
        toast.innerHTML = `
            <i data-lucide="${type === 'error' ? 'alert-triangle' : 'check-circle'}" class="w-4 h-4 shrink-0"></i>
            <span>${this.escapeHtml(message)}</span>
        `;
        container.appendChild(toast);
        if (window.lucide) lucide.createIcons();
        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => toast.remove(), 300);
        }, 2800);
    }

    handleQuickDayDateChange(dayId, dateValue) {
        const roadmap = window.hrOnboardingStore.getRoadmap();
        const day = roadmap.find(d => d.id === dayId);
        if (!day) return;
        day.date = dateValue ? dateValue.trim() : '';
        try {
            window.hrOnboardingStore.saveRoadmap(roadmap);
            this.renderRoadmapTab();
            this.showToast(`Đã cập nhật ngày cho ${day.dayNumber}: ${this.formatDayDate(day.date) || 'Chưa chọn'}`, 'info');
        } catch (err) {
            alert('Lỗi cập nhật ngày: ' + err.message);
        }
    }

    handleCandStartDateChange(newDate) {
        if (!newDate || !window.hrOnboardingStore) return;
        const [y, m, d] = newDate.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        if (dt.getDay() === 0 || dt.getDay() === 6) {
            const adjusted = window.hrOnboardingStore.getWorkingDayDate(newDate, 0);
            this.showToast('Lưu ý: ETRON HCM làm việc Thứ 2 – Thứ 6. Ngày bắt đầu được chuyển sang Thứ 2 tiếp theo.', 'info');
            const startEl = document.getElementById('hr-cand-start');
            if (startEl) startEl.value = adjusted;
            newDate = adjusted;
        }
        const deadlineEl = document.getElementById('hr-cand-deadline');
        if (deadlineEl && (!deadlineEl.value || deadlineEl.dataset.autoFilled === 'true')) {
            deadlineEl.value = window.hrOnboardingStore.getWorkingDayDate(newDate, 7);
            deadlineEl.dataset.autoFilled = 'true';
        }
    }

    autoFillCandDeadline() {
        const startVal = document.getElementById('hr-cand-start')?.value;
        if (!startVal) {
            alert('Vui lòng chọn Ngày bắt đầu Onboard trước!');
            return;
        }
        if (window.hrOnboardingStore) {
            const deadline = window.hrOnboardingStore.getWorkingDayDate(startVal, 7);
            const deadlineEl = document.getElementById('hr-cand-deadline');
            if (deadlineEl) {
                deadlineEl.value = deadline;
                deadlineEl.dataset.autoFilled = 'true';
                this.showToast(`Đã tự động tính hạn 8 ngày làm việc (T2–T6): ${this.formatDayDate(deadline)}`, 'info');
            }
        }
    }

    autoFillRoadmapDates(startDateStr = null) {
        if (!startDateStr) {
            const candidates = window.hrOnboardingStore.getCandidates();
            const currentCand = this.selectedCandidateId ? candidates.find(c => c.id === this.selectedCandidateId) : null;
            let defaultDate = currentCand?.startDate || '';
            if (!defaultDate) {
                const today = new Date();
                const dow = today.getDay();
                const daysUntilMon = ((1 + 7 - dow) % 7) || 7;
                const nextMon = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysUntilMon);
                const y = nextMon.getFullYear();
                const m = String(nextMon.getMonth() + 1).padStart(2, '0');
                const d = String(nextMon.getDate()).padStart(2, '0');
                defaultDate = `${y}-${m}-${d}`;
            }

            const promptVal = prompt('Nhập ngày bắt đầu Onboard (YYYY-MM-DD) để tự động điền lịch đào tạo (hệ thống sẽ tự động trừ Thứ 7 & Chủ Nhật):', defaultDate);
            if (!promptVal) return;
            startDateStr = promptVal.trim();
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(startDateStr)) {
            alert('Định dạng ngày không hợp lệ. Vui lòng nhập theo dạng YYYY-MM-DD (VD: 2026-10-19)');
            return;
        }

        const roadmap = window.hrOnboardingStore.getRoadmap();
        const schedule = window.hrOnboardingStore.getWorkingDaysSchedule(startDateStr, roadmap.length);

        roadmap.forEach((day, idx) => {
            day.date = schedule[idx] || '';
        });

        try {
            window.hrOnboardingStore.saveRoadmap(roadmap);
            this.renderRoadmapTab();
            this.showToast(`Đã tự động điền lịch đào tạo ${roadmap.length} ngày (Thứ 2 đến Thứ 6)!`, 'success');
        } catch (err) {
            alert('Lỗi cập nhật lộ trình: ' + err.message);
        }
    }

    clearRoadmapDates() {
        if (!confirm('Bạn có chắc muốn xóa các ngày cố định trong lộ trình? Khi xóa, trang Onboard sẽ tự động tính lịch học linh hoạt theo ngày bắt đầu của từng nhân sự (chỉ tính Thứ 2 đến Thứ 6).')) return;
        const roadmap = window.hrOnboardingStore.getRoadmap();
        roadmap.forEach(day => {
            day.date = '';
        });
        try {
            window.hrOnboardingStore.saveRoadmap(roadmap);
            this.renderRoadmapTab();
            this.showToast('Đã chuyển về chế độ tự động tính ngày theo từng nhân sự.', 'info');
        } catch (err) {
            alert('Lỗi: ' + err.message);
        }
    }

    formatDayDate(dateStr) {
        if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return '';
        const [y, m, d] = dateStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        const dayOfWeek = dayNames[date.getDay()];
        return `${dayOfWeek}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    }

    cleanTaskTitle(title) {
        if (!title) return '';
        return String(title).replace(/^(Module\s*\d+(\.\d+)?[:\s-]*)/i, '').trim();
    }

    cleanMentorNote(note) {
        if (!note) return '';
        return String(note)
            .replace(/^Phụ trách:\s*[^.]*\.\s*/i, '')
            .replace(/^(Lưu ý hỗ trợ cho bạn|Lời nhắn cho nhân sự mới|Lưu ý)\s*:\s*/i, '')
            .trim();
    }

    autoSyncIfOutdated() {
        if (!window.hrAuth?.isHr()) return;
        const store = window.hrOnboardingStore;
        if (!store) return;

        // Auto-upgrade roadmap to 8 days & clean titles if Firestore still holds old/module data
        if (store.ready.has('roadmap')) {
            const roadmap = store.getRoadmap();
            const needsRoadmapUpdate = !Array.isArray(roadmap) || roadmap.length < 8 || roadmap.some(d =>
                (d.tasks || []).some(t => /^Module\s*\d+/i.test(t.title)) ||
                (d.mentorNote && /^Phụ trách:/i.test(d.mentorNote))
            );
            if (needsRoadmapUpdate && !this._roadmapAutoSynced) {
                this._roadmapAutoSynced = true;
                try {
                    const defaultRoadmap = JSON.parse(JSON.stringify(window.DEFAULT_ONBOARDING_ROADMAP));
                    store.saveRoadmap(defaultRoadmap);
                } catch (e) {
                    console.warn('[HrHub] Lỗi tự động đồng bộ roadmap:', e);
                }
            }
        }

        // Auto-upgrade templates to 8 official templates if Firestore holds older set
        if (store.ready.has('templates')) {
            const templates = store.getTemplates();
            const needsTplUpdate = !Array.isArray(templates) || templates.length < 8 || !templates.some(t => t.id === 'tpl-offer-letter-pass');
            if (needsTplUpdate && !this._tplAutoSynced) {
                this._tplAutoSynced = true;
                try {
                    const defaultTemplates = JSON.parse(JSON.stringify(window.DEFAULT_HR_TEMPLATES));
                    store.saveTemplates(defaultTemplates);
                } catch (e) {
                    console.warn('[HrHub] Lỗi tự động đồng bộ templates:', e);
                }
            }
        }
    }

    escapeJs(str) {
        return JSON.stringify(String(str || '')).slice(1, -1).replace(/'/g, "\\'");
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

window.hrHub = new HrHubApp();
document.addEventListener('DOMContentLoaded', () => {
    // Authentication initializes HrHub after role verification.
});
