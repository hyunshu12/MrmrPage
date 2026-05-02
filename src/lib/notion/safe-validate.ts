import type { ZodSchema } from 'zod';

export function validatePerRow<T>(items: unknown[], schema: ZodSchema<T>, label: string): T[] {
  const valid: T[] = [];
  for (let i = 0; i < items.length; i += 1) {
    const result = schema.safeParse(items[i]);
    if (result.success) {
      valid.push(result.data);
    } else {
      console.error(`[notion:${label}] row ${i} dropped due to validation error:`, result.error.flatten());
    }
  }
  return valid;
}
