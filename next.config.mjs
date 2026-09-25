const isDev = process.env.NODE_ENV !== 'production';

/**
 * Content Security Policy.
 *
 * The site loads nothing from third parties: fonts are self-hosted by
 * next/font, Stripe Checkout is a full-page redirect (no Stripe.js), and the
 * social links are plain navigation, which CSP does not restrict. So everything
 * is 'self', with these exceptions:
 *   - script 'unsafe-inline': Next's hydration scripts are inline. Nonces would
 *     force every page to render dynamically and lose static prerendering.
 *   - script 'unsafe-eval' in development only: React Refresh needs it.
 *   - style 'unsafe-inline': React style props and the email preview's inline CSS.
 *   - img/media data: and blob:: Phaser's baked textures and the admin's
 *     image-upload previews.
 *   - vercel.live: the comment toolbar on Vercel preview deployments.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://vercel.live`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' data: blob:",
  `connect-src 'self' https://vercel.live wss://ws-us3.pusher.com${isDev ? ' ws:' : ''}`,
  "frame-src 'self' https://vercel.live",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
  // Nobody may frame the site: stops clickjacking the back office.
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  // Older-browser equivalent of frame-ancestors 'none'.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
