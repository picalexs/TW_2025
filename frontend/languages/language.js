class LanguageManager {
  constructor() {
    this.currentLanguage = localStorage.getItem('language') || 'en';
    this.translations = {};
    this.fallbackTranslations = {};
    this.loadTranslation();

    this.languageChangedEvent = new CustomEvent('languageChanged');
    
    document.addEventListener('componentsLoaded', () => {
      this.updateContent();
    });
  }

  async loadTranslation() {    
    try {
      const page = window.location.pathname.split('/').pop().replace('.html', '');
      const translationPage = page;
      
      const basePath = '/';
      
      const globalPath = `${basePath}languages/${this.currentLanguage}/global.json`;
      const pagePath = `${basePath}languages/${this.currentLanguage}/${translationPage}.json`;
      const fallbackGlobalPath = `${basePath}languages/en/global.json`;
      const fallbackPagePath = `${basePath}languages/en/${translationPage}.json`;

      console.log(`Loading translations from:\n  Global: ${globalPath}\n  Page: ${pagePath}`);
      
      const [globalRes, pageRes, fallbackGlobalRes, fallbackPageRes] = await Promise.all([
        fetch(globalPath).catch(() => ({ ok: false })),
        fetch(pagePath).catch(() => ({ ok: false })),
        fetch(fallbackGlobalPath).catch(() => ({ ok: false })),
        fetch(fallbackPagePath).catch(() => ({ ok: false }))
      ]);

      let fallbackGlobalTranslations = {};
      let fallbackPageTranslations = {};
      
      if (fallbackGlobalRes.ok) {
        fallbackGlobalTranslations = await fallbackGlobalRes.json();
      }
      
      if (fallbackPageRes.ok) {
        fallbackPageTranslations = await fallbackPageRes.json();
      }
      
      this.fallbackTranslations = { ...fallbackGlobalTranslations, ...fallbackPageTranslations };
      let globalTranslations = {};
      let pageTranslations = {};
      
      if (globalRes.ok) {
        globalTranslations = await globalRes.json();
      } else if (this.currentLanguage !== 'en') {
        console.warn(`Could not load global translations for ${this.currentLanguage}, using fallbacks`);
      }
      
      if (pageRes.ok) {
        pageTranslations = await pageRes.json();
      } else if (this.currentLanguage !== 'en') {
        console.warn(`Could not load page translations for ${translationPage} in ${this.currentLanguage}, using fallbacks`);
      }

      this.translations = { ...globalTranslations, ...pageTranslations };

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

  translate(keyPath, fallback) {
    const keys = keyPath.split('.');
    let value = this.translations;

    for (const key of keys) {
      if (value && value[key] !== undefined) {
        value = value[key];
      } else {
        let fallbackValue = this.fallbackTranslations;
        let foundInFallback = true;
        
        for (const fallbackKey of keys) {
          if (fallbackValue && fallbackValue[fallbackKey] !== undefined) {
            fallbackValue = fallbackValue[fallbackKey];
          } else {
            foundInFallback = false;
            break;
          }
        }
        
        if (foundInFallback) {
          return fallbackValue;
        }
        
        if (fallback !== undefined) {
          return fallback;
        }
        
        console.warn(`Translation not found for key: ${keyPath}`);
        return keyPath;
      }    
    }

    if (typeof value === 'object' && value !== null) {
      console.warn(`Translation for key '${keyPath}' returned an object, using fallback`);
      return fallback !== undefined ? fallback : keyPath;
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
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const fallback = element.getAttribute('data-i18n-fallback') || element.textContent || key;
      const translated = this.translate(key, fallback);
      element.textContent = translated;
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      const fallback = element.getAttribute('data-i18n-placeholder-fallback') || element.placeholder || key;
      element.placeholder = this.translate(key, fallback);
    });

    document.querySelectorAll('[data-i18n-value]').forEach(element => {
      const key = element.getAttribute('data-i18n-value');
      const fallback = element.getAttribute('data-i18n-value-fallback') || element.value || key;
      element.value = this.translate(key, fallback);
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