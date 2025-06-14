const AbstractModel = require('./abstractModel');

class OwnerReviewModel extends AbstractModel {
    constructor() {
        super('owner_reviews');
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

        const query = `
            INSERT INTO ${this.tableName} (
                reviewer_id, reviewed_owner_id, adoption_id, rating, review_text,
                communication_rating, pet_condition_rating, process_rating, would_recommend,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;

        const result = await this.db.execute(query, [
            reviewer_id,
            reviewed_owner_id,
            adoption_id,
            rating,
            review_text,
            communication_rating,
            pet_condition_rating,
            process_rating,
            would_recommend
        ]);

        return this.getById(result.lastrowid);
    }

    async getByReviewedOwner(ownerId) {
        const query = `
            SELECT or.*, 
                   u.first_name as reviewer_first_name,
                   u.last_name as reviewer_last_name,
                   u.profile_picture as reviewer_profile_picture,
                   u.username as reviewer_username,
                   a.animal_id,
                   an.name as animal_name,
                   an.species as animal_species
            FROM ${this.tableName} or
            JOIN users u ON or.reviewer_id = u.id
            JOIN adoptions a ON or.adoption_id = a.id
            JOIN animals an ON a.animal_id = an.id
            WHERE or.reviewed_owner_id = ?
            ORDER BY or.created_at DESC
        `;

        const rows = await this.db.all(query, [ownerId]);
        return rows;
    }

    async getByReviewer(reviewerId) {
        const query = `
            SELECT or.*, 
                   u.first_name as reviewed_owner_first_name,
                   u.last_name as reviewed_owner_last_name,
                   u.profile_picture as reviewed_owner_profile_picture,
                   u.username as reviewed_owner_username,
                   u.role as reviewed_owner_role,
                   a.animal_id,
                   an.name as animal_name,
                   an.species as animal_species
            FROM ${this.tableName} or
            JOIN users u ON or.reviewed_owner_id = u.id
            JOIN adoptions a ON or.adoption_id = a.id
            JOIN animals an ON a.animal_id = an.id
            WHERE or.reviewer_id = ?
            ORDER BY or.created_at DESC
        `;

        const rows = await this.db.all(query, [reviewerId]);
        return rows;
    }

    async getByAdoption(adoptionId) {
        const query = `
            SELECT or.*, 
                   u.first_name as reviewer_first_name,
                   u.last_name as reviewer_last_name,
                   u.profile_picture as reviewer_profile_picture,
                   u.username as reviewer_username
            FROM ${this.tableName} or
            JOIN users u ON or.reviewer_id = u.id
            WHERE or.adoption_id = ?
        `;

        const rows = await this.db.all(query, [adoptionId]);
        return rows.length > 0 ? rows[0] : null;
    }

    async canUserReview(reviewerId, adoptionId) {
        const query = `
            SELECT a.*, or.id as existing_review_id
            FROM adoptions a
            LEFT JOIN ${this.tableName} or ON a.id = or.adoption_id
            WHERE a.id = ? AND a.user_id = ? AND a.status = 'completed'
        `;

        const row = await this.db.get(query, [adoptionId, reviewerId]);
        
        if (!row) {
            return { canReview: false, reason: 'Adoption not found, not your adoption, or not completed' };
        }

        if (row.existing_review_id) {
            return { canReview: false, reason: 'Review already exists for this adoption' };
        }

        return { canReview: true };
    }

    async getAverageRating(ownerId) {
        const query = `
            SELECT 
                AVG(rating) as avg_rating,
                AVG(communication_rating) as avg_communication,
                AVG(pet_condition_rating) as avg_pet_condition,
                AVG(process_rating) as avg_process,
                COUNT(*) as total_reviews,
                SUM(would_recommend) as total_recommendations
            FROM ${this.tableName}
            WHERE reviewed_owner_id = ?
        `;

        const row = await this.db.get(query, [ownerId]);
        return {
            average_rating: row.avg_rating ? parseFloat(row.avg_rating).toFixed(1) : null,
            average_communication: row.avg_communication ? parseFloat(row.avg_communication).toFixed(1) : null,
            average_pet_condition: row.avg_pet_condition ? parseFloat(row.avg_pet_condition).toFixed(1) : null,
            average_process: row.avg_process ? parseFloat(row.avg_process).toFixed(1) : null,
            total_reviews: row.total_reviews || 0,
            recommendation_percentage: row.total_reviews > 0 ? ((row.total_recommendations / row.total_reviews) * 100).toFixed(0) : 0
        };
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

        const query = `
            UPDATE ${this.tableName} 
            SET rating = ?, review_text = ?, communication_rating = ?, 
                pet_condition_rating = ?, process_rating = ?, would_recommend = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        await this.db.run(query, [
            rating,
            review_text,
            communication_rating,
            pet_condition_rating,
            process_rating,
            would_recommend,
            id
        ]);

        return this.getById(id);
    }
}

module.exports = OwnerReviewModel;
