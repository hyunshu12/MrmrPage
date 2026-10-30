import { z } from 'zod';

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  year: z.string().nullable(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  // 로고 핫스팟(CSS object-position). 이 필드가 없던 로컬 캐시·부스 스냅샷도 통과하도록 생략 가능.
  logoPosition: z.string().nullish(),
});

export type Project = z.infer<typeof projectSchema>;

export const projectArraySchema = z.array(projectSchema);
