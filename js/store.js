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
    CALLBOT_KEYWORDS: 'saleshub_callbot_keywords',
    CALLBOT_TEMPLATES: 'saleshub_callbot_templates',
    CALLBOT_MEDIA: 'saleshub_callbot_media',
    QUOTES: 'saleshub_quotes',
    CUSTOMERS: 'saleshub_customers',
    INITIALIZED: 'saleshub_etron_salekit_v2026_pricing_v9'
};

// Danh mục tài liệu mặc định chuẩn Etron (đồng bộ theo cấu hình hệ thống hiện tại)
const DEFAULT_DOCUMENT_CATEGORIES = [
    { id: 'cat-bang-gia', name: 'Bảng giá', icon: 'file-text', pinned: false },
    { id: 'cat-dao-tao', name: 'Tài liệu chung', icon: 'book-open', pinned: false },
    { id: 'cat-1791911891512', name: 'Vid HDSD', icon: 'video', pinned: true },
    { id: 'cat-1791912100098', name: 'HR', icon: 'users', pinned: false }
];

// Hàm nhận diện biểu tượng thông minh cho danh mục theo từ khóa
function detectCategoryIcon(name) {
    if (!name) return 'folder';
    const lower = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // 1. Video / Clip / HDSD
    if (/vid|video|clip|youtube|mp4|hdsd|demo|phim|quay/.test(lower)) return 'video';

    // 2. Nhân sự / HR / Tuyển dụng / Đội ngũ
    if (/hr|nhan su|tuyen dung|team|staff|nhan vien|noi bo/.test(lower)) return 'users';

    // 3. CS / CSKH / Chăm sóc / Hỗ trợ / Support / Ticket / SLA
    if (/\bcs\b|cskh|cham soc|ho tro|support|ticket|sla|bao hanh|help|khach hang/.test(lower)) return 'headphones';

    // 4. Bảng giá / Báo giá / Chi phí / Cước / Price / Tiền
    if (/gia|bao gia|bang gia|phi|cuoc|tien|price|cost|fee/.test(lower)) return 'dollar-sign';

    // 5. Hợp đồng / Pháp lý / Biên bản / Cam kết / Thỏa thuận
    if (/hop dong|phap ly|bien ban|cam ket|thoa thuan|dieu khoan|luat|contract/.test(lower)) return 'file-check';

    // 6. Salekit / Giới thiệu / Marketing / MKT / Brochure / Catalog / Profile
    if (/salekit|gioi thieu|marketing|mkt|brochure|catalog|profile|quang cao|pitch/.test(lower)) return 'sparkles';

    // 7. Đào tạo / Hướng dẫn / Giáo trình / Training / Học / Sổ tay
    if (/dao tao|giao trinh|training|so tay|cam nang|tai lieu chung/.test(lower)) return 'book-open';

    // 8. Chính sách / Quy chế / Bảo mật / An toàn
    if (/chinh sach|quy che|quy dinh|bao mat|an toan|policy/.test(lower)) return 'shield-check';

    // 9. Dự án / Case study / Triển khai
    if (/case study|du an|trien khai|khach tieu bieu|project/.test(lower)) return 'folder-kanban';

    // 10. Kỹ thuật / Cấu hình / Thiết bị / API / Phần cứng
    if (/ky thuat|cau hinh|thiet bi|api|hardware|phan cung|setup/.test(lower)) return 'cpu';

    // 11. Báo cáo / Thống kê / Doanh số
    if (/bao cao|thong ke|doanh so|report|analytics/.test(lower)) return 'trending-up';

    // 12. Bảng tính / Excel / Sheet
    if (/sheet|excel|bang tinh|so lieu/.test(lower)) return 'file-spreadsheet';

    // Random/Hash fallback sinh động cho các danh mục không trùng từ khóa
    const vibrantPool = ['folder-heart', 'folder-kanban', 'layers', 'briefcase', 'boxes', 'award', 'clipboard-list', 'compass', 'bookmark'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return vibrantPool[hash % vibrantPool.length];
}

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
        category: 'CRM',
        unit: 'User/tháng',
        price: 40000,
        description: 'Tổng đài gọi điện, Quản lý khách hàng, Mobile App, Dashboard báo cáo, Tự động hoá 100 credits/tháng. (Thời hạn <12 tháng: 50.000₫/user/tháng)',
        warranty: 'SLA 99.5%'
    },
    {
        id: 'crm-standard',
        code: 'CRM-STD',
        name: 'Phần mềm Adahub CRM - Gói Standard (Khuyên dùng)',
        category: 'CRM',
        unit: 'User/tháng',
        price: 80000,
        description: 'Bao gồm gói Tổng đài + Chat đa kênh (10 kênh), Tích hợp phần mềm qua API, Tự động hoá 200 credits/tháng, Tùy chọn 3/9 module nâng cao. (Thời hạn <12 tháng: 100.000₫/user/tháng)',
        warranty: 'SLA 99.5%'
    },
    {
        id: 'crm-advanced',
        code: 'CRM-ADV',
        name: 'Phần mềm Adahub CRM - Gói Advanced (Đầy đủ tính năng)',
        category: 'CRM',
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
        category: 'Callbot',
        unit: 'Gói (45 ngày)',
        price: 2000000,
        description: 'Thời hạn 45 ngày. Giá gốc (chưa chiết khấu) - Giá block 6s: Standard 230₫ (8.695 block), Advanced 270₫ (7.407 block), AI Call Agent 330₫ (6.060 block). Tặng 1 tài khoản CRM.',
        warranty: 'Theo gói cước'
    },
    {
        id: 'callbot-cb5',
        code: 'CB-5',
        name: 'Gói Callbot AI UCALL CB5 (5 Triệu / 3 tháng)',
        category: 'Callbot',
        unit: 'Gói (3 tháng)',
        price: 5000000,
        description: 'Thời hạn 3 tháng. Chiết khấu cuộc gọi -10₫/block so với giá gốc - Giá block 6s: Standard 220₫ (22.727 block), Advanced 260₫ (19.230 block), AI Call Agent 320₫ (15.625 block). Tặng 1 kịch bản, 1 ghi âm (áp dụng cho 2 lần mua đầu tiên), 1 tài khoản CRM.',
        warranty: 'Theo gói cước'
    },
    {
        id: 'callbot-cb20',
        code: 'CB-20',
        name: 'Gói Callbot AI UCALL CB20 (20 Triệu / 6 tháng)',
        category: 'Callbot',
        unit: 'Gói (6 tháng)',
        price: 20000000,
        description: 'Thời hạn 6 tháng. Chiết khấu cuộc gọi -20₫, cảm ứng giọng nói -5₫/block - Giá block 6s: Standard 210₫ (95.238 block), Advanced 245₫ (81.632 block), AI Call Agent 305₫ (65.573 block). Tặng 2 kịch bản, 2 ghi âm, 2 tài khoản CRM.',
        warranty: 'Hỗ trợ kỹ thuật 24/7'
    },
    {
        id: 'callbot-cb50',
        code: 'CB-50',
        name: 'Gói Callbot AI UCALL CB50 (50 Triệu / 6 tháng)',
        category: 'Callbot',
        unit: 'Gói (6 tháng)',
        price: 50000000,
        description: 'Thời hạn 6 tháng. Chiết khấu cuộc gọi -30₫, cảm ứng giọng nói -5₫/block - Giá block 6s: Standard 200₫ (250.000 block), Advanced 235₫ (212.765 block), AI Call Agent 295₫ (169.491 block). Tặng 4 kịch bản, 4 ghi âm, 4 tài khoản CRM.',
        warranty: 'Ưu tiên hỗ trợ'
    },
    {
        id: 'callbot-cb100',
        code: 'CB-100',
        name: 'Gói Callbot AI UCALL CB100 (100 Triệu / 12 tháng)',
        category: 'Callbot',
        unit: 'Gói (12 tháng)',
        price: 100000000,
        description: 'Thời hạn 12 tháng. Chiết khấu cuộc gọi -40₫, cảm ứng giọng nói -10₫, nhận diện ý định -5₫, AI Agent -5₫, nói prompt -5₫/block - Giá block 6s: Standard 190₫ (526.315 block), Advanced 215₫ (465.116 block), AI Call Agent 265₫ (377.358 block). Tặng 6 kịch bản, 6 ghi âm, 8 tài khoản CRM.',
        warranty: 'Chuyên gia riêng'
    },
    {
        id: 'callbot-cb200',
        code: 'CB-200',
        name: 'Gói Callbot AI UCALL CB200 (200 Triệu / 12 tháng)',
        category: 'Callbot',
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
        category: 'Dịch vụ',
        unit: 'Gói',
        price: 250000,
        description: 'Xây dựng luồng hội thoại kịch bản Callbot thông minh chuẩn theo từng ngành nghề kinh doanh.',
        warranty: 'Hiệu chỉnh 30 ngày'
    },
    {
        id: 'srv-ghi-am',
        code: 'DV-GA',
        name: 'Thu âm',
        category: 'Dịch vụ',
        unit: 'Gói',
        price: 250000,
        description: 'Giọng thu phát thanh viên chuyên nghiệp, ngữ điệu truyền cảm, âm thanh chất lượng cao.',
        warranty: 'Nghiệm thu theo mẫu'
    },
    {
        id: 'srv-combo-kb-ga',
        code: 'DV-COMBO',
        name: 'Combo kịch bản thu âm',
        category: 'Dịch vụ',
        unit: 'Gói',
        price: 400000,
        description: 'Trọn gói thiết kế kịch bản + thu âm phát thanh viên chuyên nghiệp (tiết kiệm 100.000₫).',
        warranty: 'Hiệu chỉnh 30 ngày'
    },
    {
        id: 'srv-ket-noi-so-dau',
        code: 'DV-KN1',
        name: 'Phí kết nối đầu số tự chuẩn bị (lần đầu)',
        category: 'Dịch vụ',
        unit: 'Lần',
        price: 1000000,
        description: 'Khách tự làm việc với nhà cung cấp đầu số và kết nối với ETRON. Phí kết nối lần đầu 1.000.000₫ (chưa gồm VAT 8%).',
        warranty: 'Theo nhà cung cấp'
    },
    {
        id: 'srv-ket-noi-so-them',
        code: 'DV-KN2',
        name: 'Phí kết nối đầu số tự chuẩn bị (từ đầu số thứ 2)',
        category: 'Dịch vụ',
        unit: 'Số',
        price: 100000,
        description: 'Kết nối từ đầu số thứ 2: 100.000₫/đầu số (chưa gồm VAT 8%). Miễn phí khi dùng số ảo tự thay số.',
        warranty: 'Theo nhà cung cấp'
    },
    {
        id: 'srv-duy-tri-so-ngoai',
        code: 'DV-KN-DT',
        name: 'Phí duy trì kết nối đầu số tự chuẩn bị',
        category: 'Dịch vụ',
        unit: 'Tháng',
        price: 100000,
        description: 'Duy trì kết nối đầu số khách tự chuẩn bị với ETRON: 100.000₫/tháng (chưa gồm VAT 8%).',
        warranty: 'Hàng tháng'
    },
    {
        id: 'srv-dang-ky-brandname',
        code: 'DV-BN-DK',
        name: 'Đăng ký tên định danh Brandname',
        category: 'Dịch vụ',
        unit: 'Tên',
        price: 2000000,
        description: 'Đăng ký tên định danh riêng: thời gian dự kiến khoảng 1 tháng; chi phí gồm 2.000.000 VNĐ phí đăng ký và 200.000 VNĐ/năm phí duy trì (chưa gồm VAT 8%). Dịch vụ Brandname chỉ áp dụng cho doanh nghiệp/tổ chức, cá nhân không thể đăng ký.',
        warranty: 'Dự kiến ~1 tháng'
    },
    {
        id: 'srv-duy-tri-ten-brandname',
        code: 'DV-BN-DT',
        name: 'Phí duy trì tên định danh Brandname',
        category: 'Dịch vụ',
        unit: 'Tên/năm',
        price: 200000,
        description: 'Phí duy trì tên định danh Brandname riêng hàng năm: 200.000 VNĐ/tên/năm (chưa gồm VAT 8%).',
        warranty: 'Hàng năm'
    },
    {
        id: 'srv-ket-noi-thay-so',
        code: 'DV-KN-TS',
        name: 'Phí kết nối khi thay từng số',
        category: 'Dịch vụ',
        unit: 'Lần',
        price: 200000,
        description: 'Kết nối khi thay từng số: 200.000₫/lần (chưa gồm VAT 8%). Miễn phí khi dùng số ảo tự thay số hoặc khi kết nối qua đối tác của ETRON.',
        warranty: 'Theo lần kết nối'
    },
    {
        id: 'srv-quan-ly-chien-dich',
        code: 'DV-QLCD',
        name: 'Quản Lý & Vận Hành Chiến Dịch Callbot',
        category: 'Dịch vụ',
        unit: 'Chiến dịch/tháng',
        price: 1000000,
        description: 'Chuyên viên Etron trực tiếp vận hành, lọc data, giám sát và tối ưu tỷ lệ nghe máy hàng tháng.',
        warranty: 'Hàng tháng'
    },
    {
        id: 'srv-tich-hop-api',
        code: 'DV-TICH',
        name: 'Khởi Tạo Tích Hợp Hệ Thống Qua API',
        category: 'Dịch vụ',
        unit: 'Lần',
        price: 1000000,
        description: 'Phí thiết lập kết nối 2 chiều giữa Callbot/CRM với website, ERP, landing page của doanh nghiệp.',
        warranty: 'Nghiệm thu API'
    },
    {
        id: 'srv-duy-tri-api',
        code: 'DV-TICH-DT',
        name: 'Phí Duy Trì Tích Hợp Hệ Thống',
        category: 'Dịch vụ',
        unit: 'Tích hợp/tháng',
        price: 100000,
        description: 'Duy trì webhook và bảo trì cổng API hoạt động ổn định liên tục (100.000₫/tích hợp/tháng).',
        warranty: 'Hàng tháng'
    },
    {
        id: 'srv-quet-data',
        code: 'DV-ADL',
        name: 'Quét Data Khách Hàng Tiềm Năng Adalead',
        category: 'Dịch vụ',
        unit: 'Nhóm FB',
        price: 100000,
        description: 'Quét tương tác và trích xuất danh sách khách hàng từ các nhóm/fanpage Facebook (100.000₫/nhóm/lần).',
        warranty: 'Bàn giao data'
    },
    {
        id: 'srv-setup-ky-thuat',
        code: 'DV-SETUP',
        name: 'Dịch Vụ Setup Kỹ Thuật Theo Yêu Cầu',
        category: 'Dịch vụ',
        unit: 'Lần',
        price: 200000,
        description: 'Khảo sát và cấu hình kỹ thuật chuyên sâu theo nhu cầu đặc thù (200.000₫ – 2.000.000₫/lần).',
        warranty: 'Nghiệm thu kỹ thuật'
    },

    // 4. ĐẦU SỐ (Phí khởi tạo và duy trì đầu số đã bao gồm VAT 10%)
    {
        id: 'num-chung-codinh',
        code: 'NUM-SHARED',
        name: 'Đầu số chung cố định (Kho Etron)',
        category: 'Đầu số',
        unit: 'Số',
        price: 0,
        description: 'Kho chung của công ty ETRON, không phát sinh phí đầu số và phí kết nối (Cước Callbot: 70đ/block 6s, Cước Tổng đài: 700đ/phút).',
        warranty: 'Kho chung Etron'
    },
    {
        id: 'num-khoi-tao-codinh',
        code: 'NUM-CD-KT',
        name: 'Phí khởi tạo đầu số riêng cố định',
        category: 'Đầu số',
        unit: 'Số (1 lần)',
        price: 0,
        description: 'Khởi tạo đầu số cố định riêng cho doanh nghiệp: miễn phí. Cước Callbot: 70đ/block 6s, Cước Tổng đài: 660đ/phút. Kết nối khi thay từng số: 200.000₫/lần (miễn phí khi dùng số ảo tự thay số hoặc khi kết nối qua đối tác của ETRON).',
        warranty: 'Nhà mạng'
    },
    {
        id: 'num-duy-tri-codinh',
        code: 'NUM-CD-DT',
        name: 'Phí duy trì đầu số riêng cố định',
        category: 'Đầu số',
        unit: 'Số/tháng',
        price: 20000,
        description: 'Duy trì hàng tháng đầu số cố định riêng (20.000₫/đầu số/tháng, đã bao gồm VAT 10%).',
        warranty: 'Nhà mạng'
    },
    {
        id: 'num-khoi-tao-didong',
        code: 'NUM-MB-KT',
        name: 'Phí khởi tạo đầu số riêng di động',
        category: 'Đầu số',
        unit: 'Số (1 lần)',
        price: 50000,
        description: 'Khởi tạo đầu số di động riêng cho doanh nghiệp (50.000₫/đầu số, đã bao gồm VAT 10%). Cước Callbot: 80đ/block 6s, Cước Tổng đài: 720đ/phút. Kết nối khi thay từng số: 200.000₫/lần (miễn phí khi dùng số ảo tự thay số).',
        warranty: 'Nhà mạng'
    },
    {
        id: 'num-duy-tri-didong',
        code: 'NUM-MB-DT',
        name: 'Phí duy trì đầu số riêng di động',
        category: 'Đầu số',
        unit: 'Số/tháng',
        price: 60000,
        description: 'Duy trì hàng tháng đầu số di động riêng (60.000₫/đầu số/tháng, đã bao gồm VAT 10%).',
        warranty: 'Nhà mạng'
    },
    {
        id: 'num-brandname-viettel',
        code: 'NUM-BN-VT',
        name: 'Khởi tạo Voice Brandname - Viettel',
        category: 'Đầu số',
        unit: 'Thuê bao',
        price: 100000,
        description: 'Khai báo tên thương hiệu cuộc gọi mạng Viettel (100.000₫/thuê bao, đã bao gồm VAT 10%).',
        warranty: 'Nhà mạng'
    },
    {
        id: 'num-brandname-mobifone',
        code: 'NUM-BN-MB',
        name: 'Khởi tạo Voice Brandname - MobiFone',
        category: 'Đầu số',
        unit: 'Thuê bao',
        price: 100000,
        description: 'Khai báo tên thương hiệu cuộc gọi mạng MobiFone (100.000₫/thuê bao, đã bao gồm VAT 10%).',
        warranty: 'Nhà mạng'
    },
    {
        id: 'num-brandname-vinaphone',
        code: 'NUM-BN-VN',
        name: 'Khởi tạo Voice Brandname - VinaPhone',
        category: 'Đầu số',
        unit: 'Thuê bao',
        price: 100000,
        description: 'Khai báo tên thương hiệu cuộc gọi mạng VinaPhone (100.000₫/thuê bao, đã bao gồm VAT 10%).',
        warranty: 'Nhà mạng'
    },
    {
        id: 'num-brandname-combo',
        code: 'NUM-BN-COMBO',
        name: 'Combo khởi tạo Voice Brandname (3 mạng Viettel, Mobi, Vina)',
        category: 'Đầu số',
        unit: 'Combo',
        price: 300000,
        description: 'Khởi tạo 100.000₫/thuê bao, mua tối thiểu 3 đầu số (MobiFone, Viettel, VinaPhone), tổng 300.000₫ (đã bao gồm VAT 10%). Mỗi đầu số chỉ gọi được nội mạng của nhà mạng đó. Có thể sử dụng Tên công ty làm Voice Brandname mà không bắt buộc phải có giấy chứng nhận tên định danh (miễn phí đăng ký brandname trong trường hợp này). Nếu đăng ký tên định danh riêng: thời gian dự kiến khoảng 1 tháng; chi phí gồm 2.000.000 VNĐ phí đăng ký và 200.000 VNĐ/năm phí duy trì. Dịch vụ Brandname chỉ áp dụng cho doanh nghiệp/tổ chức, cá nhân không thể đăng ký.',
        warranty: 'Nhà mạng'
    },
    {
        id: 'num-brandname-duy-tri',
        code: 'NUM-BN-DT',
        name: 'Phí duy trì Voice Brandname',
        category: 'Đầu số',
        unit: 'Số/tháng',
        price: 60000,
        description: 'Duy trì Voice Brandname hàng tháng (60.000₫/đầu số/tháng, đã bao gồm VAT 10%).',
        warranty: 'Nhà mạng'
    },

    // 5. VÍ CƯỚC VIỄN THÔNG (Đã bao gồm VAT 10% - Không tính chung thuế VAT 8%)
    {
        id: 'vi-cuoc-vien-thong',
        code: 'VI-CUOC',
        name: 'Nạp cước viễn thông trả trước (Đã gồm VAT 10%)',
        category: 'Cước',
        unit: 'Lần nạp',
        price: 1000000,
        description: 'Nạp cước viễn thông trả trước tối thiểu 1.000.000₫ (đã gồm VAT 10%). Cước cuộc gọi thực tế trừ dần vào ví cước.',
        warranty: 'Trừ theo thực tế'
    }
];

// Kho tài liệu chuẩn theo dữ liệu thực tế của người dùng trên hệ thống
const DEFAULT_DOCUMENTS = [
    {
        id: 'doc-etron-001',
        title: 'Báo Giá Callbot Full Gói',
        category: 'Bảng giá',
        type: 'link',
        fileUrl: 'https://docs.google.com/spreadsheets/d/1JZrRKMKROb0cnQ_3rnOqmm9qgOJ1qthUkEfx8Hn1Kp8/edit',
        fileSize: 'Google Sheets',
        fileType: 'xlsx',
        description: 'File báo giá chính thức, dạng tổng toàn bộ các gói của Callbot và CRM trên Google Sheets',
        updatedAt: '2026-10-13',
        updatedAtTime: 1791911919832,
        tags: ['full gói', 'báo giá', 'callbot', 'crm'],
        pinned: false
    },
    {
        id: 'doc-etron-002',
        title: 'Toàn Bộ Bảng Giá Chính Thức',
        category: 'Bảng giá',
        type: 'link',
        fileUrl: 'https://drive.google.com/drive/folders/1dLC5RB1i7FK4mpVMafg7AVx78K2xIETX',
        fileSize: 'Drive Folder',
        fileType: 'drive',
        description: 'Thư mục Google Drive lưu trữ toàn bộ các file PDF bảng giá chính thức để gửi trực tiếp cho khách hàng.',
        updatedAt: '2026-10-13',
        updatedAtTime: 1791911845990,
        tags: ['bảng giá', 'crm', 'callbot', 'đối tác'],
        pinned: true
    },
    {
        id: 'doc-etron-006',
        title: 'Tài Liệu Sale & CS',
        category: 'Tài liệu chung',
        type: 'link',
        fileUrl: 'https://drive.google.com/drive/folders/16uA2vLYzEVJ2Za_2WHBMIFHAG1MKwhVZ',
        fileSize: 'Drive Folder',
        fileType: 'drive',
        description: 'Folder chứa các file về chính sách sale và CS, có cả cơ chế thu hồi lead nữa',
        updatedAt: '2026-10-13',
        updatedAtTime: 1791911838922,
        tags: ['chính sách sale', 'chính sách cs', 'thu hồi lead'],
        pinned: true
    },
    {
        id: 'doc-user-1791912060239',
        title: 'Sales kit (Công ty)',
        category: 'Tài liệu chung',
        type: 'link',
        fileUrl: 'https://etron-salekit.vercel.app/',
        fileSize: 'Cloud Link',
        fileType: 'link',
        description: 'Trang web chung của công ty về các tài liệu của Sale',
        createdAt: 1791912060239,
        updatedAt: '2026-10-13',
        updatedAtTime: 1791920447684,
        tags: ['salekit', 'web chung', 'web tài liệu', 'sale'],
        pinned: true
    },
    {
        id: 'doc-user-1791912210919',
        title: 'AI Agent MCP (Công ty)',
        category: 'Tài liệu chung',
        type: 'link',
        fileUrl: 'https://v0-adahubaiagent.vercel.app/',
        fileSize: 'Cloud Link',
        fileType: 'link',
        description: 'Trang web về MCP cho khách hàng bên công ty cấp',
        createdAt: 1791912210919,
        updatedAt: '2026-10-13',
        updatedAtTime: 1791912210919,
        tags: ['mcp', 'ai agent'],
        pinned: false
    },
    {
        id: 'doc-user-1791912277778',
        title: 'Tài liệu HR Etron',
        category: 'HR',
        type: 'link',
        fileUrl: 'https://docs.google.com/spreadsheets/d/1rA1q7sUFy9qFko3c1QUb7aPjAaIFbKME_7JzWn4JC0o/edit?gid=0#gid=0',
        fileSize: 'Google Sheets',
        fileType: 'xlsx',
        description: 'File tổng hợp toàn bộ các tài liệu, quy trình của vị trí HR tại Etron',
        createdAt: 1791912277778,
        updatedAt: '2026-10-13',
        updatedAtTime: 1791912277778,
        tags: ['tuyển dụng', 'hr'],
        pinned: false
    },
    {
        id: 'doc-user-1791912424440',
        title: 'HDSD bước 2',
        category: 'Vid HDSD',
        type: 'link',
        fileUrl: 'https://drive.google.com/file/d/1TjeYECw8jCpEMp11KpXJkHWSQUleVpDW/view?usp=sharing',
        fileSize: 'Drive Folder',
        fileType: 'drive',
        description: 'Video hướng dẫn KH up file data bước 2',
        createdAt: 1791912424440,
        updatedAt: '2026-10-13',
        updatedAtTime: 1791912424440,
        tags: ['hdsd', 'bước 2', 'updata', 'tải data'],
        pinned: false
    },
    {
        id: 'doc-user-1791912528543',
        title: 'HDSD bước 3',
        category: 'Vid HDSD',
        type: 'link',
        fileUrl: 'https://drive.google.com/file/d/10LQNBd3Jfdj13aJ8Ayy09gi7omd_53iM/view?usp=sharing',
        fileSize: 'Drive Folder',
        fileType: 'drive',
        description: 'Video hướng dẫn KH cài đặt bước 3 Callbot',
        createdAt: 1791912528543,
        updatedAt: '2026-10-13',
        updatedAtTime: 1791912536510,
        tags: ['hdsd', 'bước 3', 'cài đặt'],
        pinned: false
    },
    {
        id: 'doc-user-1791923235936',
        title: 'Chính sách lưu trữ dữ liệu',
        category: 'Tài liệu chung',
        type: 'link',
        fileUrl: 'https://drive.google.com/file/d/1EDc9sCEwY3CNc6Kr7CxpIzMGlwyDnTrn/view?usp=drive_link',
        fileSize: 'Drive Folder',
        fileType: 'drive',
        description: 'Tài liệu thể hiện các thời gian lưu trữ data của hệ thống và phí hỗ trợ lấy lại data quá hạn',
        createdAt: 1791923235936,
        updatedAt: '2026-10-13',
        updatedAtTime: 1791923235936,
        tags: ['dữ liệu', 'data', 'lưu trữ'],
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
        // Chỉ khởi tạo giá trị mặc định khi trình duyệt hoàn toàn chưa có dữ liệu, tuyệt đối không ghi đè dữ liệu đã chỉnh sửa
        if (!localStorage.getItem(STORAGE_KEYS.COMPANY)) {
            localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(DEFAULT_COMPANY));
        }
        if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
            localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
        }
        if (!localStorage.getItem(STORAGE_KEYS.DOCUMENTS)) {
            localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(DEFAULT_DOCUMENTS));
        }
        if (!localStorage.getItem(STORAGE_KEYS.QUOTES)) {
            localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(DEFAULT_QUOTES));
        }
        if (!localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
            localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'v18_safe');
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
            let products = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS));
            if (!products || !Array.isArray(products) || products.length === 0) {
                products = DEFAULT_PRODUCTS;
                localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
            }
            // Chuẩn hóa danh mục rút gọn: CRM, Callbot, Đầu số, Cước, Dịch vụ
            const catMap = {
                'Phần mềm CRM': 'CRM',
                'Callbot AI': 'Callbot',
                'Ví cước viễn thông': 'Cước',
                'Dịch vụ đi kèm': 'Dịch vụ'
            };
            let updated = false;
            if (products.some(p => p.id === 'num-chung-didong')) {
                products = products.filter(p => p.id !== 'num-chung-didong');
                updated = true;
            }
            products = products.map(p => {
                if (p.category && catMap[p.category]) {
                    updated = true;
                    return { ...p, category: catMap[p.category] };
                }
                return p;
            });
            ['srv-ket-noi-thay-so', 'srv-dang-ky-brandname', 'srv-duy-tri-ten-brandname'].forEach(newId => {
                if (!products.some(p => p.id === newId)) {
                    const defItem = DEFAULT_PRODUCTS.find(p => p.id === newId);
                    if (defItem) {
                        products.push(defItem);
                        updated = true;
                    }
                }
            });
            if (updated) {
                localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
            }
            return products;
        } catch {
            return DEFAULT_PRODUCTS;
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
        if (window.firebaseDb) {
            window.firebaseDb.collection('config').doc('products').set({ list: JSON.parse(JSON.stringify(products)) })
                .catch(err => console.warn('Lỗi ghi sản phẩm Firestore:', err));
        }
        return product;
    }

    deleteProduct(id) {
        const products = this.getProducts().filter(p => p.id !== id);
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
        if (window.firebaseDb) {
            window.firebaseDb.collection('config').doc('products').set({ list: JSON.parse(JSON.stringify(products)) })
                .catch(err => console.warn('Lỗi xóa sản phẩm Firestore:', err));
        }
    }

    // Documents
    getAllDocuments() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.DOCUMENTS)) || [];
        } catch {
            return [];
        }
    }

    getDocuments() { return this.getAllDocuments().filter(doc => !doc.deletedAt); }
    getTrashedDocuments() { return this.getAllDocuments().filter(doc => !!doc.deletedAt); }

    saveDocument(doc) {
        const docs = this.getAllDocuments();
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

    async deleteDocument(id) { return this.setDocumentTrashState(id, Date.now()); }
    async restoreDocument(id) { return this.setDocumentTrashState(id, null); }
    async permanentlyDeleteDocument(id) {
        if (window.firebaseDb) {
            await window.firebaseDb.collection('documents').doc(id).delete();
        }
        const latest = this.getAllDocuments().filter(item => item.id !== id);
        localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(latest));
    }
    async setDocumentTrashState(id, deletedAt) {
        const docs = this.getAllDocuments();
        const doc = docs.find(item => item.id === id);
        if (!doc) throw new Error('Không tìm thấy tài liệu.');
        if (window.firebaseDb) await window.firebaseDb.collection('documents').doc(id).update({ deletedAt });
        const latest = this.getAllDocuments();
        const current = latest.find(item => item.id === id);
        if (current) current.deletedAt = deletedAt;
        localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(latest));
    }

    // ==========================================
    // Quản lý Danh Mục Tài Liệu (Document Categories)
    // ==========================================
    getDocumentCategories() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENT_CATEGORIES);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    parsed.forEach(c => {
                        if (!c.icon || c.icon === 'tag') {
                            c.icon = detectCategoryIcon(c.name);
                        }
                    });
                    return parsed;
                }
            }
        } catch {}
        return JSON.parse(JSON.stringify(DEFAULT_DOCUMENT_CATEGORIES));
    }

    saveDocumentCategory(cat) {
        const categories = this.getDocumentCategories();
        let targetCat = null;
        const assignedIcon = (cat.icon && cat.icon !== 'tag') ? cat.icon : detectCategoryIcon(cat.name);

        if (cat.id) {
            const idx = categories.findIndex(c => c.id === cat.id);
            if (idx !== -1) {
                targetCat = { ...categories[idx], ...cat, icon: assignedIcon };
                categories[idx] = targetCat;
            } else {
                targetCat = { ...cat, icon: assignedIcon };
                categories.push(targetCat);
            }
        } else {
            targetCat = { ...cat, id: 'cat-' + Date.now(), icon: assignedIcon, pinned: Boolean(cat.pinned) };
            categories.push(targetCat);
        }

        localStorage.setItem(STORAGE_KEYS.DOCUMENT_CATEGORIES, JSON.stringify(categories));

        if (window.firebaseDb) {
            window.firebaseDb.collection('config').doc('categories').set({ list: JSON.parse(JSON.stringify(categories)) })
                .catch(err => console.warn('Lỗi ghi danh mục Firestore:', err));
        }
        return targetCat;
    }

    toggleCategoryPin(catId) {
        const categories = this.getDocumentCategories();
        const cat = categories.find(c => c.id === catId || c.name === catId);
        if (!cat) return false;

        cat.pinned = !cat.pinned;
        this.saveDocumentCategory(cat);
        return cat.pinned;
    }

    deleteDocumentCategory(catId) {
        let categories = this.getDocumentCategories();
        categories = categories.filter(c => c.id !== catId);
        localStorage.setItem(STORAGE_KEYS.DOCUMENT_CATEGORIES, JSON.stringify(categories));

        if (window.firebaseDb) {
            window.firebaseDb.collection('config').doc('categories').set({ list: JSON.parse(JSON.stringify(categories)) })
                .catch(err => console.warn('Lỗi xóa danh mục Firestore:', err));
        }
    }

    // ==========================================
    // Quản lý Bộ Từ Khóa & Kịch Bản Callbot
    // ==========================================
    getCallbotKeywords() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.CALLBOT_KEYWORDS);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && (
                    (Array.isArray(parsed.common) && parsed.common.length > 0) ||
                    (Array.isArray(parsed.industries) && parsed.industries.length > 0)
                )) {
                    return parsed;
                }
            }
        } catch {}

        const def = (typeof DEFAULT_CALLBOT_KEYWORDS !== 'undefined') ? DEFAULT_CALLBOT_KEYWORDS : (window.DEFAULT_CALLBOT_KEYWORDS || null);
        if (def) {
            return JSON.parse(JSON.stringify(def));
        }
        return { common: [], industries: [] };
    }

    saveCallbotKeywords(keywords) {
        const cleanKeywords = JSON.parse(JSON.stringify(keywords));
        localStorage.setItem(STORAGE_KEYS.CALLBOT_KEYWORDS, JSON.stringify(cleanKeywords));
        if (window.firebaseDb) {
            window.firebaseDb.collection('config').doc('callbot_keywords').set({ data: cleanKeywords })
                .catch(err => console.warn('Lỗi ghi bộ từ khóa Firestore:', err));
        }
        return cleanKeywords;
    }

    getCallbotTemplates() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.CALLBOT_TEMPLATES);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch {}

        const def = (typeof DEFAULT_CALLBOT_TEMPLATES !== 'undefined') ? DEFAULT_CALLBOT_TEMPLATES : (window.DEFAULT_CALLBOT_TEMPLATES || []);
        if (def && def.length > 0) {
            return JSON.parse(JSON.stringify(def));
        }
        return [];
    }

    saveCallbotTemplate(tpl) {
        const templates = this.getCallbotTemplates();
        let target = null;
        if (tpl.id) {
            const idx = templates.findIndex(t => t.id === tpl.id);
            if (idx !== -1) {
                target = { ...templates[idx], ...tpl, updatedAt: new Date().toISOString().split('T')[0] };
                templates[idx] = target;
            } else {
                target = { ...tpl, updatedAt: new Date().toISOString().split('T')[0] };
                templates.unshift(target);
            }
        } else {
            target = { ...tpl, id: 'cb-tpl-' + Date.now(), updatedAt: new Date().toISOString().split('T')[0] };
            templates.unshift(target);
        }
        localStorage.setItem(STORAGE_KEYS.CALLBOT_TEMPLATES, JSON.stringify(templates));
        if (window.firebaseDb) {
            window.firebaseDb.collection('callbot_templates').doc(target.id).set(JSON.parse(JSON.stringify(target)))
                .catch(err => console.warn('Lỗi ghi kịch bản mẫu Firestore:', err));
        }
        return target;
    }

    saveCallbotTemplates(templates) {
        if (!Array.isArray(templates)) return [];
        localStorage.setItem(STORAGE_KEYS.CALLBOT_TEMPLATES, JSON.stringify(templates));
        if (window.firebaseDb) {
            templates.forEach(tpl => {
                if (tpl && tpl.id) {
                    window.firebaseDb.collection('callbot_templates').doc(tpl.id).set(JSON.parse(JSON.stringify(tpl)))
                        .catch(err => console.warn('Lỗi đồng bộ kịch bản mẫu Firestore:', err));
                }
            });
        }
        return templates;
    }

    deleteCallbotTemplate(tplId) {
        let templates = this.getCallbotTemplates();
        templates = templates.filter(t => t.id !== tplId);
        localStorage.setItem(STORAGE_KEYS.CALLBOT_TEMPLATES, JSON.stringify(templates));
        if (window.firebaseDb) {
            window.firebaseDb.collection('callbot_templates').doc(tplId).delete()
                .catch(err => console.warn('Lỗi xóa kịch bản mẫu Firestore:', err));
        }
    }

    // ==========================================
    // Quản lý Thư Viện Media (Audio & Video)
    // ==========================================
    getCallbotMedia() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.CALLBOT_MEDIA);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    const valid = parsed.filter(m => m && typeof m === 'object' && !Array.isArray(m) && m.title);
                    return valid;
                }
            }
        } catch {}

        const def = (typeof DEFAULT_CALLBOT_MEDIA !== 'undefined') ? DEFAULT_CALLBOT_MEDIA : (window.DEFAULT_CALLBOT_MEDIA || []);
        if (def && def.length > 0) {
            return JSON.parse(JSON.stringify(def));
        }
        return [];
    }

    saveCallbotMedia(media) {
        if (Array.isArray(media)) {
            const validList = media.filter(m => m && typeof m === 'object' && !Array.isArray(m) && m.title);
            localStorage.setItem(STORAGE_KEYS.CALLBOT_MEDIA, JSON.stringify(validList));
            if (window.firebaseDb) {
                validList.forEach(item => {
                    if (item && item.id) {
                        window.firebaseDb.collection('callbot_media').doc(item.id).set(JSON.parse(JSON.stringify(item)))
                            .catch(err => console.warn('Lỗi đồng bộ media Firestore:', err));
                    }
                });
            }
            return validList;
        }
        const list = this.getCallbotMedia();
        let target = null;
        if (media.id) {
            const idx = list.findIndex(m => m.id === media.id);
            if (idx !== -1) {
                target = { ...list[idx], ...media, updatedAt: new Date().toISOString().split('T')[0] };
                list[idx] = target;
            } else {
                target = { ...media, updatedAt: new Date().toISOString().split('T')[0] };
                list.unshift(target);
            }
        } else {
            target = { ...media, id: 'cb-med-' + Date.now(), updatedAt: new Date().toISOString().split('T')[0] };
            list.unshift(target);
        }
        localStorage.setItem(STORAGE_KEYS.CALLBOT_MEDIA, JSON.stringify(list));
        if (window.firebaseDb) {
            window.firebaseDb.collection('callbot_media').doc(target.id).set(JSON.parse(JSON.stringify(target)))
                .catch(err => console.warn('Lỗi ghi media Firestore:', err));
        }
        return target;
    }

    deleteCallbotMedia(mediaId) {
        let list = this.getCallbotMedia();
        list = list.filter(m => m.id !== mediaId);
        localStorage.setItem(STORAGE_KEYS.CALLBOT_MEDIA, JSON.stringify(list));
        if (window.firebaseDb) {
            window.firebaseDb.collection('callbot_media').doc(mediaId).delete()
                .catch(err => console.warn('Lỗi xóa media Firestore:', err));
        }
    }

    setupCloudSync() {
        if (!window.firebaseDb) return;

        try {
            // 1. Đồng bộ Kho Tài Liệu Real-time (Không bao giờ tự động đẩy lại file mặc định đã xóa lên Firestore)
            window.firebaseDb.collection('documents').onSnapshot((snapshot) => {
                if (snapshot.empty && snapshot.metadata && snapshot.metadata.fromCache) {
                    return; // Bỏ qua snapshot rỗng từ cache trước khi kết nối máy chủ
                }
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
                    if (typeof window.documentHub.syncLocalIndexedDBFilesToCloud === 'function') {
                        window.documentHub.syncLocalIndexedDBFilesToCloud();
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
                            window.documentHub.renderQuickAccess();
                        }
                    }
                }
            }, (error) => {
                console.warn('Lỗi đồng bộ danh mục Firestore:', error);
            });

            // 3. Đồng bộ Bộ Từ Khóa Callbot Real-time
            window.firebaseDb.collection('config').doc('callbot_keywords').onSnapshot((docSnap) => {
                if (docSnap.exists) {
                    const data = docSnap.data();
                    if (data && data.data && (
                        (Array.isArray(data.data.common) && data.data.common.length > 0) ||
                        (Array.isArray(data.data.industries) && data.data.industries.length > 0)
                    )) {
                        localStorage.setItem(STORAGE_KEYS.CALLBOT_KEYWORDS, JSON.stringify(data.data));
                        if (window.callbotHub) window.callbotHub.render();
                    }
                }
            }, (err) => console.warn('Lỗi đồng bộ từ khóa Firestore:', err));

            // 4. Đồng bộ Kịch Bản Mẫu Callbot Real-time
            window.firebaseDb.collection('callbot_templates').onSnapshot((snapshot) => {
                if (snapshot.empty && snapshot.metadata && snapshot.metadata.fromCache) {
                    return;
                }
                const cloudTpls = [];
                snapshot.forEach(docSnap => cloudTpls.push({ id: docSnap.id, ...docSnap.data() }));
                localStorage.setItem(STORAGE_KEYS.CALLBOT_TEMPLATES, JSON.stringify(cloudTpls));
                if (window.callbotHub && window.callbotHub.activeSubTab === 'templates') window.callbotHub.render();
            }, (err) => console.warn('Lỗi đồng bộ kịch bản Firestore:', err));

            // 5. Đồng bộ Thư Viện Media Callbot Real-time
            window.firebaseDb.collection('callbot_media').onSnapshot((snapshot) => {
                if (snapshot.empty && snapshot.metadata && snapshot.metadata.fromCache) {
                    return;
                }
                const cloudMedia = [];
                snapshot.forEach(docSnap => cloudMedia.push({ id: docSnap.id, ...docSnap.data() }));
                localStorage.setItem(STORAGE_KEYS.CALLBOT_MEDIA, JSON.stringify(cloudMedia));
                if (window.callbotHub && window.callbotHub.activeSubTab === 'media') {
                    window.callbotHub.renderMedia();
                }
            }, (err) => console.warn('Lỗi đồng bộ media Firestore:', err));

            // 6. Đồng bộ Danh Mục Sản Phẩm Real-time
            window.firebaseDb.collection('config').doc('products').onSnapshot((docSnap) => {
                if (docSnap.exists) {
                    const data = docSnap.data();
                    if (data && Array.isArray(data.list) && data.list.length > 0) {
                        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data.list));
                        if (window.productCatalog) window.productCatalog.renderCatalogTable();
                    }
                }
            }, (err) => console.warn('Lỗi đồng bộ sản phẩm Firestore:', err));

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
            documents: this.getAllDocuments(),
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
