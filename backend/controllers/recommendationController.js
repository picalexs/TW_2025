const oracledb = require('oracledb');
const { getPool } = require('../db/dbConnection');
const { sendResponse } = require('../utils/helpers');

class RecommendationController {
    /**
     * Get intelligent pet recommendations for a user
     * Uses the pet_matching_engine PL/SQL package
     */
    async getSmartRecommendations(req, res) {
        const userId = req.params.userId || req.user?.id;
        const limit = parseInt(req.query.limit) || 10;
        
        let connection;
        try {
            if (!userId) {
                return sendResponse(res, 400, { 
                    error: 'User ID is required',
                    code: 'MISSING_USER_ID'
                });
            }

            connection = await getPool().getConnection();
            
            // Call the smart recommendations function
            const result = await connection.execute(
                `SELECT 
                    pet_id,
                    pet_name,
                    compatibility_score,
                    distance_km,
                    match_reasons,
                    recommendation_strength
                FROM TABLE(pet_matching_engine.get_smart_recommendations(:userId, :limit))
                ORDER BY compatibility_score DESC`,
                { 
                    userId: parseInt(userId),
                    limit: limit 
                },
                { 
                    outFormat: oracledb.OUT_FORMAT_OBJECT,
                    fetchArraySize: 100 
                }
            );
            
            // Enhance recommendations with additional pet data
            const enhancedRecommendations = await Promise.all(
                result.rows.map(async (rec) => {
                    try {
                        const petDetails = await connection.execute(
                            `SELECT 
                                a.id, a.name, a.species, a.breed, a.age, a.size, 
                                a.description, a.image_path, a.adoption_status,
                                am.favorites_count, am.views_count
                            FROM animals a
                            LEFT JOIN animal_metrics am ON a.id = am.animal_id
                            WHERE a.id = :petId`,
                            { petId: rec.PET_ID },
                            { outFormat: oracledb.OUT_FORMAT_OBJECT }
                        );
                        
                        return {
                            ...rec,
                            petDetails: petDetails.rows[0] || null,
                            compatibilityPercentage: Math.round(rec.COMPATIBILITY_SCORE || 0),
                            matchStrength: rec.RECOMMENDATION_STRENGTH,
                            reasons: rec.MATCH_REASONS
                        };
                    } catch (detailError) {
                        console.error('Error fetching pet details for recommendation:', detailError);
                        return {
                            ...rec,
                            petDetails: null,
                            compatibilityPercentage: Math.round(rec.COMPATIBILITY_SCORE || 0)
                        };
                    }
                })
            );
            
            sendResponse(res, 200, {
                recommendations: enhancedRecommendations,
                totalFound: result.rows.length,
                algorithm: 'smart_matching_v2',
                generatedAt: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Error getting smart recommendations:', error);
            
            // Handle specific Oracle errors
            if (error.message.includes('ORA-00942')) {
                sendResponse(res, 500, { 
                    error: 'Recommendation system not properly configured',
                    code: 'SYSTEM_NOT_CONFIGURED',
                    message: 'Please contact administrator'
                });
            } else if (error.message.includes('ORA-20001')) {
                sendResponse(res, 400, { 
                    error: 'Invalid user preferences',
                    code: 'INVALID_PREFERENCES',
                    message: 'Please update your adoption preferences'
                });
            } else {
                sendResponse(res, 500, { 
                    error: 'Failed to generate recommendations',
                    code: 'RECOMMENDATION_ERROR',
                    message: error.message 
                });
            }
        } finally {
            if (connection) {
                await connection.close();
            }
        }
    }
    
    /**
     * Calculate compatibility score between a user and specific pet
     */
    async getCompatibilityScore(req, res) {
        const { userId, petId } = req.params;
        
        let connection;
        try {
            if (!userId || !petId) {
                return sendResponse(res, 400, { 
                    error: 'Both user ID and pet ID are required',
                    code: 'MISSING_PARAMETERS'
                });
            }

            connection = await getPool().getConnection();
            
            const result = await connection.execute(
                `SELECT pet_matching_engine.calculate_compatibility(:userId, :petId) as compatibility_score FROM DUAL`,
                { 
                    userId: parseInt(userId),
                    petId: parseInt(petId)
                },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            
            const score = result.rows[0]?.COMPATIBILITY_SCORE || 0;
            
            // Get detailed breakdown
            const breakdown = await connection.execute(
                `SELECT 
                    compatibility_score,
                    preference_score,
                    distance_score,
                    lifestyle_score,
                    calculated_at
                FROM compatibility_scores 
                WHERE user_id = :userId AND pet_id = :petId`,
                { userId: parseInt(userId), petId: parseInt(petId) },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            
            sendResponse(res, 200, {
                userId: parseInt(userId),
                petId: parseInt(petId),
                compatibilityScore: Math.round(score),
                breakdown: breakdown.rows[0] || null,
                interpretation: this.interpretCompatibilityScore(score),
                calculatedAt: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Error calculating compatibility:', error);
            sendResponse(res, 500, { 
                error: 'Failed to calculate compatibility',
                code: 'COMPATIBILITY_ERROR',
                message: error.message 
            });
        } finally {
            if (connection) {
                await connection.close();
            }
        }
    }
    
    /**
     * Refresh user's recommendation scores
     */
    async refreshUserRecommendations(req, res) {
        const userId = req.params.userId || req.user?.id;
        
        let connection;
        try {
            if (!userId) {
                return sendResponse(res, 400, { 
                    error: 'User ID is required',
                    code: 'MISSING_USER_ID'
                });
            }

            connection = await getPool().getConnection();
            
            // Call the refresh procedure
            await connection.execute(
                `BEGIN pet_matching_engine.refresh_user_scores(:userId); END;`,
                { userId: parseInt(userId) }
            );
            
            await connection.commit();
            
            sendResponse(res, 200, {
                message: 'Recommendations refreshed successfully',
                userId: parseInt(userId),
                refreshedAt: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Error refreshing recommendations:', error);
            sendResponse(res, 500, { 
                error: 'Failed to refresh recommendations',
                code: 'REFRESH_ERROR',
                message: error.message 
            });
        } finally {
            if (connection) {
                await connection.close();
            }
        }
    }
    
    /**
     * Get optimized care schedule for a pet
     */
    async getOptimizedCareSchedule(req, res) {
        const { petId } = req.params;
        const targetDate = req.query.date || new Date().toISOString().split('T')[0];
        const startHour = parseInt(req.query.startHour) || 6;
        const endHour = parseInt(req.query.endHour) || 22;
        
        let connection;
        try {
            if (!petId) {
                return sendResponse(res, 400, { 
                    error: 'Pet ID is required',
                    code: 'MISSING_PET_ID'
                });
            }

            connection = await getPool().getConnection();
            
            // Call the optimization function
            const result = await connection.execute(
                `SELECT 
                    activity_name,
                    start_time,
                    end_time,
                    priority_level,
                    efficiency_score,
                    conflict_resolution
                FROM TABLE(care_schedule_optimizer.optimize_daily_schedule(:petId, TO_DATE(:targetDate, 'YYYY-MM-DD'), :startHour, :endHour))
                ORDER BY start_time`,
                { 
                    petId: parseInt(petId),
                    targetDate: targetDate,
                    startHour: startHour,
                    endHour: endHour
                },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            
            // Calculate overall schedule efficiency
            const efficiencyResult = await connection.execute(
                `SELECT care_schedule_optimizer.calculate_schedule_efficiency(:petId, TO_DATE(:targetDate, 'YYYY-MM-DD')) as efficiency FROM DUAL`,
                { 
                    petId: parseInt(petId),
                    targetDate: targetDate
                },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            
            const overallEfficiency = efficiencyResult.rows[0]?.EFFICIENCY || 0;
            
            sendResponse(res, 200, {
                petId: parseInt(petId),
                scheduleDate: targetDate,
                schedule: result.rows.map(row => ({
                    activity: row.ACTIVITY_NAME,
                    startTime: row.START_TIME,
                    endTime: row.END_TIME,
                    priority: row.PRIORITY_LEVEL,
                    efficiency: Math.round(row.EFFICIENCY_SCORE || 0),
                    notes: row.CONFLICT_RESOLUTION
                })),
                overallEfficiency: Math.round(overallEfficiency),
                totalActivities: result.rows.length,
                optimizedAt: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Error optimizing care schedule:', error);
            sendResponse(res, 500, { 
                error: 'Failed to optimize care schedule',
                code: 'SCHEDULE_OPTIMIZATION_ERROR',
                message: error.message 
            });
        } finally {
            if (connection) {
                await connection.close();
            }
        }
    }
    
    /**
     * Get weekly care optimization report
     */
    async getWeeklyCareReport(req, res) {
        const { petId } = req.params;
        const weekStart = req.query.weekStart || this.getCurrentWeekStart();
        
        let connection;
        try {
            if (!petId) {
                return sendResponse(res, 400, { 
                    error: 'Pet ID is required',
                    code: 'MISSING_PET_ID'
                });
            }

            connection = await getPool().getConnection();
            
            // Generate weekly report
            const result = await connection.execute(
                `SELECT care_schedule_optimizer.generate_weekly_report(:petId, TO_DATE(:weekStart, 'YYYY-MM-DD')) as report FROM DUAL`,
                { 
                    petId: parseInt(petId),
                    weekStart: weekStart
                },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            
            const reportText = result.rows[0]?.REPORT || 'No report available';
            
            // Also get structured data for charts/graphs
            const metricsResult = await connection.execute(
                `SELECT 
                    schedule_date,
                    AVG(efficiency_score) as daily_efficiency,
                    COUNT(*) as activities_count,
                    SUM(conflicts_resolved) as conflicts_resolved
                FROM optimized_schedules 
                WHERE pet_id = :petId 
                AND schedule_date BETWEEN TO_DATE(:weekStart, 'YYYY-MM-DD') 
                AND TO_DATE(:weekStart, 'YYYY-MM-DD') + 6
                GROUP BY schedule_date
                ORDER BY schedule_date`,
                { 
                    petId: parseInt(petId),
                    weekStart: weekStart
                },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            
            sendResponse(res, 200, {
                petId: parseInt(petId),
                weekStart: weekStart,
                reportText: reportText,
                dailyMetrics: metricsResult.rows.map(row => ({
                    date: row.SCHEDULE_DATE,
                    efficiency: Math.round(row.DAILY_EFFICIENCY || 0),
                    activitiesCount: row.ACTIVITIES_COUNT || 0,
                    conflictsResolved: row.CONFLICTS_RESOLVED || 0
                })),
                generatedAt: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Error generating weekly report:', error);
            sendResponse(res, 500, { 
                error: 'Failed to generate weekly report',
                code: 'REPORT_GENERATION_ERROR',
                message: error.message 
            });
        } finally {
            if (connection) {
                await connection.close();
            }
        }
    }
    
    // Helper methods
    interpretCompatibilityScore(score) {
        if (score >= 80) return { level: 'Excellent', message: 'Perfect match! This pet would be ideal for you.' };
        if (score >= 65) return { level: 'Very Good', message: 'Great compatibility. Highly recommended.' };
        if (score >= 50) return { level: 'Good', message: 'Good match with some minor considerations.' };
        if (score >= 35) return { level: 'Fair', message: 'Possible match but may require adjustments.' };
        return { level: 'Low', message: 'Limited compatibility. Consider other options.' };
    }
    
    getCurrentWeekStart() {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - dayOfWeek);
        return weekStart.toISOString().split('T')[0];
    }

    /**
     * Get detailed compatibility score between a user and specific pet using advanced algorithms
     */
    async getCompatibilityScore(req, res, userId, petId) {
        let connection;
        try {
            connection = await getPool().getConnection();

            // Call the advanced compatibility scoring function from our new package
            const result = await connection.execute(
                `BEGIN
                    :score := pet_intelligence_pkg.calculate_compatibility_score(
                        p_user_id => :userId,
                        p_animal_id => :petId
                    );
                END;`,
                {
                    userId: { val: userId, type: oracledb.NUMBER },
                    petId: { val: petId, type: oracledb.NUMBER },
                    score: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
                }
            );

            const compatibilityScore = result.outBinds.score || 0;

            // Get detailed explanation using the reasoning function
            const explanationResult = await connection.execute(
                `BEGIN
                    :explanation := pet_intelligence_pkg.get_recommendation_reasoning(
                        p_user_id => :userId,
                        p_animal_id => :petId,
                        p_compatibility_score => :score
                    );
                END;`,
                {
                    userId: { val: userId, type: oracledb.NUMBER },
                    petId: { val: petId, type: oracledb.NUMBER },
                    score: { val: compatibilityScore, type: oracledb.NUMBER },
                    explanation: { dir: oracledb.BIND_OUT, type: oracledb.CLOB }
                }
            );

            let explanationText = '';
            if (explanationResult.outBinds.explanation) {
                explanationText = await explanationResult.outBinds.explanation.getData();
            }

            const explanation = explanationText ? JSON.parse(explanationText) : {};

            sendResponse(res, 200, {
                success: true,
                data: {
                    userId,
                    petId,
                    compatibilityScore: Math.round(compatibilityScore * 100) / 100,
                    compatibilityPercentage: Math.round(compatibilityScore * 100),
                    explanation,
                    algorithm: 'advanced_multi_factor_analysis',
                    generatedAt: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Error getting compatibility score:', error);
            sendResponse(res, 500, {
                success: false,
                error: 'Failed to calculate compatibility',
                message: error.message,
                code: 'COMPATIBILITY_CALCULATION_ERROR'
            });
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (err) {
                    console.error('Error closing connection:', err);
                }
            }
        }
    }

    /**
     * Analyze user behavior and generate insights
     */
    async analyzeUserBehavior(req, res, userId) {
        let connection;
        try {
            connection = await getPool().getConnection();

            // Call the advanced behavior analysis function
            const result = await connection.execute(
                `BEGIN
                    :analysis := pet_intelligence_pkg.analyze_user_behavior(
                        p_user_id => :userId
                    );
                END;`,
                {
                    userId: { val: userId, type: oracledb.NUMBER },
                    analysis: { dir: oracledb.BIND_OUT, type: oracledb.CLOB }
                }
            );

            let analysisText = '';
            if (result.outBinds.analysis) {
                analysisText = await result.outBinds.analysis.getData();
            }

            const behaviorAnalysis = analysisText ? JSON.parse(analysisText) : {};

            sendResponse(res, 200, {
                success: true,
                data: behaviorAnalysis,
                meta: {
                    userId,
                    analysis_timestamp: new Date().toISOString(),
                    algorithm: 'behavior_pattern_analysis'
                }
            });

        } catch (error) {
            console.error('Error analyzing user behavior:', error);
            sendResponse(res, 500, {
                success: false,
                error: 'Failed to analyze behavior',
                message: error.message,
                code: 'BEHAVIOR_ANALYSIS_ERROR'
            });
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (err) {
                    console.error('Error closing connection:', err);
                }
            }
        }
    }

    /**
     * Get trending pets in user's geographic area
     */
    async getTrendingPets(req, res, userId, radius = 50) {
        let connection;
        try {
            connection = await getPool().getConnection();

            // Call the trending pets function
            const result = await connection.execute(
                `BEGIN
                    :trending := pet_intelligence_pkg.get_trending_pets(
                        p_user_id => :userId,
                        p_radius_km => :radius
                    );
                END;`,
                {
                    userId: { val: userId, type: oracledb.NUMBER },
                    radius: { val: radius, type: oracledb.NUMBER },
                    trending: { dir: oracledb.BIND_OUT, type: oracledb.CLOB }
                }
            );

            let trendingText = '';
            if (result.outBinds.trending) {
                trendingText = await result.outBinds.trending.getData();
            }

            const trendingPets = trendingText ? JSON.parse(trendingText) : [];

            sendResponse(res, 200, {
                success: true,
                data: trendingPets,
                meta: {
                    userId,
                    radius_km: radius,
                    count: trendingPets.length,
                    algorithm: 'geographic_popularity_analysis',
                    generatedAt: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Error getting trending pets:', error);
            sendResponse(res, 500, {
                success: false,
                error: 'Failed to get trending pets',
                message: error.message,
                code: 'TRENDING_ANALYSIS_ERROR'
            });
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (err) {
                    console.error('Error closing connection:', err);
                }
            }
        }
    }

    /**
     * Predict adoption success probability using machine learning algorithms
     */
    async predictAdoptionSuccess(req, res, userId, petId) {
        let connection;
        try {
            connection = await getPool().getConnection();

            // Call the adoption success prediction function
            const result = await connection.execute(
                `BEGIN
                    :prediction := pet_intelligence_pkg.predict_adoption_success(
                        p_user_id => :userId,
                        p_animal_id => :petId
                    );
                END;`,
                {
                    userId: { val: userId, type: oracledb.NUMBER },
                    petId: { val: petId, type: oracledb.NUMBER },
                    prediction: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
                }
            );

            const successProbability = result.outBinds.prediction || 0;

            // Get factors influencing the prediction
            const factorsResult = await connection.execute(
                `SELECT 
                    'compatibility' as factor_type,
                    pet_intelligence_pkg.calculate_compatibility_score(:userId, :petId) as factor_value,
                    'Higher compatibility increases success probability' as description
                FROM dual
                UNION ALL
                SELECT 
                    'user_experience' as factor_type,
                    COALESCE(up.experience_level, 'beginner') as factor_value,
                    'Experience level affects success rates' as description
                FROM user_preferences up 
                WHERE up.user_id = :userId
                UNION ALL
                SELECT 
                    'pet_characteristics' as factor_type,
                    a.species || ' - ' || COALESCE(ac.energy_level, 'unknown') as factor_value,
                    'Pet energy level matching user lifestyle' as description
                FROM animals a
                LEFT JOIN animal_characteristics ac ON a.id = ac.animal_id
                WHERE a.id = :petId`,
                {
                    userId: { val: userId, type: oracledb.NUMBER },
                    petId: { val: petId, type: oracledb.NUMBER }
                },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const influencingFactors = factorsResult.rows.map(row => ({
                factor: row.FACTOR_TYPE,
                value: row.FACTOR_VALUE,
                description: row.DESCRIPTION
            }));

            const probabilityPercentage = Math.round(successProbability * 100);
            
            sendResponse(res, 200, {
                success: true,
                data: {
                    userId,
                    petId,
                    successProbability: Math.round(successProbability * 100) / 100,
                    probabilityPercentage,
                    influencingFactors,
                    recommendation: probabilityPercentage > 70 ? 'Highly Recommended' : 
                                   probabilityPercentage > 50 ? 'Recommended' : 
                                   'Consider Other Options',
                    algorithm: 'machine_learning_prediction',
                    confidence: probabilityPercentage > 80 ? 'High' : 
                               probabilityPercentage > 60 ? 'Medium' : 'Low'
                }
            });

        } catch (error) {
            console.error('Error predicting adoption success:', error);
            sendResponse(res, 500, {
                success: false,
                error: 'Failed to predict adoption success',
                message: error.message,
                code: 'PREDICTION_ERROR'
            });
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (err) {
                    console.error('Error closing connection:', err);
                }
            }
        }
    }

    /**
     * Get comprehensive analytics dashboard for advanced insights
     */
    async getAnalyticsDashboard(req, res, userId) {
        let connection;
        try {
            connection = await getPool().getConnection();

            // Get multiple analytics in parallel
            const [behaviorAnalysis, trendingPets, userStats] = await Promise.all([
                this._getBehaviorAnalysisData(connection, userId),
                this._getTrendingPetsData(connection, userId),
                this._getUserStatsData(connection, userId)
            ]);

            const dashboardData = {
                userId,
                behaviorAnalysis,
                trendingPets,
                userStats,
                generatedAt: new Date().toISOString(),
                dataFreshness: 'real-time'
            };

            sendResponse(res, 200, {
                success: true,
                data: dashboardData,
                meta: {
                    components: ['behavior_analysis', 'trending_pets', 'user_statistics'],
                    algorithm: 'comprehensive_analytics'
                }
            });

        } catch (error) {
            console.error('Error getting analytics dashboard:', error);
            sendResponse(res, 500, {
                success: false,
                error: 'Failed to get analytics dashboard',
                message: error.message,
                code: 'DASHBOARD_ERROR'
            });
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (err) {
                    console.error('Error closing connection:', err);
                }
            }
        }
    }

    // Helper methods for analytics dashboard
    async _getBehaviorAnalysisData(connection, userId) {
        try {
            const result = await connection.execute(
                `BEGIN
                    :analysis := pet_intelligence_pkg.analyze_user_behavior(:userId);
                END;`,
                {
                    userId: { val: userId, type: oracledb.NUMBER },
                    analysis: { dir: oracledb.BIND_OUT, type: oracledb.CLOB }
                }
            );

            if (result.outBinds.analysis) {
                const analysisText = await result.outBinds.analysis.getData();
                return analysisText ? JSON.parse(analysisText) : {};
            }
        } catch (error) {
            console.error('Error getting behavior analysis data:', error);
        }
        return {};
    }

    async _getTrendingPetsData(connection, userId) {
        try {
            const result = await connection.execute(
                `BEGIN
                    :trending := pet_intelligence_pkg.get_trending_pets(:userId, 50);
                END;`,
                {
                    userId: { val: userId, type: oracledb.NUMBER },
                    trending: { dir: oracledb.BIND_OUT, type: oracledb.CLOB }
                }
            );

            if (result.outBinds.trending) {
                const trendingText = await result.outBinds.trending.getData();
                return trendingText ? JSON.parse(trendingText) : [];
            }
        } catch (error) {
            console.error('Error getting trending pets data:', error);
        }
        return [];
    }

    async _getUserStatsData(connection, userId) {
        try {
            const result = await connection.execute(
                `SELECT 
                    COUNT(f.id) as favorites_count,
                    COUNT(DISTINCT aa.id) as applications_count,
                    COUNT(DISTINCT mh.id) as matches_viewed,
                    AVG(mh.compatibility_score) as avg_compatibility
                FROM users u
                LEFT JOIN favorites f ON u.id = f.user_id
                LEFT JOIN adoption_applications aa ON u.id = aa.user_id
                LEFT JOIN matching_history mh ON u.id = mh.user_id
                WHERE u.id = :userId`,
                { userId: { val: userId, type: oracledb.NUMBER } },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (result.rows.length > 0) {
                const row = result.rows[0];
                return {
                    favoritesCount: row.FAVORITES_COUNT || 0,
                    applicationsCount: row.APPLICATIONS_COUNT || 0,
                    matchesViewed: row.MATCHES_VIEWED || 0,
                    averageCompatibility: row.AVG_COMPATIBILITY ? Math.round(row.AVG_COMPATIBILITY * 100) / 100 : 0
                };
            }
        } catch (error) {
            console.error('Error getting user stats data:', error);
        }
        return {};
    }
}

module.exports = new RecommendationController();
