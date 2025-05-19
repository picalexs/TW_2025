import languageManager from '../languages/language.js';

function setupLanguageDropdown() {
  const currentLangButton = document.querySelector('.language-current');
  const dropdownArrow = document.querySelector('.dropdown-arrow');
  const languageOptions = document.querySelectorAll('.language-option');

  const currentLang = localStorage.getItem('language') || 'en';
  updateCurrentLanguage(currentLang);

  languageOptions.forEach(option => {
    const lang = option.getAttribute('data-lang');

    if (lang === currentLang) {
      option.classList.add('active');
    }

    option.addEventListener('click', (e) => {
      e.preventDefault();
      updateCurrentLanguage(lang);
      languageOptions.forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');

      if (languageManager) {
        languageManager.changeLanguage(lang);
      }
    });
  });

  function updateCurrentLanguage(lang) {
    const flagSpan = currentLangButton?.querySelector('.flag-icon');
    const textSpan = currentLangButton?.querySelector('span:not(.flag-icon):not(.dropdown-arrow)');

    if (!flagSpan || !textSpan) return;

    if (lang === 'en') {
      flagSpan.textContent = '🇬🇧';
      textSpan.textContent = 'EN';
    } else if (lang === 'ro') {
      flagSpan.textContent = '🇷🇴';
      textSpan.textContent = 'RO';
    }
  }
}

function setupMobileMenu() {
  const toggle = document.querySelector('.mobile-menu-toggle');
  const container = document.querySelector('.mobile-menu-container');
  const overlay = document.querySelector('.mobile-overlay');
  const options = document.querySelectorAll('.mobile-language-option');

  const currentLang = localStorage.getItem('language') || 'en';

  toggle?.addEventListener('click', () => {
    toggle.classList.toggle('active');
    container?.classList.toggle('active');
    overlay?.classList.toggle('active');
    document.body.style.overflow = container?.classList.contains('active') ? 'hidden' : '';
  });

  overlay?.addEventListener('click', () => {
    toggle?.classList.remove('active');
    container?.classList.remove('active');
    overlay?.classList.remove('active');
    document.body.style.overflow = '';
  });

  options.forEach(option => {
    const lang = option.getAttribute('data-lang');
    if (lang === currentLang) {
      option.classList.add('active');
    }

    option.addEventListener('click', (e) => {
      e.preventDefault();
      options.forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');

      if (languageManager) {
        languageManager.changeLanguage(lang);
      }

      toggle?.classList.remove('active');
      container?.classList.remove('active');
      overlay?.classList.remove('active');
      document.body.style.overflow = '';
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const navbarContainer = document.getElementById('global-navbar');
  const footerContainer = document.getElementById('global-footer');

  fetch('../global/global.html')
    .then(res => res.text())
    .then(html => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      const header = tempDiv.querySelector('header');
      const footer = tempDiv.querySelector('footer');

      if (header && navbarContainer) {
        navbarContainer.appendChild(header);
        setupLanguageDropdown();
        setupMobileMenu();
      }

      if (footer && footerContainer) {
        footerContainer.appendChild(footer);
      }

      languageManager.updateContent();
    })
    .catch(err => console.error('Eroare la încărcarea header/footer:', err));
});
