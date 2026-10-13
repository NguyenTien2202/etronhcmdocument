/**
 * Quote Builder Component & Logic
 * Cấu hình chuẩn xác theo mẫu BÁO GIÁ DỊCH VỤ ADAHUB & UCALL của Etron Solutions
 * Hỗ trợ: Gói mẫu CB2, CB5, CB20, Tính toán tiền tệ, đọc số thành chữ, Floating Mini Bar & Drawer A4
 */

const CRM_STANDARD_MODULES = [
    'Đơn hàng & Sản phẩm',
    'Cơ hội bán hàng',
    'Quản lý kho hàng',
    'Công việc',
    'Lịch hẹn',
    'Ticket',
    'Xây dựng, theo dõi KPI',
    'Chiến dịch Telesales',
    'Chiến dịch ZNS/SMS'
];

// ===== BẢNG GIÁ CALLBOT AI AUTO CALL (theo bảng giá chính thức Etron) =====
// Giá gốc / block 6 giây (áp dụng gói CB2, chưa có chiết khấu)
const CALLBOT_BASE_RATES = { standard: 230, advanced: 270, ai_agent: 330 };

// Các thành phần cấu thành mỗi phiên bản bot (mỗi thành phần có mức chiết khấu riêng theo gói)
const CALLBOT_VERSION_COMPONENTS = {
    standard: ['call'],                                       // Cuộc gọi
    advanced: ['call', 'voice', 'intent'],                    // + Cảm ứng giọng nói + Nhận diện ý định
    ai_agent: ['call', 'voice', 'intent', 'agent', 'prompt']  // + AI Agent + Nói prompt
};

const CALLBOT_DISCOUNT_LABELS = {
    call: 'Cuộc gọi',
    voice: 'Cảm ứng giọng nói',
    intent: 'Nhận diện ý định',
    agent: 'AI Agent',
    prompt: 'Nói prompt'
};

// Mức ưu đãi, chiết khấu (đ/block 6s) — gói từ CB5 trở lên bắt đầu được chiết khấu
const CALLBOT_PACKAGES = {
    cb2:   { code: 'CB-2',   name: 'CB2',   tier: 'Sale',       price: 2000000,   duration: '45 ngày',  months: 1,  scripts: 0, recordings: 0, crmAccounts: 1,  firstTwoOnly: false, discounts: { call: 0,   voice: 0,   intent: 0,  agent: 0,  prompt: 0 } },
    cb5:   { code: 'CB-5',   name: 'CB5',   tier: 'Sale',       price: 5000000,   duration: '3 tháng',  months: 3,  scripts: 1, recordings: 1, crmAccounts: 1,  firstTwoOnly: true,  discounts: { call: -10, voice: 0,   intent: 0,  agent: 0,  prompt: 0 } },
    cb20:  { code: 'CB-20',  name: 'CB20',  tier: 'Business',   price: 20000000,  duration: '6 tháng',  months: 6,  scripts: 2, recordings: 2, crmAccounts: 2,  firstTwoOnly: false, discounts: { call: -20, voice: -5,  intent: 0,  agent: 0,  prompt: 0 } },
    cb50:  { code: 'CB-50',  name: 'CB50',  tier: 'Business',   price: 50000000,  duration: '6 tháng',  months: 6,  scripts: 4, recordings: 4, crmAccounts: 4,  firstTwoOnly: false, discounts: { call: -30, voice: -5,  intent: 0,  agent: 0,  prompt: 0 } },
    cb100: { code: 'CB-100', name: 'CB100', tier: 'Enterprise', price: 100000000, duration: '12 tháng', months: 12, scripts: 6, recordings: 6, crmAccounts: 8,  firstTwoOnly: false, discounts: { call: -40, voice: -10, intent: -5, agent: -5, prompt: -5 } },
    cb200: { code: 'CB-200', name: 'CB200', tier: 'Enterprise', price: 200000000, duration: '12 tháng', months: 12, scripts: 8, recordings: 8, crmAccounts: 16, firstTwoOnly: false, discounts: { call: -50, voice: -10, intent: -5, agent: -5, prompt: -5 } }
};

// Tổng chiết khấu (số dương, đ/block) của một phiên bản bot trong một gói
function getCallbotDiscount(pkg, version) {
    const comps = CALLBOT_VERSION_COMPONENTS[version] || CALLBOT_VERSION_COMPONENTS.advanced;
    return comps.reduce((sum, c) => sum + Math.abs(pkg.discounts[c] || 0), 0);
}

// Sinh CALLBOT_PRICING (giữ nguyên cấu trúc cũ để các phần khác dùng chung)
const CALLBOT_PRICING = {};
Object.keys(CALLBOT_PACKAGES).forEach(key => {
    const pkg = CALLBOT_PACKAGES[key];
    const rates = {};
    Object.keys(CALLBOT_BASE_RATES).forEach(version => {
        const discount = getCallbotDiscount(pkg, version);
        const rate = CALLBOT_BASE_RATES[version] - discount;
        rates[version] = {
            rate,
            baseRate: CALLBOT_BASE_RATES[version],
            discount,
            blocks: `${new Intl.NumberFormat('vi-VN').format(Math.floor(pkg.price / rate))} block`
        };
    });
    const extras = pkg.scripts > 0
        ? `${pkg.scripts} kịch bản, ${pkg.recordings} ghi âm${pkg.firstTwoOnly ? ' (áp dụng cho 2 lần mua đầu tiên)' : ''}`
        : '';
    CALLBOT_PRICING[key] = {
        ...pkg,
        crm: `${pkg.crmAccounts} tài khoản CRM`,
        bonus: extras,
        rates
    };
});

const NUMBER_TYPES = {
    chung_codinh: { name: 'Số chung cố định (Kho Etron)', callRateBot: 70, callRatePbx: 700, botDesc: '70đ/block 6s' },
    rieng_didong: { name: 'Số riêng di động', callRateBot: 80, callRatePbx: 720, botDesc: '80đ/block 6s (+10đ so với số chung)' },
    rieng_codinh: { name: 'Số riêng cố định', callRateBot: 70, callRatePbx: 660, botDesc: '70đ/block 6s' },
    brandname: { name: 'Brandname', callRateBot: 70, callRatePbx: 660, botDesc: '70đ/block 6s (chỉ gọi nội mạng)' },
    so_ngoai: { name: 'Số khách tự chuẩn bị', callRateBot: 0, callRatePbx: 0, botDesc: '0đ/block, khách tự thanh toán với nhà mạng' }
};

// Các dòng phí đầu số tự thêm khi chọn loại đầu số trong khung Callbot: [mã sản phẩm, số lượng]
const CALLBOT_NUMBER_FEES = {
    chung_codinh: [],
    rieng_didong: [['num-khoi-tao-didong', 1], ['num-duy-tri-didong', 1]],
    rieng_codinh: [['num-khoi-tao-codinh', 1], ['num-duy-tri-codinh', 1]],
    brandname: [['num-brandname-combo', 1], ['num-brandname-duy-tri', 3]],
    so_ngoai: [['srv-ket-noi-so-dau', 1], ['srv-duy-tri-so-ngoai', 1]]
};

class QuoteBuilder {
    constructor() {
        this.currentQuote = this.getInitialQuote();
        this.selectedProductIds = new Set();
        this.previewScale = 1;
    }

    isCallbotItem(item) {
        if (!item) return false;
        const id = (item.productId || item.id || '').toLowerCase();
        const code = (item.code || '').toLowerCase();
        const name = (item.name || '').toLowerCase();
        const cat = (item.category || '').toLowerCase();
        if (id.startsWith('srv-') || cat.includes('đi kèm')) return false;
        return id.startsWith('callbot-') || code.startsWith('cb-') || name.includes('callbot') || cat.includes('callbot');
    }

    getCallbotPackageKey(item) {
        if (!item) return null;
        const combined = `${item.productId || ''} ${item.code || ''} ${item.name || ''}`.toLowerCase();
        if (combined.includes('cb200') || combined.includes('cb-200')) return 'cb200';
        if (combined.includes('cb100') || combined.includes('cb-100')) return 'cb100';
        if (combined.includes('cb50') || combined.includes('cb-50')) return 'cb50';
        if (combined.includes('cb20') || combined.includes('cb-20')) return 'cb20';
        if (combined.includes('cb5') || combined.includes('cb-5')) return 'cb5';
        if (combined.includes('cb2') || combined.includes('cb-2')) return 'cb2';
        return null;
    }

    getCallbotDetails(item) {
        const pkgKey = this.getCallbotPackageKey(item);
        if (!pkgKey || !CALLBOT_PRICING[pkgKey]) return null;
        const pkg = CALLBOT_PRICING[pkgKey];
        const version = item.botVersion || 'advanced';
        const numTypeKey = item.numberType || 'chung_codinh';

        const baseRateObj = pkg.rates[version] || pkg.rates.advanced;
        let rate = baseRateObj.rate;
        let baseRate = baseRateObj.baseRate;
        const discount = baseRateObj.discount || 0;
        let numLabel = 'Đầu số chung cố định';

        if (numTypeKey === 'rieng_didong') {
            rate += 10;
            baseRate += 10;
            numLabel = 'Đầu số riêng di động';
        } else if (numTypeKey === 'rieng_codinh') {
            numLabel = 'Đầu số riêng cố định';
        } else if (numTypeKey === 'brandname') {
            numLabel = 'Đầu số Brandname';
        } else if (numTypeKey === 'so_ngoai') {
            rate -= 70;
            baseRate -= 70;
            numLabel = 'Số khách tự chuẩn bị';
        }

        const blocksCount = Math.floor(pkg.price / rate);
        const blocksStr = window.formatNumber ? window.formatNumber(blocksCount) : blocksCount.toLocaleString('vi-VN');
        const versionName = version === 'standard' ? 'Standard' : (version === 'ai_agent' ? 'AI Call Agent' : 'Advanced');

        const priceText = discount > 0
            ? `${rate}₫/block 6 giây (đã chiết khấu ${discount}₫/block so với giá gốc ${baseRate}₫)`
            : `${rate}₫/block 6 giây (giá gốc, chưa áp dụng chiết khấu)`;
        const gifts = [pkg.bonus, pkg.crm].filter(Boolean).join(', ');

        return {
            pkg,
            pkgKey,
            version,
            versionName,
            numTypeKey,
            numLabel,
            rate,
            baseRate,
            discount,
            blocksCount,
            blocksStr,
            gifts,
            summary: `Callbot ${pkg.name} (${versionName} - ${numLabel}): ${priceText}, tương đương ${blocksStr} block, thời hạn ${pkg.duration}. Tặng kèm: ${gifts}.`
        };
    }

    // Tên dòng Callbot theo phiên bản bot + loại đầu số
    buildCallbotName(cbDetails, numType) {
        const suffix = {
            rieng_didong: ' - Số riêng di động',
            brandname: ' - Brandname',
            so_ngoai: ' - Số ngoài'
        }[numType] || '';
        return `Gói Callbot AI UCALL ${cbDetails.pkg.name} (${cbDetails.versionName}${suffix})`;
    }

    setCallbotVersion(idx, version) {
        const item = this.currentQuote.items[idx];
        if (!item) return;
        item.botVersion = version;

        const cbDetails = this.getCallbotDetails(item);
        if (cbDetails) {
            item.name = this.buildCallbotName(cbDetails, item.numberType);
        }

        this.syncPackageDetails();
        this.syncTermsWithItems();
        this.renderItemsList();
        this.renderPreview();
    }

    setCallbotNumberType(idx, numType) {
        const item = this.currentQuote.items[idx];
        if (!item) return;
        this.syncFormToCurrentQuote();
        item.numberType = numType;

        const cbDetails = this.getCallbotDetails(item);
        if (cbDetails) {
            item.name = this.buildCallbotName(cbDetails, numType);
        }

        this.syncCallbotNumberFees(item);
        this.syncPackageDetails();
        this.syncTermsWithItems();
        this.recalculate();
        this.renderItemsList();
        this.renderPreview();
    }

    // Thay các dòng phí đầu số đã tự thêm cho dòng Callbot này bằng bộ phí của loại đầu số mới
    syncCallbotNumberFees(cbItem) {
        if (!cbItem.id) cbItem.id = 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
        this.currentQuote.items = this.currentQuote.items.filter(it => it.autoFor !== cbItem.id);

        const fees = CALLBOT_NUMBER_FEES[cbItem.numberType] || [];
        const newItems = fees
            .map(([productId, qty]) => this.addProductFromCatalog(productId, { silent: true, quantity: qty, autoFor: cbItem.id, forCallbot: true }))
            .filter(Boolean);
        if (!newItems.length) return;

        // addProductFromCatalog (silent) đã thêm vào cuối -> chuyển lên ngay dưới dòng Callbot
        this.currentQuote.items = this.currentQuote.items.filter(it => !newItems.includes(it));
        const pos = this.currentQuote.items.indexOf(cbItem);
        this.currentQuote.items.splice(pos + 1, 0, ...newItems);
    }

    isNonVatItem(item) {
        if (!item) return false;
        // Gói Callbot và CRM thuộc phần mềm/giải pháp chịu thuế VAT 8%, không bao giờ thuộc nhóm đầu số/cước viễn thông
        if (this.isCallbotItem(item) || this.isCrmItem(item)) return false;

        // Đầu số và phí duy trì cho Callbot sẽ CHƯA BAO GỒM VAT 8% (chịu thuế VAT 8% chung với Callbot),
        // chỉ đầu số và phí duy trì cho Tổng đài CRM thì mới bao gồm VAT 10%
        if (item.autoFor || item.forCallbot) return false;

        const id = (item.productId || item.id || '').toLowerCase();
        const code = (item.code || '').toLowerCase();
        const name = (item.name || '').toLowerCase();
        const cat = (item.category || '').toLowerCase();

        // Dịch vụ đi kèm (kể cả phí kết nối/đấu nối đầu số tự chuẩn bị) chịu VAT 8%, không thuộc nhóm đã gồm VAT 10%
        if (id.startsWith('srv-') || cat.includes('đi kèm') || name.includes('đấu nối')) return false;

        const isNumberItem = cat === 'đầu số' || 
                             id.startsWith('num-') || 
                             code.startsWith('num-') || 
                             name.includes('đầu số') || 
                             name.includes('brandname');

        // Nếu báo giá có Callbot và không có CRM, các dòng đầu số là phục vụ Callbot -> chưa bao gồm VAT 8%
        const hasCallbot = (this.currentQuote.items || []).some(it => this.isCallbotItem(it));
        const hasCrm = (this.currentQuote.items || []).some(it => this.isCrmItem(it));
        if (isNumberItem && hasCallbot && !hasCrm) {
            return false;
        }

        // Ví cước viễn thông: luôn là cước viễn thông trả trước (đã bao gồm VAT 10%)
        if (cat === 'ví cước viễn thông' || id === 'vi-cuoc-vien-thong' || code.startsWith('vc-') || code === 'vi-cuoc' || name.includes('ví cước') || name.includes('nạp cước')) {
            return true;
        }

        // Đầu số cho Tổng đài CRM (hoặc khi không gắn với Callbot): đã bao gồm VAT 10%
        if (isNumberItem) {
            return true;
        }

        return false;
    }

    // Phí dịch vụ tính theo tháng (duy trì kết nối đầu số tự chuẩn bị): thành tiền = số lượng × số tháng × đơn giá
    isMonthlyFeeService(item) {
        if (!item) return false;
        return (item.productId || item.id || '') === 'srv-duy-tri-so-ngoai';
    }

    isMonthlyNumberItem(item) {
        if (!item) return false;
        const id = (item.productId || item.id || '').toLowerCase();
        if (id.startsWith('srv-')) return false;
        const name = (item.name || '').toLowerCase();
        const unit = item.unitEdited ? '' : (item.unit || '').toLowerCase();

        return id === 'num-duy-tri-codinh' ||
               id === 'num-duy-tri-didong' ||
               id === 'num-brandname-duy-tri' ||
               unit.includes('/tháng') ||
               (name.includes('duy trì') && (name.includes('đầu số') || name.includes('brandname')));
    }

    setMonthlyNumberDuration(idx, months) {
        const item = this.currentQuote.items[idx];
        if (!item) return;
        item.months = months;
        item.duration = `${months} tháng`;
        this.recalculate();
        this.renderItemsList();
        this.renderPreview();
    }

    getEndOfMonth(dateVal = new Date()) {
        let d;
        if (typeof dateVal === 'string' && dateVal.includes('-')) {
            const parts = dateVal.split('-');
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            d = new Date(year, month, parseInt(parts[2], 10) || 1);
        } else {
            d = new Date(dateVal);
        }
        const year = d.getFullYear();
        const month = d.getMonth();
        const lastDay = new Date(year, month + 1, 0);
        const yyyy = lastDay.getFullYear();
        const mm = String(lastDay.getMonth() + 1).padStart(2, '0');
        const dd = String(lastDay.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    getInitialQuote() {
        const company = window.salesStore.getCompany();
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        const endOfMonthStr = this.getEndOfMonth(todayStr);

        const quoteNum = 'BG-' + yyyy + mm + dd + '-' + Math.floor(100 + Math.random() * 900);

        return {
            id: null,
            quoteNumber: quoteNum,
            date: todayStr,
            validUntil: endOfMonthStr, // Mặc định luôn là ngày cuối cùng trong tháng
            status: 'Draft',
            title: 'DỊCH VỤ ADAHUB & UCALL',
            intro: 'Công ty Cổ phần Giải pháp Etron xin gửi tới Quý khách hàng báo giá các dịch vụ như sau:',
            customer: {
                company: '', // Mặc định để trống về tình trạng ban đầu
                contactPerson: '',
                title: '',
                phone: '',
                email: '',
                taxCode: '',
                address: ''
            },
            salesRep: {
                name: 'Đỗ Thị Thùy Liên',
                title: 'Giám đốc kinh doanh',
                phone: company.phone ? company.phone.split('-')[0].trim() : '0901 234 567',
                email: company.email || 'contact@etron.vn'
            },
            items: [], // Mặc định để trống hết về tình trạng chưa chọn gói nào
            subtotal: 0,
            overallDiscountPercent: 0,
            overallDiscountAmount: 0,
            amountBeforeTax: 0,
            vatRate: 8,
            vatAmount: 0,
            grandTotal: 0,
            totalInWords: 'Không đồng chẵn.',
            packageDetails: [], // Mặc định để trống, chỉ tự thêm khi cần
            terms: [
                `Báo giá có hiệu lực đến ngày ${this.formatDateVi(endOfMonthStr)}.`,
                'Phần mềm CRM, Callbot và dịch vụ đi kèm chưa bao gồm thuế VAT 8%.',
                'Thông tin thanh toán: Ngân hàng TMCP Quân đội (MBBank) - Số TK: 999998887777 - CONG TY CP GIAI PHAP ETRON.'
            ],
            notes: ''
        };
    }

    loadQuote(quote) {
        this.currentQuote = JSON.parse(JSON.stringify(quote));
        this.recalculate();
        this.renderForm();
        this.renderPreview();
    }

    resetForm() {
        this.currentQuote = this.getInitialQuote();
        this.recalculate();
        this.renderForm();
        this.renderPreview();
    }

    // Xóa thông tin khách hàng ở Card 1 (không cần hỏi lại và không load lại trang)
    clearCustomerInfo() {
        if (!this.currentQuote.customer) {
            this.currentQuote.customer = {};
        }
        this.currentQuote.customer.company = '';
        this.currentQuote.customer.contactPerson = '';
        this.currentQuote.customer.title = '';
        this.currentQuote.customer.phone = '';
        this.currentQuote.customer.email = '';
        this.currentQuote.customer.taxCode = '';
        this.currentQuote.customer.address = '';

        const compEl = document.getElementById('qb-custCompany');
        if (compEl) compEl.value = '';
        const contactEl = document.getElementById('qb-custContact');
        if (contactEl) contactEl.value = '';

        this.renderPreview();
        if (window.salesApp) {
            window.salesApp.showNotification('Đã xóa thông tin khách hàng!', 'info');
        }
    }

    // Xóa toàn bộ ở thanh trên: load lại trang và không cần hỏi xác nhận
    resetToBlankQuote() {
        window.location.reload();
    }

    // Xóa tất cả dòng sản phẩm trong bảng (không cần hỏi lại và không load lại trang)
    clearAllItems() {
        if (!this.currentQuote.items || this.currentQuote.items.length === 0) return;

        this.syncFormToCurrentQuote();
        this.currentQuote.items = [];
        this.syncPackageDetails();
        this.syncTermsWithItems();
        this.recalculate();
        this.renderForm();
        this.renderPreview();
        if (window.lucide) lucide.createIcons();
        if (window.salesApp) {
            window.salesApp.showNotification('Đã xóa tất cả sản phẩm trong bảng!', 'info');
        }
    }

    updateValidityTerm(newDateStr) {
        if (!newDateStr) return;
        const formatted = this.formatDateVi(newDateStr);
        if (!this.currentQuote.terms) this.currentQuote.terms = [];

        let found = false;
        this.currentQuote.terms = this.currentQuote.terms.map(t => {
            if (t.includes('Báo giá có hiệu lực đến ngày') || t.includes('Báo giá có hiệu lực từ ngày')) {
                found = true;
                return `Báo giá có hiệu lực đến ngày ${formatted}.`;
            }
            return t;
        });

        if (!found) {
            this.currentQuote.terms.unshift(`Báo giá có hiệu lực đến ngày ${formatted}.`);
        }

        const termsEl = document.getElementById('qb-terms');
        if (termsEl) termsEl.value = this.currentQuote.terms.join('\n');
    }

    // Nạp nhanh mẫu báo giá các giải pháp phổ biến theo đúng chuẩn Etron Salekit
    loadPreset(presetType) {
        this.currentQuote.items = [];
        this.currentQuote.vatRate = 8;
        this.currentQuote.overallDiscountPercent = 0;
        this.currentQuote.overallDiscountAmount = 0;

        switch (presetType) {
            case 'cb2':
                this.currentQuote.items = [
                    {
                        id: 'item-cb2',
                        productId: 'callbot-cb2',
                        category: 'Callbot AI',
                        code: 'CB-2',
                        name: 'Gói Callbot AI UCALL CB2 (Advanced)',
                        botVersion: 'advanced',
                        numberType: 'chung_codinh',
                        unitPriceDisplay: '2.000.000₫',
                        price: 2000000,
                        duration: '45 ngày',
                        months: 1,
                        quantity: 1,
                        unit: 'gói',
                        discountPercent: 0,
                        discountAmount: 0,
                        amount: 2000000,
                        note: ''
                    }
                ];
                break;

            case 'cb5':
                this.currentQuote.items = [
                    {
                        id: 'item-cb5',
                        productId: 'callbot-cb5',
                        category: 'Callbot AI',
                        code: 'CB-5',
                        name: 'Gói Callbot AI UCALL CB5 (Advanced)',
                        botVersion: 'advanced',
                        numberType: 'chung_codinh',
                        unitPriceDisplay: '5.000.000₫',
                        price: 5000000,
                        duration: '3 tháng',
                        months: 3,
                        quantity: 1,
                        unit: 'gói',
                        discountPercent: 0,
                        discountAmount: 0,
                        amount: 5000000,
                        note: ''
                    }
                ];
                break;

            case 'cb20':
                this.currentQuote.items = [
                    {
                        id: 'item-cb20',
                        productId: 'callbot-cb20',
                        category: 'Callbot AI',
                        code: 'CB-20',
                        name: 'Gói Callbot AI UCALL CB20 (Advanced)',
                        botVersion: 'advanced',
                        numberType: 'chung_codinh',
                        unitPriceDisplay: '20.000.000₫',
                        price: 20000000,
                        duration: '6 tháng',
                        months: 6,
                        quantity: 1,
                        unit: 'gói',
                        discountPercent: 0,
                        discountAmount: 0,
                        amount: 20000000,
                        note: ''
                    }
                ];
                break;

            case 'cb50':
                this.currentQuote.items = [
                    {
                        id: 'item-cb50',
                        productId: 'callbot-cb50',
                        category: 'Callbot AI',
                        code: 'CB-50',
                        name: 'Gói Callbot AI UCALL CB50 (Advanced)',
                        botVersion: 'advanced',
                        numberType: 'chung_codinh',
                        unitPriceDisplay: '50.000.000₫',
                        price: 50000000,
                        duration: '6 tháng',
                        months: 6,
                        quantity: 1,
                        unit: 'gói',
                        discountPercent: 0,
                        discountAmount: 0,
                        amount: 50000000,
                        note: ''
                    }
                ];
                break;

            case 'crm-td':
                this.currentQuote.items = [
                    {
                        id: 'item-crm-td',
                        productId: 'crm-tong-dai',
                        category: 'Phần mềm Adahub CRM',
                        code: 'CRM-TD',
                        name: 'Phần mềm Adahub CRM - Gói Tổng Đài',
                        unitPriceDisplay: '40.000₫/user/tháng',
                        price: 40000,
                        duration: '12 tháng',
                        months: 12,
                        quantity: 1,
                        unit: 'tài khoản',
                        discountPercent: 0,
                        discountAmount: 0,
                        amount: 480000,
                        note: ''
                    }
                ];
                break;

            case 'crm-std':
                this.currentQuote.items = [
                    {
                        id: 'item-crm-std',
                        productId: 'crm-standard',
                        category: 'Phần mềm Adahub CRM',
                        code: 'CRM-STD',
                        name: 'Phần mềm Adahub CRM - Gói Standard',
                        unitPriceDisplay: '80.000₫/user/tháng',
                        price: 80000,
                        duration: '12 tháng',
                        months: 12,
                        quantity: 1,
                        unit: 'tài khoản',
                        discountPercent: 0,
                        discountAmount: 0,
                        amount: 960000,
                        note: '',
                        selectedModules: []
                    }
                ];
                break;

            case 'crm-adv':
                this.currentQuote.items = [
                    {
                        id: 'item-crm-adv',
                        productId: 'crm-advanced',
                        category: 'Phần mềm Adahub CRM',
                        code: 'CRM-ADV',
                        name: 'Phần mềm Adahub CRM - Gói Advanced',
                        unitPriceDisplay: '150.000₫/user/tháng',
                        price: 150000,
                        duration: '12 tháng',
                        months: 12,
                        quantity: 1,
                        unit: 'tài khoản',
                        discountPercent: 0,
                        discountAmount: 0,
                        amount: 1800000,
                        note: ''
                    }
                ];
                break;
        }

        const endOfMonthStr = this.currentQuote.validUntil || this.getEndOfMonth(this.currentQuote.date || new Date());
        this.currentQuote.validUntil = endOfMonthStr;

        this.syncPackageDetails();
        this.syncTermsWithItems();
        this.recalculate();
        this.renderForm();
        this.renderPreview();
        if (window.salesApp) {
            const label = presetType.toUpperCase();
            window.salesApp.showNotification(`Đã nạp sẵn mẫu ${label} thành công!`, 'success');
        }
    }

    getProductPackageDetail(product) {
        if (!product) return '';

        const pId = product.productId || product.id;
        if (this.isCallbotItem(product)) {
            const cb = this.getCallbotDetails({ ...product, botVersion: product.botVersion || 'advanced', numberType: product.numberType || 'chung_codinh' });
            if (cb) return cb.summary;
        }

        const crmDetails = {
            'crm-tong-dai': 'Phần mềm Adahub CRM (Gói Tổng Đài): Quản lý khách hàng, Mobile App, Dashboard báo cáo, Tổng đài gọi điện, Tự động hoá 100 credits/tháng.',
            'crm-standard': 'Phần mềm Adahub CRM (Gói Standard): Bao gồm gói Tổng đài + Chat đa kênh (10 kênh), Tích hợp API, Tự động hoá 200 credits/tháng.',
            'crm-advanced': 'Phần mềm Adahub CRM (Gói Advanced): Trọn bộ 9/9 module nâng cao (Đơn hàng, Cơ hội, Kho, KPI, Telesales, ZNS...), Tự động hoá 500 credits/tháng, Không giới hạn quyền hạn.'
        };
        if (crmDetails[pId]) {
            return crmDetails[pId];
        }

        const telecomDetails = {
            'vi-cuoc-vien-thong': 'Ví Cước Viễn Thông: Nạp tiền trước tối thiểu 1.000.000₫ (đã gồm VAT 10%), cước gọi thực tế và phí đầu số trừ dần vào ví theo thực tế.',
            'num-chung-codinh': 'Đầu Số Chung Cố Định: Sử dụng kho chung Etron (miễn phí), cước gọi Callbot 70đ/block 6s, cước Tổng đài 700đ/phút.',
            'num-khoi-tao-codinh': 'Đầu Số Riêng Cố Định: Miễn phí khởi tạo, phí duy trì 20.000₫/số/tháng (đã gồm VAT 10%), cước gọi Callbot 70đ/block 6s, Tổng đài 660đ/phút. Không mất phí kết nối khi qua đối tác của Etron.',
            'num-duy-tri-codinh': 'Phí duy trì đầu số riêng cố định: 20.000₫/số/tháng (đã gồm VAT 10%).',
            'num-khoi-tao-didong': 'Đầu Số Riêng Di Động: Phí khởi tạo 50.000₫/số, phí duy trì 60.000₫/số/tháng (đã gồm VAT 10%), cước gọi Callbot 80đ/block 6s, Tổng đài 720đ/phút. Không mất phí kết nối khi qua đối tác của Etron.',
            'num-duy-tri-didong': 'Phí duy trì đầu số riêng di động: 60.000₫/số/tháng (đã gồm VAT 10%).',
            'num-brandname-combo': 'Đầu Số Brandname: Khách hàng mua tối thiểu 3 đầu số ứng với 3 nhà mạng Viettel, MobiFone, VinaPhone (100.000₫/thuê bao, các đầu số này chỉ gọi nội mạng), phí duy trì 60.000₫/số/tháng (đã gồm VAT 10%), cước gọi Callbot 70đ/block 6s, Tổng đài 660đ/phút. Không mất phí kết nối khi qua đối tác của Etron.',
            'num-brandname-duy-tri': 'Phí duy trì Voice Brandname: 60.000₫/số/tháng (đã gồm VAT 10%).',
            'srv-ket-noi-so-dau': 'Đầu Số Khách Tự Chuẩn Bị: Khách làm việc với nhà cung cấp đầu số và kết nối với UCALL. Phí kết nối lần đầu 1.000.000₫, từ lần thứ 2 100.000₫/đầu số, phí duy trì 100.000₫/tháng (chưa gồm VAT 8%). Cước gọi Callbot 0đ/block, khách tự thanh toán cước với nhà mạng.',
            'srv-ket-noi-so-them': 'Phí kết nối đầu số tự chuẩn bị từ lần thứ 2: 100.000₫/đầu số (chưa gồm VAT 8%).',
            'srv-duy-tri-so-ngoai': 'Phí duy trì kết nối đầu số tự chuẩn bị: 100.000₫/tháng (chưa gồm VAT 8%).'
        };
        if (telecomDetails[pId]) {
            return telecomDetails[pId];
        }

        if (product.description) {
            if (product.description.toLowerCase().startsWith((product.name || '').toLowerCase())) {
                return product.description;
            }
            return `${product.name}: ${product.description}`;
        }

        return '';
    }

    // Tự động đồng bộ các dòng chi tiết gói tương ứng với sản phẩm trong bảng
    syncPackageDetails() {
        if (!this.currentQuote.packageDetails) this.currentQuote.packageDetails = [];

        const newDetails = [];

        this.currentQuote.items.forEach(item => {
            if (this.isCallbotItem(item)) {
                const cbDetails = this.getCallbotDetails(item);
                if (cbDetails && !newDetails.includes(cbDetails.summary)) {
                    newDetails.push(cbDetails.summary);
                }
            } else if (this.isCrmItem(item)) {
                const isCrmStandard = item.productId === 'crm-standard' || 
                    (item.code && item.code.toUpperCase() === 'CRM-STD') ||
                    (item.name && item.name.toLowerCase().includes('crm') && item.name.toLowerCase().includes('standard'));

                if (isCrmStandard) {
                    const stdBase = 'Phần mềm Adahub CRM (Gói Standard): Bao gồm gói Tổng đài + Chat đa kênh (10 kênh), Tích hợp API, Tự động hoá 200 credits/tháng.';
                    if (!newDetails.includes(stdBase)) {
                        newDetails.push(stdBase);
                    }
                    if (item.selectedModules && item.selectedModules.length > 0) {
                        const modLine = `Tùy chọn module nâng cao CRM Standard: ${item.selectedModules.join(', ')}`;
                        newDetails.push(modLine);
                    }
                } else {
                    const detail = this.getProductPackageDetail(item);
                    if (detail && !newDetails.includes(detail)) {
                        newDetails.push(detail);
                    }
                }
            } else {
                // Dòng duy trì / kết nối thêm đã được mô tả trong dòng khởi tạo tương ứng -> không lặp lại
                const coveredBy = {
                    'num-duy-tri-didong': 'num-khoi-tao-didong',
                    'num-duy-tri-codinh': 'num-khoi-tao-codinh',
                    'num-brandname-duy-tri': 'num-brandname-combo',
                    'srv-ket-noi-so-them': 'srv-ket-noi-so-dau',
                    'srv-duy-tri-so-ngoai': 'srv-ket-noi-so-dau'
                }[item.productId];
                if (coveredBy && this.currentQuote.items.some(it => it.productId === coveredBy)) return;

                const detail = this.getProductPackageDetail(item);
                if (detail && !newDetails.includes(detail)) {
                    newDetails.push(detail);
                }
            }
        });

        this.currentQuote.packageDetails = newDetails;
        const pkgEl = document.getElementById('qb-packageDetails');
        if (pkgEl) {
            pkgEl.value = newDetails.join('\n');
        }
    }

    syncCrmModulesToPackageDetails() {
        this.syncPackageDetails();
    }

    // Tự động đồng bộ điều khoản và ghi chú tương ứng với sản phẩm trong bảng
    syncTermsWithItems() {
        if (!this.currentQuote.terms) this.currentQuote.terms = [];

        const endOfMonthStr = this.currentQuote.validUntil || this.getEndOfMonth(this.currentQuote.date || new Date());
        const validityTerm = `Báo giá có hiệu lực đến ngày ${this.formatDateVi(endOfMonthStr)}.`;
        const vatRate = this.currentQuote.vatRate !== undefined ? this.currentQuote.vatRate : 8;
        const vatTerm = `Phần mềm CRM, Callbot, phí đầu số Callbot và dịch vụ đi kèm chưa bao gồm thuế VAT ${vatRate}%.`;
        const paymentTerm = 'Thông tin thanh toán: Ngân hàng TMCP Quân đội (MBBank) - Số TK: 999998887777 - CONG TY CP GIAI PHAP ETRON.';

        const callbotTerm = 'Callbot tính theo block 6 giây. Giá block chưa bao gồm cước gọi và phí đầu số khi dùng số riêng. Trong 90 ngày sau khi hết hạn gói, có thể gia hạn với phí bằng 30% số dư còn lại.';

        const crmTermUnder12 = 'Phần mềm CRM tính theo user/tháng, thanh toán theo năm. Thời hạn dưới 12 tháng áp dụng đơn giá riêng (Tổng đài: 50.000₫, Standard: 100.000₫, Advanced: 250.000₫/user/tháng).';
        const crmTermFrom12 = 'Phần mềm CRM tính theo user/tháng, áp dụng cho thời hạn từ 12 tháng, thanh toán theo năm. Phí tích hợp API tùy yêu cầu.';

        const telecomTerm = 'Cước viễn thông thanh toán trước vào ví cước, tối thiểu 1.000.000₫, đã bao gồm VAT 10%. Phí khởi tạo/duy trì đầu số và cước cuộc gọi thực tế trừ dần vào ví cước.';
        const pbxRatesTerm = 'Cước gọi tổng đài trừ vào ví cước: Đầu số chung cố định: 700đ/phút; Đầu số riêng cố định: 660đ/phút; Đầu số riêng di động: 720đ/phút; Voice Brandname: 660đ/phút (đã gồm VAT 10%).';

        const hasCallbot = this.currentQuote.items.some(item => this.isCallbotItem(item));
        const crmItems = this.currentQuote.items.filter(item => this.isCrmItem(item));
        const hasCrm = crmItems.length > 0;

        let isCrmUnder12 = false;
        if (hasCrm) {
            isCrmUnder12 = crmItems.some(item => {
                if (item.months && item.months > 0 && item.months < 12) return true;
                const parsedM = this.parseMonths(item.duration);
                if (parsedM > 0 && parsedM < 12) return true;
                if (item.price === 50000 || item.price === 100000 || item.price === 250000) return true;
                const combined = `${item.duration || ''} ${item.note || ''} ${item.name || ''}`.toLowerCase();
                return combined.includes('dưới 12') || combined.includes('< 12') || combined.includes('<12');
            });
        }

        const hasTelecom = this.currentQuote.items.some(item => this.isTelecomAirtime(item));
        const hasNumbers = this.currentQuote.items.some(item => {
            if (this.isCallbotItem(item)) return false;
            const id = (item.productId || '').toLowerCase();
            const cat = (item.category || '').toLowerCase();
            const name = (item.name || '').toLowerCase();
            if (id.startsWith('srv-') || cat.includes('đi kèm') || name.includes('đấu nối')) return false;
            return id.startsWith('num-') || cat === 'đầu số' || name.includes('đầu số') || name.includes('brandname');
        });

        const isPbxSolution = hasCrm && (hasTelecom || hasNumbers);

        // Giữ lại các điều khoản người dùng tự gõ nếu có
        const customTerms = this.currentQuote.terms.filter(t => {
            const clean = t.replace(/^-\s*/, '').trim().toLowerCase();
            if (clean.includes('báo giá có hiệu lực')) return false;
            if (clean.includes('chưa bao gồm thuế vat') || clean.includes('chưa bao gồm vat')) return false;
            if (clean.includes('callbot tính theo block')) return false;
            if (clean.includes('phần mềm crm tính theo user')) return false;
            if (clean.includes('cước viễn thông thanh toán')) return false;
            if (clean.includes('cước gọi tổng đài trừ')) return false;
            if (clean.includes('thông tin thanh toán:') || clean.includes('vietcombank') || clean.includes('quân đội') || clean.includes('mbbank') || clean.includes('999998887777') || clean.includes('103899886688')) return false;
            if (clean.includes('đầu số brandname chỉ gọi nội mạng')) return false;
            if (clean.includes('đầu số khách tự chuẩn bị:')) return false;
            if (clean.includes('phí duy trì số được tính')) return false;
            return clean.length > 0;
        });

        // Ghi chú riêng theo loại đầu số (Brandname / Số khách tự chuẩn bị / Phí duy trì số)
        const items = this.currentQuote.items;
        const hasBrandname = items.some(it => (this.isCallbotItem(it) && it.numberType === 'brandname') ||
            ['num-brandname-combo', 'num-brandname-duy-tri', 'num-brandname-viettel', 'num-brandname-mobifone', 'num-brandname-vinaphone'].includes(it.productId));
        const hasOwnNumber = items.some(it => (this.isCallbotItem(it) && it.numberType === 'so_ngoai') ||
            ['srv-ket-noi-so-dau', 'srv-ket-noi-so-them', 'srv-duy-tri-so-ngoai'].includes(it.productId));
        const hasMaintenanceFee = items.some(it => 
            this.isMonthlyNumberItem(it) || 
            this.isMonthlyFeeService(it) || 
            ['num-duy-tri-codinh', 'num-duy-tri-didong', 'num-brandname-duy-tri', 'srv-duy-tri-so-ngoai'].includes(it.productId) || 
            (it.name || '').toLowerCase().includes('duy trì')
        );

        const brandnameTerm = 'Đầu số Brandname chỉ gọi nội mạng tương ứng; khách hàng mua tối thiểu 3 đầu số ứng với 3 nhà mạng Viettel, MobiFone, VinaPhone.';
        const ownNumberTerm = 'Đầu số khách tự chuẩn bị: khách hàng làm việc với nhà cung cấp đầu số và kết nối với UCALL. Đề xuất khách hàng yêu cầu nhà cung cấp đầu số tự thay số để không cần kết nối nhiều lần.';
        const maintenanceTerm = 'Phí duy trì số được tính từ ngày đầu tiên (ngày 01) hàng tháng và được thanh toán trước 7 ngày làm việc trước ngày cuối cùng của tháng trước đó.';

        const newTerms = [validityTerm, vatTerm];
        if (hasCallbot) {
            newTerms.push(callbotTerm);
        }
        if (hasBrandname) newTerms.push(brandnameTerm);
        if (hasOwnNumber) newTerms.push(ownNumberTerm);
        if (hasMaintenanceFee) newTerms.push(maintenanceTerm);
        if (hasCrm) {
            newTerms.push(isCrmUnder12 ? crmTermUnder12 : crmTermFrom12);
        }
        // Ghi chú ví cước và cước gọi tổng đài chỉ hiện khi báo giá có dòng nạp cước viễn thông
        if (hasTelecom) {
            newTerms.push(telecomTerm);
            newTerms.push(pbxRatesTerm);
        }
        customTerms.forEach(ct => newTerms.push(ct));
        newTerms.push(paymentTerm);

        this.currentQuote.terms = newTerms;
        const termsEl = document.getElementById('qb-terms');
        if (termsEl) {
            termsEl.value = newTerms.join('\n');
        }
    }

    isCrmItem(item) {
        if (!item) return false;
        const id = (item.productId || item.id || '').toLowerCase();
        const code = (item.code || '').toLowerCase();
        const name = (item.name || '').toLowerCase();
        // Đơn vị do người dùng tự đặt (dòng tự nhập) không dùng để nhận diện loại sản phẩm
        const unit = item.unitEdited ? '' : (item.unit || '').toLowerCase();
        return id.startsWith('crm-') || 
               code.startsWith('crm') || 
               name.includes('crm') || 
               name.includes('adahub') ||
               unit.includes('user') ||
               unit.includes('tài khoản');
    }

    parseMonths(durationStr) {
        if (!durationStr) return 0;
        const str = String(durationStr).toLowerCase();
        if (str.includes('năm')) {
            const m = str.match(/(\d+)\s*năm/);
            return m ? parseInt(m[1], 10) * 12 : 12;
        }
        const match = str.match(/(\d+)\s*tháng/);
        if (match) {
            return parseInt(match[1], 10);
        }
        return 0;
    }

    setCrmDuration(idx, months) {
        const item = this.currentQuote.items[idx];
        if (!item) return;

        item.months = months;
        item.duration = `${months} tháng`;

        // Tự động cập nhật đơn giá theo mốc 6 tháng vs 12 tháng theo đúng salekit Etron
        const pId = (item.productId || '').toLowerCase();
        const code = (item.code || '').toLowerCase();
        const name = (item.name || '').toLowerCase();

        if (pId === 'crm-standard' || code === 'crm-std' || name.includes('standard')) {
            item.price = months < 12 ? 100000 : 80000;
            item.unitPriceDisplay = window.formatCurrency(item.price);
        } else if (pId === 'crm-tong-dai' || code === 'crm-td' || name.includes('tổng đài')) {
            item.price = months < 12 ? 50000 : 40000;
            item.unitPriceDisplay = window.formatCurrency(item.price);
        } else if (pId === 'crm-advanced' || code === 'crm-adv' || (name.includes('advanced') && name.includes('crm'))) {
            item.price = months < 12 ? 250000 : 150000;
            item.unitPriceDisplay = window.formatCurrency(item.price);
        }

        this.syncTermsWithItems();
        this.recalculate();
        this.renderItemsList();
        this.renderPreview();
    }

    // Tách "45 ngày" -> { num: 45, unit: 'ngày' }; trả về null nếu không có số (VD: "Theo gói")
    splitDuration(duration) {
        const m = String(duration || '').trim().match(/^(\d+)\s*(.*)$/);
        if (!m) return null;
        return { num: parseInt(m[1], 10), unit: (m[2] || 'tháng').trim() };
    }

    getDisplayUnit(unit) {
        const clean = String(unit || '')
            .replace(/\s*\([^)]*\)\s*/g, '')
            .replace(/\s*\/\s*tháng\s*$/i, '')
            .trim();
        return (clean || 'gói').toLowerCase();
    }

    // Ô số có mũi tên lên/xuống (dùng cho Thời hạn và Số lượng)
    renderStepper(idx, field, value) {
        const handler = field === 'duration' ? 'setDurationNumber' : 'setQuantityNumber';
        const arrowBtn = 'flex-1 flex items-center justify-center px-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors';
        return `
            <div class="inline-flex items-stretch bg-white border border-slate-200 rounded-lg overflow-hidden focus-within:border-blue-500">
                <input type="number" min="1" step="1" value="${Number(value) || 1}" id="stepper-${field}-${idx}"
                    onchange="window.quoteBuilder.${handler}(${idx}, this.value)"
                    class="qb-stepper-input w-11 text-xs text-center font-bold text-slate-800 bg-transparent border-0 py-2 px-1 focus:outline-none focus:ring-0" />
                <div class="flex flex-col border-l border-slate-200 w-5">
                    <button type="button" tabindex="-1" title="Tăng" onclick="window.quoteBuilder.${handler}(${idx}, (Number(document.getElementById('stepper-${field}-${idx}').value) || 0) + 1)" class="${arrowBtn}">
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor"><path d="M5 2 9 7H1z"/></svg>
                    </button>
                    <button type="button" tabindex="-1" title="Giảm" onclick="window.quoteBuilder.${handler}(${idx}, (Number(document.getElementById('stepper-${field}-${idx}').value) || 2) - 1)" class="${arrowBtn} border-t border-slate-200">
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor"><path d="M5 8 1 3h8z"/></svg>
                    </button>
                </div>
            </div>`;
    }

    setQuantityNumber(idx, value) {
        const n = Math.max(1, parseInt(value, 10) || 1);
        const input = document.getElementById(`stepper-quantity-${idx}`);
        if (input) input.value = n;
        this.updateItem(idx, 'quantity', n);
    }

    setDurationNumber(idx, value) {
        const item = this.currentQuote.items[idx];
        if (!item) return;
        const n = Math.max(1, parseInt(value, 10) || 1);
        const dur = this.splitDuration(item.duration) || { unit: 'tháng' };

        // CRM: dùng logic riêng để tự đổi đơn giá theo mốc dưới/từ 12 tháng
        if (this.isCrmItem(item) && dur.unit.toLowerCase().includes('tháng')) {
            this.setCrmDuration(idx, n);
            return;
        }

        const input = document.getElementById(`stepper-duration-${idx}`);
        if (input) input.value = n;
        this.updateItem(idx, 'duration', `${n} ${dur.unit}`);
    }

    // Dòng tự nhập (không lấy từ danh mục) -> cho phép đổi đơn vị
    isCustomItem(item) {
        return !!item && !item.productId;
    }

    ensureUnitDatalists() {
        if (document.getElementById('qb-units-duration')) return;
        const lists = {
            'qb-units-duration': ['tháng', 'năm', 'quý', 'tuần', 'ngày', 'lần'],
            'qb-units-unit': ['gói', 'tài khoản', 'user', 'số', 'kênh', 'lần', 'bộ', 'cái', 'giờ', 'combo', 'kịch bản', 'block']
        };
        Object.entries(lists).forEach(([id, opts]) => {
            const dl = document.createElement('datalist');
            dl.id = id;
            dl.innerHTML = opts.map(o => `<option value="${o}"></option>`).join('');
            document.body.appendChild(dl);
        });
    }

    // Ô đơn vị: nhìn như chữ thường (gạch chân mờ), bấm vào thì hiện danh sách gợi ý hoặc gõ tùy ý
    renderUnitInput(idx, kind, value) {
        const v = this.escapeHtml(value || '');
        const w = Math.max(4, String(value || '').length + 1);
        return `<input type="text" class="qb-unit-input" list="qb-units-${kind}" value="${v}" placeholder="${v}"
            title="Bấm để đổi đơn vị" autocomplete="off" style="width:${w}ch"
            onfocus="this.dataset.old=this.value; this.value='';"
            oninput="this.style.width=Math.max(4, (this.value || this.placeholder).length + 1) + 'ch'"
            onblur="if(!this.value.trim()){ this.value=this.dataset.old || ''; this.style.width=Math.max(4, this.value.length + 1) + 'ch'; }"
            onchange="if(this.value.trim()) window.quoteBuilder.setItemUnit(${idx}, '${kind}', this.value)"
            onkeydown="if(event.key==='Enter'){ this.blur(); }" />`;
    }

    setItemUnit(idx, kind, value) {
        const item = this.currentQuote.items[idx];
        const unit = String(value || '').trim();
        if (!item || !unit) return;
        if (kind === 'duration') {
            const dur = this.splitDuration(item.duration) || { num: 1 };
            this.updateItem(idx, 'duration', `${dur.num} ${unit}`);
        } else {
            item.unitEdited = true;
            this.updateItem(idx, 'unit', unit);
        }
        const el = document.querySelector(`tr[data-index="${idx}"] .qb-unit-input[list="qb-units-${kind}"]`);
        if (el) {
            el.placeholder = unit;
            el.dataset.old = unit;
        }
    }

    isTelecomAirtime(item) {
        if (!item) return false;
        const id = (item.productId || item.id || '').toLowerCase();
        const code = (item.code || '').toLowerCase();
        const name = (item.name || '').toLowerCase();
        const cat = (item.category || '').toLowerCase();
        return id === 'vi-cuoc-vien-thong' || 
               code === 'vi-cuoc' || 
               cat === 'ví cước viễn thông' ||
               name.includes('nạp cước viễn thông') || 
               name.includes('ví cước');
    }

    getItemCategory(item) {
        if (!item) return 'Hạng mục khác';
        const id = (item.productId || item.id || '').toLowerCase();
        const code = (item.code || '').toLowerCase();
        const name = (item.name || '').toLowerCase();
        const cat = (item.category || '').toLowerCase();

        if (id.startsWith('srv-') || cat.includes('đi kèm')) {
            return 'Dịch vụ đi kèm';
        }
        if (id.startsWith('crm-') || code.startsWith('crm') || name.includes('crm') || name.includes('adahub') || cat.includes('crm')) {
            return 'Phần mềm Adahub CRM';
        }
        if (id.startsWith('callbot-') || code.startsWith('cb-') || name.includes('callbot') || cat.includes('callbot') || name.includes('ucall')) {
            return 'Callbot AI UCALL';
        }
        if (id === 'vi-cuoc-vien-thong' || code === 'vi-cuoc' || name.includes('ví cước') || name.includes('nạp cước') || cat.includes('ví cước')) {
            return 'Ví cước viễn thông';
        }
        if (id.startsWith('num-') || code.startsWith('num') || name.includes('đầu số') || name.includes('đấu nối') || name.includes('brandname') || cat.includes('đầu số')) {
            return 'Đầu số';
        }
        if (id.startsWith('srv-') || cat.includes('đi kèm') || name.includes('kịch bản') || name.includes('thu âm') || name.includes('tích hợp')) {
            return 'Dịch vụ đi kèm';
        }
        return item.category || 'Hạng mục khác';
    }

    formatItemUnitPrice(item) {
        const priceStr = window.formatNumber(item.price);
        const pid = item.productId || '';
        if (pid === 'srv-ket-noi-so-dau') return `${priceStr}₫/lần`;
        if (pid === 'srv-ket-noi-so-them') return `${priceStr}₫/số`;
        if (pid === 'srv-duy-tri-so-ngoai') return `${priceStr}₫/tháng`;
        if (this.isCrmItem(item)) {
            return `${priceStr}₫/user/tháng`;
        }
        if (this.isCallbotItem(item)) {
            return `${priceStr}₫/${item.unit || 'gói'}`;
        }
        if (this.isTelecomAirtime(item)) {
            return `${priceStr}₫/lần nạp`;
        }
        if (this.isMonthlyNumberItem(item)) {
            return `${priceStr}₫/số/tháng`;
        }
        if ((item.productId || '').startsWith('num-') || (item.name || '').toLowerCase().includes('đầu số') || (item.name || '').toLowerCase().includes('brandname')) {
            if (item.productId === 'srv-dau-noi-so' || (item.name || '').toLowerCase().includes('đấu nối')) {
                return `${priceStr}₫/lần`;
            }
            if (item.productId === 'num-brandname-combo' || (item.name || '').toLowerCase().includes('combo')) {
                return `${priceStr}₫/combo`;
            }
            return `${priceStr}₫/số`;
        }
        if (item.unit && item.unit !== 'gói') {
            return `${priceStr}₫/${item.unit}`;
        }
        return `${priceStr}₫`;
    }

    formatItemQuantity(item) {
        const pid = item.productId || '';
        if (pid === 'srv-ket-noi-so-dau') return `${item.quantity || 1} lần`;
        if (pid === 'srv-ket-noi-so-them') return `${item.quantity || 1} số`;
        if (pid === 'srv-duy-tri-so-ngoai') {
            const months = item.months || this.parseMonths(item.duration) || 1;
            const qty = item.quantity || 1;
            return qty > 1 ? `${qty} kết nối × ${months} tháng` : `${months} tháng`;
        }
        if (this.isCrmItem(item)) {
            const users = item.quantity || 1;
            const months = item.months || this.parseMonths(item.duration) || 12;
            return `${users} user × ${months} tháng`;
        }
        if (this.isCallbotItem(item)) {
            const qty = item.quantity || 1;
            const dur = item.duration || '3 tháng';
            return `${qty} gói · thời hạn ${dur}`;
        }
        if (this.isTelecomAirtime(item)) {
            return `${item.quantity || 1} lần nạp`;
        }
        if (this.isMonthlyNumberItem(item)) {
            const qty = item.quantity || 1;
            const months = item.months || this.parseMonths(item.duration) || 1;
            return `${qty} số × ${months} tháng`;
        }
        if ((item.productId || '').startsWith('num-') || (item.name || '').toLowerCase().includes('đầu số') || (item.name || '').toLowerCase().includes('brandname')) {
            if (item.productId === 'num-brandname-combo' || (item.name || '').toLowerCase().includes('combo')) {
                return `${item.quantity || 1} combo`;
            }
            return `${item.quantity || 1} số`;
        }
        return `${item.quantity || 1} ${item.unit || 'gói'}${item.duration && !item.duration.includes('12 tháng') ? ` · ${item.duration}` : ''}`;
    }

    groupItemsByCategory(items) {
        const categoryOrder = [
            'Phần mềm Adahub CRM',
            'Callbot AI UCALL',
            'Đầu số',
            'Ví cước viễn thông',
            'Dịch vụ đi kèm',
            'Hạng mục khác'
        ];

        const groups = {};
        items.forEach(item => {
            const cat = this.getItemCategory(item);
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(item);
        });

        const result = [];
        categoryOrder.forEach(cat => {
            if (groups[cat] && groups[cat].length > 0) {
                result.push({ category: cat, items: groups[cat] });
                delete groups[cat];
            }
        });

        Object.keys(groups).forEach(cat => {
            if (groups[cat] && groups[cat].length > 0) {
                result.push({ category: cat, items: groups[cat] });
            }
        });

        return result;
    }

    // Thêm sản phẩm từ danh mục có sẵn
    // opts: { silent: không đồng bộ/vẽ lại (dùng khi tự thêm hàng loạt), quantity, autoFor: id dòng Callbot đã tự thêm dòng này }
    addProductFromCatalog(productId, opts = {}) {
        const products = window.salesStore.getProducts();
        const product = products.find(p => p.id === productId);
        if (!product) return null;

        // Lưu trước các thay đổi trên form
        if (!opts.silent) this.syncFormToCurrentQuote();

        const isCrm = this.isCrmItem(product);
        const isCallbot = this.isCallbotItem(product);
        const isMonthlyNum = this.isMonthlyNumberItem(product);
        const isCrmStandard = product.id === 'crm-standard' || 
            (product.code && product.code.toUpperCase() === 'CRM-STD') ||
            (product.name && product.name.toLowerCase().includes('crm') && product.name.toLowerCase().includes('standard'));

        let duration = '12 tháng';
        let months = 12;
        let unit = product.unit || 'gói';
        let quantity = 1;

        if (isCrm) {
            duration = '12 tháng';
            months = 12;
            unit = 'tài khoản';
            quantity = 1;
        } else if (product.id === 'callbot-cb2') {
            duration = '45 ngày';
            months = 1;
            unit = 'gói';
        } else if (product.id === 'callbot-cb5') {
            duration = '3 tháng';
            months = 3;
            unit = 'gói';
        } else if (product.id === 'callbot-cb20' || product.id === 'callbot-cb50') {
            duration = '6 tháng';
            months = 6;
            unit = 'gói';
        } else if (product.id === 'callbot-cb100' || product.id === 'callbot-cb200') {
            duration = '12 tháng';
            months = 12;
            unit = 'gói';
        } else if (product.id === 'vi-cuoc-vien-thong') {
            duration = 'Theo gói';
            months = 1;
            unit = 'lần nạp';
        } else if (isMonthlyNum) {
            duration = '1 tháng';
            months = 1;
            unit = product.unit || 'số';
        } else if (product.id === 'srv-ket-noi-so-dau') {
            duration = '1 lần';
            months = 1;
            unit = 'lần';
        } else if (product.id === 'srv-ket-noi-so-them') {
            duration = '1 lần';
            months = 1;
            unit = 'số';
        } else if (this.isMonthlyFeeService(product)) {
            duration = '1 tháng';
            months = 1;
            unit = 'kết nối';
        } else if (product.id === 'num-brandname-combo') {
            duration = '1 lần';
            months = 1;
            unit = 'combo';
        } else if (product.id && product.id.startsWith('num-')) {
            duration = '1 lần';
            months = 1;
            unit = product.unit || 'số';
        }

        if (opts.quantity) quantity = opts.quantity;
        const initialAmount = (isCrm || isMonthlyNum || this.isMonthlyFeeService(product)) ? (quantity * months * (product.price || 0)) : (quantity * (product.price || 0));

        let itemName = product.name;
        if (isCallbot) {
            const pkgKey = this.getCallbotPackageKey(product);
            const pkg = CALLBOT_PRICING[pkgKey];
            if (pkg) {
                itemName = `Gói Callbot AI UCALL ${pkg.name} (Advanced)`;
            }
        }

        const newItem = {
            id: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            productId: product.id,
            autoFor: opts.autoFor || undefined,
            forCallbot: !!(opts.forCallbot || opts.autoFor),
            category: product.category,
            code: product.code || '',
            name: itemName,
            botVersion: isCallbot ? 'advanced' : undefined,
            numberType: isCallbot ? 'chung_codinh' : undefined,
            unitPriceDisplay: window.formatCurrency(product.price),
            duration: duration,
            months: months,
            unit: unit,
            quantity: quantity,
            price: product.price || 0,
            discountPercent: 0,
            discountAmount: 0,
            amount: initialAmount,
            note: '',
            selectedModules: isCrmStandard ? [] : undefined
        };
        this.currentQuote.items.push(newItem);
        if (opts.silent) return newItem;

        this.syncPackageDetails();
        this.syncTermsWithItems();
        this.recalculate();
        this.renderForm();
        this.renderPreview();
    }

    // Thêm dòng tự nhập
    addCustomItem() {
        this.currentQuote.items.push({
            id: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            productId: null,
            code: 'SP-' + (this.currentQuote.items.length + 1),
            name: '',
            unitPriceDisplay: '',
            duration: '12 tháng',
            months: 12,
            unit: 'gói',
            quantity: 1,
            price: 0,
            discountPercent: 0,
            discountAmount: 0,
            amount: 0,
            note: ''
        });

        this.syncTermsWithItems();
        this.recalculate();
        this.renderItemsList();
        this.renderPreview();
    }

    removeItem(index) {
        const removed = this.currentQuote.items.splice(index, 1)[0];
        // Xóa dòng Callbot thì xóa luôn các dòng phí đầu số đã tự thêm cho nó
        if (removed && removed.id) {
            this.currentQuote.items = this.currentQuote.items.filter(it => it.autoFor !== removed.id);
        }
        this.syncPackageDetails();
        this.syncTermsWithItems();
        this.recalculate();
        this.renderItemsList();
        this.renderPreview();
    }

    // Tùy chọn 3/9 module nâng cao cho gói Adahub CRM Standard
    toggleCrmModule(itemIndex, moduleName) {
        const item = this.currentQuote.items[itemIndex];
        if (!item) return;
        if (!item.selectedModules) item.selectedModules = [];

        const idx = item.selectedModules.indexOf(moduleName);
        if (idx >= 0) {
            // Đã chọn -> Bỏ chọn
            item.selectedModules.splice(idx, 1);
        } else {
            // Chưa chọn -> Kiểm tra tối đa 3 tính năng
            if (item.selectedModules.length >= 3) {
                if (window.salesApp) {
                    window.salesApp.showNotification('Chỉ được chọn tối đa 3 tính năng nâng cao cho gói Standard!', 'warning');
                } else {
                    alert('Chỉ được chọn tối đa 3 tính năng nâng cao cho gói Standard!');
                }
                return;
            }
            item.selectedModules.push(moduleName);
        }

        this.syncPackageDetails();
        this.renderItemsList();
        this.renderPreview();
    }

    updateItem(index, field, value) {
        const item = this.currentQuote.items[index];
        if (!item) return;

        if (field === 'quantity' || field === 'price' || field === 'discountPercent') {
            item[field] = Number(value) || 0;
        } else if (field === 'duration') {
            item.duration = value;
            const parsed = this.parseMonths(value);
            if (parsed > 0) {
                item.months = parsed;
            }
        } else {
            item[field] = value;
        }

        if (field === 'price') {
            item.unitPriceDisplay = window.formatCurrency(item.price);
        }

        if (field === 'price' || field === 'duration' || field === 'quantity' || field === 'name' || field === 'note') {
            this.syncTermsWithItems();
        }

        this.recalculate();
        this.updateItemRowDisplay(index);
        this.renderPreview();
    }

    handlePriceInput(inputEl, idx) {
        const raw = (inputEl.value || '').replace(/\D/g, '');
        if (raw === '') {
            inputEl.value = '';
            this.updateItem(idx, 'price', 0);
            return;
        }
        const num = parseInt(raw, 10) || 0;
        inputEl.value = window.formatNumber(num);
        this.updateItem(idx, 'price', num);
    }

    handlePriceBlur(inputEl, idx) {
        const raw = (inputEl.value || '').replace(/\D/g, '');
        const num = parseInt(raw, 10) || 0;
        inputEl.value = window.formatNumber(num);
        this.updateItem(idx, 'price', num);
    }

    recalculate() {
        let taxableSubtotal = 0;
        let nonVatTotal = 0;

        this.currentQuote.items.forEach(item => {
            const qty = Number(item.quantity) || 0;
            const price = Number(item.price) || 0;
            const discRate = Number(item.discountPercent) || 0;

            let lineGross = 0;
            if (this.isCrmItem(item) || this.isMonthlyNumberItem(item) || this.isMonthlyFeeService(item)) {
                const months = Number(item.months) || this.parseMonths(item.duration) || (this.isCrmItem(item) ? 12 : 1);
                lineGross = qty * months * price;
            } else {
                lineGross = qty * price;
            }

            const disc = (lineGross * discRate) / 100;
            item.discountAmount = disc;
            item.amount = Math.max(0, lineGross - disc);

            if (this.isNonVatItem(item)) {
                nonVatTotal += item.amount;
            } else {
                taxableSubtotal += item.amount;
            }
        });

        this.currentQuote.taxableSubtotal = taxableSubtotal;
        this.currentQuote.telecomTotal = nonVatTotal;
        this.currentQuote.subtotal = taxableSubtotal;

        // Chiết khấu tổng đơn (áp dụng cho phần dịch vụ chịu thuế)
        const discRate = Number(this.currentQuote.overallDiscountPercent) || 0;
        this.currentQuote.overallDiscountAmount = (taxableSubtotal * discRate) / 100;

        const taxableAfterDiscount = Math.max(0, taxableSubtotal - this.currentQuote.overallDiscountAmount);
        this.currentQuote.amountBeforeTax = taxableAfterDiscount;

        // VAT (mặc định 8% cho phần mềm & dịch vụ Callbot của Etron, đầu số & ví cước đã gồm VAT 10% nên không tính thêm)
        const vatRate = Number(this.currentQuote.vatRate) || 0;
        this.currentQuote.vatAmount = Math.round((taxableAfterDiscount * vatRate) / 100);

        // Tổng thanh toán = Phần chịu thuế sau chiết khấu + VAT 8% + Đầu số & Cước viễn thông (đã gồm VAT 10%)
        this.currentQuote.grandTotal = Math.round(taxableAfterDiscount + this.currentQuote.vatAmount + nonVatTotal);
        this.currentQuote.totalInWords = window.readVietnameseCurrency(this.currentQuote.grandTotal);

        this.renderTotalsDisplay();
        this.updateFloatingDock();
    }

    renderForm() {
        const q = this.currentQuote;
        
        // Date & Validity
        const dateEl = document.getElementById('qb-date');
        if (dateEl) dateEl.value = q.date || '';

        const validUntilEl = document.getElementById('qb-validUntil');
        if (validUntilEl) validUntilEl.value = q.validUntil || '';

        // Customer inputs
        const compEl = document.getElementById('qb-custCompany');
        if (compEl) compEl.value = q.customer?.company || '';

        const contactEl = document.getElementById('qb-custContact');
        if (contactEl) contactEl.value = q.customer?.contactPerson || '';

        // Discount & VAT inputs
        const discEl = document.getElementById('qb-overallDiscount');
        if (discEl) discEl.value = q.overallDiscountPercent || 0;

        const vatEl = document.getElementById('qb-vatRate');
        if (vatEl) vatEl.value = q.vatRate !== undefined ? q.vatRate : 8;

        const pkgEl = document.getElementById('qb-packageDetails');
        if (pkgEl) pkgEl.value = (q.packageDetails || []).join('\n');

        const termsEl = document.getElementById('qb-terms');
        if (termsEl) termsEl.value = (q.terms || []).join('\n');

        this.renderItemsList();
        this.renderTotalsDisplay();
        this.updateFloatingDock();
    }

    renderItemsList() {
        const container = document.getElementById('qb-items-table-body');
        if (!container) return;

        if (this.currentQuote.items.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="7" class="py-8 text-center text-slate-400 text-sm">
                        <div class="flex flex-col items-center justify-center gap-2">
                            <i data-lucide="package-open" class="w-8 h-8 text-slate-300"></i>
                            <span>Chưa có sản phẩm nào. Chọn <b>mẫu giải pháp (Callbot, CRM)</b> hoặc bấm <b>"Chọn từ danh mục"</b> để bắt đầu.</span>
                        </div>
                    </td>
                </tr>
            `;
            lucide.createIcons();
            return;
        }

        this.ensureUnitDatalists();
        container.innerHTML = this.currentQuote.items.map((item, idx) => {
            const isCrm = this.isCrmItem(item);
            const isCallbot = this.isCallbotItem(item);
            const isMonthlyNum = this.isMonthlyNumberItem(item);
            const isCrmStandard = item.productId === 'crm-standard' || 
                (item.code && item.code.toUpperCase() === 'CRM-STD') ||
                (item.name && item.name.toLowerCase().includes('crm') && item.name.toLowerCase().includes('standard'));

            const selectedModules = item.selectedModules || [];
            const count = selectedModules.length;
            const isMax = count >= 3;
            const cbDetails = isCallbot ? this.getCallbotDetails(item) : null;

            return `
            <tr class="${(isCrmStandard || isCallbot) ? 'border-b-0' : 'border-b border-slate-100'} hover:bg-slate-50/70 transition-colors qb-row-main" data-index="${idx}">
                <td class="qb-c-stt py-3 px-2 text-center text-xs font-bold text-slate-400 align-middle">${idx + 1}</td>
                <td class="qb-c-name py-2 px-3">
                    <input type="text" value="${this.escapeHtml(item.name)}" 
                        placeholder="Tên gói cước / Hạng mục dịch vụ..."
                        onchange="window.quoteBuilder.updateItem(${idx}, 'name', this.value)"
                        class="w-full text-sm font-normal text-slate-800 bg-white border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </td>
                <td class="qb-c-price py-2 px-2 w-32 align-middle" data-label="Đơn giá">
                    <input type="text" inputmode="numeric" value="${window.formatNumber(item.price)}" 
                        oninput="window.quoteBuilder.handlePriceInput(this, ${idx})"
                        onblur="window.quoteBuilder.handlePriceBlur(this, ${idx})"
                        class="w-full text-sm text-right font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg p-2 focus:border-blue-500" />
                </td>
                <td class="qb-c-dur py-2 px-2 w-40 align-middle" data-label="Thời hạn">
                    <div class="flex flex-col items-center gap-1">
                        ${(() => {
                            const dur = this.splitDuration(item.duration);
                            if (!dur) {
                                return `<span class="text-xs text-slate-600">${this.escapeHtml(item.duration || '—')}</span>`;
                            }
                            return `
                        <div class="flex items-center justify-center gap-1.5">
                            ${this.renderStepper(idx, 'duration', dur.num)}
                            ${this.isCustomItem(item) ? this.renderUnitInput(idx, 'duration', dur.unit) : `<span class="text-xs text-slate-600 w-10 text-left whitespace-nowrap">${this.escapeHtml(dur.unit)}</span>`}
                        </div>`;
                        })()}
                        ${isCrm ? `
                        <div class="flex items-center justify-center gap-1">
                            <button type="button" onclick="window.quoteBuilder.setCrmDuration(${idx}, 6)"
                                class="px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${item.months === 6 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
                                title="Gói 6 tháng (giá riêng)">
                                6 Tháng
                            </button>
                            <button type="button" onclick="window.quoteBuilder.setCrmDuration(${idx}, 12)"
                                class="px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${item.months === 12 || !item.months ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
                                title="Gói 12 tháng (giá năm)">
                                12 Tháng
                            </button>
                        </div>
                        ` : ''}
                    </div>
                </td>
                <td class="qb-c-qty py-2 px-2 w-36 align-middle" data-label="Số lượng">
                    <div class="flex items-center gap-1.5">
                        ${this.renderStepper(idx, 'quantity', item.quantity || 1)}
                        ${this.isCustomItem(item) ? this.renderUnitInput(idx, 'unit', item.unit || 'gói') : `<span class="text-xs text-slate-600 whitespace-nowrap">${this.escapeHtml(this.getDisplayUnit(item.unit || (isCrm ? 'tài khoản' : 'gói')))}</span>`}
                    </div>
                </td>
                <td class="qb-c-amt py-2 px-3 w-36 text-right align-middle" data-label="Thành tiền">
                    <span class="text-sm font-extrabold text-blue-900 line-amount" id="line-amount-${idx}">
                        ${window.formatCurrency(item.amount)}
                    </span>
                </td>
                <td class="qb-c-del py-2 px-2 text-center w-10 align-middle">
                    <button type="button" onclick="window.quoteBuilder.removeItem(${idx})" 
                        class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Xóa dòng">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </td>
            </tr>

            ${isCallbot ? `
            <tr class="border-b border-slate-200 bg-amber-50/20" data-callbot-row="${idx}">
                <td colspan="7" class="px-3 pb-3 pt-1">
                    <div class="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl w-full">
                        <div class="qb-cb-opts flex flex-wrap items-center justify-between gap-3">
                            <div class="flex items-center gap-2">
                                <span class="text-xs font-bold text-amber-950 flex items-center gap-1">
                                    <i data-lucide="bot" class="w-3.5 h-3.5 text-amber-700"></i>
                                    Loại bot:
                                </span>
                                <div class="inline-flex rounded-lg border border-amber-200 bg-white p-0.5 shadow-2xs">
                                    <button type="button" onclick="window.quoteBuilder.setCallbotVersion(${idx}, 'standard')"
                                        class="px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                                            (item.botVersion === 'standard') 
                                                ? 'bg-amber-600 text-white font-bold shadow-xs' 
                                                : 'text-amber-900 hover:bg-amber-100/70'
                                        }">
                                        Standard
                                    </button>
                                    <button type="button" onclick="window.quoteBuilder.setCallbotVersion(${idx}, 'advanced')"
                                        class="px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                                            (!item.botVersion || item.botVersion === 'advanced') 
                                                ? 'bg-amber-600 text-white font-bold shadow-xs' 
                                                : 'text-amber-900 hover:bg-amber-100/70'
                                        }">
                                        Advanced (Khuyên dùng)
                                    </button>
                                    <button type="button" onclick="window.quoteBuilder.setCallbotVersion(${idx}, 'ai_agent')"
                                        class="px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                                            (item.botVersion === 'ai_agent') 
                                                ? 'bg-amber-600 text-white font-bold shadow-xs' 
                                                : 'text-amber-900 hover:bg-amber-100/70'
                                        }">
                                        AI Call Agent
                                    </button>
                                </div>
                            </div>

                            <div class="flex items-center gap-2">
                                <span class="text-xs font-bold text-amber-950 flex items-center gap-1">
                                    <i data-lucide="phone-call" class="w-3.5 h-3.5 text-amber-700"></i>
                                    Đầu số gọi:
                                </span>
                                <select onchange="window.quoteBuilder.setCallbotNumberType(${idx}, this.value)"
                                    class="text-xs font-semibold text-slate-800 bg-white border border-amber-200 rounded-lg py-1 px-2.5 focus:border-amber-500 focus:ring-1 focus:ring-amber-500">
                                    <option value="chung_codinh" ${(item.numberType === 'chung_codinh' || !item.numberType) ? 'selected' : ''}>
                                        Số chung cố định (Kho Etron - Mặc định, 70đ/block)
                                    </option>
                                    <option value="rieng_didong" ${item.numberType === 'rieng_didong' ? 'selected' : ''}>
                                        Số riêng di động (80đ/block 6s)
                                    </option>
                                    <option value="rieng_codinh" ${item.numberType === 'rieng_codinh' ? 'selected' : ''}>
                                        Số riêng cố định (70đ/block 6s)
                                    </option>
                                    <option value="brandname" ${item.numberType === 'brandname' ? 'selected' : ''}>
                                        Brandname (70đ/block 6s, gọi nội mạng)
                                    </option>
                                    <option value="so_ngoai" ${item.numberType === 'so_ngoai' ? 'selected' : ''}>
                                        Số tự chuẩn bị (0đ/block, khách tự trả nhà mạng)
                                    </option>
                                </select>
                            </div>
                        </div>
                        
                        ${cbDetails ? `
                        <div class="qb-cb-quota mt-2 text-[11px] text-amber-900/90 font-medium flex items-center gap-2 bg-white/70 px-2.5 py-1.5 rounded-lg border border-amber-200/50">
                            <span class="font-bold text-amber-950">Định mức gói:</span>
                            <span>Đơn giá <b>${cbDetails.rate}₫</b>/block 6s${cbDetails.discount > 0 ? ` <span class="text-emerald-700">(giá gốc ${cbDetails.baseRate}₫, chiết khấu -${cbDetails.discount}₫)</span>` : ''} · <b>${cbDetails.blocksStr}</b> block · Thời hạn ${cbDetails.pkg.duration} · Tặng ${cbDetails.gifts}</span>
                        </div>
                        ` : ''}
                    </div>
                </td>
            </tr>
            ` : ''}

            ${isCrmStandard ? `
            <tr class="border-b border-slate-200 bg-blue-50/20" data-module-row="${idx}">
                <td colspan="7" class="px-3 pb-3 pt-1">
                    <div class="p-3 bg-blue-50/50 border border-blue-200/80 rounded-xl w-full transition-all">
                        <div class="flex items-center justify-between mb-2 flex-wrap gap-2">
                            <div class="flex items-center gap-1.5 text-xs">
                                <span class="font-bold text-blue-950">Module nâng cao:</span>
                                <span class="text-blue-800/80 font-normal">Tùy chọn tối đa 3 tính năng (tự động đưa vào Chi tiết gói)</span>
                            </div>
                            <span class="text-[11px] font-medium px-2 py-0.5 rounded border ${count === 3 ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-xs' : 'bg-white text-blue-800 border-blue-200'}">
                                ${count === 3 ? 'Đã chọn đủ 3/3 module' : `Đã chọn ${count}/3 module`}
                            </span>
                        </div>
                        <div class="flex flex-wrap gap-1.5 w-full">
                            ${CRM_STANDARD_MODULES.map(modName => {
                                const isChecked = selectedModules.includes(modName);
                                const isDisabled = !isChecked && isMax;
                                return `
                                    <button type="button" 
                                        onclick="window.quoteBuilder.toggleCrmModule(${idx}, '${modName}')"
                                        ${isDisabled ? 'disabled' : ''}
                                        class="px-2.5 py-1 text-xs rounded-lg border transition-all ${
                                            isChecked 
                                                ? 'bg-blue-600 text-white border-blue-600 font-medium shadow-xs hover:bg-blue-700' 
                                                : isDisabled 
                                                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50' 
                                                    : 'bg-white text-slate-700 border-blue-200/70 hover:bg-blue-100/60 hover:text-blue-900 hover:border-blue-300'
                                        }">
                                        <span>${isChecked ? '✓ ' : ''}${modName}</span>
                                    </button>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </td>
            </tr>
            ` : ''}
            `;
        }).join('');

        lucide.createIcons();
    }

    updateItemRowDisplay(idx) {
        const item = this.currentQuote.items[idx];
        if (!item) return;
        const lineEl = document.getElementById(`line-amount-${idx}`);
        if (lineEl) {
            lineEl.textContent = window.formatCurrency(item.amount);
        }
    }

    renderTotalsDisplay() {
        const q = this.currentQuote;
        const subtotalEl = document.getElementById('qb-display-subtotal');
        const overallDiscEl = document.getElementById('qb-display-discount');
        const vatAmountEl = document.getElementById('qb-display-vat');
        const telecomRowEl = document.getElementById('qb-display-telecom-row');
        const telecomEl = document.getElementById('qb-display-telecom');
        const grandTotalEl = document.getElementById('qb-display-grandtotal');
        const wordsEl = document.getElementById('qb-display-inwords');

        if (subtotalEl) subtotalEl.textContent = window.formatCurrency(q.taxableSubtotal !== undefined ? q.taxableSubtotal : q.subtotal);
        if (overallDiscEl) overallDiscEl.textContent = window.formatCurrency(q.overallDiscountAmount);
        if (vatAmountEl) vatAmountEl.textContent = window.formatCurrency(q.vatAmount);

        if (telecomRowEl && telecomEl) {
            if (q.telecomTotal && q.telecomTotal > 0) {
                telecomRowEl.classList.remove('hidden');
                telecomEl.textContent = window.formatCurrency(q.telecomTotal);
            } else {
                telecomRowEl.classList.add('hidden');
            }
        }

        if (grandTotalEl) grandTotalEl.textContent = window.formatCurrency(q.grandTotal);
        if (wordsEl) wordsEl.textContent = q.totalInWords;
    }

    // Cập nhật thanh trôi nổi (Floating Mini Dock)
    updateFloatingDock() {
        const q = this.currentQuote;
        const dockNum = document.getElementById('dock-quote-num');
        const dockCust = document.getElementById('dock-cust-name');
        const dockTotal = document.getElementById('dock-grand-total');

        if (dockNum) dockNum.textContent = 'BÁO GIÁ';
        if (dockCust) dockCust.textContent = q.customer?.company || q.customer?.contactPerson || 'Khách hàng mới';
        if (dockTotal) dockTotal.textContent = window.formatCurrency(q.grandTotal);
    }

    // Điều khiển Modal / Slide-over A4 Drawer
    openDrawerPreview() {
        this.syncFormToCurrentQuote();
        this.recalculate();
        this.renderPreview();
        const drawer = document.getElementById('a4-preview-drawer');
        if (drawer) {
            drawer.classList.remove('hidden');
            document.body.classList.add('overflow-hidden');

            // Cập nhật tiêu đề: Xem trước báo giá [Tên khách hàng]
            const titleEl = document.getElementById('drawer-preview-title');
            if (titleEl) {
                const cust = (this.currentQuote.customer?.company || this.currentQuote.customer?.contactPerson || '').trim();
                titleEl.textContent = cust ? `Xem trước báo giá ${cust}` : 'Xem trước báo giá';
            }

            // Điện thoại: tự thu nhỏ vừa chiều ngang màn hình
            this.setPreviewScale(this.isMobileView() ? 'fit' : 1);
            lucide.createIcons();

            if (!this._fitResizeBound) {
                this._fitResizeBound = true;
                window.addEventListener('resize', () => {
                    const d = document.getElementById('a4-preview-drawer');
                    if (this.previewScale === 'fit' && d && !d.classList.contains('hidden')) {
                        this.setPreviewScale('fit');
                    }
                });
            }
        }
    }

    isMobileView() {
        return window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
    }

    closeDrawerPreview() {
        const drawer = document.getElementById('a4-preview-drawer');
        if (drawer) {
            drawer.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        }
    }

    setPreviewScale(scale) {
        this.previewScale = scale;
        const previewEl = document.getElementById('a4-quotation-preview');
        if (previewEl) {
            if (scale === 'fit') {
                // Dùng zoom (thu nhỏ cả khung bố cục) để không bị cắt / cuộn ngang trên điện thoại
                previewEl.style.transform = 'none';
                previewEl.style.zoom = '';
                const wrapper = document.getElementById('preview-wrapper');
                const cs = wrapper ? getComputedStyle(wrapper) : null;
                const avail = wrapper ? wrapper.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) : window.innerWidth;
                const w = previewEl.offsetWidth || 794;
                const f = Math.max(0.3, Math.min(1, avail / w));
                previewEl.style.zoom = String(f);
            } else {
                previewEl.style.zoom = '';
                previewEl.style.transform = `scale(${scale})`;
                previewEl.style.transformOrigin = 'top center';
            }
        }

        // Cập nhật trạng thái nút zoom: di chuyển nền trắng active
        const zoomBtns = document.querySelectorAll('#drawer-zoom-buttons button');
        zoomBtns.forEach(btn => {
            const attr = btn.getAttribute('data-zoom');
            const isMatch = scale === 'fit' ? attr === 'fit' : (attr !== 'fit' && Math.abs(parseFloat(attr) - scale) < 0.01);
            if (isMatch) {
                btn.classList.add('bg-white', 'shadow-sm', 'font-bold', 'text-slate-900');
                btn.classList.remove('text-slate-600');
            } else {
                btn.classList.remove('bg-white', 'shadow-sm', 'font-bold', 'text-slate-900');
                btn.classList.add('text-slate-600');
            }
        });
    }

    getA4Html() {
        const company = window.salesStore.getCompany();
        const q = this.currentQuote;
        const d = new Date(q.date || Date.now());

        // Ưu tiên base64 logo để 100% canvas-safe (không bị taint CORS khi mở file:/// hay offline)
        let logoSrc = window.ETRON_LOGO_BASE64;
        if (company.logoUrl && company.logoUrl.startsWith('data:image/')) {
            logoSrc = company.logoUrl;
        } else if (!logoSrc) {
            logoSrc = company.logoUrl || 'assets/logo_etron_new.png';
        }

        const logoHtml = logoSrc ? 
            `<img src="${logoSrc}" alt="Etron Solutions" style="height: 46px; width: auto; max-width: 190px; object-fit: contain; display: block;">` : 
            `<div style="font-size: 26px; font-weight: 900; color: #1e3a8a; letter-spacing: -0.5px;">etron</div>`;

        // ===== Bộ style chuẩn: Times New Roman 12pt, viền đen mảnh 1px (0.75pt), dòng thoáng =====
        const FONT = `font-family: 'Times New Roman', Times, serif; color: #000000;`;
        const BORDER = `border: 1px solid #000000;`;
        const TH = `${BORDER} padding: 7px 8px; text-align: center; vertical-align: middle; font-weight: bold;`;
        const TD = `${BORDER} padding: 6px 8px; vertical-align: middle; font-weight: normal; line-height: 1.4;`;
        const TF_LABEL = `${BORDER} padding: 7px 8px; text-align: right; font-weight: bold; vertical-align: middle;`;
        const TF_VALUE = `${BORDER} padding: 7px 8px; text-align: right; font-weight: bold; vertical-align: middle; white-space: nowrap;`;
        const SECTION_TITLE = `font-weight: bold; font-size: 12pt; margin: 0 0 6px 0;`;
        const LI = `margin: 0 0 4px 0; padding-left: 14px; text-indent: -14px; line-height: 1.5; page-break-inside: avoid; break-inside: avoid;`;

        const renderFullHeader = () => `
            <!-- Header: Logo bên trái & Thông tin công ty bên phải -->
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 26px;">
                <div style="flex-shrink: 0;">
                    ${logoHtml}
                </div>
                <div style="text-align: right; font-size: 11pt; line-height: 1.5;">
                    <div style="font-weight: bold; font-size: 12pt; text-transform: uppercase;">${this.escapeHtml(company.name || 'CÔNG TY CỔ PHẦN GIẢI PHÁP ETRON')}</div>
                    <div><b>Mã số thuế:</b> ${this.escapeHtml(company.taxCode || '0110415751')}</div>
                    <div><b>Địa chỉ:</b> ${this.escapeHtml(company.address || 'A24/D7 ngõ 66 Khúc Thừa Dụ, Dịch Vọng, Cầu Giấy, Hà Nội')}</div>
                </div>
            </div>
        `;

        const renderTitleAndCustomer = () => `
            <!-- Tiêu đề -->
            <div style="text-align: center; margin: 0 0 18px 0;">
                <div style="font-size: 20pt; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; line-height: 1.3;">BÁO GIÁ</div>
                <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase; margin-top: 4px; line-height: 1.3;">${this.escapeHtml(q.title || 'DỊCH VỤ ADAHUB & UCALL')}</div>
            </div>

            <!-- Kính gửi & Ngày báo giá -->
            <div style="margin-bottom: 10px; font-size: 12pt; line-height: 1.6;">
                <div style="display: flex;">
                    <span style="font-weight: bold; width: 115px; flex-shrink: 0;">Kính gửi:</span>
                    <span style="font-weight: bold; text-transform: uppercase;">${this.escapeHtml(q.customer.company || 'QUÝ KHÁCH HÀNG')}</span>
                </div>
                ${q.customer.contactPerson ? `
                <div style="display: flex;">
                    <span style="width: 115px; flex-shrink: 0;">Người nhận:</span>
                    <span>${this.escapeHtml(q.customer.contactPerson)}${q.customer.title ? ` (${this.escapeHtml(q.customer.title)})` : ''}</span>
                </div>` : ''}
                <div style="display: flex;">
                    <span style="width: 115px; flex-shrink: 0;">Ngày báo giá:</span>
                    <span>${this.formatDateVi(q.date)}</span>
                </div>
                <div style="margin-top: 8px; text-align: justify;">
                    ${this.escapeHtml(q.intro || 'Công ty Cổ phần Giải pháp Etron xin gửi tới Quý khách hàng báo giá các dịch vụ như sau:')}
                </div>
            </div>

            <!-- Đơn vị tính -->
            <div style="text-align: right; font-size: 11pt; font-style: italic; margin-bottom: 4px;">
                Đơn vị tính: VNĐ
            </div>
        `;

        const renderTableHeader = () => `
            <thead>
                <tr style="background-color: #C9DAF8;">
                    <th style="${TH} width: 40px;">STT</th>
                    <th style="${TH}">Hạng mục</th>
                    <th style="${TH} width: 128px;">Đơn giá</th>
                    <th style="${TH} width: 122px;">Số lượng</th>
                    <th style="${TH} width: 112px;">Thành tiền</th>
                </tr>
            </thead>
        `;

        const renderItemRows = (itemsList, startIdx = 0) => {
            if (itemsList.length === 0) {
                return `
                    <tr>
                        <td colspan="5" style="${TD} padding: 12px; text-align: center; font-style: italic; color: #555555;">Chưa có hạng mục nào.</td>
                    </tr>
                `;
            }

            const grouped = this.groupItemsByCategory(itemsList);
            let currentStt = startIdx + 1;
            let rowsHtml = '';

            grouped.forEach(group => {
                rowsHtml += `
                    <tr style="background-color: #EDF2F8; page-break-inside: avoid; break-inside: avoid;">
                        <td colspan="5" style="${BORDER} padding: 6px 8px; font-weight: bold; text-align: left;">${this.escapeHtml(group.category)}</td>
                    </tr>
                `;

                group.items.forEach(item => {
                    rowsHtml += `
                        <tr style="page-break-inside: avoid; break-inside: avoid;">
                            <td style="${TD} text-align: center;">${currentStt++}</td>
                            <td style="${TD} text-align: left;">${this.escapeHtml(this.getPrintableName(item.name))}</td>
                            <td style="${TD} text-align: center;">${this.formatItemUnitPrice(item)}</td>
                            <td style="${TD} text-align: center;">${this.formatItemQuantity(item)}</td>
                            <td style="${TD} text-align: right; white-space: nowrap;">${window.formatNumber(item.amount)}₫</td>
                        </tr>
                    `;
                });
            });

            return rowsHtml;
        };

        const renderTableTotals = () => `
            <tfoot>
                <tr style="page-break-inside: avoid; break-inside: avoid;">
                    <td colspan="4" style="${TF_LABEL}">Cộng (chưa VAT)</td>
                    <td style="${TF_VALUE}">${window.formatNumber(q.taxableSubtotal !== undefined ? q.taxableSubtotal : q.subtotal)}₫</td>
                </tr>
                ${q.overallDiscountAmount > 0 ? `
                    <tr style="page-break-inside: avoid; break-inside: avoid;">
                        <td colspan="4" style="${TF_LABEL}">Chiết khấu (${q.overallDiscountPercent}%)</td>
                        <td style="${TF_VALUE}">- ${window.formatNumber(q.overallDiscountAmount)}₫</td>
                    </tr>
                ` : ''}
                <tr style="page-break-inside: avoid; break-inside: avoid;">
                    <td colspan="4" style="${TF_LABEL}">VAT ${q.vatRate}%</td>
                    <td style="${TF_VALUE}">${window.formatNumber(q.vatAmount)}₫</td>
                </tr>
                ${(q.telecomTotal && q.telecomTotal > 0) ? `
                    <tr style="page-break-inside: avoid; break-inside: avoid;">
                        <td colspan="4" style="${TF_LABEL}">Đầu số &amp; Cước viễn thông (đã gồm VAT 10%)</td>
                        <td style="${TF_VALUE}">${window.formatNumber(q.telecomTotal)}₫</td>
                    </tr>
                ` : ''}
                <tr style="background-color: #FCE5CD; page-break-inside: avoid; break-inside: avoid;">
                    <td colspan="4" style="${TF_LABEL} text-transform: uppercase;">Tổng thanh toán</td>
                    <td style="${TF_VALUE} font-size: 13pt;">${window.formatNumber(q.grandTotal)}₫</td>
                </tr>
            </tfoot>
        `;

        const renderWordsAndNotes = () => `
            <!-- Bằng chữ -->
            <div style="font-size: 12pt; font-style: italic; margin: 8px 0 14px 0; line-height: 1.5; page-break-inside: avoid; break-inside: avoid;">
                <b>Bằng chữ:</b> ${this.escapeHtml(q.totalInWords || window.readVietnameseCurrency(q.grandTotal))}
            </div>

            <!-- Chi tiết gói (nếu có) -->
            ${(q.packageDetails && q.packageDetails.length > 0) ? `
            <div style="margin-bottom: 12px; font-size: 12pt; text-align: justify;">
                <div style="${SECTION_TITLE}">Chi tiết gói:</div>
                <ul style="list-style: none; padding-left: 0; margin: 0;">
                    ${q.packageDetails.map(d => `<li style="${LI}">${this.escapeHtml(d.startsWith('-') ? d : '- ' + d)}</li>`).join('')}
                </ul>
            </div>` : ''}

            <!-- Ghi chú -->
            <div style="margin-bottom: 12px; font-size: 12pt; text-align: justify;">
                <div style="${SECTION_TITLE}">Ghi chú:</div>
                <ul style="list-style: none; padding-left: 0; margin: 0;">
                    ${(q.terms || []).map(t => `<li style="${LI}">${this.escapeHtml(t.startsWith('-') ? t : '- ' + t)}</li>`).join('')}
                </ul>
            </div>
        `;

        const renderSignature = () => `
            <!-- Chữ ký -->
            <div class="signature-section" style="margin-top: 20px; display: flex; justify-content: flex-end; page-break-inside: avoid !important; break-inside: avoid !important;">
                <div style="text-align: center; width: 300px; font-size: 12pt; line-height: 1.5;">
                    <div style="font-style: italic;">Hà Nội, ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}</div>
                    <div style="font-weight: bold; text-transform: uppercase; margin-top: 2px;">CÔNG TY CỔ PHẦN GIẢI PHÁP ETRON</div>
                    <div style="font-weight: bold;">${this.escapeHtml(q.salesRep?.title || 'Giám đốc kinh doanh')}</div>
                    <div style="height: 80px; display: flex; align-items: center; justify-content: center;">
                        ${company.stampUrl ? `<img src="${company.stampUrl}" alt="Dấu mộc" style="max-height: 76px; object-fit: contain;">` : ''}
                    </div>
                    <div style="font-weight: bold;">${this.escapeHtml(q.salesRep?.name || 'Đỗ Thị Thùy Liên')}</div>
                </div>
            </div>
        `;

        const items = q.items || [];

        // Một trang trắng duy nhất kéo dài tự nhiên; khi xuất PDF sẽ tự phân trang
        return `
            <div class="a4-sheet a4-page bg-white shadow-2xl mx-auto print:shadow-none print:m-0" style="${FONT} font-size: 12pt; line-height: 1.5; box-sizing: border-box; position: relative; width: 210mm; min-height: 297mm; height: auto !important; max-height: none !important; padding: 14mm 16mm; background: #ffffff !important;">
                ${renderFullHeader()}
                ${renderTitleAndCustomer()}
                <div style="margin-bottom: 4px;">
                    <table style="width: 100%; border-collapse: collapse; border: none; font-size: 12pt; ${FONT}">
                        ${renderTableHeader()}
                        <tbody>
                            ${renderItemRows(items, 0)}
                        </tbody>
                        ${renderTableTotals()}
                    </table>
                </div>
                ${renderWordsAndNotes()}
                ${renderSignature()}
            </div>
        `;
    }

    // Render bản xem trước A4 trực quan CHUẨN XÁC theo mẫu Etron đã cung cấp
    renderPreview() {
        const html = this.getA4Html();
        const previewEl = document.getElementById('a4-quotation-preview');
        const printEl = document.getElementById('quotation-print-sheet');

        if (previewEl) previewEl.innerHTML = html;
        if (printEl) printEl.innerHTML = html;
    }

    saveCurrentQuote(status = 'Draft') {
        this.currentQuote.status = status;
        this.syncFormToCurrentQuote();
        this.recalculate();
        const saved = window.salesStore.saveQuote(this.currentQuote);
        this.currentQuote.id = saved.id;
        window.salesApp.showNotification('Đã lưu bảng báo giá thành công!', 'success');
        window.salesApp.renderQuotesHistory();
    }

    syncFormToCurrentQuote() {
        const q = this.currentQuote;
        const dateEl = document.getElementById('qb-date');
        if (dateEl) q.date = dateEl.value;

        const validUntilEl = document.getElementById('qb-validUntil');
        if (validUntilEl) q.validUntil = validUntilEl.value;

        const compEl = document.getElementById('qb-custCompany');
        if (compEl) q.customer.company = compEl.value;

        const contactEl = document.getElementById('qb-custContact');
        if (contactEl) q.customer.contactPerson = contactEl.value;

        const discEl = document.getElementById('qb-overallDiscount');
        if (discEl) q.overallDiscountPercent = Number(discEl.value) || 0;

        const vatEl = document.getElementById('qb-vatRate');
        if (vatEl) q.vatRate = Number(vatEl.value) || 0;

        const pkgEl = document.getElementById('qb-packageDetails');
        if (pkgEl) q.packageDetails = pkgEl.value.split('\n').filter(t => t.trim().length > 0);

        const termsEl = document.getElementById('qb-terms');
        if (termsEl) q.terms = termsEl.value.split('\n').filter(t => t.trim().length > 0);
    }

    formatDateVi(dateStr) {
        if (!dateStr) return '---';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    }

    // Các nhãn nội bộ ("Khuyên dùng", "Đầy đủ tính năng") chỉ để xem trong hệ thống, không đưa lên báo giá gửi khách
    getPrintableName(name) {
        if (!name) return '';
        const labels = '(?:khuyên dùng|đầy đủ tính năng)';
        return String(name)
            .replace(new RegExp(`\\s*[\\(\\[]\\s*${labels}\\s*[\\)\\]]`, 'gi'), '')
            .replace(new RegExp(`\\s*[-–—:]\\s*${labels}\\s*$`, 'gi'), '')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }

    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

window.quoteBuilder = new QuoteBuilder();
