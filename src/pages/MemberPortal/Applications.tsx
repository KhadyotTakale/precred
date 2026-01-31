import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/clerk-react";
import { useSearchParams } from "react-router-dom";
import { elegantAPI } from "@/lib/elegant-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Calendar, ChevronLeft, ChevronRight, Search, X, Eye, Loader2, Trash2, Receipt, Download, CheckSquare, CreditCard } from "lucide-react";
import { MemberPaymentDialog } from "@/components/MemberPaymentDialog";
import { ApplicationPrintPreview } from "@/components/ApplicationPrintPreview";
import { PaymentReceiptView } from "@/components/PaymentReceiptView";
import { toast } from "sonner";

interface BookingItemData {
  id: number;
  created_at: number;
  items_id: number;
  quantity: number;
  price: number;
  unit: string;
  items_type: string;
  _items?: {
    title: string;
  };
}

interface BookingPaymentData {
  id: number;
  payment_id?: string;
  paid_amount: number;
  payment_status: string;
  payment_method: string;
}

interface ApplicationItem {
  id: number;
  created_at: number;
  booking_slug: string;
  booking_type: string;
  status: string;
  payment_status?: string | Record<string, unknown> | null;
  checkout_type?: string;
  booking_info: Record<string, unknown> | null;
  _leads?: {
    name: string;
    email: string;
  };
  _booking_items?: {
    items: BookingItemData[];
    itemsReceived: number;
  };
  _booking_payments?: BookingPaymentData[];
}

// Helper to extract payment_status from string or JSON object
const extractPaymentStatus = (val: any): string => {
  if (typeof val === 'string' && val) return val;
  if (val && typeof val === 'object') {
    if (typeof val.status === 'string') return val.status;
    if (typeof val.payment_status === 'string') return val.payment_status;
    if (typeof val.state === 'string') return val.state;
    try { return JSON.stringify(val); } catch { return ''; }
  }
  return '';
};

interface ApplicationsResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  itemsTotal: number;
  pageTotal: number;
  items: ApplicationItem[];
}

const FILTER_CACHE_KEY = 'member_applications_filters';
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100, 250, 500, 1000];

const getDefaultFilters = () => ({
  booking_type: '',
  status: '',
  search: '',
  start_date: '',
  end_date: '',
  booking_slug: '',
  show_deleted: false,
  perPage: 5
});

const loadCachedFilters = () => {
  try {
    const cached = localStorage.getItem(FILTER_CACHE_KEY);
    if (cached) {
      return { ...getDefaultFilters(), ...JSON.parse(cached) };
    }
  } catch (e) {
    console.error('Error loading cached filters:', e);
  }
  return getDefaultFilters();
};

// CSV export helper
const escapeCSV = (value: any): string => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const exportApplicationsToCSV = (applications: ApplicationItem[]) => {
  const headers = ['ID', 'Booking Slug', 'Booking Type', 'Status', 'Payment Status', 'Created Date', 'Booking Info'];
  
  const rows = applications.map(app => [
    escapeCSV(app.id),
    escapeCSV(app.booking_slug),
    escapeCSV(app.booking_type),
    escapeCSV(app.status),
    escapeCSV(extractPaymentStatus(app.payment_status)),
    escapeCSV(new Date(app.created_at).toISOString()),
    escapeCSV(JSON.stringify(app.booking_info || {}))
  ].join(','));
  
  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `applications_export_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const Applications = () => {
  const { user } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    curPage: 1,
    pageTotal: 1,
    itemsTotal: 0
  });

  // Selection state for export
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  // Application details state
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Load filters from cache on mount, URL params take priority
  const [filters, setFilters] = useState(() => {
    const cached = loadCachedFilters();
    return {
      booking_type: searchParams.get('booking_type') || cached.booking_type,
      status: searchParams.get('status') || cached.status,
      search: searchParams.get('search') || cached.search,
      start_date: searchParams.get('start_date') || cached.start_date,
      end_date: searchParams.get('end_date') || cached.end_date,
      booking_slug: searchParams.get('booking_slug') || cached.booking_slug,
      show_deleted: searchParams.get('show_deleted') === 'true' || cached.show_deleted || false,
      perPage: parseInt(searchParams.get('perPage') || '') || cached.perPage || 5
    };
  });
  const [searchInput, setSearchInput] = useState(filters.search);

  // Persist filters to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(FILTER_CACHE_KEY, JSON.stringify(filters));
    } catch (e) {
      console.error('Error saving filters to cache:', e);
    }
  }, [filters]);

  useEffect(() => {
    const fetchApplications = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Build query params - include all parameters as required by Elegant UX API
        const page = parseInt(searchParams.get('page') || '1');
        const perPage = filters.perPage;
        
        const params = new URLSearchParams();
        params.append('booking_type', filters.booking_type || '');
        params.append('items_type', 'Application'); // Fixed to Application
        params.append('status', filters.status === 'all' ? '' : (filters.status || ''));
        params.append('search', filters.search || '');
        params.append('start_date', filters.start_date || '');
        params.append('end_date', filters.end_date || '');
        params.append('booking_slug', filters.booking_slug || '');
        params.append('is_deleted', filters.show_deleted ? 'true' : 'false');
        params.append('external', JSON.stringify({ page, perPage }));
        
        const response = await elegantAPI.get<ApplicationsResponse>(`/application?${params.toString()}`);
        
        setApplications(response.items || []);
        setPagination({
          curPage: response.curPage || 1,
          pageTotal: response.pageTotal || 1,
          itemsTotal: response.itemsTotal || 0
        });
        
        // Clear selections when data changes
        setSelectedIds(new Set());
      } catch (error) {
        console.error("Error fetching applications:", error);
        setApplications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [user, filters, searchParams]);

  const updateFilters = (key: string, value: string | boolean) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Update URL params
    const newParams = new URLSearchParams(searchParams);
    if (value !== '' && value !== false) {
      newParams.set(key, String(value));
    } else {
      newParams.delete(key);
    }
    newParams.delete('page'); // Reset to page 1 on filter change
    setSearchParams(newParams);
  };

  const handleSearch = () => {
    updateFilters('search', searchInput);
  };

  const clearFilters = () => {
    const defaultFilters = getDefaultFilters();
    setFilters(defaultFilters);
    setSearchInput('');
    setSelectedIds(new Set());
    setSearchParams({});
  };

  const clearFiltersAndCache = () => {
    try {
      localStorage.removeItem(FILTER_CACHE_KEY);
    } catch (e) {
      console.error('Error clearing filter cache:', e);
    }
    clearFilters();
  };

  const goToPage = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', String(page));
    setSearchParams(newParams);
  };

  // Selection handlers
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === applications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(applications.map(app => app.id)));
    }
  }, [applications, selectedIds.size]);

  const toggleSelection = useCallback((id: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleExportSelected = useCallback(() => {
    const selectedApps = applications.filter(app => selectedIds.has(app.id));
    if (selectedApps.length === 0) {
      toast.error('No applications selected for export');
      return;
    }
    
    setIsExporting(true);
    try {
      exportApplicationsToCSV(selectedApps);
      toast.success(`Exported ${selectedApps.length} application(s) to CSV`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export applications');
    } finally {
      setIsExporting(false);
    }
  }, [applications, selectedIds]);

  const handleExportAll = useCallback(() => {
    if (applications.length === 0) {
      toast.error('No applications to export');
      return;
    }
    
    setIsExporting(true);
    try {
      exportApplicationsToCSV(applications);
      toast.success(`Exported ${applications.length} application(s) to CSV`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export applications');
    } finally {
      setIsExporting(false);
    }
  }, [applications]);

  const handleViewApplication = async (app: ApplicationItem) => {
    if (!user?.id || !app.booking_slug) return;
    
    try {
      setLoadingDetails(true);
      setDetailsOpen(true);
      
      // Fetch full application details via GET /application/{booking_slug}
      const applicationDetails = await elegantAPI.getApplicationDetails(user.id, app.booking_slug) as any;
      
      // Transform data similar to Admin Dashboard handleViewApplication
      const bookingItems = applicationDetails._booking_items_of_bookings?.items || 
                          applicationDetails._booking_items?.items || [];
      const firstBookingItem = bookingItems[0];
      const bookingItemsInfo = firstBookingItem?.booking_items_info || {};
      const bookingInfo = applicationDetails.booking_info || {};
      
      // Get item info with form fields and wizard config from the first booking item
      const itemInfo = firstBookingItem?._items?.item_info || {};
      
      // Merge form data: booking_items_info takes priority, then booking_info
      const mergedFormData = {
        ...bookingInfo,
        ...bookingItemsInfo,
      };
      
      // Enrich the application with full details including _items for form structure
      const enrichedApplication = {
        ...applicationDetails,
        booking_info: mergedFormData,
        _booking_items_info: bookingItemsInfo,
        // Ensure _items is available with item_info for form fields and wizard config
        _items: firstBookingItem?._items || applicationDetails._items || {
          item_info: itemInfo,
          title: firstBookingItem?._items?.title || app.booking_slug,
        },
      };
      
      setSelectedApplication(enrichedApplication);
    } catch (error) {
      console.error("Error fetching application details:", error);
      setDetailsOpen(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedApplication(null);
  };

  const getStatusBadgeVariant = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'approved' || statusLower === 'accepted') return 'default';
    if (statusLower === 'pending' || statusLower === 'waiting') return 'secondary';
    if (statusLower === 'rejected' || statusLower === 'declined') return 'destructive';
    return 'outline';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Applications</h1>
        <p className="text-muted-foreground">View your submitted applications and their status</p>
      </div>

      {/* Application Details View */}
      {detailsOpen && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>Application Details</CardTitle>
              <CardDescription>
                {selectedApplication?.booking_slug || 'Loading...'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {selectedApplication && (selectedApplication.total_amount > 0 || selectedApplication.payment_status) && (
                <PaymentReceiptView
                  application={selectedApplication}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Receipt className="h-4 w-4 mr-2" />
                      View Receipt
                    </Button>
                  }
                />
              )}
              <Button variant="outline" onClick={handleCloseDetails}>
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingDetails ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading application details...</span>
              </div>
            ) : selectedApplication ? (
              <ApplicationPrintPreview
                application={selectedApplication}
                open={true}
                onOpenChange={() => {}}
                inline={true}
              />
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Failed to load application details
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Applications List */}
      {!detailsOpen && (
        <Card>
          <CardHeader>
            <CardTitle>Applications</CardTitle>
            <CardDescription>Track the status of your submitted applications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search applications..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1"
                  />
                  <Button variant="outline" size="icon" onClick={handleSearch}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Select value={filters.booking_type || 'all'} onValueChange={(v) => updateFilters('booking_type', v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Booking Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="membership">Membership</SelectItem>
                  <SelectItem value="volunteer">Volunteer</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.status || 'all'} onValueChange={(v) => updateFilters('status', v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Switch
                  id="show-deleted"
                  checked={filters.show_deleted}
                  onCheckedChange={(checked) => updateFilters('show_deleted', checked)}
                />
                <Label htmlFor="show-deleted" className="text-sm cursor-pointer flex items-center gap-1">
                  <Trash2 className="h-3 w-3" />
                  Show Deleted
                </Label>
              </div>
              {(filters.search || filters.status || filters.booking_type || filters.show_deleted) && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearFiltersAndCache} title="Clear filters and cache">
                    <X className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                </div>
              )}
            </div>

            {/* Page Size & Export Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="page-size" className="text-sm whitespace-nowrap">Per page:</Label>
                  <Select 
                    value={String(filters.perPage)} 
                    onValueChange={(v) => updateFilters('perPage', parseInt(v) as any)}
                  >
                    <SelectTrigger id="page-size" className="w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map(size => (
                        <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {applications.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={selectedIds.size === applications.length && applications.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                    <Label htmlFor="select-all" className="text-sm cursor-pointer flex items-center gap-1">
                      <CheckSquare className="h-3 w-3" />
                      Select All ({selectedIds.size}/{applications.length})
                    </Label>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportSelected}
                  disabled={selectedIds.size === 0 || isExporting}
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-1" />
                  )}
                  Export Selected ({selectedIds.size})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportAll}
                  disabled={applications.length === 0 || isExporting}
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-1" />
                  )}
                  Export Page
                </Button>
              </div>
            </div>

            {/* Pagination Info */}
            {!loading && pagination.itemsTotal > 0 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Showing {applications.length} of {pagination.itemsTotal} applications</span>
                {pagination.pageTotal > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(pagination.curPage - 1)}
                      disabled={pagination.curPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span>Page {pagination.curPage} of {pagination.pageTotal}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(pagination.curPage + 1)}
                      disabled={pagination.curPage >= pagination.pageTotal}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Application List */}
            {loading ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                  <span className="text-muted-foreground">Loading applications...</span>
                </div>
                {Array.from({ length: filters.perPage > 5 ? 5 : filters.perPage }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : applications.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No applications found.</p>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => {
                  // Calculate payment breakdown
                  const bookingItems = app._booking_items?.items || [];
                  const bookingPayments = app._booking_payments || [];
                  const totalOwed = bookingItems.reduce((sum, item) => sum + (item.price || 0), 0);
                  const totalPaid = bookingPayments.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
                  const balanceDue = totalOwed - totalPaid;
                  const paymentMethod = bookingPayments[0]?.payment_method || app.checkout_type || '';

                  return (
                    <div
                      key={app.id}
                      className={`border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                        selectedIds.has(app.id) ? 'ring-2 ring-primary bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-start gap-4">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedIds.has(app.id)}
                              onCheckedChange={() => toggleSelection(app.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div 
                              className="p-2 bg-primary/10 rounded-lg"
                              onClick={() => handleViewApplication(app)}
                            >
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                          </div>
                          <div onClick={() => handleViewApplication(app)}>
                            <p className="font-medium">
                              {app.booking_type.replace(/_/g, ' ')}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(app.created_at)}</span>
                              <span className="text-muted-foreground/50">•</span>
                              <span className="uppercase text-xs">{app.booking_slug}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          {/* Payment Breakdown */}
                          {totalOwed > 0 && (
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-muted-foreground">
                                Owed: <span className="font-medium text-foreground">${totalOwed.toFixed(2)}</span>
                              </span>
                              <span className="text-green-600">
                                Paid: <span className="font-medium">${totalPaid.toFixed(2)}</span>
                              </span>
                              {balanceDue > 0 ? (
                                <span className="text-destructive">
                                  Due: <span className="font-medium">${balanceDue.toFixed(2)}</span>
                                </span>
                              ) : (
                                <span className="text-green-600">
                                  Due: <span className="font-medium">$0.00</span>
                                </span>
                              )}
                            </div>
                          )}
                          <Badge variant={getStatusBadgeVariant(app.status)}>
                            {app.status}
                          </Badge>
                          {(() => {
                            const paymentStatus = bookingPayments[0]?.payment_status || extractPaymentStatus(app.payment_status);
                            if (paymentStatus) {
                              return (
                                <Badge 
                                  variant={
                                    paymentStatus.toLowerCase() === 'paid' ? 'default' :
                                    paymentStatus.toLowerCase() === 'failed' ? 'destructive' :
                                    'outline'
                                  }
                                  className={`capitalize ${paymentStatus.toLowerCase() === 'paid' ? 'bg-green-600/90 hover:bg-green-600' : ''}`}
                                >
                                  {paymentStatus}
                                  {paymentMethod && <span className="ml-1 opacity-75">({paymentMethod})</span>}
                                </Badge>
                              );
                            }
                            return null;
                          })()}
                          {/* Pay Online Button - show if balance due > 0 */}
                          {balanceDue > 0 && (
                            <MemberPaymentDialog
                              bookingSlug={app.booking_slug}
                              bookingsId={app.id}
                              bookingType={app.booking_type}
                              totalOwed={totalOwed}
                              totalPaid={totalPaid}
                              trigger={
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5 text-xs"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <CreditCard className="h-3.5 w-3.5" />
                                  Pay Online
                                </Button>
                              }
                            />
                          )}
                          <PaymentReceiptView
                            application={app as any}
                            trigger={
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Receipt className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            }
                          />
                          <Eye 
                            className="h-4 w-4 text-muted-foreground cursor-pointer" 
                            onClick={() => handleViewApplication(app)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Applications;