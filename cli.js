#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const readline = require('readline');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Environment variables
const API_KEY = process.env.CLAW_API_KEY;
const API_URL = process.env.CLAW_API_URL || 'https://clawpost.dev';
const BASE_URL = `${API_URL}/api/claw/v1`;

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function makeRequest(endpoint, method = 'GET', data = null) {
  const API_KEY = process.env.CLAW_API_KEY;
  if (!API_KEY) {
    logError('No API key found!');
    console.log('\n🚀 Let\'s get you set up with ClawPost:');
    console.log('');
    console.log('1. 📝 Sign up: https://clawpost.dev');
    console.log('2. 🔗 Connect your LinkedIn and/or Twitter accounts');
    console.log('3. 💳 Add credits for AI generation (if needed)');
    console.log('4. 🔑 Go to Settings → API Keys → Generate New Key');
    console.log('5. 📋 Copy the key and set it:');
    console.log(`   ${colors.yellow}export CLAW_API_KEY="claw_your_key_here"${colors.reset}`);
    console.log('');
    console.log('6. 🧪 Test your setup:');
    console.log(`   ${colors.cyan}node cli.js status${colors.reset}`);
    console.log('');
    throw new Error('Setup required. Follow the steps above.');
  }

  let curlCmd = `curl -s -X ${method} "${BASE_URL}${endpoint}" \\
    -H "Authorization: Bearer ${API_KEY}"`;

  if (data) {
    // Properly escape JSON data for shell
    const jsonData = JSON.stringify(data).replace(/'/g, "'\"'\"'");
    curlCmd += ` \\
    -H "Content-Type: application/json" \\
    -d '${jsonData}'`;
  }

  try {
    const { stdout, stderr } = await execAsync(curlCmd);
    
    if (stderr) {
      throw new Error(`Curl error: ${stderr}`);
    }

    const response = JSON.parse(stdout);
    
    if (!response.success) {
      throw new Error(`API Error: ${response.message} (${response.error?.code})`);
    }

    return response;
  } catch (error) {
    if (error.message.includes('JSON')) {
      throw new Error('Invalid response from API. Check your API_URL and internet connection.');
    }
    throw error;
  }
}

async function status() {
  try {
    const response = await makeRequest('/status');
    logSuccess(response.message);
    
    const { user, platforms, credits } = response.data;
    console.log('\n📊 Account Info:');
    console.log(`   User: ${user.name} (${user.email})`);
    console.log(`   LinkedIn: ${platforms.linkedin ? '✅ Connected' : '❌ Not connected'}`);
    console.log(`   Twitter: ${platforms.twitter ? '✅ Connected' : '❌ Not connected'}`);
    console.log(`   Credits: ${credits.balance}`);
    console.log(`   Custom AI Key: ${credits.hasCustomAIKey ? 'Yes' : 'No'}`);
  } catch (error) {
    logError(error.message);
    process.exit(1);
  }
}

async function listPosts(options = {}) {
  try {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.platform) params.append('platform', options.platform);
    if (options.limit) params.append('limit', options.limit);
    
    const endpoint = `/posts${params.toString() ? '?' + params.toString() : ''}`;
    const response = await makeRequest(endpoint);
    
    logSuccess(response.message);
    
    if (response.data.posts.length === 0) {
      logInfo('No posts found.');
      return;
    }

    console.log('\n📝 Posts:');
    response.data.posts.forEach(post => {
      const statusEmoji = {
        draft: '📄',
        published: '✅',
        scheduled: '⏰',
        failed: '❌'
      };
      console.log(`   ${statusEmoji[post.status]} ${post.platform.toUpperCase()} - ${post.content.substring(0, 60)}...`);
      console.log(`      ID: ${post.id} | Status: ${post.status} | Actions: ${post.availableActions.join(', ')}`);
    });
  } catch (error) {
    logError(error.message);
    process.exit(1);
  }
}

async function createDraft(content, platform = 'linkedin') {
  try {
    const response = await makeRequest('/drafts', 'POST', { content, platform });
    logSuccess(response.message);
    console.log(`   Post ID: ${response.data.id}`);
    console.log(`   Platform: ${response.data.platform}`);
    console.log(`   Actions: ${response.data.availableActions.join(', ')}`);
  } catch (error) {
    logError(error.message);
    process.exit(1);
  }
}

async function publishPost(postId) {
  try {
    const response = await makeRequest(`/posts/${postId}/publish`, 'POST');
    logSuccess(response.message);
    
    if (response.data) {
      console.log(`   Platform: ${response.data.platform}`);
      console.log(`   Published: ${new Date(response.data.publishedAt).toLocaleString()}`);
    }
  } catch (error) {
    logError(error.message);
    process.exit(1);
  }
}

async function directPublish(content, platform = 'linkedin') {
  try {
    const response = await makeRequest('/publish', 'POST', { content, platform });
    logSuccess(response.message);
    
    if (response.data) {
      console.log(`   Platform: ${response.data.platform}`);
      console.log(`   Published: ${new Date(response.data.publishedAt).toLocaleString()}`);
    }
  } catch (error) {
    logError(error.message);
    process.exit(1);
  }
}

async function schedulePost(postId, scheduledAt) {
  try {
    const response = await makeRequest(`/posts/${postId}/schedule`, 'POST', { scheduledAt });
    logSuccess(response.message);
    
    if (response.data) {
      console.log(`   Platform: ${response.data.platform}`);
      console.log(`   Scheduled for: ${new Date(response.data.scheduledAt).toLocaleString()}`);
    }
  } catch (error) {
    logError(error.message);
    process.exit(1);
  }
}

async function generateContent(prompt, platform = 'linkedin', tone = null) {
  try {
    const data = { prompt, platform };
    if (tone) data.tone = tone;
    
    const response = await makeRequest('/ai/generate', 'POST', data);
    logSuccess(response.message);
    
    console.log('\n📝 Generated Content:');
    console.log('─'.repeat(60));
    console.log(response.data.content);
    console.log('─'.repeat(60));
    console.log(`Platform: ${response.data.platform} | Length: ${response.data.content.length} chars`);
    
    if (response.data.warnings?.length > 0) {
      console.log('\n⚠️  Warnings:');
      response.data.warnings.forEach(warning => console.log(`   • ${warning}`));
    }
  } catch (error) {
    logError(error.message);
    process.exit(1);
  }
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function saveApiKeyToConfig(apiKey) {
  const configPath = path.join(os.homedir(), '.openclaw', 'openclaw.json');
  if (!fs.existsSync(configPath)) {
    return { saved: false, reason: `openclaw.json not found at ${configPath}` };
  }
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (!config.env) config.env = {};
    config.env.CLAW_API_KEY = apiKey;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
    return { saved: true, configPath };
  } catch (err) {
    return { saved: false, reason: err.message };
  }
}

async function setupWizard() {
  console.log(`${colors.bold}🚀 ClawPost Setup Wizard${colors.reset}`);
  console.log('='.repeat(40));
  console.log('');

  // Show current state if a key is already configured
  if (API_KEY) {
    logSuccess('An API key is already configured.');
    try {
      const res = await makeRequest('/status');
      const { user, platforms, credits } = res.data;
      console.log(`   Logged in as: ${user.name} (${user.email})`);
      console.log(`   LinkedIn: ${platforms.linkedin ? '✅' : '❌'}  Twitter: ${platforms.twitter ? '✅' : '❌'}  Credits: ${credits.balance}`);
    } catch (_) {
      logWarning('Could not verify existing key against the API.');
    }
    console.log('');
    const reconfigure = await prompt('Do you want to set a different API key? (y/N): ');
    if (reconfigure.toLowerCase() !== 'y') {
      logInfo('Setup cancelled. Your existing configuration is unchanged.');
      return;
    }
    console.log('');
  }

  // Instructions
  logInfo('Step 1: Create your account (if you haven\'t already)');
  console.log('   Visit: https://clawpost.dev  →  Sign up');
  console.log('');
  logInfo('Step 2: Connect social platforms');
  console.log('   Dashboard → Connect LinkedIn / Connect X (Twitter)');
  console.log('');
  logInfo('Step 3: Generate an API key');
  console.log('   Dashboard → Settings → API Keys → Generate New Key');
  console.log(`   The key starts with ${colors.cyan}claw_${colors.reset}`);
  console.log('');

  // Prompt for the key
  const inputKey = await prompt(`Paste your API key here: `);
  if (!inputKey) {
    logError('No API key entered. Setup aborted.');
    process.exit(1);
  }
  if (!inputKey.startsWith('claw_')) {
    logWarning('Key does not start with "claw_" — double-check you copied the full key.');
  }
  console.log('');

  // Validate against the API
  logInfo('Validating key...');
  let validationOk = false;
  try {
    // Temporarily override so makeRequest uses the new key
    process.env.CLAW_API_KEY = inputKey;
    const res = await makeRequest('/status');
    const { user, platforms, credits } = res.data;
    logSuccess(`Key is valid! Logged in as ${user.name} (${user.email})`);
    console.log(`   LinkedIn: ${platforms.linkedin ? '✅ Connected' : '❌ Not connected'}`);
    console.log(`   Twitter:  ${platforms.twitter  ? '✅ Connected' : '❌ Not connected'}`);
    console.log(`   Credits:  ${credits.balance}`);
    validationOk = true;
  } catch (err) {
    logError(`Key validation failed: ${err.message}`);
    logWarning('The key was NOT saved. Please check it and try again.');
    process.exit(1);
  }

  if (!validationOk) return;
  console.log('');

  // Save to openclaw config
  const { saved, configPath, reason } = saveApiKeyToConfig(inputKey);
  if (saved) {
    logSuccess(`API key saved to ${configPath}`);
    logInfo('Restart the openclaw daemon for the change to take effect.');
  } else {
    logWarning(`Could not save to openclaw config: ${reason}`);
    logInfo('Add the key manually to your shell profile:');
    console.log(`   ${colors.yellow}export CLAW_API_KEY="${inputKey}"${colors.reset}`);
  }

  console.log('');
  logSuccess('Setup complete! You can now use:');
  console.log('   • node cli.js generate "your prompt" [platform] [tone]');
  console.log('   • node cli.js draft "your content" [platform]');
  console.log('   • node cli.js post "your content" [platform]');
  console.log('   • node cli.js schedule post_id datetime');
  console.log('');
}

function showHelp() {
  console.log(`
${colors.bold}Social Media Publisher CLI${colors.reset}

${colors.blue}Quick Setup:${colors.reset}
  ${colors.green}setup${colors.reset} / ${colors.green}login${colors.reset} / ${colors.green}apikey${colors.reset}         Interactive setup — prompts for API key, validates, and saves it

${colors.blue}Commands:${colors.reset}
  ${colors.green}status${colors.reset}                           Check API key and account info
  ${colors.green}list [status] [platform] [limit]${colors.reset}  List posts (e.g., list draft linkedin 5)
  ${colors.green}draft <content> [platform]${colors.reset}        Create draft (platform: linkedin|twitter)
  ${colors.green}publish <post-id>${colors.reset}                Publish existing draft
  ${colors.green}post <content> [platform]${colors.reset}        Publish immediately without draft
  ${colors.green}schedule <post-id> <datetime>${colors.reset}     Schedule existing draft
  ${colors.green}generate <prompt> [platform] [tone]${colors.reset} Generate content with AI

${colors.blue}Examples:${colors.reset}
  node cli.js status
  node cli.js list draft linkedin 10
  node cli.js draft "Hello world!" linkedin
  node cli.js publish post_12345
  node cli.js post "Direct publish!" twitter
  node cli.js schedule post_12345 "2026-02-20T10:00:00Z"
  node cli.js generate "Write about code reviews" linkedin professional

${colors.blue}Platforms:${colors.reset} linkedin, twitter
${colors.blue}Post Statuses:${colors.reset} draft, published, scheduled, failed
${colors.blue}Tones:${colors.reset} professional, casual, technical, marketing
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'setup':
      case 'login':
      case 'apikey':
        await setupWizard();
        break;

      case 'status':
        await status();
        break;

      case 'list':
        const listOptions = {};
        if (args[1]) listOptions.status = args[1];
        if (args[2]) listOptions.platform = args[2];
        if (args[3]) listOptions.limit = args[3];
        await listPosts(listOptions);
        break;

      case 'draft':
        if (!args[1]) {
          logError('Content is required: node cli.js draft "Your content here" [platform]');
          process.exit(1);
        }
        await createDraft(args[1], args[2] || 'linkedin');
        break;

      case 'publish':
        if (!args[1]) {
          logError('Post ID is required: node cli.js publish post_12345');
          process.exit(1);
        }
        await publishPost(args[1]);
        break;

      case 'post':
        if (!args[1]) {
          logError('Content is required: node cli.js post "Your content here" [platform]');
          process.exit(1);
        }
        await directPublish(args[1], args[2] || 'linkedin');
        break;

      case 'schedule':
        if (!args[1] || !args[2]) {
          logError('Post ID and datetime are required: node cli.js schedule post_12345 "2026-02-20T10:00:00Z"');
          process.exit(1);
        }
        await schedulePost(args[1], args[2]);
        break;

      case 'generate':
        if (!args[1]) {
          logError('Prompt is required: node cli.js generate "Write about AI trends" [platform] [tone]');
          process.exit(1);
        }
        await generateContent(args[1], args[2] || 'linkedin', args[3]);
        break;

      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;
        
      default:
        if (!API_KEY) {
          console.log(`${colors.red}❌ No API key found!${colors.reset}`);
          console.log(`${colors.blue}👉 Run setup wizard: ${colors.green}node cli.js setup${colors.reset}`);
          console.log(`${colors.blue}👉 Or get help: ${colors.green}node cli.js help${colors.reset}`);
        } else {
          showHelp();
        }
        break;
    }
  } catch (error) {
    logError(`Unexpected error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  makeRequest,
  status,
  listPosts,
  createDraft,
  publishPost,
  directPublish,
  schedulePost,
  generateContent
};