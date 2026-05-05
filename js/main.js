// ── UTILS ──
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// ── SCROLL REVEAL ──
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); revealObserver.unobserve(e.target); } });
}, { threshold: 0.12 });
$$('.reveal').forEach(el => revealObserver.observe(el));

// ── HEADER SCROLL STATE ──
const siteHeader = $('.site-header');
function updateHeader() {
  const threshold = window.innerHeight * 0.85;
  siteHeader?.classList.toggle('scrolled', window.scrollY > threshold);
}
window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();

// ── SCROLL TO TOP ──
const scrollTopBtn = $('.scroll-top');
window.addEventListener('scroll', () => {
  if (scrollTopBtn) scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
}, { passive: true });
if (scrollTopBtn) scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ── SEARCH OVERLAY ──
const searchOverlay = $('.search-overlay');
const searchInput = $('.search-input');
$$('[data-search]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    searchOverlay?.classList.add('open');
    setTimeout(() => searchInput?.focus(), 100);
  });
});
$('.search-close')?.addEventListener('click', () => searchOverlay?.classList.remove('open'));
searchOverlay?.addEventListener('click', (e) => { if (e.target === searchOverlay) searchOverlay.classList.remove('open'); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') searchOverlay?.classList.remove('open'); });

// ── SIZE SELECTOR ──
$$('.size-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const group = btn.closest('.size-grid');
    $$('.size-btn', group).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateStickyMeta();
  });
});

// ── ACCORDION ──
$$('.accordion-trigger').forEach(trigger => {
  trigger.addEventListener('click', () => {
    const item = trigger.closest('.accordion-item');
    const isOpen = item.classList.contains('open');
    $$('.accordion-item').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

// ── PDP GALLERY ──
let currentImg = 0;
const thumbs = $$('.pdp-thumb');
const mainImg = $('.pdp-main-img img');

function setGalleryImage(idx) {
  if (!thumbs.length || !mainImg) return;
  currentImg = (idx + thumbs.length) % thumbs.length;
  mainImg.src = thumbs[currentImg].querySelector('img').src;
  thumbs.forEach((t, i) => t.classList.toggle('active', i === currentImg));
}

thumbs.forEach((t, i) => t.addEventListener('click', () => setGalleryImage(i)));
$('.gallery-arrow.prev')?.addEventListener('click', () => setGalleryImage(currentImg - 1));
$('.gallery-arrow.next')?.addEventListener('click', () => setGalleryImage(currentImg + 1));

// ── STICKY PDP BAR ──
const stickyBar = $('.sticky-pdp');
const atcBtn = $('.atc-btn');
function updateStickyMeta() {
  const activeSize = $('.size-btn.active')?.textContent?.trim() || '';
  const colorName = $('.color-name')?.textContent?.trim() || '';
  const metaEl = $('.sticky-pdp-meta');
  if (metaEl) metaEl.textContent = [activeSize, colorName].filter(Boolean).join('  ·  ');
}
if (stickyBar && atcBtn) {
  const observer = new IntersectionObserver(([entry]) => {
    stickyBar.classList.toggle('visible', !entry.isIntersecting);
  }, { threshold: 0 });
  observer.observe(atcBtn);
}

// ── COLOR DROPDOWN ──
const colorSelectWrap = $('.color-select-wrap');
if (colorSelectWrap) {
  const trigger = $('.color-select', colorSelectWrap);
  const options = $$('.color-option', colorSelectWrap);
  const colorDropdown = $('.color-dropdown', colorSelectWrap);
  trigger?.addEventListener('click', () => colorDropdown?.classList.toggle('open'));
  options.forEach(opt => {
    opt.addEventListener('click', () => {
      const swatch = opt.dataset.color;
      const name = opt.dataset.name;
      const swatchEl = $('.color-swatch', colorSelectWrap);
      const nameEl = $('.color-name', colorSelectWrap);
      if (swatchEl) swatchEl.style.background = swatch;
      if (nameEl) nameEl.textContent = name;
      colorDropdown?.classList.remove('open');
    });
  });
  document.addEventListener('click', (e) => {
    if (!colorSelectWrap.contains(e.target)) colorDropdown?.classList.remove('open');
  });
}

// ── SWIPER CAROUSELS ──
document.addEventListener('DOMContentLoaded', () => {
  if (typeof Swiper !== 'undefined') {
    // Product feature carousel
    const featSwiper = new Swiper('.product-swiper', {
      slidesPerView: 3.2,
      spaceBetween: 16,
      grabCursor: true,
      breakpoints: {
        0:   { slidesPerView: 1.4, spaceBetween: 12 },
        640: { slidesPerView: 2.2, spaceBetween: 14 },
        1024:{ slidesPerView: 3.2, spaceBetween: 16 },
      }
    });
    // Custom nav buttons
    const prevBtn = $('.carousel-btn.prev');
    const nextBtn = $('.carousel-btn.next');
    prevBtn?.addEventListener('click', () => featSwiper.slidePrev());
    nextBtn?.addEventListener('click', () => featSwiper.slideNext());

    // YMAL carousel
    new Swiper('.ymal-swiper', {
      slidesPerView: 4,
      spaceBetween: 2,
      grabCursor: true,
      navigation: { prevEl: '.ymal-prev', nextEl: '.ymal-next' },
      breakpoints: {
        0:   { slidesPerView: 1.5, spaceBetween: 8 },
        640: { slidesPerView: 2.5, spaceBetween: 8 },
        1024:{ slidesPerView: 4,   spaceBetween: 2 },
      }
    });
  }

  // Init sticky meta
  updateStickyMeta();

  // Re-run reveal for dynamically visible elements
  $$('.reveal').forEach(el => revealObserver.observe(el));
});
