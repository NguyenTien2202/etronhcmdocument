/**
 * Thông báo dạng pastel hiển thị ở GIỮA PHÍA TRÊN màn hình (dùng chung SalesHub, HrHub, Onboard).
 * Không che khu xem trước / nút thao tác ở góc dưới như trước.
 * Dùng: window.showPastelToast('Đã lưu!', 'success' | 'error' | 'warning' | 'info')
 */
(() => {
    const ICONS = {
        success: '<path d="M20 6 9 17l-5-5"/>',
        error: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
        warning: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
        info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'
    };
    const MAX_VISIBLE = 3;

    function getContainer() {
        let el = document.getElementById('pastel-toast-stack');
        if (!el) {
            el = document.createElement('div');
            el.id = 'pastel-toast-stack';
            el.className = 'pastel-toast-stack no-print';
            el.setAttribute('aria-live', 'polite');
            document.body.appendChild(el);
        }
        return el;
    }

    function dismiss(toast) {
        if (!toast || toast.dataset.leaving) return;
        toast.dataset.leaving = '1';
        toast.classList.remove('is-visible');
        setTimeout(() => toast.remove(), 260);
    }

    function showPastelToast(message, type = 'info', options = {}) {
        if (!document.body) return null;
        const kind = ICONS[type] ? type : (type === 'warn' ? 'warning' : 'info');
        const container = getContainer();

        // Tránh chồng quá nhiều thông báo: bỏ bớt cái cũ nhất
        const current = Array.from(container.querySelectorAll('.pastel-toast:not([data-leaving])'));
        current.slice(0, Math.max(0, current.length - (MAX_VISIBLE - 1))).forEach(dismiss);

        const toast = document.createElement('div');
        toast.className = `pastel-toast pastel-toast--${kind}`;
        toast.setAttribute('role', kind === 'error' ? 'alert' : 'status');

        const icon = document.createElement('span');
        icon.className = 'pastel-toast__icon';
        icon.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${ICONS[kind]}</svg>`;

        const text = document.createElement('span');
        text.className = 'pastel-toast__text';
        text.textContent = String(message ?? '');

        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'pastel-toast__close';
        close.setAttribute('aria-label', 'Đóng thông báo');
        close.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
        close.addEventListener('click', () => dismiss(toast));

        toast.append(icon, text, close);
        container.appendChild(toast);
        requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('is-visible')));

        const duration = options.duration || (kind === 'error' ? 5000 : kind === 'warning' ? 4200 : 2800);
        let timer = setTimeout(() => dismiss(toast), duration);
        // Rê chuột vào thì giữ lại để kịp đọc
        toast.addEventListener('mouseenter', () => clearTimeout(timer));
        toast.addEventListener('mouseleave', () => { timer = setTimeout(() => dismiss(toast), 1500); });
        return toast;
    }

    window.showPastelToast = showPastelToast;
})();
