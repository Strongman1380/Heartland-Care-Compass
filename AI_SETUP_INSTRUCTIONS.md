# AI Setup Instructions

## Current Status

✅ **API Key is configured**: The OpenAI API key is properly set in:
- `.env` (root directory)
- `.env.local` 
- `functions/.env`
- Firebase Functions Config (production) - ✅ CONFIGURED
- Vercel (production) - ✅ CONFIGURED (vercel.json updated)

## Local Development

The AI features will work locally with Firebase emulators. To start:

```bash
# Start the emulators (includes AI endpoints)
npm run start

# Test the AI status endpoint
curl http://localhost:5000/api/ai/status
```

## Production Deployment

For the AI to work in production (deployed Firebase functions), you have two options:

### Option 1: Firebase Secrets (Recommended - Requires Blaze Plan)

```bash
# Set the secrets via Firebase CLI
firebase functions:secrets:set OPENAI_API_KEY
# Enter your API key when prompted

firebase functions:secrets:set OPENAI_MODEL
# Enter: gpt-4o-mini

firebase functions:secrets:set OPENAI_MODEL_PREMIUM  
# Enter: gpt-4o

firebase functions:secrets:set OPENAI_MAX_TOKENS
# Enter: 2000

# Redeploy functions
npm run deploy:functions
```

**Note**: Requires Firebase Blaze (pay-as-you-go) plan. Upgrade at:
https://console.firebase.google.com/project/heartland-boys-home-data/usage/details

### Option 2: Firebase Config (Quick Fix)

```bash
# Set config values via Firebase CLI
firebase functions:config:set openai.api_key="YOUR_OPENAI_API_KEY"
firebase functions:config:set openai.model="gpt-4o-mini"
firebase functions:config:set openai.model_premium="gpt-4o"
firebase functions:config:set openai.max_tokens="2000"

# Redeploy functions
npm run deploy:functions
```

## Testing AI Endpoints

After setup, test with these endpoints:

```bash
# Check AI status
curl https://us-central1-heartland-boys-home-data.cloudfunctions.net/api/ai/status

# Test note summarization
curl -X POST https://us-central1-heartland-boys-home-data.cloudfunctions.net/api/ai/summarize-note \
  -H "Content-Type: application/json" \
  -d '{"noteContent": "Youth showed improved behavior today. Participated in group activities."}'
```

## API Key Details

The configured API key is stored securely in Vercel environment variables — never commit real keys to source control.

- Model: gpt-4o-mini (standard), gpt-4o (premium)
- Max tokens: 2000
- Cost: ~$0.0004 per note summary, ~$0.0015 per full report

## Deployment Status

✅ **Firebase Functions Config**: CONFIGURED
- API key, model settings, and max tokens are all set

⚠️ **Deployment**: Requires Firebase Blaze Plan
- The project needs to be upgraded to a paid plan to deploy functions
- Once upgraded, run: `firebase deploy --only functions`

## Troubleshooting

1. **AI not working locally**: Run `npm run start` and test `/api/ai/status`
2. **AI not working in production**: Once Blaze plan is enabled, run deployment
3. **Invalid API key**: Get a new key from https://platform.openai.com/api-keys
4. **Quota exceeded**: Check your OpenAI billing at https://platform.openai.com/account/billing
