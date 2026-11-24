/**
 * Talking Orbs worker (MIT). Free Cloudflare Worker + KV.
 * Does two jobs:
 *  1. LEARN: stores questions + thumbs-up answers that visitors opted in to share.
 *  2. ANSWER: replies to the orbs. Order: taught answers -> AI model (if enabled) -> {} (theme falls back to Wikipedia).
 * No IPs, names or cookies are stored. Data lives in your own KV namespace.
 *
 * Bindings (wrangler.toml): KV namespace `ORBS`. Optional: `AI` (Workers AI). Secret: ADMIN_KEY.
 */
const CORS = {
  'Access-Control-Allow-Origin': '*', // lock this to your blog URL once it works
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });
const norm = t => String(t || '').toLowerCase().replace(/[^a-z0-9\u0900-\u0fff\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
const key = t => norm(t).slice(0, 12).join(' ');
const MAX_TAUGHT = 500;

async function teach(env, q, a) {
  const k = key(q); if (!k || !a) return;
  const list = JSON.parse((await env.ORBS.get('taught')) || '[]').filter(x => x.k !== k);
  list.push({ k, a: String(a).slice(0, 400), n: 1, t: Date.now() });
  await env.ORBS.put('taught', JSON.stringify(list.slice(-MAX_TAUGHT)));
}

async function findTaught(env, q) {
  const kt = [...new Set(norm(q))]; if (kt.length < 2) return null;
  const list = JSON.parse((await env.ORBS.get('taught')) || '[]');
  let best = null, bs = 0;
  for (const x of list) {
    const xt = x.k.split(' '), ov = kt.filter(w => xt.includes(w)).length;
    const s = ov / (kt.length + xt.length - ov);
    if (s > bs) { bs = s; best = x; }
  }
  return bs >= 0.6 ? best : null;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

    // Owner-only: download everything the orbs learned (use it later to train/fine-tune a real model)
    if (req.method === 'GET' && url.pathname === '/export') {
      if (!env.ADMIN_KEY || url.searchParams.get('key') !== env.ADMIN_KEY) return json({ error: 'forbidden' }, 403);
      return json({
        questions: JSON.parse((await env.ORBS.get('questions')) || '{}'),
        taught: JSON.parse((await env.ORBS.get('taught')) || '[]'),
        unanswered: JSON.parse((await env.ORBS.get('unanswered')) || '[]')
      });
    }
    if (req.method !== 'POST') return json({ ok: true, name: 'orbs-worker' });
    let b = {}; try { b = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }

    // Opt-in question log: counts only, no user identity
    if (url.pathname === '/log') {
      const k = key(b.q); if (!k) return json({ ok: true });
      const qs = JSON.parse((await env.ORBS.get('questions')) || '{}');
      qs[k] = (qs[k] || 0) + 1;
      const keys = Object.keys(qs);
      if (keys.length > 2000) keys.sort((a, c) => qs[a] - qs[c]).slice(0, 500).forEach(x => delete qs[x]);
      await env.ORBS.put('questions', JSON.stringify(qs));
      return json({ ok: true });
    }

    // Thumbs feedback: up = teach this answer, down = remember it as unanswered
    if (url.pathname === '/learn') {
      if (b.v > 0 && b.a) await teach(env, b.q, b.a);
      else if (b.v < 0 && key(b.q)) {
        const u = JSON.parse((await env.ORBS.get('unanswered')) || '[]');
        u.push({ q: key(b.q), t: Date.now() });
        await env.ORBS.put('unanswered', JSON.stringify(u.slice(-300)));
      }
      return json({ ok: true });
    }

    // Answer endpoint (this is what AI_URL points to)
    const q = String(b.q || '').slice(0, 300); if (!q) return json({});
    const hit = await findTaught(env, q);
    if (hit) return json({ answer: hit.a, source: 'taught' });

    if (env.AI) { // turn the orbs into real AI: enable the `AI` binding (free tier available)
      try {
        const hist = (Array.isArray(b.hist) ? b.hist : []).slice(-4).flatMap(h => [{ role: 'user', content: String(h.q) }, { role: 'assistant', content: String(h.a) }]);
        const r = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          messages: [{ role: 'system', content: `You are ${b.bot || 'an orb'}, a friendly, short-spoken helper on a science and tech blog. Answer in 2-3 sentences. If unsure, say so.` }, ...hist, { role: 'user', content: q }],
          max_tokens: 200
        });
        if (r && r.response) return json({ answer: r.response.trim(), source: 'ai' });
      } catch (e) { /* fall through to Wikipedia in the theme */ }
    }
    return json({});
  }
};
