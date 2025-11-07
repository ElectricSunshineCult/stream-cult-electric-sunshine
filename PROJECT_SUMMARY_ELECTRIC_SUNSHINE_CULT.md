# Stream Cult - Electric Sunshine Cult Project Summary

## 👑 Developer Information

**Corey Setzer** - *Unknown Artist Developer & Director Of Electric Sunshine Cult*

- **Email:** unknown@electricsunshinecult.com
- **Organization:** Electric Sunshine Cult
- **Project:** Stream Cult - Advanced Streaming Platform
- **Copyright:** (c) 2025 Electric Sunshine Cult

## 📋 Project Overview

This is a comprehensive, proprietary full-stack streaming platform developed by Corey Setzer for Electric Sunshine Cult. The platform features advanced token-based streaming, user gamification, stream clipping, and comprehensive admin tools.

## 🏗️ Architecture

### Frontend (React/Next.js)
- **Framework:** Next.js 14 with TypeScript
- **UI Components:** Custom shadcn/ui component library
- **Styling:** Tailwind CSS with custom theme system
- **State Management:** Zustand and React Query
- **Real-time:** Socket.IO client integration
- **Animation:** Framer Motion
- **Charts:** Chart.js with React integration

### Backend (Node.js/Express)
- **Framework:** Express.js with TypeScript
- **Database:** PostgreSQL with advanced migrations
- **Cache:** Redis for session and data caching
- **Real-time:** Socket.IO for WebSocket communication
- **File Storage:** Multer for uploads (500MB limit)
- **Security:** Helmet, CORS, rate limiting
- **Payment:** Stripe integration
- **Authentication:** JWT with refresh tokens

### Database Schema
- **Users:** Authentication, profiles, levels, experience
- **Streams:** Live streaming data, metadata, analytics
- **Clips:** Stream clipping system with reactions and comments
- **Chat:** Real-time messaging with moderation
- **Tips:** Token-based tipping system
- **Analytics:** Comprehensive tracking and reporting

## 🚀 Key Features

### Core Platform
- ✅ Token-based streaming with CULT tokens
- ✅ Real-time chat with WebSocket
- ✅ User levels and experience system
- ✅ Regional organization (continent/country)
- ✅ Multi-role system (Viewer, Streamer, Moderator, Admin)
- ✅ NSFW content gating and age verification
- ✅ Payment processing with Stripe
- ✅ Comprehensive admin dashboard

### Stream Clipping System
- ✅ Real-time clip creation during streaming
- ✅ Manual mark start/end points
- ✅ Quality selection (480p, 720p, 1080p, 4K)
- ✅ Public/private visibility controls
- ✅ Download permission management
- ✅ Clip reactions and commenting system
- ✅ View and download analytics
- ✅ Profile-based clip management

### Gamification
- ✅ 10-level user progression system
- ✅ Experience points through activities
- ✅ Achievement system with badges
- ✅ Enhanced leaderboards (multiple categories)
- ✅ Daily streak rewards
- ✅ Level-based privileges
- ✅ Progress tracking and analytics

### Performance & Optimization
- ✅ Lazy loading and code splitting
- ✅ Redis caching system
- ✅ Database query optimization
- ✅ Image optimization pipeline
- ✅ Bundle size optimization
- ✅ CDN-ready asset structure
- ✅ Service worker implementation
- ✅ Performance monitoring tools

### Troubleshooting System
- ✅ Comprehensive troubleshooting guide
- ✅ Automated diagnostic tools
- ✅ Browser compatibility testing
- ✅ Performance monitoring dashboard
- ✅ Issue resolution matrix
- ✅ Emergency procedures documentation

## 📁 Project Structure

```
stream-cult-electric-sunshine/
├── client/                          # Frontend React application
│   ├── src/
│   │   ├── app/                     # Next.js app directory
│   │   ├── components/              # React components
│   │   │   ├── ui/                  # shadcn/ui components
│   │   │   ├── layout/              # Layout components
│   │   │   ├── streams/             # Stream-related components
│   │   │   ├── chat/                # Chat components
│   │   │   ├── admin/               # Admin interface
│   │   │   └── auth/                # Authentication components
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── lib/                     # Utility libraries
│   │   ├── contexts/                # React contexts
│   │   ├── types/                   # TypeScript definitions
│   │   └── utils/                   # Helper utilities
│   ├── public/                      # Static assets
│   └── package.json
├── server/                          # Backend Node.js application
│   ├── routes/                      # Express route handlers
│   ├── middleware/                  # Custom middleware
│   ├── services/                    # Business logic services
│   ├── database/                    # Database models and queries
│   ├── uploads/                     # File upload directory
│   ├── scripts/                     # Utility scripts
│   └── package.json
├── database/                        # Database migrations
│   └── migrations/
├── docs/                            # Documentation
├── docker-compose.yml               # Docker configuration
├── PROPRIETARY_LICENSE.txt          # License file
├── optimize.sh                      # Performance optimization script
├── health-check.sh                  # Health monitoring script
└── README.md
```

## 🔧 Technical Specifications

### Dependencies
**Frontend:**
- Next.js 14.0.3
- React 18.2.0
- TypeScript 5.3.2
- Tailwind CSS 3.3.6
- Socket.IO Client 4.7.4
- Framer Motion 10.16.5
- React Query 5.12.2
- Zustand 4.4.7
- Chart.js 4.4.0
- shadcn/ui components

**Backend:**
- Express.js 4.18.2
- Socket.IO 4.7.4
- PostgreSQL 8.11.3
- Redis 4.6.10
- Multer 1.4.5-lts.1
- Stripe 14.8.0
- JWT 9.0.2
- Helmet 7.1.0

### Performance Optimizations
- Database connection pooling
- Redis caching for sessions and frequently accessed data
- Image optimization and lazy loading
- Code splitting and bundle optimization
- Service worker for offline functionality
- CDN-ready asset structure
- Compression (gzip/brotli)
- Browser caching strategies

### Security Features
- Helmet security headers
- CORS configuration
- Rate limiting
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Secure authentication with JWT
- File upload restrictions
- Content Security Policy

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/profile` - Get user profile

### Streams
- `GET /api/streams` - List live streams
- `POST /api/streams` - Create stream
- `PATCH /api/streams/:id` - Update stream
- `DELETE /api/streams/:id` - Delete stream
- `POST /api/streams/:id/tip` - Send tip

### Clips
- `GET /api/clips` - List clips
- `POST /api/clips` - Create clip
- `GET /api/clips/:id` - Get clip details
- `PATCH /api/clips/:id` - Update clip
- `DELETE /api/clips/:id` - Delete clip
- `POST /api/clips/:id/reactions` - Add reaction
- `GET /api/clips/:id/comments` - Get comments
- `POST /api/clips/:id/comments` - Add comment

### Admin
- `GET /api/admin/users` - List users
- `PATCH /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/analytics` - Platform analytics
- `POST /api/admin/broadcast` - Send system message

## 🎯 Gamification System

### User Levels
1. **Newbie** (Level 1) - 0-99 XP
2. **Viewer** (Level 2) - 100-299 XP
3. **Supporter** (Level 3) - 300-699 XP
4. **Fan** (Level 4) - 700-1499 XP
5. **Elite** (Level 5) - 1500-2999 XP
6. **Champion** (Level 6) - 3000-5999 XP
7. **Legend** (Level 7) - 6000-11999 XP
8. **Mythic** (Level 8) - 12000-24999 XP
9. **Immortal** (Level 9) - 25000-49999 XP
10. **God** (Level 10) - 50000+ XP

### Experience Sources
- Token purchases: 1 XP per token
- Tips sent: 10 XP per tip
- Stream watching: 5 XP per hour
- Chat messages: 1 XP per message
- Profile completion: 50 XP
- Daily login: 10 XP
- Achievements: 50-500 XP

### Achievements
- **First Steps** - Complete profile (50 XP)
- **Generous Soul** - Send first tip (100 XP)
- **Community Member** - Send 100 messages (200 XP)
- **Level Climber** - Reach level 5 (500 XP)
- **Night Owl** - Watch 50 hours (300 XP)
- **Big Spender** - Spend 10,000 tokens (1000 XP)
- **Streamer** - Go live (500 XP)
- **Collector** - Watch 100 streams (300 XP)
- **Pioneer** - Be first to try features (250 XP)
- **Veteran** - Use platform for 1 year (2000 XP)

## 🛠️ Deployment

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- Nginx (recommended)
- SSL certificate
- Domain name

### Installation Steps
1. Clone repository: `git clone https://github.com/ElectricSunshineCult/stream-cult-electric-sunshine.git`
2. Install dependencies: `npm run install:all`
3. Set up environment variables
4. Run database migrations: `npm run db:migrate`
5. Seed database: `npm run db:seed`
6. Start development: `npm run dev`
7. For production: `npm run build && npm start`

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/stream_cult

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Application
CLIENT_URL=http://localhost:3000
SERVER_URL=http://localhost:5000
NODE_ENV=development

# File Upload
MAX_FILE_SIZE=500000000
UPLOAD_PATH=./uploads

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Docker Deployment
```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🔐 Attribution & Licensing

This project is proprietary software owned by Electric Sunshine Cult and Corey Setzer. All code, documentation, and intellectual property rights are exclusively owned by the developer and organization.

### Required Attribution
```
Copyright (c) 2025 Corey Setzer - Electric Sunshine Cult
Unknown Artist Developer & Director Of Electric Sunshine Cult
Contact: unknown@electricsunshinecult.com
```

### Contact Information
- **Primary Contact:** unknown@electricsunshinecult.com
- **Organization:** Electric Sunshine Cult
- **Developer:** Corey Setzer
- **Title:** Unknown Artist Developer & Director Of Electric Sunshine Cult

## 📈 Performance Metrics

### Target Performance
- **Page Load Time:** < 3 seconds
- **API Response Time:** < 200ms
- **Database Query Time:** < 50ms
- **Real-time Latency:** < 100ms
- **File Upload Speed:** Optimized for 500MB files
- **Concurrent Users:** 10,000+ supported

### Monitoring Tools
- Real-time performance dashboard
- Database query monitoring
- Redis cache hit rates
- API response time tracking
- User activity analytics
- Error rate monitoring
- System resource usage

## 🐛 Troubleshooting

### Common Issues
1. **Database Connection Errors**
   - Check DATABASE_URL environment variable
   - Verify PostgreSQL service is running
   - Confirm database exists and user has permissions

2. **Redis Connection Issues**
   - Verify REDIS_URL environment variable
   - Check Redis service status
   - Confirm network connectivity

3. **File Upload Failures**
   - Check MAX_FILE_SIZE configuration
   - Verify UPLOAD_PATH directory exists
   - Confirm write permissions

4. **Authentication Problems**
   - Verify JWT_SECRET is set
   - Check token expiration settings
   - Confirm refresh token flow

### Diagnostic Tools
- `health-check.sh` - System health verification
- `quick-diagnosis.sh` - Automated troubleshooting
- Browser diagnostic tool for client-side issues
- Performance monitoring dashboard
- Log analysis tools

## 🔄 Updates & Maintenance

### Version History
- **v2.0.0** (November 2025) - Initial release with stream clipping
- **v1.5.0** (October 2025) - Performance optimizations
- **v1.0.0** (September 2025) - Core platform launch

### Planned Features
- Mobile app development
- Advanced analytics dashboard
- Multi-language support
- AI-powered content recommendations
- Enhanced moderation tools
- API rate limiting improvements
- Advanced caching strategies

### Support
For technical support, licensing inquiries, or partnership opportunities:

**Email:** unknown@electricsunshinecult.com
**Subject:** Electric Sunshine Cult - [Your Inquiry Type]

## 📝 Legal Notice

This software is protected by copyright and proprietary laws. Unauthorized use, reproduction, or distribution is strictly prohibited and will result in legal action.

**Electric Sunshine Cult** and **Corey Setzer** retain all rights to this intellectual property.

---

**© 2025 Electric Sunshine Cult - All Rights Reserved**

*Developed with passion and precision by Corey Setzer, Unknown Artist Developer & Director Of Electric Sunshine Cult*

For the most up-to-date information, visit the GitHub repository:
https://github.com/ElectricSunshineCult/stream-cult-electric-sunshine