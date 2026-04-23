/**
 * Fetches the latest Schema.org definitions (simplified)
 * In a real-world app, we'd cache this or use a more robust parser.
 */

export interface SchemaProperty {
  id: string;
  label: string;
  description: string;
  types: string[];
}

export interface SchemaType {
  id: string;
  label: string;
  description: string;
  properties: SchemaProperty[];
  subClassOf?: string[];
}

const DEFAULT_TYPES = [
  'Organization', 'LocalBusiness', 'Dentist', 'Restaurant', 'LegalService',
  'Article', 'NewsArticle', 'BlogPosting', 'Product', 'Service', 'FAQPage', 'Person'
];

export async function getSchemaType(typeName: string): Promise<SchemaType | null> {
  // For MVP, we use a curated list or fetch from schema.org if needed.
  // Real implementation would parse schema.org/docs/tree.jsonld
  
  // Simulated lookup for core types mentioned in PRD
  const mockDefinitions: Record<string, any> = {
    'Organization': {
      label: 'Organization',
      properties: [
        { id: 'name', label: 'Name', description: 'The name of the item.', types: ['Text'] },
        { id: 'url', label: 'URL', description: 'URL of the item.', types: ['URL'] },
        { id: 'logo', label: 'Logo', description: 'An image for the logo.', types: ['ImageObject', 'URL'] },
        { id: 'sameAs', label: 'Same As', description: 'URL of a reference page.', types: ['URL'], multiple: true },
        { id: 'description', label: 'Description', description: 'A description of the item.', types: ['Text'] },
        { id: 'alternateName', label: 'Alternate Name', description: 'An alias for the item.', types: ['Text'] },
        { id: 'legalName', label: 'Legal Name', description: 'The official name.', types: ['Text'] },
        { id: 'email', label: 'Email', description: 'Email address.', types: ['Text'] },
        { id: 'telephone', label: 'Telephone', description: 'The telephone number.', types: ['Text'] },
        { id: 'foundingDate', label: 'Founding Date', description: 'The date that this organization was founded.', types: ['Date'] },
      ]
    },
    'LocalBusiness': {
      label: 'Local Business',
      properties: [
        { id: 'name', label: 'Name', types: ['Text'] },
        { id: 'url', label: 'URL', types: ['URL'] },
        { id: 'telephone', label: 'Telephone', types: ['Text'] },
        { id: 'priceRange', label: 'Price Range', types: ['Text'] },
        { id: 'openingHours', label: 'Opening Hours', types: ['Text'], multiple: true },
        { id: 'address', label: 'Address', types: ['PostalAddress'] },
        { id: 'image', label: 'Image', types: ['ImageObject', 'URL'], multiple: true },
        { id: 'geo', label: 'Geo Coordinates', types: ['GeoCoordinates'] },
      ]
    },
    'Article': {
      label: 'Article',
      properties: [
        { id: 'headline', label: 'Headline', types: ['Text'] },
        { id: 'description', label: 'Description', types: ['Text'] },
        { id: 'articleBody', label: 'Article Body', types: ['Text'] },
        { id: 'author', label: 'Author', types: ['Person', 'Organization'], multiple: true },
        { id: 'datePublished', label: 'Date Published', types: ['Date'] },
        { id: 'dateModified', label: 'Date Modified', types: ['Date'] },
        { id: 'image', label: 'Image', types: ['ImageObject', 'URL'], multiple: true },
        { id: 'publisher', label: 'Publisher', types: ['Organization'] },
        { id: 'mainEntityOfPage', label: 'Main Entity', types: ['URL'] },
        { id: 'about', label: 'About', description: 'The subject matter of the content.', types: ['Thing'], multiple: true },
        { id: 'mentions', label: 'Mentions', description: 'Indicates that the CreativeWork contains a reference to, or representation of, a specific entity.', types: ['Thing'], multiple: true },
      ]
    },
    'Person': {
      label: 'Person',
      properties: [
        { id: 'name', label: 'Name', types: ['Text'] },
        { id: 'givenName', label: 'Given Name', types: ['Text'] },
        { id: 'familyName', label: 'Family Name', types: ['Text'] },
        { id: 'jobTitle', label: 'Job Title', types: ['Text'] },
        { id: 'worksFor', label: 'Works For', types: ['Organization'] },
        { id: 'url', label: 'URL', types: ['URL'] },
        { id: 'image', label: 'Image', types: ['ImageObject', 'URL'] },
        { id: 'sameAs', label: 'Same As', types: ['URL'], multiple: true },
        { id: 'email', label: 'Email', types: ['Text'] },
      ]
    },
    'Service': {
      label: 'Service',
      properties: [
        { id: 'name', label: 'Name', types: ['Text'] },
        { id: 'description', label: 'Description', types: ['Text'] },
        { id: 'provider', label: 'Provider', types: ['Organization', 'Person'] },
        { id: 'areaServed', label: 'Area Served', types: ['Place', 'AdministrativeArea', 'Text'] },
        { id: 'offers', label: 'Offers', types: ['Offer'], multiple: true },
        { id: 'logo', label: 'Logo', types: ['ImageObject', 'URL'] },
        { id: 'about', label: 'About', types: ['Thing'], multiple: true },
        { id: 'mentions', label: 'Mentions', types: ['Thing'], multiple: true },
      ]
    },
    'FAQPage': {
      label: 'FAQ Page',
      properties: [
        { id: 'name', label: 'Name', types: ['Text'] },
        { id: 'mainEntity', label: 'Questions', types: ['Question'], multiple: true }
      ]
    }
  };

  // Fallback for LocalBusiness subtypes (Dentist, Restaurant, etc.)
  if (!mockDefinitions[typeName] && ['Dentist', 'Restaurant', 'MedicalBusiness', 'LegalService'].includes(typeName)) {
    return {
      ...mockDefinitions['LocalBusiness'],
      label: typeName,
      id: typeName
    };
  }

  return mockDefinitions[typeName] || null;
}

export interface ValidationResult {
  type: 'error' | 'warning';
  entityType: string;
  field: string;
  message: string;
  docUrl?: string;
}

export function validateGraph(graph: any[]): ValidationResult[] {
  const results: ValidationResult[] = [];

  graph.forEach((entity, index) => {
    const type = entity['@type'];
    const id = entity['@id'] || `Node ${index}`;

    switch (type) {
      case 'Organization':
      case 'LocalBusiness':
      case 'Dentist':
      case 'Restaurant':
      case 'MedicalBusiness':
        if (!entity.name) {
          results.push({
            type: 'error',
            entityType: type,
            field: 'name',
            message: `${type} må ha et navn.`,
            docUrl: 'https://developers.google.com/search/docs/appearance/structured-data/logo'
          });
        }
        if (!entity.url) {
          results.push({
            type: 'error',
            entityType: type,
            field: 'url',
            message: `${type} bør ha en hoved-URL.`,
            docUrl: 'https://developers.google.com/search/docs/appearance/structured-data/logo'
          });
        }
        if (!entity.logo && type === 'Organization') {
          results.push({
            type: 'warning',
            entityType: type,
            field: 'logo',
            message: 'Anbefalt: Legg til logo-URL for bedre synlighet i Knowledge Panel.',
            docUrl: 'https://developers.google.com/search/docs/appearance/structured-data/logo'
          });
        }
        
        // Strict LocalBusiness checks
        if (['LocalBusiness', 'Dentist', 'Restaurant', 'MedicalBusiness'].includes(type)) {
          if (!entity.address) {
            results.push({
              type: 'error',
              entityType: type,
              field: 'address',
              message: 'Google krever adresse for lokale bedrifter.',
              docUrl: 'https://developers.google.com/search/docs/appearance/structured-data/local-business'
            });
          }
          if (!entity.telephone) {
            results.push({
              type: 'error',
              entityType: type,
              field: 'telephone',
              message: 'Google krever telefonnummer for lokale bedrifter.',
              docUrl: 'https://developers.google.com/search/docs/appearance/structured-data/local-business'
            });
          }
          if (!entity.image) {
            results.push({
              type: 'error',
              entityType: type,
              field: 'image',
              message: 'Google krever minst ett bilde for lokale bedrifter.',
              docUrl: 'https://developers.google.com/search/docs/appearance/structured-data/local-business'
            });
          }
        }
        break;

      case 'Person':
        if (!entity.name) {
          results.push({
            type: 'error',
            entityType: type,
            field: 'name',
            message: 'Person må ha et navn.',
            docUrl: 'https://schema.org/Person'
          });
        }
        if (!entity.jobTitle) {
          results.push({
            type: 'warning',
            entityType: type,
            field: 'jobTitle',
            message: 'Anbefalt: Legg til jobbtittel for personen.',
            docUrl: 'https://schema.org/jobTitle'
          });
        }
        break;

      case 'Article':
      case 'NewsArticle':
      case 'BlogPosting':
        if (!entity.headline) {
          results.push({
            type: 'error',
            entityType: type,
            field: 'headline',
            message: 'Artikler må ha en headline.',
            docUrl: 'https://developers.google.com/search/docs/appearance/structured-data/article'
          });
        }
        if (!entity.image) {
          results.push({
            type: 'error',
            entityType: type,
            field: 'image',
            message: 'Google krever minst ett bilde for artikler.',
            docUrl: 'https://developers.google.com/search/docs/appearance/structured-data/article'
          });
        }
        if (!entity.author) {
          results.push({
            type: 'error',
            entityType: type,
            field: 'author',
            message: 'Author mangler. Google krever person eller organisasjon som forfatter.',
            docUrl: 'https://developers.google.com/search/docs/appearance/structured-data/article'
          });
        }
        if (!entity.datePublished) {
          results.push({
            type: 'error',
            entityType: type,
            field: 'datePublished',
            message: 'Google krever datePublished for artikler.',
            docUrl: 'https://developers.google.com/search/docs/appearance/structured-data/article'
          });
        }
        break;

      case 'FAQPage':
        if (!entity.mainEntity || !Array.isArray(entity.mainEntity) || entity.mainEntity.length === 0) {
          results.push({
            type: 'error',
            entityType: type,
            field: 'mainEntity',
            message: 'En FAQ-side må inneholde minst ett Question-objekt i mainEntity.',
            docUrl: 'https://developers.google.com/search/docs/appearance/structured-data/faqpage'
          });
        }
        break;

      case 'Service':
        if (!entity.name) {
          results.push({
            type: 'error',
            entityType: type,
            field: 'name',
            message: 'Tjenester må ha et navn.',
            docUrl: 'https://schema.org/Service'
          });
        }
        if (!entity.provider) {
          results.push({
            type: 'warning',
            entityType: type,
            field: 'provider',
            message: 'Anbefalt: Angi hvem som leverer tjenesten (publisher/provider).',
            docUrl: 'https://schema.org/provider'
          });
        }
        break;
    }
  });

  return results;
}

export function getCoreTypes() {
  return DEFAULT_TYPES;
}
