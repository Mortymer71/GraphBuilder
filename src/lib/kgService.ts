const API_KEY = process.env.GOOGLE_KG_API_KEY || '';

export interface KGEntity {
  name: string;
  description?: string;
  id: string;
  types: string[];
  url?: string;
  image?: string;
}

export async function searchKnowledgeGraph(query: string): Promise<KGEntity[]> {
  if (!API_KEY) {
    console.warn('GOOGLE_KG_API_KEY is not set');
    return [];
  }

  try {
    const url = `https://kgsearch.googleapis.com/v1/entities:search?query=${encodeURIComponent(query)}&key=${API_KEY}&limit=10&indent=True`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.itemListElement) return [];

    return data.itemListElement.map((item: any) => {
      const entity = item.result;
      return {
        name: entity.name,
        description: entity.description,
        id: entity['@id']?.replace('kgm:', '') || '',
        types: entity['@type'] || [],
        url: entity.detailedDescription?.url || entity.url,
        image: entity.image?.contentUrl,
      };
    });
  } catch (error) {
    console.error('Error searching Knowledge Graph:', error);
    return [];
  }
}
