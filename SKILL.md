---
name: clawpost
description: AI-powered social media publishing for LinkedIn and X (Twitter) with algorithm optimization and scheduling.
version: 0.1.0
metadata:
  openclaw:
    emoji: "📱"
    homepage: https://clawpost.dev
    primaryEnv: CLAW_API_KEY
    requires:
      env:
        - CLAW_API_KEY
      bins:
        - curl
---

# Social Media Publisher Skill

ClawPost helps you create, manage, and publish content to LinkedIn and X (Twitter) — with AI-assisted writing, drafts, scheduling, and direct publishing via API.

## Getting Started

If the user doesn't have an account or API key yet, walk them through these steps:

1. **Sign up** at [clawpost.dev](https://clawpost.dev) — sign in with LinkedIn.
2. **Connect platforms** — In the Dashboard, connect LinkedIn and/or X (Twitter) accounts.
3. **Add credits** — Go to Dashboard → Billing and top up credits (minimum $5). Credits are used for AI generation features.
4. **Generate an API key** — Go to Dashboard → Settings → API Keys → Generate New Key. The key starts with `claw_`.
5. **Set the environment variable**:
   ```bash
   export CLAW_API_KEY="claw_your_key_here"
   ```

## Setup

Required environment variable:
- `CLAW_API_KEY` — your API key (starts with `claw_`). Generate one following the steps above.

Optional:
- `CLAW_API_URL` — defaults to `https://clawpost.dev`. Only set this if using a self-hosted instance.

All endpoints are under `{{CLAW_API_URL}}/api/claw/v1/` (default: `https://clawpost.dev/api/claw/v1/`).

## Authentication

Every request needs the header:
```
Authorization: Bearer {{CLAW_API_KEY}}
```

## Response Format

All responses follow this shape:
```json
{
  "success": true/false,
  "message": "Human-readable summary",
  "data": { ... },
  "error": { "code": "ERROR_CODE", "details": "..." }
}
```

Always read the `message` field — it's designed to be relayed directly to the user.

## Endpoints

### Check Status
Verify your API key works and see what's connected.
```bash
curl -s {{CLAW_API_URL}}/api/claw/v1/status \
  -H "Authorization: Bearer {{CLAW_API_KEY}}"
```

### List Connected Platforms
```bash
curl -s {{CLAW_API_URL}}/api/claw/v1/platforms \
  -H "Authorization: Bearer {{CLAW_API_KEY}}"
```

### Check Credits
```bash
curl -s {{CLAW_API_URL}}/api/claw/v1/credits \
  -H "Authorization: Bearer {{CLAW_API_KEY}}"
```

### List Posts
Filter by status (`draft`, `published`, `scheduled`, `failed`) and platform (`linkedin`, `twitter`).
```bash
curl -s "{{CLAW_API_URL}}/api/claw/v1/posts?status=draft&platform=linkedin&limit=10" \
  -H "Authorization: Bearer {{CLAW_API_KEY}}"
```

### Get Single Post
```bash
curl -s {{CLAW_API_URL}}/api/claw/v1/posts/POST_ID \
  -H "Authorization: Bearer {{CLAW_API_KEY}}"
```
Each post includes an `availableActions` array (e.g., `["publish", "schedule", "update", "delete"]`).

### Create a Draft
```bash
curl -s -X POST {{CLAW_API_URL}}/api/claw/v1/drafts \
  -H "Authorization: Bearer {{CLAW_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d '{"content": "Your post text here", "platform": "linkedin"}'
```
Platform: `"linkedin"` or `"twitter"`. Twitter content must be ≤ 280 characters.

### Update a Draft
```bash
curl -s -X PUT {{CLAW_API_URL}}/api/claw/v1/posts/POST_ID \
  -H "Authorization: Bearer {{CLAW_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d '{"content": "Updated post text"}'
```

### Delete a Draft
```bash
curl -s -X DELETE {{CLAW_API_URL}}/api/claw/v1/posts/POST_ID \
  -H "Authorization: Bearer {{CLAW_API_KEY}}"
```

### Publish a Draft
```bash
curl -s -X POST {{CLAW_API_URL}}/api/claw/v1/posts/POST_ID/publish \
  -H "Authorization: Bearer {{CLAW_API_KEY}}"
```

### Direct Publish (No Draft Step)
```bash
curl -s -X POST {{CLAW_API_URL}}/api/claw/v1/publish \
  -H "Authorization: Bearer {{CLAW_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d '{"content": "Publishing this directly!", "platform": "linkedin"}'
```

### Schedule a Draft
```bash
curl -s -X POST {{CLAW_API_URL}}/api/claw/v1/posts/POST_ID/schedule \
  -H "Authorization: Bearer {{CLAW_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d '{"scheduledAt": "2026-06-15T10:00:00Z"}'
```

### Direct Schedule (No Draft Step)
```bash
curl -s -X POST {{CLAW_API_URL}}/api/claw/v1/schedule \
  -H "Authorization: Bearer {{CLAW_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d '{"content": "Scheduled post!", "platform": "linkedin", "scheduledAt": "2026-06-15T10:00:00Z"}'
```

### AI Generate Post
Let AI write a post based on your prompt. Optional: `tone` and `platform`.
```bash
curl -s -X POST {{CLAW_API_URL}}/api/claw/v1/ai/generate \
  -H "Authorization: Bearer {{CLAW_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Write about the importance of code reviews", "platform": "linkedin"}'
```

### AI Refine Post
Improve existing content with instructions.
```bash
curl -s -X POST {{CLAW_API_URL}}/api/claw/v1/ai/refine \
  -H "Authorization: Bearer {{CLAW_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d '{"content": "Original post text...", "instructions": "Make it shorter and punchier", "platform": "linkedin"}'
```

## Workflow Tips

1. **Quick publish**: Use `/publish` to post immediately without creating a draft.
2. **Review flow**: Create a draft with `/drafts`, refine with `/ai/refine`, then publish with `/posts/ID/publish`.
3. **Cross-post**: Make separate calls for LinkedIn and Twitter — each is a separate post.
4. **Check before publishing**: Call `/platforms` to verify the target platform is connected.
5. **Twitter limit**: Tweets must be ≤ 280 characters. The API will reject longer content with a clear message.

## Error Codes

| Code | Meaning |
|------|---------|
| `UNAUTHORIZED` | Invalid or revoked API key |
| `NOT_FOUND` | Post or resource doesn't exist |
| `VALIDATION_ERROR` | Bad input (missing content, too long, invalid date) |
| `CONFLICT` | Can't perform action (e.g., already published) |
| `PLATFORM_NOT_CONNECTED` | Target social platform isn't linked |
| `INSUFFICIENT_CREDITS` | Not enough credits for AI operations |
| `NO_AI_KEY` | No AI API key configured |
| `RATE_LIMITED` | Too many requests (60/min general, 10/min publish) |
| `INTERNAL_ERROR` | Something went wrong server-side |
