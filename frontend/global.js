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
      
      if (typeof languageManager !== 'undefined') {
        languageManager.changeLanguage(lang);
      } else {
        localStorage.setItem('language', lang);
        window.location.reload();
      }
    });
  });
  
  function updateCurrentLanguage(lang) {
    const flagSpan = currentLangButton.querySelector('.flag-icon');
    const textSpan = currentLangButton.querySelector('span:not(.flag-icon):not(.dropdown-arrow)');
    
    if (lang === 'en') {
      flagSpan.textContent = '🇬🇧';
      flagSpan.className = 'flag-icon flag-en';
      textSpan.textContent = 'EN';
    } else if (lang === 'ro') {
      flagSpan.textContent = '🇷🇴';
      flagSpan.className = 'flag-icon flag-ro';
      textSpan.textContent = 'RO';
    }
  }
}

function initHomePage() {
  setupLanguageDropdown();
}

document.addEventListener('DOMContentLoaded', initHomePage);