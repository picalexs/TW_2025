const AbstractDTO = require('./abstractDTO');
const { executeQuery } = require('../db/dbConnection');

class RSSFeedDTO extends AbstractDTO {
    constructor() {
        super('animals');
    }

    mapToEntity(dbRow) {
        return {
            id: dbRow.ID,
            name: dbRow.NAME,
            species: dbRow.SPECIES,
            breed: dbRow.BREED,
            age: dbRow.AGE,
            gender: dbRow.GENDER,
            size_category: dbRow.SIZE_CATEGORY,
            color: dbRow.COLOR,
            description: dbRow.DESCRIPTION,
            adoption_fee: dbRow.ADOPTION_FEE,
            created_at: dbRow.CREATED_AT,
            updated_at: dbRow.UPDATED_AT,
            image_path: dbRow.IMAGE_PATH,
            city: dbRow.CITY,
            country: dbRow.COUNTRY,
            address: dbRow.ADDRESS,
            views_count: dbRow.VIEWS_COUNT,
            favorites_count: dbRow.FAVORITES_COUNT,
            adoption_requests_count: dbRow.ADOPTION_REQUESTS_COUNT,
            shelter_name: dbRow.SHELTER_NAME,
            shelter_phone: dbRow.SHELTER_PHONE,
            shelter_email: dbRow.SHELTER_EMAIL,
            trending_score: dbRow.TRENDING_SCORE,
            popularity_score: dbRow.POPULARITY_SCORE
        };
    }    
    
    async getPetsForRSSFeed(filters = {}) {
        const { 
            type = 'recent', 
            zone, 
            breed, 
            species, 
            limit = 20 
        } = filters;

        try {
            let query;
            let params = {};

            if (type === 'popular') {
                query = `
                    SELECT 
                        a.id as ID,
                        a.name as NAME,
                        a.species as SPECIES,
                        a.breed as BREED,
                        a.age as AGE,
                        a.gender as GENDER,
                        a.size_category as SIZE_CATEGORY,
                        a.color as COLOR,
                        a.description as DESCRIPTION,
                        a.adoption_fee as ADOPTION_FEE,
                        a.created_at as CREATED_AT,
                        a.updated_at as UPDATED_AT,
                        a.image_path as IMAGE_PATH,
                        addr.city as CITY,
                        addr.country as COUNTRY,
                        addr.address as ADDRESS,
                        am.views_count as VIEWS_COUNT,
                        am.favorites_count as FAVORITES_COUNT,
                        am.adoption_requests_count as ADOPTION_REQUESTS_COUNT,
                        s.name as SHELTER_NAME,
                        s.contact_phone as SHELTER_PHONE,
                        s.contact_email as SHELTER_EMAIL,
                        (COALESCE(am.views_count, 0) + COALESCE(am.favorites_count, 0) * 2 + COALESCE(am.adoption_requests_count, 0) * 3) as POPULARITY_SCORE
                    FROM animals a
                    LEFT JOIN addresses addr ON a.address_id = addr.id
                    LEFT JOIN animal_metrics am ON a.id = am.animal_id
                    LEFT JOIN shelters s ON a.shelter_id = s.id
                    WHERE a.adoption_status = 'available'
                `;
                
                if (zone) {
                    query += ` AND UPPER(addr.city) LIKE UPPER(:zone)`;
                    params.zone = `%${zone}%`;
                }
                if (breed) {
                    query += ` AND UPPER(a.breed) LIKE UPPER(:breed)`;
                    params.breed = `%${breed}%`;
                }
                if (species) {
                    query += ` AND UPPER(a.species) = UPPER(:species)`;
                    params.species = species;
                }
                
                query += ` ORDER BY POPULARITY_SCORE DESC`;
            } else {
                query = `
                    SELECT 
                        a.id as ID,
                        a.name as NAME,
                        a.species as SPECIES,
                        a.breed as BREED,
                        a.age as AGE,
                        a.gender as GENDER,
                        a.size_category as SIZE_CATEGORY,
                        a.color as COLOR,
                        a.description as DESCRIPTION,
                        a.adoption_fee as ADOPTION_FEE,
                        a.created_at as CREATED_AT,
                        a.updated_at as UPDATED_AT,
                        a.image_path as IMAGE_PATH,
                        addr.city as CITY,
                        addr.country as COUNTRY,
                        addr.address as ADDRESS,
                        am.views_count as VIEWS_COUNT,
                        am.favorites_count as FAVORITES_COUNT,
                        am.adoption_requests_count as ADOPTION_REQUESTS_COUNT,
                        s.name as SHELTER_NAME,
                        s.contact_phone as SHELTER_PHONE,
                        s.contact_email as SHELTER_EMAIL
                    FROM animals a
                    LEFT JOIN addresses addr ON a.address_id = addr.id
                    LEFT JOIN animal_metrics am ON a.id = am.animal_id
                    LEFT JOIN shelters s ON a.shelter_id = s.id
                    WHERE a.adoption_status = 'available'
                `;
                
                if (zone) {
                    query += ` AND UPPER(addr.city) LIKE UPPER(:zone)`;
                    params.zone = `%${zone}%`;
                }
                if (breed) {
                    query += ` AND UPPER(a.breed) LIKE UPPER(:breed)`;
                    params.breed = `%${breed}%`;
                }
                if (species) {
                    query += ` AND UPPER(a.species) = UPPER(:species)`;
                    params.species = species;
                }
                
                query += ` ORDER BY a.created_at DESC`;
            }
            
            query += ` FETCH FIRST :limit ROWS ONLY`;
            params.limit = parseInt(limit);
            
            const result = await executeQuery(query, params);
            
            return result.rows.map(row => this.mapToEntity(row));
            
        } catch (error) {
            console.error('Error in RSSFeedDTO.getPetsForRSSFeed:', error);
            throw error;
        }
    }

    async getTrendingPets(filters = {}) {
        const { zone, breed, species, limit = 20 } = filters;

        try {
            let query = `
                SELECT 
                    a.id as ID,
                    a.name as NAME,
                    a.species as SPECIES,
                    a.breed as BREED,
                    a.age as AGE,
                    a.gender as GENDER,
                    a.size_category as SIZE_CATEGORY,
                    a.color as COLOR,
                    a.description as DESCRIPTION,
                    a.adoption_fee as ADOPTION_FEE,
                    a.created_at as CREATED_AT,
                    a.updated_at as UPDATED_AT,
                    a.image_path as IMAGE_PATH,
                    addr.city as CITY,
                    addr.country as COUNTRY,
                    addr.address as ADDRESS,
                    am.views_count as VIEWS_COUNT,
                    am.favorites_count as FAVORITES_COUNT,
                    am.adoption_requests_count as ADOPTION_REQUESTS_COUNT,
                    s.name as SHELTER_NAME,
                    s.contact_phone as SHELTER_PHONE,
                    s.contact_email as SHELTER_EMAIL,
                    (COALESCE(am.views_count, 0) * 0.3 + 
                     COALESCE(am.favorites_count, 0) * 0.5 + 
                     COALESCE(am.adoption_requests_count, 0) * 0.2) as TRENDING_SCORE
                FROM animals a
                LEFT JOIN addresses addr ON a.address_id = addr.id
                LEFT JOIN animal_metrics am ON a.id = am.animal_id
                LEFT JOIN shelters s ON a.shelter_id = s.id
                WHERE a.adoption_status = 'available'
                AND a.created_at >= SYSDATE - 30
            `;
            
            let params = {};
            
            if (zone) {
                query += ` AND UPPER(addr.city) LIKE UPPER(:zone)`;
                params.zone = `%${zone}%`;
            }
            if (breed) {
                query += ` AND UPPER(a.breed) LIKE UPPER(:breed)`;
                params.breed = `%${breed}%`;
            }
            if (species) {
                query += ` AND UPPER(a.species) = UPPER(:species)`;
                params.species = species;
            }
            
            query += ` ORDER BY TRENDING_SCORE DESC, a.created_at DESC`;
            query += ` FETCH FIRST :limit ROWS ONLY`;
            params.limit = parseInt(limit);
            
            const result = await executeQuery(query, params);
            
            return result.rows.map(row => this.mapToEntity(row));
            
        } catch (error) {
            console.error('Error in RSSFeedDTO.getTrendingPets:', error);
            throw error;
        }
    }

    async getPopularPetsByLocation(filters = {}) {
        const { zone, limit = 20 } = filters;

        try {
            let query = `
                SELECT 
                    a.id as ID,
                    a.name as NAME,
                    a.species as SPECIES,
                    a.breed as BREED,
                    a.age as AGE,
                    a.gender as GENDER,
                    a.size_category as SIZE_CATEGORY,
                    a.color as COLOR,
                    a.description as DESCRIPTION,
                    a.adoption_fee as ADOPTION_FEE,
                    a.created_at as CREATED_AT,
                    a.updated_at as UPDATED_AT,
                    a.image_path as IMAGE_PATH,
                    addr.city as CITY,
                    addr.country as COUNTRY,
                    addr.address as ADDRESS,
                    am.views_count as VIEWS_COUNT,
                    am.favorites_count as FAVORITES_COUNT,
                    am.adoption_requests_count as ADOPTION_REQUESTS_COUNT,
                    s.name as SHELTER_NAME,
                    s.contact_phone as SHELTER_PHONE,
                    s.contact_email as SHELTER_EMAIL,
                    (COALESCE(am.views_count, 0) + COALESCE(am.favorites_count, 0) * 2) as POPULARITY_SCORE
                FROM animals a
                LEFT JOIN addresses addr ON a.address_id = addr.id
                LEFT JOIN animal_metrics am ON a.id = am.animal_id
                LEFT JOIN shelters s ON a.shelter_id = s.id
                WHERE a.adoption_status = 'available'
            `;
            
            let params = {};
            
            if (zone) {
                query += ` AND UPPER(addr.city) LIKE UPPER(:zone)`;
                params.zone = `%${zone}%`;
            }
            
            query += ` ORDER BY POPULARITY_SCORE DESC`;
            query += ` FETCH FIRST :limit ROWS ONLY`;
            params.limit = parseInt(limit);
            
            const result = await executeQuery(query, params);
            
            return result.rows.map(row => this.mapToEntity(row));
            
        } catch (error) {
            console.error('Error in RSSFeedDTO.getPopularPetsByLocation:', error);
            throw error;
        }
    }

    async getRecentPetsByBreed(filters = {}) {
        const { breed, limit = 20 } = filters;

        try {
            let query = `
                SELECT 
                    a.id as ID,
                    a.name as NAME,
                    a.species as SPECIES,
                    a.breed as BREED,
                    a.age as AGE,
                    a.gender as GENDER,
                    a.size_category as SIZE_CATEGORY,
                    a.color as COLOR,
                    a.description as DESCRIPTION,
                    a.adoption_fee as ADOPTION_FEE,
                    a.created_at as CREATED_AT,
                    a.updated_at as UPDATED_AT,
                    a.image_path as IMAGE_PATH,
                    addr.city as CITY,
                    addr.country as COUNTRY,
                    addr.address as ADDRESS,
                    am.views_count as VIEWS_COUNT,
                    am.favorites_count as FAVORITES_COUNT,
                    am.adoption_requests_count as ADOPTION_REQUESTS_COUNT,
                    s.name as SHELTER_NAME,
                    s.contact_phone as SHELTER_PHONE,
                    s.contact_email as SHELTER_EMAIL
                FROM animals a
                LEFT JOIN addresses addr ON a.address_id = addr.id
                LEFT JOIN animal_metrics am ON a.id = am.animal_id
                LEFT JOIN shelters s ON a.shelter_id = s.id
                WHERE a.adoption_status = 'available'
            `;
            
            let params = {};
            
            if (breed) {
                query += ` AND UPPER(a.breed) LIKE UPPER(:breed)`;
                params.breed = `%${breed}%`;
            }
            
            query += ` ORDER BY a.created_at DESC`;
            query += ` FETCH FIRST :limit ROWS ONLY`;
            params.limit = parseInt(limit);
            
            const result = await executeQuery(query, params);
            
            return result.rows.map(row => this.mapToEntity(row));
            
        } catch (error) {
            console.error('Error in RSSFeedDTO.getRecentPetsByBreed:', error);
            throw error;
        }
    }

    getDemoPets(filters = {}) {
        const { type = 'recent', zone, breed, species, limit = 20 } = filters;
        
        const demoPets = [
            {
                ID: 1,
                NAME: 'Buddy',
                SPECIES: 'Dog',
                BREED: 'Golden Retriever',
                AGE: 3.5,
                GENDER: 'male',
                SIZE_CATEGORY: 'large',
                COLOR: 'Golden',
                DESCRIPTION: 'Friendly golden retriever who loves fetch and swimming.',
                ADOPTION_FEE: 250.00,
                CREATED_AT: new Date(),
                IMAGE_PATH: '/assets/default-pet-profile.jpg',
                CITY: 'New York',
                COUNTRY: 'USA',
                SHELTER_NAME: 'Happy Tails Shelter',
                VIEWS_COUNT: 150,
                FAVORITES_COUNT: 25,
                ADOPTION_REQUESTS_COUNT: 8
            },
            {
                ID: 2,
                NAME: 'Luna',
                SPECIES: 'Cat',
                BREED: 'Siamese',
                AGE: 2.0,
                GENDER: 'female',
                SIZE_CATEGORY: 'medium',
                COLOR: 'Seal Point',
                DESCRIPTION: 'Vocal and social Siamese cat who loves attention.',
                ADOPTION_FEE: 180.00,
                CREATED_AT: new Date(Date.now() - 86400000), // 1 day ago
                IMAGE_PATH: '/assets/default-pet-profile.jpg',
                CITY: 'Los Angeles',
                COUNTRY: 'USA',
                SHELTER_NAME: 'Paws & Claws Rescue',
                VIEWS_COUNT: 120,
                FAVORITES_COUNT: 30,
                ADOPTION_REQUESTS_COUNT: 12
            },
            {
                ID: 3,
                NAME: 'Max',
                SPECIES: 'Dog',
                BREED: 'Border Collie',
                AGE: 4.0,
                GENDER: 'male',
                SIZE_CATEGORY: 'medium',
                COLOR: 'Black and White',
                DESCRIPTION: 'Highly intelligent Border Collie who needs mental stimulation.',
                ADOPTION_FEE: 280.00,
                CREATED_AT: new Date(Date.now() - 172800000), // 2 days ago
                IMAGE_PATH: '/assets/default-pet-profile.jpg',
                CITY: 'Chicago',
                COUNTRY: 'USA',
                SHELTER_NAME: 'Urban Animal Shelter',
                VIEWS_COUNT: 200,
                FAVORITES_COUNT: 45,
                ADOPTION_REQUESTS_COUNT: 15
            },
            {
                ID: 4,
                NAME: 'Bella',
                SPECIES: 'Dog',
                BREED: 'Labrador',
                AGE: 2.5,
                GENDER: 'female',
                SIZE_CATEGORY: 'large',
                COLOR: 'Chocolate',
                DESCRIPTION: 'Active lab who loves running and swimming.',
                ADOPTION_FEE: 275.00,
                CREATED_AT: new Date(Date.now() - 259200000), // 3 days ago
                IMAGE_PATH: '/assets/default-pet-profile.jpg',
                CITY: 'Houston',
                COUNTRY: 'USA',
                SHELTER_NAME: 'Texas Pet Rescue',
                VIEWS_COUNT: 180,
                FAVORITES_COUNT: 35,
                ADOPTION_REQUESTS_COUNT: 10
            },
            {
                ID: 5,
                NAME: 'Whiskers',
                SPECIES: 'Cat',
                BREED: 'Persian',
                AGE: 5.0,
                GENDER: 'female',
                SIZE_CATEGORY: 'medium',
                COLOR: 'White',
                DESCRIPTION: 'Calm senior cat who loves quiet spaces.',
                ADOPTION_FEE: 150.00,
                CREATED_AT: new Date(Date.now() - 345600000), // 4 days ago
                IMAGE_PATH: '/assets/default-pet-profile.jpg',
                CITY: 'Phoenix',
                COUNTRY: 'USA',
                SHELTER_NAME: 'Desert Animal Haven',
                VIEWS_COUNT: 90,
                FAVORITES_COUNT: 20,
                ADOPTION_REQUESTS_COUNT: 5
            }
        ];

        let filteredPets = demoPets;

        if (species) {
            filteredPets = filteredPets.filter(pet => 
                pet.SPECIES.toLowerCase().includes(species.toLowerCase())
            );
        }

        if (breed) {
            filteredPets = filteredPets.filter(pet => 
                pet.BREED.toLowerCase().includes(breed.toLowerCase())
            );
        }

        if (zone) {
            filteredPets = filteredPets.filter(pet => 
                pet.CITY.toLowerCase().includes(zone.toLowerCase())
            );
        }

        if (type === 'popular') {
            filteredPets.sort((a, b) => {
                const scoreA = (a.VIEWS_COUNT || 0) + (a.FAVORITES_COUNT || 0) * 2 + (a.ADOPTION_REQUESTS_COUNT || 0) * 3;
                const scoreB = (b.VIEWS_COUNT || 0) + (b.FAVORITES_COUNT || 0) * 2 + (b.ADOPTION_REQUESTS_COUNT || 0) * 3;
                return scoreB - scoreA;
            });
        } else {
            filteredPets.sort((a, b) => new Date(b.CREATED_AT) - new Date(a.CREATED_AT));
        }

        return filteredPets.slice(0, parseInt(limit)).map(pet => this.mapToEntity(pet));
    }
}

module.exports = new RSSFeedDTO();
