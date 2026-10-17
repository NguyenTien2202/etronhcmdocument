/**
 * Etron HrHub & Onboarding Data Store (Cloud Synced via Firebase Firestore)
 * - Quản lý dữ liệu riêng biệt của HR (hr_candidates, hr_templates, hr_notes, hr_files, hr_config)
 * - Quản lý Lộ trình & Kế hoạch Onboard (onboarding_roadmap) hiển thị cho nhân sự mới
 * - Tuyệt đối tách biệt với dữ liệu của Sales, không ghi đè dữ liệu cũ
 */

const DEFAULT_ONBOARDING_ROADMAP = [
    {
        id: 'day-1',
        dayNumber: 'Ngày 1',
        title: 'Hội nhập Văn hóa Etron HCM & Tổng quan Hệ sinh thái Sản phẩm',
        duration: '08:30 – 17:30',
        goal: 'Hoàn tất thủ tục nhận việc, làm quen đội ngũ và nắm được bức tranh tổng thể các giải pháp công nghệ của Etron.',
        badgeColor: 'indigo',
        tasks: [
            { id: 't-101', title: 'Nhận bàn làm việc, hoàn tất hồ sơ nhân sự & làm quen các thành viên trong team Etron HCM', type: 'action' },
            { id: 't-102', title: 'Tìm hiểu Văn hóa doanh nghiệp, Nội quy làm việc, Thời gian biểu & Quy tắc phối hợp nội bộ', type: 'learn' },
            { id: 't-103', title: 'Tổng quan hệ sinh thái sản phẩm chủ lực: Phần mềm Adahub CRM, Tổng đài ảo & Trợ lý Callbot AI Ucall', type: 'learn' },
            { id: 't-104', title: 'Nhận tài khoản các công cụ làm việc và hướng dẫn sử dụng Kho Tài Liệu Etron SalesHub', type: 'practice' }
        ],
        attachedDocIds: [],
        customLinks: [
            { title: 'Mở Kho Tài Liệu SalesHub', url: 'index.html?tab=documents', type: 'internal' }
        ],
        mentorNote: 'Ngày đầu tiên bạn cứ thoải mái làm quen môi trường, đọc kỹ tài liệu tổng quan và ghi chú lại các câu hỏi để trao đổi cuối ngày nhé!'
    },
    {
        id: 'day-2',
        dayNumber: 'Ngày 2',
        title: 'Nắm vững Giải pháp Phần mềm Quản lý & CSKH Đa kênh Adahub CRM',
        duration: '08:30 – 17:30',
        goal: 'Hiểu rõ tính năng, lợi điểm bán hàng (USP), phân khúc khách hàng và quy trình triển khai của Adahub CRM & Tổng đài.',
        badgeColor: 'blue',
        tasks: [
            { id: 't-201', title: 'Nghiên cứu chi tiết các phân hệ của Adahub CRM (Quản lý Lead, Omni-channel, Ticket, Tổng đài VoIP, Tự động hóa)', type: 'learn' },
            { id: 't-202', title: 'Phân biệt các gói dịch vụ Adahub CRM (Cơ bản, Nâng cao, Toàn diện) và đối tượng doanh nghiệp phù hợp', type: 'learn' },
            { id: 't-203', title: 'Nắm rõ Quy trình đăng ký Voice Brandname & hồ sơ pháp lý cần chuẩn bị cho khách hàng', type: 'learn' },
            { id: 't-204', title: 'Trải nghiệm thực tế giao diện Demo Adahub CRM và tóm tắt 5 lợi ích lớn nhất đối với chủ doanh nghiệp', type: 'practice' }
        ],
        attachedDocIds: ['doc-user-1791976000418'],
        customLinks: [],
        mentorNote: 'Hãy chú ý kỹ phần quy trình đăng ký Brandname và các gói người dùng của Adahub vì khách hàng hỏi rất nhiều.'
    },
    {
        id: 'day-3',
        dayNumber: 'Ngày 3',
        title: 'Làm chủ Giải pháp Trợ lý ảo Callbot AI Ucall & Kịch bản theo Ngành',
        duration: '08:30 – 17:30',
        goal: 'Hiểu cơ chế hoạt động của Callbot AI, nghe các cuộc gọi mẫu thực tế và nắm được kịch bản ứng dụng cho từng ngành.',
        badgeColor: 'amber',
        tasks: [
            { id: 't-301', title: 'Tìm hiểu nguyên lý hoạt động của Callbot AI Ucall và bài toán tiết kiệm chi phí/nhân sự cho doanh nghiệp', type: 'learn' },
            { id: 't-302', title: 'Phân biệt 3 phiên bản bot: CB2 (45N), CB3 (90N) và CB4 (120N) cùng cách tính cước/phút gọi', type: 'learn' },
            { id: 't-303', title: 'Nghe tối thiểu 5 file ghi âm cuộc gọi mẫu (Audio) và đọc kịch bản mẫu trong mục "Callbot & Kịch Bản"', type: 'practice' },
            { id: 't-304', title: 'Xác định chân dung khách hàng mục tiêu (Bất động sản, Tài chính, Giáo dục, Thẩm mỹ/Nha khoa, Thương mại...)', type: 'practice' }
        ],
        attachedDocIds: [],
        customLinks: [
            { title: 'Khám phá Kho Kịch Bản & Ghi Âm Callbot AI', url: 'index.html?tab=callbot-hub', type: 'internal' }
        ],
        mentorNote: 'Việc nghe kỹ các file ghi âm mẫu sẽ giúp bạn tự tin mô tả giọng đọc và khả năng phản hồi thông minh của AI khi tư vấn khách.'
    },
    {
        id: 'day-4',
        dayNumber: 'Ngày 4',
        title: 'Bảng giá, Chính sách Bán hàng & Thực hành Lập Báo Giá Chuẩn',
        duration: '08:30 – 17:30',
        goal: 'Thuộc lòng cấu trúc chi phí và thành thạo việc tạo báo giá PDF chuyên nghiệp trên Etron SalesHub trong 2 phút.',
        badgeColor: 'emerald',
        tasks: [
            { id: 't-401', title: 'Học chi tiết Bảng giá các gói Callbot AI Ucall, Adahub CRM, Phí khởi tạo, Dịch vụ GTGT & Thuế VAT', type: 'learn' },
            { id: 't-402', title: 'Thực hành sử dụng công cụ "Tạo Báo Giá" trên Etron SalesHub: chọn gói 1-click, chỉnh sửa hạng mục và xuất file PDF', type: 'practice' },
            { id: 't-403', title: 'Tìm hiểu quy trình ký kết Hợp đồng, nghiệm thu và bàn giao khách hàng cho bộ phận Kỹ thuật / CSKH', type: 'learn' },
            { id: 't-404', title: 'Bài tập thực hành: Tự lập 02 bản báo giá PDF hoàn chỉnh (01 cho khách Callbot AI, 01 cho khách Adahub CRM)', type: 'practice' }
        ],
        attachedDocIds: [],
        customLinks: [
            { title: 'Thực hành Tạo Báo Giá ngay', url: 'index.html?tab=quote-builder', type: 'internal' }
        ],
        mentorNote: 'Thử tự tạo báo giá trên cả máy tính và điện thoại để khi khách cần gấp có thể xuất PDF gửi ngay qua Zalo.'
    },
    {
        id: 'day-5',
        dayNumber: 'Ngày 5',
        title: 'Kỹ năng Tư vấn, Kịch bản Tiếp cận (Telesales) & Xử lý Từ chối',
        duration: '08:30 – 17:30',
        goal: 'Xây dựng kịch bản mở lời thu hút, biết cách đặt câu hỏi khai thác nhu cầu (SPIN) và xử lý mượt các tình huống từ chối.',
        badgeColor: 'violet',
        tasks: [
            { id: 't-501', title: 'Học cấu trúc cuộc gọi tiếp cận khách hàng B2B chuẩn: Mở lời 10 giây đầu – Khai thác nỗi đau – Đề xuất giải pháp – Chốt hẹn Demo', type: 'learn' },
            { id: 't-502', title: 'Tổng hợp 10 lời từ chối phổ biến nhất (Giá cao, Sợ giọng robot, Đang dùng CRM khác, Gửi qua Zalo trước...) và cách hóa giải', type: 'learn' },
            { id: 't-503', title: 'Thực hành Role-play (Đóng vai tư vấn 1-1) cùng Mentor/Leader để tinh chỉnh giọng điệu và tốc độ nói', type: 'practice' },
            { id: 't-504', title: 'Chuẩn bị bộ công cụ cá nhân: Tin nhắn kết bạn Zalo mẫu, Bộ tài liệu gửi khách sau cuộc gọi đầu tiên', type: 'action' }
        ],
        attachedDocIds: [],
        customLinks: [],
        mentorNote: 'Đừng cố bán ngay sản phẩm trong 30 giây đầu, hãy tập trung lắng nghe quy trình телеsales/CSKH hiện tại của khách hàng đang gặp khó khăn gì.'
    },
    {
        id: 'day-6',
        dayNumber: 'Ngày 6',
        title: 'Tổng kết Onboard, Đánh giá Năng lực & Bắt đầu Thực chiến',
        duration: '08:30 – 17:30',
        goal: 'Hệ thống hóa toàn bộ kiến thức tuần đầu, vượt qua bài test thực hành và sẵn sàng tiếp cận khách hàng thực tế.',
        badgeColor: 'rose',
        tasks: [
            { id: 't-601', title: 'Ôn tập tổng hợp kiến thức sản phẩm Adahub CRM, Callbot AI Ucall và quy trình báo giá', type: 'learn' },
            { id: 't-602', title: 'Thực hiện buổi Pitching / Tư vấn giả định trọn vẹn 1 ca khách hàng từ lúc gọi điện đến lúc gửi Báo giá PDF', type: 'practice' },
            { id: 't-603', title: 'Buổi trò chuyện 1-1 cuối tuần đầu cùng HR & Quản lý: Giải đáp thắc mắc, đóng góp ý kiến và thống nhất mục tiêu tháng đầu', type: 'action' },
            { id: 't-604', title: 'Nhận phân bổ Data khách hàng đầu tiên trên CRM và bắt đầu hành trình chinh phục doanh số tại Etron HCM!', type: 'action' }
        ],
        attachedDocIds: [],
        customLinks: [],
        mentorNote: 'Chúc mừng bạn đã hoàn thành lộ trình Onboard nền tảng! Đội ngũ Etron HCM luôn đồng hành và hỗ trợ bạn trong mọi thương vụ.'
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
        id: 'tpl-hr-offer-letter',
        category: 'offer',
        categoryLabel: 'Mời nhận việc (Offer)',
        title: 'Thư mời nhận việc (Offer Letter) – Vị trí Nhân viên Kinh doanh',
        subject: '[ETRON HCM] THƯ MỜI NHẬN VIỆC (OFFER LETTER) – {{vi_tri}} – {{ten_ung_vien}}',
        content: `Thân gửi {{ten_ung_vien}},

Trước hết, Bộ phận Nhân sự Etron HCM cảm ơn bạn đã dành thời gian tham gia buổi phỏng vấn vừa qua. Chúng tôi đánh giá rất cao sự nhiệt huyết, tư duy và tiềm năng phát triển của bạn.

Etron HCM trân trọng gửi tới {{ten_ung_vien}} lời mời hợp tác tại công ty với các thông tin chi tiết như sau:

1. Vị trí công việc: {{vi_tri}}
2. Bộ phận: Phòng Kinh doanh – Etron HCM (Giải pháp Adahub CRM & Callbot AI Ucall)
3. Ngày bắt đầu làm việc (Onboard): {{gio_onboard}}, {{ngay_onboard}}
4. Địa điểm làm việc: {{dia_diem}}
5. Thời gian thử việc: Theo quy định của công ty (có lộ trình đào tạo bài bản ngay từ tuần đầu tiên)
6. Người hướng dẫn / Liên hệ hỗ trợ: {{nguoi_lien_he}} – SĐT: {{sdt_lien_he}}

Bạn vui lòng phản hồi xác nhận nhận việc qua tin nhắn/email này trước ngày làm việc để bộ phận HR chuẩn bị chu đáo chỗ ngồi và tài khoản hệ thống cho bạn nhé.

Rất mong được chào đón và đồng hành cùng {{ten_ung_vien}} tại Etron HCM!

Trân trọng,
Bộ phận Nhân sự – Etron HCM`,
        updatedAt: Date.now()
    },
    {
        id: 'tpl-hr-interview-invite',
        category: 'interview',
        categoryLabel: 'Mời phỏng vấn',
        title: 'Thư / Tin nhắn mời phỏng vấn ứng viên Sales',
        subject: '[ETRON HCM] Thư mời phỏng vấn vị trí {{vi_tri}} – {{ten_ung_vien}}',
        content: `Chào {{ten_ung_vien}},

Mình liên hệ từ bộ phận Tuyển dụng Nhân sự của Etron HCM (Đơn vị cung cấp giải pháp phần mềm quản lý khách hàng Adahub CRM & Trợ lý ảo tổng đài Callbot AI Ucall).

Sau khi xem qua hồ sơ ứng tuyển của bạn cho vị trí {{vi_tri}}, bên mình nhận thấy định hướng của bạn rất phù hợp với đội ngũ hiện tại. Mình trân trọng mời {{ten_ung_vien}} tham dự buổi trao đổi / phỏng vấn với thông tin sau:

• Thời gian: {{gio_onboard}} ngày {{ngay_onboard}}
• Địa điểm / Hình thức: {{dia_diem}}
• Người phụ trách đón tiếp: {{nguoi_lien_he}} ({{sdt_lien_he}})

{{ten_ung_vien}} vui lòng phản hồi lại tin nhắn này để xác nhận lịch hẹn nhé. Hẹn gặp bạn tại buổi trao đổi!`,
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
