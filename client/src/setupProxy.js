const { createProxyMiddleware } = require('http-proxy-middleware');

/**
 * The `proxy` field in package.json skips GET requests that ask for text/html,
 * so browser navigations fall through to index.html. The Gmail OAuth flow is
 * exactly that kind of request: Google redirects the browser to
 * /oauth2callback?code=..., which must reach Express, not the React app.
 *
 * These paths are proxied explicitly so they ignore the Accept header rule.
 */
module.exports = function (app) {
  app.use(
    ['/oauth2callback', '/api/gmail'],
    createProxyMiddleware({
      target: 'http://localhost:5000',
      changeOrigin: true
    })
  );
};
