# Strava API Research

## OAuth
- Uses OAuth 2.0 with short-lived access tokens (6 hours) and long-lived refresh tokens
- Auth URL: `https://www.strava.com/oauth/authorize` with `scope=read,activity:read_all`
- Token exchange: `POST https://www.strava.com/oauth/token`
- Refresh: use `refresh_token` when `expires_at` is reached
- Must store `refresh_token`, `access_token`, `expires_at` durably

## Key Endpoints
| Resource | Endpoint | Key Fields |
|----------|----------|------------|
| Activity | `GET /api/v3/activities/{id}` | `description`, `start_date`, `map.polyline`, `distance`, `total_elevation_gain` |
| List Activities | `GET /api/v3/athlete/activities` | paginated, returns summary activities |
| GPS Streams | `GET /api/v3/activities/{id}/streams?keys=latlng,altitude,time,distance&key_by_type=true` | arrays of `[lat, lng]` |
| Photos | `GET /api/v3/activities/{id}/photos` | `location: [lat, lng]`, `urls` (sizes), `source` |

## Hashtag Matching
- Hashtags are in the `description` field of activities
- Need `activity:read_all` scope to see private descriptions
- Parse descriptions to extract hashtags for trip grouping

## Photo Matching
- Strava photos have `location`, `urls`, `source` fields
- No original filename exposed in API
- Can use `unique_id`, `location`, `created_at` timestamps for cross-referencing with Google Photos

## Rate Limits
- Overall: 200 requests per 15 minutes, 2,000 per day
- Read-only: 100 requests per 15 minutes, 1,000 per day
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Usage`
- Strategy: cache all data in Firestore after initial fetch

## CRITICAL: List vs Detail Endpoints
- GET /athlete/activities returns SummaryActivity objects -- `description` is ALWAYS null
- GET /activities/{id} returns DetailedActivity -- `description` contains the actual text (including hashtags)
- You MUST fetch individual activity details to get descriptions for trip grouping
- With 64 activities, this means 64 read requests + 1 list request = 65 reads per sync (within 100/15min limit)
