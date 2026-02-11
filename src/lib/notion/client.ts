import { env } from '@/lib/env';
import { Client } from '@notionhq/client';

let notionClient: Client | null = null;

export function getNotionClient(): Client {
  if (!notionClient) {
    notionClient = new Client({
      auth: env.NOTION_TOKEN,
    });
  }
  return notionClient;
}
