// Orchestrator: the "brain". Runs the Claude agentic loop for one email.
// Loads the skill as system prompt (with prompt caching, BP5), lets Claude
// call tools, and stops when Claude has no more tool calls.

const Anthropic = require('@anthropic-ai/sdk');
const { loadSkill } = require('./skill-loader');
const { TOOL_DEFINITIONS, executeTool } = require('./tools');
const { callWithRetry } = require('./utils');
const logger = require('./logger');

let _client = null;
function anthropic() {
  if (!_client) _client = new Anthropic(); // auto-reads ANTHROPIC_API_KEY
  return _client;
}

function buildUserMessage(email) {
  return [
    'Ban nhan duoc mot email bao gia moi. Hay xu ly theo Quy trinh trong system prompt.',
    '',
    '--- EMAIL ---',
    `From: ${email.from}`,
    `Subject: ${email.subject}`,
    `Date: ${email.date}`,
    '',
    'Noi dung:',
    email.body,
    '--- HET EMAIL ---',
  ].join('\n');
}

async function processEmail(email, config, sendGate) {
  const systemPrompt = await loadSkill(config);
  const client = anthropic();
  const model = config.claude.model;
  const maxTokens = config.claude.max_tokens || 8192;
  const maxTurns = config.claude.max_turns || 30;

  const messages = [{ role: 'user', content: buildUserMessage(email) }];
  const ctx = { config, sendGate, email };

  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await callWithRetry(
      () => client.messages.create({
        model,
        max_tokens: maxTokens,
        // BP5: cache the (large, stable) system prompt
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        tools: TOOL_DEFINITIONS,
        messages,
      }),
      { label: 'anthropic.messages' }
    );

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason !== 'tool_use') {
      logger.info({ msg: 'processing_done', message_id: email.id, turns: turn + 1 });
      return;
    }

    const toolResults = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;
      logger.info({ msg: 'tool_call', tool: block.name, message_id: email.id });
      let content;
      try {
        content = await executeTool(block.name, block.input, ctx);
      } catch (e) {
        logger.error({ msg: 'tool_failed', tool: block.name, error: String(e.message || e) });
        content = JSON.stringify({ ok: false, error: String(e.message || e) });
      }
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content });
    }
    messages.push({ role: 'user', content: toolResults });
  }

  logger.warn({ msg: 'max_turns_reached', message_id: email.id, max_turns: maxTurns });
}

module.exports = { processEmail };
