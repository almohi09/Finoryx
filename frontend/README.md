# Fynorix Frontend

## Local development

Create `frontend/.env` with:

```env
VITE_API_URL=http://localhost:3000/api
```

Then run the frontend and backend separately.

## Render deployment

This frontend requires an explicit backend URL in production.

Set this environment variable on the frontend Render service:

```env
VITE_API_URL=https://your-backend-service.onrender.com/api
```

Set these environment variables on the backend Render service:

```env
NODE_ENV=production
CLIENT_URLS=https://your-frontend-service.onrender.com
JWT_SECRET=your-secret
MONGODB_URI=your-mongodb-connection-string
```

## Why the site can load but still not work

If `VITE_API_URL` is missing, the frontend may deploy successfully but API calls such as login, dashboard, and profile requests will fail in production. The app now surfaces that misconfiguration clearly instead of silently calling the wrong origin.

## Quick verification

After deployment, verify:

1. The frontend opens from the Render URL on desktop and mobile.
2. `https://your-backend-service.onrender.com/api/health` returns `{"status":"ok"}`.
3. Browser network requests from the frontend go to your backend Render URL, not to `/api` on the frontend domain.
