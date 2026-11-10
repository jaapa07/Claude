/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseCaption } from '../caption';
import { formatViews, matches, parseViews, rankRecipes } from '../ranking';
import { embedUrl, fetchOEmbed, parseVideoLink } from '../social';
import type { Recipe } from '../types';

describe('parseVideoLink', () => {
  it('reconhece vídeo do TikTok e remove a query string', () => {
    const l = parseVideoLink('https://www.tiktok.com/@chef.ana/video/7312345678901234567?is_from_webapp=1');
    assert.deepEqual(l, {
      platform: 'tiktok',
      url: 'https://www.tiktok.com/@chef.ana/video/7312345678901234567',
      id: '7312345678901234567',
    });
    assert.equal(embedUrl(l!), 'https://www.tiktok.com/player/v1/7312345678901234567?music_info=1&description=1&rel=0');
  });

  it('aceita link curto do TikTok sem ID (resolvido pelo oEmbed)', () => {
    const l = parseVideoLink('vm.tiktok.com/ZMabc123/');
    assert.equal(l?.platform, 'tiktok');
    assert.equal(l?.id, undefined);
    assert.equal(embedUrl(l!), null);
  });

  it('reconhece reel, reels e post do Instagram', () => {
    assert.equal(parseVideoLink('https://www.instagram.com/reel/C1a2B3c4D5e/?igsh=xyz')?.url, 'https://www.instagram.com/reel/C1a2B3c4D5e/');
    assert.equal(parseVideoLink('instagram.com/reels/C1a2B3c4D5e')?.igKind, 'reel');
    const p = parseVideoLink('https://instagram.com/chef.ana/p/AbC_-123/');
    assert.equal(p?.id, 'AbC_-123');
    assert.equal(embedUrl(p!), 'https://www.instagram.com/p/AbC_-123/embed/captioned/');
  });

  it('rejeita outros sites e perfis', () => {
    assert.equal(parseVideoLink('https://youtube.com/watch?v=1'), null);
    assert.equal(parseVideoLink('https://www.instagram.com/chef.ana/'), null);
    assert.equal(parseVideoLink('   '), null);
  });
});

describe('fetchOEmbed', () => {
  it('lê título, autor, miniatura e ID do TikTok', async () => {
    let called = '';
    const fakeFetch = (async (u: string) => {
      called = u;
      return new Response(
        JSON.stringify({
          title: 'Bolo de caneca',
          author_name: 'Chef Ana',
          author_url: 'https://www.tiktok.com/@chef.ana',
          thumbnail_url: 'https://p16.example/thumb.jpg',
          embed_product_id: '7312345678901234567',
        }),
      );
    }) as unknown as typeof fetch;
    const info = await fetchOEmbed(parseVideoLink('https://vm.tiktok.com/ZMabc/')!, fakeFetch);
    assert.match(called, /^https:\/\/www\.tiktok\.com\/oembed\?url=https%3A%2F%2Fvm\.tiktok\.com%2FZMabc$/);
    assert.equal(info?.videoId, '7312345678901234567');
    assert.equal(info?.authorName, 'Chef Ana');
  });

  it('retorna null em erro de rede ou HTTP', async () => {
    const link = parseVideoLink('https://www.tiktok.com/@a/video/1')!;
    assert.equal(await fetchOEmbed(link, (async () => new Response('', { status: 404 })) as unknown as typeof fetch), null);
    assert.equal(await fetchOEmbed(link, (async () => { throw new Error('offline'); }) as unknown as typeof fetch), null);
  });

  it('Instagram sem token não faz requisição', async () => {
    delete process.env.EXPO_PUBLIC_META_OEMBED_TOKEN;
    let calls = 0;
    const info = await fetchOEmbed(parseVideoLink('https://www.instagram.com/reel/X1/')!, (async () => {
      calls++;
      return new Response('{}');
    }) as unknown as typeof fetch);
    assert.equal(info, null);
    assert.equal(calls, 0);
  });
});

describe('parseCaption', () => {
  it('separa título, ingredientes, preparo, hashtags e categoria', () => {
    const caption = `Bolo de caneca de chocolate em 3 minutos 🍫🔥

Ingredientes:
- 1 ovo
- 4 colheres de leite
• 3 colheres de açúcar
✅ 2 colheres de chocolate em pó

Modo de preparo:
1. Misture tudo na caneca
2. Leve ao micro-ondas por 3 minutos

#receita #bolodecaneca #doce`;
    const p = parseCaption(caption);
    assert.equal(p.title, 'Bolo de caneca de chocolate em 3 minutos');
    assert.deepEqual(p.ingredients, ['1 ovo', '4 colheres de leite', '3 colheres de açúcar', '2 colheres de chocolate em pó']);
    assert.deepEqual(p.steps, ['Misture tudo na caneca', 'Leve ao micro-ondas por 3 minutos']);
    assert.deepEqual(p.hashtags, ['receita', 'bolodecaneca', 'doce']);
    assert.equal(p.category, 'Doces');
  });

  it('funciona sem cabeçalhos, usando quantidades', () => {
    const p = parseCaption('Frango na airfryer\n500 g de frango\n1 colher de páprica\nTempere e asse por 20 minutos a 200 graus.');
    assert.equal(p.title, 'Frango na airfryer');
    assert.deepEqual(p.ingredients, ['500 g de frango', '1 colher de páprica']);
    assert.equal(p.steps.length, 1);
    assert.equal(p.category, 'Airfryer');
  });

  it('ingredientes na mesma linha do cabeçalho', () => {
    const p = parseCaption('Suco verde\nIngredientes: couve, limão, gengibre');
    assert.deepEqual(p.ingredients, ['couve', 'limão', 'gengibre']);
    assert.equal(p.category, 'Bebidas');
  });
});

describe('ranking', () => {
  const r = (id: string, extra: Partial<Recipe>): Recipe => ({
    id,
    title: id,
    category: 'Doces',
    ingredients: [],
    steps: [],
    createdAt: 0,
    ...extra,
  });

  it('vídeos primeiro, depois visualizações, depois mais recentes', () => {
    const out = rankRecipes([
      r('semVideo', { views: 9_000_000, createdAt: 9 }),
      r('videoPouco', { videoUrl: 'x', views: 10 }),
      r('videoMuito', { videoUrl: 'x', views: 5_000 }),
      r('videoNovo', { videoUrl: 'x', createdAt: 5 }),
      r('videoVelho', { videoUrl: 'x', createdAt: 1 }),
    ]);
    assert.deepEqual(out.map((x) => x.id), ['videoMuito', 'videoPouco', 'videoNovo', 'videoVelho', 'semVideo']);
  });

  it('busca ignora acentos e procura nos ingredientes', () => {
    const rec = r('a', { title: 'Pão de queijo', ingredients: ['1 ovo', 'polvilho'], platform: 'tiktok' });
    assert.ok(matches(rec, { query: 'pao POLVILHO', platform: 'all', category: 'all' }));
    assert.ok(!matches(rec, { query: 'pao', platform: 'instagram', category: 'all' }));
    assert.ok(!matches(rec, { query: '', platform: 'all', category: 'Massas' }));
  });

  it('formata e interpreta visualizações', () => {
    assert.equal(formatViews(1_234_567), '1,2 mi');
    assert.equal(formatViews(15_300), '15 mil');
    assert.equal(formatViews(0), null);
    assert.equal(parseViews('1,2 mi'), 1_200_000);
    assert.equal(parseViews('350 mil'), 350_000);
    assert.equal(parseViews('15k'), 15_000);
    assert.equal(parseViews('12.000'), 12_000);
    assert.equal(parseViews('abc'), undefined);
  });
});
