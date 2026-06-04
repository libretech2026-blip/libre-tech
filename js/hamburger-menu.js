/* ============================================================
   LIBRE TECH - Hamburger Menu (hamburger-menu.js)
   Menú de categorías y subcategorías dinámico
   ============================================================ */

const HamburgerMenu = (() => {
  'use strict';

  let isOpen = false;

  function init() {
    const btnHamburger = document.getElementById('btnHamburger');
    const btnCloseMenu = document.getElementById('btnCloseMenu');
    const hamburgerMenu = document.getElementById('hamburgerMenu');

    if (!btnHamburger || !btnCloseMenu || !hamburgerMenu) return;

    // Open menu
    btnHamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      openMenu();
    });

    // Close menu
    btnCloseMenu.addEventListener('click', closeMenu);

    // Close menu when clicking on a category button (but not on the chevron to expand)
    hamburgerMenu.addEventListener('click', (e) => {
      if (e.target.closest('.menu-subcategory-item')) {
        // Close after selecting a brand
        setTimeout(closeMenu, 200);
      }
    });

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) {
        closeMenu();
      }
    });

    // Render categories on init
    renderMenuCategories();

    // Re-render categories when products are updated
    document.addEventListener('products-updated', () => {
      renderMenuCategories();
    });
  }

  function openMenu() {
    const btnHamburger = document.getElementById('btnHamburger');
    const hamburgerMenu = document.getElementById('hamburgerMenu');

    if (!btnHamburger || !hamburgerMenu) return;

    isOpen = true;
    btnHamburger.classList.add('active');
    btnHamburger.setAttribute('aria-expanded', 'true');
    hamburgerMenu.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    const btnHamburger = document.getElementById('btnHamburger');
    const hamburgerMenu = document.getElementById('hamburgerMenu');

    if (!btnHamburger || !hamburgerMenu) return;

    isOpen = false;
    btnHamburger.classList.remove('active');
    btnHamburger.setAttribute('aria-expanded', 'false');
    hamburgerMenu.classList.remove('active');
    document.body.style.overflow = '';
  }

  function renderMenuCategories() {
    const content = document.getElementById('hamburgerMenuContent');
    if (!content) return;

    // Get products from Store (if available)
    let products = [];
    if (typeof Store !== 'undefined' && Store.getActiveProducts) {
      products = Store.getActiveProducts();
    }

    // Extract unique categories and their brands
    const categoryMap = new Map();
    products.forEach(p => {
      if (!p.category) return;
      if (!categoryMap.has(p.category)) {
        categoryMap.set(p.category, new Set());
      }
      if (p.brand) {
        categoryMap.get(p.category).add(p.brand);
      }
    });

    // Sort categories
    const categories = Array.from(categoryMap.keys()).sort();

    // Clear content
    content.innerHTML = '';

    // Add "Todos" option
    const allBtn = document.createElement('button');
    allBtn.className = 'menu-category-btn';
    allBtn.textContent = 'Todos los productos';
    allBtn.addEventListener('click', () => {
      closeMenu();
      // Navigate to productos.html
      if (window.location.pathname.includes('productos.html')) {
        // Already on productos page, just set category
        if (typeof Store !== 'undefined' && Store.setActiveCategory) {
          Store.setActiveCategory('all', null, { skipBrandDropdown: true });
        }
      } else {
        // Navigate to productos.html
        window.location.href = 'productos.html';
      }
    });
    
    const allCategoryDiv = document.createElement('div');
    allCategoryDiv.className = 'menu-category';
    allCategoryDiv.appendChild(allBtn);
    content.appendChild(allCategoryDiv);

    // Add categories with brands (displayed inline, NO popups)
    categories.forEach(category => {
      const brands = Array.from(categoryMap.get(category)).sort();

      // Category button
      const categoryBtn = document.createElement('button');
      categoryBtn.className = 'menu-category-btn';
      categoryBtn.textContent = category;
      categoryBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMenu();
        // Navigate to productos.html with category filter
        if (window.location.pathname.includes('productos.html')) {
          if (typeof Store !== 'undefined' && Store.setActiveCategory) {
            Store.setActiveCategory(category, null, { skipBrandDropdown: true });
          }
        } else {
          window.location.href = `productos.html?category=${encodeURIComponent(category)}`;
        }
      });

      // Category container
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'menu-category';
      categoryDiv.appendChild(categoryBtn);

      // Add brands as direct subcategory items (if any)
      if (brands.length > 0) {
        const brandsDiv = document.createElement('div');
        brandsDiv.className = 'menu-subcategories';
        
        brands.forEach(brand => {
          const brandBtn = document.createElement('button');
          brandBtn.className = 'menu-subcategory-item';
          brandBtn.textContent = brand;
          brandBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeMenu();
            // Navigate with category and brand filter
            if (window.location.pathname.includes('productos.html')) {
              if (typeof Store !== 'undefined' && Store.setActiveCategory) {
                Store.setActiveCategory(category, null, { skipBrandDropdown: true, brand: brand });
                Store.renderFeaturedProducts();
              }
            } else {
              window.location.href = `productos.html?category=${encodeURIComponent(category)}&brand=${encodeURIComponent(brand)}`;
            }
          });
          brandsDiv.appendChild(brandBtn);
        });
        
        categoryDiv.appendChild(brandsDiv);
      }

      content.appendChild(categoryDiv);
    });
  }

  // Expose public methods
  return {
    init,
    renderMenuCategories,
    openMenu,
    closeMenu
  };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', HamburgerMenu.init);
