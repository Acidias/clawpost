# ClawPost

AI-powered social media publishing for LinkedIn and X (Twitter). Create, schedule, and publish posts with AI-assisted content generation — all from the command line.

## Features

- **AI Content Generation** — Generate posts tailored to each platform
- **AI Refinement** — Improve existing content with instructions
- **Draft Management** — Create, update, and delete drafts
- **Direct Publishing** — Publish immediately without a draft step
- **Scheduling** — Schedule posts for optimal timing
- **Multi-Platform** — LinkedIn and X (Twitter) support

## Quick Start

### 1. Get your API key

1. Sign up at [clawpost.dev](https://clawpost.dev)
2. Connect your LinkedIn and/or X accounts
3. Go to **Settings → API Keys → Generate New Key**

### 2. Install

```bash
git clone https://github.com/Acidias/clawpost.git
cd clawpost
bash install.sh
```

Or run the setup wizard manually:

```bash
export CLAW_API_KEY="claw_your_key_here"
node cli.js setup
```

### 3. Use

```bash
# Check connection
node cli.js status

# Generate a post with AI
node cli.js generate "Write about the importance of code reviews" linkedin professional

# Create a draft
node cli.js draft "Hello LinkedIn!" linkedin

# Publish immediately
node cli.js post "Publishing this now!" linkedin

# Publish an existing draft
node cli.js publish post_12345

# Schedule a draft
node cli.js schedule post_12345 "2026-06-15T10:00:00Z"

# List your posts
node cli.js list draft linkedin 10
```

## Commands

| Command | Description |
|---------|-------------|
| `setup` / `login` / `apikey` | Interactive setup wizard |
| `status` | Check API key and account info |
| `list [status] [platform] [limit]` | List posts |
| `draft <content> [platform]` | Create a draft |
| `publish <post-id>` | Publish an existing draft |
| `post <content> [platform]` | Publish immediately |
| `schedule <post-id> <datetime>` | Schedule a draft |
| `generate <prompt> [platform] [tone]` | Generate content with AI |
| `help` | Show all commands |

**Platforms:** `linkedin`, `twitter`
**Tones:** `professional`, `casual`, `technical`, `marketing`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CLAW_API_KEY` | Yes | Your API key (starts with `claw_`) |
| `CLAW_API_URL` | No | API base URL (defaults to `https://clawpost.dev`) |

## API Documentation

See [SKILL.md](./SKILL.md) for the full API reference with all endpoints, request/response formats, and error codes.

## License

MIT
