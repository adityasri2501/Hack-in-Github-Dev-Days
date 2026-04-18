// api/shared.js — Shared Claude API helper
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

async function callClaude(userMessage, maxTokens = 1000, systemPrompt = null) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const body = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: userMessage }]
  };

  if (systemPrompt) {
    body.system = systemPrompt;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function streamClaude(userMessage, systemPrompt, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Fallback stream
    const msg = "I'm MediRoute AI. I'm here to help you navigate healthcare while traveling. Please describe your symptoms or ask me anything about your health concerns. (Note: AI service is currently offline — this is a demo response.)";
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    for (const word of msg.split(' ')) {
      res.write(`data: ${JSON.stringify({ text: word + ' ' })}\n\n`);
      await new Promise(r => setTimeout(r, 50));
    }
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  const body = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    stream: true,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }]
  };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const reader = response.body;
  let buffer = '';

  reader.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') { res.write('data: [DONE]\n\n'); return; }
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            res.write(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`);
          }
        } catch {}
      }
    }
  });

  reader.on('end', () => {
    res.write('data: [DONE]\n\n');
    res.end();
  });

  reader.on('error', () => {
    res.write('data: [DONE]\n\n');
    res.end();
  });
}

module.exports = { callClaude, streamClaude };
