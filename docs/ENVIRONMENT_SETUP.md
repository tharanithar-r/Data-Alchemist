# Environment Setup Guide

## Overview

Data Alchemist requires environment variables for proper configuration, especially for AI features using Google Gemini API.

## Quick Setup

1. **Copy the environment template:**
   ```bash
   cp .env.example .env.local
   ```

2. **Get your Google Gemini API key:**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Copy the generated key

3. **Update `.env.local` with your API key:**
   ```bash
   GOOGLE_GEMINI_API_KEY=your_actual_api_key_here
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_GEMINI_API_KEY` | Google Gemini API key for AI features | `AIzaSyC...` |

### Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `NEXT_PUBLIC_APP_NAME` | Application display name | `Data Alchemist` | `My Data App` |
| `NEXT_PUBLIC_APP_VERSION` | Application version | `0.1.0` | `1.0.0` |
| `GEMINI_API_ENDPOINT` | Custom Gemini API endpoint | Google's default | `https://api.example.com` |
| `GEMINI_MAX_REQUESTS_PER_MINUTE` | Rate limiting for API calls | `15` | `30` |
| `GEMINI_MAX_TOKENS_PER_REQUEST` | Token limit per request | `1000000` | `500000` |

## Environment Validation

The application automatically validates environment variables on startup. If required variables are missing or invalid, you'll see a detailed error message.

### Example Error Message:
```
Environment validation failed:
GOOGLE_GEMINI_API_KEY: Google Gemini API key is required
```

## Different Environments

### Development (`.env.local`)
- Used for local development
- Contains real API keys and sensitive data
- **Never commit this file to git**

### Production (Environment Variables)
Set these in your deployment platform (Vercel, Netlify, etc.):
- `GOOGLE_GEMINI_API_KEY`
- Any other required variables

### Testing (Set in CI/CD)
For testing, you can use mock values:
```bash
GOOGLE_GEMINI_API_KEY=test-key-for-ci
```

## Troubleshooting

### API Key Issues
- **Invalid key format**: Ensure the key starts with `AIzaSy` for Google Gemini
- **Permissions**: Make sure the API key has access to Generative AI services
- **Quotas**: Check your Google Cloud Console for API quotas and usage

### Rate Limiting
If you hit rate limits, you can adjust:
- `GEMINI_MAX_REQUESTS_PER_MINUTE`: Lower this value
- Add delays between requests in your usage

### Environment Not Loading
1. Ensure `.env.local` is in the project root
2. Restart the development server after changes
3. Check for typos in variable names
4. Verify the file is not being ignored by git

## Security Notes

- **Never commit `.env.local`** - it's already in `.gitignore`
- **Use different API keys** for development and production
- **Rotate API keys** regularly for security
- **Monitor API usage** to detect unauthorized access

## Need Help?

If you encounter issues:
1. Check the console for validation error messages
2. Verify your API key in Google AI Studio
3. Ensure all required variables are set
4. Try restarting the development server