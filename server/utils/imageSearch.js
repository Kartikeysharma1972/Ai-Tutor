const HEADERS = {
  'User-Agent': 'CodeVidhya-AI-Tutor/1.0 (nitin.bharia@codevidhya.com)',
  'Accept': 'application/json',
};

const LITERATURE_SUBJECTS = [
  'english', 'hindi', 'sanskrit', 'urdu', 'language',
  'marigold', 'rimjhim', 'honeysuckle', 'honeydew', 'honeycomb',
  'a pact with the sun', 'footprints without feet', 'first flight',
  'beehive', 'moments', 'flamingo', 'vistas',
];

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'my', 'your', 'his', 'her', 'our', 'their', 'its',
  'this', 'that', 'these', 'those', 'of', 'in', 'at', 'on', 'for', 'to',
  'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
  'from', 'with', 'by', 'about', 'into', 'through',
]);

const VISUAL_ADJECTIVES = new Set([
  'lazy', 'little', 'big', 'small', 'tiny', 'old', 'new', 'young',
  'happy', 'sad', 'naughty', 'wonderful', 'beautiful', 'great',
  'giving', 'magic', 'magical', 'golden', 'clever', 'wise', 'brave',
  'funny', 'silly', 'kind', 'angry', 'hungry', 'lost', 'missing',
  'strange', 'secret', 'special', 'best', 'first', 'last',
]);

const GENERIC_PERSON_WORDS = new Set([
  'man', 'woman', 'boy', 'girl', 'person', 'people', 'child', 'children',
  'king', 'queen', 'prince', 'princess', 'friend', 'story', 'tale', 'poem',
]);

function isLiteratureSubject(subject) {
  if (!subject) return false;
  const lower = subject.toLowerCase().trim();
  return LITERATURE_SUBJECTS.some(s => lower.includes(s));
}

function extractVisualKeyword(chapterOrTopic) {
  const words = chapterOrTopic
    .replace(/['']/g, "'")
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);

  const meaningful = words.filter(w => {
    const lower = w.toLowerCase();
    return !STOP_WORDS.has(lower) && !VISUAL_ADJECTIVES.has(lower);
  });

  if (meaningful.length === 0) {
    return words.filter(w => !STOP_WORDS.has(w.toLowerCase())).join(' ') || chapterOrTopic;
  }

  if (meaningful.length >= 2) {
    const withoutGeneric = meaningful.filter(w => !GENERIC_PERSON_WORDS.has(w.toLowerCase()));
    if (withoutGeneric.length > 0) return withoutGeneric.join(' ');
  }

  return meaningful.join(' ');
}

function extractKeyTopic(query) {
  const cleaned = query
    .replace(/^(what|explain|describe|tell me about|define|how|why|who|when|where|kya|bataao|samjhao)\s+(is|are|was|were|does|do|hai|hain|the|a|an)?\s*/i, '')
    .replace(/\?+$/, '')
    .replace(/in (hindi|english|detail|simple|brief)\s*/gi, '')
    .replace(/class \d+/gi, '')
    .trim();
  return cleaned || query.trim();
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return null;
  return res.json();
}

async function tryRestApi(topic) {
  try {
    const data = await fetchJson(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`
    );
    if (!data) return null;
    if (data.thumbnail?.source) {
      return { url: data.thumbnail.source.replace(/\/\d+px-/, '/500px-'), alt: data.title };
    }
    if (data.originalimage?.source) {
      return { url: data.originalimage.source, alt: data.title };
    }
    return null;
  } catch {
    return null;
  }
}

async function tryPageImagesApi(topic, lang = 'en') {
  try {
    const base = lang === 'hi' ? 'https://hi.wikipedia.org' : 'https://en.wikipedia.org';
    const data = await fetchJson(
      `${base}/w/api.php?action=query&prop=pageimages&format=json&piprop=original|thumbnail&pithumbsize=500&titles=${encodeURIComponent(topic)}&origin=*`
    );
    if (!data) return null;
    const pages = data.query?.pages;
    if (!pages) return null;
    for (const page of Object.values(pages)) {
      if (page.pageid === undefined || page.pageid < 0) continue;
      if (page.thumbnail?.source) {
        return { url: page.thumbnail.source, alt: page.title };
      }
      if (page.original?.source) {
        return { url: page.original.source, alt: page.title };
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function searchWikipediaPages(topic, lang = 'en') {
  try {
    const base = lang === 'hi' ? 'https://hi.wikipedia.org' : 'https://en.wikipedia.org';
    const data = await fetchJson(
      `${base}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&srnamespace=0&srlimit=5&format=json&origin=*`
    );
    return data?.query?.search || [];
  } catch {
    return [];
  }
}

async function tryCommonsSearch(topic) {
  try {
    const data = await fetchJson(
      `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(topic)}&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url|mime&iiurlwidth=500&format=json&origin=*`
    );
    const pages = data?.query?.pages;
    if (!pages) return null;
    for (const page of Object.values(pages)) {
      const info = page.imageinfo?.[0];
      if (info?.mime?.startsWith('image/') && info.mime !== 'image/svg+xml') {
        return { url: info.thumburl || info.url, alt: page.title.replace('File:', '') };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function searchWikipediaImage(topic, subject) {
  try {
    let searchTerm;

    if (isLiteratureSubject(subject)) {
      searchTerm = extractVisualKeyword(topic);
    } else {
      searchTerm = extractKeyTopic(topic);
    }

    // 1. Direct REST API lookup (en)
    const restResult = await tryRestApi(searchTerm);
    if (restResult) return restResult;

    // 2. PageImages API (en)
    const pageImgResult = await tryPageImagesApi(searchTerm, 'en');
    if (pageImgResult) return pageImgResult;

    // 3. Underscore variant via REST
    const underscored = searchTerm.replace(/\s+/g, '_');
    if (underscored !== encodeURIComponent(searchTerm)) {
      const usResult = await tryRestApi(underscored);
      if (usResult) return usResult;
    }

    // 4. Wikipedia search (en) -> pageimages for each result
    const searchResults = await searchWikipediaPages(searchTerm, 'en');
    for (const result of searchResults) {
      const img = await tryPageImagesApi(result.title, 'en');
      if (img) return img;
    }

    // 5. Hindi Wikipedia search -> pageimages
    const hiResults = await searchWikipediaPages(searchTerm, 'hi');
    for (const result of hiResults) {
      const img = await tryPageImagesApi(result.title, 'hi');
      if (img) return img;
    }

    // 6. Wikimedia Commons search
    const commonsResult = await tryCommonsSearch(searchTerm);
    if (commonsResult) return commonsResult;

    return null;
  } catch {
    return null;
  }
}
