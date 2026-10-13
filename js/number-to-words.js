/**
 * Chuyển đổi số tiền thành chữ Tiếng Việt chuẩn tài chính
 * Hỗ trợ từ 0 đến hàng nghìn tỷ VNĐ
 */

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const TIERS = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

function readGroup3(group, isFirstGroup = false) {
    let result = '';
    const hundred = Math.floor(group / 100);
    const ten = Math.floor((group % 100) / 10);
    const unit = group % 10;

    if (hundred > 0 || !isFirstGroup) {
        result += DIGITS[hundred] + ' trăm ';
        if (ten === 0 && unit > 0) {
            result += 'lẻ ';
        }
    }

    if (ten === 1) {
        result += 'mười ';
    } else if (ten > 1) {
        result += DIGITS[ten] + ' mươi ';
    }

    if (ten > 0 && unit === 1) {
        result += (ten === 1) ? 'một ' : 'mốt ';
    } else if (ten > 0 && unit === 5) {
        result += 'lăm ';
    } else if (unit > 0) {
        result += DIGITS[unit] + ' ';
    }

    return result.trim();
}

function readVietnameseCurrency(amount) {
    if (amount === undefined || amount === null || isNaN(amount)) return 'Không đồng.';
    let num = Math.round(Number(amount));
    if (num === 0) return 'Không đồng chẵn.';
    if (num < 0) return 'Âm ' + readVietnameseCurrency(Math.abs(num)).toLowerCase();

    const groups = [];
    while (num > 0) {
        groups.push(num % 1000);
        num = Math.floor(num / 1000);
    }

    let result = '';
    for (let i = groups.length - 1; i >= 0; i--) {
        const group = groups[i];
        if (group > 0) {
            const isFirst = (i === groups.length - 1);
            const textGroup = readGroup3(group, isFirst);
            result += textGroup + ' ' + (TIERS[i] ? TIERS[i] + ' ' : '');
        }
    }

    result = result.trim() + ' đồng chẵn.';
    // Viết hoa chữ cái đầu tiên
    return result.charAt(0).toUpperCase() + result.slice(1);
}

// Format VND currency: 15000000 -> 15.000.000 ₫
function formatCurrency(amount) {
    if (amount === undefined || amount === null || isNaN(amount)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' ₫';
}

function formatNumber(amount) {
    if (amount === undefined || amount === null || isNaN(amount)) return '0';
    return new Intl.NumberFormat('vi-VN').format(Math.round(amount));
}

// Export ra window để các script khác sử dụng trực tiếp
window.readVietnameseCurrency = readVietnameseCurrency;
window.formatCurrency = formatCurrency;
window.formatNumber = formatNumber;
