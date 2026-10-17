/**
 * Etron HrHub & Onboarding Data Store (Cloud Synced via Firebase Firestore)
 * - Quản lý dữ liệu riêng biệt của HR (hr_candidates, hr_templates, hr_notes, hr_files, hr_config)
 * - Quản lý Lộ trình & Kế hoạch Onboard (onboarding_roadmap) hiển thị cho nhân sự mới
 * - Tuyệt đối tách biệt với dữ liệu của Sales, không ghi đè dữ liệu cũ
 */

const DEFAULT_ONBOARDING_ROADMAP = [
    {
        id: 'day-1',
        dayNumber: 'Ngày 1 (n)',
        title: 'Hội Nhập Công Ty, Văn Hóa Etron, Quy Định & Thiết Lập Công Cụ',
        duration: '08:30 – 18:00 (Nghỉ trưa: 12:00 – 13:30)',
        goal: 'Hiểu về công ty, tầm nhìn sứ mệnh, cơ cấu tổ chức các phòng ban, hệ sinh thái sản phẩm, nắm vững chính sách sale và chuẩn bị đầy đủ công cụ làm việc.',
        badgeColor: 'indigo',
        trainer: 'Mai - HR (Nguyễn Nhật Mai)',
        tasks: [
            { id: 't-101', title: 'Giới thiệu công ty: Tầm nhìn, sứ mệnh, cơ cấu tổ chức, các phòng ban chính và cách phối hợp làm việc', type: 'learn' },
            { id: 't-102', title: 'Văn hóa & Quy định: Nội quy làm việc, chính sách sales, quy trình chấm công, xin nghỉ phép, báo cáo công việc', type: 'learn' },
            { id: 't-103', title: 'Tổng quan hệ sinh thái sản phẩm: Sản phẩm chủ lực (Callbot AI Ucall, Adahub CRM, Tổng đài VoIP), đối tượng khách hàng mục tiêu', type: 'learn' },
            { id: 't-104', title: 'Thiết lập công cụ làm việc: Tạo và đăng nhập tài khoản (Admin, UCALL, nhóm chat nội bộ Zalo, Kho tài liệu SalesHub)', type: 'action' },
            { id: 't-105', title: 'Chính sách SALE & Hoa hồng: Nắm rõ các định nghĩa, thuật ngữ sale, KPI cá nhân/team và cơ chế hoa hồng, level thăng tiến', type: 'learn' },
            { id: 't-106', title: 'Bài tập Ngày 1: Tóm tắt lại các lợi ích, giải pháp của công ty và giải pháp đó hỗ trợ khách hàng như thế nào', type: 'practice' }
        ],
        attachedDocIds: [],
        customLinks: [
            { title: 'Slide Giới thiệu công ty & Văn hóa', url: 'https://drive.google.com/file/d/1oI19ZE7BUm55qoma_d65fw7N44MwULsc/view?usp=sharing', type: 'external' },
            { title: 'Thư mục tài liệu tham khảo chung', url: 'https://drive.google.com/drive/folders/1E2RJWKPbq-7OdXYmgGS-Iic9rIa59G1Q?usp=drive_link', type: 'external' },
            { title: 'Nội quy & Văn hóa làm việc Etron', url: 'https://docs.google.com/document/d/1TUp4Nam4AKsslvIP6HrlErfN9NosOLP-sI22PdlJLFk/edit?tab=t.0', type: 'external' },
            { title: 'Slide Tổng quan Hệ sinh thái Etron', url: 'https://drive.google.com/file/d/1_Y0BSuXJzm0xD40Sgz-Xliv2_vySQlsR/view?usp=sharing', type: 'external' },
            { title: 'Chính sách Sale & Quy chế KPI', url: 'https://docs.google.com/document/d/1Ys5zRhMs16a07fwD-c4ka_DL-VazDRKRaGyJDV0PzWk/edit?tab=t.0', type: 'external' },
            { title: 'Bảng Mức lương theo Level KPI', url: 'https://docs.google.com/spreadsheets/d/1PHHfU_FM2Hf7eKJTIhH7tZEhsgptb4ZlH6uoIX0XuoU/edit?usp=sharing', type: 'external' },
            { title: 'Mở Kho Tài Liệu SalesHub', url: 'index.html?tab=documents', type: 'internal' }
        ],
        mentorNote: 'Phụ trách: Mai - HR. Ngày đầu tiên bạn thoải mái làm quen môi trường, thiết lập đầy đủ công cụ và ghi chú lại các thắc mắc để được giải đáp nhé!'
    },
    {
        id: 'day-2',
        dayNumber: 'Ngày 2 (n+1)',
        title: 'Đào Tạo Chuyên Sâu Sản Phẩm Trợ Lý Ảo Callbot AI Ucall',
        duration: '08:30 – 18:00 (Nghỉ trưa: 12:00 – 13:30)',
        goal: 'Trình bày được tổng quan, nguyên lý hoạt động và quy trình vận hành Callbot; thành thạo xây dựng kịch bản và setup chiến dịch gọi tự động.',
        badgeColor: 'blue',
        trainer: 'Vy / Mai Tester / Tiên',
        tasks: [
            { id: 't-201', title: 'Tổng quan Callbot AI Ucall: Nguyên lý hoạt động, nhận diện giọng nói, xử lý ngôn ngữ tự nhiên và bài toán tiết kiệm chi phí', type: 'learn' },
            { id: 't-202', title: 'Phân loại bot: CB2 (45N), CB3 (90N), CB4 (120N), cách tính cước theo phút gọi và chọn bot phù hợp từng ngành', type: 'learn' },
            { id: 't-203', title: 'Xây dựng kịch bản Callbot: Thiết kế luồng hội thoại, tạo intent câu hỏi - câu trả lời, xử lý ngắt lời và kịch bản rẽ nhánh', type: 'learn' },
            { id: 't-204', title: 'Thực hành Callbot + Chữa kịch bản: Tự xây dựng kịch bản mẫu và được mentor chữa trực tiếp', type: 'practice' },
            { id: 't-205', title: 'Thiết lập chiến dịch: Thực hành setup chạy chiến dịch gọi thử nghiệm trên app.ucall.vn và kiểm tra báo cáo cuộc gọi', type: 'practice' }
        ],
        attachedDocIds: [],
        customLinks: [
            { title: 'Video Đào tạo Callbot & Kịch bản', url: 'https://drive.google.com/file/d/1GYV3gLQu-3_8KuntZI7B7MWjouHAhsgh/view?usp=sharing', type: 'external' },
            { title: 'Hệ thống Quản lý Callbot Ucall', url: 'https://app.ucall.vn', type: 'external' },
            { title: 'Kho Kịch Bản & Ghi Âm Mẫu trên SalesHub', url: 'index.html?tab=callbot-hub', type: 'internal' }
        ],
        mentorNote: 'Phụ trách: Vy / Mai Tester / Tiên. Nghe kỹ các file ghi âm mẫu trên SalesHub để cảm nhận cách Callbot AI phản hồi thông minh nhé!'
    },
    {
        id: 'day-3',
        dayNumber: 'Ngày 3 (n+2)',
        title: 'Phần Mềm Quản Lý CSKH Adahub CRM, Dịch Vụ ZNS & Dashboard KPI',
        duration: '08:30 – 18:00 (Nghỉ trưa: 12:00 – 13:30)',
        goal: 'Làm chủ hệ thống Adahub CRM, quy trình đăng ký & gửi tin Zalo ZNS và biết cách theo dõi chỉ số hiệu quả trên Dashboard KPI.',
        badgeColor: 'amber',
        trainer: 'Vy / Mai Tester / Tiên',
        tasks: [
            { id: 't-301', title: 'Tổng quan hệ thống CRM: Vai trò của Adahub CRM, quản lý lead, chăm sóc khách hàng đa kênh (Omni-channel) và phễu bán hàng', type: 'learn' },
            { id: 't-302', title: 'Hướng dẫn sử dụng Adahub CRM chi tiết: Thao tác tạo contact, chia deal, cập nhật trạng thái pipeline, gắn tag, đặt lịch nhắc hẹn', type: 'practice' },
            { id: 't-303', title: 'Giải pháp ZNS (Zalo Notification Service): Giới thiệu về ZNS, các loại mẫu tin chăm sóc khách hàng, chi phí và quy trình duyệt mẫu', type: 'learn' },
            { id: 't-304', title: 'Quy trình vận hành ZNS: Cách thức gửi tin tự động từ CRM/Callbot sang Zalo khách hàng', type: 'learn' },
            { id: 't-305', title: 'Hướng dẫn Dashboard & KPI: Cách đọc chỉ số cuộc gọi, tỷ lệ chuyển đổi, doanh số cá nhân và báo cáo tiến độ tuần/tháng', type: 'practice' }
        ],
        attachedDocIds: [],
        customLinks: [
            { title: 'HDSD & Video Hướng dẫn Adahub CRM', url: 'https://docs.google.com/spreadsheets/d/1WENMoEByRAPrKGWulpPVyv5255LBNkqbCjyXWRxQJGs/edit?gid=1630288305#gid=1630288305', type: 'external' },
            { title: 'Slide Đào tạo Zalo ZNS', url: 'https://drive.google.com/file/d/10ZoR56MtKPpgy941pW61Sk5hsqZwBRio/view?usp=drive_link', type: 'external' },
            { title: 'Quy trình Vận hành ZNS', url: 'https://drive.google.com/file/d/1JAiRRcL2EFO1bKt7AM4bOHz3oShTyrFz/view?usp=drive_link', type: 'external' },
            { title: 'Thư mục Dashboard & KPI Bán hàng', url: 'https://drive.google.com/drive/folders/11dYYmc8GL7MxCoovDEsDgxC4rB_fLnGY?usp=drive_link', type: 'external' }
        ],
        mentorNote: 'Phụ trách: Vy / Mai Tester / Tiên. CRM là công cụ sống còn của Sales, hãy thực hành nhập thử lead và quản lý deal để quen tay.'
    },
    {
        id: 'day-4',
        dayNumber: 'Ngày 4 (n+3)',
        title: 'Hệ Thống Tổng Đài VoIP, Quay Số Telesale Tự Động & Các Loại Đầu Số',
        duration: '08:30 – 18:00 (Nghỉ trưa: 12:00 – 13:30)',
        goal: 'Trình bày được chức năng tổng đài, phân biệt chính xác các loại đầu số viễn thông và tự thiết lập chiến dịch quay số telesale.',
        badgeColor: 'emerald',
        trainer: 'Tiên / Leaders / CS Ucall',
        tasks: [
            { id: 't-401', title: 'Tổng quan hệ thống Tổng đài VoIP: Lợi ích của tổng đài đám mây, tính năng ghi âm, chuyển tiếp máy nhánh và định tuyến cuộc gọi', type: 'learn' },
            { id: 't-402', title: 'Quay số Telesale tự động: Nguyên lý auto-dialer, cách tự tạo chiến dịch gọi điện, cài đặt thông số gọi và giải thích các case thực tế', type: 'practice' },
            { id: 't-403', title: 'Phân biệt các loại Đầu số: Đầu số cố định (024/028), đầu số di động doanh nghiệp, đầu số 1800/1900 và Voice Brandname', type: 'learn' },
            { id: 't-404', title: 'Tư vấn đúng gói cước đầu số: Xác định trường hợp khách hàng nào nên dùng đầu số nào để tối ưu chi phí và tỷ lệ nghe máy', type: 'learn' },
            { id: 't-405', title: 'Tham gia buổi Meeting Hướng dẫn sử dụng (HDSD) cùng đội ngũ CS Ucall để học cách hỗ trợ khách hàng thực tế', type: 'practice' }
        ],
        attachedDocIds: [],
        customLinks: [
            { title: 'Kho Tài Liệu Tổng Hợp Sản Phẩm & Đầu Số', url: 'index.html?tab=documents', type: 'internal' }
        ],
        mentorNote: 'Phụ trách: Tiên & CS Ucall. Hiểu đúng đầu số và cước viễn thông sẽ giúp bạn tư vấn phương án tiết kiệm nhất cho khách hàng.'
    },
    {
        id: 'day-5',
        dayNumber: 'Ngày 5 (n+4)',
        title: 'Chính Sách Bán Hàng, Bảng Giá, Quy Trình Thanh Toán & Lập Báo Giá',
        duration: '08:30 – 18:00 (Nghỉ trưa: 12:00 – 13:30)',
        goal: 'Thuộc lòng bảng giá các gói sản phẩm, quy trình thanh toán, xuất hóa đơn VAT và thành thạo công cụ lập báo giá PDF trên SalesHub trong 2 phút.',
        badgeColor: 'violet',
        trainer: 'Tiên / Mai - HR',
        tasks: [
            { id: 't-501', title: 'Giá sản phẩm & Gói dịch vụ: Nắm rõ bảng giá Callbot, Adahub CRM, phí khởi tạo, chi phí duy trì và các gói kết hợp', type: 'learn' },
            { id: 't-502', title: 'Quy trình thanh toán: Tư vấn đúng quy trình thanh toán (đặt cọc, nghiệm thu, thanh lý) theo quy định công ty', type: 'learn' },
            { id: 't-503', title: 'Chính sách xuất hóa đơn: Hướng dẫn khách hàng chuẩn bị đúng thông tin pháp nhân và xuất hóa đơn VAT điện tử', type: 'learn' },
            { id: 't-504', title: 'Làm bài test Bảng giá & Chính sách bán hàng cùng Trainer để kiểm tra mức độ nắm bắt', type: 'practice' },
            { id: 't-505', title: 'Thực hành Lập Báo Giá trên Etron SalesHub: Tự tạo 02 bản báo giá PDF hoàn chỉnh (01 bản Callbot AI, 01 bản Adahub CRM)', type: 'practice' }
        ],
        attachedDocIds: [],
        customLinks: [
            { title: 'Mức lương theo Level & Chính sách KPI', url: 'https://docs.google.com/spreadsheets/d/1PHHfU_FM2Hf7eKJTIhH7tZEhsgptb4ZlH6uoIX0XuoU/edit?usp=sharing', type: 'external' },
            { title: 'Công cụ Tạo Báo Giá Online Etron SalesHub', url: 'index.html?tab=quote-builder', type: 'internal' }
        ],
        mentorNote: 'Phụ trách: Tiên & Mai HR. Hãy tận dụng công cụ Báo giá trên SalesHub để có thể tạo báo giá gửi khách ngay trên điện thoại hoặc máy tính nhé!'
    },
    {
        id: 'day-6',
        dayNumber: 'Ngày 6 (n+5)',
        title: 'Quy Trình Bán Hàng Thực Chiến, Kỹ Năng Meeting, Xử Lý Từ Chối & Chốt Deal',
        duration: '08:30 – 18:00 (Nghỉ trưa: 12:00 – 13:30)',
        goal: 'Trình bày trọn vẹn quy trình từ lead đến chốt deal; thành thạo kỹ năng gọi điện tiếp cận, meeting demo, follow-up và vượt qua kỳ đánh giá Onboard.',
        badgeColor: 'rose',
        trainer: 'Thu / Tươi / Kiên / Liên / Leaders',
        tasks: [
            { id: 't-601', title: 'Tổng quan Quy trình bán hàng B2B (Thu): Từ tiếp nhận lead, phân loại nhu cầu, hẹn meeting, demo, báo giá, follow-up đến chốt ký hợp đồng', type: 'learn' },
            { id: 't-602', title: 'Kỹ năng Gọi điện tiếp cận chuyên sâu (Tươi): Cấu trúc 10 giây mở lời, khơi gợi nỗi đau vận hành và kỹ thuật chốt lịch hẹn meeting', type: 'learn' },
            { id: 't-603', title: 'Kỹ năng Meeting tư vấn & Demo giải pháp (Kiên): Cấu trúc buổi meeting chuẩn, demo sản phẩm thực tế và chốt bán', type: 'practice' },
            { id: 't-604', title: 'Quy trình Follow-up khách hàng mới & Chốt bán (Thu): Thời điểm follow-up vàng, kịch bản thúc đẩy và xử lý do dự', type: 'practice' },
            { id: 't-605', title: 'Xử lý từ chối trong cuộc gọi đầu & Sau meeting (Liên): Phân tích tình huống thực tế khi khách chê giá, ngại công nghệ mới, đang dùng đối thủ...', type: 'learn' },
            { id: 't-606', title: 'Nghiên cứu Thị trường, Đối thủ & Giữ chân khách hàng (Tươi & Kiên): Phân tích đối thủ cạnh tranh và tư duy Customer Success giúp khách hàng gia hạn', type: 'learn' },
            { id: 't-607', title: 'Rèn luyện 1-1 cùng Leaders: Chữa recording cuộc gọi thực tế, role-play meeting 1-1 và kiểm tra kỹ năng tư vấn độc lập', type: 'practice' },
            { id: 't-608', title: 'Nhận Data khách hàng đầu tiên trên CRM và chính thức bước vào chặng đường kinh doanh tại Etron HCM!', type: 'action' }
        ],
        attachedDocIds: [],
        customLinks: [
            { title: 'Quy trình Bán hàng Tổng quan', url: 'https://drive.google.com/file/d/1X31uPVx7M7TLYoEoBUimK98DEMXXbM99/view?usp=drive_link', type: 'external' },
            { title: 'Quy trình Follow-up Khách hàng mới', url: 'https://drive.google.com/file/d/1fZVR-cbDyR4QSVs6aBf-9R6VObGDgzP6/view?usp=drive_link', type: 'external' },
            { title: 'Bảng Thực hành Follow-up & Chốt bán', url: 'https://docs.google.com/spreadsheets/d/1BuAw6TUex45zMTMFpwAv5-pCIZ98xSGQ/edit?gid=1484021979#gid=1484021979', type: 'external' },
            { title: 'Tài liệu Xử lý từ chối trong Cuộc gọi đầu', url: 'https://docs.google.com/spreadsheets/d/1W0OI6WOPbey0fD8f6AW8cwFhEnD5RXGjyi_yDSQfo9M/edit?gid=0#gid=0', type: 'external' },
            { title: 'Tài liệu Xử lý từ chối Sau Meeting', url: 'https://docs.google.com/spreadsheets/d/1llpeQn2eF1HOyP3u_Hyt712ja33Kp09FEq6w3kfTzn0/edit?gid=0#gid=0', type: 'external' },
            { title: 'Slide Nghiên cứu Thị trường & Đối thủ (Canva)', url: 'https://www.canva.com/design/DAGeYgc3CKI/tbnk0J5nP7TU7aPYJoWohA/edit?utm_content=DAGeYgc3CKI&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton', type: 'external' },
            { title: 'Slide Customer Success & Giữ chân KH (Canva)', url: 'https://www.canva.com/design/DAGfEmymcN0/kOrtb6br4ulOfT_-DR65TA/edit?utm_content=DAGfEmymcN0&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton', type: 'external' }
        ],
        mentorNote: 'Phụ trách: Thu, Tươi, Kiên, Liên, Leaders. Chúc mừng bạn đã hoàn thành tuần đào tạo nền tảng! Toàn bộ team Etron HCM sẽ luôn sát cánh hỗ trợ bạn trong từng cuộc gọi và từng thương vụ chốt deal.'
    }
];

function createDefaultChecklistItems() {
    return [
        // Giai đoạn 1: Trước ngày Onboard (Pre-boarding)
        { id: 'chk-pre-1', stage: 'preboard', title: 'Gửi Thư mời nhận việc (Offer Letter) & Xác nhận ngày bắt đầu đi làm', done: true },
        { id: 'chk-pre-2', stage: 'preboard', title: 'Gửi tin nhắn Zalo dặn dò lịch trình ngày đầu, thời gian, địa chỉ, chỗ gửi xe & người đón', done: false },
        { id: 'chk-pre-3', stage: 'preboard', title: 'Chuẩn bị chỗ ngồi làm việc, văn phòng phẩm / thiết bị cần thiết', done: false },
        { id: 'chk-pre-4', stage: 'preboard', title: 'Thông báo cho Team Sales & Quản lý chuẩn bị chào đón nhân sự mới vào sáng Thứ 2', done: false },

        // Giai đoạn 2: Hồ sơ & Thủ tục hành chính
        { id: 'chk-doc-1', stage: 'admin', title: 'Thu bản chụp / photo CCCD 2 mặt (hoặc thông tin định danh VNeID)', done: false },
        { id: 'chk-doc-2', stage: 'admin', title: 'Thu thập Số tài khoản Ngân hàng nhận lương + Mã số thuế cá nhân + Email cá nhân', done: false },
        { id: 'chk-doc-3', stage: 'admin', title: 'Thu Sơ yếu lý lịch / Bằng cấp / Hồ sơ nhân sự theo quy định', done: false },
        { id: 'chk-doc-4', stage: 'admin', title: 'Hướng dẫn nội quy công ty, giờ giấc làm việc & Ký thỏa thuận thử việc / NDA', done: false },

        // Giai đoạn 3: Cấp phát Tài khoản & Công cụ
        { id: 'chk-acc-1', stage: 'accounts', title: 'Gửi đường link Cổng Lộ Trình Onboard (onboard.html) & hướng dẫn học Ngày 1', done: false },
        { id: 'chk-acc-2', stage: 'accounts', title: 'Gửi đường link Etron SalesHub (Kho Tài Liệu, Callbot & Công cụ Báo giá)', done: false },
        { id: 'chk-acc-3', stage: 'accounts', title: 'Tạo và bàn giao tài khoản phần mềm Adahub CRM', done: false },
        { id: 'chk-acc-4', stage: 'accounts', title: 'Cấp tài khoản trải nghiệm / Demo hệ thống Callbot AI Ucall', done: false },
        { id: 'chk-acc-5', stage: 'accounts', title: 'Thêm nhân sự mới vào các nhóm Zalo làm việc của Etron HCM & giới thiệu trước team', done: false },

        // Giai đoạn 4: Theo dõi & Đánh giá thử việc
        { id: 'chk-eval-1', stage: 'evaluation', title: 'Check-in cuối Ngày 1: Hỏi thăm cảm nhận ngày đầu & giải đáp thắc mắc', done: false },
        { id: 'chk-eval-2', stage: 'evaluation', title: 'Đánh giá Ngày 3: Kiểm tra mức độ nắm bắt sản phẩm Adahub CRM & Callbot AI', done: false },
        { id: 'chk-eval-3', stage: 'evaluation', title: 'Đánh giá Cuối Tuần 1: Kiểm tra thực hành lập báo giá PDF & Role-play tư vấn', done: false },
        { id: 'chk-eval-4', stage: 'evaluation', title: 'Đánh giá tổng kết quá trình thử việc & đề xuất chính thức', done: false }
    ];
}

const DEFAULT_HR_TEMPLATES = [
    {
        id: 'tpl-hr-offer-success',
        category: 'offer',
        categoryLabel: 'Mời nhận việc (Offer)',
        title: '[ETRON] Thư mời nhận việc (Offer Letter) – NV Kinh Doanh (ĐẬU)',
        subject: '[ETRON] KẾT QUẢ PHỎNG VẤN NHÂN VIÊN KINH DOANH',
        content: `Thân gửi {{ten_ung_vien}},
Sau khi đã cân nhắc kỹ lưỡng về sự thể hiện của bạn trong vòng phỏng vấn, công ty rất vui mừng thông báo rằng bạn đã xuất sắc vượt qua vòng phỏng vấn vị trí Nhân viên Kinh doanh tại CÔNG TY CỔ PHẦN GIẢI PHÁP ETRON. Chúng tôi đánh giá cao chất lượng cuộc phỏng vấn vừa rồi và nhìn thấy ở bạn những tố chất phù hợp với vị trí Nhân viên Kinh doanh tại công ty.

Thông tin offer với vị trí Nhân viên Kinh doanh (Toàn thời gian):
• Thời gian bắt đầu: {{ngay_onboard}} từ 8h30 - 18h (nghỉ trưa từ 12h - 13h30)
• Địa chỉ: {{dia_diem}}

Giai đoạn 1 - Thử việc (2 tháng)
• Tổng thu nhập (Gross): 7.000.000 VNĐ/tháng (tính theo số ngày đi làm thực tế).
• Khấu trừ Thuế Thu nhập cá nhân (TNCN) (10%): 700.000 VNĐ/tháng (theo quy định hiện hành).
• Hoa hồng và thưởng: Áp dụng theo chính sách của công ty
• Thu nhập thực nhận (Net): 6.300.000 VNĐ/tháng (tính theo số ngày đi làm thực tế).
Lưu ý: Trong giai đoạn thử việc, công ty chưa áp dụng đóng các chế độ Bảo hiểm bắt buộc theo quy định.

Giai đoạn 2 - Làm việc chính thức (Sau thử việc)
• Điều kiện áp dụng: Người lao động vượt qua kỳ đánh giá thử việc và đáp ứng được các tiêu chí của công ty.
• Cấu trúc thu nhập:
  - Thu nhập cố định trước bảo hiểm (Gross): 8.000.000 VNĐ/tháng
  - Hoa hồng và thưởng: Áp dụng theo chính sách của công ty
  - Tổng thu nhập hàng tháng = 8.000.000 VNĐ + Hoa hồng + Thưởng (nếu có).
• Chế độ Bảo hiểm và Khấu trừ:
  - Lương cơ bản (Dùng làm căn cứ đóng bảo hiểm): 5.400.000 VNĐ/tháng.
  - Mức khấu trừ bảo hiểm của người lao động (10.5% tính trên Lương cơ bản):
    + BHXH (8%): 432.000 VNĐ
    + BHYT (1.5%): 81.000 VNĐ
    + BHTN (1%): 54.000 VNĐ
    + Tổng tiền bảo hiểm khấu trừ: 5.400.000 VNĐ x 10.5% = 567.000 VNĐ/tháng.
• Thu nhập thực nhận hàng tháng:
  - Thu nhập thực nhận = Thu nhập cố định (8.000.000 VNĐ) - Tiền bảo hiểm (567.000 VNĐ) + Thưởng hoa hồng + Thưởng (nếu có).
  - Thu nhập thực nhận (Net) = 7.433.000 VNĐ + Thưởng hoa hồng + Thưởng (nếu có).

Hàng quý, bạn được đăng ký level KPI theo mong muốn và năng lực theo bảng sau: Mức lương theo level (https://docs.google.com/spreadsheets/d/1PHHfU_FM2Hf7eKJTIhH7tZEhsgptb4ZlH6uoIX0XuoU/edit?usp=sharing) (Điều kiện lên level Junior đã ghi trong file trên. Các level có thể được thay đổi bởi công ty cho phù hợp với từng giai đoạn và sẽ được thông báo trước tới bạn).

Lưu ý: Nhân viên vui lòng chuẩn bị laptop cá nhân để phục vụ cho công việc.

Bạn vui lòng phản hồi lại email này trước 17h00 Thứ 7 để xác nhận và đồng ý tham gia quá trình onboarding và làm việc theo cú pháp: “Tôi đã đọc và sẵn sàng tham gia vào quá trình đào tạo của công ty."

Một lần nữa, chúng tôi xin cảm ơn bạn đã quan tâm ETRON làm nơi để phát triển sự nghiệp. Chúng tôi rất mong được chào đón bạn gia nhập đội ngũ của mình và cùng nhau tạo nên những thành tựu đáng tự hào.
Nếu bạn có bất kỳ câu hỏi nào, xin vui lòng liên hệ qua email này hoặc nhắn tin qua zalo số {{sdt_lien_he}} ({{nguoi_lien_he}}).

Trân trọng,
Phòng Nhân sự ETRON
{{nguoi_lien_he}}`,
        updatedAt: Date.now()
    },
    {
        id: 'tpl-hr-interview-reject',
        category: 'reject',
        categoryLabel: 'Từ chối / Cảm ơn',
        title: '[ETRON] Thư cảm ơn & Kết quả phỏng vấn không phù hợp (RỚT)',
        subject: '[ETRON] THƯ CẢM ƠN',
        content: `Thân chào {{ten_ung_vien}},  
Chúng mình xin chân thành cảm ơn vì bạn đã quan tâm và ứng tuyển vào vị trí {{vi_tri}} của CÔNG TY CỔ PHẦN GIẢI PHÁP ETRON. 
Chúng mình đánh giá cao sự nhiệt tình cũng như kinh nghiệm của bạn đối với vị trí này. Tuy nhiên, ở thời điểm hiện tại, bạn chưa thật sự phù hợp với những yêu cầu mà công ty chúng mình đang tìm kiếm. 
Vậy nên chúng mình sẽ lưu thông tin của bạn để trong tương lai sẽ giới thiệu những cơ hội phù hợp hơn. ETRON cảm ơn sự tham gia của bạn vào buổi phỏng vấn của công ty. Chúc bạn sẽ đạt được nhiều thành công trong cuộc sống và hy vọng trong tương lai có cơ hội được hợp tác với bạn. 

Trân trọng cảm ơn! 
Phòng Nhân sự 
Nguyễn Nhật Mai`,
        updatedAt: Date.now()
    },
    {
        id: 'tpl-hr-interview-invite',
        category: 'interview',
        categoryLabel: 'Mời phỏng vấn',
        title: '[ETRON] Thư mời phỏng vấn vị trí Nhân viên Kinh doanh (Offline)',
        subject: '[ETRON] THƯ MỜI PHỎNG VẤN VỊ TRÍ {{vi_tri}}',
        content: `Thân gửi {{ten_ung_vien}},
Chúc mừng bạn đã vượt qua vòng duyệt hồ sơ apply vào vị trí {{vi_tri}} tại CÔNG TY CỔ PHẦN GIẢI PHÁP ETRON.
Công ty ETRON muốn mời bạn đăng ký tham gia phỏng vấn tại công ty vào tuần tới để chúng ta có thể hiểu nhau hơn. Khung thời gian phỏng vấn đã được ghi tại link dưới đây.
Bạn vui lòng chọn 1 khung giờ và GHI NHỚ lịch đã đăng ký:
👉 Link đăng ký lịch phỏng vấn: https://docs.google.com/forms/d/e/1FAIpQLSe48IEet9SoUhZ6HsIEmtpP_1b4eJuMF0ne2ZS5lj4MmQ_kXg/viewform?usp=dialog

Hình thức phỏng vấn: Offline
Thời gian phỏng vấn dự kiến: 30 - 50 phút
Địa chỉ công ty: {{dia_diem}}

Sau khi đã đăng ký xong, bạn vui lòng trả lời lại email này để xác nhận khả năng tham gia buổi phỏng vấn theo cú pháp: “Tôi đã đăng ký lịch và sẽ tham gia buổi phỏng vấn đúng giờ” trước 12h00 ngày hẹn phỏng vấn. Trong trường hợp bạn có lý do đột xuất hoặc có bất kỳ đề xuất về lịch, vui lòng liên hệ qua email này hoặc nhắn tin qua zalo số {{sdt_lien_he}} ({{nguoi_lien_he}}).

Rất mong nhận được phản hồi từ bạn và được gặp bạn trong buổi phỏng vấn tới!

Trân trọng,
Phòng Nhân sự ETRON
{{nguoi_lien_he}}`,
        updatedAt: Date.now()
    },
    {
        id: 'tpl-hr-cv-reject',
        category: 'reject',
        categoryLabel: 'Từ chối / Cảm ơn',
        title: '[ETRON] Thư thông báo kết quả xét duyệt hồ sơ ứng tuyển CV (Không đạt)',
        subject: '[ETRON] THÔNG BÁO KẾT QUẢ XÉT DUYỆT HỒ SƠ ỨNG TUYỂN – {{vi_tri}}',
        content: `Thân gửi {{ten_ung_vien}},
Trước tiên, Công ty Cổ phần Giải pháp ETRON xin chân thành cảm ơn bạn đã quan tâm và dành thời gian ứng tuyển vào vị trí {{vi_tri}} tại công ty.
Sau quá trình xem xét và đánh giá hồ sơ, rất tiếc hiện tại chúng tôi chưa thể tiếp tục quy trình tuyển dụng cùng bạn trong đợt tuyển dụng lần này.
Chúng tôi trân trọng sự quan tâm của bạn dành cho ETRON và hy vọng sẽ có cơ hội đồng hành cùng bạn ở những vị trí phù hợp hơn trong tương lai.
Một lần nữa, cảm ơn bạn đã dành thời gian ứng tuyển. Chúc bạn thật nhiều sức khỏe, may mắn và thành công trên con đường sự nghiệp sắp tới!

Trân trọng,
Phòng Nhân sự ETRON
{{nguoi_lien_he}}`,
        updatedAt: Date.now()
    },
    {
        id: 'tpl-hr-preboard-zalo',
        category: 'preboard',
        categoryLabel: 'Dặn dò trước Onboard',
        title: 'Tin nhắn Zalo dặn dò ứng viên trước ngày Onboard (Gửi trước Thứ 2)',
        subject: '[ETRON HCM] Hướng dẫn chuẩn bị cho ngày Onboard đầu tiên – {{ten_ung_vien}}',
        content: `Chào {{ten_ung_vien}} nhé! 🌸
Mình nhắn tin từ bộ phận Nhân sự (HR) của Etron HCM để nhắc lịch hẹn đón bạn vào ngày làm việc đầu tiên ({{ngay_onboard}}) sắp tới nha.

📌 Thông tin ngày Onboard đầu tiên của {{ten_ung_vien}}:
• Thời gian có mặt: {{gio_onboard}} ngày {{ngay_onboard}}
• Vị trí: {{vi_tri}}
• Địa điểm làm việc: {{dia_diem}}
• Người đón & hỗ trợ trực tiếp: {{nguoi_lien_he}} ({{sdt_lien_he}})

🎒 Một số chuẩn bị nhỏ cho ngày đầu tiên:
1. Trang phục: Lịch sự, gọn gàng, năng động nơi công sở.
2. Thiết bị: Bạn nhớ mang theo Laptop cá nhân + sạc và tai nghe (để nghe demo cuộc gọi AI nhé).
3. Hồ sơ thông tin: Chuẩn bị sẵn ảnh chụp CCCD 2 mặt, Số tài khoản ngân hàng và Mã số thuế cá nhân (nếu có) để HR hỗ trợ cập nhật hệ thống.

Khi tới nơi, {{ten_ung_vien}} cứ nhắn hoặc gọi cho mình nhé. Hẹn gặp bạn vào sáng {{ngay_onboard}}, chúc bạn cuối tuần thật nhiều năng lượng! ✨`,
        updatedAt: Date.now()
    },
    {
        id: 'tpl-hr-day1-welcome',
        category: 'welcome',
        categoryLabel: 'Chào mừng ngày đầu',
        title: 'Tin nhắn chào mừng sáng Ngày 1 + Gửi link Lộ trình Onboard & Tài liệu',
        subject: 'Chào mừng {{ten_ung_vien}} gia nhập đội ngũ Etron HCM!',
        content: `Chào mừng {{ten_ung_vien}} chính thức gia nhập đại gia đình Etron HCM ở vị trí {{vi_tri}}! 🎉🚀

Để giúp {{ten_ung_vien}} dễ dàng nắm bắt kiến thức sản phẩm (Adahub CRM & Trợ lý ảo Callbot AI Ucall) cũng như kế hoạch học tập từng ngày trong tuần đầu tiên, mình gửi bạn đường link Cổng Lộ Trình & Tài Liệu Onboard dưới đây nhé:

👉 Link Lộ trình & Tài liệu học tập (Ngày 1 ➔ Ngày 6):
{{link_onboard}}

💡 Hướng dẫn nhanh:
• Trong link trên đã có sẵn mục tiêu từng ngày, danh sách nội dung cần tìm hiểu và các file tài liệu PDF / kịch bản mẫu đính kèm.
• Học xong phần nào, bạn có thể bấm tích hoàn thành ngay trên trang để tự theo dõi tiến độ của mình nhé.

Trong quá trình tìm hiểu, nếu có bất kỳ phần nào chưa rõ, {{ten_ung_vien}} cứ trao đổi trực tiếp với mình hoặc {{nguoi_lien_he}} nha. Chúc bạn có tuần Onboard đầu tiên thật thuận lợi và hiệu quả! 💪`,
        updatedAt: Date.now()
    },
    {
        id: 'tpl-hr-team-intro',
        category: 'internal',
        categoryLabel: 'Đánh giá & Nội bộ',
        title: 'Tin nhắn giới thiệu thành viên mới vào nhóm Zalo công ty',
        subject: 'Chào đón thành viên mới gia nhập Team Etron HCM',
        content: `📣 CẢ NHÀ ETRON HCM ƠI!
Hôm nay ({{ngay_onboard}}), team chúng mình rất vui được chào đón một thành viên mới gia nhập đội ngũ:

🌟 Bạn: {{ten_ung_vien}}
💼 Vị trí: {{vi_tri}}
🤝 Người đồng hành hướng dẫn: {{nguoi_lien_he}}

Cả nhà mình cùng thả tim chào đón và hỗ trợ {{ten_ung_vien}} hòa nhập thật nhanh với công việc cũng như các giải pháp Adahub CRM & Callbot AI Ucall nhé! Chúc {{ten_ung_vien}} bùng nổ doanh số cùng Etron HCM! 🎉🔥`,
        updatedAt: Date.now()
    },
    {
        id: 'tpl-hr-week1-checkin',
        category: 'internal',
        categoryLabel: 'Đánh giá & Nội bộ',
        title: 'Tin nhắn hỏi thăm & Check-in nhân sự mới sau Ngày 1 / Tuần 1',
        subject: 'Check-in quá trình Onboard cùng {{ten_ung_vien}}',
        content: `Chào {{ten_ung_vien}} nha! 😊
Sau những buổi đầu tiên làm quen với môi trường Etron HCM và tìm hiểu các sản phẩm Adahub CRM, Callbot AI Ucall theo lộ trình Onboard, {{ten_ung_vien}} cảm thấy thế nào rồi?

• Khối lượng kiến thức trong Lộ trình Onboard có vừa sức với bạn không?
• Phần tài liệu, kịch bản hoặc công cụ tạo báo giá có điểm nào bạn cần giải thích kỹ hơn không?
• Bạn có gặp khó khăn gì về chỗ ngồi, tài khoản hay thiết bị làm việc không?

Có bất kỳ điều gì cần hỗ trợ thêm, {{ten_ung_vien}} cứ chia sẻ thoải mái với mình nhé! Luôn sẵn sàng đồng hành cùng bạn! 💪`,
        updatedAt: Date.now()
    }
];


class HrOnboardingStore {
    constructor() {
        this._listeners = [];
        this._unsubscribers = [];
        this._cloudInitialized = false;
        this.privateData = { candidates: [], templates: DEFAULT_HR_TEMPLATES, notes: [] };
        this.roadmap = JSON.parse(JSON.stringify(DEFAULT_ONBOARDING_ROADMAP));
        this.publicCandidate = null;
        this.personalProgress = {};
        this.ready = new Set();
        this._progressListeners = new Map();
    }
    isHr() { return window.hrAuth?.isHr() === true; }
    onChange(cb) { if (typeof cb === 'function') this._listeners.push(cb); }
    notifyChange(source = 'local') { this._listeners.forEach(cb => cb(source)); }
    requireHr(key) {
        if (!this.isHr() || !this.ready.has(key)) throw new Error('Dữ liệu HR chưa sẵn sàng. Hãy chờ đồng bộ trước khi lưu.');
    }
    getRoadmap() { return this.roadmap; }
    saveRoadmap(list) {
        this.requireHr('roadmap');
        this.roadmap = list;
        window.firebaseDb.collection('hr_config').doc('onboarding_roadmap').set({ days: list, updatedAt: Date.now() }).catch(() => {});
        this.notifyChange('roadmap');
    }
    getCandidates() { return this.isHr() ? this.privateData.candidates : []; }
    getCandidateById(id) {
        return this.isHr() ? this.getCandidates().find(c => c.id === id) : this.publicCandidate;
    }
    saveCandidates(list) {
        this.requireHr('candidates');
        this.privateData.candidates = list;
        this.watchProgress(list);
        window.firebaseDb.collection('hr_config').doc('candidates_data').set({ items: list, updatedAt: Date.now() }).catch(() => {});
        this.notifyChange('candidates');
    }
    getTemplates() { return this.isHr() ? this.privateData.templates : []; }
    saveTemplates(list) { this.savePrivate('templates', 'templates_data', list); }
    getNotes() { return this.isHr() ? this.privateData.notes : []; }
    saveNotes(list) { this.savePrivate('notes', 'notes_data', list); }
    savePrivate(key, doc, list) {
        this.requireHr(key);
        this.privateData[key] = list;
        window.firebaseDb.collection('hr_config').doc(doc).set({ items: list, updatedAt: Date.now() }).catch(() => {});
        this.notifyChange(key);
    }
    getTaskProgress(candidateId = null) {
        if (this.isHr() && candidateId) return this.getCandidateById(candidateId)?.taskProgress || {};
        return this.personalProgress;
    }
    async toggleTaskProgress(taskId, candidateId = null) {
        if (this.isHr() && candidateId) {
            const candidate = this.getCandidateById(candidateId);
            candidate.taskProgress ||= {};
            candidate.taskProgress[taskId] = !candidate.taskProgress[taskId];
            this.saveCandidates(this.getCandidates());
            return;
        }
        if (!this.token) {
            // Public learning checklist is local only; it never writes HR data.
            this.personalProgress[taskId] = !this.personalProgress[taskId];
            localStorage.setItem('etron_public_learning_progress', JSON.stringify(this.personalProgress));
        } else {
            if (!this.personalProgressReady || !this.publicCandidate) throw new Error('Chưa tải được tiến độ.');
            const next = { ...this.personalProgress, [taskId]: !this.personalProgress[taskId] };
            await window.firebaseDb.collection('onboarding_progress').doc(this.token).update(new firebase.firestore.FieldPath('completedTasks', taskId), next[taskId]);
            this.personalProgress = next;
        }
        this.notifyChange('progress');
    }
    setupCloudSync() {
        if (this._cloudInitialized || !window.firebaseDb) return;
        this._cloudInitialized = true;
        const db = window.firebaseDb;
        const listen = (ref, cb) => this._unsubscribers.push(ref.onSnapshot(cb, () => this.notifyChange('sync_error')));
        listen(db.collection('hr_config').doc('onboarding_roadmap'), doc => {
            if (doc.exists && Array.isArray(doc.data().days)) this.roadmap = doc.data().days;
            if (!doc.metadata?.fromCache) this.ready.add('roadmap');
            this.notifyChange('roadmap');
        });
        if (!this.isHr()) {
            try { this.personalProgress = JSON.parse(localStorage.getItem('etron_public_learning_progress')) || {}; } catch (_) {}
            return;
        }
        for (const [key, name] of [['candidates', 'candidates_data'], ['templates', 'templates_data'], ['notes', 'notes_data']]) {
            listen(db.collection('hr_config').doc(name), doc => {
                if (doc.exists && Array.isArray(doc.data().items)) this.privateData[key] = doc.data().items;
                // Never seed/overwrite cloud data automatically on an empty snapshot.
                if (!doc.metadata?.fromCache) this.ready.add(key);
                if (key === 'candidates') this.watchProgress(this.privateData.candidates);
                this.notifyChange(key);
            });
        }
    }
    watchProgress(candidates) {
        const active = new Set(candidates.map(c => c.onboardToken).filter(Boolean));
        for (const [token, unsubscribe] of this._progressListeners) {
            if (!active.has(token)) { unsubscribe(); this._progressListeners.delete(token); }
        }
        for (const candidate of candidates) {
            const token = candidate.onboardToken;
            if (!token || this._progressListeners.has(token)) continue;
            const unsubscribe = window.firebaseDb.collection('onboarding_progress').doc(token).onSnapshot(doc => {
                const current = this.getCandidates().find(c => c.onboardToken === token);
                if (current && doc.exists) current.taskProgress = doc.data().completedTasks || {};
                this.notifyChange('progress');
            }, () => this.notifyChange('sync_error'));
            this._progressListeners.set(token, unsubscribe);
        }
    }
    stopPrivateSync() {
        this._unsubscribers.forEach(unsubscribe => unsubscribe());
        this._unsubscribers = [];
        this._cloudInitialized = false;
        this.ready.clear();
        this._progressListeners.forEach(unsubscribe => unsubscribe());
        this._progressListeners.clear();
        this.privateData = { candidates: [], templates: DEFAULT_HR_TEMPLATES, notes: [] };
        this.notifyChange('logout');
    }
    async publishCandidate(candidateId) {
        this.requireHr('candidates');
        const candidate = this.getCandidates().find(c => c.id === candidateId);
        if (!candidate) throw new Error('Không tìm thấy hồ sơ.');
        const token = candidate.onboardToken || Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('');
        const publicData = {
            fullName: candidate.fullName || '', role: candidate.role || '',
            startDate: candidate.startDate || '', mentor: candidate.mentor || '', targetDate: candidate.targetDate || '',
            customRoadmap: candidate.customRoadmap?.length ? candidate.customRoadmap : this.getRoadmap(),
        };
        const ref = window.firebaseDb.collection('onboarding_links').doc(token);
        await ref.set(publicData);
        const progressRef = window.firebaseDb.collection('onboarding_progress').doc(token);
        const existing = await progressRef.get();
        if (!existing.exists) await progressRef.set({ completedTasks: candidate.taskProgress || {} });
        if (!candidate.onboardToken) {
            candidate.onboardToken = token;
            await window.firebaseDb.collection('hr_config').doc('candidates_data').set({ items: this.getCandidates(), updatedAt: Date.now() });
        }
        this.watchProgress(this.getCandidates());
        return token;
    }
    async revokeCandidateLink(id) {
        this.requireHr('candidates');
        const candidate = this.getCandidates().find(c => c.id === id);
        if (!candidate?.onboardToken) return;
        await window.firebaseDb.collection('onboarding_links').doc(candidate.onboardToken).delete();
        delete candidate.onboardToken;
        this.saveCandidates(this.getCandidates());
    }
    openPersonalLink(token) {
        if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('Liên kết không hợp lệ.');
        this.token = token;
        this.personalProgressReady = false;
        const ref = window.firebaseDb.collection('onboarding_links').doc(token);
        this._unsubscribers.push(ref.onSnapshot(doc => {
            this.publicCandidate = doc.exists ? doc.data() : null;
            this.personalUnavailable = !doc.exists;
            this.notifyChange('personal');
        }, () => { this.personalUnavailable = true; this.publicCandidate = null; this.notifyChange('personal'); }));
        this._unsubscribers.push(window.firebaseDb.collection('onboarding_progress').doc(token).onSnapshot(doc => {
            this.personalProgress = doc.exists ? doc.data().completedTasks || {} : {};
            this.personalProgressReady = !doc.metadata?.fromCache;
            this.notifyChange('progress');
        }, () => this.notifyChange('sync_error')));
    }
    getLearningSummary(candidate, now = new Date()) {
        const roadmap = candidate?.customRoadmap?.length ? candidate.customRoadmap : this.getRoadmap();
        const progress = candidate?.taskProgress || this.personalProgress;
        const tasks = roadmap.flatMap(day => day.tasks || []);
        const completed = tasks.filter(task => !!progress[task.id]).length;
        const parts = Object.fromEntries(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now).map(part => [part.type, part.value]));
        const today = `${parts.year}-${parts.month}-${parts.day}`;
        return {
            isOverdue: !!candidate?.targetDate && candidate.targetDate < today && completed < tasks.length,
            nextDay: roadmap.find(day => (day.tasks || []).some(task => !progress[task.id])),
            completed, total: tasks.length,
        };
    }
    formatDateDisplay(dateStr) {
        if (!dateStr) return 'Chưa cập nhật';
        const clean = String(dateStr).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
            const [y, m, d] = clean.split('-').map(Number);
            const date = new Date(y, m - 1, d);
            const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
            const dow = daysOfWeek[date.getDay()];
            const padD = String(d).padStart(2, '0');
            const padM = String(m).padStart(2, '0');
            return `${dow}, ${padD}/${padM}/${y}`;
        }
        return clean;
    }

    formatShortDate(dateStr) {
        if (!dateStr) return '---';
        const clean = String(dateStr).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
            const [, m, d] = clean.split('-');
            return `${d}/${m}`;
        }
        return clean;
    }

    getUpcomingBirthdays(daysAhead = 7) {
        const candidates = this.getCandidates().filter(c => c.status !== 'paused');
        const now = new Date();
        const currentYear = now.getFullYear();
        const todayTime = new Date(currentYear, now.getMonth(), now.getDate()).getTime();

        const list = [];
        candidates.forEach(cand => {
            if (!cand.dob || !/^\d{4}-\d{2}-\d{2}$/.test(cand.dob)) return;
            const [bYear, bMonth, bDay] = cand.dob.split('-').map(Number);

            // Sinh nhật trong năm nay
            let nextBday = new Date(currentYear, bMonth - 1, bDay);
            if (nextBday.getTime() < todayTime) {
                // Đã qua sinh nhật năm nay, tính sinh nhật năm sau
                nextBday = new Date(currentYear + 1, bMonth - 1, bDay);
            }

            const diffDays = Math.round((nextBday.getTime() - todayTime) / (1000 * 60 * 60 * 24));
            if (diffDays <= daysAhead) {
                const turningAge = nextBday.getFullYear() - bYear;
                list.push({
                    candidate: cand,
                    daysLeft: diffDays,
                    formattedDate: `${String(bDay).padStart(2, '0')}/${String(bMonth).padStart(2, '0')}`,
                    fullDob: `${String(bDay).padStart(2, '0')}/${String(bMonth).padStart(2, '0')}/${bYear}`,
                    turningAge: turningAge
                });
            }
        });

        return list.sort((a, b) => a.daysLeft - b.daysLeft);
    }

    createDefaultChecklist() {
        return createDefaultChecklistItems();
    }

}
window.hrOnboardingStore = new HrOnboardingStore();
