# Bật đăng nhập HR và bảo vệ dữ liệu Firebase

## Phạm vi

- SalesHub vẫn công khai: đọc/thêm/sửa tài liệu, bảng giá và nội dung Callbot.
- Xóa tài liệu chuyển sang `deletedAt`; không xóa document, IndexedDB hoặc các chunk tệp. Thùng rác cho phép khôi phục. Không có cơ chế xóa vĩnh viễn/tự dọn.
- HR dùng Firebase Email/Password. UID HR được chốt trong `js/hr-auth.js` và `firestore.rules`; UID không phải mật khẩu. Phiên đăng nhập chỉ giữ trong bộ nhớ trang, không lưu thông tin xác thực vào storage dùng chung với SalesHub; tải lại hoặc rời trang HR cần đăng nhập lại. Muốn thêm HR phải cập nhật cả hai nơi và kiểm thử lại.
- `hr_config/candidates_data`, `notes_data`, `templates_data` và các document HR cũ giữ nguyên cấu trúc và dữ liệu trên cloud, chỉ HR được đọc/ghi. Không còn đồng bộ PIN.
- `hr_config/onboarding_roadmap` là lộ trình chung công khai, HR được sửa.
- HR dùng “Cập nhật / Copy Link” để chủ động xuất bản một bản thông tin học tập sang `onboarding_links/{token}`. Chỉ xuất bản tên, vị trí, ngày bắt đầu, hạn hoàn thành, người hướng dẫn và lộ trình; không xuất bản email, điện thoại, lương, hồ sơ, checklist thủ tục hoặc ghi chú riêng.
- Token 256 bit ngẫu nhiên nằm trong fragment URL (`#key=...`), không nằm trong đường dẫn/query gửi tới hosting. Ai có liên kết đều có thể xem thông tin học tập và cập nhật tiến độ tương ứng. Không gửi liên kết vào chat công khai, analytics hoặc log. Đây là quyền theo liên kết, không xác minh danh tính người nhận.
- “Thu hồi link” xóa bản thông tin học tập đã xuất bản; không xóa hồ sơ HR hoặc tiến độ đã lưu. Sau thu hồi, Rules từ chối truy cập tiến độ của liên kết cũ. Tạo lại sẽ có token mới. Link không tự hết hạn.
- Các liên kết cũ `?id=cand-...` không còn truy cập hồ sơ; HR phải cấp liên kết mới. Khi chỉnh hồ sơ/lộ trình, dùng “Cập nhật / Copy Link” lần nữa để cập nhật bản đã xuất bản.
- Hồ sơ có hạn hoàn thành onboarding; HR và người học thấy cảnh báo quá hạn theo múi giờ Việt Nam, người phụ trách (mentor) và ngày học chưa hoàn thành tiếp theo. Hạn này áp dụng cho toàn lộ trình, không tự đặt hạn cho từng bài.
- Tiến độ cá nhân nằm trong `onboarding_progress/{token}`; HR xem qua listener riêng. Checklist ở lộ trình chung chỉ lưu trên thiết bị.

## Trước khi áp dụng

1. Sao lưu Rules hiện tại và dữ liệu Firestore bằng công cụ quản trị phù hợp. Không dán dữ liệu nhân sự hoặc mật khẩu vào repository. Giữ bản sao các dữ liệu cục bộ chưa được đồng bộ trước khi xóa cache trình duyệt.
2. Kiểm tra Email/Password đã bật, tài khoản HR tồn tại và UID khớp `TmtCY7Bgb2OSPRZXhsK1qRnoI8g1`; tên miền GitHub Pages đã được thêm trong Authentication.
3. Chạy `npm ci --ignore-scripts`, `npm run check`, `npm test`, `npm run test:rules`. Emulator dùng project giả `demo-saleshub`; không chạy deploy bằng các lệnh kiểm thử.
4. Kiểm tra toàn bộ collection thực tế. Rules chỉ cho phép các collection mà source hiện tại dùng; nếu có ứng dụng khác dùng cùng Firebase, đánh giá quyền của ứng dụng đó trước khi Publish.

## Thứ tự triển khai

1. Triển khai mã website mới lên GitHub Pages và xác minh phiên bản mới đã được phục vụ (tham số tài nguyên `v69`). Không cấp link onboarding cá nhân trước khi Rules mới được áp dụng: Rules cũ còn cho phép liệt kê dữ liệu toàn bộ database.
2. Trong Firebase Console → Firestore Database → Rules, thay nội dung bằng **toàn bộ** `firestore.rules` và Publish. Không giữ rule wildcard `allow read, write: if ...` cũ: nhiều rule được OR với nhau, wildcard cũ sẽ vô hiệu hóa việc bảo vệ HR.
3. Thử trên cửa sổ riêng tư: SalesHub hoạt động, HR yêu cầu đăng nhập; tài khoản không phải HR không được vào. Đăng nhập HR và kiểm tra hồ sơ/ghi chú cũ vẫn đủ.
4. Thử với một tài liệu kiểm tra: thêm, chuyển vào thùng rác, khôi phục và mở tệp; không thử xóa dữ liệu thật.
5. Chỉ sau bước 2, HR tạo một liên kết onboarding kiểm tra. Xác minh không có dữ liệu riêng tư, đánh dấu hoàn thành, xem tiến độ ở HR, thu hồi và xác minh link cũ bị từ chối.
6. Kiểm tra trạng thái đang lưu, mất mạng, lỗi quyền và kết nối lại. Lỗi ghi cần thử lưu lại thao tác; không tự phát lại các thao tác xóa/sửa đã thất bại.

## Giới hạn và hoàn tác

- Push GitHub không tự Publish Firestore Rules. Khi Rules chưa Publish, dữ liệu HR trên cloud vẫn chịu quyền cũ; giao diện đăng nhập không tự bảo vệ database.
- Rules mới có hiệu lực ngay với mọi client. Các tab dùng mã cũ cần tải lại; thao tác xóa cứng tài liệu từ mã cũ sẽ bị từ chối.
- Không tự ghi dữ liệu mặc định lên HR khi snapshot rỗng; cloud là nguồn chính. Những thay đổi chỉ có trong cache HR của bản cũ cần được sao lưu/đối chiếu thủ công, không tự trộn với cloud.
- Các bản dữ liệu HR từng tải về máy hoặc từng công khai trước đây không thể được thu hồi bằng Rules mới. Sau khi sao lưu phần chưa đồng bộ, xóa cache HR cũ trên thiết bị dùng chung.
- Public SalesHub vẫn cho phép người biết cấu hình sửa dữ liệu chung/chunk tệp. Thùng rác bảo vệ khỏi xóa nhầm qua giao diện, không thay thế sao lưu hoặc bảo vệ trước người cố ý phá dữ liệu.
- Nếu có lỗi sau Publish, ưu tiên sửa quyền đúng collection và giữ HR riêng tư. Không khôi phục wildcard công khai toàn database để xử lý sự cố. Không rollback về giao diện PIN nếu Rules đang yêu cầu Authentication.
- GitHub Pages tiếp tục dùng nguồn triển khai hiện có. Workflow mới chỉ kiểm tra, không đổi cài đặt Pages và không tự deploy Firebase.
