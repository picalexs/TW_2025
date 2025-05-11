class LanguageManager {
  constructor() {
    this.currentLanguage = localStorage.getItem('language') || 'en';
    this.translations = {};
    this.loadTranslation();
    
    // Create custom event for language changes
    this.languageChangedEvent = new CustomEvent('languageChanged');
  }

  async loadTranslation() {
    try {
      // Fix path to the translation files
      const response = await fetch(`../languages/${this.currentLanguage}/home.json`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      this.translations = await response.json();
      
      // Update the page content with the new language
      this.updateContent();
      
      // Dispatch event to notify other components
      document.dispatchEvent(this.languageChangedEvent);
      
      return true;
    } catch (error) {
      console.error('Failed to load translations:', error);
      
      // Fallback to English if translation file can't be loaded
      if (this.currentLanguage !== 'en') {
        this.currentLanguage = 'en';
        localStorage.setItem('language', 'en');
        this.loadTranslation();
      }
      
      return false;
    }
  }

  // Get a translated string by key path (e.g., "nav.home")
  translate(keyPath) {
    // Split the key path to navigate through the translations object
    const keys = keyPath.split('.');
    let value = this.translations;
    
    for (const key of keys) {
      if (value && value[key] !== undefined) {
        value = value[key];
      } else {
        console.warn(`Translation not found for key: ${keyPath}`);
        return keyPath; // Return the key if translation not found
      }
    }
    
    return value;
  }
  
  // Switch to a different language
  async changeLanguage(language) {
    if (this.currentLanguage === language) return;
    
    this.currentLanguage = language;
    localStorage.setItem('language', language);
    await this.loadTranslation();
  }
  
  // Update all elements with data-i18n attributes
  updateContent() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      element.textContent = this.translate(key);
    });
    
    // Update placeholders for input elements
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      element.placeholder = this.translate(key);
    });
    
    // Update button values
    document.querySelectorAll('[data-i18n-value]').forEach(element => {
      const key = element.getAttribute('data-i18n-value');
      element.value = this.translate(key);
    });
  }
}

// Initialize and export the language manager
const languageManager = new LanguageManager();
export default languageManager;