# STREAM CULT - Electric Sunshine Cult Advanced Gaming & Streaming Platform

An advanced full-stack streaming platform developed by **Corey Setzer** aka **Unknown Artist Developer & Director Of Electric Sunshine Cult** featuring user levels, experience system, enhanced leaderboards, token-based tipping, real-time chat, regional organization, and comprehensive gamification features.

**Copyright (c) 2025 Corey Setzer - Electric Sunshine Cult**

*This software is proprietary and confidential. Unauthorized reproduction, distribution, or use of this software is strictly prohibited. Electric Sunshine Cult reserves all rights to this intellectual property.*

**For licensing inquiries, contact: info@electricsunshinecult.com**

![STREAM CULT](https://img.shields.io/badge/Platform-Electric%20Sunshine%20Cult-purple)
![License](https://img.shields.io/badge/License-PROPRIETARY-red)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)

---

## 👑 About the Developer

**Corey Setzer** - *Unknown Artist Developer & Director Of Electric Sunshine Cult*

This advanced streaming platform is a proprietary creation of Electric Sunshine Cult, featuring cutting-edge technology and innovative streaming solutions. All development, architecture, and creative vision are credited to Corey Setzer and the Electric Sunshine Cult organization.

**ELECTRIC SUNSHINE CULT MARK** - This code and platform are protected under the Electric Sunshine Cult brand. Any unauthorized use will result in immediate legal action.

## 🚀 Features

### Core Platform Features
- **Live Streaming**: WebRTC/RTMP compatible streaming with OBS integration
- **Token System**: CULT token-based tipping and monetization
- **Real-time Chat**: WebSocket-powered chat with moderation tools
- **Regional Organization**: Global content organization by continent/country
- **Multi-role System**: Viewer, Streamer, Moderator, Admin roles
- **NSFW Content Gating**: Age verification and content filtering
- **Payment Processing**: Stripe integration for token purchases
- **Admin Dashboard**: Comprehensive platform management tools

### 🏆 Gamification & User Experience
- **User Level System**: 10 progressive levels from Newbie to Immortal
- **Experience Points**: Earn XP through token purchases, tips, watching, and streaming
- **Achievement System**: 10+ unique achievements with badges and rewards
- **Enhanced Leaderboards**: Multiple categories (Experience, Spending, Earning, Watch Time, Stream Time)
- **Progress Tracking**: Detailed analytics and user statistics
- **Daily Streaks**: Login and activity streak rewards
- **Level Benefits**: Progressive perks and privileges based on user level
- **Performance Optimized**: Fast loading, lazy loading, and optimized rendering

### User Features
- **Stream Discovery**: Browse live streams by region and category
- **Token Tipping**: Send tokens with custom messages and actions
- **Following System**: Follow favorite streamers
- **Private Messaging**: Whisper system for private communication
- **Stream Goals**: Set and track streaming fundraising goals
- **Profile Management**: Customizable user profiles and settings

### Creator Features
- **OBS Integration**: Stream key generation and OBS overlay
- **Analytics Dashboard**: Detailed streaming and earnings analytics
- **Stream Management**: Start/stop streams, set goals, manage content
- **Token Withdrawals**: Convert earned tokens to fiat currency
- **Custom Actions**: Define paid streamer actions (reviews, challenges, etc.)

### Admin Features
- **User Management**: Ban/unban users, role management
- **Content Moderation**: Message filtering and user monitoring
- **System Analytics**: Platform-wide statistics and insights
- **Category Management**: Create and manage stream categories
- **Financial Reports**: Transaction and revenue tracking

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Real-time**: Socket.IO
- **Cache**: Redis
- **Authentication**: JWT tokens
- **Payments**: Stripe
- **Validation**: express-validator

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **State Management**: React Query, Zustand
- **Real-time**: Socket.IO Client
- **UI Components**: Headless UI
- **Charts**: Chart.js
- **Forms**: React Hook Form + Yup

### Infrastructure
- **Container**: Docker support
- **Process Manager**: PM2
- **Web Server**: Nginx (production)
- **Monitoring**: Winston logging
- **Security**: Helmet, CORS, Rate limiting

## 📁 Project Structure

```
the-stream-cult/
├── server/                    # Backend application
│   ├── config/               # Database and service configurations
│   ├── database/             # Database schema and migrations
│   ├── middleware/           # Express middleware
│   ├── routes/              # API route handlers
│   │   ├── auth.js          # Authentication routes
│   │   ├── streams.js       # Stream management
│   │   ├── tips.js          # Token tipping system
│   │   ├── users.js         # User management
│   │   ├── chat.js          # Chat system
│   │   ├── regions.js       # Regional organization
│   │   ├── admin.js         # Administrative functions
│   │   └── payments.js      # Payment processing
│   ├── services/            # Business logic services
│   │   ├── socketService.js # Real-time communication
│   │   ├── redisService.js  # Cache management
│   │   └── tokenService.js  # JWT token handling
│   ├── scripts/             # Database and utility scripts
│   ├── index.js            # Main server file
│   └── package.json
├── client/                  # Frontend application
│   ├── src/
│   │   ├── app/            # Next.js app directory
│   │   │   ├── layout.tsx  # Root layout
│   │   │   ├── page.tsx    # Home page
│   │   │   └── globals.css # Global styles
│   │   ├── components/     # React components
│   │   │   ├── layout/     # Layout components
│   │   │   ├── streams/    # Stream-related components
│   │   │   ├── ui/         # Reusable UI components
│   │   │   └── home/       # Home page components
│   │   ├── contexts/       # React contexts
│   │   │   ├── AuthContext.tsx
│   │   │   ├── SocketContext.tsx
│   │   │   ├── ThemeContext.tsx
│   │   │   └── ToastContext.tsx
│   │   ├── lib/            # Utility libraries
│   │   │   └── api.ts      # API client and types
│   │   └── hooks/          # Custom React hooks
│   ├── public/            # Static assets
│   ├── next.config.js     # Next.js configuration
│   ├── tailwind.config.js # TailwindCSS configuration
│   └── package.json
├── package.json            # Root package.json
└── README.md              # This file
```

## 🏗️ Installation & Setup

### Prerequisites
- Node.js 18+ 
- PostgreSQL 13+
- Redis 6+
- npm or yarn
- Optional: Docker, Docker Compose

### 1. Clone the Repository
```bash
git clone <repository-url>
cd the-stream-cult
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install all dependencies (server + client)
npm run install:all
```

### 3. Environment Configuration

#### Server Environment (.env)
Create `server/.env`:
```env
# Server Configuration
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stream_cult
DB_USER=postgres
DB_PASSWORD=your_password_here

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Secrets
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
JWT_REFRESH_SECRET=your_super_secret_refresh_key_here_change_in_production
JWT_STREAMER_SECRET=your_super_secret_streamer_key_here_change_in_production
JWT_OBS_SECRET=your_super_secret_obs_key_here_change_in_production

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# RTMP Configuration
RTMP_BASE_URL=rtmp://localhost/live
```

#### Client Environment (.env.local)
Create `client/.env.local`:
```env
# Client Environment Variables
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

### 4. Database Setup
```bash
# Navigate to server directory
cd server

# Run database migrations and seed data
npm run db:migrate
npm run db:seed
```

### 5. Start Development Servers
```bash
# From root directory - starts both server and client
npm run dev

# Or start individually:
# Server only
cd server && npm run dev

# Client only  
cd client && npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/health

## 🔧 Development

### Default Accounts
After running the seed script, you can use these test accounts:

**Admin Account:**
- Username: `admin`
- Password: `admin123`
- Email: `admin@streamcult.com`

**Test Streamer:**
- Username: `GameMaster99`
- Password: `streamer123`
- Email: `gm@streamcult.com`

**Regular User:**
- Username: `viewer1`
- Password: `viewer123`
- Email: `viewer@streamcult.com`

### API Documentation

#### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/verify` - Verify token
- `POST /api/auth/age-verify` - Age verification for NSFW

#### Stream Endpoints
- `GET /api/streams/live` - Get live streams
- `GET /api/streams/:id` - Get specific stream
- `POST /api/streams` - Create new stream
- `POST /api/streams/:id/start` - Start streaming
- `POST /api/streams/:id/stop` - Stop streaming

#### Tip Endpoints
- `POST /api/tips/send` - Send tip
- `GET /api/tips/sent` - Get sent tips
- `GET /api/tips/received` - Get received tips
- `GET /api/tips/analytics/streamer` - Get tip analytics

#### User Endpoints
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/profile` - Update profile
- `POST /api/users/:id/follow` - Follow user
- `GET /api/users/search/:query` - Search users

#### Payment Endpoints
- `GET /api/payments/token-packages` - Get token packages
- `POST /api/payments/create-payment-intent` - Create payment
- `POST /api/payments/confirm-payment` - Confirm payment
- `GET /api/payments/transactions` - Get transaction history

#### Admin Endpoints
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/users` - Manage users
- `POST /api/admin/users/:id/ban` - Ban user
- `GET /api/admin/streams` - Manage streams
- `GET /api/admin/stats` - System statistics

### WebSocket Events

#### Client → Server
- `join-stream` - Join a stream room
- `leave-stream` - Leave a stream room
- `send-message` - Send chat message
- `send-tip` - Send token tip
- `stream-status` - Start/stop streaming

#### Server → Client
- `stream-live` - Stream goes live
- `stream-offline` - Stream goes offline
- `new-message` - New chat message
- `tip-received` - Received a tip
- `viewer-count-update` - Viewer count changed

### Database Schema

The platform uses the following main tables:

- **users** - User accounts and profiles
- **streams** - Live stream information
- **tips** - Token tipping records
- **messages** - Chat messages
- **regions** - Geographic regions
- **categories** - Stream categories
- **transactions** - Financial transactions
- **moderation_logs** - Administrative actions

## 🏭 Production Deployment

### Environment Variables
Update production environment variables:

```env
# Production Settings
NODE_ENV=production
PORT=5000
CLIENT_URL=https://yourdomain.com

# Security
JWT_SECRET=your_very_secure_production_secret
JWT_REFRESH_SECRET=your_very_secure_refresh_secret

# Database
DB_HOST=your_production_db_host
DB_PASSWORD=your_secure_db_password

# External Services
STRIPE_SECRET_KEY=sk_live_your_live_stripe_key
REDIS_URL=redis://your_production_redis

# Domain & CDN
RTMP_BASE_URL=rtmp://your-cdn.com/live
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build individual containers
docker build -t stream-cult-server ./server
docker build -t stream-cult-client ./client
```

### PM2 Production
```bash
# Install PM2 globally
npm install -g pm2

# Start production server
cd server
pm2 start index.js --name "stream-cult-server"

# Start with ecosystem file
pm2 start ecosystem.config.js
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # API Backend
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket for real-time features
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🧪 Testing

### Run Tests
```bash
# Backend tests
cd server
npm test

# Frontend tests
cd client
npm test

# Run all tests
npm run test:all
```

### Test Coverage
```bash
# Generate coverage report
npm run test:coverage
```

## 🔍 Troubleshooting

### Common Issues

#### Database Connection
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check Redis is running
redis-cli ping
```

#### Port Conflicts
```bash
# Check what's using port 5000
lsof -i :5000

# Change port in .env if needed
PORT=5001
```

#### Token Issues
- Verify JWT_SECRET is set correctly
- Check token expiration times
- Clear browser localStorage and re-login

#### Payment Issues
- Verify Stripe keys are correct
- Check webhook endpoint configuration
- Ensure SSL certificate for production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use Prettier for code formatting
- Write tests for new features
- Update documentation for API changes
- Follow the existing project structure

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [TailwindCSS](https://tailwindcss.com/)
- Real-time features by [Socket.IO](https://socket.io/)
- Payment processing by [Stripe](https://stripe.com/)
- UI components from [Headless UI](https://headlessui.com/)

## 📞 Support

For support, email support@streamcult.com or join our Discord server.

## 🗺️ Roadmap

### Phase 1 - MVP (Current)
- [x] Basic streaming functionality
- [x] Token tipping system
- [x] User authentication
- [x] Real-time chat
- [x] Regional organization
- [x] Admin dashboard

### Phase 2 - Enhancement
- [ ] Mobile application
- [ ] Advanced analytics
- [ ] NFT integration
- [ ] Discord/Telegram bots
- [ ] Advanced moderation tools
- [ ] Multi-language support

### Phase 3 - Scale
- [ ] CDN integration
- [ ] Microservices architecture
- [ ] Kubernetes deployment
- [ ] Advanced AI features
- [ ] Web3 integrations
- [ ] Global expansion

---

**Built with ❤️ by Electric Sunshine Cult**

For the latest updates and announcements, follow [@thestreamcult](https://twitter.com/thestreamcult)