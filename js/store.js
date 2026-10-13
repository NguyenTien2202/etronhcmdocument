/**
 * Store & Data Persistence Layer
 * Cấu hình chuẩn xác cho: CÔNG TY CỔ PHẦN GIẢI PHÁP ETRON (ETRON SOLUTIONS JSC)
 * Dữ liệu đồng bộ trực tiếp từ Salekit Etron chính thức (Adahub CRM & Callbot AI UCALL)
 */

const STORAGE_KEYS = {
    COMPANY: 'saleshub_company',
    PRODUCTS: 'saleshub_products',
    DOCUMENTS: 'saleshub_documents',
    DOCUMENT_CATEGORIES: 'saleshub_document_categories',
    QUOTES: 'saleshub_quotes',
    CUSTOMERS: 'saleshub_customers',
    INITIALIZED: 'saleshub_etron_salekit_v2026_pricing_v9'
};

// Danh mục tài liệu mặc định chuẩn Etron
const DEFAULT_DOCUMENT_CATEGORIES = [
    { id: 'cat-bang-gia', name: 'Bảng giá chính thức', icon: 'file-text' },
    { id: 'cat-bao-gia', name: 'Báo giá & Mẫu biểu', icon: 'file-spreadsheet' },
    { id: 'cat-salekit', name: 'Salekit & Giới thiệu', icon: 'sparkles' },
    { id: 'cat-chinh-sach', name: 'Chính sách bán hàng', icon: 'shield-check' },
    { id: 'cat-cskh', name: 'Hỗ trợ & Chăm sóc khách hàng', icon: 'life-buoy' },
    { id: 'cat-dao-tao', name: 'Tài liệu đào tạo', icon: 'book-open' }
];

// Initial Seed Data - ETRON SOLUTIONS JSC
const DEFAULT_COMPANY = {
    name: 'CÔNG TY CỔ PHẦN GIẢI PHÁP ETRON',
    tradeName: 'ETRON SOLUTIONS JSC',
    taxCode: '0110415751',
    address: 'A24/D7 ngõ 66 Khúc Thừa Dụ, Dịch Vọng, Cầu Giấy, Hà Nội',
    phone: '024 8888 9966',
    email: 'contact@etron.vn',
    website: 'https://etron.vn',
    bankName: 'Ngân hàng TMCP Quân đội',
    bankAccount: '999998887777',
    bankAccountName: 'CONG TY CP GIAI PHAP ETRON',
    logoUrl: 'assets/logo_etron_new.png',
    directorName: 'Đỗ Thị Thùy Liên',
    directorTitle: 'Giám Đốc Kinh Doanh',
    stampUrl: '',
    defaultTerms: [
        'Báo giá có hiệu lực đến ngày cuối tháng.',
        'Phần mềm CRM, Callbot và dịch vụ đi kèm chưa bao gồm thuế VAT 8%.',
        'Phần mềm CRM tính theo user/tháng, thanh toán theo năm. Thời hạn dưới 12 tháng áp dụng đơn giá riêng (Tổng đài: 50.000₫, Standard: 100.000₫, Advanced: 250.000₫/user/tháng).',
        'Callbot tính theo block 6 giây theo loại bot (Standard, Advanced, AI Call Agent). Cước gọi đầu số chung cố định 70đ/block; đầu số riêng di động 80đ/block; đầu số riêng cố định 70đ/block; Brandname 70đ/block; đầu số khách tự chuẩn bị 0đ/block (khách tự thanh toán với nhà mạng). Trong vòng 90 ngày sau khi hết hạn gói, có thể gia hạn với phí bằng 30% số dư còn lại.',
        'Cước gọi tổng đài trừ vào ví cước: Đầu số chung cố định 700đ/phút; Đầu số riêng cố định 660đ/phút; Đầu số riêng di động 720đ/phút; Đầu số Brandname 660đ/phút (đã gồm VAT 10%).',
        'Đầu số và cước viễn thông thanh toán trả trước vào ví cước (tối thiểu 1.000.000₫, đã gồm VAT 10%), phí khởi tạo/duy trì đầu số và cước cuộc gọi thực tế trừ dần vào ví cước.',
        'Thông tin thanh toán: Ngân hàng TMCP Quân đội (MBBank) - Số TK: 999998887777 - CONG TY CP GIAI PHAP ETRON.'
    ]
};

// Bảng giá sản phẩm chính thức từ Etron Salekit (CRM Adahub, Callbot AI UCALL & Viễn Thông)
const DEFAULT_PRODUCTS = [
    // 1. PHẦN MỀM ADAHUB CRM
    {
        id: 'crm-tong-dai',
        code: 'CRM-TD',
        name: 'Phần mềm Adahub CRM - Gói Tổng Đài',
        category: 'Phần mềm CRM',
        unit: 'User/tháng',
        price: 40000,
        description: 'Tổng đài gọi điện, Quản lý khách hàng, Mobile App, Dashboard báo cáo, Tự động hoá 100 credits/tháng. (Thời hạn <12 tháng: 50.000₫/user/tháng)',
        warranty: 'SLA 99.5%'
    },
    {
        id: 'crm-standard',
        code: 'CRM-STD',
        name: 'Phần mềm Adahub CRM - Gói Standard (Khuyên dùng)',
        category: 'Phần mềm CRM',
        unit: 'User/tháng',
        price: 80000,
        description: 'Bao gồm gói Tổng đài + Chat đa kênh (10 kênh), Tích hợp phần mềm qua API, Tự động hoá 200 credits/tháng, Tùy chọn 3/9 module nâng cao. (Thời hạn <12 tháng: 100.000₫/user/tháng)',
        warranty: 'SLA 99.5%'
    },
    {
        id: 'crm-advanced',
        code: 'CRM-ADV',
        name: 'Phần mềm Adahub CRM - Gói Advanced (Đầy đủ tính năng)',
        category: 'Phần mềm CRM',
        unit: 'User/tháng',
        price: 150000,
        description: 'Trọn bộ 9/9 module nâng cao (Đơn hàng, Cơ hội, Kho, Công việc, Lịch hẹn, Ticket, KPI, Telesales, ZNS), Tự động hoá 500 credits/tháng, Không giới hạn quyền hạn. (Thời hạn <12 tháng: 250.000₫/user/tháng)',
        warranty: 'SLA 99.5%'
    },

    // 2. GÓI CALLBOT AI UCALL (Gồm 3 phiên bản bot: Standard, Advanced, AI Call Agent)
    {
        id: 'callbot-cb2',
        code: 'CB-2',
        name: 'Gói Callbot AI UCALL CB2 (2 Triệu / 45 ngày)',
        category: 'Callbot AI',
        unit: 'Gói (45 ngày)',
        price: 2000000,
        description: 'Thời hạn 45 ngày. Giá gốc (chưa chiết khấu) - Giá block 6s: Standard 230₫ (8.695 block), Advanced 270₫ (7.407 block), AI Call Agent 330₫ (6.060 block). Tặng 1 tài khoản CRM.',
        warranty: 'Theo gói cước'
    },
    {
        id: 'callbot-cb5',
        code: 'CB-5',
        name: 'Gói Callbot AI UCALL CB5 (5 Triệu / 3 tháng)',
        category: 'Callbot AI',
        unit: 'Gói (3 tháng)',
        price: 5000000,
        description: 'Thời hạn 3 tháng. Chiết khấu cuộc gọi -10₫/block so với giá gốc - Giá block 6s: Standard 220₫ (22.727 block), Advanced 260₫ (19.230 block), AI Call Agent 320₫ (15.625 block). Tặng 1 kịch bản, 1 ghi âm (áp dụng cho 2 lần mua đầu tiên), 1 tài khoản CRM.',
        warranty: 'Theo gói cước'
    },
    {
        id: 'callbot-cb20',
        code: 'CB-20',
        name: 'Gói Callbot AI UCALL CB20 (20 Triệu / 6 tháng)',
        category: 'Callbot AI',
        unit: 'Gói (6 tháng)',
        price: 20000000,
        description: 'Thời hạn 6 tháng. Chiết khấu cuộc gọi -20₫, cảm ứng giọng nói -5₫/block - Giá block 6s: Standard 210₫ (95.238 block), Advanced 245₫ (81.632 block), AI Call Agent 305₫ (65.573 block). Tặng 2 kịch bản, 2 ghi âm, 2 tài khoản CRM.',
        warranty: 'Hỗ trợ kỹ thuật 24/7'
    },
    {
        id: 'callbot-cb50',
        code: 'CB-50',
        name: 'Gói Callbot AI UCALL CB50 (50 Triệu / 6 tháng)',
        category: 'Callbot AI',
        unit: 'Gói (6 tháng)',
        price: 50000000,
        description: 'Thời hạn 6 tháng. Chiết khấu cuộc gọi -30₫, cảm ứng giọng nói -5₫/block - Giá block 6s: Standard 200₫ (250.000 block), Advanced 235₫ (212.765 block), AI Call Agent 295₫ (169.491 block). Tặng 4 kịch bản, 4 ghi âm, 4 tài khoản CRM.',
        warranty: 'Ưu tiên hỗ trợ'
    },
    {
        id: 'callbot-cb100',
        code: 'CB-100',
        name: 'Gói Callbot AI UCALL CB100 (100 Triệu / 12 tháng)',
        category: 'Callbot AI',
        unit: 'Gói (12 tháng)',
        price: 100000000,
        description: 'Thời hạn 12 tháng. Chiết khấu cuộc gọi -40₫, cảm ứng giọng nói -10₫, nhận diện ý định -5₫, AI Agent -5₫, nói prompt -5₫/block - Giá block 6s: Standard 190₫ (526.315 block), Advanced 215₫ (465.116 block), AI Call Agent 265₫ (377.358 block). Tặng 6 kịch bản, 6 ghi âm, 8 tài khoản CRM.',
        warranty: 'Chuyên gia riêng'
    },
    {
        id: 'callbot-cb200',
        code: 'CB-200',
        name: 'Gói Callbot AI UCALL CB200 (200 Triệu / 12 tháng)',
        category: 'Callbot AI',
        unit: 'Gói (12 tháng)',
        price: 200000000,
        description: 'Thời hạn 12 tháng. Chiết khấu cuộc gọi -50₫, cảm ứng giọng nói -10₫, nhận diện ý định -5₫, AI Agent -5₫, nói prompt -5₫/block - Giá block 6s: Standard 180₫ (1.111.111 block), Advanced 205₫ (975.609 block), AI Call Agent 255₫ (784.313 block). Tặng 8 kịch bản, 8 ghi âm, 16 tài khoản CRM.',
        warranty: 'Chuyên gia riêng 24/7'
    },

    // 3. DỊCH VỤ ĐI KÈM CALLBOT & SETUP
    {
        id: 'srv-kich-ban',
        code: 'DV-KB',
        name: 'Kịch bản',
        category: 'Dịch vụ đi kèm',
        unit: 'Gói',
        price: 250000,
        description: 'Xây dựng luồng hội thoại kịch bản Callbot thông minh chuẩn theo từng ngành nghề kinh doanh.',
        warranty: 'Hiệu chỉnh 30 ngày'
    },
    {
        id: 'srv-ghi-am',
        code: 'DV-GA',
        name: 'Thu âm',
        category: 'Dịch vụ đi kèm',
        unit: 'Gói',
        price: 250000,
        description: 'Giọng thu phát thanh viên chuyên nghiệp, ngữ điệu truyền cảm, âm thanh chất lượng cao.',
        warranty: 'Nghiệm thu theo mẫu'
    },
    {
        id: 'srv-combo-kb-ga',
        code: 'DV-COMBO',
        name: 'Combo kịch bản thu âm',
        category: 'Dịch vụ đi kèm',
        unit: 'Gói',
        price: 400000,
        description: 'Trọn gói thiết kế kịch bản + thu âm phát thanh viên chuyên nghiệp (tiết kiệm 100.000₫).',
        warranty: 'Hiệu chỉnh 30 ngày'
    },
    {
        id: 'srv-ket-noi-so-dau',
        code: 'DV-KN1',
        name: 'Phí kết nối đầu số tự chuẩn bị (lần đầu)',
        category: 'Dịch vụ đi kèm',
        unit: 'Lần',
        price: 1000000,
        description: 'Khách làm việc với nhà cung cấp đầu số và kết nối với UCALL. Phí kết nối lần đầu 1.000.000₫ (chưa gồm VAT 8%).',
        warranty: 'Theo nhà cung cấp'
    },
    {
        id: 'srv-ket-noi-so-them',
        code: 'DV-KN2',
        name: 'Phí kết nối đầu số tự chuẩn bị (từ lần thứ 2)',
        category: 'Dịch vụ đi kèm',
        unit: 'Số',
        price: 100000,
        description: 'Kết nối thêm đầu số tự chuẩn bị từ lần thứ 2: 100.000₫/đầu số (chưa gồm VAT 8%).',
        warranty: 'Theo nhà cung cấp'
    },
    {
        id: 'srv-duy-tri-so-ngoai',
        code: 'DV-KN-DT',
        name: 'Phí duy trì kết nối đầu số tự chuẩn bị',
        category: 'Dịch vụ đi kèm',
        unit: 'Tháng',
        price: 100000,
        description: 'Duy trì kết nối đầu số khách tự chuẩn bị với UCALL: 100.000₫/tháng (chưa gồm VAT 8%).',
        warranty: 'Hàng tháng'
    },
    {
        id: 'srv-quan-ly-chien-dich',
        code: 'DV-QLCD',
        name: 'Quản Lý & Vận Hành Chiến Dịch Callbot',
        category: 'Dịch vụ đi kèm',
        unit: 'Chiến dịch/tháng',
        price: 1000000,
        description: 'Chuyên viên Etron trực tiếp vận hành, lọc data, giám sát và tối ưu tỷ lệ nghe máy hàng tháng.',
        warranty: 'Hàng tháng'
    },
    {
        id: 'srv-tich-hop-api',
        code: 'DV-TICH',
        name: 'Khởi Tạo Tích Hợp Hệ Thống Qua API',
        category: 'Dịch vụ đi kèm',
        unit: 'Lần',
        price: 1000000,
        description: 'Phí thiết lập kết nối 2 chiều giữa Callbot/CRM với website, ERP, landing page của doanh nghiệp.',
        warranty: 'Nghiệm thu API'
    },
    {
        id: 'srv-duy-tri-api',
        code: 'DV-TICH-DT',
        name: 'Phí Duy Trì Tích Hợp Hệ Thống',
        category: 'Dịch vụ đi kèm',
        unit: 'Tích hợp/tháng',
        price: 100000,
        description: 'Duy trì webhook và bảo trì cổng API hoạt động ổn định liên tục (100.000₫/tích hợp/tháng).',
        warranty: 'Hàng tháng'
    },
    {
        id: 'srv-quet-data',
        code: 'DV-ADL',
        name: 'Quét Data Khách Hàng Tiềm Năng Adalead',
        category: 'Dịch vụ đi kèm',
        unit: 'Nhóm FB',
        price: 100000,
        description: 'Quét tương tác và trích xuất danh sách khách hàng từ các nhóm/fanpage Facebook (100.000₫/nhóm/lần).',
        warranty: 'Bàn giao data'
    },
    {
        id: 'srv-setup-ky-thuat',
        code: 'DV-SETUP',
        name: 'Dịch Vụ Setup Kỹ Thuật Theo Yêu Cầu',
        category: 'Dịch vụ đi kèm',
        unit: 'Lần',
        price: 200000,
        description: 'Khảo sát và cấu hình kỹ thuật chuyên sâu theo nhu cầu đặc thù (200.000₫ – 2.000.000₫/lần).',
        warranty: 'Nghiệm thu kỹ thuật'
    },

    // 4. ĐẦU SỐ (Dùng cho Callbot: chưa gồm VAT 8%; Dùng cho Tổng đài CRM: đã gồm VAT 10%)
    {
        id: 'num-chung-codinh',
        code: 'NUM-SHARED',
        name: 'Đầu số chung cố định (Kho Etron)',
        category: 'Đầu số',
        unit: 'Số',
        price: 0,
        description: 'Kho chung của công ty Etron, dùng cho Tổng đài và Callbot đều không mất phí mua đầu số (Cước Callbot: 70đ/block 6s, Cước Tổng đài: 700đ/phút).',
        warranty: 'Kho chung Etron'
    },
    {
        id: 'num-khoi-tao-codinh',
        code: 'NUM-CD-KT',
        name: 'Phí khởi tạo đầu số riêng cố định',
        category: 'Đầu số',
        unit: 'Số (1 lần)',
        price: 0,
        description: 'Khởi tạo đầu số cố định riêng cho doanh nghiệp: miễn phí. Cước Callbot: 70đ/block 6s, Cước Tổng đài: 660đ/phút. Không mất phí kết nối khi qua đối tác của Etron.',
        warranty: 'Nhà mạng'
    },
    {
        id: 'num-duy-tri-codinh',
        code: 'NUM-CD-DT',
        name: 'Phí duy trì đầu số riêng cố định',
        category: 'Đầu số',
        unit: 'Số/tháng',
        price: 20000,
        description: 'Duy trì hàng tháng đầu số cố định riêng (20.000₫/số/tháng; dùng cho Callbot chưa gồm VAT 8%, dùng cho Tổng đài đã gồm VAT 10%).',
        warranty: 'Nhà mạng'
    },
    {
        id: 'num-khoi-tao-didong',
        code: 'NUM-MB-KT',
        name: 'Phí khởi tạo đầu số riêng di động',
        category: 'Đầu số',
        unit: 'Số (1 lần)',
        price: 50000,
        description: 'Khởi tạo đầu số di động riêng cho doanh nghiệp (50.000₫/số; dùng cho Callbot chưa gồm VAT 8%, dùng cho Tổng đài đã gồm VAT 10%). Cước Callbot: 80đ/block 6s, Cước Tổng đài: 720đ/phút. Không mất phí kết nối khi qua đối tác của Etron.',
        warranty: 'Nhà mạng'
    },
    {
        id: 'num-duy-tri-didong',
        code: 'NUM-MB-DT',
        name: 'Phí duy trì đầu số riêng di động',
        category: 'Đầu số',
        unit: 'Số/tháng',
        price: 60000,
        description: 'Duy trì hàng tháng đầu số di động riêng (60.000₫/số/tháng; dùng cho Callbot chưa gồm VAT 8%, dùng cho Tổng đài đã gồm VAT 10%).',
        warranty: 'Nhà mạng'
    },
    {
        id: 'num-brandname-viettel',
        code: 'NUM-BN-VT',
        name: 'Khởi tạo Voice Brandname - Viettel',
        category: 'Đầu số',
        unit: 'Thuê bao',
        price: 100000,
        description: 'Khai báo tên thương hiệu cuộc gọi mạng Viettel (100.000₫/thuê bao; dùng cho Callbot chưa gồm VAT 8%, dùng cho Tổng đài đã gồm VAT 10%).',
        warranty: 'Nhà mạng'
    },
    {
        id: 'num-brandname-mobifone',
        code: 'NUM-BN-MB',
        name: 'Khởi tạo Voice Brandname - MobiFone',
        category: 'Đầu số',
        unit: 'Thuê bao',
        price: 100000,
        description: 'Khai báo tên thương hiệu cuộc gọi mạng MobiFone (100.000₫/thuê bao; dùng cho Callbot chưa gồm VAT 8%, dùng cho Tổng đài đã gồm VAT 10%).',
        warranty: 'Nhà mạng'
    },
    {
        id: 'num-brandname-vinaphone',
        code: 'NUM-BN-VN',
        name: 'Khởi tạo Voice Brandname - VinaPhone',
        category: 'Đầu số',
        unit: 'Thuê bao',
        price: 100000,
        description: 'Khai báo tên thương hiệu cuộc gọi mạng VinaPhone (100.000₫/thuê bao; dùng cho Callbot chưa gồm VAT 8%, dùng cho Tổng đài đã gồm VAT 10%).',
        warranty: 'Nhà mạng'
    },
    {
        id: 'num-brandname-combo',
        code: 'NUM-BN-COMBO',
        name: 'Combo khởi tạo Voice Brandname (3 mạng Viettel, Mobi, Vina)',
        category: 'Đầu số',
        unit: 'Combo',
        price: 300000,
        description: 'Khách hàng mua tối thiểu 3 đầu số ứng với 3 nhà mạng Viettel, MobiFone, VinaPhone (100.000₫/thuê bao, tổng 300.000₫; dùng cho Callbot chưa gồm VAT 8%, dùng cho Tổng đài đã gồm VAT 10%). Các đầu số này chỉ gọi nội mạng. Cước Callbot: 70đ/block 6s, Cước Tổng đài: 660đ/phút. Không mất phí kết nối khi qua đối tác của Etron.',
        warranty: 'Nhà mạng'
    },
    {
        id: 'num-brandname-duy-tri',
        code: 'NUM-BN-DT',
        name: 'Phí duy trì Voice Brandname',
        category: 'Đầu số',
        unit: 'Số/tháng',
        price: 60000,
        description: 'Duy trì Voice Brandname hàng tháng (60.000₫/số/tháng; dùng cho Callbot chưa gồm VAT 8%, dùng cho Tổng đài đã gồm VAT 10%).',
        warranty: 'Nhà mạng'
    },

    // 5. VÍ CƯỚC VIỄN THÔNG (Đã bao gồm VAT 10% - Không tính chung thuế VAT 8%)
    {
        id: 'vi-cuoc-vien-thong',
        code: 'VI-CUOC',
        name: 'Nạp cước viễn thông trả trước (Đã gồm VAT 10%)',
        category: 'Ví cước viễn thông',
        unit: 'Lần nạp',
        price: 1000000,
        description: 'Nạp cước viễn thông trả trước tối thiểu 1.000.000₫ (đã gồm VAT 10%). Cước cuộc gọi thực tế trừ dần vào ví cước.',
        warranty: 'Trừ theo thực tế'
    }
];

// Kho tài liệu chính thức liên kết từ Etron Google Drive & Salekit
const DEFAULT_DOCUMENTS = [
    {
        id: 'doc-etron-001',
        title: 'Template Báo Giá Bán Hàng Etron (Google Sheets)',
        category: 'Báo giá & Mẫu biểu',
        type: 'link',
        fileUrl: 'https://docs.google.com/spreadsheets/d/1JZrRKMKROb0cnQ_3rnOqmm9qgOJ1qthUkEfx8Hn1Kp8/edit',
        fileSize: 'Google Sheets',
        fileType: 'xlsx',
        description: 'File template báo giá chính thức của Etron trên Google Sheets, đầy đủ công thức tính các gói CRM và Callbot.',
        updatedAt: '2026-10-12',
        tags: ['Template', 'Báo giá', 'Google Sheets', 'Chính thức'],
        pinned: true
    },
    {
        id: 'doc-etron-002',
        title: 'Thư Mục Bảng Giá PDF Chính Thức Adahub CRM & Callbot AI Ucall',
        category: 'Bảng giá chính thức',
        type: 'link',
        fileUrl: 'https://drive.google.com/drive/folders/1dLC5RB1i7FK4mpVMafg7AVx78K2xIETX',
        fileSize: 'Drive Folder',
        fileType: 'pdf',
        description: 'Thư mục Google Drive lưu trữ toàn bộ các file PDF bảng giá chính thức để gửi trực tiếp cho khách hàng.',
        updatedAt: '2026-10-12',
        tags: ['Bảng giá', 'PDF', 'CRM', 'Callbot', 'Google Drive'],
        pinned: true
    },
    {
        id: 'doc-etron-003',
        title: 'Chính Sách Bán Hàng & Quy Chế Hoa Hồng Sales Etron',
        category: 'Chính sách bán hàng',
        type: 'link',
        fileUrl: 'https://docs.google.com/document/d/1EPPCm_XRIrHncmW8FQXTCTdwz7Pt664oYGHr8zYwyLU/edit',
        fileSize: 'Google Docs',
        fileType: 'gdoc',
        description: 'Văn bản quy định chính sách chiết khấu, hạn mức đàm phán, cơ chế tính hoa hồng và quyền lợi nhân viên kinh doanh Etron.',
        updatedAt: '2026-10-10',
        tags: ['Chính sách', 'Sales', 'Hoa hồng', 'Nội bộ'],
        pinned: true
    },
    {
        id: 'doc-etron-004',
        title: 'Thông Báo & Quy Định Mới Dành Cho Đội Ngũ Kinh Doanh',
        category: 'Chính sách bán hàng',
        type: 'link',
        fileUrl: 'https://docs.google.com/document/d/100xFDgbzMBCSZ5xIVxa78wFn9PQhtiYp1SuKYRoPxIg/edit',
        fileSize: 'Google Docs',
        fileType: 'gdoc',
        description: 'Các văn bản thông báo chính sách mới, cập nhật sản phẩm và quy định bán hàng từ Ban Giám Đốc Etron.',
        updatedAt: '2026-10-08',
        tags: ['Thông báo', 'Quy định', 'Sales'],
        pinned: false
    },
    {
        id: 'doc-etron-005',
        title: 'Chính Sách Chăm Sóc Khách Hàng & Cam Kết Chất Lượng (SLA)',
        category: 'Hỗ trợ & Chăm sóc khách hàng',
        type: 'link',
        fileUrl: 'https://drive.google.com/drive/folders/1luA9y94OnDfpY5dGEYVPRhULIT5cXt6S',
        fileSize: 'Drive Folder',
        fileType: 'drive',
        description: 'Thư mục tài liệu chính sách CSKH, quy trình bảo hành, cam kết thời gian xử lý sự cố (SLA 99.5%) cho khách hàng.',
        updatedAt: '2026-10-05',
        tags: ['CSKH', 'SLA', 'Hỗ trợ kỹ thuật', 'Quy trình'],
        pinned: false
    },
    {
        id: 'doc-etron-006',
        title: 'Thư Mục Tổng Hợp Toàn Bộ Tài Liệu Sale & CSKH Etron',
        category: 'Tài liệu đào tạo',
        type: 'link',
        fileUrl: 'https://drive.google.com/drive/folders/16uA2vLYzEVJ2Za_2WHBMIFHAG1MKwhVZ',
        fileSize: 'Drive Folder',
        fileType: 'drive',
        description: 'Thư mục gốc chứa toàn bộ kho tài liệu, hợp đồng mẫu, kịch bản tư vấn, slide thuyết trình giới thiệu giải pháp Etron.',
        updatedAt: '2026-10-01',
        tags: ['Tổng hợp', 'Tài liệu gốc', 'Đào tạo', 'Drive'],
        pinned: true
    },
    {
        id: 'doc-etron-007',
        title: 'Infographic Sơ Đồ Hệ Thống Etron CRM & Callbot AI',
        category: 'Salekit & Giới thiệu',
        type: 'image',
        fileUrl: 'assets/logo_etron_new.png',
        fileSize: '1.2 MB',
        fileType: 'png',
        description: 'Sơ đồ luồng dữ liệu kết nối giữa Adahub CRM, Callbot AI Ucall và các nhà mạng viễn thông.',
        updatedAt: '2026-10-13',
        tags: ['Infographic', 'Salekit', 'Sơ đồ', 'CRM', 'Callbot'],
        pinned: false
    },
    {
        id: 'doc-etron-008',
        title: 'Video Demo Tính Năng Callbot AI & Tự Động Hóa CRM',
        category: 'Salekit & Giới thiệu',
        type: 'video',
        fileUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        fileSize: 'Video Link',
        fileType: 'youtube',
        description: 'Video giới thiệu luồng tương tác thực tế của Callbot AI với khách hàng và đồng bộ dữ liệu về CRM.',
        updatedAt: '2026-10-13',
        tags: ['Video Demo', 'Callbot', 'Trực quan', 'Salekit'],
        pinned: false
    }
];

const DEFAULT_QUOTES = [
    {
        id: 'quote-sample-etron-01',
        quoteNumber: 'BG-20261012-001',
        date: '2026-10-12',
        validUntil: '2026-10-31',
        status: 'Sent',
        customer: {
            company: 'CÔNG TY CỔ PHẦN TẬP ĐOÀN ĐẦU TƯ MINH HÒA',
            contactPerson: 'Ông Trần Quốc Toàn',
            title: 'Giám đốc Công nghệ Thông tin',
            phone: '0912 345 678',
            email: 'toan.tran@minhhoagroup.vn',
            taxCode: '0315889911',
            address: 'Tòa nhà Landmark 81, Quận Bình Thạnh, TP. Hồ Chí Minh'
        },
        salesRep: {
            name: 'Đỗ Thị Thùy Liên',
            phone: '0901 234 567',
            email: 'contact@etron.vn'
        },
        items: [
            {
                code: 'CRM-STD',
                name: 'Phần mềm Adahub CRM - Gói Standard',
                unit: 'User/tháng',
                quantity: 5,
                price: 80000,
                discountPercent: 0,
                discountAmount: 0,
                amount: 4800000,
                note: '5 user × 12 tháng (Bao gồm 10 kênh chat, tích hợp API, 200 credits tự động hóa, 3 module nâng cao)'
            },
            {
                code: 'CB-5',
                name: 'Gói Callbot AI UCALL CB5 (5 Triệu / 3 tháng)',
                unit: 'Gói',
                quantity: 1,
                price: 5000000,
                discountPercent: 0,
                discountAmount: 0,
                amount: 5000000,
                note: '1 gói · dùng trong 3 tháng. Tặng 1 kịch bản, 1 ghi âm, 1 CRM'
            },
            {
                code: 'DV-COMBO',
                name: 'Combo kịch bản thu âm',
                unit: 'Gói',
                quantity: 1,
                price: 400000,
                discountPercent: 0,
                discountAmount: 0,
                amount: 400000,
                note: 'Soạn thảo kịch bản và thu âm phát thanh viên chuyên nghiệp'
            },
            {
                code: 'VI-CUOC',
                name: 'Ví Cước Viễn Thông Trả Trước (Đã gồm VAT 10%)',
                unit: 'Lần nạp',
                quantity: 1,
                price: 500000,
                discountPercent: 0,
                discountAmount: 0,
                amount: 500000,
                note: 'Cước cuộc gọi và phí đầu số trừ dần vào ví theo thực tế'
            }
        ],
        subtotal: 10700000,
        overallDiscountPercent: 0,
        overallDiscountAmount: 0,
        amountBeforeTax: 10700000,
        vatRate: 8,
        vatAmount: 856000,
        grandTotal: 11556000,
        totalInWords: 'Mười một triệu năm trăm năm mươi sáu nghìn đồng chẵn.',
        terms: [
            'Báo giá có hiệu lực từ ngày 01/02/2026 đến ngày 31/12/2026.',
            'Phần mềm CRM và Callbot tính theo đơn giá chưa bao gồm thuế VAT 8%.',
            'Phần mềm CRM tính theo user/tháng, thanh toán theo năm.',
            '(*) Tính năng AI hiện được miễn phí ở tất cả các gói cho đến khi áp dụng bảng giá mới.',
            'Gói Callbot tính theo block 6 giây, đơn giá theo loại bot trong bảng giá Callbot.',
            'Trong vòng 90 ngày sau khi hết hạn gói, khách hàng có thể gia hạn với phí bằng 30% số dư còn lại.'
        ],
        notes: 'Giá trên tính theo biểu phí chính thức năm 2026 của Etron Solutions.'
    }
];

class SalesStore {
    constructor() {
        this.init();
    }

    init() {
        // Cập nhật cấu hình Etron nếu chưa khởi tạo phiên bản mới
        const initVersion = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
        if (initVersion !== 'v16_done') {
            if (!initVersion || (initVersion !== 'v15_done' && !initVersion.startsWith('v'))) {
                localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(DEFAULT_COMPANY));
                localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(DEFAULT_DOCUMENTS));
                localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(DEFAULT_QUOTES));
            } else {
                // Đảm bảo các tài liệu mặc định có thuộc tính pinned và bổ sung tài liệu media mẫu nếu chưa có
                try {
                    const currentDocs = JSON.parse(localStorage.getItem(STORAGE_KEYS.DOCUMENTS)) || [];
                    let hasChanges = false;
                    currentDocs.forEach(d => {
                        if (['doc-etron-001', 'doc-etron-002', 'doc-etron-003', 'doc-etron-006'].includes(d.id)) {
                            if (d.pinned === undefined) { d.pinned = true; hasChanges = true; }
                        }
                    });
                    if (!currentDocs.some(d => d.id === 'doc-etron-007')) {
                        const d7 = DEFAULT_DOCUMENTS.find(d => d.id === 'doc-etron-007');
                        if (d7) { currentDocs.push(d7); hasChanges = true; }
                    }
                    if (!currentDocs.some(d => d.id === 'doc-etron-008')) {
                        const d8 = DEFAULT_DOCUMENTS.find(d => d.id === 'doc-etron-008');
                        if (d8) { currentDocs.push(d8); hasChanges = true; }
                    }
                    if (hasChanges) {
                        localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(currentDocs));
                    }
                } catch (e) { /* bỏ qua */ }
            }
            // Làm mới danh mục sản phẩm (bảng giá đầu số và cước viễn thông mới)
            localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
            // Cập nhật điều khoản cước Callbot và cước viễn thông trong cấu hình công ty (giữ nguyên các thiết lập khác)
            try {
                const comp = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMPANY));
                if (comp && Array.isArray(comp.defaultTerms)) {
                    const newCb = DEFAULT_COMPANY.defaultTerms.find(t => t.startsWith('Callbot tính theo block'));
                    const newVc = DEFAULT_COMPANY.defaultTerms.find(t => t.includes('ví cước'));
                    comp.defaultTerms = comp.defaultTerms.map(t => {
                        if (t.startsWith('Callbot tính theo block') && newCb) return newCb;
                        if (t.includes('ví cước') && newVc) return newVc;
                        return t;
                    });
                    localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(comp));
                }
            } catch (e) { /* bỏ qua */ }
            localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'v16_done');
        }
    }

    // Company
    getCompany() {
        try {
            const comp = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMPANY)) || DEFAULT_COMPANY;
            if (!comp.logoUrl) comp.logoUrl = 'assets/logo.png';
            if (comp.bankAccount === '103899886688' || (comp.bankName && comp.bankName.includes('Vietcombank')) || !comp.bankAccount) {
                comp.bankName = 'Ngân hàng TMCP Quân đội';
                comp.bankAccount = '999998887777';
                comp.bankAccountName = 'CONG TY CP GIAI PHAP ETRON';
                if (comp.defaultTerms) {
                    comp.defaultTerms = comp.defaultTerms.map(t => 
                        t.includes('Vietcombank') ? 'Thông tin thanh toán: Ngân hàng TMCP Quân đội (MBBank) - Số TK: 999998887777 - CONG TY CP GIAI PHAP ETRON.' : t
                    );
                }
                this.saveCompany(comp);
            }
            return comp;
        } catch {
            return DEFAULT_COMPANY;
        }
    }

    saveCompany(data) {
        localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(data));
    }

    // Products
    getProducts() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS)) || [];
        } catch {
            return [];
        }
    }

    saveProduct(product) {
        const products = this.getProducts();
        if (product.id) {
            const index = products.findIndex(p => p.id === product.id);
            if (index !== -1) {
                products[index] = { ...products[index], ...product };
            } else {
                products.unshift(product);
            }
        } else {
            product.id = 'prod-' + Date.now();
            products.unshift(product);
        }
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
        return product;
    }

    deleteProduct(id) {
        const products = this.getProducts().filter(p => p.id !== id);
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    }

    // Documents
    getDocuments() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.DOCUMENTS)) || [];
        } catch {
            return [];
        }
    }

    saveDocument(doc) {
        const docs = this.getDocuments();
        let targetDoc = null;
        const nowTs = Date.now();
        const todayStr = new Date().toISOString().split('T')[0];
        if (doc.id) {
            const index = docs.findIndex(d => d.id === doc.id);
            if (index !== -1) {
                targetDoc = { 
                    ...docs[index], 
                    ...doc, 
                    updatedAt: todayStr, 
                    updatedAtTime: nowTs 
                };
                docs[index] = targetDoc;
            } else {
                targetDoc = { 
                    ...doc, 
                    createdAt: doc.createdAt || nowTs,
                    updatedAt: doc.updatedAt || todayStr, 
                    updatedAtTime: doc.updatedAtTime || nowTs 
                };
                docs.unshift(targetDoc);
            }
        } else {
            targetDoc = { 
                ...doc, 
                id: 'doc-' + nowTs, 
                createdAt: nowTs,
                updatedAt: todayStr, 
                updatedAtTime: nowTs 
            };
            docs.unshift(targetDoc);
        }
        localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(docs));

        // Đồng bộ lên Firebase Firestore nếu có kết nối
        if (window.firebaseDb && targetDoc && targetDoc.id) {
            try {
                const cloudData = JSON.parse(JSON.stringify(targetDoc));
                window.firebaseDb.collection('documents').doc(targetDoc.id).set(cloudData, { merge: true })
                    .catch(err => console.warn('Lỗi ghi Firestore:', err));
            } catch (err) {
                console.warn('Lỗi đồng bộ Firebase:', err);
            }
        }

        return targetDoc;
    }

    deleteDocument(id) {
        const docs = this.getDocuments().filter(d => d.id !== id);
        localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(docs));

        // Xóa trên Firebase Firestore
        if (window.firebaseDb && id) {
            try {
                window.firebaseDb.collection('documents').doc(id).delete()
                    .catch(err => console.warn('Lỗi xóa Firestore:', err));
            } catch (err) {
                console.warn('Lỗi xóa Firebase:', err);
            }
        }
    }

    // ==========================================
    // Quản lý Danh Mục Tài Liệu (Document Categories)
    // ==========================================
    getDocumentCategories() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENT_CATEGORIES);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch {}
        return DEFAULT_DOCUMENT_CATEGORIES;
    }

    saveDocumentCategory(cat) {
        const categories = this.getDocumentCategories();
        let targetCat = null;
        if (cat.id) {
            const idx = categories.findIndex(c => c.id === cat.id);
            if (idx !== -1) {
                targetCat = { ...categories[idx], ...cat };
                categories[idx] = targetCat;
            } else {
                targetCat = { ...cat };
                categories.push(targetCat);
            }
        } else {
            targetCat = { ...cat, id: 'cat-' + Date.now(), icon: cat.icon || 'tag' };
            categories.push(targetCat);
        }

        localStorage.setItem(STORAGE_KEYS.DOCUMENT_CATEGORIES, JSON.stringify(categories));

        if (window.firebaseDb) {
            window.firebaseDb.collection('config').doc('categories').set({ list: categories })
                .catch(err => console.warn('Lỗi ghi danh mục Firestore:', err));
        }
        return targetCat;
    }

    deleteDocumentCategory(catId) {
        let categories = this.getDocumentCategories();
        categories = categories.filter(c => c.id !== catId);
        localStorage.setItem(STORAGE_KEYS.DOCUMENT_CATEGORIES, JSON.stringify(categories));

        if (window.firebaseDb) {
            window.firebaseDb.collection('config').doc('categories').set({ list: categories })
                .catch(err => console.warn('Lỗi xóa danh mục Firestore:', err));
        }
    }

    setupCloudSync() {
        if (!window.firebaseDb) return;

        try {
            // 1. Đồng bộ Kho Tài Liệu Real-time
            window.firebaseDb.collection('documents').onSnapshot((snapshot) => {
                if (snapshot.empty) {
                    console.log('Khởi tạo dữ liệu tài liệu mặc định lên Firestore...');
                    const initialDocs = this.getDocuments();
                    const listToPush = (initialDocs && initialDocs.length > 0) ? initialDocs : DEFAULT_DOCUMENTS;
                    listToPush.forEach(d => {
                        window.firebaseDb.collection('documents').doc(d.id).set(JSON.parse(JSON.stringify(d)))
                            .catch(() => {});
                    });
                } else {
                    const cloudDocs = [];
                    snapshot.forEach(docSnap => {
                        cloudDocs.push({ id: docSnap.id, ...docSnap.data() });
                    });
                    
                    cloudDocs.sort((a, b) => {
                        const tsA = a.updatedAtTime || (a.createdAt && typeof a.createdAt === 'number' ? a.createdAt : (a.updatedAt ? new Date(a.updatedAt).getTime() : 0));
                        const tsB = b.updatedAtTime || (b.createdAt && typeof b.createdAt === 'number' ? b.createdAt : (b.updatedAt ? new Date(b.updatedAt).getTime() : 0));
                        return tsB - tsA;
                    });

                    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(cloudDocs));

                    if (window.documentHub) {
                        window.documentHub.renderStats();
                        window.documentHub.renderQuickAccess();
                        window.documentHub.renderDocumentsList();
                    }
                }
            }, (error) => {
                console.warn('Lỗi đồng bộ Real-time Firestore:', error);
            });

            // 2. Đồng bộ Danh Mục Tài Liệu Real-time
            window.firebaseDb.collection('config').doc('categories').onSnapshot((docSnap) => {
                if (docSnap.exists) {
                    const data = docSnap.data();
                    if (data && Array.isArray(data.list) && data.list.length > 0) {
                        localStorage.setItem(STORAGE_KEYS.DOCUMENT_CATEGORIES, JSON.stringify(data.list));
                        if (window.documentHub) {
                            window.documentHub.renderCategoryPills();
                            window.documentHub.updateCategorySelectOptions();
                            window.documentHub.renderCategoryManagerList();
                        }
                    }
                } else {
                    const localCats = this.getDocumentCategories();
                    window.firebaseDb.collection('config').doc('categories').set({ list: localCats })
                        .catch(() => {});
                }
            }, (error) => {
                console.warn('Lỗi đồng bộ danh mục Firestore:', error);
            });

        } catch (err) {
            console.warn('Lỗi thiết lập lắng nghe Firestore:', err);
        }
    }

    // Quotes
    getQuotes() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.QUOTES)) || [];
        } catch {
            return [];
        }
    }

    getQuoteById(id) {
        const quotes = this.getQuotes();
        return quotes.find(q => q.id === id) || null;
    }

    saveQuote(quote) {
        const quotes = this.getQuotes();
        if (quote.id) {
            const index = quotes.findIndex(q => q.id === quote.id);
            if (index !== -1) {
                quotes[index] = { ...quotes[index], ...quote };
            } else {
                quotes.unshift(quote);
            }
        } else {
            quote.id = 'quote-' + Date.now();
            quotes.unshift(quote);
        }
        localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(quotes));
        return quote;
    }

    deleteQuote(id) {
        const quotes = this.getQuotes().filter(q => q.id !== id);
        localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(quotes));
    }

    // Export & Import All
    exportData() {
        const data = {
            company: this.getCompany(),
            products: this.getProducts(),
            documents: this.getDocuments(),
            quotes: this.getQuotes(),
            exportedAt: new Date().toISOString(),
            version: '2026-etron-salekit'
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `etron_sales_hub_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.company) localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(data.company));
            if (data.products) localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data.products));
            if (data.documents) localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(data.documents));
            if (data.quotes) localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(data.quotes));
            return true;
        } catch (e) {
            console.error('Import error:', e);
            return false;
        }
    }

    resetToDefault() {
        localStorage.clear();
        this.init();
    }
}

// Global Store Instance
window.salesStore = new SalesStore();
