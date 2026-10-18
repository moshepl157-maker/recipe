// Cloudflare Worker: reads a public web page (or its image) on behalf of the recipe app. Stores nothing.
// Optional: add a variable ALLOWED_ORIGIN (e.g. https://USERNAME.github.io) to accept calls only from your app.
const CORS = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,OPTIONS','Access-Control-Allow-Headers':'*'};
const PRIVATE = /^(localhost|.*\.local|.*\.internal|0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[.*\])/i;
export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, {status: 204, headers: CORS});
    const origin = req.headers.get('Origin');
    if (env.ALLOWED_ORIGIN && origin && origin !== env.ALLOWED_ORIGIN) return new Response('forbidden', {status: 403, headers: CORS});
    const q = new URL(req.url).searchParams;
    const isImg = q.has('img');
    const target = q.get('url') || q.get('img') || '';
    let t;
    try { t = new URL(target); } catch (e) { return new Response('bad url', {status: 400, headers: CORS}); }
    if (!/^https?:$/.test(t.protocol) || PRIVATE.test(t.hostname)) return new Response('bad url', {status: 400, headers: CORS});
    let r;
    try {
      r = await fetch(t.href, {redirect: 'follow', headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept-Language': 'he,en;q=0.8'}});
    } catch (e) { return new Response('fetch failed', {status: 502, headers: CORS}); }
    if (!r.ok) return new Response('upstream ' + r.status, {status: 502, headers: CORS});
    const len = +(r.headers.get('content-length') || 0);
    if (isImg) {
      const ct = r.headers.get('content-type') || '';
      if (!/^image\//.test(ct) || len > 6e6) return new Response('not image', {status: 415, headers: CORS});
      return new Response(r.body, {headers: {...CORS, 'Content-Type': ct, 'Cache-Control': 'public, max-age=86400'}});
    }
    if (len > 4e6) return new Response('too big', {status: 413, headers: CORS});
    const text = (await r.text()).slice(0, 3000000);
    return new Response(text, {headers: {...CORS, 'Content-Type': 'text/plain; charset=utf-8'}});
  }
};
