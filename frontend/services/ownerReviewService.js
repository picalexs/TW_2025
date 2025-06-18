import ApiService from './api.min.js';

export class OwnerReviewService {
    constructor() {
        this.api = new ApiService();
    }

    async getReviewsForOwner(ownerId) {
        try {
            const response = await this.api.get(`/api/owner-reviews/owner/${ownerId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching owner reviews:', error);
            throw error;
        }
    }

    async getReviewsByUser(userId) {
        try {
            const response = await this.api.get(`/api/owner-reviews/user/${userId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching user reviews:', error);
            throw error;
        }
    }

    async createReview(reviewData) {
        try {
            const response = await this.api.post('/api/owner-reviews', reviewData);
            return response.data;
        } catch (error) {
            console.error('Error creating owner review:', error);
            throw error;
        }
    }

    async updateReview(reviewId, reviewData) {
        try {
            const response = await this.api.put(`/api/owner-reviews/${reviewId}`, reviewData);
            return response.data;
        } catch (error) {
            console.error('Error updating owner review:', error);
            throw error;
        }
    }

    async getReviewByAdoption(adoptionId) {
        try {
            const response = await this.api.get(`/api/owner-reviews/adoption/${adoptionId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching adoption review:', error);
            throw error;
        }
    }

    async canUserReview(userId, adoptionId) {
        try {
            const response = await this.api.get(`/api/owner-reviews/can-review/${userId}/${adoptionId}`);
            return response.data;
        } catch (error) {
            console.error('Error checking review eligibility:', error);
            throw error;
        }
    }

    formatReviewForDisplay(review) {
        return {
            id: review.id,
            rating: review.rating,
            reviewText: review.review_text,
            communicationRating: review.communication_rating,
            petConditionRating: review.pet_condition_rating,
            processRating: review.process_rating,
            wouldRecommend: review.would_recommend,
            createdAt: new Date(review.created_at),
            reviewer: review.reviewer,
            animal: review.animal
        };
    }

    calculateReviewStatistics(reviews) {
        if (!reviews || reviews.length === 0) {
            return {
                averageRating: 0,
                totalReviews: 0,
                recommendationPercentage: 0,
                ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
            };
        }

        const totalReviews = reviews.length;
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / totalReviews;
        
        const recommendations = reviews.filter(review => review.would_recommend).length;
        const recommendationPercentage = (recommendations / totalReviews) * 100;

        const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach(review => {
            const rating = Math.floor(review.rating);
            if (ratingDistribution.hasOwnProperty(rating)) {
                ratingDistribution[rating]++;
            }
        });

        return {
            averageRating: Math.round(averageRating * 10) / 10,
            totalReviews,
            recommendationPercentage: Math.round(recommendationPercentage),
            ratingDistribution
        };
    }
}
