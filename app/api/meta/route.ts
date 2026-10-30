import { comparePrompt, extractModelText, interpretPrompt, parseModelJson, questionPrompt, validateBotanicalIdentity, validateComparison } from '../../../lib/meta-identity';

export const dynamic = 'force-dynamic';

const MAX_TEXT = 20000;

function metaConfig() {
  const key = process.env.META_API_KEY;
  const model = process.env.META_MODEL_ID;
  const base = (process.env.META_API_BASE_URL || 'https://api.meta.ai/v1').replace(/\/+$/, '');
  return key && model ? { key, model, base } : null;
}

async function callMeta(prompt: string): Promise<unknown> {
  const config = metaConfig();
  if (!config) throw new Error('meta-unavailable');
  const response = await fetch(`${config.base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.key}` },
    body: JSON.stringify({ model: config.model, temperature: 0.4, messages: [{ role: 'user', content: prompt }] }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`meta-http-${response.status}`);
  const data: unknown = await response.json();
  const text = extractModelText(data);
  if (!text) throw new Error('meta-empty-response');
  return parseModelJson(text);
}

const bad = (message: string, status = 400) => Response.json({ ok: false, error: message }, { status });

export async function POST(request: Request) {
  if (!metaConfig()) return bad('Meta personalisation is not configured on this server. You can still plant an ordinary tree.', 503);
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return bad('Request must be JSON.');
  }
  const action = payload.action;
  const text = (value: unknown) => (typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_TEXT ? value : null);
  try {
    if (action === 'interpret') {
      const body = text(payload.body);
      if (!body) return bad('A non-empty letter is required.');
      const checked = validateBotanicalIdentity(await callMeta(interpretPrompt(body)));
      if (!checked.ok) return bad(`The model returned an unsupported identity (${checked.error}). Your letter is unchanged; retry or plant an ordinary tree.`, 502);
      return Response.json({ ok: true, provenance: 'live', identity: checked.identity });
    }
    if (action === 'question') {
      const body = text(payload.body);
      if (!body) return bad('A non-empty letter is required.');
      const raw = await callMeta(questionPrompt(body));
      const question = (raw as Record<string, unknown> | null)?.question;
      if (typeof question !== 'string' || !question.trim() || question.length > 300) return bad('The model returned an unusable question. A standard question is available instead.', 502);
      return Response.json({ ok: true, provenance: 'live', question: question.trim() });
    }
    if (action === 'compare') {
      const original = text(payload.original);
      const reflection = text(payload.reflection);
      if (!original || !reflection) return bad('Both the original letter and a reflection are required.');
      const checked = validateComparison(await callMeta(comparePrompt(original, reflection)), original, reflection);
      if (!checked.ok) return bad(`The comparison could not be verified (${checked.error}). Nothing was saved from it.`, 502);
      return Response.json({ ok: true, provenance: 'live', comparison: checked.comparison });
    }
    return bad('Unknown action.');
  } catch (error) {
    if (error instanceof Error && error.message === 'meta-unavailable') return bad('Meta personalisation is not configured on this server. You can still plant an ordinary tree.', 503);
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) return bad('The Meta request timed out. Your text is unchanged; retry or continue without personalisation.', 504);
    return bad('The Meta request could not be completed. Your text is unchanged; retry or continue without personalisation.', 502);
  }
}
