const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

const previewCache = new Map();
const CACHE_TTL = 10 * 60 * 1000;

const OG_REGEX = /<meta\s+(?:property|name)=["'](?:og:)?(?:title|description|image)["'][^>]*content=["']([^"']*)["'][^>]*\/?>/gi;

const parseOg = (html) => {
  const result = { title: '', description: '', image: '' };
  const metas = html.matchAll(/<meta[^>]*>/gi);
  for (const m of metas) {
    const tag = m[0];
    const prop = tag.match(/(?:property|name)=["']([^"']*)["']/)?.[1]?.toLowerCase();
    const content = tag.match(/content=["']([^"']*)["']/)?.[1];
    if (!prop || !content) continue;
    if (prop === 'og:title' || prop === 'twitter:title') { if (!result.title) result.title = content; }
    if (prop === 'og:description' || prop === 'description' || prop === 'twitter:description') { if (!result.description) result.description = content; }
    if (prop === 'og:image' || prop === 'twitter:image') { if (!result.image) result.image = content; }
  }
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  if (!result.title && titleMatch) result.title = titleMatch[1];
  return result;
};

router.post('/preview', auth, async (req, res) => {
  let url;
  try {
    url = req.body.url;
    if (!url || !/^https?:\/\/.+/.test(url)) {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    const cached = previewCache.get(url);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return res.json(cached.data);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TuChat/1.0)' },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    const html = await response.text();
    const og = parseOg(html);
    if (og.image && !og.image.startsWith('http')) {
      try { og.image = new URL(og.image, url).href; } catch {}
    }

    const data = { ...og, url };
    previewCache.set(url, { data, ts: Date.now() });
    res.json(data);
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.json({ url, title: '', description: '', image: '' });
    }
    res.json({ url, title: '', description: '', image: '' });
  }
});

module.exports = router;
