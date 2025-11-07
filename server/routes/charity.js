/**
 * Charity and Crowdfunding Routes for Stream Cult Platform
 * Date: 2025-11-07
 * Author: MiniMax Agent
 * Description: Comprehensive charity and crowdfunding API with badges, milestones, and leaderboards
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireRole, requireAdmin, requireModerator } = require('../middleware/auth');
const { validateInput, sanitizeInput } = require('../middleware/validation');
const { logActivity } = require('../middleware/activityLogger');

// Charity Configuration
const CHARITY_CONFIG = {
    // Default revenue sharing for charity streams
    defaultCharityPercentage: 20.0, // 20% of stream revenue goes to charity
    platformCharityFee: 2.0, // 2% platform fee on charity streams
    adminCharityFee: 1.0, // 1% admin fee on charity streams
    moderatorCharityFee: 0.5, // 0.5% moderator fee on charity streams
    streamerCharityShare: 76.5, // What streamer keeps from charity streams
    
    // Donation processing
    minDonationAmount: 1.00, // Minimum donation amount in USD
    maxDonationAmount: 10000.00, // Maximum donation amount in USD
    anonymousDonationFee: 0.50, // Fee for anonymous donations
    
    // Achievement thresholds
    achievementThresholds: {
        firstDonor: 10.00,
        generousHeart: 100.00,
        philanthropist: 500.00,
        heroOfHope: 1000.00,
        championOfChange: 5000.00
    }
};

// ==================== CHARITY MANAGEMENT ROUTES ====================

/**
 * Get all verified charities
 * GET /api/charities
 */
router.get('/', async (req, res) => {
    try {
        const { verified, country, focus_areas, search, page = 1, limit = 20 } = req.query;
        
        let query = 'SELECT * FROM charities WHERE is_active = true';
        const queryParams = [];
        
        if (verified) {
            query += ' AND verification_status = $' + (queryParams.length + 1);
            queryParams.push(verified);
        }
        
        if (country) {
            query += ' AND country = $' + (queryParams.length + 1);
            queryParams.push(country);
        }
        
        if (search) {
            query += ' AND (organization_name ILIKE $' + (queryParams.length + 1) + ' OR mission_statement ILIKE $' + (queryParams.length + 2) + ')';
            queryParams.push(`%${search}%`, `%${search}%`);
        }
        
        if (focus_areas) {
            const areas = Array.isArray(focus_areas) ? focus_areas : [focus_areas];
            query += ' AND focus_areas ?| $' + (queryParams.length + 1);
            queryParams.push(areas);
        }
        
        query += ' ORDER BY organization_name ASC';
        query += ' LIMIT $' + (queryParams.length + 1) + ' OFFSET $' + (queryParams.length + 2);
        queryParams.push(limit, (page - 1) * limit);
        
        const result = await db.query(query, queryParams);
        
        res.json({
            success: true,
            data: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: result.rows.length
            }
        });
    } catch (error) {
        console.error('Error fetching charities:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch charities'
        });
    }
});

/**
 * Get specific charity details
 * GET /api/charities/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const charityResult = await db.query(
            'SELECT * FROM charities WHERE id = $1 AND is_active = true',
            [id]
        );
        
        if (charityResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Charity not found'
            });
        }
        
        const charity = charityResult.rows[0];
        
        // Get charity campaigns
        const campaignsResult = await db.query(
            'SELECT * FROM charity_campaigns WHERE charity_id = $1 AND status = $2 ORDER BY created_at DESC',
            [id, 'active']
        );
        
        // Get total funds raised for this charity
        const totalRaisedResult = await db.query(
            'SELECT COALESCE(SUM(donation_amount), 0) as total_raised FROM charity_donations WHERE campaign_id IN (SELECT id FROM charity_campaigns WHERE charity_id = $1)',
            [id]
        );
        
        charity.campaigns = campaignsResult.rows;
        charity.total_raised = parseFloat(totalRaisedResult.rows[0].total_raised);
        
        res.json({
            success: true,
            data: charity
        });
    } catch (error) {
        console.error('Error fetching charity:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch charity details'
        });
    }
});

/**
 * Submit charity for verification (Admin only)
 * POST /api/charities
 */
router.post('/', 
    authenticateToken,
    requireAdmin,
    validateInput({
        organization_name: 'required|string|min:3|max:200',
        organization_type: 'required|in:charity,nonprofit,foundation,ngo',
        country: 'required|string|length:3',
        tax_id: 'string|max:100',
        contact_email: 'required|email',
        contact_person: 'required|string|max:100',
        mission_statement: 'required|string|min:50|max:1000',
        focus_areas: 'array'
    }),
    async (req, res) => {
        try {
            const {
                organization_name,
                organization_type,
                registration_number,
                country,
                tax_id,
                website_url,
                logo_url,
                contact_email,
                contact_person,
                contact_phone,
                mission_statement,
                description,
                focus_areas
            } = req.body;
            
            // Create charity
            const result = await db.query(
                `INSERT INTO charities 
                (organization_name, organization_type, registration_number, country, tax_id, 
                 website_url, logo_url, contact_email, contact_person, contact_phone,
                 mission_statement, description, focus_areas, verification_status, verified_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                RETURNING *`,
                [
                    organization_name,
                    organization_type,
                    registration_number,
                    country,
                    tax_id,
                    website_url,
                    logo_url,
                    contact_email,
                    contact_person,
                    contact_phone,
                    mission_statement,
                    description,
                    focus_areas || [],
                    'verified', // Auto-verify for admin submissions
                    req.user.id
                ]
            );
            
            await logActivity(req.user.id, 'charity_created', {
                charity_id: result.rows[0].id,
                organization_name
            });
            
            res.status(201).json({
                success: true,
                data: result.rows[0],
                message: 'Charity created successfully'
            });
        } catch (error) {
            console.error('Error creating charity:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create charity'
            });
        }
    }
);

// ==================== CHARITY CAMPAIGN ROUTES ====================

/**
 * Get all active charity campaigns
 * GET /api/charity-campaigns
 */
router.get('/campaigns', async (req, res) => {
    try {
        const { charity_id, campaign_type, status = 'active', page = 1, limit = 20 } = req.query;
        
        let query = `
            SELECT cc.*, c.organization_name, c.logo_url 
            FROM charity_campaigns cc
            JOIN charities c ON cc.charity_id = c.id
            WHERE c.is_active = true
        `;
        const queryParams = [];
        
        if (charity_id) {
            query += ' AND cc.charity_id = $' + (queryParams.length + 1);
            queryParams.push(charity_id);
        }
        
        if (campaign_type) {
            query += ' AND cc.campaign_type = $' + (queryParams.length + 1);
            queryParams.push(campaign_type);
        }
        
        if (status) {
            query += ' AND cc.status = $' + (queryParams.length + 1);
            queryParams.push(status);
        }
        
        query += ' ORDER BY cc.created_at DESC';
        query += ' LIMIT $' + (queryParams.length + 1) + ' OFFSET $' + (queryParams.length + 2);
        queryParams.push(limit, (page - 1) * limit);
        
        const result = await db.query(query, queryParams);
        
        // Calculate progress for each campaign
        const campaigns = result.rows.map(campaign => {
            const progress = (campaign.current_amount / campaign.goal_amount) * 100;
            return {
                ...campaign,
                progress_percentage: Math.min(progress, 100),
                days_remaining: Math.max(0, Math.ceil((new Date(campaign.end_date) - new Date()) / (1000 * 60 * 60 * 24)))
            };
        });
        
        res.json({
            success: true,
            data: campaigns,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: result.rows.length
            }
        });
    } catch (error) {
        console.error('Error fetching campaigns:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch campaigns'
        });
    }
});

/**
 * Get specific campaign details
 * GET /api/charity-campaigns/:id
 */
router.get('/campaigns/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const campaignResult = await db.query(
            `SELECT cc.*, c.organization_name, c.logo_url, c.website_url
             FROM charity_campaigns cc
             JOIN charities c ON cc.charity_id = c.id
             WHERE cc.id = $1`,
            [id]
        );
        
        if (campaignResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Campaign not found'
            });
        }
        
        const campaign = campaignResult.rows[0];
        
        // Get recent donations for this campaign
        const donationsResult = await db.query(
            `SELECT cd.*, u.username, u.avatar_url
             FROM charity_donations cd
             LEFT JOIN users u ON cd.donor_user_id = u.id
             WHERE cd.campaign_id = $1 AND cd.status = 'completed'
             ORDER BY cd.created_at DESC
             LIMIT 10`,
            [id]
        );
        
        campaign.recent_donations = donationsResult.rows;
        campaign.progress_percentage = (campaign.current_amount / campaign.goal_amount) * 100;
        campaign.days_remaining = Math.max(0, Math.ceil((new Date(campaign.end_date) - new Date()) / (1000 * 60 * 60 * 24)));
        
        res.json({
            success: true,
            data: campaign
        });
    } catch (error) {
        console.error('Error fetching campaign:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch campaign details'
        });
    }
});

/**
 * Create new charity campaign
 * POST /api/charity-campaigns
 */
router.post('/campaigns',
    authenticateToken,
    requireRole(['admin', 'charity_admin']),
    validateInput({
        charity_id: 'required|uuid',
        campaign_name: 'required|string|min:3|max:200',
        campaign_description: 'required|string|min:50|max:2000',
        campaign_type: 'required|in:emergency,project,ongoing,event',
        goal_amount: 'required|numeric|min:100',
        end_date: 'required|date'
    }),
    async (req, res) => {
        try {
            const {
                charity_id,
                campaign_name,
                campaign_description,
                campaign_type,
                goal_amount,
                end_date,
                campaign_images,
                tags
            } = req.body;
            
            // Verify charity exists and is verified
            const charityResult = await db.query(
                'SELECT * FROM charities WHERE id = $1 AND is_active = true AND verification_status = $2',
                [charity_id, 'verified']
            );
            
            if (charityResult.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Charity not found or not verified'
                });
            }
            
            // Create campaign
            const result = await db.query(
                `INSERT INTO charity_campaigns 
                (charity_id, campaign_name, campaign_description, campaign_type, goal_amount, 
                 end_date, campaign_images, tags, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *`,
                [
                    charity_id,
                    campaign_name,
                    campaign_description,
                    campaign_type,
                    goal_amount,
                    new Date(end_date),
                    campaign_images || [],
                    tags || [],
                    req.user.id
                ]
            );
            
            await logActivity(req.user.id, 'campaign_created', {
                campaign_id: result.rows[0].id,
                campaign_name,
                charity_id
            });
            
            res.status(201).json({
                success: true,
                data: result.rows[0],
                message: 'Campaign created successfully'
            });
        } catch (error) {
            console.error('Error creating campaign:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create campaign'
            });
        }
    }
);

// ==================== DONATION ROUTES ====================

/**
 * Make a donation to a campaign
 * POST /api/charity-campaigns/:id/donate
 */
router.post('/campaigns/:id/donate',
    authenticateToken,
    validateInput({
        amount: 'required|numeric|min:1|max:10000',
        tokens_used: 'integer|min:0',
        donation_message: 'string|max:500',
        is_anonymous: 'boolean'
    }),
    async (req, res) => {
        try {
            const { id: campaignId } = req.params;
            const { amount, tokens_used, donation_message, is_anonymous = false } = req.body;
            
            // Verify campaign exists and is active
            const campaignResult = await db.query(
                'SELECT * FROM charity_campaigns WHERE id = $1 AND status = $2 AND end_date > NOW()',
                [campaignId, 'active']
            );
            
            if (campaignResult.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Campaign not found or inactive'
                });
            }
            
            const campaign = campaignResult.rows[0];
            
            // Check if user has enough tokens if using tokens
            if (tokens_used && tokens_used > 0) {
                const userTokensResult = await db.query(
                    'SELECT tokens FROM users WHERE id = $1',
                    [req.user.id]
                );
                
                if (userTokensResult.rows[0].tokens < tokens_used) {
                    return res.status(400).json({
                        success: false,
                        error: 'Insufficient tokens'
                    });
                }
            }
            
            // Create donation record
            const donationResult = await db.query(
                `INSERT INTO charity_donations 
                (campaign_id, donor_user_id, donation_amount, tokens_used, donation_message, 
                 is_anonymous, donation_source, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *`,
                [
                    campaignId,
                    is_anonymous ? null : req.user.id,
                    amount,
                    tokens_used || 0,
                    donation_message,
                    is_anonymous,
                    'direct',
                    'pending'
                ]
            );
            
            const donation = donationResult.rows[0];
            
            // Deduct tokens from user if used
            if (tokens_used && tokens_used > 0) {
                await db.query(
                    'UPDATE users SET tokens = tokens - $1 WHERE id = $2',
                    [tokens_used, req.user.id]
                );
            }
            
            // Update campaign current amount
            await db.query(
                'UPDATE charity_campaigns SET current_amount = current_amount + $1 WHERE id = $2',
                [amount, campaignId]
            );
            
            // Update user charity stats if not anonymous
            if (!is_anonymous) {
                await db.query(
                    `UPDATE users SET 
                     total_charity_donated = total_charity_donated + $1,
                     charity_donations_made = charity_donations_made + 1,
                     last_charity_activity = NOW()
                     WHERE id = $2`,
                    [amount, req.user.id]
                );
                
                // Check for milestone achievements
                await checkAndUpdateMilestones(req.user.id, 'total_donated', amount);
            }
            
            // Mark donation as completed (simplified - in real implementation would process payment)
            await db.query(
                'UPDATE charity_donations SET status = $1, processed_at = NOW() WHERE id = $2',
                ['completed', donation.id]
            );
            
            await logActivity(req.user.id, 'charity_donation_made', {
                donation_id: donation.id,
                campaign_id: campaignId,
                amount,
                tokens_used
            });
            
            res.json({
                success: true,
                data: {
                    ...donation,
                    status: 'completed'
                },
                message: 'Donation completed successfully'
            });
        } catch (error) {
            console.error('Error making donation:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to process donation'
            });
        }
    }
);

// ==================== CHARITY STREAM ROUTES ====================

/**
 * Schedule a charity stream
 * POST /api/charity-streams
 */
router.post('/charity-streams',
    authenticateToken,
    requireRole(['streamer', 'admin', 'moderator']),
    validateInput({
        campaign_id: 'required|uuid',
        stream_title: 'required|string|max:200',
        stream_description: 'string|max:1000',
        scheduled_start: 'required|date',
        donation_goal: 'numeric|min:0',
        charity_percentage: 'numeric|min:5|max:50'
    }),
    async (req, res) => {
        try {
            const {
                campaign_id,
                stream_title,
                stream_description,
                scheduled_start,
                donation_goal,
                charity_percentage
            } = req.body;
            
            // Verify campaign exists
            const campaignResult = await db.query(
                'SELECT * FROM charity_campaigns WHERE id = $1',
                [campaign_id]
            );
            
            if (campaignResult.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Campaign not found'
                });
            }
            
            const campaign = campaignResult.rows[0];
            
            // Create stream participation record
            const result = await db.query(
                `INSERT INTO charity_stream_participation 
                (campaign_id, streamer_id, stream_title, stream_description, 
                 scheduled_start, donation_goal, charity_percentage, platform_percentage, 
                 admin_percentage, moderator_percentage, streamer_percentage, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING *`,
                [
                    campaign_id,
                    req.user.id,
                    stream_title,
                    stream_description,
                    new Date(scheduled_start),
                    donation_goal || 0,
                    charity_percentage || CHARITY_CONFIG.defaultCharityPercentage,
                    CHARITY_CONFIG.platformCharityFee,
                    CHARITY_CONFIG.adminCharityFee,
                    CHARITY_CONFIG.moderatorCharityFee,
                    CHARITY_CONFIG.streamerCharityShare,
                    'scheduled'
                ]
            );
            
            // Update user charity stats
            await db.query(
                'UPDATE users SET charity_streams_hosted = charity_streams_hosted + 1, last_charity_activity = NOW() WHERE id = $1',
                [req.user.id]
            );
            
            // Check for streaming milestones
            await checkAndUpdateMilestones(req.user.id, 'streams_hosted', 1);
            
            await logActivity(req.user.id, 'charity_stream_scheduled', {
                stream_participation_id: result.rows[0].id,
                campaign_id,
                stream_title
            });
            
            res.status(201).json({
                success: true,
                data: result.rows[0],
                message: 'Charity stream scheduled successfully'
            });
        } catch (error) {
            console.error('Error scheduling charity stream:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to schedule charity stream'
            });
        }
    }
);

/**
 * Update charity stream status
 * PUT /api/charity-streams/:id/status
 */
router.put('/charity-streams/:id/status',
    authenticateToken,
    requireRole(['streamer', 'admin', 'moderator']),
    validateInput({
        status: 'required|in:live,completed,cancelled',
        actual_start: 'date',
        actual_end: 'date',
        viewer_count: 'integer|min:0',
        max_viewers: 'integer|min:0',
        amount_raised: 'numeric|min:0'
    }),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { status, actual_start, actual_end, viewer_count, max_viewers, amount_raised } = req.body;
            
            // Verify user owns this stream or is admin
            const streamResult = await db.query(
                'SELECT * FROM charity_stream_participation WHERE id = $1 AND (streamer_id = $2 OR $3 IN (SELECT role FROM users WHERE id = $2))',
                [id, req.user.id, 'admin']
            );
            
            if (streamResult.rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    error: 'Not authorized to update this stream'
                });
            }
            
            const stream = streamResult.rows[0];
            
            // Update stream
            const updateResult = await db.query(
                `UPDATE charity_stream_participation 
                SET status = $1, actual_start = COALESCE($2, actual_start), 
                    actual_end = COALESCE($3, actual_end), viewer_count = COALESCE($4, viewer_count),
                    max_viewers = COALESCE($5, max_viewers), amount_raised = COALESCE($6, amount_raised)
                WHERE id = $7
                RETURNING *`,
                [status, actual_start ? new Date(actual_start) : null, 
                 actual_end ? new Date(actual_end) : null, viewer_count, max_viewers, amount_raised, id]
            );
            
            // If stream is completed, create revenue distribution
            if (status === 'completed' && amount_raised > 0) {
                await createCharityRevenueDistribution(updateResult.rows[0]);
            }
            
            res.json({
                success: true,
                data: updateResult.rows[0],
                message: 'Stream status updated successfully'
            });
        } catch (error) {
            console.error('Error updating stream status:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update stream status'
            });
        }
    }
);

// ==================== LEADERBOARD ROUTES ====================

/**
 * Get monthly charity leaderboards
 * GET /api/charity-leaderboards/:monthYear/:type
 */
router.get('/leaderboards/:monthYear/:type', async (req, res) => {
    try {
        const { monthYear, type } = req.params;
        const { limit = 10 } = req.query;
        
        // Validate monthYear format
        if (!/^\d{4}-\d{2}$/.test(monthYear)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid monthYear format. Use YYYY-MM'
            });
        }
        
        let query = '';
        let queryParams = [monthYear, limit];
        
        switch (type) {
            case 'top_donors':
                query = `
                    SELECT 
                        u.id, u.username, u.avatar_url,
                        COALESCE(SUM(cd.donation_amount), 0) as total_donated,
                        COUNT(cd.id) as donation_count
                    FROM users u
                    LEFT JOIN charity_donations cd ON u.id = cd.donor_user_id
                    LEFT JOIN charity_campaigns cc ON cd.campaign_id = cc.id
                    WHERE cd.status = 'completed' 
                    AND DATE_TRUNC('month', cd.created_at) = DATE_TRUNC('month', $1::date)
                    AND cd.is_anonymous = false
                    GROUP BY u.id, u.username, u.avatar_url
                    ORDER BY total_donated DESC
                    LIMIT $2
                `;
                break;
                
            case 'top_streamers':
                query = `
                    SELECT 
                        u.id, u.username, u.avatar_url,
                        COUNT(csp.id) as streams_hosted,
                        COALESCE(SUM(csp.amount_raised), 0) as total_raised,
                        COALESCE(SUM(csp.viewer_count), 0) as total_viewers
                    FROM users u
                    LEFT JOIN charity_stream_participation csp ON u.id = csp.streamer_id
                    WHERE csp.status = 'completed'
                    AND DATE_TRUNC('month', csp.actual_start) = DATE_TRUNC('month', $1::date)
                    GROUP BY u.id, u.username, u.avatar_url
                    ORDER BY total_raised DESC
                    LIMIT $2
                `;
                break;
                
            case 'top_campaigns':
                query = `
                    SELECT 
                        cc.id, cc.campaign_name, c.organization_name, c.logo_url,
                        cc.current_amount, cc.goal_amount,
                        COUNT(cd.id) as donation_count
                    FROM charity_campaigns cc
                    JOIN charities c ON cc.charity_id = c.id
                    LEFT JOIN charity_donations cd ON cc.id = cd.campaign_id AND cd.status = 'completed'
                    WHERE cc.status = 'active'
                    AND DATE_TRUNC('month', cc.created_at) = DATE_TRUNC('month', $1::date)
                    GROUP BY cc.id, cc.campaign_name, c.organization_name, c.logo_url, cc.current_amount, cc.goal_amount
                    ORDER BY cc.current_amount DESC
                    LIMIT $2
                `;
                break;
                
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Invalid leaderboard type'
                });
        }
        
        const result = await db.query(query, queryParams);
        
        res.json({
            success: true,
            data: result.rows,
            month: monthYear,
            type: type
        });
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch leaderboard'
        });
    }
});

/**
 * Get user charity achievements and badges
 * GET /api/charity-achievements/:userId
 */
router.get('/achievements/:userId?', async (req, res) => {
    try {
        const userId = req.params.userId || req.user?.id;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        
        // Get user charity stats
        const userStatsResult = await db.query(
            'SELECT * FROM users WHERE id = $1',
            [userId]
        );
        
        if (userStatsResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        const userStats = userStatsResult.rows[0];
        
        // Get achievements
        const achievementsResult = await db.query(
            `SELECT ca.*, cm.milestone_name, cm.description, cm.badge_icon, cm.badge_color
             FROM charity_achievements ca
             JOIN charity_milestones cm ON ca.milestone_id = cm.id
             WHERE ca.user_id = $1
             ORDER BY ca.is_completed DESC, ca.current_value DESC`,
            [userId]
        );
        
        // Get earned badges
        const badgesResult = await db.query(
            `SELECT ca.*, cm.milestone_name, cm.badge_icon, cm.badge_color, cm.description
             FROM charity_achievements ca
             JOIN charity_milestones cm ON ca.milestone_id = cm.id
             WHERE ca.user_id = $1 AND ca.badge_earned = true
             ORDER BY ca.completed_at DESC`,
            [userId]
        );
        
        res.json({
            success: true,
            data: {
                user_stats: {
                    total_charity_donated: parseFloat(userStats.total_charity_donated || 0),
                    charity_campaigns_supported: userStats.charity_campaigns_supported || 0,
                    charity_streams_hosted: userStats.charity_streams_hosted || 0,
                    charity_donations_made: userStats.charity_donations_made || 0,
                    charity_achievements_earned: userStats.charity_achievements_earned || 0,
                    charity_badges_earned: userStats.charity_badges_earned || 0
                },
                achievements: achievementsResult.rows,
                badges: badgesResult.rows
            }
        });
    } catch (error) {
        console.error('Error fetching achievements:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch achievements'
        });
    }
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Check and update user milestones
 */
async function checkAndUpdateMilestones(userId, milestoneType, incrementValue) {
    try {
        // Get relevant milestones for this type
        const milestonesResult = await db.query(
            'SELECT * FROM charity_milestones WHERE milestone_type = $1 AND is_active = true ORDER BY target_value ASC',
            [milestoneType]
        );
        
        for (const milestone of milestonesResult.rows) {
            // Get current achievement or create new one
            const achievementResult = await db.query(
                'SELECT * FROM charity_achievements WHERE user_id = $1 AND milestone_id = $2',
                [userId, milestone.id]
            );
            
            let achievement;
            if (achievementResult.rows.length === 0) {
                // Create new achievement record
                const newAchievementResult = await db.query(
                    `INSERT INTO charity_achievements 
                    (user_id, milestone_id, achievement_type, current_value, target_value)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING *`,
                    [userId, milestone.id, getAchievementType(milestoneType), 0, milestone.target_value]
                );
                achievement = newAchievementResult.rows[0];
            } else {
                achievement = achievementResult.rows[0];
            }
            
            // Update current value
            const newValue = parseFloat(achievement.current_value) + incrementValue;
            const isCompleted = newValue >= milestone.target_value;
            const wasCompleted = achievement.is_completed;
            
            // Update achievement
            await db.query(
                `UPDATE charity_achievements 
                SET current_value = $1, is_completed = $2, 
                    completed_at = CASE WHEN $2 AND NOT $3 THEN NOW() ELSE completed_at END,
                    badge_earned = CASE WHEN $2 AND NOT $3 THEN true ELSE badge_earned END,
                    badge_earned_at = CASE WHEN $2 AND NOT $3 THEN NOW() ELSE badge_earned_at END,
                    updated_at = NOW()
                WHERE id = $4`,
                [newValue, isCompleted, wasCompleted, achievement.id]
            );
            
            // If milestone was just completed, update user stats
            if (isCompleted && !wasCompleted) {
                await db.query(
                    'UPDATE users SET charity_achievements_earned = charity_achievements_earned + 1, charity_badges_earned = charity_badges_earned + 1 WHERE id = $1',
                    [userId]
                );
            }
        }
    } catch (error) {
        console.error('Error updating milestones:', error);
    }
}

/**
 * Get achievement type based on milestone type
 */
function getAchievementType(milestoneType) {
    switch (milestoneType) {
        case 'total_donated':
            return 'donor';
        case 'campaigns_supported':
            return 'supporter';
        case 'streams_hosted':
            return 'streamer';
        case 'yearly_goal':
            return 'champion';
        default:
            return 'participant';
    }
}

/**
 * Create revenue distribution for completed charity stream
 */
async function createCharityRevenueDistribution(stream) {
    try {
        const grossRevenue = stream.amount_raised;
        const charityAmount = (grossRevenue * stream.charity_percentage) / 100;
        const platformAmount = (grossRevenue * stream.platform_percentage) / 100;
        const adminAmount = (grossRevenue * stream.admin_percentage) / 100;
        const moderatorAmount = (grossRevenue * stream.moderator_percentage) / 100;
        const streamerAmount = (grossRevenue * stream.streamer_percentage) / 100;
        
        await db.query(
            `INSERT INTO charity_revenue_distributions 
            (stream_participation_id, gross_revenue, charity_amount, platform_amount, 
             admin_amount, moderator_amount, streamer_amount, charity_id, charity_campaign_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                stream.id,
                grossRevenue,
                charityAmount,
                platformAmount,
                adminAmount,
                moderatorAmount,
                streamerAmount,
                stream.charity_id,
                stream.campaign_id
            ]
        );
    } catch (error) {
        console.error('Error creating revenue distribution:', error);
    }
}

module.exports = router;