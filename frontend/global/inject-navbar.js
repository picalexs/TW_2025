import { setupLanguageDropdown, setupMobileMenu } from './global.js';

document.addEventListener('DOMContentLoaded', function() {
  const navbarContainer = document.getElementById('global-navbar');
  const footerContainer = document.getElementById('global-footer');

  if (!navbarContainer && !footerContainer) {
    console.warn('No navbar or footer containers found on page');
    return;
  }

  fetch('../global/global.html')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.text();
    })
    .then(html => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      const header = tempDiv.querySelector('header');
      const footer = tempDiv.querySelector('footer');

      if (header && navbarContainer) {
        navbarContainer.innerHTML = '';
        navbarContainer.appendChild(header);
      }

      if (footer && footerContainer) {
        footerContainer.innerHTML = '';
        footerContainer.appendChild(footer);
      }

      setupLanguageDropdown();
      setupMobileMenu();
      
      document.dispatchEvent(new CustomEvent('componentsLoaded'));
      
      if (window.languageManager) {
        window.languageManager.updateContent();
      }
    })
    .catch(error => {
      console.error('Error loading navigation components:', error);
      if (navbarContainer) {
        navbarContainer.innerHTML = '<div class="error-loading">Failed to load navigation. Please try refreshing the page.</div>';
      }
    });
});
