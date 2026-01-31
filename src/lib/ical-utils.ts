// Utility functions for generating iCal (.ics) format for calendar events

interface CalendarItem {
  id: number;
  title: string;
  description?: string;
  item_info?: {
    startDate?: string;
    endDate?: string;
    location?: {
      name?: string;
      address?: {
        streetAddress?: string;
        addressLocality?: string;
        addressRegion?: string;
        postalCode?: string;
      };
    };
  };
  slug: string;
  item_type: string;
}

function formatDateForICal(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function generateICalEvent(item: CalendarItem, baseUrl: string): string {
  const startDate = item.item_info?.startDate || new Date().toISOString();
  const endDate = item.item_info?.endDate || startDate;
  
  let location = '';
  if (item.item_info?.location) {
    const loc = item.item_info.location;
    const parts = [
      loc.name,
      loc.address?.streetAddress,
      loc.address?.addressLocality,
      loc.address?.addressRegion,
      loc.address?.postalCode,
    ].filter(Boolean);
    location = parts.join(', ');
  }

  const description = item.description || '';
  const url = `${baseUrl}/${item.item_type.toLowerCase()}s/${item.slug}`;

  return [
    'BEGIN:VEVENT',
    `UID:${item.id}@elegant-calendar`,
    `DTSTAMP:${formatDateForICal(new Date().toISOString())}`,
    `DTSTART:${formatDateForICal(startDate)}`,
    `DTEND:${formatDateForICal(endDate)}`,
    `SUMMARY:${escapeICalText(item.title)}`,
    description ? `DESCRIPTION:${escapeICalText(description)}` : '',
    location ? `LOCATION:${escapeICalText(location)}` : '',
    `URL:${url}`,
    'END:VEVENT',
  ].filter(Boolean).join('\r\n');
}

export function generateICalFile(items: CalendarItem[], baseUrl: string): string {
  const events = items.map(item => generateICalEvent(item, baseUrl)).join('\r\n');
  
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Elegant Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    events,
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadICalFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export function exportSingleItem(item: CalendarItem, baseUrl: string): void {
  const icalContent = generateICalFile([item], baseUrl);
  const filename = `${item.slug || 'event'}.ics`;
  downloadICalFile(icalContent, filename);
}

export function exportMultipleItems(items: CalendarItem[], baseUrl: string): void {
  const icalContent = generateICalFile(items, baseUrl);
  const filename = `calendar-export-${new Date().toISOString().split('T')[0]}.ics`;
  downloadICalFile(icalContent, filename);
}
