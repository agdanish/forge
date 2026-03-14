import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import { getLLMClient } from '../src/llm/client.js';
import { getScaffoldHint } from '../src/templates/index.js';
import { validateZip } from '../src/validation/zipValidator.js';

const PROMPT = 'Build a beautiful task management app with kanban board, task priorities, due dates, and team collaboration features';
const BUDGET = 5.00;

console.log('🔥 FORGE — Simulate Test');
console.log('═'.repeat(50));
console.log('📝 Prompt:', PROMPT);
console.log('💰 Budget: $' + BUDGET);
console.log('⏳ Generating... (1-3 mins)\n');

const llm = getLLMClient();
const start = Date.now();

const result = await llm.generate({
  prompt: PROMPT,
  systemPrompt: `You are FORGE — a world-class AI agent competing for a $5,000 hackathon prize.
Build a React 18 + TypeScript + Vite + Tailwind CSS + lucide-react app.
Dark premium theme: bg-gray-950 background, bg-gray-900 cards, indigo-600 buttons.
Every button must have real onClick handlers. No placeholders. Include README.md.
Check all imports match package.json before finalizing.
${getScaffoldHint(PROMPT)}`,
  tools: true,
});

const elapsed = ((Date.now() - start) / 1000).toFixed(1);

console.log('═'.repeat(50));
console.log(`✅ Done in ${elapsed}s`);
console.log('\n📄 Response preview:');
console.log(result.text?.slice(0, 600) || '(no text)');

if (result.projectBuild?.success) {
  console.log('\n🏗️  PROJECT BUILT ✅');
  console.log(`   Files: ${result.projectBuild.files?.length || 0}`);
  result.projectBuild.files?.forEach(f => console.log(`   - ${f}`));
  console.log(`   ZIP: ${result.projectBuild.zipPath}`);

  // Validate
  const validation = await validateZip(
    result.projectBuild.zipPath,
    result.projectBuild.files || []
  );
  console.log(`\n🔍 ZIP Validation: ${validation.valid ? '✅ PASSED' : '❌ FAILED'}`);
  if (!validation.valid) {
    console.log('   Errors:', validation.errors.join('\n   '));
  }
} else {
  console.log('\n⚠️  Text-only response (no project built)');
}

if (result.usage) {
  const inputCost = (result.usage.promptTokens / 1_000_000) * 15;
  const outputCost = (result.usage.completionTokens / 1_000_000) * 75;
  const total = inputCost + outputCost;
  console.log(`\n💸 Cost: $${total.toFixed(4)}`);
  console.log(`   Tokens: ${result.usage.promptTokens} in + ${result.usage.completionTokens} out = ${result.usage.totalTokens} total`);
  console.log(`   Remaining budget (est): $${(9 - total).toFixed(2)}`);
}

console.log('\n' + '═'.repeat(50));
console.log('🎯 Simulate complete!');
