import fetch from 'node-fetch';

async function main() {
  const res = await fetch('http://localhost:3002/api/agent/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: 'What is Inktoll?' })
  });

  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

main().catch(console.error);
