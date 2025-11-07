/**
 * Stream Cult - Payment Configuration
 * Copyright (C) 2025 Corey Setzer (Unknown Artist) / Electric Sunshine Cult
 * 
 * This proprietary payment configuration includes revenue sharing percentages,
 * token exchange rates, and payout settings developed exclusively for the
 * Stream Cult platform.
 * 
 * Unauthorized use, copying, modification, or distribution is strictly prohibited
 * without written permission from Electric Sunshine Cult.
 * 
 * Contact: info@electricsunshinecult.com
 */

module.exports = {
  // Token exchange rates
  tokenRates: {
    buy: 25.0,  // 1 USD = 25 tokens
    sell: 0.04  // 1 token = 0.04 USD (25 tokens = 1 USD)
  },

  // Minimum payout amounts
  minPayoutUSD: 10.00,
  minPayoutTokens: 250, // 250 tokens = $10.00

  // Processing time (in hours)
  payoutProcessingTime: {
    paypal: 1,
    bank_transfer: 3,
    crypto: 2,
    check: 7
  },

  // Platform fee structure (percentages)
  platformFees: {
    token_purchase: {
      platform: 5.0,
      admin: 2.0,
      moderator: 1.0,
      creator: 2.0
    },
    tip: {
      platform: 3.0,
      admin: 1.5,
      moderator: 0.5,
      creator: 95.0
    },
    subscription: {
      platform: 10.0,
      admin: 3.0,
      moderator: 2.0,
      creator: 85.0
    },
    payout: {
      platform: 2.0,
      admin: 0.5,
      moderator: 0.0,
      creator: 0.0
    }
  },

  // Token packages
  tokenPackages: {
    small: {
      name: 'Small Pack',
      tokens: 100,
      price: 4.99,
      bonus: 0,
      popular: false
    },
    medium: {
      name: 'Medium Pack',
      tokens: 250,
      price: 9.99,
      bonus: 25,
      popular: true
    },
    large: {
      name: 'Large Pack',
      tokens: 500,
      price: 19.99,
      bonus: 75,
      popular: false
    },
    mega: {
      name: 'Mega Pack',
      tokens: 1000,
      price: 39.99,
      bonus: 200,
      popular: false
    },
    ultimate: {
      name: 'Ultimate Pack',
      tokens: 2500,
      price: 99.99,
      bonus: 500,
      popular: false
    }
  },

  // Subscription tiers
  subscriptionTiers: {
    free: {
      name: 'Free',
      price: 0.00,
      tokenBonusPercentage: 0,
      features: {
        badge: false,
        customEmotes: 0,
        prioritySupport: false,
        adFree: false,
        exclusiveContent: false
      }
    },
    supporter: {
      name: 'Supporter',
      price: 4.99,
      tokenBonusPercentage: 10,
      features: {
        badge: true,
        customEmotes: 5,
        prioritySupport: true,
        adFree: false,
        exclusiveContent: false
      }
    },
    vip: {
      name: 'VIP',
      price: 9.99,
      tokenBonusPercentage: 20,
      features: {
        badge: true,
        customEmotes: 15,
        prioritySupport: true,
        adFree: true,
        exclusiveContent: true
      }
    },
    premium: {
      name: 'Premium',
      price: 19.99,
      tokenBonusPercentage: 35,
      features: {
        badge: true,
        customEmotes: 50,
        prioritySupport: true,
        adFree: true,
        exclusiveContent: true
      }
    }
  },

  // Payout method configuration
  payoutMethods: {
    paypal: {
      name: 'PayPal',
      processingTime: 1,
      requiresEmail: true,
      minAmount: 10.00,
      maxAmount: 10000.00
    },
    bank_transfer: {
      name: 'Bank Transfer',
      processingTime: 3,
      requiresDetails: true,
      minAmount: 25.00,
      maxAmount: 50000.00
    },
    crypto: {
      name: 'Cryptocurrency',
      processingTime: 2,
      requiresAddress: true,
      minAmount: 10.00,
      maxAmount: 100000.00
    },
    check: {
      name: 'Check',
      processingTime: 7,
      requiresAddress: true,
      minAmount: 50.00,
      maxAmount: 10000.00
    }
  },

  // Tax configuration
  tax: {
    enableWithholding: true,
    defaultWithholdingPercentage: 0, // Varies by country
    requireTaxId: true,
    requireW9: true, // For US users
    requireW8BEN: false // For international users
  },

  // Security settings
  security: {
    enableEncryption: true,
    encryptionAlgorithm: 'aes-256-cbc',
    requireTwoFactor: false, // For large payouts
    dailyPayoutLimit: 1000, // $1000 per day
    monthlyPayoutLimit: 10000, // $10,000 per month
    requireVerification: true, // For payouts over $100
    verificationLevels: {
      basic: { amount: 100, requirements: ['email', 'phone'] },
      standard: { amount: 1000, requirements: ['email', 'phone', 'id'] },
      enhanced: { amount: 10000, requirements: ['email', 'phone', 'id', 'address', 'tax_id'] }
    }
  },

  // Compliance settings
  compliance: {
    enableAML: true,
    enableKYC: true,
    enableReporting: true,
    suspiciousActivityThreshold: 10000, // $10,000
    reportRetentionDays: 2555, // 7 years
    legalHoldDays: 30
  }
};