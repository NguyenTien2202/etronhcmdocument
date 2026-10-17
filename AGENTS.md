# Quy trình làm việc mặc định

Áp dụng cho toàn bộ dự án `sales-quotation-hub`. Ưu tiên yêu cầu cụ thể của người dùng trong phiên làm việc và tuân thủ các giới hạn quyền của môi trường thực thi.

## Thực hiện yêu cầu

1. Chủ động phân tích các file liên quan và thực hiện chỉnh sửa code khi người dùng giao yêu cầu triển khai.
2. Không hỏi xác nhận cho các thao tác thông thường: đọc file, sửa code, chạy kiểm tra và tạo commit. Nếu môi trường bắt buộc cấp quyền, sử dụng cơ chế phê duyệt của môi trường.
3. Giữ nguyên các chức năng hiện có khi bổ sung tính năng mới; giới hạn thay đổi trong phạm vi yêu cầu.
4. Sau khi sửa, kiểm tra cú pháp, các đường dẫn và chức năng liên quan bằng các bước kiểm tra phù hợp. Không coi phần chưa kiểm thử là đã xác minh.

## Git và GitHub

1. Kiểm tra nhánh hiện tại và `git status` trước khi làm việc. Không ghi đè, loại bỏ hoặc đưa thay đổi không liên quan của người dùng vào commit.
2. Khi kiểm tra thành công, tự tạo commit mô tả rõ thay đổi và push trực tiếp lên `origin/main`, trừ khi người dùng yêu cầu khác.
3. Trước khi push, luôn kiểm tra lại `git status`, chạy `git fetch origin` và đối chiếu `main` với `origin/main`. Chỉ push khi đã xác nhận đồng bộ, ngoài các commit cục bộ thuộc nhiệm vụ hiện tại.
4. Nếu remote có commit chưa có ở local, hoặc nhánh hiện tại không phải `main`, dừng và hỏi người dùng cách đồng bộ hoặc chuyển nhánh; không tự merge, rebase hay ghi đè công việc khác.
5. Chỉ stage các file thuộc nhiệm vụ. Kiểm tra diff được stage và bảo đảm không có thông tin bí mật trước khi commit.
6. Không force push, không ghi đè thay đổi chưa đồng bộ và không commit token, mật khẩu, khóa riêng hoặc thông tin bí mật khác.
7. Nếu push bị từ chối, không thử ép push; kiểm tra nguyên nhân và báo cáo. Sau khi push thành công, kiểm tra working tree và trạng thái đồng bộ với upstream.

## Dữ liệu, bảo mật và hosting

1. Không tự ý xóa dữ liệu Firebase hoặc thay đổi quy tắc bảo mật và xác thực. Những thao tác này cần yêu cầu rõ ràng của người dùng.
2. Hosting chính thức là GitHub Pages. Không thêm lại cấu hình Netlify, bao gồm `netlify.toml`, `_redirects`, thư mục `.netlify` hoặc workflow triển khai Netlify.
3. Nếu gặp lỗi nghiêm trọng, xung đột Git hoặc nguy cơ mất dữ liệu, dừng thao tác có rủi ro, báo cáo và hỏi người dùng trước khi tiếp tục.

## Báo cáo hoàn tất

Báo cáo ngắn gọn các file đã sửa, kết quả kiểm tra, commit, kết quả push và trạng thái triển khai nếu xác minh được. Không đồng nhất push thành công với triển khai thành công; nêu rõ khi chưa xác minh triển khai.
