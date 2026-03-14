/**
 * Preflight readiness check — validates all config, env, and platform status
 * before running the agent in competition mode.
 * Run: npx tsx scripts/preflight.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import { getConfig, configStore } from '../src/config/index.js';

interface Check {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  detail: string;
}

const checks: Check[] = [];

function check(name: string, status: 'PASS' | 'FAIL' | 'WARN', detail: string) {
  checks.push({ name, status, detail });
  const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
  console.log(`  ${icon} ${name}: ${detail}`);
}

async function run() {
  console.log('🔍 FORGE — Preflight Readiness Check');
  console.log('═'.repeat(60));

  // ── 1. Environment Variables ──
  console.log('\n📋 Environment Variables');

  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (openrouterKey && openrouterKey.startsWith('sk-or-')) {
    check('OPENROUTER_API_KEY', 'PASS', `Set (${openrouterKey.substring(0, 12)}...)`);
  } else if (openrouterKey) {
    check('OPENROUTER_API_KEY', 'WARN', 'Set but format unexpected (should start with sk-or-)');
  } else {
    check('OPENROUTER_API_KEY', 'FAIL', 'NOT SET — required for LLM calls');
  }

  const walletAddr = process.env.WALLET_ADDRESS;
  if (walletAddr && walletAddr.startsWith('0x') && walletAddr.length === 42) {
    check('WALLET_ADDRESS', 'PASS', walletAddr);
  } else if (walletAddr) {
    check('WALLET_ADDRESS', 'WARN', `Set but format unexpected: ${walletAddr}`);
  } else {
    check('WALLET_ADDRESS', 'FAIL', 'NOT SET — required for registration');
  }

  const seedstrKey = process.env.SEEDSTR_API_KEY;
  if (seedstrKey && seedstrKey.startsWith('mj_')) {
    check('SEEDSTR_API_KEY', 'PASS', `Set (${seedstrKey.substring(0, 12)}...)`);
  } else {
    check('SEEDSTR_API_KEY', 'FAIL', 'NOT SET — run npm run register first');
  }

  const model = process.env.OPENROUTER_MODEL || 'not set';
  check('OPENROUTER_MODEL', model.includes('claude') ? 'PASS' : 'WARN', model);

  const minBudget = parseFloat(process.env.MIN_BUDGET || '1');
  check('MIN_BUDGET', minBudget <= 0.01 ? 'PASS' : 'WARN', `$${minBudget} (should be ≤0.01 for hackathon)`);

  const maxConcurrent = parseInt(process.env.MAX_CONCURRENT_JOBS || '1');
  check('MAX_CONCURRENT_JOBS', maxConcurrent === 1 ? 'PASS' : 'WARN', `${maxConcurrent}`);

  const temp = parseFloat(process.env.TEMPERATURE || '0.7');
  check('TEMPERATURE', temp <= 0.4 ? 'PASS' : 'WARN', `${temp} (recommend ≤0.3 for reliable code gen)`);

  // ── 2. WebSocket Configuration ──
  console.log('\n📡 WebSocket Configuration');

  const useWs = process.env.USE_WEBSOCKET === 'true';
  check('USE_WEBSOCKET', useWs ? 'PASS' : 'WARN', useWs ? 'Enabled' : 'Disabled (will use polling only)');

  const pusherKey = process.env.PUSHER_KEY;
  if (pusherKey) {
    check('PUSHER_KEY', 'PASS', `Set (${pusherKey.substring(0, 8)}...)`);
  } else {
    check('PUSHER_KEY', 'WARN', 'NOT SET — WebSocket will fall back to polling');
  }

  const pollInterval = parseInt(process.env.POLL_INTERVAL || '30');
  check('POLL_INTERVAL', pollInterval <= 30 ? 'PASS' : 'WARN', `${pollInterval}s (effective: ${useWs && pusherKey ? pollInterval + 's with WS' : '5s without WS'})`);

  // ── 3. Tool Configuration ──
  console.log('\n🔧 Tool Configuration');

  const webSearch = process.env.TOOL_WEB_SEARCH_ENABLED !== 'false';
  check('TOOL_WEB_SEARCH', !webSearch ? 'PASS' : 'WARN', webSearch ? 'Enabled (wastes tokens)' : 'Disabled (saves ~400 tokens)');

  const calculator = process.env.TOOL_CALCULATOR_ENABLED !== 'false';
  check('TOOL_CALCULATOR', !calculator ? 'PASS' : 'WARN', calculator ? 'Enabled (wastes tokens)' : 'Disabled (saves tokens)');

  // ── 4. Agent Registration ──
  console.log('\n🤖 Agent Registration');

  const agentId = configStore.get('agentId');
  if (agentId) {
    check('Agent ID', 'PASS', agentId as string);
  } else {
    check('Agent ID', 'FAIL', 'NOT REGISTERED — run npm run register');
  }

  // ── 5. Platform Connectivity ──
  console.log('\n🌐 Platform Connectivity');

  const apiUrl = process.env.SEEDSTR_API_URL || 'https://www.seedstr.io/api/v2';
  try {
    const resp = await fetch(`${apiUrl}/jobs?limit=1`, {
      headers: seedstrKey ? { Authorization: `Bearer ${seedstrKey}` } : {},
    });
    if (resp.ok) {
      check('API Connection', 'PASS', `${apiUrl} — HTTP ${resp.status}`);
      const data = await resp.json() as { jobs?: unknown[] };
      check('Jobs Endpoint', 'PASS', `${(data.jobs || []).length} jobs visible`);
    } else {
      check('API Connection', resp.status === 401 ? 'FAIL' : 'WARN', `HTTP ${resp.status} — ${resp.statusText}`);
    }
  } catch (err) {
    check('API Connection', 'FAIL', `Cannot reach ${apiUrl}: ${(err as Error).message}`);
  }

  // ── 6. OpenRouter Connectivity ──
  console.log('\n🧠 OpenRouter Connectivity');

  if (openrouterKey) {
    try {
      const resp = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { Authorization: `Bearer ${openrouterKey}` },
      });
      if (resp.ok) {
        const data = await resp.json() as { data?: { limit_remaining?: number; usage?: number; label?: string } };
        const remaining = data.data?.limit_remaining;
        const used = data.data?.usage;
        check('OpenRouter Auth', 'PASS', `Key valid (label: ${data.data?.label || 'default'})`);
        if (remaining !== undefined) {
          check('OpenRouter Credits', remaining > 1 ? 'PASS' : 'WARN', `$${remaining?.toFixed(2)} remaining, $${used?.toFixed(2)} used`);
        }
      } else {
        check('OpenRouter Auth', 'FAIL', `HTTP ${resp.status} — key may be invalid`);
      }
    } catch (err) {
      check('OpenRouter Auth', 'WARN', `Cannot reach OpenRouter: ${(err as Error).message}`);
    }
  } else {
    check('OpenRouter Auth', 'FAIL', 'No API key to test');
  }

  // ── Summary ──
  console.log('\n' + '═'.repeat(60));
  const passed = checks.filter(c => c.status === 'PASS').length;
  const warned = checks.filter(c => c.status === 'WARN').length;
  const failed = checks.filter(c => c.status === 'FAIL').length;

  console.log(`\n📊 Results: ${passed} passed, ${warned} warnings, ${failed} failures`);

  if (failed > 0) {
    console.log('\n❌ CRITICAL: Fix the failures above before running the agent.');
    console.log('   The agent will NOT function correctly with these issues.');
    process.exit(1);
  } else if (warned > 0) {
    console.log('\n⚠️  Agent can run but has warnings. Review items above for optimal performance.');
  } else {
    console.log('\n🚀 All checks passed! Agent is ready for competition.');
  }

  console.log('');
}

run().catch(err => {
  console.error('Preflight check crashed:', err);
  process.exit(1);
});
