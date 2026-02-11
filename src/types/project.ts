import { z } from 'zod';

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  year: z.string().nullable(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  order: z.number(),
});

export type Project = z.infer<typeof projectSchema>;

export const projectArraySchema = z.array(projectSchema);
