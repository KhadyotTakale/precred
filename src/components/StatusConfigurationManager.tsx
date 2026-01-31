import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, X, Loader2, Save, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { adminAPI } from '@/lib/admin-api';

// Default statuses that cannot be deleted (per item type)
export const DEFAULT_STATUSES: Record<string, string[]> = {
  Application: ['new', 'applied', 'pending', 'approved', 'rejected'],
  Vendors: ['new', 'applied', 'pending', 'approved', 'rejected'],
  Event: ['draft', 'published', 'cancelled', 'completed'],
  Classes: ['draft', 'published', 'cancelled', 'completed'],
  Blog: ['draft', 'published', 'archived'],
  Newsletter: ['draft', 'published', 'archived'],
  Raffle: ['draft', 'active', 'completed', 'cancelled'],
  Campaign: ['draft', 'active', 'paused', 'completed'],
  Membership: ['pending', 'active', 'expired', 'cancelled'],
};

// Additional filter-only statuses (not assignable but used for filtering)
export const FILTER_ONLY_STATUSES: Record<string, string[]> = {
  Application: ['under_review', 'waitlisted'],
  Vendors: ['under_review', 'waitlisted'],
};

// Item types that support custom statuses
const CONFIGURABLE_ITEM_TYPES = [
  { value: 'Application', label: 'Applications' },
  { value: 'Vendors', label: 'Vendor Applications' },
  { value: 'Event', label: 'Events' },
  { value: 'Classes', label: 'Classes' },
  { value: 'Blog', label: 'Blogs' },
  { value: 'Newsletter', label: 'Newsletters' },
  { value: 'Raffle', label: 'Raffles' },
  { value: 'Campaign', label: 'Campaigns' },
  { value: 'Membership', label: 'Memberships' },
];

// Type for the custom statuses configuration
export interface CustomStatusesConfig {
  [itemType: string]: string[];
}

interface StatusConfigurationManagerProps {
  disabled?: boolean;
}

export function StatusConfigurationManager({ disabled = false }: StatusConfigurationManagerProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [customStatuses, setCustomStatuses] = useState<CustomStatusesConfig>({});
  const [originalCustomStatuses, setOriginalCustomStatuses] = useState<CustomStatusesConfig>({});
  const [activeItemType, setActiveItemType] = useState('Application');
  const [newStatus, setNewStatus] = useState('');
  const [statusToDelete, setStatusToDelete] = useState<{ itemType: string; status: string } | null>(null);

  // Load custom statuses from shop_info on mount
  useEffect(() => {
    const loadCustomStatuses = async () => {
      if (!user?.id) return;
      
      try {
        setIsLoading(true);
        const shopData = await adminAPI.getShop(user.id);
        const savedStatuses = shopData._shop_info?.shops_settings?.custom_statuses_config;
        
        if (savedStatuses && typeof savedStatuses === 'object') {
          setCustomStatuses(savedStatuses);
          setOriginalCustomStatuses(savedStatuses);
        }
        
        // Migrate old custom_application_statuses if present
        const oldApplicationStatuses = shopData._shop_info?.shops_settings?.custom_application_statuses;
        if (oldApplicationStatuses && Array.isArray(oldApplicationStatuses) && !savedStatuses?.Application) {
          const migrated = { ...savedStatuses, Application: oldApplicationStatuses };
          setCustomStatuses(migrated);
          setOriginalCustomStatuses(migrated);
        }
      } catch (error) {
        console.error('Failed to load custom statuses:', error);
        toast({
          title: 'Error',
          description: 'Failed to load status configuration',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomStatuses();
  }, [user?.id, toast]);

  // Track changes
  useEffect(() => {
    const changed = JSON.stringify(customStatuses) !== JSON.stringify(originalCustomStatuses);
    setHasChanges(changed);
  }, [customStatuses, originalCustomStatuses]);

  const handleAddStatus = () => {
    const trimmedStatus = newStatus.trim().toLowerCase().replace(/\s+/g, '_');
    
    if (!trimmedStatus) {
      toast({
        title: 'Error',
        description: 'Please enter a status name',
        variant: 'destructive',
      });
      return;
    }

    const defaultsForType = DEFAULT_STATUSES[activeItemType] || [];
    const filterOnlyForType = FILTER_ONLY_STATUSES[activeItemType] || [];
    const existingCustom = customStatuses[activeItemType] || [];

    if (defaultsForType.includes(trimmedStatus) || filterOnlyForType.includes(trimmedStatus) || existingCustom.includes(trimmedStatus)) {
      toast({
        title: 'Error',
        description: 'This status already exists',
        variant: 'destructive',
      });
      return;
    }

    // Validate status name (alphanumeric and underscores only)
    if (!/^[a-z0-9_]+$/.test(trimmedStatus)) {
      toast({
        title: 'Error',
        description: 'Status name can only contain letters, numbers, and underscores',
        variant: 'destructive',
      });
      return;
    }

    setCustomStatuses(prev => ({
      ...prev,
      [activeItemType]: [...(prev[activeItemType] || []), trimmedStatus],
    }));
    setNewStatus('');
  };

  const handleDeleteStatus = (itemType: string, status: string) => {
    setCustomStatuses(prev => ({
      ...prev,
      [itemType]: (prev[itemType] || []).filter(s => s !== status),
    }));
    setStatusToDelete(null);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    
    try {
      setIsSaving(true);
      await adminAPI.updateShopInfo(user.id, {
        custom_statuses_config: customStatuses,
      });
      setOriginalCustomStatuses(customStatuses);
      setHasChanges(false);
      toast({
        title: 'Saved',
        description: 'Status configuration has been saved',
      });
    } catch (error) {
      console.error('Failed to save custom statuses:', error);
      toast({
        title: 'Error',
        description: 'Failed to save status configuration',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setCustomStatuses(originalCustomStatuses);
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Status Configuration</CardTitle>
            <CardDescription>
              Manage custom statuses for different item types. Default statuses cannot be removed.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {hasChanges && (
              <Button variant="outline" size="sm" onClick={handleReset} disabled={isSaving}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={!hasChanges || isSaving || disabled}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeItemType} onValueChange={setActiveItemType}>
          <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
            {CONFIGURABLE_ITEM_TYPES.map(type => (
              <TabsTrigger key={type.value} value={type.value} className="text-xs sm:text-sm">
                {type.label}
                {(customStatuses[type.value]?.length ?? 0) > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-xs px-1.5">
                    {customStatuses[type.value]?.length}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {CONFIGURABLE_ITEM_TYPES.map(type => (
            <TabsContent key={type.value} value={type.value} className="space-y-4">
              {/* Default Statuses */}
              <div>
                <Label className="text-sm font-medium">Default Statuses</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(DEFAULT_STATUSES[type.value] || []).map(status => (
                    <Badge key={status} variant="secondary">
                      {formatStatusLabel(status)}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Filter-only Statuses (if any) */}
              {FILTER_ONLY_STATUSES[type.value]?.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Filter-Only Statuses</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {FILTER_ONLY_STATUSES[type.value].map(status => (
                      <Badge key={status} variant="outline" className="text-muted-foreground">
                        {formatStatusLabel(status)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Statuses */}
              <div>
                <Label className="text-sm font-medium">Custom Statuses</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(customStatuses[type.value] || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No custom statuses added</p>
                  ) : (
                    (customStatuses[type.value] || []).map(status => (
                      <Badge key={status} variant="outline" className="pr-1">
                        {formatStatusLabel(status)}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                          onClick={() => setStatusToDelete({ itemType: type.value, status })}
                          disabled={disabled}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              {/* Add New Status */}
              <div className="space-y-2 pt-2 border-t">
                <Label htmlFor="new-status">Add New Status</Label>
                <div className="flex gap-2">
                  <Input
                    id="new-status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    placeholder="e.g., Duplicate, Waitlist"
                    disabled={disabled}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddStatus();
                      }
                    }}
                  />
                  <Button onClick={handleAddStatus} size="icon" disabled={disabled}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Status will be converted to lowercase with underscores (e.g., "Under Review" → "under_review")
                </p>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>

      {/* Delete Confirmation */}
      <AlertDialog open={!!statusToDelete} onOpenChange={() => setStatusToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Status?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{statusToDelete ? formatStatusLabel(statusToDelete.status) : ''}"? 
              Items with this status will keep their current status value.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => statusToDelete && handleDeleteStatus(statusToDelete.itemType, statusToDelete.status)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// Helper to format status label for display
export function formatStatusLabel(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Helper to get all available statuses for a specific item type (default + custom)
export function getAllStatusesForType(itemType: string, customStatusesConfig: CustomStatusesConfig = {}): string[] {
  const defaults = DEFAULT_STATUSES[itemType] || [];
  const custom = customStatusesConfig[itemType] || [];
  return [...defaults, ...custom];
}

// Helper to get all filter statuses for a specific item type (includes filter-only)
export function getFilterStatusesForType(itemType: string, customStatusesConfig: CustomStatusesConfig = {}): string[] {
  const defaults = DEFAULT_STATUSES[itemType] || [];
  const filterOnly = FILTER_ONLY_STATUSES[itemType] || [];
  const custom = customStatusesConfig[itemType] || [];
  return [...defaults, ...filterOnly, ...custom];
}

// Backward compatibility - get application statuses from config
export function getApplicationStatuses(customStatusesConfig: CustomStatusesConfig = {}): string[] {
  return getAllStatusesForType('Application', customStatusesConfig);
}
