import { adminAPI, type Item } from './admin-api';

export interface ClassCSVRow {
  title: string;
  description: string;
  slug: string;
  tags: string;
  SEO_Tags: string;
  name: string;
  educationalLevel: string;
  duration: string;
  startDate: string;
  endDate: string;
  capacity: string;
  location: string;
  registrationUrl: string;
  instructorName: string;
  instructorEmail: string;
}

export class CSVUtils {
  /**
   * Parse CSV text into an array of objects
   */
  static parseCSV(csvText: string): ClassCSVRow[] {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must have a header row and at least one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const rows: ClassCSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      rows.push(row as ClassCSVRow);
    }

    return rows;
  }

  /**
   * Parse a single CSV line, handling quoted values with commas
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  /**
   * Convert CSV row to Item API format
   */
  static csvRowToItemData(row: ClassCSVRow) {
    return {
      item_type: 'Classes',
      Is_disabled: false,
      title: row.title,
      description: row.description,
      slug: row.slug || this.generateSlug(row.title),
      tags: row.tags || '',
      SEO_Tags: row.SEO_Tags || '',
      item_info: {
        '@context': 'https://schema.org',
        '@type': 'EducationEvent',
        name: row.name || row.title,
        educationalLevel: row.educationalLevel || 'Beginner',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        eventStatus: 'https://schema.org/EventScheduled',
        location: {
          '@type': 'Place',
          name: row.location || 'TBD',
          address: row.location || 'TBD'
        },
        startDate: row.startDate || new Date().toISOString().split('T')[0],
        endDate: row.endDate || new Date().toISOString().split('T')[0],
        duration: row.duration || 'PT2H',
        maximumAttendeeCapacity: row.capacity || '20',
        offers: {
          '@type': 'Offer',
          url: row.registrationUrl || '#',
          availability: 'https://schema.org/InStock'
        },
        organizer: {
          '@type': 'Organization',
          name: 'Tampa Bay Rock and Mineral Society'
        },
        performer: {
          '@type': 'Person',
          name: row.instructorName || 'Instructor',
          email: row.instructorEmail || ''
        }
      }
    };
  }

  /**
   * Generate slug from title
   */
  private static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Convert items to CSV format
   */
  static itemsToCSV(items: Item[]): string {
    const headers = [
      'title',
      'description',
      'slug',
      'tags',
      'SEO_Tags',
      'name',
      'educationalLevel',
      'duration',
      'startDate',
      'endDate',
      'capacity',
      'location',
      'registrationUrl',
      'instructorName',
      'instructorEmail'
    ];

    const rows = items.map(item => {
      const info = item.item_info || {};
      const location = typeof info.location === 'object' ? info.location.name : info.location;
      const performer = info.performer || {};
      
      return [
        this.escapeCSV(item.title),
        this.escapeCSV(item.description),
        this.escapeCSV(item.slug),
        this.escapeCSV(item.tags || ''),
        this.escapeCSV(item.SEO_Tags || ''),
        this.escapeCSV(info.name || item.title),
        this.escapeCSV(info.educationalLevel || 'Beginner'),
        this.escapeCSV(info.duration || 'PT2H'),
        this.escapeCSV(info.startDate || ''),
        this.escapeCSV(info.endDate || ''),
        this.escapeCSV(info.maximumAttendeeCapacity?.toString() || '20'),
        this.escapeCSV(location || ''),
        this.escapeCSV(info.offers?.url || '#'),
        this.escapeCSV(performer.name || ''),
        this.escapeCSV(performer.email || '')
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Escape CSV value (wrap in quotes if contains comma, quote, or newline)
   */
  private static escapeCSV(value: string): string {
    if (!value) return '';
    
    const stringValue = value.toString();
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  }

  /**
   * Download CSV file
   */
  static downloadCSV(filename: string, csvContent: string) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Convert items to raw CSV format with all database columns
   */
  static itemsToRawCSV(items: Item[]): string {
    const headers = [
      'id',
      'slug',
      'shops_id',
      'item_type',
      'Is_disabled',
      'title',
      'description',
      'SEO_Tags',
      'tags',
      'price',
      'unit',
      'currency',
      'sku',
      'item_info',
      'rank',
      'min_quantity'
    ];

    const rows = items.map(item => {
      return [
        this.escapeCSV(item.id?.toString() || ''),
        this.escapeCSV(item.slug || ''),
        this.escapeCSV(item.shops_id || ''),
        this.escapeCSV(item.item_type || ''),
        this.escapeCSV(item.Is_disabled?.toString() || 'false'),
        this.escapeCSV(item.title || ''),
        this.escapeCSV(item.description || ''),
        this.escapeCSV(item.SEO_Tags || ''),
        this.escapeCSV(item.tags || ''),
        this.escapeCSV(item.price?.toString() || '0'),
        this.escapeCSV(item.unit || ''),
        this.escapeCSV(item.currency || ''),
        this.escapeCSV(item.sku || ''),
        this.escapeCSV(JSON.stringify(item.item_info || {})),
        this.escapeCSV(item.rank?.toString() || '1'),
        this.escapeCSV(item.min_quantity?.toString() || '0')
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Fetch all classes with pagination
   */
  static async fetchAllClasses(clerkUserId: string): Promise<Item[]> {
    const allClasses: Item[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await adminAPI.getItems(clerkUserId, page, 100, 'Classes');
      allClasses.push(...response.items);
      
      hasMore = response.nextPage !== null;
      page++;
    }

    return allClasses;
  }
}
