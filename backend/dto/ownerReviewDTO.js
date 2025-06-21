const AbstractDTO = require('./abstractDTO');
const ImagePathHandler = require("../utils/imagePathHandler");

class OwnerReviewDTO extends AbstractDTO {
    constructor() {
        super();
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

    async getByOwner(ownerId) {
        const OwnerReviewModel = require('../models/ownerReviewModel');
        const model = new OwnerReviewModel();
        
        const reviews = await model.getByReviewedOwner(ownerId);
        const stats = await model.getAverageRating(ownerId);
        
        return {
            reviews: reviews.map(review => this.toOwnerReviewResponse(review)),
            statistics: this.toRatingStatsResponse(stats)
        };
    }

    async getByReviewer(reviewerId) {
        const OwnerReviewModel = require('../models/ownerReviewModel');
        const model = new OwnerReviewModel();
        
        const reviews = await model.getByReviewer(reviewerId);
        return reviews.map(review => this.toReviewerResponse(review));
    }

    async create(reviewData) {
        const OwnerReviewModel = require('../models/ownerReviewModel');
        const model = new OwnerReviewModel();
        
        const review = await model.create(reviewData);
        return this.toEntity(review);
    }

    async update(id, reviewData) {
        const OwnerReviewModel = require('../models/ownerReviewModel');
        const model = new OwnerReviewModel();
        
        const review = await model.update(id, reviewData);
        return this.toEntity(review);
    }

    async canUserReview(reviewerId, adoptionId) {
        const OwnerReviewModel = require('../models/ownerReviewModel');
        const model = new OwnerReviewModel();
        
        return await model.canUserReview(reviewerId, adoptionId);
    }

    async getByAdoption(adoptionId) {
        const OwnerReviewModel = require('../models/ownerReviewModel');
        const model = new OwnerReviewModel();
        
        const review = await model.getByAdoption(adoptionId);
        return review ? this.toEntity(review) : null;
    }
}

module.exports = OwnerReviewDTO;
