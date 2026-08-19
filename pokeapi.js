(function (global) {
  'use strict';

  const API_BASE = 'https://pokeapi.co/api/v2';

  const LANG_MAP = {
    en: 'en',
    de: 'de',
    es: 'es',
    fr: 'fr',
    ko: 'ko',
    pt: 'pt',
    zh: 'zh-Hans',
    zhtw: 'zh-Hant'
  };

  const cache = new Map();
  let lastFetchTime = 0;
  const MIN_DELAY_MS = 120;

  async function pokeFetch(url) {
    const now = Date.now();
    const wait = Math.max(0, MIN_DELAY_MS - (now - lastFetchTime));
    if (wait > 0) {
      await new Promise(resolve => setTimeout(resolve, wait));
    }
    lastFetchTime = Date.now();

    if (cache.has(url)) {
      return cache.get(url);
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`PokeAPI request failed: ${response.status} ${url}`);
    }
    const data = await response.json();
    cache.set(url, data);
    return data;
  }

  function resolveLang(langCode) {
    return LANG_MAP[langCode] || langCode;
  }

  async function fetchPokemonList(limit, offset) {
    const l = typeof limit === 'number' ? limit : 20;
    const o = typeof offset === 'number' ? offset : 0;
    return pokeFetch(`${API_BASE}/pokemon?limit=${l}&offset=${o}`);
  }

  async function fetchPokemonDetail(nameOrId) {
    const pokemon = await pokeFetch(`${API_BASE}/pokemon/${encodeURIComponent(String(nameOrId).toLowerCase())}`);
    let species = null;
    if (pokemon && pokemon.species && pokemon.species.url) {
      species = await pokeFetch(pokemon.species.url);
    }
    return { pokemon, species };
  }

  function getLocalizedName(speciesData, langCode) {
    if (!speciesData || !Array.isArray(speciesData.names)) {
      return '';
    }
    const target = resolveLang(langCode);
    const names = speciesData.names;
    let entry = names.find(n => n.language && n.language.name === target);
    if (!entry && target !== 'en') {
      entry = names.find(n => n.language && n.language.name === 'en');
    }
    if (!entry) {
      entry = names.find(n => n.language && n.language.name === 'ja');
    }
    return entry ? entry.name : (speciesData.name || '');
  }

  function getFlavorText(speciesData, langCode) {
    if (!speciesData || !Array.isArray(speciesData.flavor_text_entries)) {
      return '';
    }
    const target = resolveLang(langCode);
    const entries = speciesData.flavor_text_entries;
    let entry = entries.find(e => e.language && e.language.name === target);
    if (!entry && target !== 'en') {
      entry = entries.find(e => e.language && e.language.name === 'en');
    }
    if (!entry) {
      entry = entries.find(e => e.language && e.language.name === 'ja');
    }
    return entry ? entry.flavor_text.replace(/\s+/g, ' ').trim() : '';
  }

  global.PokeAPI = {
    fetchPokemonList,
    fetchPokemonDetail,
    getLocalizedName,
    getFlavorText
  };
})(typeof window !== 'undefined' ? window : globalThis);
