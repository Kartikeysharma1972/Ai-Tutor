function extractKeyTopic(query) {
  const cleaned = query
    .replace(/^(what|explain|describe|tell me about|define|how|why|who|when|where|kya|bataao|samjhao)\s+(is|are|was|were|does|do|hai|hain|the|a|an)?\s*/i, '')
    .replace(/\?+$/, '')
    .replace(/in (hindi|english|detail|simple|brief)\s*/gi, '')
    .replace(/class \d+/gi, '')
    .trim();
  return cleaned || query.trim();
}

async function tryFetchImage(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.thumbnail?.source) {
      const imgUrl = data.thumbnail.source.replace(/\/\d+px-/, '/500px-');
      return { url: imgUrl, alt: data.title };
    }
    if (data.originalimage?.source) {
      return { url: data.originalimage.source, alt: data.title };
    }
    return null;
  } catch {
    return null;
  }
}

export async function searchWikipediaImage(topic) {
  try {
    const keyTopic = extractKeyTopic(topic);

    const directResult = await tryFetchImage(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(keyTopic)}`
    );
    if (directResult) return directResult;

    const underscored = keyTopic.replace(/\s+/g, '_');
    if (underscored !== encodeURIComponent(keyTopic)) {
      const underscoreResult = await tryFetchImage(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${underscored}`
      );
      if (underscoreResult) return underscoreResult;
    }

    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(keyTopic)}&srnamespace=0&srlimit=5&format=json&origin=*`
    );
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const results = searchData?.query?.search;
    if (!results?.length) return null;

    for (const result of results) {
      const pageResult = await tryFetchImage(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(result.title)}`
      );
      if (pageResult) return pageResult;
    }

    const commonsRes = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(keyTopic)}&gsrnamespace=6&gsrlimit=3&prop=imageinfo&iiprop=url|mime&iiurlwidth=500&format=json&origin=*`
    );
    if (commonsRes.ok) {
      const commonsData = await commonsRes.json();
      const pages = commonsData?.query?.pages;
      if (pages) {
        for (const page of Object.values(pages)) {
          const info = page.imageinfo?.[0];
          if (info?.mime?.startsWith('image/') && info.mime !== 'image/svg+xml') {
            return { url: info.thumburl || info.url, alt: page.title.replace('File:', '') };
          }
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}
