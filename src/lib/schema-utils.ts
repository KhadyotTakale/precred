/**
 * Schema.org structured data utilities for SEO
 * Provides reusable schema builders for different content types
 */

interface SchemaOrganization {
  name: string;
  url?: string;
  logo?: string;
}

interface SchemaLocation {
  name: string;
  address?: string;
}

interface SchemaOffer {
  price: number | string;
  priceCurrency?: string;
  availability?: string;
  url?: string;
}

interface SchemaPerson {
  name: string;
  image?: string;
  jobTitle?: string;
  url?: string;
}

// Base schema with context
const createBaseSchema = (type: string) => ({
  "@context": "https://schema.org",
  "@type": type,
});

// Clean undefined values from schema objects
export const cleanSchema = <T extends Record<string, any>>(obj: T): T => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined && v !== null && v !== '')
  ) as T;
};

// Organization schema helper
export const createOrganizationSchema = (org: SchemaOrganization) => cleanSchema({
  "@type": "Organization",
  name: org.name,
  url: org.url,
  logo: org.logo ? {
    "@type": "ImageObject",
    url: org.logo,
  } : undefined,
});

// Default publisher for the site
export const getDefaultPublisher = () => ({
  "@type": "Organization",
  name: "Tampa Bay Minerals & Science Club",
  logo: {
    "@type": "ImageObject",
    url: `${window.location.origin}/favicon.png`,
    width: 512,
    height: 512,
  },
});

// Blog posting schema
export interface BlogPostingSchemaProps {
  headline: string;
  description: string;
  image?: string;
  author: SchemaPerson;
  datePublished?: string;
  dateModified?: string;
  keywords?: string[];
  articleSection?: string;
  wordCount?: number;
  url: string;
}

export const createBlogPostingSchema = (props: BlogPostingSchemaProps) => cleanSchema({
  ...createBaseSchema("BlogPosting"),
  headline: props.headline,
  description: props.description,
  image: props.image ? {
    "@type": "ImageObject",
    url: props.image.startsWith('http') ? props.image : `${window.location.origin}${props.image}`,
    width: 1200,
    height: 630,
  } : undefined,
  author: cleanSchema({
    "@type": "Person",
    name: props.author.name,
    image: props.author.image,
    url: props.author.url,
  }),
  datePublished: props.datePublished,
  dateModified: props.dateModified || props.datePublished,
  publisher: getDefaultPublisher(),
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": props.url,
  },
  url: props.url,
  keywords: props.keywords?.join(', '),
  articleSection: props.articleSection,
  wordCount: props.wordCount,
  inLanguage: "en-US",
});

// Event schema
export interface EventSchemaProps {
  name: string;
  description: string;
  startDate?: string;
  endDate?: string;
  eventStatus?: 'EventScheduled' | 'EventCancelled' | 'EventPostponed';
  location?: SchemaLocation;
  image?: string[];
  organizer?: SchemaOrganization;
  performer?: SchemaPerson;
  offers?: SchemaOffer;
  url: string;
}

export const createEventSchema = (props: EventSchemaProps) => cleanSchema({
  ...createBaseSchema("Event"),
  name: props.name,
  description: props.description,
  startDate: props.startDate,
  endDate: props.endDate,
  eventStatus: props.eventStatus ? `https://schema.org/${props.eventStatus}` : "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  location: props.location ? cleanSchema({
    "@type": "Place",
    name: props.location.name,
    address: props.location.address,
  }) : undefined,
  image: props.image,
  organizer: props.organizer ? createOrganizationSchema(props.organizer) : undefined,
  performer: props.performer ? cleanSchema({
    "@type": "Person",
    name: props.performer.name,
  }) : undefined,
  offers: props.offers ? cleanSchema({
    "@type": "Offer",
    price: props.offers.price,
    priceCurrency: props.offers.priceCurrency || "USD",
    availability: props.offers.availability || "https://schema.org/InStock",
    url: props.offers.url,
  }) : undefined,
  url: props.url,
});

// Education Event schema (for classes)
export interface EducationEventSchemaProps extends EventSchemaProps {
  instructor?: SchemaPerson;
  educationalLevel?: string;
  teaches?: string;
  duration?: string;
  maximumAttendeeCapacity?: number;
}

export const createEducationEventSchema = (props: EducationEventSchemaProps) => cleanSchema({
  ...createBaseSchema("EducationEvent"),
  name: props.name,
  description: props.description,
  startDate: props.startDate,
  endDate: props.endDate,
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  location: props.location ? cleanSchema({
    "@type": "Place",
    name: props.location.name,
    address: props.location.address,
  }) : undefined,
  image: props.image,
  organizer: props.organizer ? createOrganizationSchema(props.organizer) : undefined,
  instructor: props.instructor ? cleanSchema({
    "@type": "Person",
    name: props.instructor.name,
    jobTitle: props.instructor.jobTitle,
  }) : undefined,
  educationalLevel: props.educationalLevel,
  teaches: props.teaches,
  duration: props.duration,
  maximumAttendeeCapacity: props.maximumAttendeeCapacity,
  offers: props.offers ? cleanSchema({
    "@type": "Offer",
    price: props.offers.price,
    priceCurrency: props.offers.priceCurrency || "USD",
    availability: "https://schema.org/InStock",
    url: props.offers.url,
  }) : undefined,
  url: props.url,
});

// Breadcrumb schema
export interface BreadcrumbItem {
  name: string;
  url: string;
}

export const createBreadcrumbSchema = (items: BreadcrumbItem[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
});

// ItemList schema for listing pages
export interface ItemListSchemaProps {
  name: string;
  description: string;
  url: string;
  items: {
    name: string;
    url: string;
    image?: string;
    description?: string;
  }[];
}

export const createItemListSchema = (props: ItemListSchemaProps) => cleanSchema({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: props.name,
  description: props.description,
  url: props.url,
  numberOfItems: props.items.length,
  itemListElement: props.items.map((item, index) => cleanSchema({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    url: item.url,
    image: item.image,
    description: item.description,
  })),
});

// CollectionPage schema for listing pages
export interface CollectionPageSchemaProps {
  name: string;
  description: string;
  url: string;
  image?: string;
}

export const createCollectionPageSchema = (props: CollectionPageSchemaProps) => cleanSchema({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: props.name,
  description: props.description,
  url: props.url,
  image: props.image,
  publisher: getDefaultPublisher(),
  mainEntity: {
    "@type": "ItemList",
    numberOfItems: 0, // Will be updated when items are loaded
  },
});

// WebPage schema
export interface WebPageSchemaProps {
  name: string;
  description: string;
  url: string;
  image?: string;
}

export const createWebPageSchema = (props: WebPageSchemaProps) => cleanSchema({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: props.name,
  description: props.description,
  url: props.url,
  image: props.image,
  publisher: getDefaultPublisher(),
  inLanguage: "en-US",
});

// Helper component for rendering schema in Helmet
export const renderSchemaScript = (schema: object) => 
  JSON.stringify(cleanSchema(schema as Record<string, any>));
