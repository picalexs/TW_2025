class ResourcePreloader {
  constructor() {
    this.preloadedResources = new Set();
    this.criticalFonts = [];
    this.criticalImages = [      
      '/assets/default-pet-profile.webp',
      '/assets/default-user-profile.webp'
    ];
  }

  preloadCriticalResources() {
    this.criticalImages.forEach(src => {
      this.preloadImage(src);
    });

    this.prefetchCriticalData();
  }

  preloadImage(src) {
    if (this.preloadedResources.has(src)) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
    
    this.preloadedResources.add(src);
  }

 preloadScript(src, isModule = false) {
    if (this.preloadedResources.has(src)) return;

    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = src;
    document.head.appendChild(link);
    
    this.preloadedResources.add(src);
  }
  
  prefetchNavigation() {
    const navLinks = [
      '/frontend/pets/pets-page/pets-page.html',
      '/frontend/login/login.html',
      '/frontend/signup/signup.html'
    ];

    navLinks.forEach(href => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = href;
      document.head.appendChild(link);
    });
  }

  
  prefetchCriticalData() {
    // Only prefetch on pages that need it
    const currentPage = window.location.pathname;
    
    if (currentPage.includes('home') || currentPage.includes('index')) {
      this.prefetchAPI('/api/pets/featured');
      this.prefetchAPI('/api/testimonials');
    }
  }

  prefetchAPI(endpoint) {
    const baseURL = window.APP_CONFIG?.api?.baseURL || 'http://localhost:8080';
    
    fetch(baseURL + endpoint, {
      method: 'GET',
      headers: { 'Cache-Control': 'max-age=300' }
    }).catch(() => {
      // Silently fail - this is just prefetching
    });
  }

  loadNonCriticalResources() {
    requestIdleCallback(() => {
      this.prefetchNavigation();
    });
  }

  init() {
    this.preloadCriticalResources();

    if (document.readyState === 'complete') {
      this.loadNonCriticalResources();
    } else {
      window.addEventListener('load', () => {
        this.loadNonCriticalResources();
      });
    }
  }
}

if (typeof window !== 'undefined') {
  window.ResourcePreloader = ResourcePreloader;
  
  const preloader = new ResourcePreloader();
  preloader.init();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResourcePreloader;
}
