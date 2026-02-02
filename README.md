# Community Feed Prototype

A full-stack Django + React application for a community feed with threaded comments, likes/karma gamification, and a dynamic leaderboard.

## Quick Setup

### Backend Setup

1. Create and activate a virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\activate
```

2. Install dependencies:

```powershell
pip install -r requirements.txt
```

3. Run migrations:

```powershell
python manage.py migrate
```

4. Load test data (optional):

```powershell
python seed_data.py
```

5. Start the backend server:

```powershell
python manage.py runserver
```

Backend will be available at: `http://localhost:8000`

### Frontend Setup

1. Navigate to frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

Frontend will be available at: `http://localhost:5173` (or port shown in terminal)

### Access the Application

- **Frontend**: http://localhost:5173
- **API**: http://localhost:8000/api/


## API Endpoints

| Endpoint                   | Method | Auth | Description                |
| -------------------------- | ------ | ---- | -------------------------- |
| `/api/login/`              | POST   | No   | Login/Register user        |
| `/api/posts/`              | GET    | No   | List all posts             |
| `/api/posts/`              | POST   | Yes  | Create a post              |
| `/api/posts/<id>/`         | GET    | No   | Get post with comment tree |
| `/api/posts/<id>/like/`    | POST   | Yes  | Like a post (+5 karma)     |
| `/api/comments/create/`    | POST   | Yes  | Create comment/reply       |
| `/api/comments/<id>/like/` | POST   | Yes  | Like a comment (+1 karma)  |
| `/api/leaderboard/`        | GET    | No   | Top 5 users (last 24h)     |

## Key Features

 **Feed** - Create and view text posts with author and like count
 **Threaded Comments** - Unlimited nested comments (Reddit-style)
 **Gamification** - 5 karma for post likes, 1 karma for comment likes
 **Leaderboard** - Dynamic top 5 users based on karma from last 24 hours only
 **Light Theme UI** - Modern, clean design with smooth animations
 **Real-time Updates** - Posts and comments refresh immediately after actions
 **Race Condition Prevention** - Double-like prevention at database level
 **Query Optimization** - No N+1 queries, efficient comment tree loading
**Session Authentication** - Simple auto-login with session persistence

## Technical Architecture

### Database Schema

- **Post** - User's text posts
- **Comment** - Threaded comments with self-referential `parent` FK
- **PostLike** - Unique constraint prevents double-likes
- **CommentLike** - Unique constraint prevents double-likes

### Optimization Techniques

1. **Comment Tree**: Single query with `select_related` + in-memory tree building
2. **Concurrency**: Database-level unique constraints + atomic transactions
3. **Leaderboard**: Raw SQL UNION with weighted aggregation

See `EXPLAINER.md` for detailed technical explanations and the AI audit.

## Development

### Adding Test Data

```bash
python seed_data.py
```

This creates:

- 3 test users (Arthav, Chetna, Paul)
- 2 sample posts
- 5 nested comments
- Sample likes on posts and comments

### Running Tests

```bash
python manage.py test core
```

## Troubleshooting

### Posts not appearing in feed

- Ensure backend is running on port 8000
- Check that frontend can reach `http://localhost:8000/api/posts/`
- Verify user is logged in (check user badge in header)

### Like button not working

- Make sure you're logged in (user badge shows username)
- Check browser console for CSRF token warnings
- Verify credentials are being sent with requests

### Comments not nesting properly

- Refresh the page to reload full post
- Check that `parent` field is being sent with reply requests
