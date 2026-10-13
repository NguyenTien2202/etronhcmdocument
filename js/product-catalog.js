/**
 * Product Catalog Component & Logic
 * Quản lý danh mục sản phẩm/dịch vụ, giá bán, và Modal chọn nhanh vào báo giá
 */

class ProductCatalog {
    constructor() {
        this.selectedCategory = 'all';
        this.searchQuery = '';
        this.pickerSearch = '';
        this.pickerSelectedIds = new Set();
    }

    init() {
        this.renderCatalogTable();
    }

    getCategories() {
        const products = window.salesStore.getProducts();
        const set = new Set(products.map(p => p.category).filter(Boolean));
        return Array.from(set);
    }

    renderCatalogTable() {
        const tbody = document.getElementById('catalog-table-body');
        if (!tbody) return;

        const products = this.getFilteredProducts();

        if (products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="py-12 text-center text-slate-400">
                        <i data-lucide="package-search" class="w-10 h-10 mx-auto text-slate-300 mb-2"></i>
                        <p class="font-medium text-slate-600">Không tìm thấy sản phẩm nào</p>
                    </td>
                </tr>
            `;
            lucide.createIcons();
            return;
        }

        tbody.innerHTML = products.map((p, idx) => `
            <tr class="border-b border-slate-100 hover:bg-slate-50/70 transition-colors">
                <td class="py-3 px-4 text-xs font-mono font-bold text-indigo-700">${this.escapeHtml(p.code || '---')}</td>
                <td class="py-3 px-4">
                    <div class="font-semibold text-slate-900 text-sm">${this.escapeHtml(p.name)}</div>
                    ${p.description ? `<div class="text-xs text-slate-500 mt-0.5 line-clamp-1">${this.escapeHtml(p.description)}</div>` : ''}
                </td>
                <td class="py-3 px-4">
                    <span class="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                        ${this.escapeHtml(p.category || 'Mặc định')}
                    </span>
                </td>
                <td class="py-3 px-4 text-center text-xs font-medium text-slate-700">${this.escapeHtml(p.unit || 'Cái')}</td>
                <td class="py-3 px-4 text-right font-bold text-slate-900 text-sm">${window.formatCurrency(p.price)}</td>
                <td class="py-3 px-4 text-center text-xs text-slate-500">${this.escapeHtml(p.warranty || '---')}</td>
                <td class="py-3 px-4 text-right">
                    <div class="flex items-center justify-end gap-1">
                        <button onclick="window.productCatalog.openEditModal('${p.id}')"
                            class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Chỉnh sửa">
                            <i data-lucide="edit-3" class="w-4 h-4"></i>
                        </button>
                        <button onclick="window.productCatalog.deleteProduct('${p.id}')"
                            class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded" title="Xóa">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        lucide.createIcons();
    }

    getFilteredProducts() {
        const products = window.salesStore.getProducts();
        return products.filter(p => {
            const matchesCat = this.selectedCategory === 'all' || p.category === this.selectedCategory;
            const matchesSearch = !this.searchQuery || 
                p.name.toLowerCase().includes(this.searchQuery) ||
                (p.code && p.code.toLowerCase().includes(this.searchQuery)) ||
                (p.description && p.description.toLowerCase().includes(this.searchQuery));
            return matchesCat && matchesSearch;
        });
    }

    // Modal Chọn sản phẩm vào Báo Giá ("Chọn là tự động điền")
    openPickerModal() {
        this.pickerSearch = '';
        this.pickerCategory = 'all';
        this.pickerSelectedIds.clear();
        const modal = document.getElementById('product-picker-modal');
        if (modal) {
            modal.classList.remove('hidden');
            this.updatePickerCategoryButtons();
            this.renderPickerList();
            document.getElementById('picker-search-input').focus();
        }
    }

    closePickerModal() {
        const modal = document.getElementById('product-picker-modal');
        if (modal) modal.classList.add('hidden');
    }

    filterPicker(query) {
        this.pickerSearch = query.toLowerCase().trim();
        this.renderPickerList();
    }

    filterPickerCategory(category) {
        this.pickerCategory = category;
        this.updatePickerCategoryButtons();
        this.renderPickerList();
    }

    updatePickerCategoryButtons() {
        document.querySelectorAll('[data-picker-cat]').forEach(btn => {
            const isMatch = btn.getAttribute('data-picker-cat') === this.pickerCategory;
            if (isMatch) {
                btn.className = 'px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-600 text-white shadow-sm';
            } else {
                btn.className = 'px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200';
            }
        });
    }

    togglePickerSelect(productId) {
        if (this.pickerSelectedIds.has(productId)) {
            this.pickerSelectedIds.delete(productId);
        } else {
            this.pickerSelectedIds.add(productId);
        }
        this.renderPickerList();
        this.updatePickerCount();
    }

    renderPickerList() {
        const container = document.getElementById('picker-items-container');
        if (!container) return;

        const products = window.salesStore.getProducts().filter(p => {
            const matchesCat = this.pickerCategory === 'all' || 
                p.category === this.pickerCategory ||
                (this.pickerCategory === 'CRM' && (p.category === 'Phần mềm CRM' || p.category === 'CRM')) ||
                (this.pickerCategory === 'Callbot' && (p.category === 'Callbot AI' || p.category === 'Callbot')) ||
                (this.pickerCategory === 'Cước' && (p.category === 'Ví cước viễn thông' || p.category === 'Cước')) ||
                (this.pickerCategory === 'Dịch vụ' && (p.category === 'Dịch vụ đi kèm' || p.category === 'Dịch vụ')) ||
                (this.pickerCategory === 'Đầu số' && p.category === 'Đầu số');
            const matchesSearch = !this.pickerSearch || 
                   p.name.toLowerCase().includes(this.pickerSearch) ||
                   (p.code && p.code.toLowerCase().includes(this.pickerSearch)) ||
                   (p.category && p.category.toLowerCase().includes(this.pickerSearch)) ||
                   (p.description && p.description.toLowerCase().includes(this.pickerSearch));
            return matchesCat && matchesSearch;
        });

        if (products.length === 0) {
            container.innerHTML = `
                <div class="py-12 text-center text-slate-400">
                    <p class="text-sm">Không tìm thấy sản phẩm nào phù hợp với từ khóa.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = products.map(p => {
            const isSelected = this.pickerSelectedIds.has(p.id);
            return `
                <div onclick="window.productCatalog.togglePickerSelect('${p.id}')"
                    class="p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isSelected 
                        ? 'border-blue-600 bg-blue-50/70 shadow-sm' 
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }">
                    <div class="flex items-center gap-3">
                        <div class="w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                        }">
                            ${isSelected ? '<i data-lucide="check" class="w-3.5 h-3.5"></i>' : ''}
                        </div>
                        <div class="font-bold text-slate-900 text-sm leading-snug">${this.escapeHtml(p.name)}</div>
                    </div>
                    <div class="text-right shrink-0">
                        <div class="text-sm font-extrabold text-slate-900">${window.formatCurrency(p.price)}</div>
                        <button type="button" onclick="event.stopPropagation(); window.productCatalog.addSingleProductToQuote('${p.id}')"
                            class="mt-0.5 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                            + Thêm ngay
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        lucide.createIcons();
    }

    updatePickerCount() {
        const countEl = document.getElementById('picker-selected-count');
        const confirmBtn = document.getElementById('picker-confirm-btn');
        if (countEl) countEl.textContent = this.pickerSelectedIds.size;
        if (confirmBtn) {
            confirmBtn.disabled = this.pickerSelectedIds.size === 0;
            confirmBtn.classList.toggle('opacity-50', this.pickerSelectedIds.size === 0);
        }
    }

    addSingleProductToQuote(productId) {
        window.quoteBuilder.addProductFromCatalog(productId);
        window.salesApp.showNotification('Đã thêm sản phẩm vào báo giá!', 'success');
        this.closePickerModal();
    }

    confirmPickerSelection() {
        if (this.pickerSelectedIds.size === 0) return;
        this.pickerSelectedIds.forEach(id => {
            window.quoteBuilder.addProductFromCatalog(id);
        });
        window.salesApp.showNotification(`Đã thêm ${this.pickerSelectedIds.size} sản phẩm vào bảng báo giá!`, 'success');
        this.closePickerModal();
    }

    // Modal Sửa/Thêm Sản phẩm
    openCreateModal() {
        document.getElementById('product-modal-title').textContent = 'Thêm Sản Phẩm Mới';
        document.getElementById('prod-form-id').value = '';
        document.getElementById('prod-form-code').value = 'SP-' + Math.floor(1000 + Math.random() * 9000);
        document.getElementById('prod-form-name').value = '';
        document.getElementById('prod-form-category').value = 'Phần mềm';
        document.getElementById('prod-form-unit').value = 'Cái';
        document.getElementById('prod-form-price').value = 0;
        document.getElementById('prod-form-warranty').value = '12 tháng';
        document.getElementById('prod-form-desc').value = '';

        document.getElementById('product-edit-modal').classList.remove('hidden');
    }

    openEditModal(id) {
        const product = window.salesStore.getProducts().find(p => p.id === id);
        if (!product) return;

        document.getElementById('product-modal-title').textContent = 'Chỉnh Sửa Sản Phẩm';
        document.getElementById('prod-form-id').value = product.id;
        document.getElementById('prod-form-code').value = product.code || '';
        document.getElementById('prod-form-name').value = product.name || '';
        document.getElementById('prod-form-category').value = product.category || '';
        document.getElementById('prod-form-unit').value = product.unit || 'Cái';
        document.getElementById('prod-form-price').value = product.price || 0;
        document.getElementById('prod-form-warranty').value = product.warranty || '';
        document.getElementById('prod-form-desc').value = product.description || '';

        document.getElementById('product-edit-modal').classList.remove('hidden');
    }

    closeEditModal() {
        document.getElementById('product-edit-modal').classList.add('hidden');
    }

    saveProductForm(e) {
        if (e) e.preventDefault();
        const id = document.getElementById('prod-form-id').value;
        const product = {
            id: id || undefined,
            code: document.getElementById('prod-form-code').value.trim(),
            name: document.getElementById('prod-form-name').value.trim(),
            category: document.getElementById('prod-form-category').value.trim(),
            unit: document.getElementById('prod-form-unit').value.trim(),
            price: Number(document.getElementById('prod-form-price').value) || 0,
            warranty: document.getElementById('prod-form-warranty').value.trim(),
            description: document.getElementById('prod-form-desc').value.trim()
        };

        if (!product.name) {
            alert('Vui lòng nhập tên sản phẩm!');
            return;
        }

        window.salesStore.saveProduct(product);
        this.renderCatalogTable();
        this.closeEditModal();
        window.salesApp.showNotification('Đã lưu sản phẩm thành công!', 'success');
    }

    deleteProduct(id) {
        if (confirm('Bạn có chắc muốn xóa sản phẩm này khỏi danh mục?')) {
            window.salesStore.deleteProduct(id);
            this.renderCatalogTable();
            window.salesApp.showNotification('Đã xóa sản phẩm', 'info');
        }
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

window.productCatalog = new ProductCatalog();
