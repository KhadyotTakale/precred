import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/clerk-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";

import { format } from "date-fns";
import { CalendarIcon, Eye, RefreshCw, Search, X, FileText, Trash2, RotateCcw } from "lucide-react";
import { adminAPI, type WorkflowLog, type WorkflowLogsResponse } from "@/lib/admin-api";
import { elegantAPI } from "@/lib/elegant-api";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface WorkflowLogsViewerProps {
  clerkUserId: string;
}

const ITEM_TYPES = [
  { value: "all", label: "All Types" },
  { value: "event", label: "Events" },
  { value: "class", label: "Classes" },
  { value: "membership", label: "Memberships" },
  { value: "raffle", label: "Raffles" },
  { value: "donation", label: "Donations" },
];

const EVENT_TYPES = [
  { value: "all", label: "All Events" },
  { value: "view", label: "View" },
  { value: "add_to_cart", label: "Add to Cart" },
  { value: "purchase", label: "Purchase" },
];

export function WorkflowLogsViewer({ clerkUserId }: WorkflowLogsViewerProps) {
  const { toast } = useToast();
  const [logs, setLogs] = useState<WorkflowLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filters
  const [itemSlug, setItemSlug] = useState("");
  const [itemType, setItemType] = useState("all");
  const [eventType, setEventType] = useState("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Detail dialog
  const [selectedLog, setSelectedLog] = useState<WorkflowLog | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [resettingThrottle, setResettingThrottle] = useState(false);

  // Clear browser throttles
  const clearBrowserThrottles = useCallback(() => {
    const throttleKeys = Object.keys(localStorage).filter(k => k.startsWith('wf_throttle_'));
    throttleKeys.forEach(k => localStorage.removeItem(k));
    toast({
      title: "Browser Throttles Cleared",
      description: `Removed ${throttleKeys.length} throttle record${throttleKeys.length !== 1 ? 's' : ''} from localStorage`,
    });
  }, [toast]);

  const fetchLogs = useCallback(async () => {
    if (!clerkUserId) return;

    setLoading(true);
    try {
      const filters: {
        items_slug?: string | null;
        items_id?: number | null;
        item_type?: string | null;
        event?: string | null;
        start_date?: string | null;
        end_date?: string | null;
        page?: number;
        perPage?: number;
      } = {
        page: currentPage,
        perPage: 25,
      };

      if (itemSlug.trim()) {
        filters.items_slug = itemSlug.trim();
      }
      if (itemType !== "all") {
        filters.item_type = itemType;
      }
      if (eventType !== "all") {
        filters.event = eventType;
      }
      if (startDate) {
        filters.start_date = format(startDate, "yyyy-MM-dd");
      }
      if (endDate) {
        filters.end_date = format(endDate, "yyyy-MM-dd");
      }

      const response = await adminAPI.getWorkflowLogs(clerkUserId, filters);
      
      setLogs(response.items || []);
      // Calculate pages based on response - nextPage null means last page
      const hasMore = response.nextPage !== null;
      setTotalPages(hasMore ? currentPage + 1 : currentPage);
      setTotalItems(response.itemsReceived || 0);
    } catch (error) {
      console.error("Failed to fetch workflow logs:", error);
      toast({
        title: "Error",
        description: "Failed to load workflow logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [clerkUserId, itemSlug, itemType, eventType, startDate, endDate, currentPage, toast]);

  // Reset server-side throttle for a specific log
  const resetServerThrottle = useCallback(async (logId: number) => {
    setResettingThrottle(true);
    try {
      const result = await elegantAPI.deleteThrottle(logId);
      if (result.success) {
        toast({
          title: "Throttle Reset",
          description: `Server throttle for log #${logId} has been reset`,
        });
        setDetailDialogOpen(false);
        fetchLogs(); // Refresh the list
      } else {
        toast({
          title: "Reset Failed",
          description: "Could not reset the throttle record",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to reset throttle:", error);
      toast({
        title: "Error",
        description: "Failed to reset throttle",
        variant: "destructive",
      });
    } finally {
      setResettingThrottle(false);
    }
  }, [toast, fetchLogs]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleViewDetails = async (log: WorkflowLog) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
    setLoadingDetail(true);

    try {
      const details = await adminAPI.getWorkflowLogDetails(clerkUserId, log.id);
      setSelectedLog(details);
    } catch (error) {
      console.error("Failed to fetch log details:", error);
      // Keep the original log data if details fetch fails
    } finally {
      setLoadingDetail(false);
    }
  };

  const clearFilters = () => {
    setItemSlug("");
    setItemType("all");
    setEventType("all");
    setStartDate(undefined);
    setEndDate(undefined);
    setCurrentPage(1);
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [itemSlug, itemType, eventType, startDate, endDate]);

  const hasActiveFilters = itemSlug || itemType !== "all" || eventType !== "all" || startDate || endDate;

  const formatTimestamp = (timestamp: string | number) => {
    try {
      // Handle Unix timestamp (number) or ISO string
      const date = typeof timestamp === 'number' 
        ? new Date(timestamp) 
        : new Date(timestamp);
      return format(date, "MMM d, yyyy h:mm a");
    } catch {
      return String(timestamp);
    }
  };

  const getTriggerBadgeColor = (trigger: string) => {
    switch (trigger) {
      case "view":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "add_to_cart":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "purchase":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="border-0 shadow-none sm:border sm:shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 px-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          Execution Logs
          {totalItems > 0 && (
            <Badge variant="secondary" className="text-xs font-normal">{totalItems}</Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearBrowserThrottles}
            className="h-8 text-xs"
          >
            <Trash2 className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Clear Throttles</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchLogs}
            disabled={loading}
            className="h-8 text-xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 sm:mr-1.5", loading && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 py-2">
        {/* Filters - Compact */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[150px] max-w-[250px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search slug..."
              value={itemSlug}
              onChange={(e) => setItemSlug(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          <Select value={itemType} onValueChange={setItemType}>
            <SelectTrigger className="w-[120px] h-8 text-sm">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              {ITEM_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger className="w-[120px] h-8 text-sm">
              <SelectValue placeholder="All Events" />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 text-sm w-[110px] justify-start",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                {startDate ? format(startDate, "MMM d") : "From"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 text-sm w-[110px] justify-start",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                {endDate ? format(endDate, "MMM d") : "To"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2">
              <X className="h-3.5 w-3.5" />
            </Button>
          )}

          <span className="text-xs text-muted-foreground ml-auto">
            {loading ? "..." : `${logs.length} log${logs.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {/* Pagination - Top */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Page {currentPage}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-7 px-2 text-xs"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={logs.length < 25}
              className="h-7 px-2 text-xs"
            >
              Next
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Actions</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No workflow logs found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {formatTimestamp(log.log?.timestamp || log.created_at)}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {log._items?.title || `Workflow #${log.workflows_items_id}`}
                      </span>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {log.items_slug}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {log.item_type || log.log?.item_type || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getTriggerBadgeColor(log.event || log.log?.trigger_event)}>
                        {log.event || log.log?.trigger_event || "unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {log.log?.executed_actions?.length || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewDetails(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Workflow Log Details</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {loadingDetail ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : selectedLog ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Log ID</label>
                    <p className="font-mono">{selectedLog.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                    <p>{formatTimestamp(selectedLog.log?.timestamp || selectedLog.created_at)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Workflow</label>
                    <p>{selectedLog._items?.title || `ID: ${selectedLog.workflows_items_id}`}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Item Slug</label>
                    <p className="font-mono text-sm">{selectedLog.items_slug}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Item ID</label>
                    <p>{selectedLog.items_id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Trigger Event</label>
                    <Badge variant="secondary" className={getTriggerBadgeColor(selectedLog.log?.trigger_event)}>
                      {selectedLog.log?.trigger_event || "unknown"}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Executed Actions</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedLog.log?.executed_actions?.length ? (
                      selectedLog.log.executed_actions.map((action, index) => (
                        <Badge key={index} variant="outline">
                          {action}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-sm">No actions executed</span>
                    )}
                  </div>
                </div>

                {selectedLog.log?.item_data && Object.keys(selectedLog.log.item_data).length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Item Data</label>
                    <pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-auto">
                      {JSON.stringify(selectedLog.log.item_data, null, 2)}
                    </pre>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Full Log Payload</label>
                  <pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-auto">
                    {JSON.stringify(selectedLog.log, null, 2)}
                  </pre>
                </div>
              </div>
            ) : null}
          </ScrollArea>
          {selectedLog && (
            <DialogFooter className="mt-4">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => resetServerThrottle(selectedLog.id)}
                disabled={resettingThrottle}
              >
                <RotateCcw className={cn("h-4 w-4 mr-2", resettingThrottle && "animate-spin")} />
                {resettingThrottle ? "Resetting..." : "Reset Server Throttle"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
