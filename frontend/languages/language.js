class LanguageManager {
  constructor() {
    this.currentLanguage = localStorage.getItem('language') || 'en';
    this.translations = {};
    this.loadTranslation();

    this.languageChangedEvent = new CustomEvent('languageChanged');
    
    document.addEventListener('componentsLoaded', () => {
      this.updateContent();
    });
  }

 async loadTranslation() {
  try {
    const page = window.location.pathname.split('/').pop().replace('.html', '');
    const basePath = window.location.pathname.includes('/home/') ? '../' : '../';
    
    const globalPath = `${basePath}languages/${this.currentLanguage}/global.json`;
    const pagePath = `${basePath}languages/${this.currentLanguage}/${page}.json`;

    console.log(`Loading translations from:\n  Global: ${globalPath}\n  Page: ${pagePath}`);
    const [globalRes, pageRes] = await Promise.all([
      fetch(globalPath),
      fetch(pagePath)
    ]);

    if (!globalRes.ok || !pageRes.ok) {
      throw new Error(`HTTP error! global: ${globalRes.status}, page: ${pageRes.status}`);
    }

    const globalTranslations = await globalRes.json();
    const pageTranslations = await pageRes.json();

    this.translations = { ...globalTranslations, ...pageTranslations };
    console.log('Translations loaded:', this.translations);

    this.updateContent();
    document.dispatchEvent(this.languageChangedEvent);
    return true;

  } catch (error) {
    console.error('Failed to load translations:', error);

    if (this.currentLanguage !== 'en') {
      this.currentLanguage = 'en';
      localStorage.setItem('language', 'en');
      this.loadTranslation();
    }
    return false;
  }
}


  translate(keyPath) {
    const keys = keyPath.split('.');
    let value = this.translations;

    for (const key of keys) {
      if (value && value[key] !== undefined) {
        value = value[key];
      } else {
        console.warn(`Translation not found for key: ${keyPath}`);
        return keyPath;
      }
    }

    return value;
  }
  
  async changeLanguage(language) {
    console.log(`Changing language to: ${language}`);
    if (this.currentLanguage === language) return;

    this.currentLanguage = language;
    localStorage.setItem('language', language);
    await this.loadTranslation();
    
    this.updateLanguageUI();
    console.log('Language changed and content updated');
  }

  updateContent() {
    console.log('Updating content with translations');
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translated = this.translate(key);
      element.textContent = translated;
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      element.placeholder = this.translate(key);
    });

    document.querySelectorAll('[data-i18n-value]').forEach(element => {
      const key = element.getAttribute('data-i18n-value');
      element.value = this.translate(key);
    });
  }
  
  updateLanguageUI() {
    const currentLang = this.currentLanguage;
    const currentLangButton = document.querySelector('.language-current');
    if (currentLangButton) {
      const flagSpan = currentLangButton.querySelector('.flag-icon');
      if (flagSpan) {
        if (currentLang === 'en') {
          flagSpan.textContent = '🇬🇧';
          flagSpan.className = 'flag-icon flag-en';
        } else if (currentLang === 'ro') {
          flagSpan.textContent = '🇷🇴';
          flagSpan.className = 'flag-icon flag-ro';
        }
      }
    }
    
    document.querySelectorAll('.language-option').forEach(option => {
      const lang = option.getAttribute('data-lang');
      if (lang === currentLang) {
        option.classList.add('active');
      } else {
        option.classList.remove('active');
      }
    });
    
    document.querySelectorAll('.mobile-language-option').forEach(option => {
      const lang = option.getAttribute('data-lang');
      if (lang === currentLang) {
        option.classList.add('active');
      } else {
        option.classList.remove('active');
      }
    });
  }
}

const languageManager = new LanguageManager();
window.languageManager = languageManager;

export default languageManager;