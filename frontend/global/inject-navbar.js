import { setupLanguageDropdown, setupMobileMenu, initSlideshow } from './global.js';

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
