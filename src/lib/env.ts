import { z } from 'zod';

const serverEnvSchema = z.object({
  NOTION_TOKEN: z.string().min(1, 'NOTION_TOKEN is required'),
  NOTION_MEMBERS_DB_ID: z.string().min(1, 'NOTION_MEMBERS_DB_ID is required'),
  NOTION_PROJECTS_DB_ID: z.string().min(1, 'NOTION_PROJECTS_DB_ID is required'),
  NOTION_ACHIEVEMENTS_DB_ID: z.string().min(1, 'NOTION_ACHIEVEMENTS_DB_ID is required'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | null = null;

function validateEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = serverEnvSchema.safeParse({
    NOTION_TOKEN: process.env.NOTION_TOKEN,
    NOTION_MEMBERS_DB_ID: process.env.NOTION_MEMBERS_DB_ID,
    NOTION_PROJECTS_DB_ID: process.env.NOTION_PROJECTS_DB_ID,
    NOTION_ACHIEVEMENTS_DB_ID: process.env.NOTION_ACHIEVEMENTS_DB_ID,
  });

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables. Check server logs for details.');
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function getEnv(): ServerEnv {
  return validateEnv();
}

// Proxy for lazy access
export const env = new Proxy({} as ServerEnv, {
  get(_target, prop: keyof ServerEnv) {
    return getEnv()[prop];
  },
});
