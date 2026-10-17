/* HR access is enforced again by Firestore Rules; this UI is not the security boundary. */
(() => {
    const HR_UID = 'TmtCY7Bgb2OSPRZXhsK1qRnoI8g1';
    let currentUser = null;
    window.hrAuth = {
        isHr: () => currentUser?.uid === HR_UID,
        async login(event) {
            event.preventDefault();
            const form = event.currentTarget;
            const error = document.getElementById('hr-auth-error');
            const button = form.querySelector('button[type="submit"]');
            button.disabled = true;
            error.textContent = '';
            try {
                const remember = form.elements.remember ? form.elements.remember.checked : true;
                const persistence = remember
                    ? (firebase.auth.Auth?.Persistence?.LOCAL || firebase.auth.Auth?.Persistence?.NONE)
                    : (firebase.auth.Auth?.Persistence?.SESSION || firebase.auth.Auth?.Persistence?.NONE);
                if (persistence && typeof firebase.auth().setPersistence === 'function') {
                    await firebase.auth().setPersistence(persistence);
                }
                await firebase.auth().signInWithEmailAndPassword(form.elements.email.value.trim(), form.elements.password.value);
                form.elements.password.value = '';
            } catch (_) {
                error.textContent = 'Không thể đăng nhập. Kiểm tra tài khoản hoặc kết nối và thử lại.';
            } finally {
                button.disabled = false;
            }
        },
        async logout() {
            // Hide private content before waiting for the network/SDK.
            window.hrOnboardingStore?.stopPrivateSync();
            document.body.classList.remove('hr-authenticated');
            await firebase.auth().signOut();
        },
        async resetPassword() {
            const email = document.querySelector('#hr-login-form [name="email"]').value.trim();
            const error = document.getElementById('hr-auth-error');
            if (!email) { error.textContent = 'Nhập email trước khi yêu cầu đặt lại mật khẩu.'; return; }
            try {
                await firebase.auth().sendPasswordResetEmail(email);
                error.textContent = 'Nếu tài khoản hợp lệ, bạn sẽ nhận email hướng dẫn đặt lại mật khẩu.';
                if (window.hrAuth.isHr()) window.hrHub.showToast(error.textContent, 'info');
            } catch (_) { error.textContent = 'Không gửi được yêu cầu. Vui lòng thử lại sau.'; }
        },
    };
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.firebaseDb || typeof firebase?.auth !== 'function') {
            document.getElementById('hr-auth-error').textContent = 'Không tải được dịch vụ đăng nhập. Vui lòng tải lại trang.';
            return;
        }
        firebase.auth().onAuthStateChanged(async user => {
            currentUser = user;
            if (window.hrAuth.isHr()) {
                document.body.classList.add('hr-authenticated');
                if (!window.hrHub._authenticatedInit) {
                    window.hrHub._authenticatedInit = true;
                    window.hrHub.init();
                } else window.hrOnboardingStore.setupCloudSync();
            } else {
                document.body.classList.remove('hr-authenticated');
                window.hrOnboardingStore?.stopPrivateSync();
                if (user) {
                    document.getElementById('hr-auth-error').textContent = 'Tài khoản này chưa được cấp quyền HR.';
                    await firebase.auth().signOut();
                }
            }
        });
    });
})();
