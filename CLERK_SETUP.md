# Clerk Integration Setup

This application uses Clerk for authentication. Follow these steps to complete the setup:

## 1. Create a Clerk Account
- Go to [https://dashboard.clerk.com/](https://dashboard.clerk.com/)
- Sign up for a free account
- Create a new application

## 2. Get Your Clerk Keys
In your Clerk dashboard:
- Navigate to **API Keys**
- Copy your **Publishable Key** (starts with `pk_test_` or `pk_live_`)

## 3. Configure Environment Variables

### Option A: Create a `.env` file locally
Create a `.env` file in the project root:
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

### Option B: Update main.tsx directly (not recommended for production)
Replace the placeholder in `src/main.tsx`:
```typescript
const CLERK_PUBLISHABLE_KEY = "pk_test_your_actual_key_here";
```

## 4. Configure Clerk Dashboard

In your Clerk dashboard, configure:

### Redirect URLs
Add these URLs to allowed redirects:
- `http://localhost:8080/admin` (for local development)
- Your production URL + `/admin` (for deployed site)

### Home URL
Set to your site's home URL:
- Local: `http://localhost:8080`
- Production: Your deployed URL

## 5. API Integration

The admin dashboard is ready to connect to your API. Each section (Events, Classes, Vendors, etc.) has placeholders for API integration.

### Connecting Your API:
1. Update `VITE_API_URL` in your environment variables
2. Use Clerk's `useAuth()` hook to get the user token:
```typescript
import { useAuth } from '@clerk/clerk-react';

const { getToken } = useAuth();
const token = await getToken();

// Use token in your API calls
fetch(`${API_URL}/endpoint`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## 6. Secret Keys (Backend Only)
⚠️ **IMPORTANT**: Never expose your Clerk Secret Key in frontend code!

- Your **Secret Key** should only be used in your backend/middleware
- Use it to verify tokens on your API server
- Store it securely in your backend environment variables

## Features Included

✅ Sign In page (`/sign-in`)
✅ Sign Up page (`/sign-up`)  
✅ Admin Dashboard (`/admin`)
✅ Protected routes (redirects to sign-in if not authenticated)
✅ User profile management (via Clerk's UserButton)

## Admin Dashboard Sections

The admin dashboard includes tabs for managing:
- Events & Shows
- Classes & Workshops
- Vendors
- Members
- Donations
- Competitions
- Newsletter
- Settings

Each section is ready for your API integration.

## Need Help?
- [Clerk Documentation](https://clerk.com/docs)
- [Clerk React Guide](https://clerk.com/docs/quickstarts/react)
