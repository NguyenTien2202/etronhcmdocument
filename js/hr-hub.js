/**
 * Etron HrHub Controller (js/hr-hub.js)
 * Hệ thống Quản trị Nhân sự, Hồ sơ & Checklist Onboard, Thiết kế Lộ trình Onboard & Kho Mẫu Mail/Tin nhắn HR
 * Dành riêng cho HR (Có khóa bảo mật PIN, tách biệt hoàn toàn với trang SalesHub của nhân viên kinh doanh)
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
            vi_tri: 'Chuyên viên Kinh doanh (Sales Executive)',
            ngay_onboard: 'Thứ Hai tuần này',
            gio_onboard: '08:30 sáng',
            dia_diem: 'Văn phòng Etron HCM',
            nguoi_lien_he: 'Bộ phận Nhân sự Etron HCM',
            sdt_lien_he: '09xx.xxx.xxx',
            link_onboard: this.getPublicOnboardUrl()
        };

        this.noteSearch = '';
        this.editingDayId = null;
        this.attachingDayId = null;
        this.docPickerSearch = '';
        this.enteredPin = '';
    }

    getPublicOnboardUrl(candidateId = null) {
        try {
            const url = new URL('onboard.html', window.location.href);
            if (candidateId) {
                url.searchParams.set('id', candidateId);
            }
            return url.href;
        } catch (e) {
            return candidateId
                ? `https://nguyentien2202.github.io/etronhcmdocument/onboard.html?id=${encodeURIComponent(candidateId)}`
                : 'https://nguyentien2202.github.io/etronhcmdocument/onboard.html';
        }
    }

    init() {
        if (window.salesStore) {
            window.salesStore.setupCloudSync();
        }
        if (window.documentHub) {
            window.documentHub.init();
        }
        if (window.hrOnboardingStore) {
            window.hrOnboardingStore.setupCloudSync();
            window.hrOnboardingStore.onChange(() => {
                this.renderAll();
            });
        }

        this.checkLockState();
        this.setupModalScrollLock();

        const candidates = window.hrOnboardingStore.getCandidates();
        if (candidates.length > 0 && !this.selectedCandidateId) {
            this.selectedCandidateId = candidates[0].id;
            this.syncQuickVarsFromCandidate(candidates[0]);
        }

        this.renderAll();

        window.addEventListener('storage', () => {
            this.renderAll();
        });

        if (window.lucide) lucide.createIcons();
    }

    // ==========================================
    // 1. PIN SECURITY LOCK SCREEN
    // ==========================================
    checkLockState() {
        const unlocked = sessionStorage.getItem('etron_hr_unlocked') === 'true';
        const lockScreen = document.getElementById('hr-pin-lock-screen');
        if (!lockScreen) return;
        if (unlocked) {
            lockScreen.classList.add('hidden');
        } else {
            lockScreen.classList.remove('hidden');
            this.enteredPin = '';
            this.updatePinDots();
        }
    }

    pressPinDigit(digit) {
        if (this.enteredPin.length >= 6) return;
        this.enteredPin += String(digit);
        this.updatePinDots();

        const targetPin = window.hrOnboardingStore.getPinCode();
        if (this.enteredPin === targetPin) {
            this.unlockHrHub();
        } else if (this.enteredPin.length >= targetPin.length) {
            const errEl = document.getElementById('hr-pin-error');
            if (errEl) {
                errEl.textContent = 'Mã PIN chưa đúng, vui lòng thử lại!';
                errEl.classList.remove('hidden');
            }
            setTimeout(() => {
                this.enteredPin = '';
                this.updatePinDots();
            }, 450);
        }
    }

    clearPinDigit() {
        this.enteredPin = this.enteredPin.slice(0, -1);
        const errEl = document.getElementById('hr-pin-error');
        if (errEl) errEl.classList.add('hidden');
        this.updatePinDots();
    }

    handlePinFormSubmit(e) {
        if (e) e.preventDefault();
        const input = document.getElementById('hr-pin-direct-input');
        const val = input ? input.value.trim() : this.enteredPin;
        const targetPin = window.hrOnboardingStore.getPinCode();
        if (val === targetPin) {
            if (input) input.value = '';
            this.unlockHrHub();
        } else {
            const errEl = document.getElementById('hr-pin-error');
            if (errEl) {
                errEl.textContent = 'Mã PIN chưa chính xác!';
                errEl.classList.remove('hidden');
            }
        }
    }

    updatePinDots() {
        const targetLen = (window.hrOnboardingStore.getPinCode() || '2202').length;
        const dotsContainer = document.getElementById('hr-pin-dots');
        if (!dotsContainer) return;

        let html = '';
        for (let i = 0; i < targetLen; i++) {
            const filled = i < this.enteredPin.length;
            html += `<div class="w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                filled ? 'bg-emerald-500 scale-110 shadow-sm shadow-emerald-500/50' : 'bg-slate-200 border border-slate-300'
            }"></div>`;
        }
        dotsContainer.innerHTML = html;
    }

    unlockHrHub() {
        sessionStorage.setItem('etron_hr_unlocked', 'true');
        const lockScreen = document.getElementById('hr-pin-lock-screen');
        if (lockScreen) lockScreen.classList.add('hidden');
        this.enteredPin = '';
        this.renderAll();
    }

    lockHrHub() {
        sessionStorage.removeItem('etron_hr_unlocked');
        this.checkLockState();
    }

    openChangePinModal() {
        const currentPin = window.hrOnboardingStore.getPinCode();
        const newPin = prompt('Nhập Mã PIN mới cho trang Etron HrHub (từ 4 đến 6 chữ số):', currentPin);
        if (newPin === null) return;
        const clean = newPin.trim();
        if (!/^\d{4,6}$/.test(clean)) {
            alert('Vui lòng nhập mã PIN gồm 4 đến 6 chữ số!');
            return;
        }
        window.hrOnboardingStore.setPinCode(clean);
        this.showToast(`Đã cập nhật Mã PIN bảo mật HR thành công!`, 'success');
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

    copyCandidateOnboardLink(candidateId) {
        const cand = window.hrOnboardingStore.getCandidates().find(c => c.id === candidateId);
        const link = this.getPublicOnboardUrl(candidateId);
        navigator.clipboard.writeText(link).then(() => {
            this.showToast(`Đã copy link Onboard riêng cho ${cand ? cand.fullName : 'nhân sự'}!`, 'success');
        }).catch(() => {
            prompt(`Copy link Onboard riêng cho ${cand ? cand.fullName : 'nhân sự'}:`, link);
        });
    }

    // ==========================================
    // 3. TAB 1: HỒ SƠ & CHECKLIST NHÂN SỰ MỚI
    // ==========================================
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
        const cand = window.hrOnboardingStore.getCandidates().find(c => c.id === id);
        if (cand) {
            this.syncQuickVarsFromCandidate(cand);
        }
        this.renderCandidatesTab();
        if (window.lucide) lucide.createIcons();
    }

    syncQuickVarsFromCandidate(cand) {
        if (!cand) return;
        this.quickVars.ten_ung_vien = cand.fullName || 'Bạn';
        this.quickVars.vi_tri = cand.role || 'Chuyên viên Kinh doanh (Sales Executive)';
        this.quickVars.ngay_onboard = window.hrOnboardingStore.formatDateDisplay(cand.startDate) || 'Thứ Hai tuần này';
        if (cand.mentor) {
            this.quickVars.nguoi_lien_he = cand.mentor;
        }
        this.quickVars.link_onboard = this.getPublicOnboardUrl(cand.id);
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

        if (!this.selectedCandidateId && allCandidates.length > 0) {
            this.selectedCandidateId = allCandidates[0].id;
        }

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
                            <h4 class="text-xs sm:text-sm font-extrabold text-slate-900 truncate">${this.escapeHtml(c.fullName)}</h4>
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

        // Render Right Detail Panel
        const activeCand = allCandidates.find(c => c.id === this.selectedCandidateId);
        if (!activeCand) {
            detailEl.innerHTML = `
                <div class="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
                    <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                        <i data-lucide="user-plus" class="w-6 h-6"></i>
                    </div>
                    <h3 class="text-sm font-bold text-slate-800">Chọn một hồ sơ nhân sự hoặc Thêm nhân sự mới</h3>
                    <p class="text-xs text-slate-500 max-w-md mx-auto">Quản lý trọn vẹn hồ sơ, giấy tờ hành chính, bàn giao tài khoản và tiến độ thử việc cho từng bạn nhân sự mới.</p>
                    <button type="button" onclick="window.hrHub.openCandidateModal()"
                        class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs">
                        <i data-lucide="plus" class="w-4 h-4"></i>
                        <span>Thêm Hồ Sơ Nhân Sự Mới</span>
                    </button>
                </div>
            `;
            return;
        }

        const statusMeta = this.getStatusMeta(activeCand.status);
        const checklist = activeCand.checklist || [];
        const doneCount = checklist.filter(i => i.done).length;
        const pct = checklist.length > 0 ? Math.round((doneCount / checklist.length) * 100) : 0;

        // Tiến độ tự học riêng của nhân sự này trên Cổng Onboard
        const candLearnProgress = activeCand.taskProgress || {};
        let totalLearn = 0;
        let doneLearn = 0;
        roadmap.forEach(d => (d.tasks || []).forEach(t => {
            totalLearn++;
            if (candLearnProgress[t.id]) doneLearn++;
        }));
        const learnPct = totalLearn > 0 ? Math.round((doneLearn / totalLearn) * 100) : 0;

        const stages = [
            { id: 'preboard', title: '1. Chuẩn bị trước ngày Onboard (Pre-boarding)', icon: 'calendar-check', color: 'amber' },
            { id: 'admin', title: '2. Hồ sơ Hành chính & Pháp lý (CCCD, STK, Hợp đồng)', icon: 'file-check-2', color: 'blue' },
            { id: 'accounts', title: '3. Cấp phát Tài khoản & Công cụ làm việc', icon: 'key-round', color: 'indigo' },
            { id: 'evaluation', title: '4. Theo dõi & Đánh giá quá trình Onboard / Thử việc', icon: 'award', color: 'emerald' }
        ];

        // Format ngày bắt đầu & ngày sinh
        const displayStartDate = window.hrOnboardingStore.formatDateDisplay(activeCand.startDate);
        const activeBdayInfo = upcomingBirthdays.find(u => u.candidate.id === activeCand.id);
        let dobDisplay = 'Chưa cập nhật';
        if (activeCand.dob && /^\d{4}-\d{2}-\d{2}$/.test(activeCand.dob)) {
            const [bYear, bMonth, bDay] = activeCand.dob.split('-');
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

        const candOnboardUrl = this.getPublicOnboardUrl(activeCand.id);

        detailEl.innerHTML = `
            <div class="space-y-5">
                <!-- Thẻ Thông Tin Hồ Sơ Nhân Sự -->
                <div class="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6">
                    <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                        <div class="space-y-1.5">
                            <div class="flex flex-wrap items-center gap-2">
                                <h2 class="text-lg sm:text-xl font-extrabold text-slate-900">${this.escapeHtml(activeCand.fullName)}</h2>
                                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusMeta.bg}">
                                    ${statusMeta.label}
                                </span>
                            </div>
                            <p class="text-xs sm:text-sm font-semibold text-emerald-700 flex items-center gap-1.5">
                                <i data-lucide="briefcase" class="w-4 h-4"></i>
                                <span>${this.escapeHtml(activeCand.role || 'Chuyên viên Kinh doanh')} • ${this.escapeHtml(activeCand.department || 'Etron HCM')}</span>
                            </p>
                        </div>

                        <div class="flex flex-wrap items-center gap-2 shrink-0">
                            <button type="button" onclick="window.hrHub.copyCandidateOnboardLink('${activeCand.id}')"
                                class="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-1.5 shadow-2xs"
                                title="Copy link Cổng Onboard riêng của nhân sự này để gửi cho bạn ấy">
                                <i data-lucide="link" class="w-3.5 h-3.5"></i>
                                <span>Copy Link Onboard</span>
                            </button>
                            <a href="${candOnboardUrl}" target="_blank"
                                class="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all flex items-center gap-1.5"
                                title="Mở xem Cổng Onboard với tư cách nhân sự này">
                                <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                                <span class="hidden sm:inline">Mở Cổng Bạn Ấy</span>
                            </a>
                            <button type="button" onclick="window.hrHub.jumpToTemplatesForCandidate('${activeCand.id}')"
                                class="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center gap-1.5"
                                title="Soạn email hoặc tin nhắn Zalo gửi nhân sự này">
                                <i data-lucide="mail-plus" class="w-3.5 h-3.5"></i>
                                <span class="hidden sm:inline">Mẫu tin</span>
                            </button>
                            <button type="button" onclick="window.hrHub.openCandidateModal('${activeCand.id}')"
                                class="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center gap-1.5">
                                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                                <span>Sửa</span>
                            </button>
                            <button type="button" onclick="window.hrHub.deleteCandidate('${activeCand.id}')"
                                class="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all" title="Xóa hồ sơ">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Lưới thông tin chi tiết -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4 text-xs">
                        <div class="p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <span class="text-[11px] text-slate-400 block mb-0.5">Ngày bắt đầu Onboard</span>
                            <strong class="text-slate-800 font-bold flex items-center gap-1.5">
                                <i data-lucide="calendar" class="w-3.5 h-3.5 text-emerald-600"></i>
                                <span>${this.escapeHtml(displayStartDate)}</span>
                            </strong>
                        </div>
                        <div class="p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <span class="text-[11px] text-slate-400 block mb-0.5">Ngày sinh nhật</span>
                            <strong class="text-slate-800 font-bold flex items-center gap-1.5">
                                <i data-lucide="cake" class="w-3.5 h-3.5 text-pink-500"></i>
                                <span>${dobDisplay}</span>
                            </strong>
                        </div>
                        <div class="p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <span class="text-[11px] text-slate-400 block mb-0.5">Số điện thoại / Zalo</span>
                            <strong class="text-slate-800 font-bold flex items-center gap-1.5">
                                <i data-lucide="phone" class="w-3.5 h-3.5 text-indigo-600"></i>
                                <span>${this.escapeHtml(activeCand.phone || 'Chưa cập nhật')}</span>
                            </strong>
                        </div>
                        <div class="p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <span class="text-[11px] text-slate-400 block mb-0.5">Email cá nhân</span>
                            <strong class="text-slate-800 font-bold truncate block">
                                ${this.escapeHtml(activeCand.email || 'Chưa cập nhật')}
                            </strong>
                        </div>
                        <div class="p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <span class="text-[11px] text-slate-400 block mb-0.5">Người hướng dẫn (Mentor)</span>
                            <strong class="text-slate-800 font-bold truncate block">
                                ${this.escapeHtml(activeCand.mentor || 'Quản lý / HR')}
                            </strong>
                        </div>
                        <div class="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between">
                            <div class="min-w-0 pr-2">
                                <span class="text-[11px] text-emerald-800 font-bold block mb-0.5">Link Onboard riêng:</span>
                                <span class="text-[10px] text-slate-500 font-mono truncate block">${activeCand.fullName} (?id=${activeCand.id})</span>
                            </div>
                            <button type="button" onclick="window.hrHub.copyCandidateOnboardLink('${activeCand.id}')"
                                class="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-2xs" title="Copy link">
                                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Thông tin Tài khoản & Ghi chú Lương/Chính sách (Chỉ HR thấy) -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-xs">
                        <div class="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-start gap-2.5">
                            <i data-lucide="key-round" class="w-4 h-4 text-indigo-600 shrink-0 mt-0.5"></i>
                            <div class="min-w-0 flex-1">
                                <span class="text-[11px] font-bold text-indigo-900 block">Trạng thái Tài khoản (CRM / Callbot / Email):</span>
                                <p class="text-slate-700 mt-0.5 break-words">${this.escapeHtml(activeCand.accountsInfo || 'Chưa ghi chú tài khoản')}</p>
                            </div>
                        </div>
                        <div class="p-3 rounded-xl bg-amber-50/50 border border-amber-100 flex items-start gap-2.5">
                            <i data-lucide="shield-lock" class="w-4 h-4 text-amber-600 shrink-0 mt-0.5"></i>
                            <div class="min-w-0 flex-1">
                                <span class="text-[11px] font-bold text-amber-900 block">Chính sách / Thỏa thuận riêng (Chỉ HR thấy):</span>
                                <p class="text-slate-700 mt-0.5 break-words">${this.escapeHtml(activeCand.salaryNote || 'Chưa có ghi chú thỏa thuận')}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Thanh Tiến độ Checklist HR & Tiến độ tự học của Nhân sự -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
                        <div class="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                            <div class="flex items-center justify-between text-xs mb-1.5">
                                <span class="font-bold text-emerald-950 flex items-center gap-1.5">
                                    <i data-lucide="clipboard-check" class="w-4 h-4 text-emerald-600"></i>
                                    Tiến độ Checklist HR chuẩn bị
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
                                    Tiến độ bạn ấy học trên Cổng Onboard
                                </span>
                                <span class="font-extrabold text-indigo-700">${doneLearn}/${totalLearn} (${learnPct}%)</span>
                            </div>
                            <div class="w-full h-2 bg-indigo-200/70 rounded-full overflow-hidden">
                                <div class="h-full bg-indigo-600 rounded-full transition-all duration-300" style="width: ${learnPct}%"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Checklist Công Việc Onboard Của HR (4 Giai Đoạn) -->
                <div class="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                            <h3 class="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                                <i data-lucide="list-todo" class="w-5 h-5 text-emerald-600"></i>
                                <span>Checklist Quy Trình Onboard & Theo Dõi Nhân Sự (Dành riêng cho HR)</span>
                            </h3>
                            <p class="text-xs text-slate-500 mt-0.5">Tích chọn từng hạng mục khi bạn đã hoàn tất cho nhân sự này. Có thể thêm đầu việc riêng ở từng giai đoạn.</p>
                        </div>
                    </div>

                    <div class="space-y-5">
                        ${stages.map(stage => {
                            const stageItems = checklist.filter(i => i.stage === stage.id);
                            const stageDone = stageItems.filter(i => i.done).length;
                            return `
                                <div class="border border-slate-200/90 rounded-2xl overflow-hidden">
                                    <div class="px-4 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-2">
                                        <div class="flex items-center gap-2">
                                            <i data-lucide="${stage.icon}" class="w-4 h-4 text-emerald-600"></i>
                                            <h4 class="text-xs sm:text-sm font-extrabold text-slate-800">${stage.title}</h4>
                                        </div>
                                        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                            stageDone === stageItems.length && stageItems.length > 0
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : 'bg-white text-slate-600 border border-slate-200'
                                        }">
                                            ${stageDone}/${stageItems.length} hoàn thành
                                        </span>
                                    </div>

                                    <div class="divide-y divide-slate-100 bg-white">
                                        ${stageItems.map(item => `
                                            <div class="flex items-center justify-between gap-2 p-3 hover:bg-slate-50/80 transition-colors group">
                                                <label class="flex items-start gap-3 flex-1 min-w-0 cursor-pointer select-none">
                                                    <input type="checkbox" ${item.done ? 'checked' : ''}
                                                        onchange="window.hrHub.toggleCandidateChecklistItem('${activeCand.id}', '${item.id}')"
                                                        class="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0">
                                                    <span class="text-xs sm:text-sm leading-relaxed ${item.done ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}">
                                                        ${this.escapeHtml(item.title)}
                                                    </span>
                                                </label>
                                                <button type="button" onclick="window.hrHub.deleteCandidateChecklistItem('${activeCand.id}', '${item.id}')"
                                                    class="opacity-70 sm:opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all shrink-0"
                                                    title="Xóa mục này">
                                                    <i data-lucide="x" class="w-3.5 h-3.5"></i>
                                                </button>
                                            </div>
                                        `).join('')}

                                        <!-- Thêm nhanh đầu việc vào giai đoạn -->
                                        <div class="p-2.5 bg-slate-50/50 flex items-center gap-2">
                                            <input type="text" id="new-chk-${stage.id}"
                                                placeholder="+ Thêm mục kiểm tra mới cho giai đoạn này..."
                                                onkeydown="if(event.key==='Enter'){event.preventDefault();window.hrHub.addCandidateChecklistItem('${activeCand.id}', '${stage.id}');}"
                                                class="flex-1 min-w-0 text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500">
                                            <button type="button" onclick="window.hrHub.addCandidateChecklistItem('${activeCand.id}', '${stage.id}')"
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

                <!-- Sổ Ghi Chú & Đánh Giá Mật Của HR Cho Nhân Sự Này -->
                <div class="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-3">
                    <div class="flex items-center justify-between">
                        <h3 class="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                            <i data-lucide="file-lock-2" class="w-4 h-4 text-amber-600"></i>
                            <span>Ghi Chú Đánh Giá Nội Bộ Của HR (Chỉ mình bạn xem)</span>
                        </h3>
                        <button type="button" onclick="window.hrHub.saveCandidatePrivateNote('${activeCand.id}')"
                            class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs flex items-center gap-1.5">
                            <i data-lucide="save" class="w-3.5 h-3.5"></i>
                            <span>Lưu ghi chú</span>
                        </button>
                    </div>
                    <textarea id="hr-cand-private-note" rows="4"
                        placeholder="Ghi chú thái độ làm việc, tiến độ tiếp thu sản phẩm Adahub/Callbot, điểm mạnh/yếu hoặc các lưu ý riêng trong thời gian thử việc..."
                        class="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-slate-200 bg-amber-50/20 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 leading-relaxed">${this.escapeHtml(activeCand.privateNote || '')}</textarea>
                </div>
            </div>
        `;
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
        }
    }

    addCandidateChecklistItem(candId, stageId) {
        const input = document.getElementById(`new-chk-${stageId}`);
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
    }

    deleteCandidateChecklistItem(candId, itemId) {
        const list = window.hrOnboardingStore.getCandidates();
        const cand = list.find(c => c.id === candId);
        if (!cand || !Array.isArray(cand.checklist)) return;
        cand.checklist = cand.checklist.filter(i => i.id !== itemId);
        cand.updatedAt = Date.now();
        window.hrOnboardingStore.saveCandidates(list);
    }

    saveCandidatePrivateNote(candId) {
        const noteEl = document.getElementById('hr-cand-private-note');
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
        this.syncQuickVarsFromCandidate(target);
        window.hrOnboardingStore.saveCandidates(list);
        this.closeCandidateModal();
        this.showToast(`Đã lưu hồ sơ nhân sự "${fullName}"!`, 'success');
    }

    deleteCandidate(candId) {
        const list = window.hrOnboardingStore.getCandidates();
        const target = list.find(c => c.id === candId);
        if (!target) return;
        if (!confirm(`Bạn có chắc muốn xóa hồ sơ nhân sự "${target.fullName}" không?`)) return;

        const nextList = list.filter(c => c.id !== candId);
        this.selectedCandidateId = nextList[0] ? nextList[0].id : null;
        window.hrOnboardingStore.saveCandidates(nextList);
        this.showToast('Đã xóa hồ sơ nhân sự.', 'info');
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

            return `
                <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <!-- Day Header -->
                    <div class="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div class="space-y-1">
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-indigo-600 text-white">
                                    ${this.escapeHtml(day.dayNumber)}
                                </span>
                                <span class="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-white text-slate-600 border border-slate-200">
                                    ${this.escapeHtml(day.duration || '08:30 – 17:30')}
                                </span>
                                <span class="text-[11px] font-semibold text-slate-500">
                                    • ${tasks.length} mục bài học • ${attachedDocs.length} tài liệu đính kèm
                                </span>
                            </div>
                            <h3 class="text-base font-extrabold text-slate-900 pt-0.5">${this.escapeHtml(day.title)}</h3>
                            ${day.goal ? `<p class="text-xs text-slate-600"><strong>Mục tiêu:</strong> ${this.escapeHtml(day.goal)}</p>` : ''}
                        </div>

                        <div class="flex flex-wrap items-center gap-2 shrink-0">
                            <button type="button" onclick="window.hrHub.openAttachDocModal('${day.id}')"
                                class="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all flex items-center gap-1.5">
                                <i data-lucide="paperclip" class="w-3.5 h-3.5"></i>
                                <span>Gắn Tài Liệu (${attachedDocs.length})</span>
                            </button>
                            <button type="button" onclick="window.hrHub.openRoadmapDayModal('${day.id}')"
                                class="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all flex items-center gap-1.5">
                                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                                <span>Sửa nội dung</span>
                            </button>
                            ${roadmap.length > 1 ? `
                                <button type="button" onclick="window.hrHub.deleteRoadmapDay('${day.id}')"
                                    class="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all" title="Xóa ngày này">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Day Body -->
                    <div class="p-4 sm:p-5 space-y-4">
                        <!-- Tasks -->
                        <div class="space-y-1.5">
                            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Các đầu việc / Bài học nhân sự mới sẽ thấy:</span>
                            <ul class="space-y-1.5">
                                ${tasks.map(t => `
                                    <li class="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 bg-slate-50/70 px-3 py-2 rounded-xl border border-slate-100">
                                        <i data-lucide="check-square" class="w-4 h-4 text-indigo-500 shrink-0 mt-0.5"></i>
                                        <span class="flex-1">${this.escapeHtml(t.title)}</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>

                        <!-- Attached Documents from Kho Tài Liệu -->
                        <div class="space-y-2 pt-1">
                            <div class="flex items-center justify-between">
                                <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tài liệu học tập đính kèm trong ngày:</span>
                                <button type="button" onclick="window.hrHub.openAttachDocModal('${day.id}')"
                                    class="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                                    <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>
                                    <span>Chọn từ Kho Tài Liệu</span>
                                </button>
                            </div>

                            ${attachedDocs.length === 0 ? `
                                <div class="p-3 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 flex items-center justify-between">
                                    <span>Chưa gắn file tài liệu cụ thể nào cho ${this.escapeHtml(day.dayNumber)}.</span>
                                    <button type="button" onclick="window.hrHub.openAttachDocModal('${day.id}')" class="text-indigo-600 font-bold hover:underline">Gắn tài liệu ngay</button>
                                </div>
                            ` : `
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    ${attachedDocs.map(doc => {
                                        const badge = window.documentHub ? window.documentHub.getFileBadge(doc.fileType, doc.type) : { bg: 'bg-indigo-50', color: 'text-indigo-700', label: 'DOC' };
                                        return `
                                            <div class="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-indigo-50/40 border border-indigo-200/80">
                                                <div onclick="window.documentHub && window.documentHub.openDocument('${doc.id}')"
                                                    class="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group">
                                                    <div class="w-8 h-8 rounded-lg ${badge.bg} ${badge.color} font-bold text-[11px] flex items-center justify-center shrink-0">
                                                        ${badge.label}
                                                    </div>
                                                    <div class="min-w-0">
                                                        <p class="text-xs font-bold text-slate-800 group-hover:text-indigo-600 truncate">${this.escapeHtml(doc.title)}</p>
                                                        <p class="text-[10px] text-slate-500 truncate">${this.escapeHtml(doc.category || '')} • Bấm để xem thử</p>
                                                    </div>
                                                </div>
                                                <button type="button" onclick="window.hrHub.toggleAttachDocToDay('${day.id}', '${doc.id}')"
                                                    class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0" title="Gỡ tài liệu khỏi ngày này">
                                                    <i data-lucide="x" class="w-3.5 h-3.5"></i>
                                                </button>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            `}
                        </div>

                        ${day.mentorNote ? `
                            <div class="p-3 rounded-xl bg-amber-50/60 border border-amber-200/70 text-xs text-amber-950">
                                <strong>Lời nhắn cho nhân sự mới:</strong> ${this.escapeHtml(day.mentorNote)}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    openRoadmapDayModal(dayId = null) {
        const modal = document.getElementById('hr-roadmap-day-modal');
        if (!modal) return;

        const roadmap = window.hrOnboardingStore.getRoadmap();
        const day = dayId ? roadmap.find(d => d.id === dayId) : null;
        this.editingDayId = day ? day.id : null;

        document.getElementById('hr-day-modal-title').textContent = day ? `Chỉnh Sửa ${day.dayNumber}` : 'Thêm Ngày / Giai Đoạn Onboard Mới';
        document.getElementById('hr-day-number').value = day ? (day.dayNumber || '') : `Ngày ${roadmap.length + 1}`;
        document.getElementById('hr-day-duration').value = day ? (day.duration || '08:30 – 17:30') : '08:30 – 17:30';
        document.getElementById('hr-day-title').value = day ? (day.title || '') : '';
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

        const duration = document.getElementById('hr-day-duration').value.trim();
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
            target.title = title;
            target.duration = duration;
            target.goal = goal;
            target.badgeColor = badgeColor;
            target.mentorNote = mentorNote;
            target.tasks = rawLines.map((line, idx) => {
                const existing = oldTasks[idx];
                return {
                    id: existing ? existing.id : `t-${Date.now()}-${idx}`,
                    title: line,
                    type: existing ? existing.type : (line.toLowerCase().includes('thực hành') ? 'practice' : 'learn')
                };
            });
        } else {
            target = {
                id: 'day-' + Date.now(),
                dayNumber,
                title,
                duration,
                goal,
                badgeColor,
                mentorNote,
                attachedDocIds: [],
                customLinks: [],
                tasks: rawLines.map((line, idx) => ({
                    id: `t-${Date.now()}-${idx}`,
                    title: line,
                    type: line.toLowerCase().includes('thực hành') ? 'practice' : 'learn'
                }))
            };
            roadmap.push(target);
        }

        window.hrOnboardingStore.saveRoadmap(roadmap);
        this.closeRoadmapDayModal();
        this.showToast(`Đã lưu cập nhật "${dayNumber}" lên Cloud (Trang Onboard của nhân sự mới đã tự động cập nhật)!`, 'success');
    }

    deleteRoadmapDay(dayId) {
        const roadmap = window.hrOnboardingStore.getRoadmap();
        const target = roadmap.find(d => d.id === dayId);
        if (!target) return;
        if (!confirm(`Bạn có chắc muốn xóa "${target.dayNumber}: ${target.title}" khỏi lộ trình Onboard?`)) return;

        const next = roadmap.filter(d => d.id !== dayId);
        window.hrOnboardingStore.saveRoadmap(next);
        this.showToast('Đã xóa ngày khỏi lộ trình.', 'info');
    }

    openAttachDocModal(dayId) {
        this.attachingDayId = dayId;
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

        if (subtitleEl) {
            subtitleEl.textContent = `Tích chọn các tài liệu/file từ Kho Tài Liệu để hiển thị trong ${day.dayNumber}: ${day.title}`;
        }

        const attachedSet = new Set(day.attachedDocIds || []);
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

            return `
                <div onclick="window.hrHub.toggleAttachDocToDay('${day.id}', '${doc.id}')"
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
    }

    // ==========================================
    // 5. TAB 3: KHO MẪU EMAIL & TIN NHẮN HR
    // ==========================================
    updateQuickVar(key, val) {
        this.quickVars[key] = val;
        this.renderTemplatesListOnly();
    }

    handleQuickCandidateSelect(candId) {
        if (!candId) return;
        const cand = window.hrOnboardingStore.getCandidates().find(c => c.id === candId);
        if (!cand) return;
        this.syncQuickVarsFromCandidate(cand);
        this.renderTemplatesTab();
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
        const candSelect = document.getElementById('hr-tpl-candidate-select');
        if (candSelect) {
            const candidates = window.hrOnboardingStore.getCandidates();
            candSelect.innerHTML = `<option value="">-- Chọn từ Hồ sơ Nhân sự mới --</option>` +
                candidates.map(c => `<option value="${c.id}" ${c.id === this.selectedCandidateId ? 'selected' : ''}>${this.escapeHtml(c.fullName)} (${this.escapeHtml(c.startDate || '')})</option>`).join('');
        }

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
            listEl.innerHTML = `<div class="col-span-full p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">Không có mẫu Email/Tin nhắn nào khớp bộ lọc.</div>`;
            return;
        }

        listEl.innerHTML = filtered.map(tpl => {
            const resolvedSubject = this.applyVariables(tpl.subject || tpl.title);
            const resolvedContent = this.applyVariables(tpl.content || '');

            return `
                <div class="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between gap-4 hover:border-emerald-300 transition-all">
                    <div class="space-y-3">
                        <div class="flex items-start justify-between gap-2">
                            <div>
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    ${this.escapeHtml(tpl.categoryLabel || 'Mẫu HR')}
                                </span>
                                <h4 class="text-sm sm:text-base font-extrabold text-slate-900 mt-1.5">${this.escapeHtml(tpl.title)}</h4>
                            </div>
                            <div class="flex items-center gap-1 shrink-0">
                                <button type="button" onclick="window.hrHub.openTemplateModal('${tpl.id}')"
                                    class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Chỉnh sửa mẫu">
                                    <i data-lucide="edit-3" class="w-4 h-4"></i>
                                </button>
                                <button type="button" onclick="window.hrHub.deleteTemplate('${tpl.id}')"
                                    class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Xóa mẫu">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Tiêu đề Email -->
                        <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
                            <div class="min-w-0 flex-1">
                                <span class="text-[10px] font-bold uppercase text-slate-400 block">Tiêu đề Email / Chủ đề:</span>
                                <p class="text-xs font-bold text-slate-800 truncate">${this.escapeHtml(resolvedSubject)}</p>
                            </div>
                            <button type="button" onclick="window.hrHub.copyTemplateSubject('${tpl.id}')"
                                class="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold shrink-0 flex items-center gap-1">
                                <i data-lucide="copy" class="w-3 h-3"></i>
                                <span>Copy tiêu đề</span>
                            </button>
                        </div>

                        <!-- Nội dung đã tự động điền tên -->
                        <div class="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 max-h-60 overflow-y-auto">
                            <div class="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed select-text font-sans">${this.escapeHtml(resolvedContent)}</div>
                        </div>
                    </div>

                    <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span class="text-[11px] text-slate-400">Đã tự động điền thông tin ứng viên</span>
                        <button type="button" onclick="window.hrHub.copyTemplateContent('${tpl.id}')"
                            class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all">
                            <i data-lucide="copy-check" class="w-4 h-4"></i>
                            <span>Sao chép Nội dung gửi ngay</span>
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
    window.hrHub.init();
});
