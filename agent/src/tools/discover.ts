import Parser from 'rss-parser';
import { isPurchased } from '../budget.js';

export interface DiscoverResult {
  id: string;
  title: string;
  link: string;
  slug: string;
  price: number;
  wallet: string;
  preview: string;
  pubDate: string;
}

// Config parser with custom tags mapping
const parser = new Parser({
  customFields: {
    item: [
      ['inktoll:slug', 'slug'],
      ['inktoll:price', 'price'],
      ['inktoll:wallet', 'wallet'],
      ['inktoll:preview', 'preview'],
    ],
  },
});

export async function discoverNewArticles(apiUrl: string): Promise<DiscoverResult[]> {
  try {
    console.log(`[Discover Tool] Fetching active creators list from ${apiUrl}/api/creators...`);
    const creatorsResponse = await fetch(`${apiUrl}/api/creators`);
    if (!creatorsResponse.ok) {
      throw new Error(`Failed to fetch creators: ${creatorsResponse.status}`);
    }

    const creators = (await creatorsResponse.json()) as any[];
    console.log(`[Discover Tool] Found ${creators.length} registered creators.`);

    const allArticles: DiscoverResult[] = [];

    for (const creator of creators) {
      const feedUrl = `${apiUrl}/api/feed/${creator.id}`;
      console.log(`[Discover Tool] Polling feed for creator ${creator.id}: ${feedUrl}`);

      try {
        const feedResponse = await fetch(feedUrl);
        if (!feedResponse.ok) {
          console.warn(`[Discover Tool] Failed to fetch feed for creator ${creator.id}: ${feedResponse.status}`);
          continue;
        }

        const feedXml = await feedResponse.text();
        const feed = await parser.parseString(feedXml);

        if (feed.items && Array.isArray(feed.items)) {
          for (const item of feed.items) {
            const anyItem = item as any;
            const slug = anyItem.slug || anyItem['inktoll:slug'] || '';
            const priceStr = anyItem.price || anyItem['inktoll:price'] || '0.005';
            const price = parseFloat(priceStr);
            const wallet = anyItem.wallet || anyItem['inktoll:wallet'] || '';
            const preview = anyItem.preview || anyItem['inktoll:preview'] || '';

            if (!slug) {
              console.warn(`[Discover Tool] Skipping article "${item.title}" - missing slug.`);
              continue;
            }

            // Skip if already purchased
            if (isPurchased(slug)) {
              continue;
            }

            allArticles.push({
              id: item.guid || slug,
              title: item.title || 'Untitled',
              link: item.link || '',
              slug,
              price,
              wallet,
              preview,
              pubDate: item.pubDate || new Date().toISOString(),
            });
          }
        }
      } catch (feedErr: any) {
        console.error(`[Discover Tool] Error parsing feed for creator ${creator.id}: ${feedErr.message}`);
      }
    }

    console.log(`[Discover Tool] Discovery complete. Found ${allArticles.length} new unread articles.`);
    return allArticles;
  } catch (error: any) {
    console.error(`[Discover Tool] Error: ${error.message}`);
    return [];
  }
}
