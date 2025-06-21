const AbstractDTO = require('./abstractDTO');
const { executeQuery } = require('../db/dbConnection');
const oracledb = require('oracledb');

class RSSFeedDTO extends AbstractDTO {
    constructor() {
        super('animals');
    }

    getStandardFetchInfo() {
        return {
            outFormat: require('oracledb').OUT_FORMAT_OBJECT,
            fetchInfo: {
                DESCRIPTION: { 
                    type: require('oracledb').STRING,
                    size: 4000
                }
            }
        };
    }

    mapToEntity(dbRow) {
        let description = '';
        if (dbRow.DESCRIPTION) {
            if (typeof dbRow.DESCRIPTION === 'string') {
                description = dbRow.DESCRIPTION;
            } else if (dbRow.DESCRIPTION && typeof dbRow.DESCRIPTION.toString === 'function') {
                description = dbRow.DESCRIPTION.toString();
            } else if (dbRow.DESCRIPTION && dbRow.DESCRIPTION.getData) {
                description = 'Pet description available';
            } else {
                console.warn('Unexpected DESCRIPTION type:', typeof dbRow.DESCRIPTION, dbRow.DESCRIPTION);
                description = 'Description not available';
            }
        }

        return {
            id: dbRow.ID,
            name: dbRow.NAME,
            species: dbRow.SPECIES,
            breed: dbRow.BREED,
            age: dbRow.AGE,
            description: description,
            adoption_fee: dbRow.ADOPTION_FEE,
            city: dbRow.CITY,
            country: dbRow.COUNTRY
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
                        a.description as DESCRIPTION,
                        a.adoption_fee as ADOPTION_FEE,
                        addr.city as CITY,
                        addr.country as COUNTRY,
                        (COALESCE(am.views_count, 0) + COALESCE(am.favorites_count, 0) * 2 + COALESCE(am.adoption_requests_count, 0) * 3) as POPULARITY_SCORE                    FROM animals a
                    LEFT JOIN address addr ON a.address_id = addr.id
                    LEFT JOIN animal_metrics am ON a.id = am.animal_id
                    WHERE 1=1
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
                        a.description as DESCRIPTION,
                        a.adoption_fee as ADOPTION_FEE,
                        addr.city as CITY,                        
                        addr.country as COUNTRY
                    FROM animals a
                    LEFT JOIN address addr ON a.address_id = addr.id
                    WHERE 1=1
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
            
            const result = await executeQuery(query, params, this.getStandardFetchInfo());
            
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
                    a.description as DESCRIPTION,
                    a.adoption_fee as ADOPTION_FEE,
                    addr.city as CITY,
                    addr.country as COUNTRY,
                    (COALESCE(am.views_count, 0) * 0.3 + 
                     COALESCE(am.favorites_count, 0) * 0.5 + 
                     COALESCE(am.adoption_requests_count, 0) * 0.2) as TRENDING_SCORE
                FROM animals a
                LEFT JOIN address addr ON a.address_id = addr.id
                LEFT JOIN animal_metrics am ON a.id = am.animal_id
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
            
            const result = await executeQuery(query, params, this.getStandardFetchInfo());
            
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
                    a.description as DESCRIPTION,
                    a.adoption_fee as ADOPTION_FEE,
                    addr.city as CITY,
                    addr.country as COUNTRY,
                    (COALESCE(am.views_count, 0) + COALESCE(am.favorites_count, 0) * 2) as POPULARITY_SCORE
                FROM animals a
                LEFT JOIN address addr ON a.address_id = addr.id
                LEFT JOIN animal_metrics am ON a.id = am.animal_id
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
            
            const result = await executeQuery(query, params, this.getStandardFetchInfo());
            
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
                    a.description as DESCRIPTION,
                    a.adoption_fee as ADOPTION_FEE,
                    addr.city as CITY,
                    addr.country as COUNTRY
                FROM animals a
                LEFT JOIN address addr ON a.address_id = addr.id
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
            
            const result = await executeQuery(query, params, this.getStandardFetchInfo());
            
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
                DESCRIPTION: 'Friendly golden retriever who loves fetch and swimming.',
                ADOPTION_FEE: 250.00,
                CITY: 'New York',
                COUNTRY: 'USA'
            },
            {
                ID: 2,
                NAME: 'Luna',
                SPECIES: 'Cat',
                BREED: 'Siamese',
                AGE: 2.0,
                DESCRIPTION: 'Vocal and social Siamese cat who loves attention.',
                ADOPTION_FEE: 180.00,
                CITY: 'Los Angeles',
                COUNTRY: 'USA'
            },
            {
                ID: 3,
                NAME: 'Max',
                SPECIES: 'Dog',
                BREED: 'Border Collie',
                AGE: 4.0,
                DESCRIPTION: 'Highly intelligent Border Collie who needs mental stimulation.',
                ADOPTION_FEE: 280.00,
                CITY: 'Chicago',
                COUNTRY: 'USA'
            },
            {
                ID: 4,
                NAME: 'Bella',
                SPECIES: 'Dog',
                BREED: 'Labrador',
                AGE: 2.5,
                DESCRIPTION: 'Active lab who loves running and swimming.',
                ADOPTION_FEE: 275.00,
                CITY: 'Houston',
                COUNTRY: 'USA'
            },
            {
                ID: 5,
                NAME: 'Whiskers',
                SPECIES: 'Cat',
                BREED: 'Persian',
                AGE: 5.0,
                DESCRIPTION: 'Calm senior cat who loves quiet spaces.',
                ADOPTION_FEE: 150.00,
                CITY: 'Phoenix',
                COUNTRY: 'USA'
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
            filteredPets.sort((a, b) => b.ADOPTION_FEE - a.ADOPTION_FEE);
        } else {
            filteredPets.sort((a, b) => b.ID - a.ID);
        }

        return filteredPets.slice(0, parseInt(limit)).map(pet => this.mapToEntity(pet));
    }
}

module.exports = new RSSFeedDTO();
