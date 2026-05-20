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
  {
    urlPattern: /\/(ko|en)\/media\/[^/]+$/i,
    handler: "NetworkFirst",
    options: {
      cacheName: "thinkad-media-pages-v1",
      expiration: { maxEntries: 24, maxAgeSeconds: 7 * 24 * 60 * 60 },
      networkTimeoutSeconds: 8,
    },
  },
  {
    urlPattern: /\/(ko|en)\/offline-saved$/i,
    handler: "NetworkFirst",
    options: {
      cacheName: "thinkad-offline-pages-v1",
      expiration: { maxEntries: 4, maxAgeSeconds: 30 * 24 * 60 * 60 },
      networkTimeoutSeconds: 8,
    },
  },
];
