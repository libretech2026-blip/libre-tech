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
      if (typeof Store !== 'undefined' && Store.setActiveCategory) {
        Store.setActiveCategory('all');
      }
      closeMenu();
    });
    content.appendChild(allBtn);

    const allCategoryDiv = document.createElement('div');
    allCategoryDiv.className = 'menu-category';
    allCategoryDiv.appendChild(allBtn);
    content.appendChild(allCategoryDiv);

    // Add categories with subcategories
    categories.forEach(category => {
      const brands = Array.from(categoryMap.get(category)).sort();

      // Category button
      const categoryBtn = document.createElement('button');
      categoryBtn.className = 'menu-category-btn';
      categoryBtn.innerHTML = `
        <span>${category}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      `;

      // Subcategories container
      const subcategoriesDiv = document.createElement('div');
      subcategoriesDiv.className = 'menu-subcategories';

      // Add brand items
      brands.forEach(brand => {
        const brandBtn = document.createElement('button');
        brandBtn.className = 'menu-subcategory-item';
        brandBtn.textContent = brand;
        brandBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          // Click on the category filter chip to activate the category
          if (typeof Store !== 'undefined' && Store.setActiveCategory) {
            Store.setActiveCategory(category);
          }
          // Then manually set the brand filter by clicking on the brand in the dropdown
          // This is done through DOM manipulation to trigger the proper event handlers
          setTimeout(() => {
            const filterChip = document.querySelector(`[data-category="${category}"]`);
            if (filterChip) {
              filterChip.click();
              // After a small delay, find and click the brand in the brand dropdown
              setTimeout(() => {
                const brandItem = document.querySelector(`.brand-dd-item[data-brand="${brand}"]`);
                if (brandItem) {
                  brandItem.click();
                }
              }, 150);
            }
          }, 100);
          closeMenu();
        });
        subcategoriesDiv.appendChild(brandBtn);
      });

      // Toggle subcategories on category button click
      categoryBtn.addEventListener('click', () => {
        categoryBtn.classList.toggle('active');
        subcategoriesDiv.classList.toggle('active');
      });

      // Category container
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'menu-category';
      categoryDiv.appendChild(categoryBtn);
      categoryDiv.appendChild(subcategoriesDiv);
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
