window.APP_CONFIG = {
  api: {
    baseURL: window.APP_CONFIG?.api?.baseURL || (window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port : '')),
    
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

async function loadConfig() {
  try {
    const response = await fetch(`${window.APP_CONFIG.api.baseURL}/api/config`);
    if (response.ok) {
      const config = await response.json();
      window.APP_CONFIG.api.baseURL = `http://${config.apiHost}:${config.apiPort}`;
      console.log('Dynamic config loaded:', window.APP_CONFIG.api.baseURL);
    }
  } catch (error) {
    console.warn('Could not load dynamic config, using defaults:', error.message);
  }
}

loadConfig();
