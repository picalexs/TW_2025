class ImagePathHandler {
    static get API_BASE_URL() {
        return window.APP_CONFIG?.api?.baseURL || 'http://localhost:8080';
    }    
    
    static get DEFAULTS() {
        return {
            USER: '/frontend/assets/default-user-profile.jpg',
            PET: '/frontend/assets/default-pet-profile.jpg'
        };
    }

    static processImagePath(imagePath, defaultPath = this.DEFAULTS.USER) {
        if (!imagePath) {
            return defaultPath;
        }

        if (imagePath.startsWith("http")) {
            return imagePath;
        }

        if (imagePath.startsWith("../assets/")) {
            return imagePath;
        }

        if (imagePath.startsWith("/api/static/")) {
            return `${this.API_BASE_URL}${imagePath}`;
        }

        return defaultPath;
    }

    static processPetImagePath(imagePath) {
        return this.processImagePath(imagePath, this.DEFAULTS.PET);
    }

    static processUserImagePath(imagePath) {
        return this.processImagePath(imagePath, this.DEFAULTS.USER);
    }

    static createImageElement(imagePath, altText = '', defaultPath = this.DEFAULTS.USER) {
        const img = document.createElement('img');
        const processedPath = this.processImagePath(imagePath, defaultPath);
        
        img.src = processedPath;
        img.alt = altText;
        
        img.onerror = function() {
            if (this.src !== defaultPath) {
                this.src = defaultPath;
            }
        };
        
        return img;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImagePathHandler;
}

if (typeof window !== 'undefined') {
    window.ImagePathHandler = ImagePathHandler;
}
