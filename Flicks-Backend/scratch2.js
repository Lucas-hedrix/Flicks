const axios = require('axios');
axios.get('https://2embed.cc/embed/movie/550', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
}).then(r => {
  const links = r.data.match(/https?:\/\/[^\s\"\'<>]+/g) || [];
  const dlhub = links.filter(l => l.includes('dlhub'));
  console.log('DLHub links found:', dlhub);
}).catch(e => console.error(e.message));
