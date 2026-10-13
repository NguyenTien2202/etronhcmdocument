/**
 * Dữ Liệu Mẫu Chuẩn Cho Kho Kịch Bản & Bộ Từ Khóa Callbot AI - Etron Solutions
 * Trích xuất từ thực tế vận hành và Google Sheets Palm River (BĐS) của bạn Ly
 */

const DEFAULT_CALLBOT_KEYWORDS = {
    // 1. BỘ TỪ KHÓA DÙNG CHUNG (Mọi ngành nghề đều sử dụng)
    common: [
        {
            id: 'kw-common-zalo',
            name: 'Đồng ý kết bạn & Gửi Zalo',
            category: 'common',
            icon: 'message-circle',
            color: 'emerald',
            description: 'Khách hàng đồng ý kết bạn Zalo hoặc yêu cầu gửi thông tin, bảng giá qua Zalo/tin nhắn.',
            actionGuide: 'Chuyển trạng thái SĐT sang Tiềm năng (Gửi Zalo), kích hoạt kịch bản kết bạn Zalo tự động.',
            keywords: [
                'zalo', 'da lô', 'da lo', 'gửi thông tin', 'gửi cho', 'gửi qua', 'gửi vào', 'tài liệu',
                'bảng thông tin', 'gửi chính sách', 'gửi bảng giá', 'gửi mặt bằng', 'gửi hình ảnh',
                'gửi ảnh', 'gửi vi deo', 'gửi video', 'mình xem sau', 'gửi em', 'gửi chị', 'gửi mình',
                'kết bạn', 'kết nối', 'nhắn tin', 'nhắn qua', 'nhắn vào', 'nhắn vô', 'gửi vô', 'gửi vào',
                'ô kê', 'gửi qua', 'gửi', 'gửi đi', 'gửi xem', 'gửi coi', 'xem nào', 'số này', 'số khác',
                'tìm hiểu', 'nghiên cứu', 'xem xét', 'kết bạn', 'điện thoại', 'thông tin', 'qua đây', 'oke em', 'ok em'
            ]
        },
        {
            id: 'kw-common-reject',
            name: 'Từ chối / Không có nhu cầu',
            category: 'common',
            icon: 'x-circle',
            color: 'rose',
            description: 'Khách hàng từ chối, không có nhu cầu, bận, hết tiền hoặc yêu cầu không làm phiền.',
            actionGuide: 'Bot cảm ơn và chào lịch sự, kết thúc cuộc gọi nhanh dưới 3s, tag KNC để tránh gọi lại.',
            keywords: [
                'không cần', 'không có nhu cầu', 'không nhu cầu', 'không quan tâm', 'không đâu',
                'không cần đâu', 'không mua', 'không muốn mua', 'không có tiền', 'hết tiền', 'đang nghèo',
                'không muốn', 'chưa đâu', 'chưa cần', 'không tìm', 'thôi em', 'xin lỗi', 'cảm ơn',
                'thôi nha', 'thôi được rồi', 'khỏi cần', 'khỏi em', 'vậy thôi', 'đừng gọi', 'làm phiền',
                'phiền', 'đừng nói', 'không em', 'khỏi', 'không nha', 'không nhé', 'chưa có', 'không nghe',
                'thôi', 'cám ơn', 'nghèo', 'không tiền'
            ]
        },
        {
            id: 'kw-common-interested',
            name: 'Lắng nghe / Muốn tư vấn thêm',
            category: 'common',
            icon: 'help-circle',
            color: 'indigo',
            description: 'Khách hàng có nhu cầu lắng nghe giới thiệu, quan tâm và sẵn sàng nghe tiếp.',
            actionGuide: 'Bot tiếp tục trình bày ưu điểm cốt lõi và điều hướng hẹn tư vấn chuyên sâu / kết bạn Zalo.',
            keywords: [
                'tư vấn', 'nói thêm', 'nói rõ', 'nói kỹ', 'chia sẻ thêm', 'chia sẻ đi', 'giới thiệu',
                'nói qua', 'biết thêm', 'tìm hiểu', 'nói tiếp', 'cứ nói', 'nói đi', 'nghe đây', 'được em',
                'ừ được', 'được đấy', 'được được', 'được đó', 'cũng được', 'thử xem', 'đang quan tâm',
                'khá quan tâm', 'có quan tâm', 'đang tìm hiểu', 'muốn tìm hiểu', 'đang xem', 'đang nghiên cứu',
                'cân nhắc', 'xem xét', 'thấy cũng ổn', 'khá ổn', 'phù hợp', 'cụ thể', 'nói đi', 'đang nghe',
                'muốn nghe', 'nhất trí', 'chị nghe', 'anh nghe', 'mình nghe', 'tôi nghe'
            ]
        },
        {
            id: 'kw-common-busy',
            name: 'Bận / Hẹn gọi lại sau',
            category: 'common',
            icon: 'clock',
            color: 'amber',
            description: 'Khách hàng đang bận họp, lái xe, làm việc và muốn gọi lại sau.',
            actionGuide: 'Bot ghi nhận lịch hẹn, đề xuất gửi trước qua Zalo hoặc tự động lập lịch gọi lại sau 2-3 tiếng.',
            keywords: [
                'đang bận', 'bận rồi', 'bận lắm', 'bận chút', 'có việc', 'bận việc', 'làm việc',
                'đang họp', 'đang làm', 'giờ làm', 'chạy xe', 'đi xe', 'đi đường', 'lái xe', 'có khách',
                'tiếp khách', 'không tiện', 'ở ngoài', 'ngoài đường', 'đang ăn', 'cuộc họp', 'đông người',
                'gọi lại sau', 'gọi sau', 'lúc khác', 'khi khác', 'hôm khác', 'gọi lại', 'lại sau',
                'để sau', 'lát nói', 'lát gọi', 'bận nhé', 'bận em', 'anh bận', 'chị bận', 'đi làm',
                'họp', 'trên đường', 'chút nữa', 'không rảnh', 'ăn cỗ', 'tối', 'chiều'
            ]
        },
        {
            id: 'kw-common-telecom',
            name: 'Thuê bao / Hộp thư thoại / Máy bận',
            category: 'common',
            icon: 'phone-off',
            color: 'slate',
            description: 'Cuộc gọi gặp tổng đài nhà mạng, hộp thư thoại tự động, máy bận hoặc số không liên lạc được.',
            actionGuide: 'Bot tự ngắt cuộc gọi ngay lập tức trong 1-2s để tiết kiệm cước viễn thông.',
            keywords: [
                'thuê bao', 'quý khách', 'vui lòng', 'vi na phôn', 'mô bai phôn', 'viettel',
                'tổng đài', 'bấm phím', 'dơ năm bờ phôn', 'trợ lý ảo', 'tự động', 'lời nhắn',
                'chuyển đến', 'không liên lạc được', 'tạm thời', 'hộp thư thoại'
            ]
        },
        {
            id: 'kw-common-unclear',
            name: 'Chưa nghe rõ / Yêu cầu nói lại',
            category: 'common',
            icon: 'volume-2',
            color: 'blue',
            description: 'Khách hàng nghe không rõ âm thanh, bị ồn hoặc hỏi lại mục đích cuộc gọi.',
            actionGuide: 'Bot nhắc lại câu ngắn gọn, rõ ràng, giảm tốc độ nói và điều hướng gửi Zalo.',
            keywords: [
                'gì hả', 'hả gì', 'gì cơ', 'cái gì', 'nói lại', 'a lô', 'chưa hiểu', 'gì đấy',
                'nói chậm', 'nói lại', 'nói to', 'nói nhanh', 'chưa biết', 'chưa rõ', 'không rõ',
                'sao đấy', 'chưa nghe rõ', 'chả nghe', 'nghe gì', 'ồn', 'nói nhỏ', 'không nghe rõ',
                'sao thế', 'sao vậy', 'có việc gì', 'có gì không', 'gọi làm gì', 'gọi cho tôi có việc',
                'mục đích gì', 'để làm gì', 'làm gì'
            ]
        }
    ],

    // 2. BỘ TỪ KHÓA RIÊNG THEO TỪNG NGÀNH NGHỀ
    industries: [
        {
            id: 'ind-bds',
            name: 'Bất Động Sản & Nhà Đất',
            icon: 'building-2',
            badgeColor: 'emerald',
            description: 'Trọn bộ 9 trường nhận diện chuyên sâu bóc tách từ chiến dịch Palm River (Palm City) của Hướng Việt Properties.',
            groups: [
                {
                    id: 'bds-gia',
                    name: 'Hỏi Giá & Lịch Thanh Toán & Chiết Khấu',
                    icon: 'dollar-sign',
                    description: 'Khách hàng hỏi giá bán rumor, đơn giá m2, tổng tiền hoặc chê giá cao, hỏi phương thức thanh toán.',
                    keywords: [
                        'giá cao', 'cao quá', 'cao hơn', 'nhỉnh hơn', 'chênh hơn', 'cao thế', 'mắc quá', 'mắc thế',
                        'đắt nhờ', 'đắt thế', 'mắc nhờ', 'hơi cao', 'hơi nhỉnh', 'cao nhỉ', 'cao vậy', 'chi phí cao',
                        'giá đắt', 'giá mắc', 'giá hơi mắc', 'giá chát', 'chát thế', 'giá không rẻ', 'đắt thật', 'mắc thật',
                        'giá cả', 'giá sao', 'giá bên', 'bao nhiêu', 'bao tiền', 'nhiêu tiền', 'bao tỷ', 'đơn giá',
                        'thanh toán', 'bao tiền', 'miễn phí', 'ưu đãi', 'chiết khấu', 'tỷ', 'bảng giá', 'giá cụ thể',
                        'mét vuông', 'nhiu mét', 'thanh khoản', 'giá bao nhiêu', 'căn này bao tiền', 'giá như nào', 'mức giá',
                        'giá ra sao', 'tầm bao nhiêu', 'khoảng bao nhiêu', 'tầm giá', 'giá một ngủ', 'giá 2 ngủ', 'giá hai phòng',
                        'đặt cọc', 'booking', 'lịch thanh toán', 'thương lượng', 'giá tốt không', 'vừa tiền không'
                    ]
                },
                {
                    id: 'bds-vi-tri',
                    name: 'Hỏi Vị Trí & Kết Nối Giao Thông',
                    icon: 'map-pin',
                    description: 'Khách hỏi vị trí dự án, khoảng cách trung tâm, đường xá kết nối.',
                    keywords: [
                        'thành phố', 'khu nào', 'chỗ nào', 'tỉnh nào', 'khu vực', 'địa chỉ', 'địa điểm', 'nằm ở',
                        'thuộc chỗ', 'gần chỗ', 'gần phía', 'gần bên', 'phía nào', 'dự án', 'quận nào', 'ở đâu',
                        'nằm chỗ', 'đoạn nào', 'phường nào', 'xa không', 'cách trung tâm', 'gần không', 'hướng nào',
                        'đường nào', 'song hành', 'cao tốc', 'an phú', 'mai chí thọ', 'thủ thiêm', 'bình trưng', 'quận 2', 'nam rạch chiếc'
                    ]
                },
                {
                    id: 'bds-chu-dau-tu',
                    name: 'Hỏi Chủ Đầu Tư & Đơn Vị Phân Phối',
                    icon: 'briefcase',
                    description: 'Khách hỏi ai là chủ đầu tư, sàn phân phối nào, gọi từ đơn vị nào.',
                    keywords: [
                        'chủ đầu tư', 'công ty', 'sàn nào', 'dự án gì', 'dự án nào', 'dự án tên', 'tên dự án',
                        'thông tin dự án', 'bên nào', 'ai đấy', 'công ty nào', 'văn phòng', 'trụ sở', 'em là ai',
                        'đại lý', 'là ai vậy', 'đơn vị nào', 'đơn vị gì', 'làm ở đâu', 'bên em làm gì', 'ai gọi vậy',
                        'tập đoàn nào', 'hướng việt', 'keppel land', 'tiến phước'
                    ]
                },
                {
                    id: 'bds-tien-do',
                    name: 'Hỏi Tiến Độ Xây Dựng & Bàn Giao',
                    icon: 'hourglass',
                    description: 'Khách hỏi khi nào bàn giao nhà, hiện tại đã xây đến đâu, san lấp móng hầm.',
                    keywords: [
                        'bàn giao', 'tiến độ', 'thời gian bàn giao', 'ra hàng chưa', 'mở bán chưa', 'nhận nhà',
                        'có thể ở', 'xây chưa', 'xây đến đâu', 'khi nào', 'hoàn thiện', 'xây xong', 'khởi công',
                        'động thổ', 'thi công', 'làm tới đâu', 'xong chưa', 'xây bao lâu', 'vào ở', 'ở được chưa',
                        'tình hình dự án', 'triển khai', 'mở bán', 'giữ chỗ', 'giỏ hàng', 'sắp xong', 'móng hầm'
                    ]
                },
                {
                    id: 'bds-sa-ban',
                    name: 'Hỏi Sa Bàn & Nhà Mẫu & Tham Quan Thực Tế',
                    icon: 'eye',
                    description: 'Khách hỏi có nhà mẫu chưa, sa bàn ở đâu để qua xem trực tiếp.',
                    keywords: [
                        'sa bàn', 'xa bàn', 'tham quan', 'mô hình', 'nhà mẫu', 'căn mẫu', 'xem thực tế',
                        'xem trực tiếp', 'tham quan thực tế', 'thực tế', 'showroom', 'xâu rum', 'sâu rum',
                        'qua xem', 'đi xem', 'có mẫu', 'căn thực tế', 'sales gallery', 'nhà điều hành'
                    ]
                },
                {
                    id: 'bds-loai-hinh',
                    name: 'Hỏi Loại Hình Căn Hộ (1PN, 2PN, Penthouse...)',
                    icon: 'layout-grid',
                    description: 'Khách hỏi có căn mấy phòng ngủ, diện tích, studio hay penthouse.',
                    keywords: [
                        'loại nào', 'căn nào', 'có căn hộ', 'có biệt thự', 'shophouse', 'loại hình', 'sản phẩm',
                        'mấy phòng', 'phòng ngủ', 'ngủ cộng', '1 phòng', 'một phòng', '2 phòng', 'hai phòng',
                        '3 phòng', 'ba phòng', '2 ngủ', '1 ngủ', '3 ngủ', 'một ngủ', 'hai ngủ', 'ba ngủ',
                        'studio', 'loại căn hộ', 'loại căn', 'duplex', 'penthouse', 'căn góc', 'view đẹp',
                        'thông tầng', 'villa', 'diện tích', 'bao nhiêu phòng', 'có căn nhỏ', 'có căn lớn'
                    ]
                },
                {
                    id: 'bds-phap-ly',
                    name: 'Hỏi Pháp Lý & Sổ Đỏ / Sổ Hồng / 1/500',
                    icon: 'shield-check',
                    description: 'Khách hỏi tính pháp lý dự án, giấy phép xây dựng, thời hạn sở hữu.',
                    keywords: [
                        'pháp lý', 'pháp lý dự án', 'pháp lý thế nào', 'pháp lý ổn không', 'pháp lý đầy đủ chưa',
                        'giấy tờ', 'giấy tờ pháp lý', 'hồ sơ pháp lý', 'giấy phép xây dựng', 'được cấp phép chưa',
                        'quy hoạch', 'quy hoạch 1/500', 'có 1/500 chưa', 'chủ trương đầu tư', 'quyền sử dụng đất',
                        'sổ đỏ', 'sổ hồng', 'có sổ không', 'khi nào có sổ', 'sổ riêng', 'sở hữu lâu dài',
                        'thời hạn sở hữu', 'hợp đồng mua bán', 'ngân hàng bảo lãnh', 'có tranh chấp không', 'an toàn không'
                    ]
                },
                {
                    id: 'bds-tien-ich',
                    name: 'Hỏi Tiện Ích Nội Khu & Sức Khỏe',
                    icon: 'trees',
                    description: 'Khách hỏi về hồ bơi, công viên, trường học, bệnh viện, khu vui chơi.',
                    keywords: [
                        'tiện ích', 'tiện nghi', 'dịch vụ', 'có cái gì', 'có những gì', 'tiện ích gì',
                        'nổi bật', 'đặc biệt', 'nội khu có gì', 'hồ bơi', 'công viên', 'khu vui chơi',
                        'sân chơi trẻ em', 'phòng gym', 'phòng tập', 'chăm sóc sức khỏe', 'trị liệu',
                        'trường học quốc tế', 'bệnh viện', 'trung tâm thương mại'
                    ]
                },
                {
                    id: 'bds-dien-tich',
                    name: 'Hỏi Diện Tích & Quy Mô Mặt Bằng',
                    icon: 'maximize-2',
                    description: 'Khách hỏi diện tích chi tiết các căn và quy mô diện tích đất dự án.',
                    keywords: [
                        'diện tích', 'bao nhiêu mét', 'mấy mét', 'mét vuông', 'rộng không', 'căn bao nhiêu',
                        'dài rộng', 'rộng bao nhiêu', 'dài bao nhiêu', 'diện tích đất', 'diện tích nhà',
                        'diện tích căn', 'chiều dài', 'chiều rộng', 'diện tích sàn', 'quy mô', 'thông số'
                    ]
                }
            ]
        },
        {
            id: 'ind-nha-khoa',
            name: 'Nha Khoa & Thẩm Mỹ Viện',
            icon: 'smile',
            badgeColor: 'cyan',
            description: 'Bộ từ khóa nhận diện các dịch vụ nha khoa tổng quát, thẩm mỹ răng sứ, cấy ghép implant và đặt hẹn.',
            groups: [
                {
                    id: 'nk-dich-vu',
                    name: 'Hỏi Dịch Vụ Răng Sứ & Niềng Răng',
                    icon: 'sparkles',
                    description: 'Khách quan tâm bọc răng sứ thẩm mỹ, dán sứ veneer, niềng răng trong suốt.',
                    keywords: [
                        'bọc răng sứ', 'răng sứ', 'dán sứ', 'veneer', 'niềng răng', 'chỉnh nha', 'mắc cài',
                        'trong suốt', 'invisalign', 'răng khấp khểnh', 'răng hô', 'răng thưa', 'tẩy trắng',
                        'làm trắng', 'trắng răng', 'cạo vôi', 'lấy cao răng'
                    ]
                },
                {
                    id: 'nk-implant',
                    name: 'Hỏi Cấy Ghép Implant & Nhổ Răng Khôn',
                    icon: 'activity',
                    description: 'Khách quan tâm trồng răng implant, nhổ răng khôn, điều trị tủy.',
                    keywords: [
                        'implant', 'trồng răng', 'cấy ghép', 'mất răng', 'răng khôn', 'nhổ răng', 'đau răng',
                        'chữa tủy', 'viêm tủy', 'sâu răng', 'răng hàm', 'trụ implant'
                    ]
                },
                {
                    id: 'nk-gia-dat-hen',
                    name: 'Hỏi Bảng Giá & Đặt Lịch Khám & Chi Nhánh',
                    icon: 'calendar',
                    description: 'Khách hỏi chi phí, chương trình khuyến mãi, đặt lịch hẹn bác sĩ.',
                    keywords: [
                        'bảng giá', 'chi phí', 'hết bao nhiêu', 'có trả góp không', 'trả góp 0%', 'khuyến mãi',
                        'ưu đãi', 'voucher', 'đặt lịch', 'hẹn khám', 'bác sĩ nào', 'địa chỉ ở đâu', 'chi nhánh nào',
                        'mở cửa mấy giờ', 'chủ nhật làm không'
                    ]
                }
            ]
        },
        {
            id: 'ind-giao-duc',
            name: 'Giáo Dục & Khóa Học Đào Tạo',
            icon: 'graduation-cap',
            badgeColor: 'purple',
            description: 'Bộ từ khóa cho các trung tâm đào tạo ngoại ngữ, kỹ năng, tuyển sinh đại học / du học.',
            groups: [
                {
                    id: 'gd-hoc-phi',
                    name: 'Hỏi Học Phí & Học Bổng & Ưu Đãi',
                    icon: 'credit-card',
                    description: 'Khách hỏi học phí từng kỳ, học bổng và điều kiện đóng góp.',
                    keywords: [
                        'học phí', 'bao nhiêu tiền', 'chi phí học', 'học bổng', 'ưu đãi', 'giảm học phí',
                        'đóng theo tháng', 'đóng theo kỳ', 'có đắt không', 'chính sách học phí'
                    ]
                },
                {
                    id: 'gd-lich-hoc',
                    name: 'Hỏi Lịch Khai Giảng & Hình Thức Học',
                    icon: 'clock',
                    description: 'Khách hỏi ngày khai giảng lớp mới, học online hay offline tại lớp.',
                    keywords: [
                        'khai giảng', 'lịch học', 'ngày nào học', 'học online', 'học trực tiếp', 'học qua zoom',
                        'lớp buổi tối', 'lớp cuối tuần', 'thời gian học', 'học mấy tháng', 'địa điểm học'
                    ]
                },
                {
                    id: 'gd-cam-ket',
                    name: 'Hỏi Cam Kết Đầu Ra & Chứng Chỉ',
                    icon: 'award',
                    description: 'Khách hỏi bằng cấp, chứng chỉ đầu ra, bảo hành khóa học.',
                    keywords: [
                        'cam kết đầu ra', 'chứng chỉ', 'bằng cấp', 'thi đỗ', 'ielts', 'toeic', 'học lại miễn phí',
                        'giới thiệu việc làm', 'được việc không'
                    ]
                }
            ]
        },
        {
            id: 'ind-crm',
            name: 'Phần Mềm, CRM & Tổng Đài AI',
            icon: 'cpu',
            badgeColor: 'indigo',
            description: 'Bộ từ khóa nhận diện cho giải pháp Adahub CRM, Callbot AI Ucall và viễn thông Etron.',
            groups: [
                {
                    id: 'crm-tinh-nang',
                    name: 'Hỏi Tính Năng Phần Mềm & Tích Hợp',
                    icon: 'layers',
                    description: 'Khách hỏi tính năng CRM, kết nối tổng đài, Zalo ZNS, API.',
                    keywords: [
                        'tính năng', 'phần mềm làm được gì', 'quản lý khách hàng', 'tổng đài', 'callbot',
                        'gọi tự động', 'kết nối zalo', 'zalo zns', 'fanpage', 'tích hợp api', 'báo cáo',
                        'ghi âm cuộc gọi', 'phân quyền', 'app mobile'
                    ]
                },
                {
                    id: 'crm-gia-demo',
                    name: 'Hỏi Bảng Giá Gói & Dùng Thử Demo',
                    icon: 'play-circle',
                    description: 'Khách hỏi báo giá các gói Starter, Pro, Enterprise hoặc xin demo dùng thử.',
                    keywords: [
                        'bảng giá', 'chi phí gói', 'gói bao nhiêu', 'dùng thử', 'dùng thử miễn phí', 'bản demo',
                        'hướng dẫn dùng', 'báo giá chi tiết', 'hợp đồng', 'triển khai bao lâu', 'thanh toán năm'
                    ]
                }
            ]
        }
    ]
};

// 3. KHO KỊCH BẢN MẪU & MEDIA BAN ĐẦU
const DEFAULT_CALLBOT_TEMPLATES = [
    {
        id: 'cb-tpl-palmriver',
        title: '[BĐS] Kịch Bản Callbot Mở Bán Phân Khu Palm River - Palm City',
        client: 'Palm River (Hướng Việt Properties - Nam Rạch Chiếc Q2)',
        industry: 'ind-bds',
        industryName: 'Bất Động Sản & Nhà Đất',
        badgeColor: 'emerald',
        // Kịch bản đính kèm
        scriptType: 'google-sheets',
        scriptUrl: 'https://docs.google.com/spreadsheets/d/16iV1wXVjmqLlsfkqf8mZQghTS3SUWxExRiYcy9_PPyw/edit?gid=329686546#gid=329686546',
        scriptFileName: 'Kich_ban_Palm_River_Ly.xlsx',
        // Media đính kèm
        audioTitle: 'Giọng Nữ Miền Nam - Lời chào & Tư vấn Palm River',
        audioVoice: 'Nữ Miền Nam (Ấm áp, chuyên nghiệp, tự nhiên)',
        audioDuration: '0:19',
        audioTextSample: 'Dạ, em bên phòng kinh doanh dự án Palm River ở đường Song Hành Quận 2 cũ ạ. Đợt này bên em mở bán phân khu cao tầng trực diện sông mà mình chỉ cần thanh toán 30% trải dài 12 tháng và ngưng cho đến khi nhận nhà ạ. Kì này mình có quan tâm dòng căn hộ trung tâm Sài Gòn hông ạ?',
        videoUrl: '',
        // Thông số chiến dịch
        keywordsCount: '9 nhóm - 550+ từ khóa',
        targetAudience: 'Khách hàng mua ở và đầu tư căn hộ cao cấp ven sông Nam Rạch Chiếc',
        salesTips: [
            'Nên gọi đến đâu, nhân viên check báo cáo đến đó để khách hàng còn ấm nhu cầu chốt ngay.',
            'Khung giờ chạy ưu tiên: 9h-10h sáng, 15h-16h chiều; Gọi lại 3 lần, mỗi lần cách 10-20p.',
            'Câu chào đầu thu âm dưới 20s là đẹp nhất để bot bắt nhịp nhanh.',
            'Điểm chốt chuyển sang Zalo: "chỉ cần thanh toán 30% trải dài 12 tháng ngưng đến khi nhận nhà".'
        ],
        updatedAt: '2026-10-14',
        pinned: true
    },
    {
        id: 'cb-tpl-nhakhoa',
        title: '[Nha Khoa] Kịch Bản Callbot Tặng Suất Cạo Vôi & Tẩy Trắng Răng Miễn Phí',
        client: 'Nha Khoa Quốc Tế Sài Gòn',
        industry: 'ind-nha-khoa',
        industryName: 'Nha Khoa & Thẩm Mỹ Viện',
        badgeColor: 'cyan',
        scriptType: 'google-sheets',
        scriptUrl: 'https://docs.google.com/spreadsheets/d/1JZrRKMKROb0cnQ_3rnOqmm9qgOJ1qthUkEfx8Hn1Kp8/edit',
        scriptFileName: 'Kich_ban_Callbot_Nha_Khoa.xlsx',
        audioTitle: 'Giọng Nữ Miền Nam - Khảo sát & Đặt lịch Nha khoa',
        audioVoice: 'Nữ Miền Nam (Tươi vui, ân cần, nhịp nhàng)',
        audioDuration: '0:18',
        audioTextSample: 'Dạ alo, em chào anh/chị. Em gọi từ Nha khoa Quốc tế ạ. Tuần này bên em đang có chương trình tri ân tặng 1 suất lấy cao răng và thăm khám răng miệng hoàn toàn miễn phí cho mình ạ. Không biết gần đây răng miệng của mình có đang gặp vấn đề gì ê buốt không anh/chị ha?',
        videoUrl: '',
        keywordsCount: '3 nhóm - 120 từ khóa',
        targetAudience: 'Cư dân xung quanh bán kính 5km phòng khám',
        salesTips: [
            'Đánh mạnh vào quyền lợi Miễn Phí để khách không cúp máy.',
            'Đề xuất 2 khung giờ cụ thể (Sáng Thứ 7 hoặc Chiều Chủ Nhật) để khách dễ chọn lịch.'
        ],
        updatedAt: '2026-10-13',
        pinned: false
    },
    {
        id: 'cb-tpl-crm',
        title: '[CRM / B2B] Kịch Bản Giới Thiệu Giải Pháp Adahub CRM & Callbot AI',
        client: 'Etron Solutions - Khách Hàng Doanh Nghiệp',
        industry: 'ind-crm',
        industryName: 'Phần Mềm, CRM & Tổng Đài AI',
        badgeColor: 'indigo',
        scriptType: 'google-sheets',
        scriptUrl: 'https://docs.google.com/spreadsheets/d/1JZrRKMKROb0cnQ_3rnOqmm9qgOJ1qthUkEfx8Hn1Kp8/edit',
        scriptFileName: 'Kich_ban_Adahub_CRM_B2B.xlsx',
        audioTitle: 'Giọng Nữ Miền Bắc - Tư vấn B2B Doanh Nghiệp',
        audioVoice: 'Nữ Miền Bắc (Rõ ràng, dứt khoát, phong thái chuyên viên tư vấn)',
        audioDuration: '0:22',
        audioTextSample: 'Dạ em chào anh/chị. Em gọi từ Etron Solutions, bên em chuyên cung cấp giải pháp CRM và Callbot AI tự động gọi chăm sóc khách hàng giúp tối ưu 70% chi phí telesale ạ. Em xin phép gửi tài liệu giải pháp qua Zalo để công ty mình tham khảo được không ạ?',
        videoUrl: '',
        keywordsCount: '2 nhóm - 95 từ khóa',
        targetAudience: 'Chủ doanh nghiệp, Trưởng phòng kinh doanh, Quản lý CSKH',
        salesTips: [
            'Đối tượng B2B rất bận, câu chào phải nêu ngay giá trị "tiết kiệm 70% chi phí".',
            'Không ép chốt máy trên điện thoại, mục tiêu số 1 là xin kết bạn Zalo gửi profile giải pháp.'
        ],
        updatedAt: '2026-10-12',
        pinned: false
    }
];

// Gán biến toàn cục Window để đảm bảo mọi module truy cập tức thì
window.DEFAULT_CALLBOT_KEYWORDS = DEFAULT_CALLBOT_KEYWORDS;
window.DEFAULT_CALLBOT_TEMPLATES = DEFAULT_CALLBOT_TEMPLATES;

