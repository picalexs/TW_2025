import { setupLanguageDropdown, setupMobileMenu, initSlideshow } from './global.js';
import NavbarService from '../services/navbarService.js';

document.addEventListener('DOMContentLoaded', function() {
  console.log("Inject-navbar.js - Loading components");
  
  const headerComponent = document.querySelector('[data-component="header"]');
  const footerComponent = document.querySelector('[data-component="footer"]');
  const navbarContainer = document.getElementById('global-navbar');
  const footerContainer = document.getElementById('global-footer');

  if (headerComponent && navbarContainer) {
    console.warn('Both header component and navbar container found. Using only data-component="header"');
    navbarContainer.remove();
  }

  if (footerComponent && footerContainer) {
    console.warn('Both footer component and footer container found. Using only data-component="footer"');
    footerContainer.remove();
  }

  if ((headerComponent || footerComponent || navbarContainer || footerContainer) === false) {
    console.warn('No component containers found on page');
    return;
  }

  const navbarService = new NavbarService();
  
  navbarService.fetchGlobalComponents()
    .then(html => {
      const { header, footer } = navbarService.parseGlobalComponents(html);

      if (header) {
        if (headerComponent) {
          headerComponent.innerHTML = header.outerHTML;
        } else if (navbarContainer) {
          navbarContainer.innerHTML = '';
          navbarContainer.appendChild(header.cloneNode(true));
        }
      }

      if (footer) {
        if (footerComponent) {
          footerComponent.innerHTML = footer.outerHTML;
        } else if (footerContainer) {
          footerContainer.innerHTML = '';
          footerContainer.appendChild(footer.cloneNode(true));
        }
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
      const errorMessage = '<div class="error-loading">Failed to load navigation. Please try refreshing the page.</div>';
      
      if (headerComponent) headerComponent.innerHTML = errorMessage;
      if (navbarContainer) navbarContainer.innerHTML = errorMessage;
      if (footerComponent) footerComponent.innerHTML = errorMessage;
      if (footerContainer) footerContainer.innerHTML = errorMessage;
    });
});
