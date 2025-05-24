class NavbarService {
  constructor(options = {}) {
    this.debug = options.debug || false;
    this.globalComponentsPath = options.globalComponentsPath || '../global/global.html';
    this.cache = new Map();
    this.cacheEnabled = options.cache !== false;
    this.cacheExpiry = options.cacheExpiry || 5 * 60 * 1000; // 5 minutes default
  }

  async fetchGlobalComponents(bypassCache = false) {
    const cacheKey = this.globalComponentsPath;
    
    if (this.cacheEnabled && !bypassCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        if (this.debug) {
          console.log('Using cached global components');
        }
        return cached.data;
      }
    }
    
    try {
      if (this.debug) {
        console.log('Fetching global components from:', this.globalComponentsPath);
      }
      
      const response = await fetch(this.globalComponentsPath);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch global components: ${response.status} ${response.statusText}`);
      }
      
      const htmlContent = await response.text();
      
      // Store in cache if enabled
      if (this.cacheEnabled) {
        this.cache.set(cacheKey, {
          data: htmlContent,
          expiry: Date.now() + this.cacheExpiry
        });
      }
      
      return htmlContent;
    } catch (error) {
      console.error('Error fetching global components:', error);
      throw error;
    }
  }

  parseGlobalComponents(htmlContent) {
    if (!htmlContent) {
      throw new Error('HTML content is required for parsing');
    }
    
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;

      const result = {
        header: tempDiv.querySelector('header'),
        footer: tempDiv.querySelector('footer'),
        navigation: tempDiv.querySelector('nav')
      };
      
      if (!result.header && !result.footer) {
        console.warn('No header or footer found in global components');
      }
      
      return result;
    } catch (error) {
      console.error('Error parsing global components:', error);
      throw new Error(`Failed to parse global components: ${error.message}`);
    }
  }
  
  clearCache() {
    this.cache.clear();
    if (this.debug) {
      console.log('Component cache cleared');
    }
  }
  
  async loadAndInjectComponents(options = {}) {
    const {
      headerSelector = '#header-container',
      footerSelector = '#footer-container',
      bypassCache = false
    } = options;
    
    try {
      const htmlContent = await this.fetchGlobalComponents(bypassCache);
      const components = this.parseGlobalComponents(htmlContent);
      
      const injected = {};
      
      // Inject header if we have one and a target
      if (components.header && document.querySelector(headerSelector)) {
        document.querySelector(headerSelector).innerHTML = '';
        document.querySelector(headerSelector).appendChild(components.header);
        injected.header = components.header;
      }
      
      // Inject footer if we have one and a target
      if (components.footer && document.querySelector(footerSelector)) {
        document.querySelector(footerSelector).innerHTML = '';
        document.querySelector(footerSelector).appendChild(components.footer);
        injected.footer = components.footer;
      }
      
      return injected;
    } catch (error) {
      console.error('Failed to load and inject components:', error);
      throw error;
    }
  }
}

export default NavbarService;
