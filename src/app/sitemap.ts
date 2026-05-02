import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.mrmr.kr';

const ROUTES = ['/', '/projects', '/achievements', '/members', '/faq'] as const;

const BUILD_TIMESTAMP = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: BUILD_TIMESTAMP,
    changeFrequency: route === '/' ? 'weekly' : 'monthly',
    priority: route === '/' ? 1 : 0.8,
  }));
}
