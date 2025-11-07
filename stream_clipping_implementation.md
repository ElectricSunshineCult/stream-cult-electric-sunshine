# Stream Clipping System
## Complete Implementation Guide

**Version:** 2.0.0  
**Last Updated:** 2025-11-07  
**Author:** MiniMax Agent

---

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Server Implementation](#server-implementation)
4. [Client Components](#client-components)
5. [Usage Guide](#usage-guide)
6. [API Reference](#api-reference)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The Stream Clipping System allows streamers to:

- ✅ **Record and save clips** from their live streams
- ✅ **Create clips manually** by selecting start/end times
- ✅ **Download clips locally** to their computer
- ✅ **Save clips to their profile** for sharing
- ✅ **Manage clips** (edit, delete, make public/private)
- ✅ **View clip analytics** (views, downloads, reactions)
- ✅ **Share clips** with others

### Key Features

**For Streamers:**
- Real-time clip creation while streaming
- Multiple quality options (480p, 720p, 1080p)
- Tag system for easy organization
- Public/private visibility settings
- Download and sharing capabilities

**For Viewers:**
- Browse public clips
- React to clips (like, love, laugh, wow)
- Comment on clips
- Share clips with others
- Download clips (if permitted)

---

## Database Schema

### Core Tables

#### `stream_clips`
Main table for storing clip metadata:

```sql
CREATE TABLE stream_clips (
    id SERIAL PRIMARY KEY,
    streamer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stream_id INTEGER REFERENCES streams(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time INTEGER NOT NULL, -- Seconds from stream start
    end_time INTEGER NOT NULL,   -- Seconds from stream start
    duration INTEGER GENERATED ALWAYS AS (end_time - start_time) STORED,
    file_path VARCHAR(500), -- Server-side storage path
    file_size BIGINT,       -- File size in bytes
    thumbnail_path VARCHAR(500),
    quality VARCHAR(20) NOT NULL DEFAULT '1080p',
    is_public BOOLEAN NOT NULL DEFAULT false,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    view_count INTEGER NOT NULL DEFAULT 0,
    download_count INTEGER NOT NULL DEFAULT 0,
    tags TEXT[], -- Array of tags for searching
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### `clip_reactions`
User reactions to clips:

```sql
CREATE TABLE clip_reactions (
    id SERIAL PRIMARY KEY,
    clip_id INTEGER NOT NULL REFERENCES stream_clips(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('like', 'dislike', 'love', 'laugh', 'wow')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(clip_id, user_id)
);
```

#### `clip_comments`
Comments on clips:

```sql
CREATE TABLE clip_comments (
    id SERIAL PRIMARY KEY,
    clip_id INTEGER NOT NULL REFERENCES stream_clips(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id INTEGER REFERENCES clip_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### `clip_analytics`
Analytics tracking:

```sql
CREATE TABLE clip_analytics (
    id SERIAL PRIMARY KEY,
    clip_id INTEGER NOT NULL REFERENCES stream_clips(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_stream_clips_streamer_id ON stream_clips(streamer_id);
CREATE INDEX idx_stream_clips_is_public ON stream_clips(is_public) WHERE is_public = true;
CREATE INDEX idx_stream_clips_view_count ON stream_clips(view_count DESC);
CREATE INDEX idx_clip_reactions_clip_id ON clip_reactions(clip_id);
CREATE INDEX idx_clip_comments_clip_id ON clip_comments(clip_id);

-- Full-text search
CREATE INDEX idx_stream_clips_search ON stream_clips 
USING gin(to_tsvector('english', title || ' ' || coalesce(description, '')));
```

---

## Server Implementation

### Route Structure

The clips API provides the following endpoints:

```
POST   /api/clips                 # Create a new clip
GET    /api/clips/profile/:userId # Get clips for user profile
GET    /api/clips/feed           # Get public clips feed
GET    /api/clips/:clipId        # Get specific clip
PUT    /api/clips/:clipId        # Update clip
DELETE /api/clips/:clipId        # Delete clip
POST   /api/clips/:clipId/react  # Add reaction to clip
GET    /api/clips/:clipId/reactions # Get clip reactions
GET    /api/clips/:clipId/comments # Get clip comments
POST   /api/clips/:clipId/comments # Add comment to clip
POST   /api/clips/:clipId/download # Record download
GET    /api/clips/search         # Search clips
```

### File Upload Configuration

```javascript
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'clips');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `clip-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|webm|avi|mov/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only video files are allowed!'));
    }
  }
});
```

### Key Features

**File Management:**
- Secure file upload with validation
- Automatic file organization
- File size limits and type checking
- Automatic cleanup on deletion

**Security:**
- Authentication required for all operations
- Users can only modify their own clips
- Public/private visibility controls
- Rate limiting on uploads

**Performance:**
- Database indexing for fast queries
- Pagination for large clip lists
- Efficient file serving
- Caching for public clips

---

## Client Components

### 1. StreamClipper Component

Real-time clip creation during streaming:

**Key Features:**
- Video player with timeline controls
- Mark start/end points functionality
- Real-time recording using MediaRecorder
- Clip configuration (title, description, tags)
- Public/private settings
- Local download and profile save

**Usage Example:**
```jsx
<StreamClipper
  streamId="123"
  isStreaming={true}
  streamUrl="rtmp://stream-url"
  onClipSave={(clip) => console.log('Clip saved:', clip)}
/>
```

**States:**
- Recording controls (start/stop recording)
- Time markers (start time, end time)
- Clip configuration form
- Upload progress tracking

### 2. ClipsManager Component

Profile-based clip management:

**Key Features:**
- Grid and list view modes
- Search and filtering capabilities
- Edit/delete functionality
- Analytics display
- Batch operations
- Tag management

**Usage Example:**
```jsx
<ClipsManager
  userId="456"
  isOwner={true}
  showAnalytics={true}
/>
```

**Filtering Options:**
- Search by title/description
- Filter by public/private status
- Filter by tags
- Sort by date, views, or title

### 3. ClipViewer Component

Public clip viewing experience:

**Key Features:**
- Full-featured video player
- Reaction system
- Comment threading
- Sharing capabilities
- Download functionality
- View count tracking

**Usage Example:**
```jsx
<ClipViewer
  clip={clipData}
  showComments={true}
  onBack={() => navigate('/profile')}
/>
```

### 4. Integrated Screen Share Controls

Enhanced screen sharing interface with clip creation:

**Key Features:**
- Tabbed interface (Screen Share + Create Clips)
- Seamless transition between sharing and clipping
- Real-time clip creation during screen share
- Performance monitoring

---

## Usage Guide

### For Streamers

#### Starting a Screen Share Session

1. **Navigate to Screen Share Controls**
   - Go to your stream dashboard
   - Click "Screen Share" tab

2. **Configure Settings**
   - Choose session type (screen, application, tab, window)
   - Select quality preset
   - Enable audio if needed
   - Add title and description

3. **Start Sharing**
   - Click "Start Screen Share"
   - Grant browser permissions
   - Begin streaming

#### Creating Clips

1. **Switch to Clips Tab**
   - While screen sharing, click "Create Clips" tab
   - Video player shows live feed

2. **Mark Clip Points**
   - Play to desired start position
   - Click "Set Start" button
   - Play to desired end position
   - Click "Set End" button

3. **Record Clip** (Optional)
   - Click "Start Recording" for live recording
   - Perform the action you want to clip
   - Click "Stop Recording"

4. **Configure Clip**
   - Enter title and description
   - Add tags (optional)
   - Choose quality
   - Set visibility (public/private)

5. **Save Clip**
   - Click "Save to Profile"
   - Or "Download" for local save

#### Managing Clips

1. **Access Clips Manager**
   - Go to your profile
   - Click "Clips" section
   - View all your clips

2. **Edit Clips**
   - Click edit button on any clip
   - Update title, description, or tags
   - Change visibility settings
   - Save changes

3. **Delete Clips**
   - Click delete button
   - Confirm deletion
   - Clip is permanently removed

### For Viewers

#### Browsing Clips

1. **Access Public Clips**
   - Go to clips section
   - Browse featured clips
   - Use search and filters

2. **Watching Clips**
   - Click on any clip
   - Full-screen video player
   - See clip information and stats

3. **Interacting with Clips**
   - React with emoji buttons
   - Add comments
   - Share with friends
   - Download (if allowed)

#### Searching Clips

1. **Text Search**
   - Use search bar
   - Search titles and descriptions
   - Filter by streamer

2. **Tag Filtering**
   - Select specific tags
   - Combine with text search
   - Browse by category

---

## API Reference

### Creating a Clip

**Endpoint:** `POST /api/clips`

**Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Request Body:**
```
video: <video file>
title: "Clip Title"
description: "Optional description"
startTime: "120"  // seconds
endTime: "180"    // seconds
quality: "1080p"
isPublic: true
tags: "gaming,funny,tutorial"
streamId: "123"   // optional
```

**Response:**
```json
{
  "message": "Clip created successfully",
  "clip": {
    "id": "456",
    "title": "Clip Title",
    "duration": 60,
    "file_path": "/uploads/clips/clip-123.webm",
    "created_at": "2025-11-07T10:14:08Z"
  }
}
```

### Getting User Clips

**Endpoint:** `GET /api/clips/profile/:userId`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `sort`: Sort field (default: created_at)
- `order`: Sort order (asc/desc, default: desc)

**Response:**
```json
{
  "clips": [
    {
      "id": "456",
      "title": "Epic Gaming Moment",
      "duration": 45,
      "view_count": 1250,
      "is_public": true,
      "tags": ["gaming", "epic"],
      "created_at": "2025-11-07T10:14:08Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

### Adding Reactions

**Endpoint:** `POST /api/clips/:clipId/react`

**Request Body:**
```json
{
  "reactionType": "like"  // like, love, laugh, wow, dislike
}
```

**Response:**
```json
{
  "message": "Reaction updated successfully",
  "reaction": {
    "id": "789",
    "reaction_type": "like",
    "user_id": "123"
  }
}
```

### Adding Comments

**Endpoint:** `POST /api/clips/:clipId/comments`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "content": "This clip is amazing!",
  "parentId": null  // for replies
}
```

**Response:**
```json
{
  "message": "Comment added successfully",
  "comment": {
    "id": "101",
    "content": "This clip is amazing!",
    "user": {
      "username": "viewer123",
      "display_name": "Viewer"
    },
    "created_at": "2025-11-07T10:14:08Z"
  }
}
```

---

## Troubleshooting

### Common Issues

#### Upload Failures

**Symptoms:**
- Clip upload fails with "File too large" error
- Upload progress gets stuck
- Server returns 413 status

**Solutions:**
1. **Check File Size**
   - Maximum file size: 500MB
   - Compress video or reduce quality
   - Split long clips into smaller segments

2. **Check File Format**
   - Supported: MP4, WebM, AVI, MOV
   - Ensure file is not corrupted
   - Try re-encoding if needed

3. **Network Issues**
   - Check internet connection
   - Try uploading during off-peak hours
   - Use wired connection if possible

#### Playback Problems

**Symptoms:**
- Clip won't play in browser
- Audio/video out of sync
- Low quality playback

**Solutions:**
1. **Browser Compatibility**
   - Use modern browser (Chrome 80+, Firefox 75+, Safari 13+)
   - Enable hardware acceleration
   - Clear browser cache

2. **File Format Issues**
   - Convert to MP4 with H.264 codec
   - Ensure audio codec is AAC
   - Check file integrity

3. **Network Speed**
   - Check internet speed
   - Lower quality settings
   - Pause other downloads

#### Performance Issues

**Symptoms:**
- Slow clip creation
- Browser becomes unresponsive
- High CPU/memory usage

**Solutions:**
1. **Browser Settings**
   - Close unnecessary tabs
   - Disable resource-heavy extensions
   - Enable hardware acceleration

2. **System Resources**
   - Check available RAM
   - Close background applications
   - Monitor CPU usage

3. **Recording Settings**
   - Use lower quality for recording
   - Reduce framerate if needed
   - Enable compression

### Error Messages

#### "Authentication required"
**Solution:** Ensure you're logged in and have a valid token

#### "Access denied"
**Solution:** You can only modify your own clips

#### "Invalid file type"
**Solution:** Use supported video formats (MP4, WebM, AVI, MOV)

#### "File too large"
**Solution:** Compress video or split into smaller clips

#### "Insufficient permissions"
**Solution:** Grant screen sharing and microphone permissions

### Debug Tools

#### Browser Console
Check for JavaScript errors and network issues:
```javascript
// Enable verbose logging
localStorage.setItem('debug-clips', 'true');

// Check upload progress
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => console.log('Media stream:', stream))
  .catch(error => console.error('Media error:', error));
```

#### Network Tab
Monitor file uploads and API calls:
1. Open Developer Tools (F12)
2. Go to Network tab
3. Filter by "XHR" or "Fetch"
4. Monitor upload progress

#### Database Queries
Check clip data in database:
```sql
-- Check clip statistics
SELECT 
  COUNT(*) as total_clips,
  AVG(duration) as avg_duration,
  SUM(view_count) as total_views
FROM stream_clips 
WHERE streamer_id = 123;

-- Find large files
SELECT title, file_size, created_at 
FROM stream_clips 
WHERE file_size > 100000000 
ORDER BY file_size DESC;
```

---

## Best Practices

### For Streamers

1. **Clip Planning**
   - Plan exciting moments ahead
   - Keep clips between 30-60 seconds
   - Use descriptive titles

2. **Quality Settings**
   - Use 1080p for high-quality content
   - Use 720p for better performance
   - Use 480p for mobile-friendly clips

3. **Organization**
   - Use consistent tagging
   - Organize clips by series/event
   - Regularly review and delete old clips

4. **Engagement**
   - Make clips shareable
   - Add interesting descriptions
   - Monitor analytics for insights

### For Developers

1. **File Management**
   - Implement automatic cleanup
   - Use CDN for file delivery
   - Monitor storage usage

2. **Performance**
   - Use proper indexing
   - Implement caching
   - Monitor database performance

3. **Security**
   - Validate all inputs
   - Sanitize file uploads
   - Use proper authentication

4. **User Experience**
   - Provide clear feedback
   - Show upload progress
   - Handle errors gracefully

---

*This implementation provides a complete stream clipping system that enhances user engagement and content creation capabilities.*