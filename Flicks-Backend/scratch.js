const axios = require('axios');

async function test() {
  const url = "https://flow.dasnext.store/mp/resource/6e866b57952c462ef379b5aa7f34abce.mp4?sign=86dd18fe19662a490a1b5b0b286bcd29&t=1784791545&headers=%7B%22origin%22%3A%22https%3A%2F%2Ffilmboom.top%22%2C%22referer%22%3A%22https%3A%2F%2Ffilmboom.top%2F%22%7D&host=https%3A%2F%2Fbcdnxw.hakunaymatata.com";
  
  let targetUrl = url;
  const videoUrlObj = new URL(url);
  let refererUrl = `${videoUrlObj.protocol}//${videoUrlObj.host}`;
  let originUrl = refererUrl;
  let customHost = undefined;

  const encodedHeaders = videoUrlObj.searchParams.get('headers');
  if (encodedHeaders) {
    try {
      const parsedHeaders = JSON.parse(encodedHeaders);
      if (parsedHeaders.referer) refererUrl = parsedHeaders.referer;
      if (parsedHeaders.origin) originUrl = parsedHeaders.origin;
    } catch (e) {
      console.warn('Failed to parse embedded headers');
    }
  }
  
  const hostParam = videoUrlObj.searchParams.get('host');
  if (hostParam) {
    try {
      const hostObj = new URL(hostParam);
      customHost = hostObj.host;
      videoUrlObj.host = customHost;
      targetUrl = videoUrlObj.toString();
    } catch (e) {
      console.warn('Failed to parse host param');
    }
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': refererUrl,
    'Origin': originUrl,
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate',
  };
  
  if (customHost) {
    headers['Host'] = customHost;
  }

  console.log("Target:", targetUrl);
  console.log("Headers:", headers);

  try {
    const res = await axios.get(targetUrl, { headers, responseType: 'stream' });
    console.log("Success! Status:", res.status);
  } catch (e) {
    console.error("Failed:", e.response ? e.response.status : e.message);
  }
}

test();
