# Etron SalesHub - Hệ Thống Tài Liệu Bán Hàng & Lập Báo Giá Etron Solutions

Hệ thống quản lý tài liệu và lập bảng báo giá chuyên nghiệp dành riêng cho đội ngũ kinh doanh **Công ty Cổ phần Giải pháp Etron** (Etron Solutions JSC), hỗ trợ lưu trữ tài liệu bán hàng, quản lý danh mục sản phẩm/dịch vụ CRM & Callbot AI, và tạo bảng báo giá chuẩn mẫu **ADAHUB & UCALL** với cơ chế tự động điền và xuất PDF chuẩn in ấn A4.

Hệ thống hoạt động offline hoàn chỉnh không cần cài đặt backend, sẵn sàng triển khai 1-click lên **Netlify**.

---

## 🌟 Các Tính Năng Nổi Bật

### 1. Trình Tạo Báo Giá Chuẩn Etron (Quotation Builder)
- **Giao diện rộng rãi & thoải mái:** Không còn bị chia đôi màn hình chật chội; form nhập liệu được căn chỉnh tối ưu, thoáng đãng, dễ dàng thao tác trên mọi màn hình.
- **Mẫu gói Callbot 1-Click (CB2, CB5, CB20):**
  - **Gói CB2:** `2.000.000₫` · Thời hạn 45 ngày (270₫/block 6s, 7.407 block, 1 tài khoản CRM).
  - **Gói CB5:** `5.000.000₫` · Thời hạn 3 tháng (260₫/block 6s, 19.230 block, tặng 1 kịch bản, 1 ghi âm, 1 CRM).
  - **Gói CB20:** `20.000.000₫` · Thời hạn 6 tháng (245₫/block 6s, 81.632 block, tặng 2 kịch bản, 2 ghi âm, 2 CRM).
- **Thanh Mini Dock Trôi Nổi (Floating Mini Preview):**
  - Luôn hiển thị mã báo giá, tên khách hàng và tổng tiền thanh toán ở góc màn hình.
  - Tích hợp phím tắt nhanh: *Xem Trước A4, Tải PDF, In / Vector*.
- **Cửa Sổ Xem Trước A4 Trực Quan (Slide-over / Modal Drawer):**
  - Bấm mở xem toàn khổ giấy A4 thực tế bất cứ lúc nào mà không chiếm diện tích làm việc.
  - Hỗ trợ phóng to / thu nhỏ tỉ lệ (85%, 100%, 115%).
- **Mẫu Báo Giá Chuẩn Xác Theo File Mẫu Etron:**
  - Header: Logo tròn Etron Sale HCM & Thông tin CÔNG TY CỔ PHẦN GIẢI PHÁP ETRON (MST: 0110415751).
  - Tiêu đề: **BÁO GIÁ / DỊCH VỤ ADAHUB & UCALL**.
  - Bảng hạng mục: `STT | Hạng mục | Đơn giá | Số lượng | Thành tiền` (Header màu `#C9DAF8`, Tổng thanh toán màu `#FCE5CD`).
  - Tự động tính thuế GTGT (VAT 8%) và dịch số tiền thành chữ Tiếng Việt chuẩn tài chính.
  - Mục **Chi tiết gói:** và **Ghi chú:** chuẩn chính sách Etron Salekit.
  - Chữ ký Giám đốc kinh doanh (Đỗ Thị Thùy Liên).
- **Xuất PDF 2 chế độ:**
  - 📥 **Tải File PDF Ngay:** Tải trực tiếp file `.pdf` về máy.
  - 🖨️ **In / Lưu PDF Vector:** In trực tiếp hoặc lưu PDF vector sắc nét 100% qua trình duyệt.

### 2. Kho Tài Liệu Bán Hàng (Sales Document Hub)
- Phân loại tài liệu khoa học:
  - *Chính sách bán hàng & Chiết khấu*
  - *Hợp đồng & Pháp lý*
  - *Brochure & Catalogue sản phẩm*
  - *Profile & Hồ sơ năng lực công ty*
  - *Kịch bản bán hàng & Tài liệu đào tạo*
- Tìm kiếm tức thì theo từ khóa, danh mục hoặc hashtag.
- Lưu trữ liên kết Cloud (Google Drive, Dropbox, OneDrive, Notion) và hỗ trợ tải tệp nhanh.

### 3. Danh Mục Sản Phẩm & Dịch Vụ (Product Catalog)
- Quản lý mã sản phẩm, tên, danh mục, đơn vị tính (Bộ, Cái, Gói, Năm...), giá niêm yết, chính sách bảo hành.
- Dễ dàng thêm, sửa, xóa, tìm kiếm nhanh.

### 4. Quản Lý Lịch Sử Báo Giá
- Lưu trữ mọi báo giá đã lập kèm trạng thái (*Bản nháp, Đã gửi, Khách duyệt, Từ chối*).
- Mở lại để chỉnh sửa, nhân bản (duplicate) cho khách hàng mới, hoặc xuất lại file PDF bất cứ lúc nào.

### 5. Tùy Biến Doanh Nghiệp (Branding Settings)
- Tải lên Logo công ty.
- Tùy chỉnh Tên công ty, Mã số thuế, Địa chỉ, Hotline, Email, Website.
- Cấu hình thông tin tài khoản ngân hàng thụ hưởng.
- Người ký đại diện và điều khoản thương mại mặc định.

### 6. Sao Lưu & Đồng Bộ Dữ Liệu
- Xuất toàn bộ dữ liệu ra tệp JSON (`sales_hub_backup.json`) chỉ với 1 click.
- Khôi phục trên máy khác hoặc chia sẻ dữ liệu chung cho cả đội ngũ Sales.

---

## 🚀 Hướng Dẫn Deploy Lên Netlify

Hệ thống được thiết kế dạng **Static Single Page Application**, do đó việc đưa lên Netlify cực kỳ đơn giản và hoàn toàn **miễn phí**:

### Cách 1: Kéo & Thả (Netlify Drop) - Nhanh nhất (30 giây)
1. Đăng nhập vào [Netlify](https://app.netlify.com/).
2. Truy cập vào mục **Sites** hoặc trang [Netlify Drop](https://app.netlify.com/drop).
3. Kéo toàn bộ thư mục `sales-quotation-hub` và thả vào ô tải lên của Netlify.
4. Netlify sẽ tự động tải lên và cấp cho bạn một đường link online miễn phí (ví dụ: `https://sales-hub-yourname.netlify.app`).

### Cách 2: Kết Nối Qua GitHub (Khuyên dùng)
1. Đẩy (push) mã nguồn thư mục này lên một repository trên GitHub.
2. Vào Netlify, chọn **"Add new site"** -> **"Import an existing project"** -> Chọn **GitHub**.
3. Chọn repository của bạn.
4. Tại phần cấu hình build:
   - **Build command:** Để trống (hoặc không cần điền gì)
   - **Publish directory:** `.` (hoặc `./`)
5. Nhấn **Deploy Site**. Sau này mỗi khi bạn chỉnh sửa và push lên GitHub, Netlify sẽ tự động cập nhật ngay lập tức!

---

## 💻 Cách Dùng Thử Ngay Dưới Máy (Local)

Không cần cài đặt Node.js hay phần mềm nào:
1. Mở thư mục `D:\sales-quotation-hub`.
2. Nhấp đúp chuột vào file `index.html` để mở trực tiếp trong trình duyệt Chrome / Edge / Firefox.
3. Toàn bộ tính năng đã sẵn sàng hoạt động ngay lập tức!

