import fetch from 'node-fetch';

async function test() {
  const url = 'http://localhost:3001/api/articles/the-rise-of-the-machine-economy-how-inktoll-is-making-ai-agents-pay-for-content';
  console.log('Fetching:', url);
  try {
    const res = await fetch(url);
    console.log('Status:', res.status);
    console.log('Headers:', Object.fromEntries(res.headers.entries()));
    const text = await res.text();
    console.log('Raw text response length:', text.length);
    console.log('Raw text preview (first 100 chars):', text.substring(0, 100));
    try {
      const json = JSON.parse(text);
      console.log('Parsed JSON successfully');
    } catch (e) {
      console.error('JSON parsing failed:', e.message);
    }
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}

test();
