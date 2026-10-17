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
        title: 'Hội Nhập Công Ty, Văn Hóa Etron, Quy Định & Thiết Lập Công Cụ',
        duration: '08:30 – 18:00 (Nghỉ trưa: 12:00 – 13:30)',
        goal: 'Hiểu về công ty, tầm nhìn sứ mệnh, cơ cấu tổ chức các phòng ban, hệ sinh thái sản phẩm, nắm vững chính sách sale và chuẩn bị đầy đủ công cụ làm việc.',
        badgeColor: 'indigo',
        trainer: 'Nguyễn Thủy Tiên',
        tasks: [
            {
                id: 'm-101',
                title: 'Module 1: Giới thiệu công ty',
                type: 'learn',
                activity: 'Giới thiệu về công ty Etron, tầm nhìn, sứ mệnh, cơ cấu tổ chức, các phòng ban chính và cách phối hợp làm việc.',
                outcome: 'Trình bày được cơ cấu tổ chức của công ty; nêu được chức năng các phòng ban chính; biết đầu mối liên hệ khi cần phối hợp công việc.',
                links: [
                    { title: 'Slide Giới thiệu công ty & Cơ cấu tổ chức', url: 'https://drive.google.com/file/d/1oI19ZE7BUm55qoma_d65fw7N44MwULsc/view?usp=sharing', type: 'external' },
                    { title: 'Thư mục tài liệu tham khảo chung Etron', url: 'https://drive.google.com/drive/folders/1E2RJWKPbq-7OdXYmgGS-Iic9rIa59G1Q?usp=drive_link', type: 'external' }
                ]
            },
            {
                id: 'm-102',
                title: 'Module 2: Văn hóa & Quy định làm việc',
                type: 'learn',
                activity: 'Nội quy làm việc, quy chế ứng xử, quy trình chấm công, xin nghỉ phép, báo cáo công việc và văn hóa doanh nghiệp Etron.',
                outcome: 'Đã đọc và hiểu nội quy công ty, nắm vững quy trình chấm công, xin nghỉ phép và báo cáo công việc hàng ngày.',
                links: [
                    { title: 'Tài liệu Nội quy & Văn hóa làm việc Etron', url: 'https://docs.google.com/document/d/1TUp4Nam4AKsslvIP6HrlErfN9NosOLP-sI22PdlJLFk/edit?tab=t.0', type: 'external' }
                ]
            },
            {
                id: 'm-103',
                title: 'Module 3: Tổng quan hệ sinh thái sản phẩm',
                type: 'learn',
                activity: 'Giới thiệu hệ sinh thái sản phẩm Etron: Sản phẩm chủ lực (Trợ lý ảo Callbot AI Ucall, Phần mềm CSKH Adahub CRM, Tổng đài VoIP), sản phẩm mở rộng và chân dung khách hàng mục tiêu.',
                outcome: 'Mô tả được chức năng cơ bản của từng sản phẩm, xác định sản phẩm chủ lực và bài toán mà từng sản phẩm giải quyết cho doanh nghiệp.',
                links: [
                    { title: 'Slide Tổng quan Hệ sinh thái Etron', url: 'https://drive.google.com/file/d/1_Y0BSuXJzm0xD40Sgz-Xliv2_vySQlsR/view?usp=sharing', type: 'external' }
                ]
            },
            {
                id: 'm-104',
                title: 'Module 4: Thiết lập công cụ làm việc',
                type: 'action',
                activity: 'Tạo và đăng nhập tài khoản phục vụ công việc: Email công ty, Admin, UCALL portal (app.ucall.vn & staging), tham gia các nhóm chat Zalo nội bộ, mở Kho tài liệu SalesHub.',
                outcome: 'Đăng nhập thành công tất cả tài khoản được cấp, gia nhập đầy đủ nhóm làm việc nội bộ và kiểm tra các công cụ sẵn sàng.',
                links: [
                    { title: 'Mở Kho Tài Liệu Etron SalesHub', url: 'index.html?tab=documents', type: 'internal' }
                ]
            },
            {
                id: 'm-105',
                title: 'Module 5: Chính sách SALE & Cơ chế hoa hồng',
                type: 'learn',
                activity: 'Tìm hiểu chính sách sales, định nghĩa và thuật ngữ sale, KPI cá nhân/team, cơ chế tính hoa hồng và các level thăng tiến tại Etron.',
                outcome: 'Nắm rõ các định nghĩa, thuật ngữ sale, hiểu cách tính hoa hồng và lộ trình thăng tiến level KPI.',
                links: [
                    { title: 'Chính sách Sale & Quy chế KPI Etron', url: 'https://docs.google.com/document/d/1Ys5zRhMs16a07fwD-c4ka_DL-VazDRKRaGyJDV0PzWk/edit?tab=t.0', type: 'external' },
                    { title: 'Bảng Mức lương theo Level KPI', url: 'https://docs.google.com/spreadsheets/d/1PHHfU_FM2Hf7eKJTIhH7tZEhsgptb4ZlH6uoIX0XuoU/edit?usp=sharing', type: 'external' }
                ]
            },
            {
                id: 'm-106',
                title: 'Module 6: Bài tập thực hành Ngày 1',
                type: 'practice',
                activity: 'Thực hiện bài tập tổng kết: Tóm tắt lại các lợi ích, giải pháp cốt lõi của công ty và giải pháp đó hỗ trợ giải quyết bài toán gì cho khách hàng.',
                outcome: 'Nộp bản tóm tắt cho người hướng dẫn và được giải đáp thắc mắc cuối ngày.',
                links: []
            }
        ],
        attachedDocIds: [],
        customLinks: [],
        mentorNote: 'Phụ trách: Nguyễn Thủy Tiên. Ngày đầu tiên bạn thoải mái làm quen môi trường, thiết lập đầy đủ công cụ và ghi chú lại các thắc mắc để được giải đáp nhé!'
    },
    {
        id: 'day-2',
        dayNumber: 'Ngày 2',
        title: 'Đào Tạo Chuyên Sâu Sản Phẩm Trợ Lý Ảo Callbot AI Ucall',
        duration: '08:30 – 18:00 (Nghỉ trưa: 12:00 – 13:30)',
        goal: 'Trình bày được tổng quan, nguyên lý hoạt động và quy trình vận hành Callbot; thành thạo xây dựng kịch bản và setup chiến dịch gọi tự động.',
        badgeColor: 'blue',
        trainer: 'Nguyễn Thủy Tiên',
        tasks: [
            {
                id: 'm-201',
                title: 'Module 1: Tổng quan sản phẩm Callbot AI',
                type: 'learn',
                activity: 'Tổng quan công nghệ Callbot AI Voice Bot, nguyên lý nhận diện giọng nói (STT), xử lý ngôn ngữ tự nhiên (NLU), chuyển đổi văn bản thành giọng nói (TTS) và bài toán tối ưu chi phí vận hành cho doanh nghiệp.',
                outcome: 'Trình bày được tổng quan công nghệ và quy trình hoạt động của Callbot trong thực tế.',
                links: [
                    { title: 'Video Đào tạo Callbot & Kịch bản', url: 'https://drive.google.com/file/d/1GYV3gLQu-3_8KuntZI7B7MWjouHAhsgh/view?usp=sharing', type: 'external' },
                    { title: 'Cổng Quản Trị Callbot Ucall', url: 'https://app.ucall.vn', type: 'external' }
                ]
            },
            {
                id: 'm-202',
                title: 'Module 2: Phân loại bot & Tính cước phút gọi',
                type: 'learn',
                activity: 'Phân loại các gói bot: CB2 (45N), CB3 (90N), CB4 (120N), cách tính cước theo phút gọi phát sinh và cách tư vấn gói bot tối ưu cho từng lĩnh vực ngành nghề.',
                outcome: 'Tư vấn đúng loại bot theo nhu cầu và ngân sách của khách hàng.',
                links: [
                    { title: 'Kho Kịch Bản & Ghi Âm Mẫu trên SalesHub', url: 'index.html?tab=callbot-hub', type: 'internal' }
                ]
            },
            {
                id: 'm-203',
                title: 'Module 3: Xây dựng kịch bản Callbot',
                type: 'learn',
                activity: 'Kỹ thuật thiết kế luồng hội thoại, tạo intent câu hỏi - câu trả lời, xử lý ngắt lời khi khách nói và xây dựng kịch bản rẽ nhánh thông minh.',
                outcome: 'Tự lên được luồng kịch bản sơ bộ cho một ngành nghề cụ thể (BĐS, Tài chính, Tuyển sinh).',
                links: [
                    { title: 'Video Đào tạo Callbot & Kịch bản', url: 'https://drive.google.com/file/d/1GYV3gLQu-3_8KuntZI7B7MWjouHAhsgh/view?usp=sharing', type: 'external' }
                ]
            },
            {
                id: 'm-204',
                title: 'Module 4: Thực hành & Chữa kịch bản Callbot',
                type: 'practice',
                activity: 'Thực hành tạo kịch bản thực tế trên hệ thống và được Trainer / Mentor chữa trực tiếp từng câu intent.',
                outcome: 'Hoàn thiện 01 kịch bản Callbot hoàn chỉnh chuẩn kịch bản bán hàng.',
                links: []
            },
            {
                id: 'm-205',
                title: 'Module 5: Thiết lập và chạy chiến dịch gọi thử nghiệm',
                type: 'practice',
                activity: 'Thao tác tạo chiến dịch gọi tự động trên app.ucall.vn, import danh sách số điện thoại test, gán kịch bản bot, kiểm tra báo cáo cuộc gọi và nghe lại ghi âm bot gọi.',
                outcome: 'Tự tạo và chạy thành công 01 chiến dịch test, đọc hiểu các trường trong báo cáo cuộc gọi.',
                links: [
                    { title: 'Hệ thống Quản lý Callbot Ucall', url: 'https://app.ucall.vn', type: 'external' }
                ]
            }
        ],
        attachedDocIds: [],
        customLinks: [],
        mentorNote: 'Phụ trách: Nguyễn Thủy Tiên. Nghe kỹ các file ghi âm mẫu trên SalesHub để cảm nhận cách Callbot AI phản hồi thông minh nhé!'
    },
    {
        id: 'day-3',
        dayNumber: 'Ngày 3',
        title: 'Phần Mềm Quản Lý CSKH Adahub CRM, Dịch Vụ ZNS & Dashboard KPI',
        duration: '08:30 – 18:00 (Nghỉ trưa: 12:00 – 13:30)',
        goal: 'Làm chủ hệ thống Adahub CRM, quy trình đăng ký & gửi tin Zalo ZNS và biết cách theo dõi chỉ số hiệu quả trên Dashboard KPI.',
        badgeColor: 'amber',
        trainer: 'Nguyễn Thủy Tiên',
        tasks: [
            {
                id: 'm-301',
                title: 'Module 1: Tổng quan hệ thống Adahub CRM',
                type: 'learn',
                activity: 'Vai trò của CRM trong quy trình bán hàng B2B, quản lý lead, phân bổ khách hàng tiềm năng, lưu trữ lịch sử tương tác và phễu chuyển đổi bán hàng.',
                outcome: 'Trình bày được vai trò của CRM và các phân hệ chức năng chính.',
                links: [
                    { title: 'HDSD & Video Hướng dẫn Adahub CRM', url: 'https://docs.google.com/spreadsheets/d/1WENMoEByRAPrKGWulpPVyv5255LBNkqbCjyXWRxQJGs/edit?gid=1630288305#gid=1630288305', type: 'external' }
                ]
            },
            {
                id: 'm-302',
                title: 'Module 2: Các tính năng Adahub CRM chi tiết',
                type: 'practice',
                activity: 'Thực hành thao tác tạo contact, chia deal, cập nhật trạng thái pipeline, gắn tag phân loại, đặt lịch nhắc hẹn và ghi nhận lịch sử tương tác.',
                outcome: 'Sử dụng thành thạo CRM để quản lý khách hàng hàng ngày.',
                links: [
                    { title: 'HDSD & Video Hướng dẫn Adahub CRM', url: 'https://docs.google.com/spreadsheets/d/1WENMoEByRAPrKGWulpPVyv5255LBNkqbCjyXWRxQJGs/edit?gid=1630288305#gid=1630288305', type: 'external' }
                ]
            },
            {
                id: 'm-303',
                title: 'Module 3: Giải pháp ZNS & Quy trình tích hợp',
                type: 'learn',
                activity: 'Giới thiệu về Zalo Notification Service (ZNS), các loại mẫu tin chăm sóc khách hàng, chi phí gửi tin và quy trình kiểm duyệt mẫu tin Zalo OA.',
                outcome: 'Nắm được quy trình gửi tin ZNS tự động từ hệ thống Callbot/CRM đến Zalo của khách hàng.',
                links: [
                    { title: 'Slide Đào tạo Zalo ZNS', url: 'https://drive.google.com/file/d/10ZoR56MtKPpgy941pW61Sk5hsqZwBRio/view?usp=drive_link', type: 'external' },
                    { title: 'Quy trình Vận hành ZNS', url: 'https://drive.google.com/file/d/1JAiRRcL2EFO1bKt7AM4bOHz3oShTyrFz/view?usp=drive_link', type: 'external' }
                ]
            },
            {
                id: 'm-304',
                title: 'Module 4: Dashboard & Quản lý KPI Bán hàng',
                type: 'practice',
                activity: 'Hướng dẫn đọc báo cáo chỉ số cuộc gọi, tỷ lệ chuyển đổi, doanh số cá nhân và báo cáo tiến độ tuần/tháng trên hệ thống Dashboard.',
                outcome: 'Biết cách tự theo dõi mục tiêu doanh số và báo cáo kết quả định kỳ cho quản lý.',
                links: [
                    { title: 'Thư mục Dashboard & KPI Bán hàng', url: 'https://drive.google.com/drive/folders/11dYYmc8GL7MxCoovDEsDgxC4rB_fLnGY?usp=drive_link', type: 'external' }
                ]
            }
        ],
        attachedDocIds: [],
        customLinks: [],
        mentorNote: 'Phụ trách: Nguyễn Thủy Tiên. CRM là công cụ sống còn của Sales, hãy thực hành nhập thử lead và quản lý deal để quen tay.'
    },
    {
        id: 'day-4',
        dayNumber: 'Ngày 4',
        title: 'Hệ Thống Tổng Đài VoIP, Quay Số Telesale Tự Động & Các Loại Đầu Số',
        duration: '08:30 – 18:00 (Nghỉ trưa: 12:00 – 13:30)',
        goal: 'Trình bày được chức năng tổng đài, phân biệt chính xác các loại đầu số viễn thông và tự thiết lập chiến dịch quay số telesale.',
        badgeColor: 'emerald',
        trainer: 'Nguyễn Thủy Tiên',
        tasks: [
            {
                id: 'm-401',
                title: 'Module 1: Tổng quan hệ thống Tổng đài VoIP',
                type: 'learn',
                activity: 'Lợi ích của tổng đài Cloud VoIP, tính năng ghi âm cuộc gọi, chuyển tiếp máy nhánh, định tuyến thông minh và tích hợp phần mềm CRM.',
                outcome: 'Trình bày được chức năng và lợi ích của giải pháp tổng đài đám mây so với tổng đài truyền thống.',
                links: [
                    { title: 'Kho Tài Liệu Tổng Hợp Sản Phẩm & Đầu Số', url: 'index.html?tab=documents', type: 'internal' }
                ]
            },
            {
                id: 'm-402',
                title: 'Module 2: Quay số Telesale tự động (Auto Dialer)',
                type: 'practice',
                activity: 'Nguyên lý hoạt động của hệ thống quay số tự động (Progressive / Predictive dialer), tự tạo chiến dịch gọi, cài đặt thông số cuộc gọi và phân tích các trường hợp ứng dụng.',
                outcome: 'Tự tạo được chiến dịch quay số phục vụ công việc gọi điện hàng ngày.',
                links: [
                    { title: 'Kho Tài Liệu Tổng Hợp Sản Phẩm & Đầu Số', url: 'index.html?tab=documents', type: 'internal' }
                ]
            },
            {
                id: 'm-403',
                title: 'Module 3: Tìm hiểu các loại Đầu số viễn thông',
                type: 'learn',
                activity: 'Phân loại các đầu số phổ biến trên thị trường: Đầu số cố định (024/028), đầu số di động doanh nghiệp, đầu số 1800/1900 và Voice Brandname (hiển thị tên thương hiệu).',
                outcome: 'Phân biệt chính xác ưu nhược điểm, chi phí và thủ tục đăng ký từng loại đầu số.',
                links: [
                    { title: 'Bảng Giá & Tra Cứu Cước Đầu Số', url: 'index.html?tab=documents', type: 'internal' }
                ]
            },
            {
                id: 'm-404',
                title: 'Module 4: Tư vấn phương án đầu số tối ưu cho khách hàng',
                type: 'learn',
                activity: 'Phân tích nhu cầu từng ngành để tư vấn đúng loại đầu số, tối ưu chi phí cước viễn thông và nâng cao tỷ lệ bắt máy.',
                outcome: 'Đưa ra được giải pháp đầu số phù hợp khi khách hàng yêu cầu phương án gọi ra/gọi vào.',
                links: []
            }
        ],
        attachedDocIds: [],
        customLinks: [],
        mentorNote: 'Phụ trách: Nguyễn Thủy Tiên. Hiểu đúng đầu số và cước viễn thông sẽ giúp bạn tư vấn phương án tiết kiệm nhất cho khách hàng.'
    },
    {
        id: 'day-5',
        dayNumber: 'Ngày 5',
        title: 'Chính Sách Bán Hàng, Bảng Giá, Quy Trình Thanh Toán & Lập Báo Giá',
        duration: '08:30 – 18:00 (Nghỉ trưa: 12:00 – 13:30)',
        goal: 'Thuộc lòng bảng giá các gói sản phẩm, quy trình thanh toán, xuất hóa đơn VAT và thành thạo công cụ lập báo giá PDF trên SalesHub trong 2 phút.',
        badgeColor: 'violet',
        trainer: 'Nguyễn Thủy Tiên',
        tasks: [
            {
                id: 'm-501',
                title: 'Module 1: Giá sản phẩm & Gói dịch vụ',
                type: 'learn',
                activity: 'Phân tích chi tiết bảng giá các gói dịch vụ: Phút gọi Ucall, phí khởi tạo/triển khai, phí duy trì tổng đài hàng tháng, gói Adahub CRM và các gói combo tích hợp.',
                outcome: 'Tư vấn chuẩn xác giá thành các gói theo từng quy mô và nhu cầu khách hàng.',
                links: [
                    { title: 'Bảng Mức lương & Chính sách Bán hàng Etron', url: 'https://docs.google.com/spreadsheets/d/1PHHfU_FM2Hf7eKJTIhH7tZEhsgptb4ZlH6uoIX0XuoU/edit?usp=sharing', type: 'external' }
                ]
            },
            {
                id: 'm-502',
                title: 'Module 2: Quy trình thanh toán & Hợp đồng',
                type: 'learn',
                activity: 'Nắm vững quy trình thanh toán (tạm ứng, đặt cọc, thanh toán đợt cuối), quy trình ký kết hợp đồng, bảo mật thông tin và thủ tục kích hoạt dịch vụ.',
                outcome: 'Tư vấn đúng quy trình pháp lý và thanh toán cho khách hàng theo đúng quy chế công ty.',
                links: [
                    { title: 'Tài liệu Quy trình Hợp đồng & Thanh toán', url: 'https://docs.google.com/document/d/1TUp4Nam4AKsslvIP6HrlErfN9NosOLP-sI22PdlJLFk/edit?tab=t.0', type: 'external' }
                ]
            },
            {
                id: 'm-503',
                title: 'Module 3: Chính sách xuất hóa đơn VAT điện tử',
                type: 'learn',
                activity: 'Hướng dẫn thông tin cần lấy từ khách hàng (Tên công ty, MST, địa chỉ đăng ký kinh doanh, email nhận hóa đơn) và quy trình kế toán xuất hóa đơn VAT.',
                outcome: 'Thu thập đầy đủ thông tin chuẩn xác và phối hợp mượt mà với kế toán công ty.',
                links: []
            },
            {
                id: 'm-504',
                title: 'Module 4: Thực hành Lập Báo Giá trên Etron SalesHub',
                type: 'practice',
                activity: 'Sử dụng công cụ Tạo Báo Giá Online trên Etron SalesHub để tự tạo 02 bản báo giá PDF hoàn chỉnh (01 bản Callbot AI, 01 bản Adahub CRM/Tổng đài) và gửi cho Trainer duyệt.',
                outcome: 'Thành thạo lập báo giá chuyên nghiệp chỉ trong 2 phút.',
                links: [
                    { title: 'Công cụ Tạo Báo Giá Online Etron SalesHub', url: 'index.html?tab=quote-builder', type: 'internal' }
                ]
            }
        ],
        attachedDocIds: [],
        customLinks: [],
        mentorNote: 'Phụ trách: Nguyễn Thủy Tiên. Hãy tận dụng công cụ Báo giá trên SalesHub để có thể tạo báo giá gửi khách ngay trên điện thoại hoặc máy tính nhé!'
    },
    {
        id: 'day-6',
        dayNumber: 'Ngày 6',
        title: 'Quy Trình Bán Hàng & Kỹ Năng Gọi Điện Tiếp Cận Chuyên Sâu',
        duration: '08:30 – 18:00 (Nghỉ trưa: 12:00 – 13:30)',
        goal: 'Nắm vững quy trình bán hàng B2B từ đầu đến cuối; thành thạo kỹ năng gọi điện tiếp cận, kịch bản mở lời, khơi gợi nhu cầu và chốt lịch hẹn meeting.',
        badgeColor: 'rose',
        trainer: 'Nguyễn Thủy Tiên',
        tasks: [
            {
                id: 'm-601',
                title: 'Module 1: Tổng quan Quy trình bán hàng B2B',
                type: 'learn',
                activity: 'Quy trình bán hàng chuẩn từ tiếp nhận lead, phân loại tiềm năng, tiếp cận ban đầu, hẹn meeting demo, gửi báo giá, follow-up đến chốt ký hợp đồng và phối hợp chăm sóc.',
                outcome: 'Trình bày trọn vẹn các bước trong phễu bán hàng B2B và cách phối hợp nhịp nhàng giữa các bộ phận.',
                links: [
                    { title: 'Quy trình Bán hàng Tổng quan', url: 'https://drive.google.com/file/d/1X31uPVx7M7TLYoEoBUimK98DEMXXbM99/view?usp=drive_link', type: 'external' }
                ]
            },
            {
                id: 'm-602',
                title: 'Module 2: Kỹ năng tiếp cận khách hàng & Kịch bản gọi điện',
                type: 'learn',
                activity: 'Kỹ thuật gọi điện telesale B2B chuyên sâu: 10 giây mở lời gây ấn tượng, cách vượt qua lễ tân, kỹ thuật khơi gợi nỗi đau vận hành doanh nghiệp và kỹ năng chốt hẹn lịch meeting.',
                outcome: 'Thành thạo cấu trúc cuộc gọi tiếp cận và sẵn sàng kịch bản gọi cho từng ngành mục tiêu.',
                links: [
                    { title: 'Tài liệu Training Tiếp cận Khách hàng', url: 'https://drive.google.com/file/d/1X31uPVx7M7TLYoEoBUimK98DEMXXbM99/view?usp=drive_link', type: 'external' },
                    { title: 'Các mẫu kịch bản gọi điện tiếp cận', url: 'https://docs.google.com/document/d/1Objection_Handling_Scripts', type: 'external' }
                ]
            },
            {
                id: 'm-603',
                title: 'Module 3: Xử lý từ chối trong cuộc gọi đầu tiên',
                type: 'learn',
                activity: 'Phân tích các tình huống khách hàng từ chối phổ biến khi nhận cuộc gọi đầu (Bận, Không có nhu cầu, Đã có giải pháp, Gửi mail xem sau...) và phương pháp ứng biến linh hoạt.',
                outcome: 'Áp dụng các mẫu câu xử lý từ chối để giữ được cuộc hội thoại và chuyển hóa thành lịch hẹn.',
                links: [
                    { title: 'Tài liệu Xử lý từ chối trong Cuộc gọi đầu', url: 'https://docs.google.com/spreadsheets/d/1W0OI6WOPbey0fD8f6AW8cwFhEnD5RXGjyi_yDSQfo9M/edit?gid=0#gid=0', type: 'external' }
                ]
            },
            {
                id: 'm-604',
                title: 'Module 4: Thực hành gọi điện 1-1 cùng Trainer',
                type: 'practice',
                activity: 'Role-play thực tế 1-1 với Trainer/Mentor đóng vai khách hàng khó tính, được chỉnh sửa ngữ điệu, tốc độ nói và cách xử lý từ chối ngay lập tức.',
                outcome: 'Tự tin thực hiện cuộc gọi thực tế và vượt qua bài test kỹ năng gọi điện.',
                links: []
            }
        ],
        attachedDocIds: [],
        customLinks: [],
        mentorNote: 'Phụ trách: Nguyễn Thủy Tiên. Gọi điện tiếp cận là chìa khóa mở ra các cơ hội bán hàng lớn, hãy tự tin vào giá trị giải pháp Etron mang lại!'
    },
    {
        id: 'day-7',
        dayNumber: 'Ngày 7',
        title: 'Kỹ Năng Meeting Tư Vấn, Demo Giải Pháp & Hướng Dẫn Sử Dụng (HDSD)',
        duration: '08:30 – 18:00 (Nghỉ trưa: 12:00 – 13:30)',
        goal: 'Làm chủ cấu trúc buổi Meeting demo giải pháp với khách hàng doanh nghiệp; thành thạo quy trình HDSD sản phẩm và kỹ thuật chốt deal sau demo.',
        badgeColor: 'blue',
        trainer: 'Nguyễn Thủy Tiên',
        tasks: [
            {
                id: 'm-701',
                title: 'Module 1: Kỹ năng Meeting tư vấn & Demo sản phẩm',
                type: 'learn',
                activity: 'Cấu trúc buổi Meeting chuẩn (Online Google Meet / Offline trực tiếp): Chuẩn bị trước meeting, giới thiệu giải pháp, lắng nghe nhu cầu sâu, trình diễn demo sản phẩm thực tế và chốt bán.',
                outcome: 'Nắm vững cấu trúc buổi Meeting, tự tin dẫn dắt demo sản phẩm theo đúng nỗi đau của khách hàng.',
                links: [
                    { title: 'Tài liệu Đào tạo Kỹ năng Meeting tư vấn', url: 'https://drive.google.com/file/d/1X31uPVx7M7TLYoEoBUimK98DEMXXbM99/view?usp=drive_link', type: 'external' }
                ]
            },
            {
                id: 'm-702',
                title: 'Module 2: Đào tạo kỹ năng Meeting HDSD chuẩn',
                type: 'learn',
                activity: 'Quy trình tổ chức meeting Hướng dẫn sử dụng (HDSD) chuẩn sau khi khách hàng đồng ý giải pháp, phối hợp cùng đội ngũ CS Ucall để onboarding khách hàng mượt mà.',
                outcome: 'Nắm được các bước bàn giao tài khoản, hướng dẫn khách hàng tạo chiến dịch đầu tiên và thiết lập tổng đài.',
                links: [
                    { title: 'Quy chuẩn HDSD Sản phẩm', url: 'https://docs.google.com/spreadsheets/d/1WENMoEByRAPrKGWulpPVyv5255LBNkqbCjyXWRxQJGs/edit?usp=sharing', type: 'external' }
                ]
            },
            {
                id: 'm-703',
                title: 'Module 3: Follow-up khách hàng mới & Chốt bán sau meeting',
                type: 'practice',
                activity: 'Thời điểm vàng để follow-up sau meeting, kịch bản gửi bản ghi tóm tắt meeting, phương pháp giải tỏa các nỗi lo do dự và kỹ thuật chốt deal B2B dứt khoát.',
                outcome: 'Áp dụng quy trình follow-up có hệ thống, không để mất dấu khách hàng tiềm năng sau buổi demo.',
                links: [
                    { title: 'Slide Quy trình Follow-up Khách hàng mới', url: 'https://drive.google.com/file/d/1fZVR-cbDyR4QSVs6aBf-9R6VObGDgzP6/view?usp=drive_link', type: 'external' },
                    { title: 'Bảng Thực hành Follow-up & Chốt bán', url: 'https://docs.google.com/spreadsheets/d/1BuAw6TUex45zMTMFpwAv5-pCIZ98xSGQ/edit?gid=1484021979#gid=1484021979', type: 'external' }
                ]
            },
            {
                id: 'm-704',
                title: 'Module 4: Xử lý từ chối sau meeting',
                type: 'learn',
                activity: 'Phân tích các case thực tế khách hàng từ chối sau demo (Giá cao hơn dự toán, Cần hỏi ý kiến sếp/ban giám đốc, So sánh với phần mềm khác...).',
                outcome: 'Biết cách đưa ra đề xuất giá trị bổ sung (Value Proposition) và phương án chốt thử nghiệm để thúc đẩy ký hợp đồng.',
                links: [
                    { title: 'Tài liệu Xử lý từ chối Sau Meeting', url: 'https://docs.google.com/spreadsheets/d/1llpeQn2eF1HOyP3u_Hyt712ja33Kp09FEq6w3kfTzn0/edit?gid=0#gid=0', type: 'external' }
                ]
            }
        ],
        attachedDocIds: [],
        customLinks: [],
        mentorNote: 'Phụ trách: Nguyễn Thủy Tiên. Meeting là lúc bạn thể hiện sự chuyên nghiệp và uy tín của Etron, chuẩn bị chu đáo trước buổi hẹn nhé!'
    },
    {
        id: 'day-8',
        dayNumber: 'Ngày 8',
        title: 'Nghiên Cứu Tài Liệu Tổng Hợp, Thị Trường, Đối Thủ & Customer Success',
        duration: '08:30 – 18:00 (Nghỉ trưa: 12:00 – 13:30)',
        goal: 'Đọc và nghiên cứu toàn diện bộ tài liệu thị trường, phân tích đối thủ cạnh tranh, tư duy giữ chân khách hàng và sẵn sàng nhận data khách hàng thực chiến.',
        badgeColor: 'emerald',
        trainer: 'Nguyễn Thủy Tiên',
        tasks: [
            {
                id: 'm-801',
                title: 'Module 1: Nghiên cứu thị trường & Phân tích đối thủ cạnh tranh',
                type: 'learn',
                activity: 'Đọc tài liệu chuyên sâu về thị trường Callbot AI và CRM tại Việt Nam; phân tích điểm mạnh, điểm yếu và mức giá của các đối thủ cạnh tranh chính trên thị trường.',
                outcome: 'Nắm vững lợi thế cạnh tranh cốt lõi (USP) của Etron và Ucall để tự tin tư vấn so sánh khi khách hàng hỏi.',
                links: [
                    { title: 'Slide Nghiên cứu Thị trường & Đối thủ (Canva)', url: 'https://www.canva.com/design/DAGeYgc3CKI/tbnk0J5nP7TU7aPYJoWohA/edit?utm_content=DAGeYgc3CKI&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton', type: 'external' }
                ]
            },
            {
                id: 'm-802',
                title: 'Module 2: Customer Success & Giữ chân khách hàng',
                type: 'learn',
                activity: 'Nghiên cứu tài liệu Customer Success, tư duy đồng hành hỗ trợ khách hàng đạt hiệu quả kinh doanh, chính sách gia hạn dịch vụ và chiến lược up-sell/cross-sell.',
                outcome: 'Hiểu rõ tầm quan trọng của việc giữ chân khách hàng và vai trò của Sales trong giai đoạn sau bán.',
                links: [
                    { title: 'Slide Customer Success & Giữ chân KH (Canva)', url: 'https://www.canva.com/design/DAGfEmymcN0/kOrtb6br4ulOfT_-DR65TA/edit?utm_content=DAGfEmymcN0&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton', type: 'external' }
                ]
            },
            {
                id: 'm-803',
                title: 'Module 3: Tổng ôn tài liệu & Rèn luyện kỹ năng thực chiến',
                type: 'practice',
                activity: 'Nghe lại các file recording cuộc gọi xuất sắc của các Top Performer, xem recording các buổi meeting mẫu thành công và hoàn thành bài đánh giá kết thúc tuần Onboard.',
                outcome: 'Hoàn tất toàn bộ lộ trình 8 ngày đào tạo nền tảng, sẵn sàng nhận data chính thức trên CRM.',
                links: [
                    { title: 'Kho Kịch Bản & Ghi Âm Mẫu trên SalesHub', url: 'index.html?tab=callbot-hub', type: 'internal' },
                    { title: 'Kho Tài Liệu Tổng Hợp SalesHub', url: 'index.html?tab=documents', type: 'internal' }
                ]
            },
            {
                id: 'm-804',
                title: 'Module 4: Nhận Data khách hàng đầu tiên & Bắt đầu hành trình Etron!',
                type: 'action',
                activity: 'Trainer / Quản lý bàn giao danh sách data khách hàng đầu tiên trên Adahub CRM, thiết lập mục tiêu tuần đầu tiên và chính thức bắt đầu công việc kinh doanh.',
                outcome: 'Bắt đầu thực hiện những cuộc gọi đầu tiên với sự đồng hành 1-1 của mentor.',
                links: []
            }
        ],
        attachedDocIds: [],
        customLinks: [],
        mentorNote: 'Phụ trách: Nguyễn Thủy Tiên. Chúc mừng bạn đã hoàn thành lộ trình đào tạo 8 ngày! Chúc bạn bứt phá doanh số và gặt hái nhiều thành công tại Etron HCM!'
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
