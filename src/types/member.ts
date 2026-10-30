import { z } from 'zod';

export const memberSchema = z.object({
  id: z.string(),
  name: z.string(),
  murukGeneration: z.string().nullable(),
  role: z.string().nullable(),
  schoolGeneration: z.string().nullable(),
  className: z.string().nullable(),
  statusMessage: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  // 프로필 사진 핫스팟(CSS object-position). 지정하지 않았으면 null.
  avatarPosition: z.string().nullable(),
});

export type Member = z.infer<typeof memberSchema>;

export const memberArraySchema = z.array(memberSchema);
