// ============================================================
// DRIP VIETNAMESE CAFE — CART SYSTEM
// ============================================================

const MENU_CONFIG = {
  'The Drippy':          { slug: 'the-drippy',         type: 'drink',  price: 7.00 },
  'Strawberry Matcha':   { slug: 'strawberry-matcha',  type: 'drink',  price: 8.00 },
  'Pandan Latte':        { slug: 'pandan-latte',        type: 'drink',  price: 8.00 },
  'Ube Coffee':          { slug: 'ube-coffee',          type: 'drink',  price: 8.00 },
  'Banana Latte':        { slug: 'banana-latte',        type: 'drink',  price: 7.50 },
  'Drips Mystery':       { slug: 'drips-mystery',       type: 'drink',  price: 7.00 },
  'Ube Biscoff Cookie':  { slug: 'ube-biscoff-cookie',  type: 'cookie', price: 4.00 },
  'Cookie Trio':         { slug: 'cookie-trio',         type: 'cookie', price: 10.00 },
  'Chicken Bánh Mì':    { slug: 'chicken-banh-mi',     type: 'food',   price: 9.00 },
};

const MILK_OPTIONS = [
  { label: 'Whole Milk',  surcharge: 0 },
  { label: '2% Milk',     surcharge: 0 },
  { label: 'Oat Milk',    surcharge: 0.75 },
  { label: 'Almond Milk', surcharge: 0.75 },
];

// ── PICKUP SLOT GENERATOR ────────────────────────────────────
function getPickupSlots() {
  const now = new Date();
  if (now.getDay() === 1) return []; // Closed Monday
  const slots = [];
  const closeMin = 16 * 60 + 45;
  const nowMin   = now.getHours() * 60 + now.getMinutes() + 15;
  const startMin = Math.max(9 * 60, nowMin);
  const firstSlot = Math.ceil(startMin / 15) * 15;
  for (let m = firstSlot; m <= closeMin; m += 15) {
    const h24  = Math.floor(m / 60);
    const min  = m % 60;
    const h12  = h24 > 12 ? h24 - 12 : h24 === 0 ? 12 : h24;
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    slots.push(`${h12}:${min.toString().padStart(2, '0')} ${ampm}`);
  }
  return slots;
}

// ── CART STATE ───────────────────────────────────────────────
let cart = [];
try { cart = JSON.parse(localStorage.getItem('dripCart')) || []; } catch { cart = []; }

function saveCart() { localStorage.setItem('dripCart', JSON.stringify(cart)); renderCart(); }

function addToCart(item) {
  cart.push({ ...item, _id: Date.now() + Math.random() });
  saveCart();
  openCartDrawer();
}

function removeFromCart(cartId) {
  cart = cart.filter(i => i._id !== cartId);
  saveCart();
}

function changeQty(cartId, delta) {
  const item = cart.find(i => i._id === cartId);
  if (item) { item.quantity = Math.max(1, item.quantity + delta); saveCart(); }
}

function getCartTotal() {
  return cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

// ── CART RENDERING ───────────────────────────────────────────
function renderCart() {
  const badge   = document.querySelector('.cart-badge');
  const itemsEl = document.querySelector('.cart-items');
  const totalEl = document.querySelector('.cart-total-amount');

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  if (badge) badge.textContent = totalItems;
  if (totalEl) totalEl.textContent = '$' + getCartTotal().toFixed(2);
  if (!itemsEl) return;

  if (cart.length === 0) {
    itemsEl.innerHTML = '<div class="cart-empty">Your cart is empty.<br><a href="menu.html">Browse the menu →</a></div>';
    return;
  }

  itemsEl.innerHTML = cart.map(item => {
    const customs = [];
    const c = item.customizations;
    if (c.temperature) customs.push(c.temperature);
    if (c.milk) customs.push(c.milk);
    if (c.sugarPackets) customs.push(`${c.sugarPackets} Sugar Pkt${c.sugarPackets > 1 ? 's' : ''}`);
    if (c.liquidSugarShots) customs.push(`${c.liquidSugarShots} Liquid Sugar Shot${c.liquidSugarShots > 1 ? 's' : ''}`);
    if (c.preparation) customs.push(c.preparation);
    if (c.specialInstructions) customs.push(`"${c.specialInstructions}"`);

    return `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          ${customs.length ? `<div class="cart-item-customs">${customs.join(' · ')}</div>` : ''}
          <div class="cart-item-qty-row">
            <button class="qty-btn" onclick="changeQty(${item._id}, -1)">−</button>
            <span class="qty-num">${item.quantity}</span>
            <button class="qty-btn" onclick="changeQty(${item._id}, 1)">+</button>
          </div>
        </div>
        <div class="cart-item-right">
          <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
          <button class="cart-item-remove" onclick="removeFromCart(${item._id})">Remove</button>
        </div>
      </div>
    `;
  }).join('');
}

// ── CART DRAWER ───────────────────────────────────────────────
function openCartDrawer()  {
  document.querySelector('.cart-drawer')?.classList.add('active');
  document.querySelector('.cart-overlay')?.classList.add('active');
}
function closeCartDrawer() {
  document.querySelector('.cart-drawer')?.classList.remove('active');
  document.querySelector('.cart-overlay')?.classList.remove('active');
}

// ── CUSTOMIZATION MODAL ──────────────────────────────────────
let _currentConfig = null;

function buildModalFields(type, basePrice) {
  if (type === 'drink') {
    const milkOpts = MILK_OPTIONS.map(m =>
      `<option value="${m.label}" data-surcharge="${m.surcharge}">${m.label}${m.surcharge ? ` (+$${m.surcharge.toFixed(2)})` : ''}</option>`
    ).join('');
    return `
      <div class="modal-field-group">
        <label class="modal-label">Temperature</label>
        <div class="toggle-group" id="temp-toggle">
          <button type="button" class="toggle-btn active" data-value="Iced" onclick="selectToggle(this,'temp-toggle')">Iced</button>
          <button type="button" class="toggle-btn" data-value="Hot" onclick="selectToggle(this,'temp-toggle')">Hot</button>
        </div>
      </div>
      <div class="modal-field-group">
        <label class="modal-label">Milk</label>
        <select class="modal-select" id="milk-select" onchange="recalcPrice()">
          ${milkOpts}
        </select>
      </div>
      <div class="modal-field-group">
        <label class="modal-label">Sugar Packets</label>
        <div class="stepper-group">
          <button type="button" class="stepper-btn" onclick="stepValue('sugar-packets',0,10,-1)">−</button>
          <span class="stepper-val" id="sugar-packets">0</span>
          <button type="button" class="stepper-btn" onclick="stepValue('sugar-packets',0,10,1)">+</button>
        </div>
      </div>
      <div class="modal-field-group">
        <label class="modal-label">Liquid Sugar Shots</label>
        <div class="stepper-group">
          <button type="button" class="stepper-btn" onclick="stepValue('liquid-sugar',0,5,-1)">−</button>
          <span class="stepper-val" id="liquid-sugar">0</span>
          <button type="button" class="stepper-btn" onclick="stepValue('liquid-sugar',0,5,1)">+</button>
        </div>
      </div>
      <div class="modal-field-group">
        <label class="modal-label">Special Instructions</label>
        <textarea class="modal-textarea" id="special-instructions" placeholder="e.g. extra foam, light ice..." rows="2"></textarea>
      </div>`;
  }

  if (type === 'cookie') {
    return `
      <div class="modal-field-group">
        <label class="modal-label">Preparation</label>
        <div class="toggle-group" id="prep-toggle">
          <button type="button" class="toggle-btn active" data-value="Not Warmed" onclick="selectToggle(this,'prep-toggle')">Not Warmed</button>
          <button type="button" class="toggle-btn" data-value="Warmed" onclick="selectToggle(this,'prep-toggle')">Warmed 🔥</button>
        </div>
      </div>
      <div class="modal-field-group">
        <label class="modal-label">Special Instructions</label>
        <textarea class="modal-textarea" id="special-instructions" placeholder="Any notes for us?" rows="2"></textarea>
      </div>`;
  }

  return `
    <div class="modal-field-group">
      <label class="modal-label">Special Instructions</label>
      <textarea class="modal-textarea" id="special-instructions" placeholder="e.g. no jalapeño, extra cilantro..." rows="3"></textarea>
    </div>`;
}

window.openCustomizationModal = function(name, overridePrice) {
  const config = MENU_CONFIG[name];
  if (!config) return;
  const basePrice = overridePrice != null ? overridePrice : config.price;
  _currentConfig = { name, config, basePrice };

  const modal = document.getElementById('customization-modal');
  modal.querySelector('.modal-title').textContent = name;
  modal.querySelector('.modal-fields').innerHTML = buildModalFields(config.type, basePrice);
  recalcPrice();
  modal.classList.add('active');
};

window.closeModal = function() {
  document.getElementById('customization-modal')?.classList.remove('active');
};

window.selectToggle = function(btn, groupId) {
  document.querySelectorAll(`#${groupId} .toggle-btn`).forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
};

window.stepValue = function(id, min, max, delta) {
  const el = document.getElementById(id);
  if (!el) return;
  const val = Math.min(max, Math.max(min, parseInt(el.textContent) + delta));
  el.textContent = val;
};

window.recalcPrice = function() {
  if (!_currentConfig) return;
  const milkSelect = document.getElementById('milk-select');
  const surcharge = milkSelect ? parseFloat(milkSelect.selectedOptions[0]?.dataset.surcharge || 0) : 0;
  const total = _currentConfig.basePrice + surcharge;
  const display = document.querySelector('.modal-price-display');
  if (display) display.textContent = '$' + total.toFixed(2);
  _currentConfig.activeSurcharge = surcharge;
};

window.handleModalSubmit = function() {
  if (!_currentConfig) return;
  const { name, config, basePrice } = _currentConfig;
  const modal = document.getElementById('customization-modal');
  const customizations = {};
  let finalPrice = basePrice;

  if (config.type === 'drink') {
    customizations.temperature = modal.querySelector('#temp-toggle .toggle-btn.active')?.dataset.value || 'Iced';
    const milkSel = modal.querySelector('#milk-select');
    if (milkSel) {
      customizations.milk = milkSel.value;
      finalPrice += parseFloat(milkSel.selectedOptions[0]?.dataset.surcharge || 0);
    }
    customizations.sugarPackets = parseInt(modal.querySelector('#sugar-packets')?.textContent) || 0;
    customizations.liquidSugarShots = parseInt(modal.querySelector('#liquid-sugar')?.textContent) || 0;
  }

  if (config.type === 'cookie') {
    customizations.preparation = modal.querySelector('#prep-toggle .toggle-btn.active')?.dataset.value || 'Not Warmed';
  }

  const note = modal.querySelector('#special-instructions')?.value?.trim();
  if (note) customizations.specialInstructions = note;

  addToCart({ name, slug: config.slug, price: parseFloat(finalPrice.toFixed(2)), quantity: 1, customizations });
  closeModal();
};

// ── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  injectCartHTML();
  renderCart();
  attachCardListeners();

  // Always start with cart CLOSED regardless of any previous state
  closeCartDrawer();

  // Escape key closes cart or modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeCartDrawer();
      window.closeModal?.();
    }
  });
});

function injectCartHTML() {
  document.body.insertAdjacentHTML('beforeend', `
    <div class="cart-overlay" onclick="closeCartDrawer()"></div>
    <button class="cart-toggle" onclick="openCartDrawer()" aria-label="Open cart">
      🛒<span class="cart-badge">0</span>
    </button>
    <div class="cart-drawer">
      <div class="cart-drawer-header">
        <h2 class="cart-drawer-title">Your Order</h2>
        <button class="cart-drawer-close" onclick="closeCartDrawer()">✕</button>
      </div>
      <div class="cart-items"></div>
      <div class="cart-drawer-footer">
        <div class="cart-total-row">
          <span>Subtotal</span><span class="cart-total-amount">$0.00</span>
        </div>
        <a href="checkout.html" class="cart-checkout-btn">Proceed to Checkout →</a>
      </div>
    </div>
    <div class="modal-overlay" id="customization-modal">
      <div class="modal-card">
        <button class="modal-close-btn" onclick="closeModal()">✕</button>
        <div class="modal-header">
          <h3 class="modal-title">Item</h3>
        </div>
        <div class="modal-fields"></div>
        <div class="modal-footer">
          <div class="modal-final-price-row">
            <span>Total</span><span class="modal-price-display">$0.00</span>
          </div>
          <button class="modal-add-btn" onclick="handleModalSubmit()">Add to Order</button>
        </div>
      </div>
    </div>
  `);
}

function attachCardListeners() {
  document.querySelectorAll('.menu-card').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      const name = card.querySelector('.menu-card-name')?.textContent?.trim();
      if (name && MENU_CONFIG[name]) window.openCustomizationModal(name);
    });
  });
}

// Expose for checkout.html
window._cart = { getItems: () => cart, getTotal: getCartTotal, clear: () => { cart = []; saveCart(); } };

// Explicitly expose on window for iOS Safari inline onclick compatibility
window.openCartDrawer  = openCartDrawer;
window.closeCartDrawer = closeCartDrawer;
