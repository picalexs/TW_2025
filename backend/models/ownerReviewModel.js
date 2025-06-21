const AbstractModel = require('./abstractModel');
const { executeQuery } = require('../db/dbConnection');
const oracledb = require('oracledb');

class OwnerReviewModel extends AbstractModel {
    constructor() {
        super('owner_reviews');
        this.tableName = 'owner_reviews';
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

            const binds = {
                reviewer_id,
                reviewed_owner_id,
                adoption_id,
                rating,
                review_text,
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
            console.error('Error in OwnerReviewModel.create:', error);
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
            });
            
            return result.rows || [];
        } catch (error) {
            console.error('Error in OwnerReviewModel.getByReviewedOwner:', error);
            throw error;
        }
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
            console.error('Error in OwnerReviewModel.getByReviewer:', error);
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
            console.error('Error in OwnerReviewModel.getByAdoption:', error);
            throw error;
        }
    
    
    }async canUserReview(reviewerId, adoptionId) {
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
            console.error('Error in OwnerReviewModel.canUserReview:', error);
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
            console.error('Error in OwnerReviewModel.getAverageRating:', error);
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
            const query = `
                UPDATE ${this.tableName} 
                SET rating = :rating, review_text = :review_text, communication_rating = :communication_rating, 
                    pet_condition_rating = :pet_condition_rating, process_rating = :process_rating, would_recommend = :would_recommend,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
            `;

            const binds = {
                rating,
                review_text,
                communication_rating,
                pet_condition_rating,
                process_rating,
                would_recommend,
                id
            };

            await executeQuery(query, binds, { autoCommit: true });
            return await this.getById(id);
        } catch (error) {
            console.error('Error in OwnerReviewModel.update:', error);
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
            console.error('Error in OwnerReviewModel.getById:', error);
            throw error;
        }
    }
}

module.exports = OwnerReviewModel;
