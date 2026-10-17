/**
 * Onboarding Roadmap Viewer (Dành cho Nhân sự mới & Sales)
 * - Chỉ hiển thị Kế hoạch học tập từng ngày và Tài liệu Onboard đính kèm
 * - Cho phép nhân sự mới tích đánh dấu hoàn thành từng bài học và mở xem trực tiếp tài liệu (PDF, Note, Video, Ảnh)
 * - Tuyệt đối KHÔNG chứa thông tin nội bộ của HR
 */

class OnboardingViewer {
    constructor() {
        this.activeDayFilter = null;
        this.userSelectedFilter = false;
        this.candidateId = null;
        this.expandedModules = new Set();
        this.collapsedDays = new Set();
        this.isDayDropdownOpen = false;
        this.pendingFiles = {};
        this.editingSubmissions = new Set();
    }

    handleFileSelect(event, taskId) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        const infoEl = document.getElementById(`sub-file-info-${taskId}`);
        const previewEl = document.getElementById(`sub-preview-${taskId}`);

        // Giới hạn file tối đa 1MB
        if (file.size > 1024 * 1024 && !file.type.startsWith('image/')) {
            alert('File này có dung lượng lớn hơn 1MB. Với file lớn, bạn vui lòng tải lên Google Drive rồi dán link vào ô "Đường link bài làm" ở trên nhé!');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const rawData = e.target.result;
            if (file.type.startsWith('image/')) {
                const img = new Image();
                img.onload = () => {
                    const maxDim = 1200;
                    let width = img.width;
                    let height = img.height;
                    if (width > maxDim || height > maxDim) {
                        if (width > height) {
                            height = Math.round((height * maxDim) / width);
                            width = maxDim;
                        } else {
                            width = Math.round((width * maxDim) / height);
                            height = maxDim;
                        }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const compressedData = canvas.toDataURL('image/jpeg', 0.85);

                    this.pendingFiles[taskId] = {
                        fileName: file.name,
                        fileType: 'image/jpeg',
                        fileData: compressedData
                    };

                    if (infoEl) infoEl.textContent = `Đã chọn: ${file.name} (~${Math.round(compressedData.length * 0.75 / 1024)} KB)`;
                    if (previewEl) {
                        previewEl.innerHTML = `
                            <div class="relative inline-block mt-1">
                                <img src="${compressedData}" class="w-24 h-16 object-cover rounded-xl border border-indigo-200 shadow-2xs">
                                <button type="button" onclick="window.onboardingViewer.removePendingFile('${taskId}')"
                                    class="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] shadow-xs">
                                    <i data-lucide="x" class="w-3 h-3"></i>
                                </button>
                            </div>
                        `;
                        previewEl.classList.remove('hidden');
                        if (window.lucide) lucide.createIcons();
                    }
                };
                img.src = rawData;
            } else {
                this.pendingFiles[taskId] = {
                    fileName: file.name,
                    fileType: file.type || 'application/octet-stream',
                    fileData: rawData
                };
                if (infoEl) infoEl.textContent = `Đã chọn: ${file.name} (${Math.round(file.size / 1024)} KB)`;
                if (previewEl) {
                    previewEl.innerHTML = `
                        <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs mt-1">
                            <i data-lucide="file" class="w-3.5 h-3.5 text-indigo-600"></i>
                            <span class="truncate max-w-[200px]">${this.escapeHtml(file.name)}</span>
                            <button type="button" onclick="window.onboardingViewer.removePendingFile('${taskId}')"
                                class="text-slate-400 hover:text-rose-600">
                                <i data-lucide="x" class="w-3 h-3"></i>
                            </button>
                        </div>
                    `;
                    previewEl.classList.remove('hidden');
                    if (window.lucide) lucide.createIcons();
                }
            }
        };
        reader.readAsDataURL(file);
    }

    removePendingFile(taskId) {
        delete this.pendingFiles[taskId];
        const input = document.getElementById(`sub-file-${taskId}`);
        if (input) input.value = '';
        const infoEl = document.getElementById(`sub-file-info-${taskId}`);
        if (infoEl) infoEl.textContent = 'Hỗ trợ ảnh JPG/PNG, file PDF, Word, Excel... (tối đa 1MB)';
        const previewEl = document.getElementById(`sub-preview-${taskId}`);
        if (previewEl) {
            previewEl.innerHTML = '';
            previewEl.classList.add('hidden');
        }
    }

    async handleSaveSubmission(event, taskId) {
        if (event) event.preventDefault();
        const linkInput = document.getElementById(`sub-link-${taskId}`);
        const noteInput = document.getElementById(`sub-note-${taskId}`);
        const link = linkInput ? linkInput.value.trim() : '';
        const note = noteInput ? noteInput.value.trim() : '';
        const pending = this.pendingFiles[taskId];

        const submissions = (window.hrOnboardingStore && typeof window.hrOnboardingStore.getTaskSubmissions === 'function')
            ? window.hrOnboardingStore.getTaskSubmissions(this.candidateId)
            : {};
        const existingSub = submissions[taskId];

        const fileName = pending ? pending.fileName : (existingSub?.fileName || '');
        const fileData = pending ? pending.fileData : (existingSub?.fileData || '');
        const fileType = pending ? pending.fileType : (existingSub?.fileType || '');

        if (!link && !fileName && !note) {
            alert('Vui lòng cung cấp ít nhất một thông tin: Đường link bài làm, File/Hình ảnh hoặc Ghi chú kết quả!');
            return;
        }

        const payload = {
            link,
            fileName,
            fileData,
            fileType,
            note,
            submittedAt: Date.now()
        };

        try {
            await window.hrOnboardingStore.saveTaskSubmission(taskId, payload, this.candidateId);
            delete this.pendingFiles[taskId];
            this.editingSubmissions.delete(taskId);
            if (window.salesApp?.showNotification) {
                window.salesApp.showNotification('Đã nộp bài tập & báo cáo thành công!', 'success');
            }
            this.render();
        } catch (err) {
            console.error('[OnboardingViewer] Lỗi lưu bài nộp:', err);
            alert('Chưa lưu được bài nộp. Vui lòng thử lại!');
        }
    }

    async deleteSubmission(taskId) {
        if (!confirm('Bạn có chắc muốn xóa bài nộp này không?')) return;
        try {
            await window.hrOnboardingStore.deleteTaskSubmission(taskId, this.candidateId);
            delete this.pendingFiles[taskId];
            this.editingSubmissions.delete(taskId);
            this.render();
        } catch (err) {
            alert('Chưa xóa được bài nộp. Vui lòng thử lại!');
        }
    }

    openEditSubmission(taskId) {
        this.editingSubmissions.add(taskId);
        this.render();
    }

    cancelEditSubmission(taskId) {
        this.editingSubmissions.delete(taskId);
        delete this.pendingFiles[taskId];
        this.render();
    }

    previewSubmissionImage(imageUrl) {
        const modal = document.getElementById('submission-image-modal');
        const img = document.getElementById('submission-image-target');
        const dl = document.getElementById('submission-image-download');
        if (!modal || !img) return;
        img.src = imageUrl;
        if (dl) dl.href = imageUrl;
        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }

    previewSubmissionFile(taskId) {
        const submissions = (window.hrOnboardingStore && typeof window.hrOnboardingStore.getTaskSubmissions === 'function')
            ? window.hrOnboardingStore.getTaskSubmissions(this.candidateId)
            : {};
        const sub = submissions[taskId];
        if (!sub) return;

        const roadmap = this.getRoadmap();
        const allTasks = roadmap.flatMap(d => (d.tasks || []).map(t => ({ day: d, task: t })));
        const match = allTasks.find(x => x.task.id === taskId);
        const taskTitle = match ? match.task.title : taskId;

        if (window.documentHub && typeof window.documentHub.previewFilePayload === 'function') {
            window.documentHub.previewFilePayload({
                ...sub,
                title: taskTitle
            });
        } else if (sub.fileData) {
            this.previewSubmissionImage(sub.fileData);
        }
    }

    toggleDayDropdown(e, forceState = null) {
        if (e) {
            e.stopPropagation();
            if (e.target && e.target.closest && e.target.closest('#onboard-day-dropdown-menu')) {
                return;
            }
        }
        this.isDayDropdownOpen = forceState !== null ? forceState : !this.isDayDropdownOpen;
        const menu = document.getElementById('onboard-day-dropdown-menu');
        const arrow = document.getElementById('onboard-day-dropdown-arrow');
        if (menu) {
            menu.classList.toggle('hidden', !this.isDayDropdownOpen);
        }
        if (arrow) {
            arrow.classList.toggle('rotate-180', this.isDayDropdownOpen);
        }
        if (window.lucide) lucide.createIcons();
    }

    toggleDay(dayId) {
        if (this.collapsedDays.has(dayId)) {
            this.collapsedDays.delete(dayId);
        } else {
            this.collapsedDays.add(dayId);
        }
        const bodyEl = document.getElementById('day-body-' + dayId);
        const iconEl = document.getElementById('day-icon-' + dayId);
        if (bodyEl) {
            const isHidden = this.collapsedDays.has(dayId);
            if (isHidden) {
                bodyEl.classList.add('hidden');
                if (iconEl) iconEl.classList.remove('rotate-180');
            } else {
                bodyEl.classList.remove('hidden');
                if (iconEl) iconEl.classList.add('rotate-180');
            }
            if (window.lucide) lucide.createIcons();
        } else {
            this.render();
        }
    }

    getEffectiveRoadmap(candidate) {
        const liveRoadmap = window.hrOnboardingStore?.getRoadmap() || [];
        // Ưu tiên hiển thị lộ trình chung mới nhất từ Cloud để mọi cập nhật của HR hiển thị ngay lập tức
        if (Array.isArray(liveRoadmap) && liveRoadmap.length > 0) {
            return liveRoadmap;
        }
        if (candidate && Array.isArray(candidate.customRoadmap) && candidate.customRoadmap.length > 0) {
            return candidate.customRoadmap;
        }
        return [];
    }

    toggleAllDays(collapseAll = false) {
        const candidate = this.candidateId ? window.hrOnboardingStore?.getCandidateById(this.candidateId) : null;
        const roadmap = this.getEffectiveRoadmap(candidate);
        if (collapseAll) {
            roadmap.forEach(d => this.collapsedDays.add(d.id));
        } else {
            this.collapsedDays.clear();
        }
        this.render();
    }

    toggleModule(taskId) {
        const bodyEl = document.getElementById('mod-body-' + taskId);
        const iconEl = document.getElementById('mod-icon-' + taskId);
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

        if (typeof document !== 'undefined' && document.addEventListener) {
            document.addEventListener('click', (e) => {
                if (this.isDayDropdownOpen && !e.target.closest('#onboard-day-dropdown-container')) {
                    this.isDayDropdownOpen = false;
                    const menu = document.getElementById('onboard-day-dropdown-menu');
                    if (menu) menu.classList.add('hidden');
                    const arrow = document.getElementById('onboard-day-dropdown-arrow');
                    if (arrow) arrow.classList.remove('rotate-180');
                }
            });
        }

        this.render();
    }

    setCandidateId(id) {
        this.candidateId = id;
        this.render();
    }

    setDayFilter(dayId) {
        this.userSelectedFilter = true;
        this.activeDayFilter = dayId;
        this.isDayDropdownOpen = false;
        this.render();
    }

    getTodayDayId(roadmap, candidate) {
        if (!roadmap || !roadmap.length) return 'all';
        const parts = Object.fromEntries(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(p => [p.type, p.value]));
        const todayStr = `${parts.year}-${parts.month}-${parts.day}`;

        // Lấy ngày ISO chuẩn của từng ngày trong lộ trình
        const daySchedule = roadmap.map((day, idx) => {
            let isoDate = day.date;
            if (!isoDate && candidate?.startDate) {
                if (window.hrOnboardingStore?.getWorkingDayDate) {
                    isoDate = window.hrOnboardingStore.getWorkingDayDate(candidate.startDate, idx);
                }
            }
            return { dayId: day.id, isoDate: isoDate ? String(isoDate).trim() : '' };
        });

        // 1. Kiểm tra xem hôm nay có trùng ngày nào không
        const exactMatch = daySchedule.find(s => s.isoDate === todayStr);
        if (exactMatch) return exactMatch.dayId;

        // 2. Nếu hôm nay trước ngày bắt đầu lộ trình, mặc định chọn 'all' (Tất cả)
        const firstDayWithDate = daySchedule.find(s => s.isoDate);
        if (firstDayWithDate && todayStr < firstDayWithDate.isoDate) {
            return 'all';
        }
        if (candidate?.startDate && todayStr < candidate.startDate) {
            return 'all';
        }

        // 3. Nếu hôm nay rơi vào giữa lộ trình (ví dụ Thứ 7 hoặc CN), dời đến ngày làm việc kế tiếp
        const upcomingDay = daySchedule.find(s => s.isoDate && s.isoDate > todayStr);
        if (upcomingDay) return upcomingDay.dayId;

        // 4. Nếu đã qua hết ngày học, ưu tiên ngày có nội dung chưa hoàn thành
        const progress = candidate?.taskProgress || window.hrOnboardingStore?.personalProgress || {};
        const incompleteDay = roadmap.find(day => (day.tasks || []).some(t => !progress[t.id]));
        if (incompleteDay) return incompleteDay.id;

        return roadmap[roadmap.length - 1]?.id || 'all';
    }

    async toggleTask(taskId) {
        if (!window.hrOnboardingStore) return;
        try { await window.hrOnboardingStore.toggleTaskProgress(taskId, this.candidateId); }
        catch (_) { window.salesApp?.showNotification('Chưa lưu được tiến độ. Hãy thử lại.', 'error'); }
        this.render();
    }

    handleCustomLink(url, type, docId = null) {
        if (!url && !docId) return;
        if (url && /^(?:javascript|data|vbscript):/i.test(url.trim())) return;
        const targetDocId = docId || (url && url.includes('doc=') ? url.split('doc=')[1].split('&')[0] : null);
        if (targetDocId && window.documentHub && typeof window.documentHub.openDocument === 'function') {
            window.documentHub.openDocument(targetDocId);
            return;
        }
        // Nếu đang ở trên trang index.html (SalesHub) và link trỏ tới tab nội bộ
        if (url && url.startsWith('index.html?tab=') && window.salesApp && typeof window.salesApp.switchTab === 'function') {
            const tabId = url.split('tab=')[1];
            if (tabId) {
                window.salesApp.switchTab(tabId);
                return;
            }
        }
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else if (url) {
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

    getPastelTheme(index) {
        const themes = [
            {
                name: 'indigo',
                cardBg: 'bg-gradient-to-br from-indigo-50/80 via-blue-50/30 to-white',
                headerBg: 'bg-indigo-50/50',
                border: 'border-indigo-200/90 hover:border-indigo-400',
                glow: 'hover:shadow-md hover:shadow-indigo-100/60',
                pill: 'bg-indigo-600 text-white',
                tagBg: 'bg-indigo-50 text-indigo-700 border border-indigo-200/80',
                icon: 'text-indigo-600',
                kwText: 'text-indigo-900'
            },
            {
                name: 'emerald',
                cardBg: 'bg-gradient-to-br from-emerald-50/80 via-teal-50/30 to-white',
                headerBg: 'bg-emerald-50/50',
                border: 'border-emerald-200/90 hover:border-emerald-400',
                glow: 'hover:shadow-md hover:shadow-emerald-100/60',
                pill: 'bg-emerald-600 text-white',
                tagBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
                icon: 'text-emerald-600',
                kwText: 'text-emerald-900'
            },
            {
                name: 'purple',
                cardBg: 'bg-gradient-to-br from-purple-50/80 via-fuchsia-50/30 to-white',
                headerBg: 'bg-purple-50/50',
                border: 'border-purple-200/90 hover:border-purple-400',
                glow: 'hover:shadow-md hover:shadow-purple-100/60',
                pill: 'bg-purple-600 text-white',
                tagBg: 'bg-purple-50 text-purple-700 border border-purple-200/80',
                icon: 'text-purple-600',
                kwText: 'text-purple-900'
            },
            {
                name: 'amber',
                cardBg: 'bg-gradient-to-br from-amber-50/80 via-orange-50/30 to-white',
                headerBg: 'bg-amber-50/50',
                border: 'border-amber-200/90 hover:border-amber-400',
                glow: 'hover:shadow-md hover:shadow-amber-100/60',
                pill: 'bg-amber-600 text-white',
                tagBg: 'bg-amber-50 text-amber-800 border border-amber-200/80',
                icon: 'text-amber-600',
                kwText: 'text-amber-900'
            },
            {
                name: 'rose',
                cardBg: 'bg-gradient-to-br from-rose-50/80 via-pink-50/30 to-white',
                headerBg: 'bg-rose-50/50',
                border: 'border-rose-200/90 hover:border-rose-400',
                glow: 'hover:shadow-md hover:shadow-rose-100/60',
                pill: 'bg-rose-600 text-white',
                tagBg: 'bg-rose-50 text-rose-700 border border-rose-200/80',
                icon: 'text-rose-600',
                kwText: 'text-rose-900'
            },
            {
                name: 'sky',
                cardBg: 'bg-gradient-to-br from-sky-50/80 via-cyan-50/30 to-white',
                headerBg: 'bg-sky-50/50',
                border: 'border-sky-200/90 hover:border-sky-400',
                glow: 'hover:shadow-md hover:shadow-sky-100/60',
                pill: 'bg-sky-600 text-white',
                tagBg: 'bg-sky-50 text-sky-700 border border-sky-200/80',
                icon: 'text-sky-600',
                kwText: 'text-sky-900'
            },
            {
                name: 'teal',
                cardBg: 'bg-gradient-to-br from-teal-50/80 via-emerald-50/30 to-white',
                headerBg: 'bg-teal-50/50',
                border: 'border-teal-200/90 hover:border-teal-400',
                glow: 'hover:shadow-md hover:shadow-teal-100/60',
                pill: 'bg-teal-600 text-white',
                tagBg: 'bg-teal-50 text-teal-700 border border-teal-200/80',
                icon: 'text-teal-600',
                kwText: 'text-teal-900'
            },
            {
                name: 'blue',
                cardBg: 'bg-gradient-to-br from-blue-50/80 via-indigo-50/30 to-white',
                headerBg: 'bg-blue-50/50',
                border: 'border-blue-200/90 hover:border-blue-400',
                glow: 'hover:shadow-md hover:shadow-blue-100/60',
                pill: 'bg-blue-600 text-white',
                tagBg: 'bg-blue-50 text-blue-700 border border-blue-200/80',
                icon: 'text-blue-600',
                kwText: 'text-blue-900'
            }
        ];
        return themes[Math.abs(index) % themes.length];
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
        const roadmap = this.getEffectiveRoadmap(candidate);

        const progress = window.hrOnboardingStore.getTaskProgress(this.candidateId);
        const submissions = (window.hrOnboardingStore && typeof window.hrOnboardingStore.getTaskSubmissions === 'function')
            ? window.hrOnboardingStore.getTaskSubmissions(this.candidateId)
            : {};
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

        const parts = Object.fromEntries(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(p => [p.type, p.value]));
        const todayStr = `${parts.year}-${parts.month}-${parts.day}`;
        const daySchedule = roadmap.map((day, idx) => {
            let isoDate = day.date;
            if (!isoDate && candidate?.startDate) {
                if (window.hrOnboardingStore?.getWorkingDayDate) {
                    isoDate = window.hrOnboardingStore.getWorkingDayDate(candidate.startDate, idx);
                }
            }
            return { dayId: day.id, isoDate: isoDate ? String(isoDate).trim() : '' };
        });
        // Chỉ ngày trùng khớp chính xác 100% với hôm nay mới được hiện chữ "Hôm nay"
        const exactMatch = daySchedule.find(s => s.isoDate === todayStr);
        const exactTodayDayId = exactMatch ? exactMatch.dayId : null;

        const todayDayId = this.getTodayDayId(roadmap, candidate);
        if (!this.userSelectedFilter || !this.activeDayFilter) {
            this.activeDayFilter = todayDayId;
        }

        const visibleDays = this.activeDayFilter === 'all'
            ? roadmap
            : roadmap.filter(d => d.id === this.activeDayFilter);

        const selectedDay = roadmap.find(d => d.id === this.activeDayFilter);
        const selectedDayLabel = this.activeDayFilter === 'all'
            ? `Tất cả lộ trình (${roadmap.length} ngày)`
            : (selectedDay ? `${selectedDay.dayNumber}: ${this.cleanTaskTitle(selectedDay.title)}` : `Tất cả (${roadmap.length} ngày)`);
        const isSelectedDayToday = selectedDay && exactTodayDayId === selectedDay.id;

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Banner chào mừng & Tổng quan tiến độ học tập (Giữ kích cỡ chữ chuẩn, thoải mái, rõ ràng) -->
                <div class="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-7 relative">
                    <!-- Top Accent Bar -->
                    <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-teal-400 to-emerald-500 rounded-t-3xl"></div>

                    <div class="space-y-4 pt-1">
                        <!-- Cột thông tin nhân sự -->
                        <div class="space-y-2.5">
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
                            `}
                        </div>

                        <!-- Tiến độ đào tạo -->
                        <div class="space-y-1.5 pt-1">
                            <div class="flex items-center justify-between text-xs font-bold">
                                <span class="text-slate-600">Tiến độ hoàn thành</span>
                                <span class="text-indigo-600 font-extrabold">${percent}% <span class="text-slate-400 font-normal">(${completedTasks}/${totalTasks} bài)</span></span>
                            </div>
                            <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
                                <div class="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500" style="width: ${percent}%"></div>
                            </div>
                        </div>

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
                </div>

                <!-- Toolbar Lọc Ngày & Nút Thu Gọn Tất Cả (Nằm độc lập, không bị cắt dropdown) -->
                <div class="flex items-center justify-between gap-2.5 relative z-30">
                    <!-- Custom Day Filter Dropdown -->
                    <div id="onboard-day-dropdown-container" class="relative flex-1 min-w-0">
                        <button type="button" onclick="window.onboardingViewer.toggleDayDropdown(event)"
                            class="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 shadow-xs text-xs sm:text-sm font-bold text-slate-800 transition-all active:scale-[0.99] text-left">
                            <div class="flex items-center gap-2.5 min-w-0 flex-1 truncate">
                                <i data-lucide="${this.activeDayFilter === 'all' ? 'layers' : 'calendar'}" class="w-4 h-4 text-indigo-600 shrink-0"></i>
                                <span class="truncate">${this.escapeHtml(selectedDayLabel)}</span>
                                ${isSelectedDayToday ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">Hôm nay</span>` : ''}
                            </div>
                            <i id="onboard-day-dropdown-arrow" data-lucide="chevron-down" class="w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${this.isDayDropdownOpen ? 'rotate-180 text-indigo-600' : ''}"></i>
                        </button>

                        <!-- Dropdown Menu -->
                        <div id="onboard-day-dropdown-menu" class="${this.isDayDropdownOpen ? '' : 'hidden'} absolute left-0 right-0 top-full mt-2 z-50 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100 max-h-80 overflow-y-auto">
                            <div onclick="window.onboardingViewer.setDayFilter('all')"
                                class="flex items-center justify-between gap-2 p-2.5 rounded-xl cursor-pointer transition-all ${this.activeDayFilter === 'all' ? 'bg-indigo-50 text-indigo-900 font-extrabold' : 'hover:bg-slate-50 text-slate-700 font-medium'}">
                                <div class="flex items-center gap-2.5 min-w-0">
                                    <i data-lucide="layers" class="w-4 h-4 ${this.activeDayFilter === 'all' ? 'text-indigo-600' : 'text-slate-400'} shrink-0"></i>
                                    <span class="text-xs sm:text-sm truncate">Tất cả (${roadmap.length} ngày)</span>
                                </div>
                                ${this.activeDayFilter === 'all' ? `<i data-lucide="check" class="w-4 h-4 text-indigo-600 shrink-0"></i>` : ''}
                            </div>

                            ${roadmap.map(day => {
                                const dayTasks = day.tasks || [];
                                const dayDone = dayTasks.length > 0 && dayTasks.every(t => progress[t.id]);
                                const isSelected = this.activeDayFilter === day.id;
                                const isToday = exactTodayDayId === day.id;
                                return `
                                    <div onclick="window.onboardingViewer.setDayFilter('${day.id}')"
                                        class="flex items-center justify-between gap-2 p-2.5 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-indigo-50 text-indigo-900 font-extrabold' : 'hover:bg-slate-50 text-slate-700 font-medium'}">
                                        <div class="flex items-center gap-2.5 min-w-0 flex-1 truncate">
                                            <span class="px-2 py-0.5 rounded text-[11px] font-bold ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'} shrink-0">${this.escapeHtml(day.dayNumber)}</span>
                                            <span class="text-xs sm:text-sm truncate">${this.escapeHtml(this.cleanTaskTitle(day.title))}</span>
                                            ${isToday ? `<span class="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">Hôm nay</span>` : ''}
                                        </div>
                                        <div class="flex items-center gap-1.5 shrink-0">
                                            ${dayDone ? `<i data-lucide="check-circle" class="w-4 h-4 text-emerald-600"></i>` : ''}
                                            ${isSelected ? `<i data-lucide="check" class="w-4 h-4 text-indigo-600"></i>` : ''}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- Icon-only Toggle All Days Button -->
                    <button type="button" onclick="window.onboardingViewer.toggleAllDays(${this.collapsedDays.size === 0})"
                        class="h-11 w-11 rounded-2xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-600 hover:text-indigo-600 shadow-xs transition-all active:scale-95 shrink-0 flex items-center justify-center"
                        title="${this.collapsedDays.size === 0 ? 'Thu gọn tất cả các ngày' : 'Mở rộng tất cả các ngày'}"
                        aria-label="${this.collapsedDays.size === 0 ? 'Thu gọn tất cả các ngày' : 'Mở rộng tất cả các ngày'}">
                        <i data-lucide="${this.collapsedDays.size === 0 ? 'fold-vertical' : 'unfold-vertical'}" class="w-4 h-4 sm:w-5 sm:h-5"></i>
                    </button>
                </div>

                <!-- Danh sách Chi tiết từng Ngày Onboard -->
                <div class="space-y-5">
                    ${visibleDays.map((day, dIdx) => {
                        const originalDayIndex = roadmap.findIndex(d => d.id === day.id);
                        const theme = this.getPastelTheme(originalDayIndex >= 0 ? originalDayIndex : dIdx);
                        const dayTasks = day.tasks || [];
                        const doneCount = dayTasks.filter(t => progress[t.id]).length;
                        const attachedDocs = (day.attachedDocIds || [])
                            .map(id => allDocs.find(d => d.id === id))
                            .filter(Boolean);
                        const customLinks = day.customLinks || [];
                        const formattedDayDate = this.getFormattedDayDate(day, originalDayIndex >= 0 ? originalDayIndex : dIdx, candidate);
                        const isCollapsed = this.collapsedDays.has(day.id);

                        return `
                            <div class="${theme.cardBg} rounded-2xl border ${theme.border} shadow-2xs ${theme.glow} overflow-hidden transition-all duration-200">
                                <!-- Header của Ngày (Click để xổ xuống / thu gọn) -->
                                <div class="p-4 sm:p-5 ${theme.headerBg} border-b border-slate-200/70 flex items-center justify-between gap-3 cursor-pointer select-none"
                                    onclick="window.onboardingViewer.toggleDay('${day.id}')">
                                    <div class="space-y-1 min-w-0 flex-1">
                                        <div class="flex flex-wrap items-center gap-2">
                                            <span class="px-2.5 py-1 rounded-lg text-xs font-extrabold ${theme.pill} shadow-xs">
                                                ${this.escapeHtml(day.dayNumber)}
                                            </span>
                                            ${formattedDayDate ? `
                                                <span class="px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${theme.tagBg} flex items-center gap-1 shadow-2xs">
                                                    <i data-lucide="calendar" class="w-3.5 h-3.5 ${theme.icon}"></i>
                                                    <span>${formattedDayDate}</span>
                                                </span>
                                            ` : ''}
                                            ${day.trainer ? `
                                                <span class="px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${theme.tagBg} flex items-center gap-1 shadow-2xs">
                                                    <i data-lucide="user-check" class="w-3 h-3 ${theme.icon}"></i>
                                                    <span>Phụ trách: ${this.escapeHtml(day.trainer)}</span>
                                                </span>
                                            ` : ''}
                                            <span class="px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${doneCount === dayTasks.length && dayTasks.length > 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-white/80 text-slate-600 border border-slate-200'}">
                                                Hoàn thành ${doneCount}/${dayTasks.length}
                                            </span>
                                        </div>
                                        <h3 class="text-base sm:text-lg font-extrabold text-slate-900 pt-0.5 truncate sm:whitespace-normal group-hover:${theme.kwText} transition-colors">
                                            ${this.escapeHtml(this.cleanTaskTitle(day.title))}
                                        </h3>
                                        ${day.goal ? `
                                            <p class="text-xs text-slate-600 flex items-start gap-1.5 pt-0.5">
                                                <i data-lucide="target" class="w-3.5 h-3.5 ${theme.icon} shrink-0 mt-0.5"></i>
                                                <span><strong>Mục tiêu cần đạt:</strong> ${this.escapeHtml(day.goal)}</span>
                                            </p>
                                        ` : ''}
                                    </div>
                                    <div class="flex items-center gap-1.5 shrink-0 pl-2">
                                        <button type="button" aria-label="Thu gọn hoặc mở rộng ngày" id="day-icon-${day.id}"
                                            class="p-2 rounded-xl bg-white/90 hover:bg-white text-slate-500 hover:text-indigo-600 transition-transform duration-200 shadow-2xs border border-slate-200/80 ${isCollapsed ? '' : 'rotate-180'}">
                                            <i data-lucide="chevron-down" class="w-4 h-4"></i>
                                        </button>
                                    </div>
                                </div>

                                <!-- Nội dung chính của Ngày: Collapsible -->
                                <div id="day-body-${day.id}" class="${isCollapsed ? 'hidden' : ''} p-4 sm:p-5 space-y-4 bg-white/60">
                                    <!-- Danh sách nội dung đào tạo (Click để xổ xuống xem chi tiết & link) -->
                                    <div class="space-y-2.5">
                                        <div class="flex items-center justify-between">
                                            <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                                <i data-lucide="layers" class="w-4 h-4 text-indigo-600"></i>
                                                <span>Nội dung học tập & thực hành trong ngày (${dayTasks.length} mục)</span>
                                            </h4>
                                            <span class="text-[11px] text-slate-400">Bấm từng mục để xem chi tiết & tài liệu</span>
                                        </div>
                                        <div class="space-y-2">
                                            ${dayTasks.map(task => {
                                                const isDone = !!progress[task.id];
                                                const isExpanded = this.expandedModules.has(task.id);
                                                const taskLinks = task.links || [];
                                                const needsSubmission = !!(task.requiresSubmission || task.type === 'practice');
                                                const submission = submissions[task.id];
                                                const hasSubmission = !!submission;
                                                const isEditingSub = this.editingSubmissions.has(task.id);

                                                return `
                                                    <div class="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-2xs transition-all hover:border-indigo-300">
                                                        <!-- Header Row -->
                                                        <div class="p-3 sm:p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none bg-white hover:bg-slate-50/70 transition-colors ${isDone ? 'bg-emerald-50/20' : ''}"
                                                            onclick="window.onboardingViewer.toggleModule('${task.id}')">
                                                            <div class="flex items-center gap-3 min-w-0 flex-1">
                                                                <input type="checkbox" ${isDone ? 'checked' : ''}
                                                                    onclick="event.stopPropagation();"
                                                                    onchange="window.onboardingViewer.toggleTask('${task.id}')"
                                                                    class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer">
                                                                <span class="text-xs sm:text-sm font-extrabold text-slate-800 truncate ${isDone ? 'line-through text-slate-400 font-medium' : ''}">
                                                                    ${this.escapeHtml(this.cleanTaskTitle(task.title))}
                                                                </span>
                                                            </div>
                                                            <div class="flex items-center gap-2 shrink-0">
                                                                ${needsSubmission ? (hasSubmission ? `
                                                                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                        <i data-lucide="check-circle" class="w-3 h-3 text-emerald-600"></i>
                                                                        <span>Đã nộp</span>
                                                                    </span>
                                                                ` : `
                                                                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                                                        <i data-lucide="upload" class="w-3 h-3 text-amber-600"></i>
                                                                        <span>Nộp bài</span>
                                                                    </span>
                                                                `) : ''}
                                                                ${taskLinks.length > 0 ? `
                                                                    <span class="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                                        <i data-lucide="paperclip" class="w-3 h-3 text-indigo-500"></i>
                                                                        <span>${taskLinks.length} tài liệu</span>
                                                                    </span>
                                                                ` : ''}
                                                                ${this.getTaskTypeBadge(task.type)}
                                                                <button type="button" aria-label="Xổ xuống xem chi tiết" id="mod-icon-${task.id}"
                                                                    class="p-1 rounded-lg text-slate-400 hover:text-indigo-600 transition-transform ${isExpanded ? 'rotate-180 text-indigo-600' : ''}">
                                                                    <i data-lucide="chevron-down" class="w-4 h-4"></i>
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <!-- Module Dropdown Details (xổ xuống) -->
                                                        <div id="mod-body-${task.id}" class="${isExpanded ? '' : 'hidden'} border-t border-slate-100 bg-slate-50/60 p-3.5 sm:p-4 space-y-3">
                                                            ${task.activity ? `
                                                                <div class="space-y-1">
                                                                    <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                                                        <i data-lucide="sparkles" class="w-3.5 h-3.5 text-amber-500"></i>
                                                                        <span>Hoạt động & Nội dung đào tạo</span>
                                                                    </span>
                                                                    <p class="text-xs sm:text-sm text-slate-700 leading-relaxed pl-5">${this.escapeHtml(task.activity)}</p>
                                                                </div>
                                                            ` : ''}

                                                            ${task.outcome ? `
                                                                <div class="space-y-1">
                                                                    <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                                                        <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-600"></i>
                                                                        <span>Kết quả cần đạt được</span>
                                                                    </span>
                                                                    <p class="text-xs sm:text-sm text-slate-700 leading-relaxed pl-5">${this.escapeHtml(task.outcome)}</p>
                                                                </div>
                                                            ` : ''}

                                                            ${taskLinks.length > 0 ? `
                                                                <div class="space-y-1.5 pt-1">
                                                                    <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                                                        <i data-lucide="link-2" class="w-3.5 h-3.5 text-indigo-600"></i>
                                                                        <span>Tài liệu & Liên kết học tập (${taskLinks.length})</span>
                                                                    </span>
                                                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-5">
                                                                        ${taskLinks.map(link => `
                                                                            <div onclick="window.onboardingViewer.handleCustomLink('${this.escapeJs(link.url)}', '${this.escapeJs(link.type || '')}', '${this.escapeJs(link.docId || '')}')"
                                                                                class="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-white hover:bg-indigo-50/70 border border-slate-200/90 hover:border-indigo-300 transition-all cursor-pointer group shadow-2xs">
                                                                                <div class="flex items-center gap-2 min-w-0">
                                                                                    <i data-lucide="${link.type === 'internal' ? 'folder' : 'external-link'}" class="w-4 h-4 text-indigo-500 shrink-0"></i>
                                                                                    <div class="min-w-0">
                                                                                        <p class="text-xs font-bold text-slate-800 group-hover:text-indigo-700 truncate">${this.escapeHtml(link.title)}</p>
                                                                                        ${link.note ? `<p class="text-[10px] text-slate-400 truncate">${this.escapeHtml(link.note)}</p>` : ''}
                                                                                    </div>
                                                                                </div>
                                                                                <i data-lucide="arrow-up-right" class="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0"></i>
                                                                            </div>
                                                                        `).join('')}
                                                                    </div>
                                                                </div>
                                                            ` : ''}

                                                            ${(needsSubmission || hasSubmission) ? `
                                                                <div class="mt-3 pt-3 border-t border-slate-200/80 space-y-2.5">
                                                                    <div class="flex items-center justify-between">
                                                                        <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                                                            <i data-lucide="upload-cloud" class="w-3.5 h-3.5 text-indigo-600"></i>
                                                                            <span>Nộp bài tập / Báo cáo thực hành</span>
                                                                        </span>
                                                                        ${hasSubmission ? `
                                                                            <span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                                                                                <i data-lucide="check" class="w-3 h-3"></i>
                                                                                <span>Đã nộp ${window.hrOnboardingStore.formatDateTime ? window.hrOnboardingStore.formatDateTime(submission.submittedAt) : ''}</span>
                                                                            </span>
                                                                        ` : `
                                                                            <span class="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-semibold">
                                                                                Chưa nộp bài
                                                                            </span>
                                                                        `}
                                                                    </div>

                                                                    ${hasSubmission && !isEditingSub ? `
                                                                        <!-- Card hiển thị bài đã nộp -->
                                                                        <div class="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50/70 via-white to-indigo-50/40 border border-emerald-200/80 space-y-2.5 shadow-2xs">
                                                                            ${submission.link ? `
                                                                                <div class="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-slate-200/80 text-xs">
                                                                                    <div class="flex items-center gap-2 min-w-0">
                                                                                        <i data-lucide="link" class="w-3.5 h-3.5 text-indigo-600 shrink-0"></i>
                                                                                        <a href="${this.escapeHtml(submission.link)}" target="_blank" rel="noopener noreferrer"
                                                                                            class="font-bold text-indigo-600 hover:text-indigo-800 hover:underline truncate">
                                                                                            ${this.escapeHtml(submission.link)}
                                                                                        </a>
                                                                                    </div>
                                                                                    <a href="${this.escapeHtml(submission.link)}" target="_blank" rel="noopener noreferrer"
                                                                                        class="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-50 shrink-0" title="Mở liên kết">
                                                                                        <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                                                                                    </a>
                                                                                </div>
                                                                            ` : ''}

                                                                            ${submission.fileData ? `
                                                                                <div class="p-2.5 rounded-xl bg-white border border-slate-200/80 space-y-1.5 shadow-2xs">
                                                                                    <div class="flex items-center justify-between gap-2 text-xs">
                                                                                        <div class="flex items-center gap-2 min-w-0 cursor-pointer hover:opacity-90 flex-1"
                                                                                            onclick="window.onboardingViewer.previewSubmissionFile('${task.id}')"
                                                                                            title="Bấm để xem trước tệp bài nộp">
                                                                                            <i data-lucide="${submission.fileType?.startsWith('image/') ? 'image' : (submission.fileName?.toLowerCase().endsWith('.pdf') ? 'file-text' : 'file')}" class="w-4 h-4 ${submission.fileName?.toLowerCase().endsWith('.pdf') ? 'text-rose-600' : 'text-indigo-600'} shrink-0"></i>
                                                                                            <span class="font-bold text-slate-800 truncate hover:text-indigo-600 transition-colors">${this.escapeHtml(submission.fileName || 'Tệp đính kèm')}</span>
                                                                                        </div>
                                                                                        <div class="flex items-center gap-1.5 shrink-0">
                                                                                            <button type="button" onclick="window.onboardingViewer.previewSubmissionFile('${task.id}')"
                                                                                                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold transition-colors shadow-2xs"
                                                                                                title="Xem trước bài làm trực tiếp">
                                                                                                <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                                                                                                <span>Xem</span>
                                                                                            </button>
                                                                                            <a href="${submission.fileData}" download="${this.escapeHtml(submission.fileName || 'bai-nop')}"
                                                                                                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors shadow-2xs"
                                                                                                title="Tải tệp về máy tính">
                                                                                                <i data-lucide="download" class="w-3.5 h-3.5"></i>
                                                                                                <span>Tải về</span>
                                                                                            </a>
                                                                                        </div>
                                                                                    </div>
                                                                                    ${submission.fileType?.startsWith('image/') ? `
                                                                                        <div class="pt-1">
                                                                                            <img src="${submission.fileData}" alt="Bài làm"
                                                                                                onclick="window.onboardingViewer.previewSubmissionFile('${task.id}')"
                                                                                                class="max-h-48 rounded-xl object-contain border border-slate-200 cursor-pointer hover:opacity-95 transition-opacity shadow-2xs"
                                                                                                title="Bấm để phóng to">
                                                                                            <p class="text-[10px] text-slate-400 pt-0.5">Bấm vào ảnh để xem kích thước lớn</p>
                                                                                        </div>
                                                                                    ` : ''}
                                                                                </div>
                                                                            ` : ''}

                                                                            ${submission.note ? `
                                                                                <div class="p-2.5 rounded-xl bg-white/90 border border-slate-200/70 text-xs">
                                                                                    <div class="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 mb-0.5">Ghi chú của học viên:</div>
                                                                                    <p class="text-slate-700 whitespace-pre-wrap leading-relaxed">${this.escapeHtml(submission.note)}</p>
                                                                                </div>
                                                                            ` : ''}

                                                                            <div class="flex items-center justify-end gap-2 pt-1 border-t border-emerald-100">
                                                                                <button type="button" onclick="window.onboardingViewer.openEditSubmission('${task.id}')"
                                                                                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-indigo-600 text-xs font-bold shadow-2xs transition-all">
                                                                                    <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                                                                                    <span>Sửa bài nộp</span>
                                                                                </button>
                                                                                <button type="button" onclick="window.onboardingViewer.deleteSubmission('${task.id}')"
                                                                                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 text-slate-600 hover:text-rose-600 text-xs font-bold shadow-2xs transition-all">
                                                                                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                                                                    <span>Xóa</span>
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ` : `
                                                                        <!-- Form nộp bài mới hoặc chỉnh sửa -->
                                                                        <div class="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                                                                            <p class="text-xs text-slate-500">
                                                                                Bạn có thể gắn đường link bài làm (Docs/Sheets/Drive/Figma...), tải ảnh chụp/file kết quả hoặc nhập ghi chú giải thích.
                                                                            </p>

                                                                            <!-- Input Gắn link -->
                                                                            <div class="space-y-1">
                                                                                <label for="sub-link-${task.id}" class="block text-[11px] font-bold text-slate-700">
                                                                                    <span class="flex items-center gap-1"><i data-lucide="link" class="w-3 h-3 text-indigo-500"></i> Đường link bài làm / báo cáo:</span>
                                                                                </label>
                                                                                <input type="url" id="sub-link-${task.id}"
                                                                                    value="${this.escapeHtml(submission?.link || '')}"
                                                                                    placeholder="https://docs.google.com/... hoặc link Drive, Figma..."
                                                                                    class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                                                                            </div>

                                                                            <!-- Upload File / Ảnh -->
                                                                            <div class="space-y-1.5">
                                                                                <label class="block text-[11px] font-bold text-slate-700">
                                                                                    <span class="flex items-center gap-1"><i data-lucide="upload" class="w-3 h-3 text-emerald-500"></i> Tải file hoặc ảnh chụp màn hình:</span>
                                                                                </label>
                                                                                <div class="flex flex-wrap items-center gap-2">
                                                                                    <label class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors shadow-2xs">
                                                                                        <i data-lucide="file-plus" class="w-3.5 h-3.5 text-indigo-600"></i>
                                                                                        <span>Chọn tệp / hình ảnh</span>
                                                                                        <input type="file" id="sub-file-${task.id}" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
                                                                                            onchange="window.onboardingViewer.handleFileSelect(event, '${task.id}')"
                                                                                            class="hidden">
                                                                                    </label>
                                                                                    <span id="sub-file-info-${task.id}" class="text-[11px] text-slate-400">
                                                                                        ${submission?.fileName ? `Đang có file: ${this.escapeHtml(submission.fileName)}` : 'Hỗ trợ ảnh PNG/JPG, PDF, Docs, Excel... (<1MB)'}
                                                                                    </span>
                                                                                </div>
                                                                                <div id="sub-preview-${task.id}" class="${submission?.fileData && !isEditingSub ? '' : 'hidden'}"></div>
                                                                            </div>

                                                                            <!-- Input Ghi chú -->
                                                                            <div class="space-y-1">
                                                                                <label for="sub-note-${task.id}" class="block text-[11px] font-bold text-slate-700">
                                                                                    <span class="flex items-center gap-1"><i data-lucide="message-square" class="w-3 h-3 text-amber-500"></i> Ghi chú kết quả / giải thích:</span>
                                                                                </label>
                                                                                <textarea id="sub-note-${task.id}" rows="2"
                                                                                    placeholder="Tóm tắt kết quả, câu hỏi cần giải đáp hoặc lưu ý cho Mentor..."
                                                                                    class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none">${this.escapeHtml(submission?.note || '')}</textarea>
                                                                            </div>

                                                                            <!-- Nút Lưu -->
                                                                            <div class="flex items-center justify-end gap-2 pt-1">
                                                                                ${isEditingSub ? `
                                                                                    <button type="button" onclick="window.onboardingViewer.cancelEditSubmission('${task.id}')"
                                                                                        class="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all">
                                                                                        Hủy
                                                                                    </button>
                                                                                ` : ''}
                                                                                <button type="button" onclick="window.onboardingViewer.handleSaveSubmission(event, '${task.id}')"
                                                                                    class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all active:scale-95">
                                                                                    <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>
                                                                                    <span>${hasSubmission ? 'Lưu cập nhật bài làm' : 'Nộp bài & Hoàn thành'}</span>
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    `}
                                                                </div>
                                                            ` : ''}
                                                        </div>
                                                    </div>
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
                                                ${this.escapeHtml(this.cleanMentorNote(day.mentorNote))}
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

        if (this.activeDayFilter && this.activeDayFilter !== 'all') {
            setTimeout(() => {
                const activeBtn = container.querySelector(`button[data-day-id="${this.activeDayFilter}"]`);
                if (activeBtn) {
                    activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }
            }, 80);
        }
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

    getFormattedDayDate(day, index, candidate) {
        let dateStr = day.date;
        if (!dateStr && candidate && candidate.startDate && /^\d{4}-\d{2}-\d{2}$/.test(candidate.startDate)) {
            if (window.hrOnboardingStore && typeof window.hrOnboardingStore.getWorkingDayDate === 'function') {
                dateStr = window.hrOnboardingStore.getWorkingDayDate(candidate.startDate, index);
            } else {
                const [y, m, d] = candidate.startDate.split('-').map(Number);
                let cur = new Date(y, m - 1, d);
                // Nếu ngày bắt đầu là Thứ 7 hoặc Chủ Nhật, dời đến Thứ 2 tiếp theo
                while (cur.getDay() === 0 || cur.getDay() === 6) {
                    cur.setDate(cur.getDate() + 1);
                }
                let step = 0;
                while (step < index) {
                    cur.setDate(cur.getDate() + 1);
                    // Bỏ qua Thứ 7 và Chủ Nhật vì văn phòng HCM chỉ làm từ Thứ 2 đến Thứ 6
                    while (cur.getDay() === 0 || cur.getDay() === 6) {
                        cur.setDate(cur.getDate() + 1);
                    }
                    step++;
                }
                const yyyy = cur.getFullYear();
                const mm = String(cur.getMonth() + 1).padStart(2, '0');
                const dd = String(cur.getDate()).padStart(2, '0');
                dateStr = `${yyyy}-${mm}-${dd}`;
            }
        }
        if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return '';
        const [y, m, d] = dateStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        const dayOfWeek = dayNames[date.getDay()];
        return `${dayOfWeek}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
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
