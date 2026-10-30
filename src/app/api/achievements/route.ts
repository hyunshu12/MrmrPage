import { cmsListRoute } from '@/lib/cms-route';
import { getPublishedAchievements } from '@/lib/sanity';

// 캐시 정책은 cms-route.ts 에 있다.
export const GET = cmsListRoute(getPublishedAchievements, 'achievements');
