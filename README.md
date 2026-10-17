# Etron SalesHub - Hệ Thống Tài Liệu Bán Hàng & Lập Báo Giá Etron Solutions

Hệ thống quản lý tài liệu và lập bảng báo giá chuyên nghiệp dành riêng cho đội ngũ kinh doanh **Công ty Cổ phần Giải pháp Etron** (Etron Solutions JSC), hỗ trợ lưu trữ tài liệu bán hàng, quản lý danh mục sản phẩm/dịch vụ CRM & Callbot AI, và tạo bảng báo giá chuẩn mẫu **ADAHUB & UCALL** với cơ chế tự động xuất PDF chuẩn A4.

Hosting chính thức: GitHub Pages. SalesHub công khai; HrHub đăng nhập bằng Firebase Email/Password.

Xem [hướng dẫn triển khai Firebase và cấp liên kết onboarding](docs/firebase-rollout.md) trước khi Publish Rules hoặc gửi liên kết cá nhân. Push mã lên GitHub không tự áp dụng Firestore Rules.

Kiểm tra: `npm ci --ignore-scripts`, `npm run check`, `npm test`, `npm run test:rules` (cần Java 21) và `npm run test:browser` (cần Chromium của Playwright hoặc biến `BROWSER_EXECUTABLE` trỏ đến Chrome). CI chạy các kiểm tra trên với dữ liệu giả lập, không deploy Firebase.


