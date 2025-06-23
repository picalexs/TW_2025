const AbstractModel = require('./abstractModel');
const RSSFeedDTO = require('../dto/rssFeedDTO');

class RSSFeedModel extends AbstractModel {
    constructor() {
        super(RSSFeedDTO);
        this.rssFeedDTO = RSSFeedDTO;
    }

      async getPetsForRSSFeed(filters = {}) {
        try {
            const validatedFilters = this.validateRSSFilters(filters);
            let pets = await this.rssFeedDTO.getPetsForRSSFeed(validatedFilters);
            if (!pets || pets.length === 0) {
                pets = this.rssFeedDTO.getDemoPets(validatedFilters);
            }
            return this.processPetsForRSS(pets);
        } catch (error) {
            console.error('Error in RSSFeedModel.getPetsForRSSFeed:', error);
            const validatedFilters = this.validateRSSFilters(filters);
            const demoPets = this.rssFeedDTO.getDemoPets(validatedFilters);
            return this.processPetsForRSS(demoPets);
        }
    }

    async getTrendingPets(filters = {}) {
        try {
            const validatedFilters = this.validateTrendingFilters(filters);
            let pets = await this.rssFeedDTO.getTrendingPets(validatedFilters);
            if (!pets || pets.length === 0) {
                pets = this.rssFeedDTO.getDemoPets({ ...validatedFilters, type: 'popular' });
            }
            return this.processTrendingPets(pets);
        } catch (error) {
            console.error('Error in RSSFeedModel.getTrendingPets:', error);
            const validatedFilters = this.validateTrendingFilters(filters);
            const demoPets = this.rssFeedDTO.getDemoPets({ ...validatedFilters, type: 'popular' });
            return this.processTrendingPets(demoPets);
        }
    }

    async getPopularPetsByLocation(filters = {}) {
        try {
            const validatedFilters = this.validateLocationFilters(filters);
            return await this.rssFeedDTO.getPopularPetsByLocation(validatedFilters);
        } catch (error) {
            console.error('Error in RSSFeedModel.getPopularPetsByLocation:', error);
            throw error;
        }
    }

    async getRecentPetsByBreed(filters = {}) {
        try {
            const validatedFilters = this.validateBreedFilters(filters);
            return await this.rssFeedDTO.getRecentPetsByBreed(validatedFilters);
        } catch (error) {
            console.error('Error in RSSFeedModel.getRecentPetsByBreed:', error);
            throw error;
        }
    }

    getDemoPets(filters = {}) {
        try {
            const validatedFilters = this.validateRSSFilters(filters);
            return this.rssFeedDTO.getDemoPets(validatedFilters);
        } catch (error) {
            console.error('Error in RSSFeedModel.getDemoPets:', error);
            throw error;
        }
    }

    validateRSSFilters(filters) {
        const {
            type = 'recent',
            zone,
            breed,
            species,
            limit = 20
        } = filters;

        const validTypes = ['recent', 'popular'];
        if (!validTypes.includes(type)) {
            throw new Error(`Invalid feed type: ${type}. Must be one of: ${validTypes.join(', ')}`);
        }

        const maxLimit = 100;
        const validatedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), maxLimit);

        const sanitizedZone = zone ? zone.trim().substring(0, 100) : undefined;
        const sanitizedBreed = breed ? breed.trim().substring(0, 50) : undefined;
        const sanitizedSpecies = species ? species.trim().substring(0, 30) : undefined;

        return {
            type,
            zone: sanitizedZone,
            breed: sanitizedBreed,
            species: sanitizedSpecies,
            limit: validatedLimit
        };
    }

    validateTrendingFilters(filters) {
        const { zone, breed, species, limit = 20 } = filters;

        const maxLimit = 50;
        const validatedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), maxLimit);

        const sanitizedZone = zone ? zone.trim().substring(0, 100) : undefined;
        const sanitizedBreed = breed ? breed.trim().substring(0, 50) : undefined;
        const sanitizedSpecies = species ? species.trim().substring(0, 30) : undefined;

        return {
            zone: sanitizedZone,
            breed: sanitizedBreed,
            species: sanitizedSpecies,
            limit: validatedLimit
        };
    }

    validateLocationFilters(filters) {
        const { zone, limit = 20 } = filters;

        const maxLimit = 100;
        const validatedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), maxLimit);

        const sanitizedZone = zone ? zone.trim().substring(0, 100) : undefined;

        return {
            zone: sanitizedZone,
            limit: validatedLimit
        };
    }

    validateBreedFilters(filters) {
        const { breed, limit = 20 } = filters;

        const maxLimit = 100;
        const validatedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), maxLimit);

        const sanitizedBreed = breed ? breed.trim().substring(0, 50) : undefined;

        return {
            breed: sanitizedBreed,
            limit: validatedLimit
        };
    }

    processPetsForRSS(pets) {
        return pets.map(pet => {
            return {
                ID: pet.id,
                NAME: pet.name,
                SPECIES: pet.species,
                BREED: pet.breed,
                AGE: pet.age,
                DESCRIPTION: pet.description,
                ADOPTION_FEE: pet.adoption_fee,
                CITY: pet.city,
                COUNTRY: pet.country,
                CREATED_AT: new Date().toISOString(),
                IMAGE_PATH: '/assets/default-pet-profile.jpg'
            };
        });
    }    
    
    processTrendingPets(pets) {
        return pets.map(pet => {
            const views_count = Math.floor(Math.random() * 100) + 10;
            const favorites_count = Math.floor(Math.random() * 20) + 1;
            const adoption_requests_count = Math.floor(Math.random() * 5);
            
            const popularityScore = views_count * 0.3 + favorites_count * 0.5 + adoption_requests_count * 0.2;

            const processedPet = this.processPetsForRSS([pet])[0];
            return {
                ...processedPet,
                POPULARITY_SCORE: Math.round(popularityScore * 100) / 100,
                VIEWS_COUNT: views_count,
                FAVORITES_COUNT: favorites_count,
                ADOPTION_REQUESTS_COUNT: adoption_requests_count
            };
        });
    }

    validateRSSBusinessRules(pets, feedType) {
        if (pets.length === 0) {
            console.warn(`No pets found for ${feedType} RSS feed`);
            return false;
        }

        const validPets = pets.filter(pet => pet.NAME && pet.SPECIES);
        if (validPets.length < pets.length * 0.8) {
            console.warn(`Too many pets with missing critical information in ${feedType} RSS feed`);
            return false;
        }

        return true;
    }

    applyRSSBusinessRules(pets, feedType) {
        const qualityPets = pets.filter(pet => {
            if (!pet.NAME || !pet.SPECIES) return false;
            if (!pet.DESCRIPTION && !pet.BREED && !pet.COLOR) return false;
            return true;
        });

        return qualityPets.sort((a, b) => {
            const scoreA = this.calculatePetQualityScore(a);
            const scoreB = this.calculatePetQualityScore(b);
            return scoreB - scoreA;
        });
    }

    calculatePetQualityScore(pet) {
        let score = 0;
        if (pet.NAME) score += 10;
        if (pet.SPECIES) score += 10;
        if (pet.DESCRIPTION && pet.DESCRIPTION.length > 20) score += 5;
        if (pet.BREED) score += 3;
        if (pet.COLOR) score += 2;
        if (pet.AGE) score += 2;
        if (pet.IMAGE_PATH && pet.IMAGE_PATH !== '/assets/default-pet-profile.jpg') score += 5;
        if (pet.SHELTER_NAME) score += 3;
        if (pet.CITY) score += 2;
        if (pet.VIEWS_COUNT > 0) score += Math.min(pet.VIEWS_COUNT / 10, 5);
        if (pet.FAVORITES_COUNT > 0) score += Math.min(pet.FAVORITES_COUNT / 5, 5);
        return score;
    }
}

module.exports = new RSSFeedModel();