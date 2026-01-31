import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { 
  Check, ChevronsUpDown, X, User, Mail, Phone, MapPin, MessageSquare, 
  Tag, FileText, DollarSign, Hash, Globe, ExternalLink, Calendar, 
  Info, Image as ImageIcon, Bookmark, Type
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getThumbnailImage } from "@/lib/image-utils";
import { STATIC_TEXT_PREFIX } from "@/lib/email-utils";

export interface MappingField {
  key: string;
  label: string;
  category: string;
  icon?: string;
  imageUrl?: string;
}

// Re-export for backwards compatibility
export { STATIC_TEXT_PREFIX } from "@/lib/email-utils";

interface FieldMappingPickerProps {
  templateKey: string;
  value: string;
  groupedFields: Record<string, MappingField[]>;
  onValueChange: (value: string) => void;
  previewValue?: string;
}

// Helper to get icon component for a field
const getFieldIcon = (iconKey?: string) => {
  switch (iconKey) {
    case 'user': return User;
    case 'mail': return Mail;
    case 'phone': return Phone;
    case 'mappin': return MapPin;
    case 'message': return MessageSquare;
    case 'tag': return Tag;
    case 'filetext': return FileText;
    case 'dollar': return DollarSign;
    case 'hash': return Hash;
    case 'globe': return Globe;
    case 'link': return ExternalLink;
    case 'calendar': return Calendar;
    case 'info': return Info;
    case 'image': return ImageIcon;
    case 'bookmark': return Bookmark;
    case 'folder': return Bookmark; // Use bookmark for nested objects
    case 'list': return FileText; // Use filetext for arrays
    default: return Info;
  }
};

// Get category icon
const getCategoryIcon = (category: string) => {
  const lowerCat = category.toLowerCase();
  if (lowerCat.includes('lead')) return User;
  if (lowerCat.includes('campaign details')) return FileText;
  if (lowerCat.includes('campaign link')) return ExternalLink;
  if (lowerCat.includes('campaign')) return Tag;
  if (lowerCat.includes('image')) return ImageIcon;
  if (lowerCat.includes('event') || lowerCat.includes('class')) return Calendar;
  return Bookmark;
};

// Priority order for categories (supports nested categories with →)
const getCategoryOrder = (category: string): number => {
  const lowerCat = category.toLowerCase();
  if (lowerCat === 'lead info') return 0;
  if (lowerCat === 'campaign') return 1;
  if (lowerCat === 'campaign links') return 2;
  if (lowerCat === 'campaign details') return 3;
  if (lowerCat.startsWith('campaign details →')) return 4; // Nested campaign details
  if (lowerCat.includes('image')) return 100; // Images at the end
  // Sort nested categories after their parent
  if (lowerCat.includes('→')) {
    const parentCategory = lowerCat.split('→')[0].trim();
    return getCategoryOrder(parentCategory) + 0.5;
  }
  return 50; // Related items in the middle
};

export function FieldMappingPicker({ 
  templateKey, 
  value, 
  groupedFields, 
  onValueChange,
  previewValue 
}: FieldMappingPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showStaticInput, setShowStaticInput] = useState(false);
  const [staticText, setStaticText] = useState(() => 
    value?.startsWith(STATIC_TEXT_PREFIX) ? value.slice(STATIC_TEXT_PREFIX.length) : ''
  );

  // Check if current value is static text
  const isStaticValue = value?.startsWith(STATIC_TEXT_PREFIX);
  const staticDisplayValue = isStaticValue ? value.slice(STATIC_TEXT_PREFIX.length) : '';

  // Find the currently selected field
  const allFields = Object.values(groupedFields).flat();
  const selectedField = !isStaticValue ? allFields.find(f => f.key === value) : null;

  // Sort categories by priority
  const sortedCategories = Object.keys(groupedFields).sort((a, b) => {
    return getCategoryOrder(a) - getCategoryOrder(b);
  });

  // Filter fields based on search
  const filteredGroups = sortedCategories.reduce((acc, category) => {
    const fields = groupedFields[category];
    if (!searchQuery) {
      acc[category] = fields;
    } else {
      const filtered = fields.filter(f => 
        f.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[category] = filtered;
      }
    }
    return acc;
  }, {} as Record<string, MappingField[]>);

  const hasResults = Object.keys(filteredGroups).length > 0;

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        setShowStaticInput(false);
      }
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-auto min-h-[40px] py-2",
            !value && "text-muted-foreground"
          )}
        >
          {isStaticValue ? (
            <div className="flex items-center gap-2 text-left min-w-0">
              <Type className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="font-medium truncate">"{staticDisplayValue}"</span>
                <span className="text-xs text-muted-foreground truncate">Static Text</span>
              </div>
            </div>
          ) : selectedField ? (
            <div className="flex items-center gap-2 text-left min-w-0">
              {selectedField.imageUrl ? (
                <img 
                  src={getThumbnailImage(selectedField.imageUrl, 'small')} 
                  alt={selectedField.label}
                  className="h-5 w-5 rounded object-cover border border-border flex-shrink-0"
                />
              ) : (
                (() => {
                  const IconComponent = getFieldIcon(selectedField.icon);
                  return <IconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
                })()
              )}
              <div className="flex flex-col min-w-0">
                <span className="font-medium truncate">{selectedField.label}</span>
                <span className="text-xs text-muted-foreground truncate">{selectedField.category}</span>
              </div>
            </div>
          ) : (
            <span>Select field...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command shouldFilter={false}>
          {!showStaticInput && (
            <CommandInput 
              placeholder="Search fields..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
          )}
          <CommandList>
            {showStaticInput ? (
              <div className="p-3 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Type className="h-4 w-4" />
                  <span>Enter Static Text</span>
                </div>
                <Input
                  placeholder="Enter static text value..."
                  value={staticText}
                  onChange={(e) => setStaticText(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowStaticInput(false);
                      setStaticText(staticDisplayValue);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      if (staticText.trim()) {
                        onValueChange(STATIC_TEXT_PREFIX + staticText.trim());
                      }
                      setOpen(false);
                      setShowStaticInput(false);
                    }}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <CommandEmpty>No field found.</CommandEmpty>
                
                {/* Static text option */}
                <CommandItem
                  value="__static_text__"
                  onSelect={() => {
                    setShowStaticInput(true);
                    setStaticText(staticDisplayValue);
                  }}
                  className="flex items-center gap-2 text-primary"
                >
                  <Type className="h-4 w-4" />
                  <span>Enter static text...</span>
                </CommandItem>
                
                {/* Clear option */}
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onValueChange('');
                    setOpen(false);
                    setSearchQuery("");
                    setStaticText('');
                  }}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                  <span>Clear mapping</span>
                </CommandItem>
                
                <CommandSeparator />
            
            <ScrollArea className="h-[350px]">
              {Object.entries(filteredGroups).map(([category, fields], idx) => {
                const CategoryIcon = getCategoryIcon(category);
                return (
                  <CommandGroup 
                    key={category} 
                    heading={
                      <div className="flex items-center gap-2">
                        <CategoryIcon className="h-3.5 w-3.5" />
                        <span>{category}</span>
                        <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                          {fields.length}
                        </Badge>
                      </div>
                    }
                  >
                    {fields.map((field) => {
                      const IconComponent = getFieldIcon(field.icon);
                      const isSelected = value === field.key;
                      
                      return (
                        <CommandItem
                          key={field.key}
                          value={field.key}
                          onSelect={() => {
                            onValueChange(field.key);
                            setOpen(false);
                            setSearchQuery("");
                          }}
                          className="flex items-center gap-2 py-2"
                        >
                          <Check
                            className={cn(
                              "h-4 w-4 flex-shrink-0",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {field.imageUrl ? (
                            <img 
                              src={getThumbnailImage(field.imageUrl, 'small')} 
                              alt={field.label}
                              className="h-6 w-6 rounded object-cover border border-border flex-shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <IconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className="truncate">{field.label}</span>
                        </CommandItem>
                      );
                    })}
                    </CommandGroup>
                  );
                })}
              </ScrollArea>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}