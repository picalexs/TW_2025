import { setupLanguageDropdown, setupMobileMenu, initSlideshow } from './global.min.js';
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
  
  function replaceSkeletonWithContent(container, newContent, isHeader = true) {
    const skeleton = container.querySelector('.navbar-skeleton');
    
    if (skeleton && newContent) {
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = newContent;
      const actualContent = tempContainer.firstElementChild;
      
      if (actualContent) {
        actualContent.style.opacity = '0';
        actualContent.style.transition = 'opacity 0.3s ease-in-out';
        
        container.insertBefore(actualContent, skeleton);
        
        actualContent.offsetHeight;
        
        requestAnimationFrame(() => {
          actualContent.style.opacity = '1';
          
          setTimeout(() => {
            if (skeleton.parentNode) {
              skeleton.remove();
            }
          }, 300);
        });
      } else {
        skeleton.remove();
        container.appendChild(tempContainer.firstElementChild || tempContainer);
      }
    } else if (newContent) {
      container.innerHTML = newContent;
    }
  }
  
  navbarService.fetchGlobalComponents()
    .then(html => {
      const { header, footer } = navbarService.parseGlobalComponents(html);

      if (header) {
        if (headerComponent) {
          replaceSkeletonWithContent(headerComponent, header.outerHTML, true);
        } else if (navbarContainer) {
          replaceSkeletonWithContent(navbarContainer, header.outerHTML, true);
        }
      }

      if (footer) {
        if (footerComponent) {
          replaceSkeletonWithContent(footerComponent, footer.outerHTML, false);
        } else if (footerContainer) {
          replaceSkeletonWithContent(footerContainer, footer.outerHTML, false);
        }
      }

      requestAnimationFrame(() => {
        setupLanguageDropdown();
        setupMobileMenu();
        checkLoginStatusAndToggleNavButtons();
        
        document.dispatchEvent(new CustomEvent('componentsLoaded'));
        
        if (window.languageManager) {
          window.languageManager.updateContent();
        }
      });
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
