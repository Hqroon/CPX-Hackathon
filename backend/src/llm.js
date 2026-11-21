// OpenAI-compatible chat client with a provider fallback chain.
// AMD Token Factory, AIHubMix and Tokener all speak the same /chat/completions format.

const PROVIDERS = {
  amd: {
    label: 'amd-token-factory',
    baseUrl: () => process.env.AMD_TF_BASE_URL,
    apiKey: () => process.env.AMD_TF_API_KEY,
    model: () => process.env.AMD_TF_MODEL,
  },
  aihubmix: {
    label: 'aihubmix',
    baseUrl: () => process.env.AIHUBMIX_BASE_URL || 'https://aihubmix.com/v1',
    apiKey: () => process.env.AIHUBMIX_API_KEY,
    model: () => process.env.AIHUBMIX_MODEL,
  },
  tokener: {
    label: 'tokener',
    baseUrl: () => process.env.TOKENER_BASE_URL,
    apiKey: () => process.env.TOKENER_API_KEY,
    model: () => process.env.TOKENER_MODEL,
  },
};

export function configuredProviders() {
  const order = (process.env.PROVIDER_ORDER || 'amd,aihubmix,tokener')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return order
    .map((id) => ({ id, ...PROVIDERS[id] }))
    .filter((p) => p.label && p.baseUrl() && p.apiKey() && p.model());
}

async function callProvider(provider, messages, { temperature = 0.4 } = {}) {
  const timeoutS = Number(process.env.PROVIDER_TIMEOUT_S || 20);
  const url = provider.baseUrl().replace(/\/+$/, '') + '/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey()}`,
    },
    body: JSON.stringify({ model: provider.model(), messages, temperature }),
    signal: AbortSignal.timeout(timeoutS * 1000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${provider.label} HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error(`${provider.label} returned no content`);
  return text;
}

/**
 * Try each configured provider in order. `accept(text)` may throw to reject a
 * response (e.g. invalid JSON), which moves on to the next provider.
 * Returns { value, provider } or throws if every provider failed.
 */
export async function chatWithFallback(messages, accept = (t) => t, opts) {
  const providers = configuredProviders();
  if (providers.length === 0) throw new Error('No LLM provider configured (check backend/.env)');
  const errors = [];
  for (const p of providers) {
    try {
      const text = await callProvider(p, messages, opts);
      return { value: accept(text), provider: p.label };
    } catch (err) {
      errors.push(err.message);
      console.warn(`[llm] ${p.label} failed: ${err.message}`);
    }
  }
  throw new Error('All providers failed: ' + errors.join(' | '));
}

/** Pull a JSON object out of a model reply, tolerating ```json fences and chatter. */
export function parseJsonLoose(text) {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON object in reply');
  return JSON.parse(cleaned.slice(start, end + 1));
}
