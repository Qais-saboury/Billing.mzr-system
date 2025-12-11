class PaymentSystem {
  constructor() {
    this.payments = this.loadPayments();
    this.filteredPayments = this.payments;
    this.init();
  }

  init() {
    this.updateDateTime();
    setInterval(() => this.updateDateTime(), 1000);
    
    document.getElementById('paymentForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handlePaymentSubmit();
    });

    // Add event listeners for item calculations
    document.getElementById('itemsContainer').addEventListener('input', (e) => {
      if (e.target.classList.contains('item-qty') || e.target.classList.contains('item-rate')) {
        this.calculateItemAmount(e.target.closest('.item-row'));
        this.calculateTotals();
      }
    });

    document.getElementById('discountAmount').addEventListener('input', () => this.calculateTotals());
    document.getElementById('taxAmount').addEventListener('input', () => this.calculateTotals());

    // Search and filter event listeners
    document.getElementById('searchInput').addEventListener('input', () => this.applyFilters());
    document.getElementById('dateFilter').addEventListener('change', (e) => {
      const customRange = document.getElementById('customDateRange');
      if (e.target.value === 'custom') {
        customRange.style.display = 'block';
      } else {
        customRange.style.display = 'none';
      }
      this.applyFilters();
    });
    document.getElementById('methodFilter').addEventListener('change', () => this.applyFilters());
    document.getElementById('fromDate').addEventListener('change', () => this.applyFilters());
    document.getElementById('toDate').addEventListener('change', () => this.applyFilters());

    this.renderPayments();
    this.updateStats();
  }

  updateDateTime() {
    const now = new Date();
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', options);
  }

  addItem() {
    const container = document.getElementById('itemsContainer');
    const itemRow = document.createElement('div');
    itemRow.className = 'item-row';
    itemRow.innerHTML = `
      <div>
        <label style="font-size: 11px; color: #718096; margin-bottom: 4px; display: block;">Description</label>
        <input type="text" class="item-description" placeholder="e.g., Router Rental" required>
      </div>
      <div>
        <label style="font-size: 11px; color: #718096; margin-bottom: 4px; display: block;">Qty</label>
        <input type="number" class="item-qty" value="1" min="1" required>
      </div>
      <div>
        <label style="font-size: 11px; color: #718096; margin-bottom: 4px; display: block;">Rate (AFN)</label>
        <input type="number" class="item-rate" placeholder="0.00" step="0.01" min="0" required>
      </div>
      <div>
        <label style="font-size: 11px; color: #718096; margin-bottom: 4px; display: block;">Amount</label>
        <input type="number" class="item-amount" placeholder="0.00" readonly>
      </div>
      <div>
        <label style="font-size: 11px; color: transparent; margin-bottom: 4px; display: block;">-</label>
        <button type="button" class="btn btn-remove" onclick="paymentSystem.removeItem(this)">×</button>
      </div>
    `;
    container.appendChild(itemRow);
    this.updateRemoveButtons();
  }

  removeItem(button) {
    const itemRow = button.closest('.item-row');
    itemRow.remove();
    this.updateRemoveButtons();
    this.calculateTotals();
  }

  updateRemoveButtons() {
    const items = document.querySelectorAll('.item-row');
    items.forEach((item, index) => {
      const removeBtn = item.querySelector('.btn-remove');
      if (items.length > 1) {
        removeBtn.style.display = 'flex';
      } else {
        removeBtn.style.display = 'none';
      }
    });
  }

  calculateItemAmount(itemRow) {
    const qty = parseFloat(itemRow.querySelector('.item-qty').value) || 0;
    const rate = parseFloat(itemRow.querySelector('.item-rate').value) || 0;
    const amount = qty * rate;
    itemRow.querySelector('.item-amount').value = amount.toFixed(2);
  }

  calculateTotals() {
    const items = document.querySelectorAll('.item-row');
    let subtotal = 0;

    items.forEach(item => {
      const amount = parseFloat(item.querySelector('.item-amount').value) || 0;
      subtotal += amount;
    });

    const discount = parseFloat(document.getElementById('discountAmount').value) || 0;
    const tax = parseFloat(document.getElementById('taxAmount').value) || 0;
    const total = subtotal - discount + tax;

    document.getElementById('subtotalDisplay').textContent = subtotal.toFixed(2) + ' AFN';
    document.getElementById('totalDisplay').textContent = total.toFixed(2) + ' AFN';
  }

  applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const dateFilter = document.getElementById('dateFilter').value;
    const methodFilter = document.getElementById('methodFilter').value;
    const fromDate = document.getElementById('fromDate').value;
    const toDate = document.getElementById('toDate').value;

    this.filteredPayments = this.payments.filter(payment => {
      // Search filter
      const matchesSearch = 
        payment.customerName.toLowerCase().includes(searchTerm) ||
        payment.customerId.toLowerCase().includes(searchTerm) ||
        payment.customerPhone.toLowerCase().includes(searchTerm) ||
        payment.id.toLowerCase().includes(searchTerm) ||
        payment.items.some(item => item.description.toLowerCase().includes(searchTerm));

      if (!matchesSearch) return false;

      // Payment method filter
      if (methodFilter !== 'all' && payment.paymentMethod !== methodFilter) {
        return false;
      }

      // Date filter
      const paymentDate = new Date(payment.date);
      const now = new Date();

      switch (dateFilter) {
        case 'today':
          if (paymentDate.toDateString() !== now.toDateString()) return false;
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (paymentDate < weekAgo) return false;
          break;
        case 'month':
          if (paymentDate.getMonth() !== now.getMonth() || 
              paymentDate.getFullYear() !== now.getFullYear()) return false;
          break;
        case 'custom':
          if (fromDate && paymentDate < new Date(fromDate)) return false;
          if (toDate && paymentDate > new Date(toDate + 'T23:59:59')) return false;
          break;
      }

      return true;
    });

    this.renderPayments();
    this.updateStats();
  }

  handlePaymentSubmit() {
    const items = [];
    const itemRows = document.querySelectorAll('.item-row');
    
    itemRows.forEach(row => {
      const description = row.querySelector('.item-description').value;
      const qty = parseFloat(row.querySelector('.item-qty').value);
      const rate = parseFloat(row.querySelector('.item-rate').value);
      const amount = parseFloat(row.querySelector('.item-amount').value);
      
      if (description && qty && rate) {
        items.push({ description, qty, rate, amount });
      }
    });

    if (items.length === 0) {
      alert('Please add at least one service item');
      return;
    }

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const discount = parseFloat(document.getElementById('discountAmount').value) || 0;
    const tax = parseFloat(document.getElementById('taxAmount').value) || 0;
    const total = subtotal - discount + tax;

    const payment = {
      id: 'AFN-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6),
      customerName: document.getElementById('customerName').value,
      customerId: document.getElementById('customerId').value || 'N/A',
      customerPhone: document.getElementById('customerPhone').value || 'N/A',
      customerAddress: document.getElementById('customerAddress').value || 'N/A',
      paymentMethod: document.getElementById('paymentMethod').value,
      billingPeriod: document.getElementById('billingPeriod').value || 'N/A',
      items: items,
      subtotal: subtotal,
      discount: discount,
      tax: tax,
      total: total,
      date: new Date().toISOString(),
      operator: document.getElementById('operatorName').textContent
    };

    this.payments.unshift(payment);
    this.savePayments();
    this.applyFilters();
    
    document.getElementById('paymentForm').reset();
    document.getElementById('discountAmount').value = 0;
    document.getElementById('taxAmount').value = 0;
    
    // Reset items to single row
    const container = document.getElementById('itemsContainer');
    container.innerHTML = `
      <div class="item-row">
        <div>
          <label style="font-size: 11px; color: #718096; margin-bottom: 4px; display: block;">Description</label>
          <input type="text" class="item-description" placeholder="e.g., Internet Service" required>
        </div>
        <div>
          <label style="font-size: 11px; color: #718096; margin-bottom: 4px; display: block;">Qty</label>
          <input type="number" class="item-qty" value="1" min="1" required>
        </div>
        <div>
          <label style="font-size: 11px; color: #718096; margin-bottom: 4px; display: block;">Rate (AFN)</label>
          <input type="number" class="item-rate" placeholder="0.00" step="0.01" min="0" required>
        </div>
        <div>
          <label style="font-size: 11px; color: #718096; margin-bottom: 4px; display: block;">Amount</label>
          <input type="number" class="item-amount" placeholder="0.00" readonly>
        </div>
        <div>
          <label style="font-size: 11px; color: transparent; margin-bottom: 4px; display: block;">-</label>
          <button type="button" class="btn btn-remove" onclick="paymentSystem.removeItem(this)" style="display: none;">×</button>
        </div>
      </div>
    `;
    
    this.calculateTotals();
    this.showNotification('Payment recorded successfully!');
    
    setTimeout(() => {
      this.showReceipt(payment);
    }, 500);
  }

  showReceipt(payment) {
    const receiptDate = new Date(payment.date);
    const formattedDate = receiptDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedDateTime = receiptDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    document.getElementById('receiptNumber').textContent = payment.id;
    document.getElementById('receiptDate').textContent = formattedDate;
    document.getElementById('receiptPaymentDate').textContent = formattedDateTime;
    document.getElementById('receiptCustomerName').textContent = payment.customerName;
    document.getElementById('receiptCustomerId').textContent = payment.customerId;
    document.getElementById('receiptCustomerPhone').textContent = payment.customerPhone;
    document.getElementById('receiptCustomerAddress').textContent = payment.customerAddress;
    document.getElementById('receiptBillingPeriod').textContent = payment.billingPeriod;
    document.getElementById('receiptPaymentMethod').textContent = payment.paymentMethod;

    // Populate items table
    const itemsTable = document.getElementById('receiptItemsTable');
    itemsTable.innerHTML = payment.items.map(item => `
      <tr>
        <td>${item.description}</td>
        <td>${item.qty}</td>
        <td>${item.rate.toFixed(2)}</td>
        <td>${item.amount.toFixed(2)}</td>
      </tr>
    `).join('');

    document.getElementById('receiptSubtotal').textContent = payment.subtotal.toFixed(2) + ' AFN';
    document.getElementById('receiptDiscount').textContent = '-' + payment.discount.toFixed(2) + ' AFN';
    document.getElementById('receiptTax').textContent = payment.tax.toFixed(2) + ' AFN';
    document.getElementById('receiptTotal').textContent = payment.total.toFixed(2) + ' AFN';

    document.getElementById('receiptModal').classList.add('active');
  }

  closeReceipt() {
    document.getElementById('receiptModal').classList.remove('active');
  }

  renderPayments() {
    const container = document.getElementById('paymentsList');
    
    if (this.filteredPayments.length === 0) {
      const hasPayments = this.payments.length > 0;
      container.innerHTML = `
        <div class="empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <p>${hasPayments ? 'No payments match your search criteria' : 'No payments recorded yet'}</p>
          ${hasPayments ? '<button class="btn btn-secondary" onclick="paymentSystem.clearFilters()" style="margin-top: 15px;">Clear Filters</button>' : ''}
        </div>
      `;
      return;
    }

    if (this.payments.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <p>No payments recorded yet</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.filteredPayments.map(payment => {
      const date = new Date(payment.date);
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const itemsSummary = payment.items.map(item => item.description).join(', ');

      return `
        <div class="payment-item">
          <div class="payment-info">
            <h4>${payment.customerName}</h4>
            <p><strong>${itemsSummary}</strong></p>
            <p>${formattedDate} • ${payment.paymentMethod}</p>
            <p style="font-size: 11px; color: #a0aec0;">Receipt: ${payment.id}</p>
          </div>
          <div class="payment-amount">${payment.total.toFixed(2)} AFN</div>
          <div class="payment-actions">
            <button class="btn btn-secondary" onclick="paymentSystem.viewReceipt('${payment.id}')">
              View
            </button>
            <button class="btn btn-danger" onclick="paymentSystem.deletePayment('${payment.id}')">
              Delete
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  viewReceipt(id) {
    const payment = this.payments.find(p => p.id === id);
    if (payment) {
      this.showReceipt(payment);
    }
  }

  deletePayment(id) {
    if (confirm('Are you sure you want to delete this payment record?')) {
      this.payments = this.payments.filter(p => p.id !== id);
      this.savePayments();
      this.applyFilters();
      this.showNotification('Payment deleted successfully!');
    }
  }

  updateStats() {
    const total = this.payments.length;
    const filtered = this.filteredPayments.length;
    const filteredAmount = this.filteredPayments.reduce((sum, p) => sum + p.total, 0);

    document.getElementById('totalPayments').textContent = total;
    document.getElementById('filteredPayments').textContent = filtered;
    document.getElementById('filteredAmount').textContent = filteredAmount.toFixed(2) + ' AFN';
  }

  clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('dateFilter').value = 'all';
    document.getElementById('methodFilter').value = 'all';
    document.getElementById('fromDate').value = '';
    document.getElementById('toDate').value = '';
    document.getElementById('customDateRange').style.display = 'none';
    this.applyFilters();
  }

  showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('hide');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  savePayments() {
    localStorage.setItem('afghanet_payments', JSON.stringify(this.payments));
  }

  loadPayments() {
    const saved = localStorage.getItem('afghanet_payments');
    return saved ? JSON.parse(saved) : [];
  }
}

const paymentSystem = new PaymentSystem();
