import { z } from 'zod';

export const achievementSchema = z.object({
  id: z.string(),
  name: z.string(),
  year: z.string().nullable(),
  award: z.string().nullable(),
  team: z.string().nullable(),
  members: z.array(z.string()),
  date: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  // 대표 사진 핫스팟(CSS object-position). 이 필드가 없던 로컬 캐시·부스 스냅샷도 통과하도록 생략 가능.
  thumbnailPosition: z.string().nullish(),
});

export type Achievement = z.infer<typeof achievementSchema>;

export const achievementArraySchema = z.array(achievementSchema);
