class Carousel {
    constructor(config) {
        this.containerSelector = config.containerSelector;
        this.trackSelector = config.trackSelector;
        this.slideSelector = config.slideSelector;

        this.arrowsConfig = {
            enabled: config.arrows?.enabled !== false,
            prevSelector: config.arrows?.prevSelector || '.carousel-prev',
            nextSelector: config.arrows?.nextSelector || '.carousel-next',
            hideOnSingleSlide: config.arrows?.hideOnSingleSlide !== false
        };

        this.indicatorsConfig = {
            enabled: config.indicators?.enabled !== false,
            containerSelector: config.indicators?.containerSelector || '.carousel-indicators',
            hideOnSingleSlide: config.indicators?.hideOnSingleSlide !== false
        };

        this.touchConfig = {
            enabled: config.touch?.enabled !== false,
            threshold: config.touch?.threshold || 50,
            preventVerticalScroll: config.touch?.preventVerticalScroll !== false
        };

        this.keyboardConfig = {
            enabled: config.keyboard?.enabled !== false,
            keys: config.keyboard?.keys || ['ArrowLeft', 'ArrowRight', 'Home', 'End']
        };

        this.responsive = config.responsive || {
            768: { disabled: false },
            1024: { disabled: false },
            default: { disabled: false }
        };

        this.animationConfig = {
            duration: config.animation?.duration || 400,
            easing: config.animation?.easing || 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            gapCalculation: config.animation?.gapCalculation || 'percentage'
        };

        this.onSlideChange = config.onSlideChange || null;
        this.onInit = config.onInit || null;
        this.onDestroy = config.onDestroy || null;

        this.currentSlide = 0;
        this.totalSlides = 0;
        this.isInitialized = false;
        this.isDisabled = false;

        this.container = null;
        this.track = null;
        this.slides = [];
        this.prevBtn = null;
        this.nextBtn = null;
        this.indicators = [];

        this.isDragging = false;
        this.startX = 0;
        this.currentX = 0;
        this.touchStartX = 0;
        this.touchEndX = 0;

        this.boundHandleTouchStart = this.handleTouchStart.bind(this);
        this.boundHandleTouchMove = this.handleTouchMove.bind(this);
        this.boundHandleTouchEnd = this.handleTouchEnd.bind(this);
        this.boundHandleMouseDown = this.handleMouseDown.bind(this);
        this.boundHandleMouseMove = this.handleMouseMove.bind(this);
        this.boundHandleMouseUp = this.handleMouseUp.bind(this);
        this.boundHandleKeydown = this.handleKeydown.bind(this);
        this.boundHandleResize = this.debounce(this.handleResize.bind(this), 250);

        this.init();
    }

    init() {
        this.container = document.querySelector(this.containerSelector);

        if (!this.container) {
            console.warn(`Carousel: Container '${this.containerSelector}' not found`);
            return;
        }

        this.track = this.container.querySelector(this.trackSelector);

        if (!this.track) {
            console.warn(`Carousel: Track '${this.trackSelector}' not found`);
            return;
        }

        this.updateSlides();
        this.checkResponsiveState();

        if (this.isDisabled) {
            return;
        }

        this.initNavigation();
        this.initEventListeners();
        this.updateCarousel();

        this.isInitialized = true;

        if (this.onInit) {
            this.onInit(this);
        }
    }

    updateSlides() {
        this.slides = Array.from(this.container.querySelectorAll(this.slideSelector));
        this.totalSlides = this.slides.length;
        this.container.setAttribute('data-total-slides', this.totalSlides);
    }

    checkResponsiveState() {
        const width = window.innerWidth;
        let shouldDisable = false;

        const breakpoints = Object.keys(this.responsive)
            .filter(key => key !== 'default')
            .map(Number)
            .sort((a, b) => b - a);

        for (const breakpoint of breakpoints) {
            if (width <= breakpoint) {
                shouldDisable = this.responsive[breakpoint].disabled === true;
                break;
            }
        }

        if (!breakpoints.find(bp => width <= bp)) {
            shouldDisable = this.responsive.default?.disabled === true;
        }

        if (this.totalSlides <= 1) {
            shouldDisable = true;
        }

        this.isDisabled = shouldDisable;

        if (shouldDisable) {
            this.hideNavigation();
        } else {
            this.showNavigation();
        }
    }

    initNavigation() {
        if (this.arrowsConfig.enabled) {
            this.prevBtn = this.container.querySelector(this.arrowsConfig.prevSelector);
            this.nextBtn = this.container.querySelector(this.arrowsConfig.nextSelector);

            if (this.prevBtn) {
                this.prevBtn.addEventListener('click', () => this.goToSlide(this.currentSlide - 1));
            }
            if (this.nextBtn) {
                this.nextBtn.addEventListener('click', () => this.goToSlide(this.currentSlide + 1));
            }
        }

        if (this.indicatorsConfig.enabled) {
            const indicatorsContainer = this.container.querySelector(this.indicatorsConfig.containerSelector);

            if (indicatorsContainer) {
                this.indicators = Array.from(indicatorsContainer.querySelectorAll('.carousel-indicator'));
                this.indicators.forEach((indicator, index) => {
                    indicator.addEventListener('click', () => this.goToSlide(index));
                });
            }
        }
    }

    initEventListeners() {
        if (this.touchConfig.enabled) {
            this.container.addEventListener('touchstart', this.boundHandleTouchStart, { passive: true });
            this.container.addEventListener('touchmove', this.boundHandleTouchMove, { passive: false });
            this.container.addEventListener('touchend', this.boundHandleTouchEnd, { passive: true });
        }

        this.container.addEventListener('mousedown', this.boundHandleMouseDown);
        this.container.addEventListener('mousemove', this.boundHandleMouseMove);
        this.container.addEventListener('mouseup', this.boundHandleMouseUp);
        this.container.addEventListener('mouseleave', this.boundHandleMouseUp);

        if (this.keyboardConfig.enabled) {
            this.container.addEventListener('keydown', this.boundHandleKeydown);
            this.container.setAttribute('tabindex', '0');
        }

        window.addEventListener('resize', this.boundHandleResize);
    }

    goToSlide(slideIndex) {
        if (this.isDisabled) return;

        const previousSlide = this.currentSlide;

        if (slideIndex < 0) {
            this.currentSlide = this.totalSlides - 1;
        } else if (slideIndex >= this.totalSlides) {
            this.currentSlide = 0;
        } else {
            this.currentSlide = slideIndex;
        }

        this.updateCarousel();

        if (this.onSlideChange && previousSlide !== this.currentSlide) {
            this.onSlideChange(this.currentSlide, previousSlide, this);
        }
    }

    updateCarousel() {
        if (!this.track || this.isDisabled) return;

        let translateX;

        if (this.animationConfig.gapCalculation === 'percentage') {
            const isMobile = window.innerWidth <= 768 && this.containerSelector === '.testimonials-carousel';
            const gapInPercent = isMobile ? 0 : this.calculateGapAsPercentage();
            translateX = -this.currentSlide * (100 + gapInPercent);
        } else {
            translateX = -this.currentSlide * 100;
        }

        this.track.style.transform = `translateX(${translateX}%)`;
        this.track.style.transition = `transform ${this.animationConfig.duration}ms ${this.animationConfig.easing}`;

        this.updateIndicators();
        this.updateArrows();
    }

    updateIndicators() {
        if (!this.indicatorsConfig.enabled || this.isDisabled) return;

        this.indicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index === this.currentSlide);
        });
    }

    updateArrows() {
        if (!this.arrowsConfig.enabled || this.isDisabled) return;

        if (this.prevBtn) {
            this.prevBtn.disabled = false;
        }
        if (this.nextBtn) {
            this.nextBtn.disabled = false;
        }
    }

    calculateGapAsPercentage() {
        if (!this.track) return 0;

        const trackStyle = window.getComputedStyle(this.track);
        const gap = parseFloat(trackStyle.gap) || 0;
        const trackWidth = this.track.offsetWidth;

        return gap > 0 && trackWidth > 0 ? (gap / trackWidth) * 100 : 0;
    }

    hideNavigation() {
        if (this.arrowsConfig.enabled && this.arrowsConfig.hideOnSingleSlide) {
            if (this.prevBtn) this.prevBtn.style.display = 'none';
            if (this.nextBtn) this.nextBtn.style.display = 'none';
        }

        if (this.indicatorsConfig.enabled && this.indicatorsConfig.hideOnSingleSlide) {
            const indicatorsContainer = this.container.querySelector(this.indicatorsConfig.containerSelector);
            if (indicatorsContainer) {
                indicatorsContainer.style.display = 'none';
            }
        }
    }

    showNavigation() {
        if (this.arrowsConfig.enabled) {
            if (this.prevBtn) this.prevBtn.style.display = '';
            if (this.nextBtn) this.nextBtn.style.display = '';
        }

        if (this.indicatorsConfig.enabled) {
            const indicatorsContainer = this.container.querySelector(this.indicatorsConfig.containerSelector);
            if (indicatorsContainer) {
                indicatorsContainer.style.display = '';
            }
        }
    }

    handleTouchStart(e) {
        if (this.isDisabled) return;
        this.touchStartX = e.touches[0].clientX;
        this.isDragging = true;
    }

    handleTouchMove(e) {
        if (!this.isDragging || this.isDisabled) return;
        if (this.touchConfig.preventVerticalScroll) {
            e.preventDefault();
        }
        this.touchEndX = e.touches[0].clientX;
    }

    handleTouchEnd(e) {
        if (!this.isDragging || this.isDisabled) return;
        this.isDragging = false;
        const touchDiff = this.touchStartX - this.touchEndX;
        if (Math.abs(touchDiff) > this.touchConfig.threshold) {
            if (touchDiff > 0) {
                this.goToSlide(this.currentSlide + 1);
            } else {
                this.goToSlide(this.currentSlide - 1);
            }
        }
    }

    handleMouseDown(e) {
        if (this.isDisabled || e.button !== 0) return;
        this.isDragging = true;
        this.startX = e.clientX;
        this.currentX = e.clientX;
        e.preventDefault();
    }

    handleMouseMove(e) {
        if (!this.isDragging || this.isDisabled) return;
        this.currentX = e.clientX;
    }

    handleMouseUp(e) {
        if (!this.isDragging || this.isDisabled) return;
        this.isDragging = false;
        const dragDiff = this.startX - this.currentX;
        if (Math.abs(dragDiff) > this.touchConfig.threshold) {
            if (dragDiff > 0) {
                this.goToSlide(this.currentSlide + 1);
            } else {
                this.goToSlide(this.currentSlide - 1);
            }
        }
    }

    handleKeydown(e) {
        if (this.isDisabled) return;
        switch (e.key) {
            case 'ArrowLeft':
                if (this.keyboardConfig.keys.includes('ArrowLeft')) {
                    e.preventDefault();
                    this.goToSlide(this.currentSlide - 1);
                }
                break;
            case 'ArrowRight':
                if (this.keyboardConfig.keys.includes('ArrowRight')) {
                    e.preventDefault();
                    this.goToSlide(this.currentSlide + 1);
                }
                break;
            case 'Home':
                if (this.keyboardConfig.keys.includes('Home')) {
                    e.preventDefault();
                    this.goToSlide(0);
                }
                break;
            case 'End':
                if (this.keyboardConfig.keys.includes('End')) {
                    e.preventDefault();
                    this.goToSlide(this.totalSlides - 1);
                }
                break;
        }
    }

    handleResize() {
        this.checkResponsiveState();
        
        if (this.containerSelector === '.testimonials-carousel') {
            this.recalculateTestimonialsSlides();
        }
        
        if (!this.isDisabled) {
            this.updateCarousel();
        }
    }

    recalculateTestimonialsSlides() {
        const allCards = Array.from(this.container.querySelectorAll('.testimonial-card'));
        if (allCards.length === 0) return;

        const cardsPerSlide = this.getResponsiveCardsPerSlide();
        this.track.innerHTML = '';
        
        const slides = [];
        for (let i = 0; i < allCards.length; i += cardsPerSlide) {
            slides.push(allCards.slice(i, i + cardsPerSlide));
        }
        
        slides.forEach((slide, slideIndex) => {
            const slideDiv = document.createElement('div');
            slideDiv.className = 'testimonials-grid';
            slide.forEach(card => {
                slideDiv.appendChild(card.cloneNode(true));
            });
            this.track.appendChild(slideDiv);
        });
        this.updateSlides();
        this.updateIndicatorsForNewSlideCount();
        
        if (this.currentSlide >= this.totalSlides) {
            this.currentSlide = 0;
        }
    }

    getResponsiveCardsPerSlide() {
        const width = window.innerWidth;
        if (width <= 768) return 1;
        if (width <= 1024) return 2;
        return 3;
    }

    updateIndicatorsForNewSlideCount() {
        if (!this.indicatorsConfig.enabled) return;
        
        const indicatorsContainer = this.container.querySelector(this.indicatorsConfig.containerSelector);
        if (!indicatorsContainer) return;
        indicatorsContainer.innerHTML = '';
        
        for (let i = 0; i < this.totalSlides; i++) {
            const indicator = document.createElement('button');
            indicator.className = `carousel-indicator ${i === 0 ? 'active' : ''}`;
            indicator.setAttribute('data-slide', i);
            indicator.setAttribute('aria-label', `Go to slide ${i + 1}`);
            indicator.addEventListener('click', () => this.goToSlide(i));
            indicatorsContainer.appendChild(indicator);
        }
        this.indicators = Array.from(indicatorsContainer.querySelectorAll('.carousel-indicator'));
    }

    refresh() {
        this.updateSlides();
        this.checkResponsiveState();
        if (this.currentSlide >= this.totalSlides) {
            this.currentSlide = Math.max(0, this.totalSlides - 1);
        }
        if (!this.isDisabled) {
            this.updateCarousel();
        }
    }

    destroy() {
        if (!this.isInitialized) return;

        if (this.touchConfig.enabled) {
            this.container.removeEventListener('touchstart', this.boundHandleTouchStart);
            this.container.removeEventListener('touchmove', this.boundHandleTouchMove);
            this.container.removeEventListener('touchend', this.boundHandleTouchEnd);
        }

        this.container.removeEventListener('mousedown', this.boundHandleMouseDown);
        this.container.removeEventListener('mousemove', this.boundHandleMouseMove);
        this.container.removeEventListener('mouseup', this.boundHandleMouseUp);
        this.container.removeEventListener('mouseleave', this.boundHandleMouseUp);

        if (this.keyboardConfig.enabled) {
            this.container.removeEventListener('keydown', this.boundHandleKeydown);
        }

        window.removeEventListener('resize', this.boundHandleResize);

        if (this.prevBtn) {
            this.prevBtn.replaceWith(this.prevBtn.cloneNode(true));
        }
        if (this.nextBtn) {
            this.nextBtn.replaceWith(this.nextBtn.cloneNode(true));
        }
        this.indicators.forEach(indicator => {
            indicator.replaceWith(indicator.cloneNode(true));
        });

        if (this.track) {
            this.track.style.transform = '';
            this.track.style.transition = '';
        }

        this.isInitialized = false;

        if (this.onDestroy) {
            this.onDestroy(this);
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    next() {
        this.goToSlide(this.currentSlide + 1);
    }

    prev() {
        this.goToSlide(this.currentSlide - 1);
    }

    getCurrentSlide() {
        return this.currentSlide;
    }

    getTotalSlides() {
        return this.totalSlides;
    }

    getIsDisabled() {
        return this.isDisabled;
    }
}

function createCarouselSlides(items, getItemsPerSlide) {
    const itemsPerSlide = getItemsPerSlide();
    const slides = [];
    for (let i = 0; i < items.length; i += itemsPerSlide) {
        slides.push(items.slice(i, i + itemsPerSlide));
    }
    return slides;
}

function getResponsiveItemsPerSlide(breakpoints = null) {
    const width = window.innerWidth;
    const defaultBreakpoints = {
        768: 1,
        1024: 2,
        default: 3
    };
    const config = breakpoints || defaultBreakpoints;
    const sortedBreakpoints = Object.keys(config)
        .filter(key => key !== 'default')
        .map(Number)
        .sort((a, b) => b - a);
    for (const breakpoint of sortedBreakpoints) {
        if (width <= breakpoint) {
            if (width <= 768) {
                return 1;
            }
            return config[breakpoint];
        }
    }
    return config.default || 3;
}

function createTestimonialsCarouselConfig(containerSelector) {
    return {
        containerSelector: containerSelector,
        trackSelector: '.testimonials-track',
        slideSelector: '.testimonials-grid',
        arrows: {
            enabled: true,
            prevSelector: '.carousel-prev',
            nextSelector: '.carousel-next',
            hideOnSingleSlide: true
        },
        indicators: {
            enabled: true,
            containerSelector: '.carousel-indicators',
            hideOnSingleSlide: true
        },
        touch: {
            enabled: true,
            threshold: 50,
            preventVerticalScroll: true
        },
        keyboard: {
            enabled: true,
            keys: ['ArrowLeft', 'ArrowRight', 'Home', 'End']
        },
        responsive: {
            768: { disabled: false },
            1024: { disabled: false },
            default: { disabled: false }
        },
        animation: {
            duration: 400,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            gapCalculation: 'percentage'
        }
    };
}

function createPetsCarouselConfig(containerSelector) {
    return {
        containerSelector: containerSelector,
        trackSelector: '.pets-track',
        slideSelector: '.pets-row',
        arrows: {
            enabled: true,
            prevSelector: '.carousel-prev',
            nextSelector: '.carousel-next',
            hideOnSingleSlide: true
        },
        indicators: {
            enabled: true,
            containerSelector: '.carousel-indicators',
            hideOnSingleSlide: true
        },
        touch: {
            enabled: true,
            threshold: 50,
            preventVerticalScroll: true
        },
        keyboard: {
            enabled: true,
            keys: ['ArrowLeft', 'ArrowRight']
        },
        responsive: {
            768: { disabled: false },
            1024: { disabled: false },
            default: { disabled: false }
        },
        animation: {
            duration: 400,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            gapCalculation: 'none'
        }
    };
}

function generateTestimonialsCarouselHTML(testimonials, createTestimonialHTML) {
    const getCardsPerSlide = () => getResponsiveItemsPerSlide();
    const slides = createCarouselSlides(testimonials, getCardsPerSlide);
    const totalSlides = slides.length;
    return `
        <div class="section-container">
            <div class="section-header">
                <h2 class="section-title" data-i18n="testimonials.title">What Our Community Says</h2>
                <p data-i18n="testimonials.subtitle">Real stories from pet adopters and shelter partners</p>
            </div>
            <div class="testimonials-carousel" data-total-slides="${totalSlides}">
                ${totalSlides > 1 ? `
                    <button class="carousel-arrow carousel-prev" aria-label="Previous testimonials">
                        &lt;
                    </button>
                    <button class="carousel-arrow carousel-next" aria-label="Next testimonials">
                        &gt;
                    </button>
                ` : ''}
                <div class="testimonials-carousel-wrapper">
                    <div class="testimonials-track">
                        ${slides.map(slide => `
                            <div class="testimonials-grid">
                                ${slide.map(testimonial => createTestimonialHTML(testimonial)).join('')}
                            </div>
                        `).join('')}
                    </div>
                </div>
                ${totalSlides > 1 ? `
                    <div class="carousel-indicators">
                        ${Array.from({ length: totalSlides }, (_, i) => 
                            `<button class="carousel-indicator ${i === 0 ? 'active' : ''}" data-slide="${i}" aria-label="Go to slide ${i + 1}"></button>`
                        ).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function generatePetsCarouselHTML(pets, createPetCardHTML, getCardsPerSlide) {
    const slides = createCarouselSlides(pets, getCardsPerSlide);
    const totalSlides = slides.length;
    return `
        <div class="pets-grid">
            <div class="pets-carousel" data-total-slides="${totalSlides}">
                ${totalSlides > 1 ? `
                    <button class="carousel-arrow carousel-prev" aria-label="Previous pets">
                        &lt;
                    </button>
                    <button class="carousel-arrow carousel-next" aria-label="Next pets">
                        &gt;
                    </button>
                ` : ''}
                <div class="pets-carousel-wrapper">
                    <div class="pets-track">
                        ${slides.map(slide => `
                            <div class="pets-row">
                                ${slide.map(pet => createPetCardHTML(pet)).join('')}
                            </div>
                        `).join('')}
                    </div>
                </div>
                ${totalSlides > 1 ? `
                    <div class="carousel-indicators">
                        ${Array.from({ length: totalSlides }, (_, i) => 
                            `<button class="carousel-indicator ${i === 0 ? 'active' : ''}" data-slide="${i}" aria-label="Go to slide ${i + 1}"></button>`
                        ).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Carousel,
        createCarouselSlides,
        getResponsiveItemsPerSlide,
        createTestimonialsCarouselConfig,
        createPetsCarouselConfig,
        generateTestimonialsCarouselHTML,
        generatePetsCarouselHTML
    };
}

if (typeof window !== 'undefined') {
    window.CarouselHelpers = {
        createCarouselSlides,
        getResponsiveItemsPerSlide,
        createTestimonialsCarouselConfig,
        createPetsCarouselConfig,
        generateTestimonialsCarouselHTML,
        generatePetsCarouselHTML
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Carousel;
}

if (typeof window !== 'undefined') {
    window.Carousel = Carousel;
}
