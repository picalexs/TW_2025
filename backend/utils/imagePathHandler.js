class ImagePathHandler {
    static get API_STATIC_BASE() {
        return '/api/static/';
    }

    static get DEFAULTS() {
        return {
            USER: '../assets/default-user-profile.webp',
            PET: '../assets/default-pet-profile.webp'
        };
    }

    static processImagePath(dbPath, defaultPath = this.DEFAULTS.USER) {
        if (!dbPath) {
            return defaultPath;
        }

        if (dbPath.startsWith("http")) {
            return dbPath;
        }

        if (dbPath.startsWith(this.API_STATIC_BASE)) {
            return dbPath;
        }

        let cleanPath = dbPath;
        if (cleanPath.startsWith("/")) {
            cleanPath = cleanPath.substring(1);
        }

        return `${this.API_STATIC_BASE}${cleanPath}`;
    }

    static processPetImagePath(dbPath) {
        return this.processImagePath(dbPath, this.DEFAULTS.PET);
    }
    static processUserImagePath(dbPath) {
        return this.processImagePath(dbPath, this.DEFAULTS.USER);
    }

    static extractFilePathFromAPI(apiPath) {
        if (apiPath.startsWith(this.API_STATIC_BASE)) {
            return apiPath.substring(this.API_STATIC_BASE.length);
        }
        return apiPath;
    }
}

module.exports = ImagePathHandler;
