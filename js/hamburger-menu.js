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

    // Extract unique categories and their products
    const categoryMap = new Map();
    products.forEach(p => {
      if (!p.category || !p.id || !p.name) return;
      if (!categoryMap.has(p.category)) {
        categoryMap.set(p.category, []);
      }
      categoryMap.get(p.category).push({ id: p.id, name: p.name });
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
      if (window.location.pathname.includes('productos.html')) {
        if (typeof Store !== 'undefined' && Store.setActiveCategory) {
          Store.setActiveCategory('all', null, { skipBrandDropdown: true });
        }
      } else {
        window.location.href = 'productos.html';
      }
    });
    
    const allCategoryDiv = document.createElement('div');
    allCategoryDiv.className = 'menu-category';
    allCategoryDiv.appendChild(allBtn);
    content.appendChild(allCategoryDiv);

    // Add categories with products (collapsed by default)
    categories.forEach(category => {
      const productsForCategory = categoryMap.get(category).sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

      // Category container
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'menu-category';

      // Category header (with toggle if has products)
      const categoryHeaderDiv = document.createElement('div');
      categoryHeaderDiv.className = 'menu-category-header';

      // Category button
      const categoryBtn = document.createElement('button');
      categoryBtn.className = 'menu-category-btn';
      categoryBtn.textContent = category;
      categoryBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMenu();
        if (window.location.pathname.includes('productos.html')) {
          if (typeof Store !== 'undefined' && Store.setActiveCategory) {
            Store.setActiveCategory(category, null, { skipBrandDropdown: true });
          }
        } else {
          window.location.href = `productos.html?category=${encodeURIComponent(category)}`;
        }
      });

      categoryHeaderDiv.appendChild(categoryBtn);

      if (productsForCategory.length > 0) {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'menu-category-toggle';
        toggleBtn.setAttribute('aria-label', `Expandir/contraer ${category}`);
        toggleBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
        
        const productsDiv = document.createElement('div');
        productsDiv.className = 'menu-subcategories collapsed';
        
        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          productsDiv.classList.toggle('collapsed');
          toggleBtn.classList.toggle('expanded');
        });

        categoryHeaderDiv.appendChild(toggleBtn);

        productsForCategory.forEach(product => {
          const productBtn = document.createElement('button');
          productBtn.className = 'menu-subcategory-item';
          productBtn.textContent = product.name;
          productBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeMenu();
            window.location.href = `producto.html?id=${encodeURIComponent(product.id)}`;
          });
          productsDiv.appendChild(productBtn);
        });

        categoryDiv.appendChild(categoryHeaderDiv);
        categoryDiv.appendChild(productsDiv);
      } else {
        categoryDiv.appendChild(categoryHeaderDiv);
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
