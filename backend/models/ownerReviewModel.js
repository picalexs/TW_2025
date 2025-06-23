const AbstractModel = require('./abstractModel');
const OwnerReviewDTO = require('../dto/ownerReviewDTO');

class OwnerReviewModel extends AbstractModel {
    constructor() {
        super(new OwnerReviewDTO());
    }
    
    async create(reviewData) {
        try {
            if (!reviewData.reviewer_id || !reviewData.reviewed_owner_id || !reviewData.adoption_id) {
                throw new Error('Required fields missing: reviewer_id, reviewed_owner_id, and adoption_id are required');
            }
            
            if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5) {
                throw new Error('Rating must be between 1 and 5');
            }
            
            const canReview = await this.dto.canUserReview(reviewData.reviewer_id, reviewData.adoption_id);
            if (!canReview.canReview) {
                throw new Error(canReview.reason);
            }
            return await this.dto.create(reviewData);
        } catch (error) {
            console.error('Error in OwnerReviewModel.create:', error);
            throw error;
        }
    }      
    
    async getByReviewedOwner(ownerId) {
        try {
            if (!ownerId) {
                throw new Error('Owner ID is required');
            }
            
            return await this.dto.getByReviewedOwner(ownerId);
        } catch (error) {
            console.error('Error in OwnerReviewModel.getByReviewedOwner:', error);
            throw error;
        }
    }      
    
    async getByReviewer(reviewerId) {
        try {
            if (!reviewerId) {
                throw new Error('Reviewer ID is required');
            }
            
            return await this.dto.getByReviewer(reviewerId);
        } catch (error) {
            console.error('Error in OwnerReviewModel.getByReviewer:', error);
            throw error;
        }
    }      
    
    async getByAdoption(adoptionId) {
        try {
            if (!adoptionId) {
                throw new Error('Adoption ID is required');
            }
            
            return await this.dto.getByAdoption(adoptionId);
        } catch (error) {
            console.error('Error in OwnerReviewModel.getByAdoption:', error);
            throw error;
        }
    }

    async canUserReview(reviewerId, adoptionId) {
        try {
            if (!reviewerId || !adoptionId) {
                throw new Error('Both reviewer ID and adoption ID are required');
            }
            
            return await this.dto.canUserReview(reviewerId, adoptionId);
        } catch (error) {
            console.error('Error in OwnerReviewModel.canUserReview:', error);
            throw error;
        }
    }      
    
    async getAverageRating(ownerId) {
        try {
            if (!ownerId) {
                throw new Error('Owner ID is required');
            }
            
            return await this.dto.getAverageRating(ownerId);
        } catch (error) {
            console.error('Error in OwnerReviewModel.getAverageRating:', error);
            throw error;
        }
    }

    async update(id, reviewData) {
        try {
            if (!id) {
                throw new Error('Review ID is required');
            }
            
            if (reviewData.rating && (reviewData.rating < 1 || reviewData.rating > 5)) {
                throw new Error('Rating must be between 1 and 5');
            }
            
            const existingReview = await this.dto.getById(id);
            if (!existingReview) {
                throw new Error('Review not found');
            }
            
            return await this.dto.update(id, reviewData);
        } catch (error) {
            console.error('Error in OwnerReviewModel.update:', error);
            throw error;
        }    
    }

    async getById(id) {
        try {
            if (!id) {
                throw new Error('Review ID is required');
            }
            
            return await this.dto.getById(id);
        } catch (error) {
            console.error('Error in OwnerReviewModel.getById:', error);
            throw error;
        }
    }
    
    async validateReviewPermissions(reviewerId, adoptionId) {
        const canReview = await this.canUserReview(reviewerId, adoptionId);
        if (!canReview.canReview) {
            throw new Error(`Cannot create review: ${canReview.reason}`);
        }
        return true;
    }
    
    async getOwnerReviewSummary(ownerId) {
        const [reviews, stats] = await Promise.all([
            this.getByReviewedOwner(ownerId),
            this.getAverageRating(ownerId)
        ]);
        
        return {
            reviews,
            statistics: stats,
            hasReviews: reviews.length > 0
        };
    }    async getOwnerReviewsWithStats(ownerId) {
        try {
            if (!ownerId) {
                throw new Error('Owner ID is required');
            }
        
            const reviews = await this.getByReviewedOwner(ownerId);
            
            const statistics = {
                total_reviews: reviews.length,
                average_rating: 0,
                average_communication: 0,
                average_pet_condition: 0,
                average_process: 0,
                recommendation_percentage: 0
            };
            
            if (reviews.length > 0) {
                const validRatings = reviews.filter(r => r.rating != null);
                const validCommunicationRatings = reviews.filter(r => r.communication_rating != null);
                const validPetConditionRatings = reviews.filter(r => r.pet_condition_rating != null);
                const validProcessRatings = reviews.filter(r => r.process_rating != null);
                
                if (validRatings.length > 0) {
                    statistics.average_rating = parseFloat((validRatings.reduce((sum, r) => sum + r.rating, 0) / validRatings.length).toFixed(1));
                }
                
                if (validCommunicationRatings.length > 0) {
                    statistics.average_communication = parseFloat((validCommunicationRatings.reduce((sum, r) => sum + r.communication_rating, 0) / validCommunicationRatings.length).toFixed(1));
                }
                
                if (validPetConditionRatings.length > 0) {
                    statistics.average_pet_condition = parseFloat((validPetConditionRatings.reduce((sum, r) => sum + r.pet_condition_rating, 0) / validPetConditionRatings.length).toFixed(1));
                }
                
                if (validProcessRatings.length > 0) {
                    statistics.average_process = parseFloat((validProcessRatings.reduce((sum, r) => sum + r.process_rating, 0) / validProcessRatings.length).toFixed(1));
                }
                
                const recommendedCount = reviews.filter(r => r.would_recommend === true).length;
                statistics.recommendation_percentage = Math.round((recommendedCount / reviews.length) * 100);
            }
            
            return {
                reviews,
                statistics
            };
        } catch (error) {
            console.error('Error in OwnerReviewModel.getOwnerReviewsWithStats:', error);
            throw error;
        }
    }

    async getReviewerReviews(reviewerId) {
        try {
            if (!reviewerId) {
                throw new Error('Reviewer ID is required');
            }
            
            return await this.dto.getReviewerReviews(reviewerId);
        } catch (error) {
            console.error('Error in OwnerReviewModel.getReviewerReviews:', error);
            throw error;
        }
    }

    async createReview(reviewData) {
        try {
            if (!reviewData.reviewer_id || !reviewData.reviewed_owner_id || !reviewData.adoption_id) {
                throw new Error('Required fields missing: reviewer_id, reviewed_owner_id, and adoption_id are required');
            }
            
            if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5) {
                throw new Error('Rating must be between 1 and 5');
            }
            
            const canReview = await this.dto.canUserReview(reviewData.reviewer_id, reviewData.adoption_id);
            if (!canReview.canReview) {
                throw new Error(canReview.reason);
            }

            return await this.dto.createReview(reviewData);
        } catch (error) {
            console.error('Error in OwnerReviewModel.createReview:', error);
            throw error;
        }
    }

    async updateReview(id, reviewData) {
        try {
            if (!id) {
                throw new Error('Review ID is required');
            }
            
            if (reviewData.rating && (reviewData.rating < 1 || reviewData.rating > 5)) {
                throw new Error('Rating must be between 1 and 5');
            }
            
            const existingReview = await this.dto.getById(id);
            if (!existingReview) {
                throw new Error('Review not found');
            }
            
            return await this.dto.updateReview(id, reviewData);
        } catch (error) {
            console.error('Error in OwnerReviewModel.updateReview:', error);
            throw error;
        }
    }

    async getAdoptionReview(adoptionId) {
        try {
            if (!adoptionId) {
                throw new Error('Adoption ID is required');
            }
            
            return await this.dto.getAdoptionReview(adoptionId);
        } catch (error) {
            console.error('Error in OwnerReviewModel.getAdoptionReview:', error);
            throw error;
        }
    }

    async checkUserCanReview(userId, adoptionId) {
        try {
            if (!userId || !adoptionId) {
                throw new Error('Both user ID and adoption ID are required');
            }
            
            return await this.dto.checkUserCanReview(userId, adoptionId);
        } catch (error) {
            console.error('Error in OwnerReviewModel.checkUserCanReview:', error);
            throw error;
        }
    }
}

module.exports = new OwnerReviewModel();