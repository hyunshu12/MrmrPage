import { z } from 'zod';

export const achievementSchema = z.object({
  id: z.string(),
  name: z.string(),
  year: z.string().nullable().optional(),
  award: z.string().nullable(),
  team: z.string().nullable(),
  members: z.array(z.string()),
  date: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  order: z.number(),
});

export type Achievement = z.infer<typeof achievementSchema>;

export const achievementArraySchema = z.array(achievementSchema);
