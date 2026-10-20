// -----------------------------------------------------------------------------
// The one function that talks to the network: an HTTP(S) request on node:http /
// node:https. A POST only exchanges the security token for a session token:
// the integration never writes to Ghostfolio. Not on fetch: fetch cannot accept
// the self-signed certificate of one server only (a Ghostfolio behind a reverse
// proxy often has one), node:https can, per request.
//
// The client takes this function as a parameter: the tests replace it with an
// in-memory Ghostfolio (test/helpers/world.js).
// -----------------------------------------------------------------------------

import http from 'node:http';
import https from 'node:https';

// The chart of the `max` range grows with the age of the portfolio: about
// 170 KB for two and a half years of daily points.
const MAX_BODY_BYTES = 16 * 1024 * 1024;

/**
 * @param {string} url absolute URL
 * @param {object} [options]
 * @param {string} [options.method] GET, or POST with `body`
 * @param {object} [options.body] sent as JSON
 * @param {Record<string, string>} [options.headers]
 * @param {boolean} [options.insecure] accept a certificate that does not verify (HTTPS only)
 * @param {number} [options.timeoutMs]
 * @returns {Promise<{ status: number, headers: Record<string, string>, body: string }>}
 */
export function httpRequest(
  url,
  { method = 'GET', body, headers = {}, insecure = false, timeoutMs = 15_000 } = {},
) {
  const target = new URL(url);
  const isHttps = target.protocol === 'https:';
  const payload = body === undefined ? null : Buffer.from(JSON.stringify(body));
  const requestHeaders = {
    accept: 'application/json',
    ...(payload ? { 'content-type': 'application/json', 'content-length': payload.length } : {}),
    ...headers,
  };

  return new Promise((resolve, reject) => {
    const request = (isHttps ? https : http).request(
      target,
      {
        method,
        headers: requestHeaders,
        timeout: timeoutMs,
        ...(isHttps ? { rejectUnauthorized: !insecure } : {}),
      },
      (response) => {
        const chunks = [];
        let size = 0;
        response.on('data', (chunk) => {
          size += chunk.length;
          if (size > MAX_BODY_BYTES) {
            request.destroy(new Error('Response too large'));
            return;
          }
          chunks.push(chunk);
        });
        response.on('end', () =>
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        );
        response.on('error', reject);
      },
    );
    // `timeout` is socket inactivity only: a server trickling bytes would hold
    // a cycle forever without this overall deadline.
    const deadline = setTimeout(() => {
      const error = new Error(`Timed out after ${timeoutMs} ms`);
      error.code = 'ETIMEDOUT';
      request.destroy(error);
    }, timeoutMs);
    deadline.unref?.();
    request.on('close', () => clearTimeout(deadline));
    request.on('timeout', () => {
      const error = new Error(`Timed out after ${timeoutMs} ms`);
      error.code = 'ETIMEDOUT';
      request.destroy(error);
    });
    request.on('error', reject);
    request.end(payload ?? undefined);
  });
}
