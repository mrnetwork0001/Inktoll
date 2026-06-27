const Parser = require('rss-parser');
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

const xml = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:inktoll="https://inktoll.org/rss/1.0">
  <channel>
    <item>
      <title>Test Article</title>
      <inktoll:slug>test-article-slug</inktoll:slug>
      <inktoll:price>0.005</inktoll:price>
    </item>
  </channel>
</rss>`;

parser.parseString(xml).then(res => console.log(JSON.stringify(res.items, null, 2))).catch(err => console.error(err));
