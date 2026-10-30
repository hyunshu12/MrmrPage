import { SITE_URL } from '@/lib/site';
import type { MetadataRoute } from 'next';

const ROUTES = ['/', '/projects', '/achievements', '/members', '/faq'] as const;

// lastModified 는 두지 않는다. 빌드 시각을 넣으면 내용과 무관한 배포마다 모든 URL 이 바뀐 것으로 보여
// 검색엔진이 lastmod 자체를 믿지 않게 된다.
export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((route) => ({
    url: `${SITE_URL}${route}`,
    changeFrequency: route === '/' ? 'weekly' : 'monthly',
    priority: route === '/' ? 1 : 0.8,
  }));
}
