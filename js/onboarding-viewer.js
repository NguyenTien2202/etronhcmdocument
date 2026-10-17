/**
 * Onboarding Roadmap Viewer (Dành cho Nhân sự mới & Sales)
 * - Chỉ hiển thị Kế hoạch học tập từng ngày và Tài liệu Onboard đính kèm
 * - Cho phép nhân sự mới tích đánh dấu hoàn thành từng bài học và mở xem trực tiếp tài liệu (PDF, Note, Video, Ảnh)
 * - Tuyệt đối KHÔNG chứa thông tin nội bộ của HR
 */

class OnboardingViewer {
    constructor() {
        this.activeDayFilter = 'all';
        this.candidateId = null;
    }

    init() {
        const token = new URLSearchParams(window.location.hash.slice(1)).get('key');
        const legacyId = new URLSearchParams(window.location.search).get('id');
        this.candidateId = token || null;
        this.legacyLink = !!legacyId && !token;

        if (window.hrOnboardingStore) {
            window.hrOnboardingStore.setupCloudSync();
            window.hrOnboardingStore.onChange(() => {
                this.render();
            });
        }
        if (token) {
            try { window.hrOnboardingStore.openPersonalLink(token); }
            catch (_) { window.hrOnboardingStore.personalUnavailable = true; }
        }
        this.render();
    }

    setCandidateId(id) {
        this.candidateId = id;
        this.render();
    }

    setDayFilter(dayId) {
        this.activeDayFilter = dayId;
        this.render();
    }

    async toggleTask(taskId) {
        if (!window.hrOnboardingStore) return;
        try { await window.hrOnboardingStore.toggleTaskProgress(taskId, this.candidateId); }
        catch (_) { window.salesApp?.showNotification('Chưa lưu được tiến độ. Hãy thử lại.', 'error'); }
        this.render();
    }

    handleCustomLink(url, type) {
        if (!url || /^(?:javascript|data|vbscript):/i.test(url.trim())) return;
        // Nếu đang ở trên trang index.html (SalesHub) và link trỏ tới tab nội bộ
        if (url.startsWith('index.html?tab=') && window.salesApp && typeof window.salesApp.switchTab === 'function') {
            const tabId = url.split('tab=')[1];
            if (tabId) {
                window.salesApp.switchTab(tabId);
                return;
            }
        }
        if (url.startsWith('http://') || url.startsWith('https://')) {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            window.location.href = url;
        }
    }

    getBadgeColors(colorName) {
        const map = {
            indigo: {
                bg: 'bg-indigo-50',
                border: 'border-indigo-200',
                text: 'text-indigo-700',
                pill: 'bg-indigo-600 text-white',
                softHeader: 'from-indigo-50/90 to-white'
            },
            blue: {
                bg: 'bg-blue-50',
                border: 'border-blue-200',
                text: 'text-blue-700',
                pill: 'bg-blue-600 text-white',
                softHeader: 'from-blue-50/90 to-white'
            },
            amber: {
                bg: 'bg-amber-50',
                border: 'border-amber-200',
                text: 'text-amber-800',
                pill: 'bg-amber-500 text-white',
                softHeader: 'from-amber-50/90 to-white'
            },
            emerald: {
                bg: 'bg-emerald-50',
                border: 'border-emerald-200',
                text: 'text-emerald-700',
                pill: 'bg-emerald-600 text-white',
                softHeader: 'from-emerald-50/90 to-white'
            },
            violet: {
                bg: 'bg-violet-50',
                border: 'border-violet-200',
                text: 'text-violet-700',
                pill: 'bg-violet-600 text-white',
                softHeader: 'from-violet-50/90 to-white'
            },
            rose: {
                bg: 'bg-rose-50',
                border: 'border-rose-200',
                text: 'text-rose-700',
                pill: 'bg-rose-600 text-white',
                softHeader: 'from-rose-50/90 to-white'
            }
        };
        return map[colorName] || map.indigo;
    }

    getTaskTypeBadge(type) {
        if (type === 'practice') {
            return `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">Thực hành</span>`;
        }
        if (type === 'action') {
            return `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">Hoạt động</span>`;
        }
        return `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">Kiến thức</span>`;
    }

    render() {
        const container = document.getElementById('onboarding-roadmap-viewer-root');
        if (!container || !window.hrOnboardingStore) return;

        if (this.legacyLink || (this.candidateId && !window.hrOnboardingStore.publicCandidate)) {
            container.textContent = this.legacyLink ? 'Liên kết cũ đã ngừng dùng. Vui lòng nhờ HR gửi liên kết cá nhân mới.' :
                (window.hrOnboardingStore.personalUnavailable ? 'Liên kết không hợp lệ hoặc đã được thu hồi. Vui lòng liên hệ HR.' : 'Đang tải lộ trình cá nhân…');
            return;
        }
        const candidate = this.candidateId ? window.hrOnboardingStore.getCandidateById(this.candidateId) : null;
        const roadmap = (candidate && Array.isArray(candidate.customRoadmap) && candidate.customRoadmap.length > 0)
            ? candidate.customRoadmap
            : window.hrOnboardingStore.getRoadmap();

        const progress = window.hrOnboardingStore.getTaskProgress(this.candidateId);
        const learning = window.hrOnboardingStore.getLearningSummary(candidate);
        const allDocs = (window.salesStore && typeof window.salesStore.getDocuments === 'function')
            ? window.salesStore.getDocuments()
            : [];

        // Tính tổng tiến độ
        let totalTasks = 0;
        let completedTasks = 0;
        roadmap.forEach(day => {
            (day.tasks || []).forEach(t => {
                totalTasks++;
                if (progress[t.id]) completedTasks++;
            });
        });
        const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const visibleDays = this.activeDayFilter === 'all'
            ? roadmap
            : roadmap.filter(d => d.id === this.activeDayFilter);

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Banner chào mừng & Tổng quan tiến độ học tập -->
                <div class="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-7 relative overflow-hidden">
                    <!-- Decorative Top Accent Bar -->
                    <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-teal-400 to-emerald-500"></div>

                    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-1">
                        <!-- Cột trái: Thông tin nhân sự & Định hướng -->
                        <div class="space-y-3 max-w-2xl min-w-0">
                            ${candidate ? `
                                <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-extrabold tracking-wide uppercase shadow-2xs">
                                    <i data-lucide="sparkles" class="w-3.5 h-3.5 text-emerald-600"></i>
                                    <span>Lộ Trình Cá Nhân Hóa</span>
                                </div>
                                <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                                    Chào mừng <span class="text-indigo-600">${this.escapeHtml(candidate.fullName)}</span> gia nhập Etron HCM! 🎉
                                </h1>
                                <div class="flex flex-wrap items-center gap-2 pt-0.5">
                                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200/80">
                                        <i data-lucide="briefcase" class="w-3.5 h-3.5 text-indigo-500"></i>
                                        <span>${this.escapeHtml(candidate.role || 'Chuyên viên Kinh doanh')}</span>
                                    </span>
                                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200/80">
                                        <i data-lucide="calendar" class="w-3.5 h-3.5 text-emerald-600"></i>
                                        <span>Bắt đầu: ${window.hrOnboardingStore.formatDateDisplay(candidate.startDate)}</span>
                                    </span>
                                    ${candidate.mentor ? `
                                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200/80">
                                            <i data-lucide="user-check" class="w-3.5 h-3.5 text-amber-600"></i>
                                            <span>Đồng hành: ${this.escapeHtml(candidate.mentor)}</span>
                                        </span>
                                    ` : ''}
                                    ${candidate.targetDate ? `
                                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200/80">
                                            <i data-lucide="clock" class="w-3.5 h-3.5 text-violet-600"></i>
                                            <span>Hạn chót: ${this.escapeHtml(candidate.targetDate)}</span>
                                        </span>
                                    ` : ''}
                                    ${learning.isOverdue ? `
                                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
                                            <i data-lucide="alert-triangle" class="w-3.5 h-3.5 text-rose-600"></i>
                                            <span>Quá hạn</span>
                                        </span>
                                    ` : ''}
                                </div>
                            ` : `
                                <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-[11px] font-extrabold tracking-wide uppercase shadow-2xs">
                                    <i data-lucide="graduation-cap" class="w-3.5 h-3.5 text-indigo-600"></i>
                                    <span>Cổng Đào Tạo Hội Nhập • Etron HCM</span>
                                </div>
                                <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                                    Lộ Trình Onboard & Tài Liệu Đào Tạo Chuẩn
                                </h1>
                                <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                    Chào mừng bạn gia nhập đội ngũ Etron HCM! Dưới đây là kế hoạch học tập từng ngày và các tài liệu quan trọng giúp bạn nhanh chóng làm chủ giải pháp <strong>Adahub CRM</strong> & <strong>Callbot AI Ucall</strong>.
                                </p>
                            `}

                            <!-- Thẻ Ưu tiên tiếp theo -->
                            <div class="flex items-center gap-2.5 p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100/90 text-xs mt-1">
                                <div class="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                                    <i data-lucide="compass" class="w-4 h-4"></i>
                                </div>
                                <div class="min-w-0 flex flex-wrap items-center gap-1.5">
                                    <span class="font-extrabold uppercase tracking-wider text-indigo-700 text-[11px]">Ưu tiên tiếp theo:</span>
                                    <span class="font-semibold text-slate-800">${learning.nextDay ? this.escapeHtml(learning.nextDay.title) : 'Bạn đã xuất sắc hoàn thành tất cả các mục! 🌟'}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Cột phải: Hộp tiến độ đào tạo -->
                        <div class="bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between w-full lg:w-80 shrink-0">
                            <div class="flex items-center justify-between gap-3 mb-3">
                                <div class="flex items-center gap-2.5">
                                    <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-2xs">
                                        <i data-lucide="check-circle-2" class="w-4 h-4"></i>
                                    </div>
                                    <div>
                                        <h3 class="text-xs font-bold text-slate-900">Tiến độ Onboard</h3>
                                        <p class="text-[10px] text-slate-500">Hoàn thành theo từng ngày</p>
                                    </div>
                                </div>
                                <span class="text-base font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 shadow-2xs">${percent}%</span>
                            </div>

                            <!-- Thanh tiến độ -->
                            <div class="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden mb-3">
                                <div class="h-full bg-gradient-to-r from-indigo-600 via-teal-500 to-emerald-500 rounded-full transition-all duration-500 shadow-2xs" style="width: ${percent}%"></div>
                            </div>

                            <!-- Thống kê mục -->
                            <div class="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                                <span class="text-slate-600 font-medium">Đã xong: <strong class="text-slate-900 font-bold">${completedTasks}/${totalTasks}</strong> mục</span>
                                <span class="text-[11px] text-indigo-600 font-semibold flex items-center gap-1">
                                    <i data-lucide="check-square" class="w-3 h-3"></i> Tích để lưu
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Thanh chọn Ngày học (Day Pills) -->
                    <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pt-4 mt-6 border-t border-slate-100">
                        <button type="button" onclick="window.onboardingViewer.setDayFilter('all')"
                            class="px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 active:scale-95 ${
                                this.activeDayFilter === 'all'
                                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/20 border border-indigo-600'
                                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
                            }">
                            <i data-lucide="layers" class="w-3.5 h-3.5"></i>
                            <span>Tất cả (${roadmap.length} ngày)</span>
                        </button>
                        ${roadmap.map(day => {
                            const dayTasks = day.tasks || [];
                            const dayDone = dayTasks.length > 0 && dayTasks.every(t => progress[t.id]);
                            const isActive = this.activeDayFilter === day.id;
                            return `
                                <button type="button" onclick="window.onboardingViewer.setDayFilter('${day.id}')"
                                    class="px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 active:scale-95 ${
                                        isActive
                                            ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/20 border border-indigo-600'
                                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
                                    }">
                                    <span>${this.escapeHtml(day.dayNumber)}</span>
                                    ${dayDone ? `<i data-lucide="check-circle" class="w-3.5 h-3.5 ${isActive ? 'text-emerald-300' : 'text-emerald-600'}"></i>` : ''}
                                </button>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Danh sách Chi tiết từng Ngày Onboard -->
                <div class="space-y-5">
                    ${visibleDays.map(day => {
                        const theme = this.getBadgeColors(day.badgeColor);
                        const dayTasks = day.tasks || [];
                        const doneCount = dayTasks.filter(t => progress[t.id]).length;
                        const attachedDocs = (day.attachedDocIds || [])
                            .map(id => allDocs.find(d => d.id === id))
                            .filter(Boolean);
                        const customLinks = day.customLinks || [];

                        return `
                            <div class="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all hover:border-indigo-200">
                                <!-- Header của Ngày -->
                                <div class="p-4 sm:p-5 bg-gradient-to-r ${theme.softHeader} border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div class="space-y-1">
                                        <div class="flex flex-wrap items-center gap-2">
                                            <span class="px-2.5 py-1 rounded-lg text-xs font-extrabold ${theme.pill} shadow-2xs">
                                                ${this.escapeHtml(day.dayNumber)}
                                            </span>
                                            ${day.duration ? `
                                                <span class="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-white text-slate-600 border border-slate-200 flex items-center gap-1">
                                                    <i data-lucide="clock" class="w-3 h-3 text-slate-400"></i>
                                                    <span>${this.escapeHtml(day.duration)}</span>
                                                </span>
                                            ` : ''}
                                            ${day.trainer ? `
                                                <span class="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-white text-indigo-700 border border-indigo-200 flex items-center gap-1 shadow-2xs">
                                                    <i data-lucide="user-check" class="w-3 h-3 text-indigo-600"></i>
                                                    <span>Phụ trách: ${this.escapeHtml(day.trainer)}</span>
                                                </span>
                                            ` : ''}
                                            <span class="px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${doneCount === dayTasks.length && dayTasks.length > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">
                                                Hoàn thành ${doneCount}/${dayTasks.length}
                                            </span>
                                        </div>
                                        <h3 class="text-base sm:text-lg font-extrabold text-slate-900 pt-0.5">
                                            ${this.escapeHtml(day.title)}
                                        </h3>
                                        ${day.goal ? `
                                            <p class="text-xs text-slate-600 flex items-start gap-1.5 pt-0.5">
                                                <i data-lucide="target" class="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5"></i>
                                                <span><strong>Mục tiêu cần đạt:</strong> ${this.escapeHtml(day.goal)}</span>
                                            </p>
                                        ` : ''}
                                    </div>
                                </div>

                                <!-- Nội dung chính của Ngày -->
                                <div class="p-4 sm:p-5 space-y-4">
                                    <!-- Danh sách đầu việc / bài học -->
                                    <div class="space-y-2">
                                        <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                            <i data-lucide="list-checks" class="w-4 h-4 text-indigo-600"></i>
                                            <span>Nội dung học tập & thực hành trong ngày</span>
                                        </h4>
                                        <div class="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden bg-slate-50/40">
                                            ${dayTasks.map(task => {
                                                const isDone = !!progress[task.id];
                                                return `
                                                    <label class="flex items-start gap-3 p-3 sm:p-3.5 cursor-pointer hover:bg-white transition-colors select-none ${isDone ? 'bg-emerald-50/30' : ''}">
                                                        <input type="checkbox" ${isDone ? 'checked' : ''}
                                                            onchange="window.onboardingViewer.toggleTask('${task.id}')"
                                                            class="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer">
                                                        <div class="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                            <span class="text-xs sm:text-sm font-medium leading-relaxed ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}">
                                                                ${this.escapeHtml(task.title)}
                                                            </span>
                                                            ${this.getTaskTypeBadge(task.type)}
                                                        </div>
                                                    </label>
                                                `;
                                            }).join('')}
                                        </div>
                                    </div>

                                    <!-- Tài liệu đính kèm từ Kho Tài Liệu & Liên kết nhanh -->
                                    ${(attachedDocs.length > 0 || customLinks.length > 0) ? `
                                        <div class="space-y-2.5 pt-1">
                                            <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                                <i data-lucide="book-open" class="w-4 h-4 text-indigo-600"></i>
                                                <span>Tài liệu & Công cụ cần xem trong ngày</span>
                                            </h4>
                                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                ${attachedDocs.map(doc => {
                                                    const badge = window.documentHub ? window.documentHub.getFileBadge(doc.fileType, doc.type) : { bg: 'bg-indigo-50', color: 'text-indigo-700', label: 'DOC' };
                                                    return `
                                                        <div onclick="window.documentHub && window.documentHub.openDocument('${doc.id}')"
                                                            class="flex items-center justify-between gap-3 p-3 rounded-xl bg-indigo-50/40 hover:bg-indigo-50 border border-indigo-200/80 cursor-pointer transition-all group">
                                                            <div class="flex items-center gap-2.5 min-w-0">
                                                                <div class="w-9 h-9 rounded-lg ${badge.bg} ${badge.color} font-bold text-xs flex items-center justify-center shrink-0">
                                                                    ${badge.label}
                                                                </div>
                                                                <div class="min-w-0">
                                                                    <p class="text-xs font-bold text-slate-900 group-hover:text-indigo-700 truncate">${this.escapeHtml(doc.title)}</p>
                                                                    <p class="text-[11px] text-slate-500 truncate">${this.escapeHtml(doc.category || 'Tài liệu đào tạo')}</p>
                                                                </div>
                                                            </div>
                                                            <span class="px-2.5 py-1 rounded-lg bg-white text-indigo-600 border border-indigo-200 text-[11px] font-bold shrink-0 flex items-center gap-1 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                                <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                                                                <span>Mở xem</span>
                                                            </span>
                                                        </div>
                                                    `;
                                                }).join('')}

                                                ${customLinks.map(link => `
                                                    <div onclick="window.onboardingViewer.handleCustomLink('${this.escapeJs(link.url)}', '${this.escapeJs(link.type || '')}')"
                                                        class="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-50/40 hover:bg-emerald-50 border border-emerald-200/80 cursor-pointer transition-all group">
                                                        <div class="flex items-center gap-2.5 min-w-0">
                                                            <div class="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                                                <i data-lucide="compass" class="w-4 h-4"></i>
                                                            </div>
                                                            <div class="min-w-0">
                                                                <p class="text-xs font-bold text-slate-900 group-hover:text-emerald-800 truncate">${this.escapeHtml(link.title)}</p>
                                                                <p class="text-[11px] text-slate-500 truncate">Bấm để mở công cụ / tài liệu</p>
                                                            </div>
                                                        </div>
                                                        <span class="px-2.5 py-1 rounded-lg bg-white text-emerald-700 border border-emerald-200 text-[11px] font-bold shrink-0 flex items-center gap-1 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                                            <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i>
                                                            <span>Truy cập</span>
                                                        </span>
                                                    </div>
                                                `).join('')}
                                            </div>
                                        </div>
                                    ` : ''}

                                    <!-- Lời nhắn hướng dẫn từ Mentor / HR -->
                                    ${day.mentorNote ? `
                                        <div class="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-950">
                                            <i data-lucide="sparkles" class="w-4 h-4 text-amber-600 shrink-0 mt-0.5"></i>
                                            <div class="leading-relaxed">
                                                <strong class="font-bold">Lưu ý hỗ trợ cho bạn:</strong> ${this.escapeHtml(day.mentorNote)}
                                            </div>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        if (window.lucide) lucide.createIcons();
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

window.onboardingViewer = new OnboardingViewer();
