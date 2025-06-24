const AbstractDTO = require('./abstractDTO');
const ImagePathHandler = require("../utils/imagePathHandler");
const { executeQuery } = require('../db/dbConnection');
const oracledb = require('oracledb');
const validator = require('validator');

class OwnerReviewDTO extends AbstractDTO {
    constructor() {
        super('owner_reviews');
    }
    
    toEntity(data) {
        return {
            id: data.ID || data.id,
            reviewer_id: data.REVIEWER_ID || data.reviewer_id,
            reviewed_owner_id: data.REVIEWED_OWNER_ID || data.reviewed_owner_id,
            adoption_id: data.ADOPTION_ID || data.adoption_id,
            rating: data.RATING || data.rating,
            review_text: data.REVIEW_TEXT || data.review_text,
            communication_rating: data.COMMUNICATION_RATING || data.communication_rating,
            pet_condition_rating: data.PET_CONDITION_RATING || data.pet_condition_rating,
            process_rating: data.PROCESS_RATING || data.process_rating,
            would_recommend: Boolean(data.WOULD_RECOMMEND || data.would_recommend),
            created_at: data.CREATED_AT || data.created_at,
            updated_at: data.UPDATED_AT || data.updated_at,
            reviewer_first_name: data.REVIEWER_FIRST_NAME || data.reviewer_first_name,
            reviewer_last_name: data.REVIEWER_LAST_NAME || data.reviewer_last_name,
            reviewer_profile_picture: data.REVIEWER_PROFILE_PICTURE || data.reviewer_profile_picture,
            reviewer_username: data.REVIEWER_USERNAME || data.reviewer_username,
            reviewed_owner_first_name: data.REVIEWED_OWNER_FIRST_NAME || data.reviewed_owner_first_name,
            reviewed_owner_last_name: data.REVIEWED_OWNER_LAST_NAME || data.reviewed_owner_last_name,
            reviewed_owner_profile_picture: data.REVIEWED_OWNER_PROFILE_PICTURE || data.reviewed_owner_profile_picture,
            reviewed_owner_username: data.REVIEWED_OWNER_USERNAME || data.reviewed_owner_username,
            reviewed_owner_role: data.REVIEWED_OWNER_ROLE || data.reviewed_owner_role,
            animal_id: data.ANIMAL_ID || data.animal_id,
            animal_name: data.ANIMAL_NAME || data.animal_name,
            animal_species: data.ANIMAL_SPECIES || data.animal_species,
            animal_image_path: data.ANIMAL_IMAGE_PATH || data.animal_image_path
        };
    }

    mapToEntity(data) {
        if (Array.isArray(data)) {
            return data.map(item => this.toEntity(item));
        }
        return this.toEntity(data);
    }

    async create(reviewData) {
        const {
            reviewer_id,
            reviewed_owner_id,
            adoption_id,
            rating,
            review_text,
            communication_rating,
            pet_condition_rating,
            process_rating,
            would_recommend
        } = reviewData;

        try {
            const query = `
                INSERT INTO ${this.tableName} (
                    reviewer_id, reviewed_owner_id, adoption_id, rating, review_text,
                    communication_rating, pet_condition_rating, process_rating, would_recommend,
                    created_at, updated_at
                ) VALUES (:reviewer_id, :reviewed_owner_id, :adoption_id, :rating, :review_text, 
                         :communication_rating, :pet_condition_rating, :process_rating, :would_recommend, 
                         CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id INTO :id
            `;

            const safeReviewText = review_text != null ? validator.escape(review_text) : null;

            const binds = {
                reviewer_id,
                reviewed_owner_id,
                adoption_id,
                rating,
                review_text: safeReviewText,
                communication_rating,
                pet_condition_rating,
                process_rating,
                would_recommend,
                id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
            };

            const result = await executeQuery(query, binds, { autoCommit: true });
            const reviewId = result.outBinds.id[0];
            
            return await this.getById(reviewId);
        } catch (error) {
            console.error('Error in OwnerReviewDTO.create:', error);
            throw error;
        }
    }

    async getByReviewedOwner(ownerId) {
        try {
            const query = `
                SELECT ow.*, 
                       u.first_name as reviewer_first_name,
                       u.last_name as reviewer_last_name,
                       u.profile_picture as reviewer_profile_picture,
                       u.username as reviewer_username,
                       a.animal_id,
                       an.name as animal_name,
                       an.species as animal_species,
                       m.file_path as animal_image_path
                FROM ${this.tableName} ow
                JOIN users u ON ow.reviewer_id = u.id
                JOIN adoptions a ON ow.adoption_id = a.id
                JOIN animals an ON a.animal_id = an.id
                LEFT JOIN (
                    SELECT animal_id, file_path, 
                           ROW_NUMBER() OVER (PARTITION BY animal_id ORDER BY id) as rn
                    FROM media 
                    WHERE type = 'image' OR type IS NULL
                ) m ON an.id = m.animal_id AND m.rn = 1
                WHERE ow.reviewed_owner_id = :ownerId
                ORDER BY ow.created_at DESC
            `;

            const result = await executeQuery(query, { ownerId }, {
                outFormat: oracledb.OUT_FORMAT_OBJECT,
                fetchInfo: {
                    REVIEW_TEXT: { type: oracledb.STRING }
                }
            });            if (!result.rows) {
                return [];
            }

            return result.rows.map(row => {
                const review = {
                    id: row.ID,
                    reviewer_id: row.REVIEWER_ID,
                    reviewed_owner_id: row.REVIEWED_OWNER_ID,
                    adoption_id: row.ADOPTION_ID,
                    rating: row.RATING,
                    review_text: row.REVIEW_TEXT,
                    communication_rating: row.COMMUNICATION_RATING,
                    pet_condition_rating: row.PET_CONDITION_RATING,
                    process_rating: row.PROCESS_RATING,
                    would_recommend: row.WOULD_RECOMMEND === 1,
                    created_at: row.CREATED_AT,
                    updated_at: row.UPDATED_AT,
                    reviewer: {
                        id: row.REVIEWER_ID,
                        first_name: row.REVIEWER_FIRST_NAME,
                        last_name: row.REVIEWER_LAST_NAME,
                        profile_picture: this.fixImagePath(row.REVIEWER_PROFILE_PICTURE),
                        username: row.REVIEWER_USERNAME
                    },
                    animal: {
                        id: row.ANIMAL_ID,
                        name: row.ANIMAL_NAME,
                        species: row.ANIMAL_SPECIES,
                        image_path: this.fixImagePath(row.ANIMAL_IMAGE_PATH)
                    }
                };
                return review;
            });
        } catch (error) {
            console.error('Error in OwnerReviewDTO.getByReviewedOwner:', error);
            throw error;
        }
    }      fixImagePath(imagePath) {
        if (!imagePath) return null;
        
        if (imagePath.startsWith('http') || imagePath.startsWith('/api/static/')) {
            return imagePath;
        }
        
        let fixedPath = imagePath;
        
        if (!fixedPath.endsWith('.webp') && !fixedPath.startsWith('http')) {
            if (fixedPath.includes('.')) {
                fixedPath = fixedPath.replace(/\.[^.]+$/, '.webp');
            } else {
                fixedPath += '.webp';
            }
        }
        
        return fixedPath;
    }

    async getByReviewer(reviewerId) {
        try {
            const query = `
                SELECT ow.*, 
                       u.first_name as reviewed_owner_first_name,
                       u.last_name as reviewed_owner_last_name,
                       u.profile_picture as reviewed_owner_profile_picture,
                       u.username as reviewed_owner_username,
                       u.role as reviewed_owner_role,
                       a.animal_id,
                       an.name as animal_name,
                       an.species as animal_species,
                       m.file_path as animal_image_path
                FROM ${this.tableName} ow
                JOIN users u ON ow.reviewed_owner_id = u.id
                JOIN adoptions a ON ow.adoption_id = a.id
                JOIN animals an ON a.animal_id = an.id
                LEFT JOIN (
                    SELECT animal_id, file_path, 
                           ROW_NUMBER() OVER (PARTITION BY animal_id ORDER BY id) as rn
                    FROM media 
                    WHERE type = 'image' OR type IS NULL
                ) m ON an.id = m.animal_id AND m.rn = 1
                WHERE ow.reviewer_id = :reviewerId
                ORDER BY ow.created_at DESC
            `;

            const result = await executeQuery(query, { reviewerId }, {
                outFormat: oracledb.OUT_FORMAT_OBJECT,
                fetchInfo: {
                    REVIEW_TEXT: { type: oracledb.STRING }
                }
            });
            
            return result.rows || [];
        } catch (error) {
            console.error('Error in OwnerReviewDTO.getByReviewer:', error);
            throw error;
        }
    }

    async getByAdoption(adoptionId) {
        try {
            const query = `
                SELECT ow.*, 
                       u.first_name as reviewer_first_name,
                       u.last_name as reviewer_last_name,
                       u.profile_picture as reviewer_profile_picture,
                       u.username as reviewer_username
                FROM ${this.tableName} ow
                JOIN users u ON ow.reviewer_id = u.id
                WHERE ow.adoption_id = :adoptionId
            `;

            const result = await executeQuery(query, { adoptionId }, {
                outFormat: oracledb.OUT_FORMAT_OBJECT,
                fetchInfo: {
                    REVIEW_TEXT: { type: oracledb.STRING }
                }
            });
            
            return result.rows && result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            console.error('Error in OwnerReviewDTO.getByAdoption:', error);
            throw error;
        }
    }

    async canUserReview(reviewerId, adoptionId) {
        try {
            const query = `
                SELECT a.*, ow.id as existing_review_id
                FROM adoptions a
                LEFT JOIN ${this.tableName} ow ON a.id = ow.adoption_id
                WHERE a.id = :adoptionId AND a.user_id = :reviewerId AND a.status = 'completed'
            `;

            const result = await executeQuery(query, { adoptionId, reviewerId }, {
                outFormat: oracledb.OUT_FORMAT_OBJECT
            });
            
            const row = result.rows && result.rows.length > 0 ? result.rows[0] : null;
            
            if (!row) {
                return { canReview: false, reason: 'Adoption not found, not your adoption, or not completed' };
            }

            if (row.EXISTING_REVIEW_ID) {
                return { canReview: false, reason: 'Review already exists for this adoption' };
            }

            return { canReview: true };
        } catch (error) {
            console.error('Error in OwnerReviewDTO.canUserReview:', error);
            throw error;
        }
    }

    async getAverageRating(ownerId) {
        try {
            const query = `
                SELECT 
                    AVG(rating) as avg_rating,
                    AVG(communication_rating) as avg_communication,
                    AVG(pet_condition_rating) as avg_pet_condition,
                    AVG(process_rating) as avg_process,
                    COUNT(*) as total_reviews,
                    SUM(would_recommend) as total_recommendations
                FROM ${this.tableName}
                WHERE reviewed_owner_id = :ownerId
            `;

            const result = await executeQuery(query, { ownerId }, {
                outFormat: oracledb.OUT_FORMAT_OBJECT
            });
            
            const row = result.rows && result.rows.length > 0 ? result.rows[0] : null;
            
            if (!row) {
                return {
                    average_rating: null,
                    average_communication: null,
                    average_pet_condition: null,
                    average_process: null,
                    total_reviews: 0,
                    recommendation_percentage: 0
                };
            }
            
            return {
                average_rating: row.AVG_RATING ? parseFloat(row.AVG_RATING).toFixed(1) : null,
                average_communication: row.AVG_COMMUNICATION ? parseFloat(row.AVG_COMMUNICATION).toFixed(1) : null,
                average_pet_condition: row.AVG_PET_CONDITION ? parseFloat(row.AVG_PET_CONDITION).toFixed(1) : null,
                average_process: row.AVG_PROCESS ? parseFloat(row.AVG_PROCESS).toFixed(1) : null,
                total_reviews: row.TOTAL_REVIEWS || 0,
                recommendation_percentage: row.TOTAL_REVIEWS > 0 ? ((row.TOTAL_RECOMMENDATIONS / row.TOTAL_REVIEWS) * 100).toFixed(0) : 0
            };
        } catch (error) {
            console.error('Error in OwnerReviewDTO.getAverageRating:', error);
            throw error;
        }
    }

    async update(id, reviewData) {
        const {
            rating,
            review_text,
            communication_rating,
            pet_condition_rating,
            process_rating,
            would_recommend
        } = reviewData;

        try {
            const updates = [];
            const binds = { id };
            if (rating !== undefined) {
                updates.push("rating = :rating");
                binds.rating = rating;
            }
            if (review_text !== undefined) {
                updates.push("review_text = :review_text");
                binds.review_text = review_text != null ? validator.escape(review_text) : null;
            }
            if (communication_rating !== undefined) {
                updates.push("communication_rating = :communication_rating");
                binds.communication_rating = communication_rating;
            }
            if (pet_condition_rating !== undefined) {
                updates.push("pet_condition_rating = :pet_condition_rating");
                binds.pet_condition_rating = pet_condition_rating;
            }
            if (process_rating !== undefined) {
                updates.push("process_rating = :process_rating");
                binds.process_rating = process_rating;
            }
            if (would_recommend !== undefined) {
                updates.push("would_recommend = :would_recommend");
                binds.would_recommend = would_recommend;
            }
            if (updates.length === 0) {
                throw new Error("No fields to update");
            }
            updates.push("updated_at = CURRENT_TIMESTAMP");
            const query = `UPDATE ${this.tableName} SET ${updates.join(", ")} WHERE id = :id`;
            const result = await executeQuery(query, binds);
            if (result.rowsAffected === 0) {
                throw new Error("Review not found or not updated");
            }
            return { success: true, rowsAffected: result.rowsAffected };
        } catch (error) {
            console.error('Error in OwnerReviewDTO.update:', error);
            throw error;
        }    
    }

    async getById(id) {
        try {
            const query = `SELECT * FROM ${this.tableName} WHERE id = :id`;
            
            const result = await executeQuery(query, { id }, {
                outFormat: oracledb.OUT_FORMAT_OBJECT,
                fetchInfo: {
                    REVIEW_TEXT: { type: oracledb.STRING }
                }
            });
            
            return result.rows && result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            console.error('Error in OwnerReviewDTO.getById:', error);
            throw error;
        }
    }

    toOwnerReviewResponse(data) {
        const entity = this.toEntity(data);
        return {
            id: entity.id,
            rating: entity.rating,
            review_text: entity.review_text,
            communication_rating: entity.communication_rating,
            pet_condition_rating: entity.pet_condition_rating,
            process_rating: entity.process_rating,
            would_recommend: entity.would_recommend,
            created_at: entity.created_at,
            reviewer: {
                id: entity.reviewer_id,
                first_name: entity.reviewer_first_name,
                last_name: entity.reviewer_last_name,
                profile_picture: ImagePathHandler.processUserImagePath(entity.reviewer_profile_picture),
                username: entity.reviewer_username
            },
            animal: {
                id: entity.animal_id,
                name: entity.animal_name,
                species: entity.animal_species,
                imagePath: entity.animal_image_path
            }
        };
    }

    toReviewerResponse(data) {
        const entity = this.toEntity(data);
        return {
            id: entity.id,
            rating: entity.rating,
            review_text: entity.review_text,
            communication_rating: entity.communication_rating,
            pet_condition_rating: entity.pet_condition_rating,
            process_rating: entity.process_rating,
            would_recommend: entity.would_recommend,
            created_at: entity.created_at,
            reviewed_owner: {
                id: entity.reviewed_owner_id,
                first_name: entity.reviewed_owner_first_name,
                last_name: entity.reviewed_owner_last_name,
                profile_picture: ImagePathHandler.processUserImagePath(entity.reviewed_owner_profile_picture),
                username: entity.reviewed_owner_username,
                role: entity.reviewed_owner_role
            },
            animal: {
                id: entity.animal_id,
                name: entity.animal_name,
                species: entity.animal_species,
                imagePath: entity.animal_image_path
            }
        };
    }

    toRatingStatsResponse(data) {
        return {
            average_rating: data.average_rating ? parseFloat(data.average_rating) : null,
            average_communication: data.average_communication ? parseFloat(data.average_communication) : null,
            average_pet_condition: data.average_pet_condition ? parseFloat(data.average_pet_condition) : null,
            average_process: data.average_process ? parseFloat(data.average_process) : null,
            total_reviews: data.total_reviews || 0,
            recommendation_percentage: data.recommendation_percentage ? parseInt(data.recommendation_percentage) : 0
        };
    }

    async getOwnerReviewsWithStats(ownerId) {
        const reviews = await this.getByReviewedOwner(ownerId);
        const stats = await this.getAverageRating(ownerId);
        
        return {
            reviews: reviews.map(review => this.toOwnerReviewResponse(review)),
            statistics: this.toRatingStatsResponse(stats)
        };
    }

    async getReviewerReviews(reviewerId) {
        const reviews = await this.getByReviewer(reviewerId);
        return reviews.map(review => this.toReviewerResponse(review));
    }

    async createReview(reviewData) {
        const review = await this.create(reviewData);
        return this.toEntity(review);
    }

    async updateReview(id, reviewData) {
        const review = await this.update(id, reviewData);
        return this.toEntity(review);
    }

    async checkUserCanReview(reviewerId, adoptionId) {
        return await this.canUserReview(reviewerId, adoptionId);
    }

    async getAdoptionReview(adoptionId) {
        const review = await this.getByAdoption(adoptionId);
        return review ? this.toEntity(review) : null;
    }
}

module.exports = OwnerReviewDTO;
