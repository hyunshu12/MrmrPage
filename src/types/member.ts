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
  avatarPosition: z.string().nullable(),
  order: z.number(),
});

export type Member = z.infer<typeof memberSchema>;

export const memberArraySchema = z.array(memberSchema);
