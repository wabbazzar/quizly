import { DeckFamily } from '@/types';

let cachedFamilies: DeckFamily[] | null = null;

export const loadFamilies = async (): Promise<DeckFamily[]> => {
  if (cachedFamilies) return cachedFamilies;

  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/families.json`);
    if (!response.ok) return [];

    const data = await response.json();
    if (!data || !Array.isArray(data.families)) return [];

    const families: DeckFamily[] = data.families
      .filter(
        (f: Record<string, unknown>) =>
          typeof f.id === 'string' &&
          typeof f.name === 'string' &&
          typeof f.description === 'string' &&
          typeof f.color === 'string' &&
          typeof f.sortOrder === 'number'
      )
      .map((f: Record<string, unknown>) => ({
        id: f.id as string,
        name: f.name as string,
        description: f.description as string,
        color: f.color as string,
        sortOrder: f.sortOrder as number,
      }))
      .sort((a: DeckFamily, b: DeckFamily) => a.sortOrder - b.sortOrder);

    cachedFamilies = families;
    return families;
  } catch {
    return [];
  }
};
