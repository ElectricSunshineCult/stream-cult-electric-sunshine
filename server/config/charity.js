/**
 * Charity and Crowdfunding System Configuration
 * Date: 2025-11-07
 * Author: MiniMax Agent
 * Description: Centralized configuration for charity system parameters and settings
 */

const charityConfig = {
    // Revenue sharing percentages for charity streams
    revenueShare: {
        // Default distribution for charity streams
        charity: 20.0,      // Percentage going to charity
        platform: 2.0,      // Platform fee for charity streams
        admin: 1.0,         // Admin fee
        moderator: 0.5,     // Moderator fee
        streamer: 76.5,     // What streamer keeps
        
        // Minimum percentages that can be configured
        minCharityPercentage: 5.0,
        maxCharityPercentage: 50.0,
        
        // Fee structure for different stream types
        streamTypes: {
            regular: {
                platform: 5.0,
                admin: 2.0,
                moderator: 1.0,
                streamer: 92.0
            },
            charity: {
                platform: 2.0,
                admin: 1.0,
                moderator: 0.5,
                streamer: 76.5,
                charity: 20.0
            },
            special: {
                platform: 3.0,
                admin: 1.5,
                moderator: 0.5,
                streamer: 85.0,
                charity: 10.0
            }
        }
    },
    
    // Donation settings
    donations: {
        minAmount: 1.00,           // Minimum donation amount in USD
        maxAmount: 10000.00,       // Maximum donation amount in USD
        tokenConversionRate: 0.04, // 1 token = $0.04
        anonymousFee: 0.50,        // Fee for anonymous donations
        
        // Quick donation amounts
        quickAmounts: [5, 10, 25, 50, 100, 250, 500],
        
        // Monthly donation limits
        monthlyLimits: {
            regular: 5000.00,
            verified: 15000.00,
            premium: 50000.00
        }
    },
    
    // Campaign settings
    campaigns: {
        maxGoalAmount: 1000000.00,  // Maximum campaign goal
        minGoalAmount: 100.00,      // Minimum campaign goal
        maxDuration: 365,           // Maximum campaign duration in days
        minDuration: 1,             // Minimum campaign duration in days
        
        // Campaign types and their characteristics
        types: {
            emergency: {
                name: 'Emergency Relief',
                description: 'Immediate response to crises and emergencies',
                maxDuration: 90,
                featuredChance: 0.3
            },
            project: {
                name: 'Specific Project',
                description: 'Funding for specific charitable projects',
                maxDuration: 180,
                featuredChance: 0.2
            },
            ongoing: {
                name: 'Ongoing Support',
                description: 'Continuous support for ongoing charitable work',
                maxDuration: 365,
                featuredChance: 0.1
            },
            event: {
                name: 'Event-Based',
                description: 'Campaigns tied to specific events or dates',
                maxDuration: 60,
                featuredChance: 0.4
            }
        },
        
        // Featured campaign rotation
        featuredRotation: {
            maxFeatured: 6,
            rotationInterval: 7, // days
            minProgressForFeature: 10.0 // minimum 10% progress to be featured
        }
    },
    
    // Charity verification process
    verification: {
        requiredDocuments: [
            'Registration certificate',
            'Tax-exempt status documentation',
            'Annual financial reports',
            'Proof of bank account'
        ],
        
        verificationLevels: {
            pending: {
                name: 'Pending Verification',
                description: 'Initial submission, awaiting review',
                donationLimit: 100.00,
                canCreateCampaigns: false
            },
            verified: {
                name: 'Verified Charity',
                description: 'Documentation verified, full access granted',
                donationLimit: 10000.00,
                canCreateCampaigns: true,
                canBeFeatured: true
            },
            premium: {
                name: 'Premium Partner',
                description: 'Long-term partner with special privileges',
                donationLimit: 50000.00,
                canCreateCampaigns: true,
                canBeFeatured: true,
                reducedPlatformFees: 1.0 // 1% instead of 2%
            }
        },
        
        // Review process
        reviewProcess: {
            autoApproval: false,      // Require manual review
            maxReviewTime: 7,         // days
            reviewerRoles: ['admin', 'charity_admin'],
            appealProcess: true
        }
    },
    
    // Achievement system
    achievements: {
        // Milestone types and their thresholds
        milestones: {
            total_donated: {
                name: 'Total Amount Donated',
                icon: 'heart',
                thresholds: [
                    { value: 10.00, name: 'First Drop', color: '#FF69B4' },
                    { value: 100.00, name: 'Generous Heart', color: '#FF1493' },
                    { value: 500.00, name: 'Philanthropist', color: '#FFD700' },
                    { value: 1000.00, name: 'Hero of Hope', color: '#8A2BE2' },
                    { value: 5000.00, name: 'Champion of Change', color: '#32CD32' }
                ]
            },
            campaigns_supported: {
                name: 'Campaigns Supported',
                icon: 'handshake',
                thresholds: [
                    { value: 1, name: 'Supporter', color: '#4169E1' },
                    { value: 5, name: 'Advocate', color: '#20B2AA' },
                    { value: 10, name: 'Ambassador', color: '#DC143C' }
                ]
            },
            streams_hosted: {
                name: 'Charity Streams Hosted',
                icon: 'video',
                thresholds: [
                    { value: 1, name: 'First Stream', color: '#FF6347' },
                    { value: 5, name: 'Streamer', color: '#4682B4' },
                    { value: 20, name: 'Broadcaster', color: '#FF4500' },
                    { value: 50, name: 'Streaming Legend', color: '#9932CC' }
                ]
            },
            yearly_goals: {
                name: 'Monthly Goals Achieved',
                icon: 'calendar',
                thresholds: [
                    { value: 100.00, name: 'Monthly Hero', color: '#00CED1' },
                    { value: 500.00, name: 'Monthly Champion', color: '#FF8C00' }
                ]
            }
        },
        
        // Badge visibility settings
        badgeDisplay: {
            showProgress: true,
            showCompletionDate: true,
            showOnProfile: true,
            showInChat: true,
            showInStreams: true
        }
    },
    
    // Leaderboard settings
    leaderboards: {
        // Time periods
        periods: ['monthly', 'yearly', 'all-time'],
        
        // Leaderboard types
        types: {
            top_donors: {
                name: 'Top Donors',
                description: 'Users who donated the most',
                metric: 'total_donated',
                badge: '💎'
            },
            top_streamers: {
                name: 'Top Charity Streamers',
                description: 'Streamers who raised the most for charity',
                metric: 'total_raised',
                badge: '🎥'
            },
            top_campaigns: {
                name: 'Top Campaigns',
                description: 'Most successful fundraising campaigns',
                metric: 'current_amount',
                badge: '🏆'
            },
            most_supporters: {
                name: 'Most Supportive',
                description: 'Users who supported the most campaigns',
                metric: 'campaigns_supported',
                badge: '🤝'
            }
        },
        
        // Display settings
        display: {
            topEntries: 10,
            showUserAvatars: true,
            showBadges: true,
            showProgress: true,
            includeAnonymous: false
        }
    },
    
    // Fund transfer settings
    transfers: {
        methods: {
            bank_transfer: {
                name: 'Bank Transfer',
                processingTime: { min: 3, max: 7 }, // business days
                fee: 0.00,
                minAmount: 100.00,
                maxAmount: 100000.00
            },
            paypal: {
                name: 'PayPal',
                processingTime: { min: 1, max: 3 }, // business days
                fee: 0.029, // 2.9%
                minAmount: 50.00,
                maxAmount: 60000.00
            },
            crypto: {
                name: 'Cryptocurrency',
                processingTime: { min: 1, max: 2 }, // business days
                fee: 0.005, // 0.5%
                minAmount: 25.00,
                maxAmount: 25000.00
            },
            check: {
                name: 'Check',
                processingTime: { min: 7, max: 21 }, // business days
                fee: 5.00,
                minAmount: 200.00,
                maxAmount: 50000.00
            }
        },
        
        // Transfer scheduling
        scheduling: {
            dailyCutoff: '15:00', // 3 PM UTC
            weekendProcessing: false,
            holidayProcessing: false,
            emergencyProcessing: true
        }
    },
    
    // Notification settings
    notifications: {
        donationReceipt: true,
        milestoneAchieved: true,
        campaignMilestone: true,
        streamCompleted: true,
        fundTransferComplete: true,
        weeklySummary: true,
        monthlyReport: true
    },
    
    // Security and compliance
    security: {
        // AML/KYC thresholds
        amlThresholds: {
            dailyDonation: 10000.00,
            monthlyDonation: 50000.00,
            annualDonation: 100000.00
        },
        
        // Suspicious activity monitoring
        suspiciousActivity: {
            rapidDonations: 5, // donations in 1 hour
            largeAnonymousDonations: 1000.00,
            unusualPatterns: true
        },
        
        // Data retention
        dataRetention: {
            donationRecords: 7, // years
            userData: 3, // years after account closure
            financialReports: 10 // years
        }
    },
    
    // API rate limiting
    rateLimits: {
        donations: {
            windowMs: 60000, // 1 minute
            max: 10, // max 10 donations per minute
            skipSuccessfulRequests: false
        },
        campaignCreation: {
            windowMs: 3600000, // 1 hour
            max: 3, // max 3 campaigns per hour
            skipSuccessfulRequests: false
        },
        streamScheduling: {
            windowMs: 3600000, // 1 hour
            max: 5, // max 5 streams per hour
            skipSuccessfulRequests: false
        }
    },
    
    // Currency and localization
    localization: {
        defaultCurrency: 'USD',
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
        currencySymbols: {
            USD: '$',
            EUR: '€',
            GBP: '£',
            CAD: 'C$',
            AUD: 'A$'
        },
        
        // Country-specific settings
        countrySettings: {
            US: {
                taxIdRequired: true,
                requiredFields: ['tax_id', 'ein'],
                reportingRequired: true
            },
            CA: {
                taxIdRequired: true,
                requiredFields: ['charity_number'],
                reportingRequired: true
            },
            GB: {
                taxIdRequired: true,
                requiredFields: ['charity_number'],
                reportingRequired: true
            }
        }
    },
    
    // Platform integration
    integration: {
        // Social media sharing
        socialMedia: {
            enabled: true,
            platforms: ['twitter', 'facebook', 'instagram', 'linkedin'],
            autoPostMilestones: true,
            hashtags: ['#CharityStream', '#StreamCult', '#MakeADifference']
        },
        
        // Email integration
        email: {
            provider: 'sendgrid',
            templates: {
                donationReceipt: 'donation_receipt',
                milestoneAchieved: 'milestone_achieved',
                campaignUpdate: 'campaign_update'
            }
        },
        
        // Analytics integration
        analytics: {
            googleAnalytics: true,
            customEvents: true,
            conversionTracking: true,
            fraudDetection: true
        }
    },
    
    // Feature flags
    features: {
        anonymousDonations: true,
        recurringDonations: false, // planned feature
        donationMatching: false,   // planned feature
        corporateSponsorships: false, // planned feature
        internationalTransfers: true,
        cryptoDonations: true,
        nftCharityBadges: false,   // future feature
        blockchainTransparency: false // future feature
    },
    
    // Development and testing
    development: {
        testMode: process.env.NODE_ENV !== 'production',
        mockPayments: false,
        seedData: {
            charities: true,
            campaigns: true,
            donations: false // don't auto-seed donations
        },
        debugLogging: process.env.NODE_ENV === 'development'
    }
};

// Export configuration
module.exports = charityConfig;

// Helper functions
const charityHelpers = {
    /**
     * Calculate revenue distribution for a charity stream
     */
    calculateRevenueDistribution: (grossAmount, charityPercentage, streamType = 'charity') => {
        const config = charityConfig.revenueShare.streamTypes[streamType] || charityConfig.revenueShare.streamTypes.charity;
        
        return {
            charity: (grossAmount * (charityPercentage / 100)),
            platform: (grossAmount * (config.platform / 100)),
            admin: (grossAmount * (config.admin / 100)),
            moderator: (grossAmount * (config.moderator / 100)),
            streamer: (grossAmount * (config.streamer / 100))
        };
    },
    
    /**
     * Check if user can make a donation
     */
    canDonate: (user, amount) => {
        const userLevel = user.subscription_tier || 'regular';
        const limit = charityConfig.donations.monthlyLimits[userLevel] || charityConfig.donations.monthlyLimits.regular;
        return amount <= limit;
    },
    
    /**
     * Get achievement progress percentage
     */
    getAchievementProgress: (currentValue, targetValue) => {
        return Math.min((currentValue / targetValue) * 100, 100);
    },
    
    /**
     * Check if amount is within limits
     */
    validateDonationAmount: (amount) => {
        return amount >= charityConfig.donations.minAmount && amount <= charityConfig.donations.maxAmount;
    },
    
    /**
     * Get processing time for transfer method
     */
    getProcessingTime: (method) => {
        const transferConfig = charityConfig.transfers.methods[method];
        return transferConfig ? transferConfig.processingTime : { min: 1, max: 3 };
    },
    
    /**
     * Calculate transfer fee
     */
    calculateTransferFee: (amount, method) => {
        const transferConfig = charityConfig.transfers.methods[method];
        if (!transferConfig) return 0;
        
        if (transferConfig.fee > 1) {
            return transferConfig.fee; // Fixed fee
        } else {
            return amount * transferConfig.fee; // Percentage fee
        }
    }
};

module.exports.helpers = charityHelpers;