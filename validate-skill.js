#!/usr/bin/env node

/**
 * SKILL.md Validator
 * Validates a SKILL.md file against the ClawHub skill format spec.
 * https://github.com/openclaw/clawhub/blob/main/docs/skill-format.md
 *
 * Usage: node validate-skill.js [path/to/SKILL.md]
 *        (defaults to ./SKILL.md)
 */

const fs = require('fs');
const path = require('path');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
};

function pass(msg) { console.log(`  ${colors.green}✓${colors.reset} ${msg}`); }
function fail(msg) { console.log(`  ${colors.red}✗${colors.reset} ${msg}`); }
function warn(msg) { console.log(`  ${colors.yellow}⚠${colors.reset} ${msg}`); }
function info(msg) { console.log(`  ${colors.cyan}ℹ${colors.reset} ${msg}`); }

// ── Simple YAML frontmatter parser ──────────────────────────────────────────
// Handles the subset of YAML used in SKILL.md frontmatter (scalars, arrays,
// nested objects). Not a full YAML parser — just enough for validation.

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  return parseYamlBlock(match[1]);
}

function parseYamlBlock(text) {
  const lines = text.split('\n');
  const result = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    // Skip blank lines and comments
    if (/^\s*$/.test(line) || /^\s*#/.test(line)) { i++; continue; }

    const indent = line.search(/\S/);
    const kvMatch = line.match(/^(\s*)([\w.-]+)\s*:\s*(.*)/);
    if (!kvMatch) { i++; continue; }

    const key = kvMatch[2];
    let value = kvMatch[3].trim();

    if (value === '' || value === '|' || value === '>') {
      // Could be a nested object or block scalar — collect child lines
      const childLines = [];
      i++;
      while (i < lines.length) {
        const childLine = lines[i];
        if (/^\s*$/.test(childLine)) { i++; continue; }
        const childIndent = childLine.search(/\S/);
        if (childIndent <= indent) break;
        childLines.push(childLine);
        i++;
      }
      if (childLines.length > 0 && childLines[0].trim().startsWith('- ')) {
        result[key] = childLines.map(l => l.trim().replace(/^-\s*/, ''));
      } else {
        result[key] = parseYamlBlock(childLines.join('\n'));
      }
    } else if (value.startsWith('{')) {
      // Inline JSON object
      try { result[key] = JSON.parse(value); } catch { result[key] = value; }
    } else if (value.startsWith('[')) {
      // Inline JSON array
      try { result[key] = JSON.parse(value); } catch { result[key] = value; }
    } else if (value.startsWith('"') && value.endsWith('"')) {
      result[key] = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      result[key] = value.slice(1, -1);
    } else if (value === 'true') {
      result[key] = true;
    } else if (value === 'false') {
      result[key] = false;
    } else {
      result[key] = value;
    }
    if (!Array.isArray(result[key]) && typeof result[key] !== 'object') i++;
    else if (typeof result[key] === 'string' || typeof result[key] === 'boolean') i++;
  }
  return result;
}

// ── Validators ──────────────────────────────────────────────────────────────

function validate(filePath) {
  let errors = 0;
  let warnings = 0;

  console.log(`\n${colors.bold}Validating:${colors.reset} ${filePath}\n`);

  // File exists
  if (!fs.existsSync(filePath)) {
    fail(`File not found: ${filePath}`);
    return 1;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  // ── Frontmatter ─────────────────────────────────────────────────────────
  console.log(`${colors.bold}Frontmatter${colors.reset}`);

  if (!content.startsWith('---')) {
    fail('File must start with --- (YAML frontmatter delimiter)');
    return 1;
  }

  const fm = parseFrontmatter(content);
  if (!fm) {
    fail('Could not parse frontmatter (missing closing ---)');
    return 1;
  }
  pass('Frontmatter delimiters found');

  // Required: name
  if (!fm.name) {
    fail('Missing required field: name');
    errors++;
  } else {
    if (/^[a-z0-9][a-z0-9-]*$/.test(fm.name)) {
      pass(`name: "${fm.name}"`);
    } else {
      fail(`name "${fm.name}" must be lowercase, URL-safe (^[a-z0-9][a-z0-9-]*$)`);
      errors++;
    }
  }

  // Required: description
  if (!fm.description) {
    fail('Missing required field: description');
    errors++;
  } else {
    if (fm.description.length > 200) {
      warn(`description is ${fm.description.length} chars — keep it concise`);
      warnings++;
    }
    pass(`description: "${fm.description.substring(0, 80)}${fm.description.length > 80 ? '...' : ''}"`);
  }

  // Required: version
  if (!fm.version) {
    fail('Missing required field: version');
    errors++;
  } else {
    if (/^\d+\.\d+\.\d+/.test(fm.version)) {
      pass(`version: ${fm.version}`);
    } else {
      fail(`version "${fm.version}" must be semver (e.g., 1.0.0)`);
      errors++;
    }
  }

  // ── metadata.openclaw ───────────────────────────────────────────────────
  console.log(`\n${colors.bold}metadata.openclaw${colors.reset}`);

  const oc = fm.metadata?.openclaw;
  if (!fm.metadata) {
    warn('No metadata field — skill will work but has no runtime requirements declared');
    warnings++;
  } else if (!oc) {
    warn('metadata exists but missing "openclaw" key');
    warnings++;
  } else {
    // emoji
    if (oc.emoji) {
      pass(`emoji: ${oc.emoji}`);
    } else {
      warn('No emoji set — a display icon is recommended');
      warnings++;
    }

    // homepage
    if (oc.homepage) {
      if (/^https?:\/\//.test(oc.homepage)) {
        pass(`homepage: ${oc.homepage}`);
      } else {
        fail(`homepage "${oc.homepage}" must be a valid URL`);
        errors++;
      }
    }

    // primaryEnv
    if (oc.primaryEnv) {
      pass(`primaryEnv: ${oc.primaryEnv}`);
    } else if (oc.requires?.env?.length > 0) {
      warn('requires.env is set but primaryEnv is missing — declare the main credential var to avoid security flags');
      warnings++;
    }

    // always
    if (oc.always !== undefined) {
      info(`always: ${oc.always}`);
    }

    // skillKey
    if (oc.skillKey) {
      info(`skillKey: ${oc.skillKey}`);
    }

    // os
    if (oc.os) {
      if (Array.isArray(oc.os)) {
        const validOs = ['macos', 'linux', 'windows'];
        oc.os.forEach(o => {
          if (validOs.includes(o)) pass(`os: ${o}`);
          else { fail(`Unknown os "${o}" — expected: ${validOs.join(', ')}`); errors++; }
        });
      } else {
        fail('os must be an array of strings');
        errors++;
      }
    }

    // ── requires ────────────────────────────────────────────────────────
    console.log(`\n${colors.bold}requires${colors.reset}`);
    const req = oc.requires;
    if (!req) {
      warn('No requires block — skill declares no runtime dependencies');
      warnings++;
    } else {
      // env
      if (req.env) {
        if (Array.isArray(req.env)) {
          req.env.forEach(e => {
            if (typeof e === 'string' && /^[A-Z_][A-Z0-9_]*$/.test(e)) {
              pass(`env: ${e}`);
            } else {
              fail(`env var "${e}" should be uppercase with underscores (e.g., MY_API_KEY)`);
              errors++;
            }
          });
          // Cross-check primaryEnv
          if (oc.primaryEnv && !req.env.includes(oc.primaryEnv)) {
            fail(`primaryEnv "${oc.primaryEnv}" is not listed in requires.env`);
            errors++;
          }
        } else {
          fail('requires.env must be an array of strings');
          errors++;
        }
      }

      // bins
      if (req.bins) {
        if (Array.isArray(req.bins)) {
          req.bins.forEach(b => pass(`bin: ${b}`));
        } else {
          fail('requires.bins must be an array of strings');
          errors++;
        }
      }

      // anyBins
      if (req.anyBins) {
        if (Array.isArray(req.anyBins)) {
          req.anyBins.forEach(b => pass(`anyBin: ${b}`));
        } else {
          fail('requires.anyBins must be an array of strings');
          errors++;
        }
      }

      // config
      if (req.config) {
        if (Array.isArray(req.config)) {
          req.config.forEach(c => pass(`config: ${c}`));
        } else {
          fail('requires.config must be an array of strings');
          errors++;
        }
      }
    }

    // ── install ─────────────────────────────────────────────────────────
    if (oc.install) {
      console.log(`\n${colors.bold}install${colors.reset}`);
      const validKinds = ['brew', 'node', 'go', 'uv'];
      if (Array.isArray(oc.install)) {
        oc.install.forEach((spec, idx) => {
          if (!spec.kind) {
            fail(`install[${idx}]: missing "kind"`);
            errors++;
          } else if (!validKinds.includes(spec.kind)) {
            fail(`install[${idx}]: unknown kind "${spec.kind}" — expected: ${validKinds.join(', ')}`);
            errors++;
          } else {
            const pkg = spec.formula || spec.package || '(unnamed)';
            pass(`install[${idx}]: ${spec.kind} → ${pkg}`);
          }
        });
      } else {
        fail('install must be an array');
        errors++;
      }
    }
  }

  // ── Body content ────────────────────────────────────────────────────────
  console.log(`\n${colors.bold}Body Content${colors.reset}`);

  const body = content.replace(/^---[\s\S]*?---\s*/, '');
  if (body.trim().length === 0) {
    fail('No content after frontmatter — the skill body is empty');
    errors++;
  } else {
    pass(`Body: ${body.trim().split('\n').length} lines`);
  }

  if (body.includes('{{') && body.includes('}}')) {
    const templates = body.match(/\{\{[^}]+\}\}/g) || [];
    const unique = [...new Set(templates)];
    unique.forEach(t => {
      const varName = t.replace(/[{}]/g, '').trim();
      // Check if template vars are declared in requires.env
      if (oc?.requires?.env && !oc.requires.env.includes(varName) && !['CLAW_API_URL'].includes(varName)) {
        warn(`Template var ${t} used in body but "${varName}" is not in requires.env`);
        warnings++;
      } else {
        pass(`Template var: ${t}`);
      }
    });
  }

  // ── File size ─────────────────────────────────────────────────────────
  const stats = fs.statSync(filePath);
  const sizeKB = (stats.size / 1024).toFixed(1);
  if (stats.size > 50 * 1024 * 1024) {
    fail(`File size ${sizeKB} KB exceeds 50 MB limit`);
    errors++;
  } else {
    pass(`File size: ${sizeKB} KB`);
  }

  // ── Summary ───────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  if (errors === 0) {
    console.log(`${colors.green}${colors.bold}✓ Valid!${colors.reset} ${warnings} warning(s)\n`);
  } else {
    console.log(`${colors.red}${colors.bold}✗ ${errors} error(s)${colors.reset}, ${warnings} warning(s)\n`);
  }

  return errors > 0 ? 1 : 0;
}

// ── Main ──────────────────────────────────────────────────────────────────
const targetFile = process.argv[2] || path.join(process.cwd(), 'SKILL.md');
const exitCode = validate(path.resolve(targetFile));
process.exit(exitCode);
