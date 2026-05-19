/**
 * next-pwa runtime caching
 * - 정적 자산: StaleWhileRevalidate
 * - API: NetworkFirst
 */
const defaultCache = require("next-pwa/cache");

module.exports = [
  ...defaultCache,
  {
    urlPattern: ({ request }) => request.destination === "document",
    handler: "NetworkFirst",
    options: {
      cacheName: "pages",
      expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
      networkTimeoutSeconds: 10,
    },
  },
  {
    urlPattern: /\/_next\/static\/.*/i,
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "next-static",
      expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
    },
  },
  {
    urlPattern: /\/api\/.*/i,
    handler: "NetworkFirst",
    options: {
      cacheName: "api",
      expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 },
      networkTimeoutSeconds: 10,
    },
  },
];
