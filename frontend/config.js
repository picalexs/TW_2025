// Global configuration for the application
window.APP_CONFIG = {
  api: {
    baseURL: 'http://localhost:8080',
    
    timeouts: {
      default: 10000,
      upload: 60000
    },
    
    retry: {
      maxRetries: 2,
      initialDelay: 1000
    }
  },
  
  features: {
    enableDebugLogging: true,
    enableErrorReporting: true,
    enableAnalytics: false
  }
};

console.log('Application configuration loaded:', window.APP_CONFIG);
