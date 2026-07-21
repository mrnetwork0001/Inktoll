import { Article } from '../db/index.js';

// Paragraph public content API — no API key required for reading published content.
// Docs: https://paragraph.com/docs/api-reference
const PARAGRAPH_API_BASE = 'https://public.api.paragraph.com/api/v1';

// Accepts "@myblog", "myblog", "https://paragraph.com/@myblog", "paragraph.xyz/@myblog/post" etc.
export function parseParagraphSlug(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, '');
  if (!trimmed.includes('/') && !trimmed.includes('.')) {
    return trimmed.replace(/^@/, '');
  }
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const segments = url.pathname.split('/').filter(Boolean);
    const handle = segments.find((s) => s.startsWith('@')) || segments[0];
    if (handle) return handle.replace(/^@/, '');
  } catch {
    // Not a parseable URL; fall through to raw handle
  }
  return trimmed.replace(/^@/, '');
}

// Paragraph returns publishedAt as epoch milliseconds; the articles table
// stores ISO strings (matching the Ghost import path).
function normalizePublishedAt(value: any): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const date = typeof value === 'number' || /^\d+$/.test(String(value))
    ? new Date(Number(value))
    : new Date(value);
  return isNaN(date.getTime()) ? undefined : date.toISOString();
}

// Handles both '@slug' handles and wallet-address profile URLs
// (e.g. app.paragraph.com/0xabc... resolves wallet -> user -> publication).
async function fetchParagraphPublication(handle: string): Promise<any> {
  if (/^0x[a-fA-F0-9]{40}$/.test(handle)) {
    const userResponse = await fetch(`${PARAGRAPH_API_BASE}/users/wallet/${handle}`);
    if (userResponse.ok) {
      const user = (await userResponse.json()) as any;
      if (user.publicationId) {
        const pubResponse = await fetch(`${PARAGRAPH_API_BASE}/publications/${user.publicationId}`);
        if (pubResponse.ok) return pubResponse.json();
      }
    }
    // Fall through: some publications use the wallet address as their slug
  }
  const response = await fetch(`${PARAGRAPH_API_BASE}/publications/slug/${encodeURIComponent(handle)}`);
  if (response.status === 404) {
    throw new Error(`Paragraph publication '@${handle}' was not found. Double-check your publication URL or handle.`);
  }
  if (!response.ok) {
    throw new Error(`Paragraph API responded with status ${response.status} for publication '${handle}'. Please try again.`);
  }
  return response.json();
}

// No mock fallback by design: a bad URL or Paragraph API failure must surface
// to the creator as an error — never silently import sample articles.
export async function fetchParagraphArticles(publicationUrl: string): Promise<Partial<Article>[]> {
  if (!publicationUrl) {
    throw new Error('Paragraph publication URL is required.');
  }

  const slug = parseParagraphSlug(publicationUrl);
  console.log(`[Paragraph Service] Resolving publication '@${slug}'...`);
  const publication = await fetchParagraphPublication(slug);

  const posts: any[] = [];
  let cursor: string | undefined;
  do {
    const params = new URLSearchParams({ limit: '100', includeContent: 'true' });
    if (cursor) params.set('cursor', cursor);
    const response = await fetch(`${PARAGRAPH_API_BASE}/publications/${publication.id}/posts?${params}`);
    if (!response.ok) {
      throw new Error(`Paragraph API responded with status ${response.status} listing posts. Please try again.`);
    }
    const page = (await response.json()) as any;
    const items = page.items || page.posts || page.data || [];
    posts.push(...items);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  console.log(`[Paragraph Service] Fetched ${posts.length} posts from '@${slug}'.`);
  return posts.map((post: any) => ({
    ghost_slug: post.slug,
    title: post.title,
    excerpt: post.subtitle || '',
    full_html: post.staticHtml || (post.markdown ? `<pre>${post.markdown}</pre>` : ''),
    published_at: normalizePublishedAt(post.publishedAt),
  }));
}

// Cryptographic proof-of-authorship: the connected wallet must resolve (via
// Paragraph's public user API) to the user who owns the publication.
export async function verifyParagraphOwnership(publicationUrl: string, walletAddress: string): Promise<boolean> {
  try {
    const slug = parseParagraphSlug(publicationUrl);
    const publication = await fetchParagraphPublication(slug);

    const response = await fetch(`${PARAGRAPH_API_BASE}/users/wallet/${walletAddress}`);
    if (!response.ok) {
      console.log(`[Paragraph Service] No Paragraph user found for wallet ${walletAddress} (status ${response.status}).`);
      return false;
    }
    const user = (await response.json()) as any;

    const isOwner = user.id === publication.ownerUserId || user.publicationId === publication.id;
    console.log(`[Paragraph Service] Ownership check for '@${slug}' vs wallet ${walletAddress}: ${isOwner ? 'VERIFIED' : 'NOT OWNER'}`);
    return isOwner;
  } catch (error: any) {
    console.error(`[Paragraph Service] Ownership verification failed: ${error.message}`);
    return false;
  }
}
