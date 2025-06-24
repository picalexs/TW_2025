function escapeHTML(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

class ImagePathHandler {
    static get API_BASE_URL() {
        return window.APP_CONFIG?.api?.baseURL || (window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port : ''));
    }    
    
    static get DEFAULTS() {
        return {
            USER: '/frontend/assets/default-user-profile.webp',
            PET: '/frontend/assets/default-pet-profile.webp'
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

        let cleanPath = imagePath;
        if (cleanPath.startsWith("/")) {
            cleanPath = cleanPath.substring(1);
        }

        return `${this.API_BASE_URL}/api/static/${cleanPath}`;
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
        img.alt = escapeHTML(altText);
        
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
