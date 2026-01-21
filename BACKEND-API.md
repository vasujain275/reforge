# Reforge Backend API Endpoints

This document lists all the API endpoints required by the Reforge frontend. All endpoints should be prefixed with `/api/v1`.

## Base URL
```
/api/v1
```

## Authentication
All endpoints except those marked as **Public** require authentication via HTTP-only cookies (access_token and refresh_token).

---

## Existing Endpoints (Already Implemented)

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check endpoint |

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | User login |
| POST | `/auth/logout` | User logout |
| POST | `/auth/refresh` | Refresh access token |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users` | Create new user (Public) |
| GET | `/users/me` | Get current authenticated user |

---

## New Endpoints Required

### Dashboard

#### GET `/dashboard/stats`
Returns dashboard statistics for the current user.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_problems": 47,
    "mastered_problems": 12,
    "avg_confidence": 67,
    "current_streak": 5,
    "weakest_pattern": {
      "name": "Backtracking",
      "confidence": 42
    }
  }
}
```

---

### Problems

#### GET `/problems`
Returns all problems for the current user with their stats.

**Query Parameters:**
- `status` (optional): Filter by status (`unsolved`, `solved`, `abandoned`)
- `difficulty` (optional): Filter by difficulty (`easy`, `medium`, `hard`)
- `search` (optional): Search by title

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Two Sum",
      "source": "LeetCode",
      "url": "https://leetcode.com/problems/two-sum",
      "difficulty": "easy",
      "created_at": "2025-01-15T00:00:00Z",
      "stats": {
        "id": 1,
        "user_id": 1,
        "problem_id": 1,
        "status": "solved",
        "confidence": 70,
        "avg_confidence": 68,
        "last_attempt_at": "2025-12-22T00:00:00Z",
        "total_attempts": 3,
        "last_outcome": "passed",
        "updated_at": "2025-12-22T00:00:00Z"
      }
    }
  ]
}
```

#### GET `/problems/urgent`
Returns the top 5 problems that need immediate revision based on the scoring algorithm.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Merge K Sorted Lists",
      "difficulty": "hard",
      "source": "LeetCode",
      "score": 0.89,
      "days_since_last": 23,
      "confidence": 35,
      "reason": "Low confidence (35%), 23 days old, failed last",
      "created_at": "2025-01-08T00:00:00Z"
    }
  ]
}
```

**Scoring Algorithm:**
The urgency score should be calculated based on:
- Days since last attempt (higher = more urgent)
- Current confidence level (lower = more urgent)
- Last outcome (failed = more urgent)
- Number of failed attempts

#### POST `/problems`
Create a new problem.

**Request Body:**
```json
{
  "title": "Two Sum",
  "source": "LeetCode",
  "url": "https://leetcode.com/problems/two-sum",
  "difficulty": "easy"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Two Sum",
    "source": "LeetCode",
    "url": "https://leetcode.com/problems/two-sum",
    "difficulty": "easy",
    "created_at": "2025-12-27T00:00:00Z"
  }
}
```

#### GET `/problems/:id`
Get a single problem by ID.

#### PUT `/problems/:id`
Update a problem.

#### DELETE `/problems/:id`
Delete a problem.

---

### Sessions

#### GET `/sessions`
Returns all revision sessions for the current user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "template_key": "daily_revision",
      "created_at": "2025-12-27T09:30:00Z",
      "planned_duration_min": 35,
      "completed": true
    }
  ]
}
```

#### POST `/sessions/generate`
Generate an optimized session based on template and user progress.

**Request Body:**
```json
{
  "template_key": "daily_revision",
  "duration_min": 35
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "problems": [
      {
        "id": 1,
        "title": "Merge K Sorted Lists",
        "difficulty": "hard",
        "source": "LeetCode",
        "score": 0.89,
        "days_since_last": 23,
        "confidence": 35,
        "reason": "Low confidence (35%), 23 days old",
        "created_at": "2025-01-08T00:00:00Z"
      }
    ]
  }
}
```

**Template Keys:**
- `daily_revision`: 35 min, max medium difficulty
- `daily_mixed`: 55 min, max hard difficulty
- `weekend_comprehensive`: 150 min, max hard difficulty

#### POST `/sessions`
Create and start a new session.

**Request Body:**
```json
{
  "template_key": "daily_revision",
  "duration_min": 35,
  "problem_ids": [1, 2, 3]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 1,
    "template_key": "daily_revision",
    "created_at": "2025-12-27T10:00:00Z",
    "planned_duration_min": 35,
    "completed": false
  }
}
```

#### GET `/sessions/:id`
Get a single session by ID with its problems.

#### PUT `/sessions/:id`
Update a session (e.g., mark as completed).

---

### Patterns

#### GET `/patterns`
Returns all patterns with user stats.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Two Pointers",
      "description": "Use two pointers to traverse arrays or strings",
      "problemCount": 12,
      "stats": {
        "id": 1,
        "user_id": 1,
        "pattern_id": 1,
        "times_revised": 15,
        "avg_confidence": 78,
        "last_revised_at": "2025-12-25T00:00:00Z"
      }
    }
  ]
}
```

#### POST `/patterns`
Create a new pattern.

**Request Body:**
```json
{
  "title": "Two Pointers",
  "description": "Use two pointers to traverse arrays or strings"
}
```

#### GET `/patterns/:id`
Get a single pattern by ID.

#### PUT `/patterns/:id`
Update a pattern.

#### DELETE `/patterns/:id`
Delete a pattern.

---

### User Settings

#### GET `/users/settings`
Get user settings/preferences.

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "John Doe",
    "email": "john@example.com",
    "theme": "dark",
    "default_duration": 35,
    "daily_goal": 3,
    "reminder_time": "09:00",
    "notifications_enabled": true
  }
}
```

#### PUT `/users/settings`
Update user settings.

**Request Body:**
```json
{
  "name": "John Doe",
  "theme": "dark",
  "default_duration": 35,
  "daily_goal": 3,
  "reminder_time": "09:00",
  "notifications_enabled": true
}
```

---

## Error Response Format

All error responses should follow this format:

```json
{
  "success": false,
  "message": "Error description here",
  "error": "Optional error code or details"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (no permission)
- `404` - Not Found
- `500` - Internal Server Error

---

## Database Schema Reference

Based on existing migrations, ensure these tables exist:

### users
- id, name, email, password_hash, created_at, updated_at

### problems
- id, title, source, url, difficulty, created_at

### user_problem_stats
- id, user_id, problem_id, status, confidence, avg_confidence, last_attempt_at, total_attempts, last_outcome, updated_at

### patterns
- id, title, description, created_at

### user_pattern_stats
- id, user_id, pattern_id, times_revised, avg_confidence, last_revised_at

### revision_sessions
- id, user_id, template_key, created_at, planned_duration_min, completed

### session_problems (join table)
- session_id, problem_id

### refresh_tokens
- id, user_id, token, expires_at, created_at

---

## Notes

1. All timestamps should be in ISO 8601 format (UTC)
2. Confidence values are integers from 0-100
3. Difficulty enum: `easy`, `medium`, `hard`
4. Status enum: `unsolved`, `solved`, `abandoned`
5. Outcome enum: `passed`, `failed`, `partial`
