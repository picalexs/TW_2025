class LanguageManager {
  constructor() {
    this.currentLanguage = localStorage.getItem('language') || 'en';
    this.translations = {};
    this.loadTranslation();
    
    this.languageChangedEvent = new CustomEvent('languageChanged');
    
    // Listen for component loading to update translations in newly loaded components
    document.addEventListener('componentsLoaded', () => {
      console.log('Components loaded, updating translations');
      this.updateContent();
    });
  }

  async loadTranslation() {
    try {
      let path;
      if (window.location.pathname.includes('/home/')) {
        path = `../languages/${this.currentLanguage}/home.json`;
      } else if (window.location.pathname.includes('/login/')) {
        path = `../languages/${this.currentLanguage}/home.json`;
      } else {
        path = `./languages/${this.currentLanguage}/home.json`;
      }
      
      console.log(`Loading translations from: ${path}`);
      const response = await fetch(path);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      this.translations = await response.json();
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
    
    // Update UI elements that show the current language
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