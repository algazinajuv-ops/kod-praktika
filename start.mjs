import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { loadAssets } from './build.mjs';
import { createApp } from './server.mjs';

const port = Number(process.env.PORT || 8790);
const app = createApp(await loadAssets(), { allowOllama: true });
const server = createServer(async (incoming, outgoing) => {
  const cancellation = new AbortController();
  outgoing.once('close', () => { if (!outgoing.writableEnded) cancellation.abort(); });
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    const url = new URL(incoming.url, origin);
    if (url.origin !== origin || incoming.headers.host !== url.host) {
      outgoing.writeHead(403).end();
      return;
    }
    const method = incoming.method;
    const request = new Request(url, {
      method, headers: incoming.headers, signal: cancellation.signal,
      ...(!['GET', 'HEAD'].includes(method) && { body: Readable.toWeb(incoming), duplex: 'half' })
    });
    const response = await app.fetch(request, process.env);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    if (!outgoing.headersSent) outgoing.writeHead(500);
    if (!outgoing.writableEnded) outgoing.end();
  }
});
server.listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${server.address().port}/`));
