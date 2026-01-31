import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/clerk-react";
import { useSearchParams } from "react-router-dom";
import { elegantAPI, Booking } from "@/lib/elegant-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApplicationPrintPreview } from "@/components/ApplicationPrintPreview";
import { format } from "date-fns";
import { Package, Calendar, DollarSign, ChevronDown, ChevronUp, Search, X, CalendarIcon, Loader2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingTypeOption {
  booking_type: string;
  bookings: number;
  booking_status: string[];
}

interface ItemTypeOption {
  booking_items: string;
  bookings: number;
  price: number;
  quantity: number;
}

const Orders = () => {
  const { user } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    itemsReceived: 0,
    curPage: 1,
    nextPage: null as number | null,
    prevPage: null as number | null,
    offset: 0,
    perPage: 25,
    itemsTotal: 0,
    pageTotal: 1
  });
  
  // Filter options from analytics
  const [bookingTypeOptions, setBookingTypeOptions] = useState<BookingTypeOption[]>([]);
  const [itemTypeOptions, setItemTypeOptions] = useState<ItemTypeOption[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bookingTypeFilter, setBookingTypeFilter] = useState<string>("all");
  const [itemTypeFilter, setItemTypeFilter] = useState<string>("all");
  const [bookingSlugFilter, setBookingSlugFilter] = useState<string>("");
  
  // Order details state
  const [selectedOrder, setSelectedOrder] = useState<Booking | null>(null);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load filter options from analytics on mount
  useEffect(() => {
    const loadFilterOptions = async () => {
      if (!user?.id) return;
      try {
        setLoadingFilters(true);
        const analytics = await elegantAPI.getMemberDashboardAnalytics(user.id);
        
        // Get booking types from total_booking_types (under bookings)
        const bookingTypes = (analytics.metrics?.bookings?.total_booking_types || [])
          .filter((b: any) => b.booking_types && b.booking_types.trim() !== '' && b.bookings > 0)
          .map((b: any) => ({ 
            booking_type: b.booking_types, 
            bookings: b.bookings,
            booking_status: b.booking_status || []
          }));
        setBookingTypeOptions(bookingTypes);
        
        // Get item types from bookings.total_booking_items
        const itemTypes = (analytics.metrics?.bookings?.total_booking_items || [])
          .filter((i: any) => i.booking_items && i.booking_items.trim() !== '' && i.bookings > 0)
          .map((i: any) => ({ 
            booking_items: i.booking_items, 
            bookings: i.bookings,
            price: i.price || 0,
            quantity: i.quantity || 0
          }));
        setItemTypeOptions(itemTypes);
      } catch (error) {
        console.error('Error loading filter options:', error);
      } finally {
        setLoadingFilters(false);
      }
    };
    loadFilterOptions();
  }, [user?.id]);

  // Initialize filters from URL params
  useEffect(() => {
    const urlBookingType = searchParams.get('booking_type');
    const urlItemType = searchParams.get('items_type');
    const urlStatus = searchParams.get('status');
    const urlBookingSlug = searchParams.get('booking_slug');
    
    if (urlBookingType) setBookingTypeFilter(urlBookingType);
    if (urlItemType) setItemTypeFilter(urlItemType);
    if (urlStatus) setStatusFilter(urlStatus);
    if (urlBookingSlug) setBookingSlugFilter(urlBookingSlug);
  }, []);

  // Fetch orders with server-side filtering
  const fetchOrders = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const response = await elegantAPI.getApplications(user.id, {
        page: currentPage,
        perPage: 25,
        search: debouncedSearch || null,
        status: statusFilter !== "all" ? statusFilter : null,
        booking_type: bookingTypeFilter !== "all" ? bookingTypeFilter : null,
        items_type: itemTypeFilter !== "all" ? itemTypeFilter : null,
        start_date: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : null,
        end_date: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : null,
        booking_slug: bookingSlugFilter || null
      });
      
      setBookings(response.items || []);
      setPagination({
        itemsReceived: response.itemsReceived || 0,
        curPage: response.curPage || currentPage,
        nextPage: response.nextPage || null,
        prevPage: response.prevPage || null,
        offset: response.offset || 0,
        perPage: response.perPage || 25,
        itemsTotal: response.itemsTotal || 0,
        pageTotal: response.pageTotal || 1
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, currentPage, debouncedSearch, statusFilter, bookingTypeFilter, itemTypeFilter, dateRange, bookingSlugFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (bookingTypeFilter !== "all") params.set('booking_type', bookingTypeFilter);
    if (itemTypeFilter !== "all") params.set('items_type', itemTypeFilter);
    if (statusFilter !== "all") params.set('status', statusFilter);
    setSearchParams(params, { replace: true });
  }, [bookingTypeFilter, itemTypeFilter, statusFilter, setSearchParams]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'completed':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'new':
        return 'bg-blue-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const calculateOrderTotal = (booking: Booking) => {
    return (booking._booking_items_of_bookings?.items || []).reduce(
      (total, item) => total + (item.price * item.quantity),
      0
    );
  };

  const toggleOrder = (orderId: number) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handleOrderClick = async (booking: Booking) => {
    if (!user?.id || !booking.booking_slug) return;
    
    try {
      setLoadingOrderDetails(true);
      setOrderDetailsOpen(true);
      const details = await elegantAPI.getApplicationDetails(user.id, booking.booking_slug);
      
      // Check if this is an application type - transform data for ApplicationPrintPreview
      const bookingItems = details._booking_items_of_bookings?.items || [];
      const hasApplicationItem = bookingItems.some((item: any) => 
        item._items?.item_type?.toLowerCase() === 'application'
      );
      
      if (hasApplicationItem) {
        // Transform data similar to Admin dashboard handleViewApplication
        const firstBookingItem = bookingItems[0];
        const bookingItemsInfo = firstBookingItem?.booking_items_info || {};
        const bookingInfo = details.booking_info || {};
        
        // Merge form data: booking_items_info takes priority, then booking_info
        const mergedFormData = {
          ...bookingInfo,
          ...bookingItemsInfo,
        };
        
        // Enrich the application with full details for ApplicationPrintPreview
        const enrichedOrder = {
          ...details,
          booking_info: mergedFormData,
          _booking_items_info: bookingItemsInfo,
          _items: firstBookingItem?._items,
        };
        setSelectedOrder(enrichedOrder as any);
      } else {
        setSelectedOrder(details);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoadingOrderDetails(false);
    }
  };

  // Helper to check if order is an application type
  const isApplicationOrder = (order: Booking | null): boolean => {
    if (!order) return false;
    const bookingItems = order._booking_items_of_bookings?.items || [];
    return bookingItems.some((item: any) => 
      item._items?.item_type?.toLowerCase() === 'application'
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setDateRange({ from: undefined, to: undefined });
    setStatusFilter("all");
    setBookingTypeFilter("all");
    setItemTypeFilter("all");
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || dateRange.from || dateRange.to || 
    statusFilter !== "all" || bookingTypeFilter !== "all" || itemTypeFilter !== "all";

  const statuses = ["Paid", "Pending", "New", "Cancelled", "Completed"];

  if (loading && bookings.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-foreground">Order History</h1>
        <p className="text-muted-foreground">View all your past purchases and bookings</p>
      </div>

      {/* Filters Section */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order number, customer name, or item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Date Range Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}
                      </>
                    ) : (
                      format(dateRange.from, "MMM dd, yyyy")
                    )
                  ) : (
                    <span>Date Range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    setDateRange({ from: range?.from, to: range?.to });
                    setCurrentPage(1);
                  }}
                  numberOfMonths={2}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            {/* Booking Type Filter */}
            <Select value={bookingTypeFilter} onValueChange={(val) => { setBookingTypeFilter(val); setCurrentPage(1); }}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Booking Type" />
              </SelectTrigger>
              <SelectContent className="max-w-[320px]">
                <SelectItem value="all">All Booking Types</SelectItem>
                {loadingFilters ? (
                  <SelectItem value="_loading" disabled>Loading...</SelectItem>
                ) : (
                  bookingTypeOptions.map((opt) => (
                    <SelectItem key={opt.booking_type} value={opt.booking_type}>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span>{opt.booking_type.replace(/_/g, ' ')}</span>
                          <Badge variant="secondary" className="text-xs h-5">
                            {opt.bookings}
                          </Badge>
                        </div>
                        {opt.booking_status.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {opt.booking_status.slice(0, 3).map((status) => (
                              <Badge 
                                key={status} 
                                variant="outline" 
                                className="text-[10px] h-4 px-1.5 capitalize"
                              >
                                {status}
                              </Badge>
                            ))}
                            {opt.booking_status.length > 3 && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                                +{opt.booking_status.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {/* Item Type Filter */}
            <Select value={itemTypeFilter} onValueChange={(val) => { setItemTypeFilter(val); setCurrentPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Item Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Item Types</SelectItem>
                {loadingFilters ? (
                  <SelectItem value="_loading" disabled>Loading...</SelectItem>
                ) : (
                  itemTypeOptions.map((opt) => (
                    <SelectItem key={opt.booking_items} value={opt.booking_items}>
                      {opt.booking_items.replace(/_/g, ' ')} ({opt.bookings})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status.toLowerCase()}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Results Count */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>
              {pagination.itemsTotal > 0 
                ? `Showing ${bookings.length} of ${pagination.itemsTotal} orders`
                : 'No orders found'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Pagination Component */}
      {pagination.pageTotal > 1 && (
        <Pagination>
          <PaginationContent>
            {pagination.prevPage && (
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => handlePageChange(pagination.prevPage!)}
                  className="cursor-pointer"
                />
              </PaginationItem>
            )}
            
            {Array.from({ length: Math.min(pagination.pageTotal, 5) }, (_, i) => {
              const startPage = Math.max(1, pagination.curPage - 2);
              const page = startPage + i;
              if (page > pagination.pageTotal) return null;
              return (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => handlePageChange(page)}
                    isActive={page === pagination.curPage}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              );
            })}

            {pagination.nextPage && (
              <PaginationItem>
                <PaginationNext 
                  onClick={() => handlePageChange(pagination.nextPage!)}
                  className="cursor-pointer"
                />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}

      {bookings.length === 0 && !loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              {hasActiveFilters ? "No Orders Found" : "No Orders Yet"}
            </h3>
            <p className="text-muted-foreground">
              {hasActiveFilters 
                ? "Try adjusting your filters to see more results."
                : "Your order history will appear here once you make a purchase."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {bookings.map((booking) => {
            const isExpanded = expandedOrders.has(booking.id);
            const itemCount = (booking._booking_items_of_bookings?.items || []).length;
            
            return (
              <Collapsible key={booking.id} open={isExpanded} onOpenChange={() => toggleOrder(booking.id)}>
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="bg-muted/50 p-3 cursor-pointer hover:bg-muted/70 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div>
                            <CardTitle className="text-base mb-0.5 text-left">
                              {booking.booking_type || 'Order'} #{booking.booking_slug?.toUpperCase()}
                              {(booking._leads?.lead_payload?.name || booking._leads?.lead_payload?.first_name || booking._customers?.Full_name) && 
                                ` - ${booking._leads?.lead_payload?.name || booking._leads?.lead_payload?.first_name || booking._customers?.Full_name}`}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-1 text-xs flex-wrap">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(booking.created_at), 'MMM dd, yyyy')}
                              <span className="ml-2">• {itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                              {booking._leads?.email && (
                                <span className="ml-2">• {booking._leads.email}</span>
                              )}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOrderClick(booking);
                            }}
                            className="h-8 px-2"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Badge className={getStatusColor(booking.status) + " text-xs"}>
                            {booking.status}
                          </Badge>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Total</div>
                            <div className="text-lg font-bold text-foreground flex items-center gap-0.5">
                              <DollarSign className="h-4 w-4" />
                              {calculateOrderTotal(booking).toFixed(2)}
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-3 p-3">
                      <div className="space-y-2">
                        {(booking._booking_items_of_bookings?.items || []).map((item, index) => (
                          <div key={item.id}>
                            {index > 0 && <Separator className="my-2" />}
                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                              {item._items.item_info?.image?.[0] && (
                                <img
                                  src={item._items.item_info.image[0]}
                                  alt={item._items.title}
                                  className="w-10 h-10 object-cover rounded flex-shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-foreground text-sm truncate">
                                  {item._items.title}
                                </h4>
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {item._items.item_type}
                              </span>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                Qty: {item.quantity}
                              </span>
                              <span className="font-semibold text-foreground text-sm whitespace-nowrap">
                                ${item.price.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {pagination.pageTotal > 1 && (
        <div className="mt-8">
          <Pagination>
            <PaginationContent>
              {pagination.prevPage && (
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => handlePageChange(pagination.prevPage!)}
                    className="cursor-pointer"
                  />
                </PaginationItem>
              )}
              
              {Array.from({ length: Math.min(pagination.pageTotal, 5) }, (_, i) => {
                const startPage = Math.max(1, pagination.curPage - 2);
                const page = startPage + i;
                if (page > pagination.pageTotal) return null;
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => handlePageChange(page)}
                      isActive={page === pagination.curPage}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

              {pagination.nextPage && (
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => handlePageChange(pagination.nextPage!)}
                    className="cursor-pointer"
                  />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Order Details Dialog - Use ApplicationPrintPreview for application types */}
      {isApplicationOrder(selectedOrder) ? (
        <ApplicationPrintPreview
          application={selectedOrder as any}
          open={orderDetailsOpen}
          onOpenChange={setOrderDetailsOpen}
        />
      ) : (
        <Dialog open={orderDetailsOpen} onOpenChange={setOrderDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedOrder ? (
                  <>
                    {selectedOrder.booking_type || 'Order'} #{selectedOrder.booking_slug?.toUpperCase()}
                    <Badge className={getStatusColor(selectedOrder.status)}>
                      {selectedOrder.status}
                    </Badge>
                  </>
                ) : (
                  'Order Details'
                )}
              </DialogTitle>
            </DialogHeader>

            {loadingOrderDetails ? (
              <div className="space-y-4 py-4">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : selectedOrder ? (
              <div className="space-y-6">
                {/* Order Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Order Date</span>
                    <p className="font-medium">{format(new Date(selectedOrder.created_at), 'PPP')}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total</span>
                    <p className="font-medium text-lg">${calculateOrderTotal(selectedOrder).toFixed(2)}</p>
                  </div>
                  {(selectedOrder._leads?.lead_payload?.name || selectedOrder._leads?.lead_payload?.first_name || selectedOrder._customers?.Full_name) && (
                    <div>
                      <span className="text-muted-foreground">Customer</span>
                      <p className="font-medium">
                        {selectedOrder._leads?.lead_payload?.name || selectedOrder._leads?.lead_payload?.first_name || selectedOrder._customers?.Full_name}
                      </p>
                    </div>
                  )}
                  {(selectedOrder._leads?.email || selectedOrder._customers?.email) && (
                    <div>
                      <span className="text-muted-foreground">Email</span>
                      <p className="font-medium">{selectedOrder._leads?.email || selectedOrder._customers?.email}</p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Booking Info */}
                {selectedOrder.booking_info && Object.keys(selectedOrder.booking_info).length > 0 && (
                  <>
                    <div>
                      <h4 className="font-semibold mb-3">Booking Information</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {Object.entries(selectedOrder.booking_info).map(([key, value]) => (
                          <div key={key}>
                            <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                            <p className="font-medium">{String(value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Order Items */}
                <div>
                  <h4 className="font-semibold mb-3">Items</h4>
                  <div className="space-y-3">
                    {(selectedOrder._booking_items_of_bookings?.items || []).map((item, index) => (
                      <div key={item.id}>
                        {index > 0 && <Separator className="my-3" />}
                        <div className="flex items-start gap-3">
                          {item._items.item_info?.image?.[0] && (
                            <img
                              src={item._items.item_info.image[0]}
                              alt={item._items.title}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <h5 className="font-medium">{item._items.title}</h5>
                            <p className="text-sm text-muted-foreground">{item._items.item_type}</p>
                            {item.booking_items_info && Object.keys(item.booking_items_info).length > 0 && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                {Object.entries(item.booking_items_info).map(([key, value]) => (
                                  <span key={key} className="mr-3">
                                    <span className="capitalize">{key.replace(/_/g, ' ')}:</span> {String(value)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">${item.price.toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Summary */}
                <Separator />
                <div className="flex justify-between items-center font-semibold text-lg">
                  <span>Total</span>
                  <span>${calculateOrderTotal(selectedOrder).toFixed(2)}</span>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Orders;
