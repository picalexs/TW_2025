export class ComponentLoader {
  constructor() {
    this.componentCache = new Map();
    this.authState = this.getAuthState();
  }

  getAuthState() {
    // Check if user is logged in
    // This is a placeholder - replace with actual auth check
    return {
      loggedIn: localStorage.getItem('user') !== null,
      user: JSON.parse(localStorage.getItem('user') || 'null')
    };
  }

  async loadAllComponents() {
    const componentElements = document.querySelectorAll('[data-component]');
    const loadPromises = Array.from(componentElements).map(element => 
      this.loadComponent(element)
    );
    
    return Promise.all(loadPromises);
  }


  async loadComponent(element) {
    try {
      const componentName = element.getAttribute('data-component');
      const componentOptions = {
        noAuth: element.hasAttribute('data-component-no-auth')
      };
      
      const componentPath = `/frontend/components/${componentName}.html`;
      let html = this.componentCache.get(componentPath);
      
      // If not in cache, fetch it
      if (!html) {
        const response = await fetch(componentPath);
        if (!response.ok) {
          throw new Error(`Failed to load component: ${componentName}`);
        }
        html = await response.text();
        this.componentCache.set(componentPath, html);
      }
      
      element.innerHTML = html;
      this.processConditionalElements(element);
      this.initializeComponentScripts(element);
      return true;

    } catch (error) {
      console.error(`Error loading component:`, error);
      element.innerHTML = `<div class="component-error">Error loading component</div>`;
      return false;
    }
  }


  processConditionalElements(rootElement) {
    const authHideElements = rootElement.querySelectorAll('[data-component-auth-hide]');
    
    authHideElements.forEach(element => {
      const hideCondition = element.getAttribute('data-component-auth-hide');
      
      if (hideCondition === 'loggedIn' && this.authState.loggedIn) {
        element.style.display = 'none';
      }
      
      if (hideCondition === 'loggedOut' && !this.authState.loggedIn) {
        element.style.display = 'none';
      }
    });
    
    const authShowElements = rootElement.querySelectorAll('[data-component-auth-show]');
    
    authShowElements.forEach(element => {
      const showCondition = element.getAttribute('data-component-auth-show');
      
      if (showCondition === 'loggedIn' && !this.authState.loggedIn) {
        element.style.display = 'none';
      }
      if (showCondition === 'loggedOut' && this.authState.loggedIn) {
        element.style.display = 'none';
      }
    });
  }

  /**
   * Run any scripts that came with the component
   */
  initializeComponentScripts(element) {
    const scripts = element.querySelectorAll('script');
    scripts.forEach(oldScript => {
      const newScript = document.createElement('script');
      
      Array.from(oldScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });
      
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const componentLoader = new ComponentLoader();
  await componentLoader.loadAllComponents();
  
  // If language manager is available, update content after components are loaded
  if (window.languageManager) {
    window.languageManager.updateContent();
  }
});


document.addEventListener('DOMContentLoaded', () => {
  loadComponents().then(() => {
    console.log('All components loaded successfully');
    // Dispatch event that components are loaded - this will trigger language updates
    document.dispatchEvent(new CustomEvent('componentsLoaded'));
  }).catch(error => {
    console.error('Error loading components:', error);
  });
});

async function loadComponents() {
  const componentElements = document.querySelectorAll('[data-component]');
  if (!componentElements.length) {
    console.log('No components found to load');
    return;
  }
  
  console.log(`Found ${componentElements.length} components to load`);
  
  const loadPromises = Array.from(componentElements).map(async element => {
    const componentName = element.getAttribute('data-component');
    if (!componentName) {
      console.warn('Component element missing component name');
      return;
    }
    
    try {
      const componentPath = `/frontend/components/${componentName}.html`;
      console.log(`Loading component: ${componentName} from ${componentPath}`);
      
      const response = await fetch(componentPath);
      if (!response.ok) {
        throw new Error(`Failed to load component ${componentName}: ${response.status} ${response.statusText}`);
      }
      
      const html = await response.text();
      element.innerHTML = html;
      
      // Process any inline scripts in the component
      const scripts = element.querySelectorAll('script');
      scripts.forEach(script => {
        const newScript = document.createElement('script');
        if (script.src) {
          newScript.src = script.src;
        } else {
          newScript.textContent = script.textContent;
        }
        script.parentNode.replaceChild(newScript, script);
      });
      
      console.log(`Component ${componentName} loaded successfully`);
    } catch (error) {
      console.error(`Error loading component ${componentName}:`, error);
      element.innerHTML = `<div class="error">Failed to load ${componentName} component</div>`;
      throw error;
    }
  });
  
  await Promise.all(loadPromises);
}

export default ComponentLoader;
