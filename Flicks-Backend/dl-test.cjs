// Temporary end-to-end test for the /api/download/stream ffmpeg pipeline.
// Boots JUST the express app (no Puppeteer browser needed for download/proxy).
const app = require('./src/app');
const fs = require('fs');

const server = app.listen(0);

server.on('listening', () => {
  const base = `http://localhost:${server.address().port}`;
  const raw = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
  const url = `${base}/api/download/stream?url=${encodeURIComponent(raw)}&filename=BigBuckBunny`;
  console.log('GET (master playlist)');
  console.log('---');

  (async () => {
    try {
      const res = await fetch(url);
      console.log('status ', res.status);
      console.log('type   ', res.headers.get('content-type'));
      console.log('disp   ', res.headers.get('content-disposition'));

      const reader = res.body.getReader();
      const outPath = 'C:\\Users\\Lucas\\Documents\\Movie_Stash\\Flicks-Backend\\dl-output.mp4';
      const fd = fs.openSync(outPath, 'w');
      const deadline = Date.now() + 20000; // accumulate ~20s then stop
      let total = 0;
      let header = Buffer.alloc(0);

      while (Date.now() < deadline) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value || value.length === 0) continue;
        fs.writeSync(fd, value); // value is a Buffer here
        total += value.length;
        if (header.length < 16) {
          header = Buffer.concat([header, value]).subarray(0, 16);
        }
      }
      fs.closeSync(fd);
      const hex = header.toString('hex');
      console.log(`accumulated ${total} bytes`);
      console.log(`header: ${hex}`);
      const ok = total >= 16 && hex.slice(8, 16) === '66747970';
      console.log(ok ? '=> OK: valid MP4 (ftyp box present), stream confirmed' : '=> ftyp not seen yet');
      await reader.cancel();
      console.log('>>> client abort (ffmpeg killed)');
    } catch (e) {
      console.error('TEST ERROR', e.message);
    } finally {
      server.close();
      process.exit(0);
    }
  })();
});

setTimeout(() => { console.error('TIMEOUT'); process.exit(1); }, 60000);