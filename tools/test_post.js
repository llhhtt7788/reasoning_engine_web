// tools/test_post.js
// Simple Node script to POST JSON to a URL and print status/headers/body.
// Usage: node tools/test_post.js http://127.0.0.1:11211/api/v1/chat/context

const url = process.argv[2] || 'http://127.0.0.1:11211/api/v1/chat/context';

async function run() {
  const body = {
    system: '你叫小路',
    user: '你是？',
    stream: true,
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    console.log('Status:', res.status);
    console.log('Headers:');
    for (const [k, v] of res.headers.entries()) console.log(k + ':', v);
    const text = await res.text();
    console.log('Body:', text);
  } catch (err) {
    console.error('Request failed:', err);
  }
}

run();

