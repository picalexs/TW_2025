import languageManager from '../languages/language.js';

export let isLoggedIn = false;

function checkLoginStatusAndToggleNavButtons() {
    isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    console.log('User login status:', isLoggedIn);

    const authButtonsLoggedOut = document.getElementById('auth-buttons-logged-out');
    const authButtonsLoggedIn = document.getElementById('auth-buttons-logged-in'); // This div should exist and be hidden by default
    const mobileAuthLoggedOut = document.getElementById('mobile-auth-logged-out');
    const mobileAuthLoggedIn = document.getElementById('mobile-auth-logged-in'); // This div should exist and be hidden by default

    const logoutButton = document.querySelector('.nav-logout-btn');
    const mobileLogoutLink = document.querySelector('.mobile-nav-logout');

    if (isLoggedIn) {
        // Hide login/signup containers
        if (authButtonsLoggedOut) authButtonsLoggedOut.style.display = 'none';
        if (mobileAuthLoggedOut) mobileAuthLoggedOut.style.display = 'none';

        // Show logout containers
        if (authButtonsLoggedIn) authButtonsLoggedIn.style.display = 'flex';
        if (mobileAuthLoggedIn) mobileAuthLoggedIn.style.display = 'block';

        // Ensure logout button/link event listener is set up
        if (logoutButton && !logoutButton.dataset.listenerAttached) {
            logoutButton.addEventListener('click', handleLogout);
            logoutButton.dataset.listenerAttached = 'true';
        }
        if (mobileLogoutLink && !mobileLogoutLink.dataset.listenerAttached) {
            mobileLogoutLink.addEventListener('click', handleLogout);
            mobileLogoutLink.dataset.listenerAttached = 'true';
        }

    } else {
        // Show login/signup containers
        if (authButtonsLoggedOut) authButtonsLoggedOut.style.display = 'flex';
        if (mobileAuthLoggedOut) mobileAuthLoggedOut.style.display = 'block';

        // Hide logout containers
        if (authButtonsLoggedIn) authButtonsLoggedIn.style.display = 'none';
        if (mobileAuthLoggedIn) mobileAuthLoggedIn.style.display = 'none';
    }
}

function handleLogout(event) {
    event.preventDefault();
    localStorage.removeItem('isLoggedIn');
    // localStorage.removeItem('userData');
    isLoggedIn = false;
    console.log('User logged out. Updating UI and redirecting...');
    checkLoginStatusAndToggleNavButtons();
    window.location.href = '../home/home.html';
}

function setupLanguageDropdown() {
    const currentLangButton = document.querySelector('.language-current');
    const dropdownArrow = document.querySelector('.dropdown-arrow');
    const languageOptions = document.querySelectorAll('.language-option');

    if (!currentLangButton || !languageOptions.length) {
        console.warn('Language dropdown elements not found during setupLanguageDropdown');
        return;
    }

    console.log('Setting up language dropdown with options:', languageOptions.length);

    const currentLang = localStorage.getItem('language') || 'en';
    updateCurrentLanguage(currentLang);

    // Re-attach listeners to ensure they work after HTML injection
    languageOptions.forEach(option => {
        // It's safer to re-query the elements if they were re-injected
        // or ensure you only clone if you truly need new DOM elements
        const lang = option.getAttribute('data-lang');
        // Remove existing listeners if any (important if this is called multiple times)
        const oldOption = option; // Keep a reference to the current element
        const newOption = oldOption.cloneNode(true); // Clone to remove existing listeners
        oldOption.parentNode.replaceChild(newOption, oldOption); // Replace the old element

        if (lang === currentLang) {
            newOption.classList.add('active');
        }

        newOption.addEventListener('click', (e) => {
            e.preventDefault();
            console.log(`Language option clicked: ${lang}`);

            updateCurrentLanguage(lang);

            document.querySelectorAll('.language-option').forEach(opt => {
                opt.classList.remove('active');
            });
            newOption.classList.add('active');

            if (languageManager) {
                languageManager.changeLanguage(lang);
            } else {
                console.warn('languageManager not found, falling back to localStorage');
                localStorage.setItem('language', lang);
                window.location.reload();
            }
        });
    });

    function updateCurrentLanguage(lang) {
        const flagSpan = currentLangButton.querySelector('.flag-icon');
        const textSpan = currentLangButton.querySelector('span:not(.flag-icon):not(.dropdown-arrow)');

        console.log(`Updating language UI to ${lang}`);

        if (!flagSpan || !textSpan) return;

        if (lang === 'en') {
            flagSpan.textContent = '🇬🇧';
            textSpan.textContent = 'EN';
        } else if (lang === 'ro') {
            flagSpan.textContent = '🇷🇴';
            textSpan.textContent = 'RO';
        }
    }
}


function setupMobileMenu() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const container = document.querySelector('.mobile-menu-container');
    const overlay = document.querySelector('.mobile-overlay');
    const options = document.querySelectorAll('.mobile-language-option');

    if (!toggle || !container || !overlay) {
        console.error("Mobile menu elements not found during setupMobileMenu!");
        return;
    }

    const currentLang = localStorage.getItem('language') || 'en';
    setActiveMobileLanguage(currentLang);

    // Ensure listeners are only attached once for toggle and overlay
    if (!toggle.dataset.listenerAttached) {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('Mobile menu toggle clicked!');
            toggle.classList.toggle('active');
            container.classList.toggle('active');
            overlay.classList.toggle('active');
            document.body.style.overflow = container.classList.contains('active') ? 'hidden' : '';
        });
        toggle.dataset.listenerAttached = 'true';
    }

    if (!overlay.dataset.listenerAttached) {
        overlay.addEventListener('click', () => {
            console.log('Overlay clicked - closing menu');
            toggle.classList.remove('active');
            container.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
        overlay.dataset.listenerAttached = 'true';
    }


    options.forEach(option => {
        // Similar to language dropdown, re-attach listeners if elements are re-injected
        const oldOption = option;
        const newOption = oldOption.cloneNode(true);
        oldOption.parentNode.replaceChild(newOption, oldOption);

        const lang = newOption.getAttribute('data-lang');
        if (lang === currentLang) {
            newOption.classList.add('active');
        }

        newOption.addEventListener('click', (e) => {
            e.preventDefault();
            setActiveMobileLanguage(lang);

            if (languageManager) {
                languageManager.changeLanguage(lang);
            } else {
                localStorage.setItem('language', lang);
                window.location.reload();
            }

            toggle.classList.remove('active');
            container.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    function setActiveMobileLanguage(lang) {
        document.querySelectorAll('.mobile-language-option').forEach(opt => opt.classList.remove('active'));
        const activeOption = document.querySelector(`.mobile-language-option[data-lang="${lang}"]`);
        if (activeOption) {
            activeOption.classList.add('active');
            console.log(`Active mobile language set to: ${lang}`);
        } else {
            console.warn(`No mobile language option found for: ${lang}`);
        }
    }
}

function createSlideshow(options = {}) {
    const defaults = {
        containerSelector: '.hero-slideshow, .login-slideshow',
        slideClass: 'hero-slide',
        images: [
            '../assets/hero-bg.jpg',
            '../assets/hero-bg1.jpg',
            '../assets/hero-bg2.jpg',
            '../assets/hero-bg3.jpg',
            '../assets/hero-bg4.jpg',
            '../assets/hero-bg5.jpg',
            '../assets/hero-bg6.jpg',
            '../assets/hero-bg7.jpg'
        ],
        interval: 5000,
        overlay: 'rgba(0, 0, 0, 0.5)'
    };

    const settings = { ...defaults, ...options };

    const slideshowContainers = document.querySelectorAll(settings.containerSelector);
    if (!slideshowContainers.length) {
        console.warn(`No slideshow containers found with selector: ${settings.containerSelector}`);
        return;
    }

    slideshowContainers.forEach(container => {
        console.log(`Setting up slideshow for container:`, container);

        Array.from(container.children).forEach(child => {
            if (child.classList.contains(settings.slideClass)) {
                child.remove();
            }
        });

        if (settings.images.length > 0) {
            const defaultSlide = document.createElement('div');
            defaultSlide.className = settings.slideClass + ' active';
            defaultSlide.style.backgroundImage = `linear-gradient(${settings.overlay}, ${settings.overlay}), url('${settings.images[0]}')`;
            container.appendChild(defaultSlide);
        }

        settings.images.slice(1).forEach((imageUrl) => {
            const img = new Image();
            img.src = imageUrl;

            img.onload = () => {
                const slide = document.createElement('div');
                slide.className = settings.slideClass;
                slide.style.backgroundImage = `linear-gradient(${settings.overlay}, ${settings.overlay}), url('${imageUrl}')`;
                container.appendChild(slide);
            };
            img.onerror = () => {
                console.warn(`Could not load slide image: ${imageUrl}`);
            };
        });

        let currentSlide = 0;
        const rotateSlides = () => {
            const slides = container.querySelectorAll(`.${settings.slideClass}`);
            if (slides.length <= 1) return;

            slides.forEach(slide => slide.classList.remove('active'));
            currentSlide = (currentSlide + 1) % slides.length;
            slides[currentSlide].classList.add('active');
        };

        if (container.slideshowIntervalId) {
            clearInterval(container.slideshowIntervalId);
        }
        container.slideshowIntervalId = setInterval(rotateSlides, settings.interval);
    });
}

function initSlideshow(options = {}) {
    console.log('Initializing slideshow with options:', options);
    const slideshowContainer = document.querySelector(options.containerSelector || '.hero-slideshow');

    if (!slideshowContainer) {
        console.warn('No slideshow container found with selector:', options.containerSelector || '.hero-slideshow');
        return;
    }

    createSlideshow({
        containerSelector: options.containerSelector || '.hero-slideshow',
        slideClass: 'hero-slide',
        images: [
            '../assets/hero-bg.jpg',
            '../assets/hero-bg2.jpg',
            '../assets/hero-bg3.jpg',
            '../assets/hero-bg4.jpg',
            '../assets/hero-bg5.jpg',
            '../assets/hero-bg6.jpg',
            '../assets/hero-bg7.jpg',
            '../assets/hero-bg8.jpg'
        ],
        interval: 5000,
        overlay: 'rgba(0, 0, 0, 0.5)'
    });
}


function initializePageLanguage() {
    if (document.body.classList.contains('language-initialized')) {
        return;
    }
    document.body.classList.add('language-initialized');

    const currentPath = window.location.pathname;
    const pageName = currentPath.split('/').pop().replace('.html', '');
    console.log(`Initializing language for page: ${pageName}`);

    if (languageManager) {
        languageManager.updateContent();
    } else {
        console.warn('Language manager not available');
    }
}

function initBasicFunctionality() {
    console.log("Initializing basic functionality (language, menu, slideshow, login status)");
    setupLanguageDropdown();
    setupMobileMenu();
    initSlideshow();
    checkLoginStatusAndToggleNavButtons();

    if (window.languageManager) {
        window.languageManager.updateContent();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('global.min.js: DOMContentLoaded fired.');
    const navbarContainer = document.getElementById('global-navbar');
    const footerContainer = document.getElementById('global-footer');

    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('/login/');
    const isSignupPage = currentPath.includes('/signup/');

    if (isLoginPage) {
        document.body.setAttribute('data-page', 'loginPage');
    } else if (isSignupPage) {
        document.body.setAttribute('data-page', 'signupPage');
    }

    if (navbarContainer || footerContainer) {
      console.log('global.min.js: Attempting to fetch global.html...');
        fetch('../global/global.html')
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Failed to load global.html: ${res.status} ${res.statusText}`);
                }
                return res.text();
            })
            .then(html => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;

                const header = tempDiv.querySelector('header');
                const footer = tempDiv.querySelector('footer');

                if (header && navbarContainer) {
                    navbarContainer.innerHTML = '';
                    navbarContainer.appendChild(header);
                }

                if (footer && footerContainer) {
                    footerContainer.innerHTML = '';
                    footerContainer.appendChild(footer);
                }
                initBasicFunctionality();
            })
            .catch(err => {
                console.error('Error fetching or injecting global components:', err);
                const errorMessage = '<div class="error-loading" style="color: red; text-align: center; padding: 20px;">Failed to load navigation. Please try refreshing the page.</div>';
                if (navbarContainer) navbarContainer.innerHTML = errorMessage;
                if (footerContainer) footerContainer.innerHTML = errorMessage;
            });
    } else {
        initBasicFunctionality();
    }
});

export function navigateToProfile(userId) {
  if (!userId) {
    console.error('No user ID provided for profile navigation');
    return;
  }
  
  const currentPath = window.location.pathname;
  let profilePath;
  
  if (currentPath.includes('/profile/')) {
    profilePath = `profile.html?id=${userId}`;
  } else if (currentPath.includes('/home/') || currentPath.includes('/pets/') || currentPath.includes('/login/') || currentPath.includes('/signup/')) {
    profilePath = `../profile/profile.html?id=${userId}`;
  } else {
    profilePath = `profile/profile.html?id=${userId}`;
  }
  
  window.location.href = profilePath;
}

export { setupLanguageDropdown, setupMobileMenu, initSlideshow, createSlideshow, initializePageLanguage, checkLoginStatusAndToggleNavButtons };