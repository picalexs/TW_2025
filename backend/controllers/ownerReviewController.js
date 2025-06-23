const ownerReviewModel = require('../models/ownerReviewModel');
const { sendResponse } = require('../utils/helpers');

class OwnerReviewController {
    async getReviewsForOwner(req, res) {
        try {
            const { ownerId } = req.params;
            
            if (!ownerId || isNaN(ownerId)) {
                return sendResponse(res, 400, {
                    success: false,
                    message: 'Valid owner ID is required'
                });
            }

            const result = await ownerReviewModel.getOwnerReviewsWithStats(parseInt(ownerId));
            
            sendResponse(res, 200, {
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Error fetching owner reviews:', error);
            sendResponse(res, 500, {
                success: false,
                message: 'Failed to fetch owner reviews',
                error: error.message
            });
        }
    }

    async getReviewsByUser(req, res) {
        try {
            const { userId } = req.params;
            
            if (!userId || isNaN(userId)) {
                return sendResponse(res, 400, {
                    success: false,
                    message: 'Valid user ID is required'
                });
            }

            const reviews = await ownerReviewModel.getReviewerReviews(parseInt(userId));
            
            sendResponse(res, 200, {
                success: true,
                data: reviews
            });
        } catch (error) {
            console.error('Error fetching user reviews:', error);
            sendResponse(res, 500, {
                success: false,
                message: 'Failed to fetch user reviews',
                error: error.message
            });
        }
    }

    async createReview(req, res) {
        try {
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
            } = req.body;          

            if (!reviewer_id || !reviewed_owner_id || !adoption_id || !rating) {
                return sendResponse(res, 400, {
                    success: false,
                    message: 'Reviewer ID, reviewed owner ID, adoption ID, and rating are required'
                });
            }

            if (rating < 1 || rating > 5) {
                return sendResponse(res, 400, {
                    success: false,
                    message: 'Rating must be between 1 and 5'
                });
            }

            if (communication_rating && (communication_rating < 1 || communication_rating > 5)) {
                return sendResponse(res, 400, {
                    success: false,
                    message: 'Communication rating must be between 1 and 5'
                });
            }

            if (pet_condition_rating && (pet_condition_rating < 1 || pet_condition_rating > 5)) {
                return sendResponse(res, 400, {
                    success: false,
                    message: 'Pet condition rating must be between 1 and 5'
                });
            }

            if (process_rating && (process_rating < 1 || process_rating > 5)) {
                return sendResponse(res, 400, {
                    success: false,
                    message: 'Process rating must be between 1 and 5'
                });
            }

            const canReview = await ownerReviewModel.canUserReview(reviewer_id, adoption_id);
              if (!canReview.canReview) {
                return sendResponse(res, 403, {
                    success: false,
                    message: canReview.reason
                });
            }

            const reviewData = {
                reviewer_id,
                reviewed_owner_id,
                adoption_id,
                rating,
                review_text: review_text || null,
                communication_rating: communication_rating || null,
                pet_condition_rating: pet_condition_rating || null,
                process_rating: process_rating || null,
                would_recommend: would_recommend !== undefined ? would_recommend : 1
            };            const review = await ownerReviewModel.createReview(reviewData);
            
            sendResponse(res, 201, {
                success: true,
                message: 'Review created successfully',
                data: review
            });
        } catch (error) {
            console.error('Error creating owner review:', error);
            sendResponse(res, 500, {
                success: false,
                message: 'Failed to create review',
                error: error.message
            });
        }
    }

    async updateReview(req, res) {
        try {
            const { reviewId } = req.params;
            const {
                rating,
                review_text,
                communication_rating,
                pet_condition_rating,
                process_rating,
                would_recommend
            } = req.body;            
            
            if (!reviewId || isNaN(reviewId)) {
                return sendResponse(res, 400, {
                    success: false,
                    message: 'Valid review ID is required'
                });
            }

            if (rating && (rating < 1 || rating > 5)) {
                return sendResponse(res, 400, {
                    success: false,
                    message: 'Rating must be between 1 and 5'
                });
            }

            if (communication_rating && (communication_rating < 1 || communication_rating > 5)) {
                return sendResponse(res, 400, {
                    success: false,
                    message: 'Communication rating must be between 1 and 5'
                });
            }

            if (pet_condition_rating && (pet_condition_rating < 1 || pet_condition_rating > 5)) {
                return sendResponse(res, 400, {
                    success: false,
                    message: 'Pet condition rating must be between 1 and 5'
                });
            }

            if (process_rating && (process_rating < 1 || process_rating > 5)) {
                return sendResponse(res, 400, {
                    success: false,
                    message: 'Process rating must be between 1 and 5'
                });
            }

            const reviewData = {
                rating,
                review_text,
                communication_rating,
                pet_condition_rating,
                process_rating,
                would_recommend
            };

            Object.keys(reviewData).forEach(key => {
                if (reviewData[key] === undefined) {
                    delete reviewData[key];
                }            });            
            const review = await ownerReviewModel.updateReview(parseInt(reviewId), reviewData);
            
            sendResponse(res, 200, {
                success: true,
                message: 'Review updated successfully',
                data: review
            });
        } catch (error) {
            console.error('Error updating owner review:', error);
            sendResponse(res, 500, {
                success: false,
                message: 'Failed to update review',
                error: error.message
            });
        }
    }

    async getReviewByAdoption(req, res) {
        try {
            const { adoptionId } = req.params;
              if (!adoptionId || isNaN(adoptionId)) {
                return sendResponse(res, 400, {
                    success: false,
                    message: 'Valid adoption ID is required'
                });
            }

            const review = await ownerReviewModel.getAdoptionReview(parseInt(adoptionId));
            
            sendResponse(res, 200, {
                success: true,
                data: review
            });
        } catch (error) {
            console.error('Error fetching adoption review:', error);
            sendResponse(res, 500, {
                success: false,
                message: 'Failed to fetch adoption review',
                error: error.message
            });
        }
    }

    async checkCanReview(req, res) {
        try {
            const { userId, adoptionId } = req.params;
              if (!userId || isNaN(userId) || !adoptionId || isNaN(adoptionId)) {
                return sendResponse(res, 400, {
                    success: false,
                    message: 'Valid user ID and adoption ID are required'
                });
            }

            const result = await ownerReviewModel.checkUserCanReview(parseInt(userId), parseInt(adoptionId));
            
            sendResponse(res, 200, {
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Error checking review eligibility:', error);
            sendResponse(res, 500, {
                success: false,
                message: 'Failed to check review eligibility',
                error: error.message
            });
        }
    }
}
module.exports = OwnerReviewController;