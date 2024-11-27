import { Languages } from '@/i18n/ui';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function getBlogPaths(lang: Languages): Promise<string[]> {
  const dirPath = path.join(process.cwd(), 'content', 'blog', lang);
  try {
    const files = await fs.readdir(dirPath);
    return files.map((file) =>
      path.join('/blog', lang, path.parse(file).name)
    );
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
    return []; // Return empty array on error
  }
}
