export async function searchWikipediaImage(topic) {
  try {
    const query = encodeURIComponent(topic.trim());
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${query}`);
    if (res.ok) {
      const data = await res.json();
      if (data.thumbnail?.source) {
        const url = data.thumbnail.source.replace(/\/\d+px-/, '/500px-');
        return { url, alt: data.title };
      }
    }

    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${query}&srnamespace=0&srlimit=3&format=json&origin=*`
    );
    const searchData = await searchRes.json();
    const results = searchData?.query?.search;
    if (!results?.length) return null;

    for (const result of results) {
      const title = encodeURIComponent(result.title);
      const pageRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`);
      if (pageRes.ok) {
        const pageData = await pageRes.json();
        if (pageData.thumbnail?.source) {
          const url = pageData.thumbnail.source.replace(/\/\d+px-/, '/500px-');
          return { url, alt: pageData.title };
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function injectImage(text, imageData) {
  if (!imageData) return text;
  const img = `\n\n![${imageData.alt}](${imageData.url})\n`;
  const firstNewline = text.indexOf('\n', text.indexOf('#'));
  if (firstNewline > 0) {
    const insertPoint = text.indexOf('\n', firstNewline + 1);
    if (insertPoint > 0) return text.slice(0, insertPoint) + img + text.slice(insertPoint);
  }
  return img + '\n' + text;
}
