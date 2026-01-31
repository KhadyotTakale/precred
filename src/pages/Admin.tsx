import { useUser, UserButton } from "@clerk/clerk-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar, GraduationCap, Users, User, Heart, Trophy, Mail, Store, Settings, Image, Upload, Code, AlertTriangle, Home, Plus, Edit, ChevronLeft, ChevronRight, MapPin, Trash2, Eye, Clock, Search, Filter, Download, CheckSquare, Square, UserPlus, Copy, ShoppingCart, DollarSign, X, CalendarIcon, MessageSquare, Phone, Send, Bell, ChevronDown, ChevronUp, Megaphone, Ticket, Gift, Crown, Sparkles, Target, Share2, ExternalLink, Facebook, Twitter, Linkedin, ClipboardList, List, Columns, FileDown, FileText, LayoutDashboard, Zap, Loader2, RefreshCw, Check, Info, Receipt } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useEffect, useState, useRef, useMemo, useCallback, Fragment } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { elegantAPI, type ElegantCustomer, type CustomerResponse, type SharableLinksResponse } from "@/lib/elegant-api";
import { useToast } from "@/hooks/use-toast";
import { adminAPI, type MediaFile, type Item, type Customer, type Lead, type Order, type MembershipBookingItem, type CreateLeadRequest, type RaffleEntry, type RaffleWinner, type CampaignLead, type CampaignLeadDetail, type RelatedItem, type ItemImage, type Task, type PostmarkTemplate } from "@/lib/admin-api";
import { batchSendEmails, buildTemplateModelFromMappings, type BatchEmailProgress, type BatchEmailResult, type EmailLeadRecipient, type FieldResolutionContext, type EmailThrottleSettings, type LinkedBooking } from "@/lib/email-utils";
import { EmailProgressDialog, createInitialEmailProgressState, type EmailProgressState, type EmailSendStatus } from "@/components/EmailProgressDialog";
import confetti from "canvas-confetti";
import { LeadForm } from "@/components/LeadForm";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MediaTile } from "@/components/MediaTile";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { EventForm } from "@/components/EventForm";
import { ClassForm } from "@/components/ClassForm";
import { VendorForm } from "@/components/VendorForm";
import { SponsorForm } from "@/components/SponsorForm";
import { CampaignForm } from "@/components/CampaignForm";
import { RaffleForm } from "@/components/RaffleForm";
import { NewsletterForm } from "@/components/NewsletterForm";
import { BlogForm } from "@/components/BlogForm";
import { ApplicationForm } from "@/components/ApplicationForm";
import { ImageUploadDialog } from "@/components/ImageUploadDialog";
import { MemberDetailForm } from "@/components/MemberDetailForm";
import { CSVUtils } from "@/lib/csv-utils";
import { ShopSettingsForm } from "@/components/ShopSettingsForm";
import { RoleModuleManager } from "@/components/RoleModuleManager";
import { EmailCampaignForm } from "@/components/EmailCampaignForm";
import { TaskForm } from "@/components/TaskForm";
import { TaskKanbanBoard } from "@/components/TaskKanbanBoard";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, differenceInDays, addYears } from "date-fns";
import { cn } from "@/lib/utils";
import { ADMIN_MODULES, AdminModule, Role, hasAdminModuleAccess } from "@/lib/role-permissions";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { RolePreviewSelector } from "@/components/RolePreviewSelector";
import { jsPDF } from "jspdf";
import { AdminDashboard } from "@/components/AdminDashboard";
import { ApplicationPrintPreview } from "@/components/ApplicationPrintPreview";
import { VersionCheck } from "@/components/VersionCheck";
import { AdminBottomNav } from "@/components/AdminBottomNav";
import { AutomationBuilder } from "@/components/automation/AutomationBuilder";
import { WorkflowLogsViewer } from "@/components/WorkflowLogsViewer";
import { StatusConfigurationManager, DEFAULT_STATUSES, FILTER_ONLY_STATUSES, formatStatusLabel, getAllStatusesForType, getFilterStatusesForType, type CustomStatusesConfig } from "@/components/StatusConfigurationManager";
import { EmailPreviewDialog } from "@/components/EmailPreviewDialog";
import { PaymentReceiptView } from "@/components/PaymentReceiptView";
import { PaymentEditDialog } from "@/components/PaymentEditDialog";
import { NotesPanel, NotesButton, NotesExpandedRow } from "@/components/NotesPanel";

const Admin = () => {
  const { isSignedIn, isLoaded, user } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [customer, setCustomer] = useState<ElegantCustomer | null>(null);
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [franchisorId, setFranchisorId] = useState<number | undefined>(undefined);
  const userIdRef = useRef<string | null>(null);
  const previousSignedInRef = useRef<boolean>(false);
  const [mediaItems, setMediaItems] = useState<MediaFile[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [mediaPage, setMediaPage] = useState(1);
  const [mediaTotalPages, setMediaTotalPages] = useState(1);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<string>("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [deleteMediaDialogOpen, setDeleteMediaDialogOpen] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<MediaFile | null>(null);
  const [deletingMedia, setDeletingMedia] = useState(false);
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(new Set());
  const [bulkDeleteMediaDialogOpen, setBulkDeleteMediaDialogOpen] = useState(false);
  const [bulkDeletingMedia, setBulkDeletingMedia] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [events, setEvents] = useState<Item[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [editingEvent, setEditingEvent] = useState<Item | null>(null);
  const [showEventEditView, setShowEventEditView] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Item | null>(null);
  
  // Classes state
  const [classes, setClasses] = useState<Item[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [classesPage, setClassesPage] = useState(1);
  const [classesTotalPages, setClassesTotalPages] = useState(1);
  const [classesTotalItems, setClassesTotalItems] = useState(0);
  const [editingClass, setEditingClass] = useState<Item | null>(null);
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [deleteClassDialogOpen, setDeleteClassDialogOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<Item | null>(null);
  const [showClassEditView, setShowClassEditView] = useState(false);
  const [copyEventDialogOpen, setCopyEventDialogOpen] = useState(false);
  const [eventToCopy, setEventToCopy] = useState<Item | null>(null);
  const [copyEventTitle, setCopyEventTitle] = useState("");
  const [copyClassDialogOpen, setCopyClassDialogOpen] = useState(false);
  const [classToCopy, setClassToCopy] = useState<Item | null>(null);
  const [copyClassTitle, setCopyClassTitle] = useState("");
  const [copyApplicationDialogOpen, setCopyApplicationDialogOpen] = useState(false);
  const [applicationToCopy, setApplicationToCopy] = useState<Item | null>(null);
  const [copyApplicationTitle, setCopyApplicationTitle] = useState("");
  
  // Vendors state
  const [vendors, setVendors] = useState<Item[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [vendorsPage, setVendorsPage] = useState(1);
  const [vendorsTotalPages, setVendorsTotalPages] = useState(1);
  const [vendorsTotalItems, setVendorsTotalItems] = useState(0);
  const [editingVendor, setEditingVendor] = useState<Item | null>(null);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [deleteVendorDialogOpen, setDeleteVendorDialogOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<Item | null>(null);
  
  // Vendor Applications state
  const [vendorApplications, setVendorApplications] = useState<any[]>([]);
  const [loadingVendorApplications, setLoadingVendorApplications] = useState(false);
  const [vendorApplicationsPage, setVendorApplicationsPage] = useState(1);
  const [vendorApplicationsTotalPages, setVendorApplicationsTotalPages] = useState(1);
  const [vendorApplicationsTotalItems, setVendorApplicationsTotalItems] = useState(0);
  const [vendorApplicationStatusFilter, setVendorApplicationStatusFilter] = useState<string>("new");
  const [vendorApplicationSearchQuery, setVendorApplicationSearchQuery] = useState("");
  const [vendorsSubTab, setVendorsSubTab] = useState<'list' | 'applications' | 'all-applications'>('list');
  const [expandedApplicationIds, setExpandedApplicationIds] = useState<Set<number>>(new Set());
  const [vendorApplicationStatusCounts, setVendorApplicationStatusCounts] = useState<Record<string, number>>({});
  const [viewingApplication, setViewingApplication] = useState<any | null>(null);
  const [loadingApplicationDetails, setLoadingApplicationDetails] = useState(false);
  
  // All Applications state
  const [allApplications, setAllApplications] = useState<any[]>([]);
  const [loadingAllApplications, setLoadingAllApplications] = useState(false);
  const [allApplicationsPage, setAllApplicationsPage] = useState(1);
  const [allApplicationsPerPage, setAllApplicationsPerPage] = useState(5);
  const [allApplicationsTotalPages, setAllApplicationsTotalPages] = useState(1);
  const [allApplicationsTotalItems, setAllApplicationsTotalItems] = useState(0);
  const [allApplicationsSearchQuery, setAllApplicationsSearchQuery] = useState("");
  const [allApplicationsStatusFilter, setAllApplicationsStatusFilter] = useState<string>("all");
  const [allApplicationsCheckoutTypeFilter, setAllApplicationsCheckoutTypeFilter] = useState<string>("all");
  const [allApplicationsPaymentStatusFilter, setAllApplicationsPaymentStatusFilter] = useState<string>("all");
  const [allApplicationsBookingTypeFilter, setAllApplicationsBookingTypeFilter] = useState<string>("all");
  const [allApplicationsItemsTypeFilter, setAllApplicationsItemsTypeFilter] = useState<string>("Application");
  const [allApplicationsDateRange, setAllApplicationsDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [showDeletedAllApplications, setShowDeletedAllApplications] = useState(false);
  const [exportingAllApplications, setExportingAllApplications] = useState(false);
  const [expandedNotesApplicationIds, setExpandedNotesApplicationIds] = useState<Set<number>>(new Set());
  
  // All Applications filters collapse state - persisted in localStorage
  const isMobile = useIsMobile();
  const [allApplicationsFiltersExpanded, setAllApplicationsFiltersExpanded] = useState<boolean>(() => {
    const saved = localStorage.getItem('admin_all_applications_filters_expanded');
    if (saved !== null) return saved === 'true';
    // Default: expanded on desktop, collapsed on mobile (will be set after mount)
    return true;
  });
  
  // Update filter expanded state based on mobile detection after mount
  useEffect(() => {
    const saved = localStorage.getItem('admin_all_applications_filters_expanded');
    if (saved === null) {
      // No saved preference - use responsive default
      setAllApplicationsFiltersExpanded(!isMobile);
    }
  }, [isMobile]);
  
  // Persist filter expanded state to localStorage
  const handleFiltersExpandedChange = useCallback((expanded: boolean) => {
    setAllApplicationsFiltersExpanded(expanded);
    localStorage.setItem('admin_all_applications_filters_expanded', String(expanded));
  }, []);
  const [selectedApplications, setSelectedApplications] = useState<Set<number>>(new Set());
  const [bulkAssignApplicationsToCampaignDialogOpen, setBulkAssignApplicationsToCampaignDialogOpen] = useState(false);
  const [bulkAssigningApplications, setBulkAssigningApplications] = useState(false);
  const [bulkAssignApplicationsProgress, setBulkAssignApplicationsProgress] = useState<{ total: number; processed: number; errors: string[] } | null>(null);
  const [selectedCampaignForApplicationsAssign, setSelectedCampaignForApplicationsAssign] = useState<Item | null>(null);
  // Track applications added to campaigns (client-side) - Map<appId, {campaignId, campaignName, campaignsId}>
  
  // Send Email to Applications state
  const [sendEmailToApplicationsDialogOpen, setSendEmailToApplicationsDialogOpen] = useState(false);
  const [selectedCampaignForApplicationsEmail, setSelectedCampaignForApplicationsEmail] = useState<Item | null>(null);
  const [sendingEmailsToApplications, setSendingEmailsToApplications] = useState(false);
  const [applicationsInCampaign, setApplicationsInCampaign] = useState<Map<number, { campaignId: number; campaignName: string; campaignsId: string }>>(new Map());
  const [removeFromCampaignDialogOpen, setRemoveFromCampaignDialogOpen] = useState(false);
  const [applicationToRemoveFromCampaign, setApplicationToRemoveFromCampaign] = useState<{ appId: number; campaignName: string; campaignsId: string } | null>(null);
  const [removingFromCampaign, setRemovingFromCampaign] = useState(false);
  // Email preview state
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [emailPreviewData, setEmailPreviewData] = useState<{
    templateAlias: string;
    recipientEmail: string;
    recipientName: string;
    templateModel: Record<string, any>;
    totalRecipients: number;
  } | null>(null);
  // Delete All Application state
  const [deleteAllApplicationDialogOpen, setDeleteAllApplicationDialogOpen] = useState(false);
  const [allApplicationToDelete, setAllApplicationToDelete] = useState<any | null>(null);
  const [isDeletingAllApplication, setIsDeletingAllApplication] = useState(false);
  // Bulk Delete All Applications state
  const [bulkDeleteAllApplicationsDialogOpen, setBulkDeleteAllApplicationsDialogOpen] = useState(false);
  const [isBulkDeletingAllApplications, setIsBulkDeletingAllApplications] = useState(false);
  const [bulkDeleteAllApplicationsProgress, setBulkDeleteAllApplicationsProgress] = useState<{ total: number; processed: number; errors: string[] } | null>(null);
  // Bulk Status Update state
  const [bulkStatusUpdateDialogOpen, setBulkStatusUpdateDialogOpen] = useState(false);
  const [isBulkUpdatingStatus, setIsBulkUpdatingStatus] = useState(false);
  const [bulkStatusUpdateProgress, setBulkStatusUpdateProgress] = useState<{ total: number; processed: number; errors: string[] } | null>(null);
  const [selectedBulkStatus, setSelectedBulkStatus] = useState<string>('');
  
  // Sponsors state
  const [sponsors, setSponsors] = useState<Item[]>([]);
  const [loadingSponsors, setLoadingSponsors] = useState(false);
  const [sponsorsPage, setSponsorsPage] = useState(1);
  const [sponsorsTotalPages, setSponsorsTotalPages] = useState(1);
  const [sponsorsTotalItems, setSponsorsTotalItems] = useState(0);
  const [editingSponsor, setEditingSponsor] = useState<Item | null>(null);
  const [showSponsorEditView, setShowSponsorEditView] = useState(false);
  const [deleteSponsorDialogOpen, setDeleteSponsorDialogOpen] = useState(false);
  const [sponsorToDelete, setSponsorToDelete] = useState<Item | null>(null);
  
  // Campaigns state (for Marketing tab)
  const [campaigns, setCampaigns] = useState<Item[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [campaignsPage, setCampaignsPage] = useState(1);
  const [campaignsTotalPages, setCampaignsTotalPages] = useState(1);
  const [campaignsTotalItems, setCampaignsTotalItems] = useState(0);
  const [editingCampaign, setEditingCampaign] = useState<Item | null>(null);
  const [showCampaignEditView, setShowCampaignEditView] = useState(false);
  const [deleteCampaignDialogOpen, setDeleteCampaignDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Item | null>(null);
  const [deleteCampaignLeadDialogOpen, setDeleteCampaignLeadDialogOpen] = useState(false);
  const [campaignLeadToDelete, setCampaignLeadToDelete] = useState<CampaignLead | null>(null);
  const [campaignLeadCounts, setCampaignLeadCounts] = useState<Map<number, number>>(new Map());
  
  // Donations state (separate from campaigns)
  const [donations, setDonations] = useState<Item[]>([]);
  const [loadingDonations, setLoadingDonations] = useState(false);
  const [donationsPage, setDonationsPage] = useState(1);
  const [donationsTotalPages, setDonationsTotalPages] = useState(1);
  const [donationsTotalItems, setDonationsTotalItems] = useState(0);
  const [editingDonation, setEditingDonation] = useState<Item | null>(null);
  const [showDonationEditView, setShowDonationEditView] = useState(false);
  const [deleteDonationDialogOpen, setDeleteDonationDialogOpen] = useState(false);
  const [donationToDelete, setDonationToDelete] = useState<Item | null>(null);
  // Raffles state
  const [raffles, setRaffles] = useState<Item[]>([]);
  const [loadingRaffles, setLoadingRaffles] = useState(false);
  const [rafflesPage, setRafflesPage] = useState(1);
  const [rafflesTotalPages, setRafflesTotalPages] = useState(1);
  const [rafflesTotalItems, setRafflesTotalItems] = useState(0);
  const [editingRaffle, setEditingRaffle] = useState<Item | null>(null);
  const [showRaffleEditView, setShowRaffleEditView] = useState(false);
  const [deleteRaffleDialogOpen, setDeleteRaffleDialogOpen] = useState(false);
  const [raffleToDelete, setRaffleToDelete] = useState<Item | null>(null);
  const [selectedRaffleForEntries, setSelectedRaffleForEntries] = useState<Item | null>(null);
  const [raffleEntries, setRaffleEntries] = useState<RaffleEntry[]>([]);
  const [loadingRaffleEntries, setLoadingRaffleEntries] = useState(false);
  const [raffleEntriesPage, setRaffleEntriesPage] = useState(1);
  const [raffleEntriesTotalPages, setRaffleEntriesTotalPages] = useState(1);
  const [raffleEntriesTotalItems, setRaffleEntriesTotalItems] = useState(0);
  const [showRaffleEntriesView, setShowRaffleEntriesView] = useState(false);
  const [raffleEntriesActiveTab, setRaffleEntriesActiveTab] = useState<'participants' | 'winners'>('participants');
  const [raffleWinners, setRaffleWinners] = useState<RaffleEntry[]>([]);
  const [pickingWinner, setPickingWinner] = useState(false);
  
  // Campaign Leads state
  const [campaignLeads, setCampaignLeads] = useState<CampaignLead[]>([]);
  const [loadingCampaignLeads, setLoadingCampaignLeads] = useState(false);
  const [campaignLeadsPage, setCampaignLeadsPage] = useState(1);
  const [campaignLeadsTotalPages, setCampaignLeadsTotalPages] = useState(1);
  const [campaignLeadsTotalItems, setCampaignLeadsTotalItems] = useState(0);
  const [selectedCampaignLead, setSelectedCampaignLead] = useState<CampaignLeadDetail | null>(null);
  const [showCampaignLeadDetailView, setShowCampaignLeadDetailView] = useState(false);
  const [loadingCampaignLeadDetail, setLoadingCampaignLeadDetail] = useState(false);
  const [assignLeadDialogOpen, setAssignLeadDialogOpen] = useState(false);
  const [selectedCampaignForAssign, setSelectedCampaignForAssign] = useState<Item | null>(null);
  const [selectedLeadForAssign, setSelectedLeadForAssign] = useState<Lead | null>(null);
  const [assigningLead, setAssigningLead] = useState(false);
  const [campaignLeadSearchQuery, setCampaignLeadSearchQuery] = useState("");
  const [campaignLeadStatusFilter, setCampaignLeadStatusFilter] = useState<string>("all");
  const [filterNewLeadsOnly, setFilterNewLeadsOnly] = useState(true);
  const [selectedCampaignForLeads, setSelectedCampaignForLeads] = useState<Item | null>(null);
  
  // Related Items state
  const [relatedItems, setRelatedItems] = useState<RelatedItem[]>([]);
  const [relatedItemDetails, setRelatedItemDetails] = useState<Map<number, Item>>(new Map());
  const [relatedItemMedia, setRelatedItemMedia] = useState<Map<number, ItemImage[]>>(new Map());
  const [loadingRelatedItems, setLoadingRelatedItems] = useState(false);
  const [addRelatedItemDialogOpen, setAddRelatedItemDialogOpen] = useState(false);
  const [availableItemsForLinking, setAvailableItemsForLinking] = useState<Item[]>([]);
  const [loadingAvailableItems, setLoadingAvailableItems] = useState(false);
  const [selectedItemToLink, setSelectedItemToLink] = useState<string>("");
  const [linkingItem, setLinkingItem] = useState(false);
  const [deletingRelatedItemId, setDeletingRelatedItemId] = useState<number | null>(null);
  const [linkItemSearchQuery, setLinkItemSearchQuery] = useState("");
  const [linkItemTypeFilter, setLinkItemTypeFilter] = useState<string>("all");
  const [linkItemPage, setLinkItemPage] = useState(1);
  const [linkItemTotalPages, setLinkItemTotalPages] = useState(1);
  const [linkItemTotalItems, setLinkItemTotalItems] = useState(0);
  const [loadingMoreItems, setLoadingMoreItems] = useState(false);
  const [availableItemTypes, setAvailableItemTypes] = useState<string[]>([]);
  const [loadingItemTypes, setLoadingItemTypes] = useState(false);
  const [relatedItemsSharableLinks, setRelatedItemsSharableLinks] = useState<Map<number, import('@/lib/elegant-api').SharableLinksResponse>>(new Map());
  const [loadingSharableLinks, setLoadingSharableLinks] = useState<Set<number>>(new Set());
  const [showEmailCampaignView, setShowEmailCampaignView] = useState(false);
  const [campaignSharableLinks, setCampaignSharableLinks] = useState<import('@/lib/elegant-api').SharableLinksResponse | null>(null);
  
  // Linked Bookings state for campaigns
  const [linkedBookings, setLinkedBookings] = useState<import('@/lib/email-utils').LinkedBooking[]>([]);
  const [loadingLinkedBookings, setLoadingLinkedBookings] = useState(false);
  const [addBookingDialogOpen, setAddBookingDialogOpen] = useState(false);
  const [availableBookingsForLinking, setAvailableBookingsForLinking] = useState<Order[]>([]);
  const [loadingAvailableBookings, setLoadingAvailableBookings] = useState(false);
  const [selectedBookingToLink, setSelectedBookingToLink] = useState<string>("");
  const [linkingBooking, setLinkingBooking] = useState(false);
  const [bookingSearchQuery, setBookingSearchQuery] = useState("");
  const [bookingTypeFilter, setBookingTypeFilter] = useState<string>("all");
  const [bookingLinkPage, setBookingLinkPage] = useState(1);
  const [bookingLinkTotalPages, setBookingLinkTotalPages] = useState(1);
  const [bookingLinkTotalItems, setBookingLinkTotalItems] = useState(0);
  const [loadingMoreBookings, setLoadingMoreBookings] = useState(false);
  
  // Quick Send Email state (for sending directly from leads list)
  const [quickSendEmailDialogOpen, setQuickSendEmailDialogOpen] = useState(false);
  const [quickSendTemplates, setQuickSendTemplates] = useState<PostmarkTemplate[]>([]);
  const [quickSendSelectedTemplate, setQuickSendSelectedTemplate] = useState<PostmarkTemplate | null>(null);
  const [quickSendLoading, setQuickSendLoading] = useState(false);
  const [quickSendProgress, setQuickSendProgress] = useState<BatchEmailProgress | null>(null);
  const [quickSendResults, setQuickSendResults] = useState<BatchEmailResult | null>(null);
  const [selectedCampaignLeadIds, setSelectedCampaignLeadIds] = useState<Set<string>>(new Set());
  
  // Email Progress Dialog state
  const [emailProgressState, setEmailProgressState] = useState<EmailProgressState>(createInitialEmailProgressState());
  const emailSendCancelledRef = useRef(false);
  const emailSendPausedRef = useRef(false);

  const [newsletters, setNewsletters] = useState<Item[]>([]);
  const [loadingNewsletters, setLoadingNewsletters] = useState(false);
  const [newslettersPage, setNewslettersPage] = useState(1);
  const [newslettersTotalPages, setNewslettersTotalPages] = useState(1);
  const [newslettersTotalItems, setNewslettersTotalItems] = useState(0);
  const [editingNewsletter, setEditingNewsletter] = useState<Item | null>(null);
  const [showNewsletterEditView, setShowNewsletterEditView] = useState(false);
  const [deleteNewsletterDialogOpen, setDeleteNewsletterDialogOpen] = useState(false);
  const [newsletterToDelete, setNewsletterToDelete] = useState<Item | null>(null);
  
  // Blogs state
  const [blogs, setBlogs] = useState<Item[]>([]);
  const [loadingBlogs, setLoadingBlogs] = useState(false);
  const [blogsPage, setBlogsPage] = useState(1);
  const [blogsTotalPages, setBlogsTotalPages] = useState(1);
  const [blogsTotalItems, setBlogsTotalItems] = useState(0);
  const [editingBlog, setEditingBlog] = useState<Item | null>(null);
  const [showBlogEditView, setShowBlogEditView] = useState(false);
  const [deleteBlogDialogOpen, setDeleteBlogDialogOpen] = useState(false);
  const [blogToDelete, setBlogToDelete] = useState<Item | null>(null);
  
  // Applications state
  const [applications, setApplications] = useState<Item[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [applicationsPage, setApplicationsPage] = useState(1);
  const [applicationsTotalPages, setApplicationsTotalPages] = useState(1);
  const [applicationsTotalItems, setApplicationsTotalItems] = useState(0);
  const [editingApplication, setEditingApplication] = useState<Item | null>(null);
  const [showApplicationEditView, setShowApplicationEditView] = useState(false);
  const [deleteApplicationDialogOpen, setDeleteApplicationDialogOpen] = useState(false);
  const [applicationToDelete, setApplicationToDelete] = useState<Item | null>(null);
  const [applicationSearchQuery, setApplicationSearchQuery] = useState("");
  const [applicationStatusFilter, setApplicationStatusFilter] = useState<string>("all");
  const [applicationTypeFilter, setApplicationTypeFilter] = useState<string>("all");
  const [customStatusesConfig, setCustomStatusesConfig] = useState<CustomStatusesConfig>({});
  
  // Members state
  const [members, setMembers] = useState<Customer[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersPage, setMembersPage] = useState(1);
  const [membersTotalPages, setMembersTotalPages] = useState(1);
  const [membersTotalItems, setMembersTotalItems] = useState(0);
  const [editingMember, setEditingMember] = useState<Customer | null>(null);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberRoleFilter, setMemberRoleFilter] = useState<string>("all");
  const [memberStatusFilter, setMemberStatusFilter] = useState<string>("all");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [bulkActionRole, setBulkActionRole] = useState<string>("");
  const [bulkActionStatus, setBulkActionStatus] = useState<string>("");
  const [showMemberDetailView, setShowMemberDetailView] = useState(false);
  const [memberDetailTab, setMemberDetailTab] = useState("details");
  const [memberCommunications, setMemberCommunications] = useState<any[]>([]);
  const [loadingCommunications, setLoadingCommunications] = useState(false);
  const [expandedMemberComms, setExpandedMemberComms] = useState<Set<string>>(new Set());
  const [membershipBookings, setMembershipBookings] = useState<MembershipBookingItem[]>([]);
  const [allCommunications, setAllCommunications] = useState<any[]>([]);
  const [loadingAllCommunications, setLoadingAllCommunications] = useState(false);
  const [allCommunicationsPage, setAllCommunicationsPage] = useState(1);
  const [allCommunicationsTotalPages, setAllCommunicationsTotalPages] = useState(1);
  const [expandedAllComms, setExpandedAllComms] = useState<Set<string>>(new Set());
  const [revealedMemberIds, setRevealedMemberIds] = useState<Set<string>>(new Set());
  
  // Helper functions to mask member info
  const maskName = (fullName: string | undefined): string => {
    if (!fullName) return 'Unknown';
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return parts[0];
    const firstName = parts[0];
    const lastInitial = parts[parts.length - 1]?.[0] || '';
    return `${firstName} ${lastInitial}.`;
  };
  
  const maskEmail = (email: string | undefined): string => {
    if (!email) return '';
    const [localPart, domain] = email.split('@');
    if (!domain) return email;
    const visibleChars = Math.min(3, localPart.length);
    return `${localPart.slice(0, visibleChars)}***@${domain}`;
  };
  
  const toggleMemberReveal = (memberId: string) => {
    setRevealedMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };
  
  // Leads state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadsPage, setLeadsPage] = useState(1);
  const [leadsTotalPages, setLeadsTotalPages] = useState(1);
  const [leadsTotalItems, setLeadsTotalItems] = useState(0);
  const [leadSearchQuery, setLeadSearchQuery] = useState("");
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>("all");
  const [leadFilterNew, setLeadFilterNew] = useState<boolean>(true);
  const [debouncedLeadSearch, setDebouncedLeadSearch] = useState("");
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploadProgress, setCsvUploadProgress] = useState<{ total: number; processed: number; errors: string[] } | null>(null);
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showLeadEditView, setShowLeadEditView] = useState(false);
  const [deleteLeadDialogOpen, setDeleteLeadDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [bulkAssignToCampaignDialogOpen, setBulkAssignToCampaignDialogOpen] = useState(false);
  const [bulkAssigningLeads, setBulkAssigningLeads] = useState(false);
  const [bulkAssignProgress, setBulkAssignProgress] = useState<{ total: number; processed: number; errors: string[] } | null>(null);
  
  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);
  const [ordersTotalItems, setOrdersTotalItems] = useState(0);
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [orderBookingTypeFilter, setOrderBookingTypeFilter] = useState<string>("all");
  const [orderDateRange, setOrderDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [orderStatusFilters, setOrderStatusFilters] = useState<Set<string>>(new Set());
  const [orderItemTypeFilter, setOrderItemTypeFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [orderNotes, setOrderNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [deleteOrderDialogOpen, setDeleteOrderDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
  const [bulkDeleteOrderDialogOpen, setBulkDeleteOrderDialogOpen] = useState(false);
  const [isBulkDeletingOrders, setIsBulkDeletingOrders] = useState(false);
  const [showDeletedOrders, setShowDeletedOrders] = useState(false);
  const [orderBookingSlugFilter, setOrderBookingSlugFilter] = useState("");
  const [orderBookingTypeOptions, setOrderBookingTypeOptions] = useState<Array<{ booking_types: string; bookings: number; booking_status: string[] }>>([]);
  const [orderItemTypeOptions, setOrderItemTypeOptions] = useState<Array<{ booking_items: string; bookings: number; price: number; quantity: number }>>([]);
  const [loadingOrderAnalytics, setLoadingOrderAnalytics] = useState(false);
  
  // CSV Export state
  const [isDownloadingCSV, setIsDownloadingCSV] = useState(false);
  
  // Tasks state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [tasksPage, setTasksPage] = useState(1);
  const [tasksTotalPages, setTasksTotalPages] = useState(1);
  const [tasksTotalItems, setTasksTotalItems] = useState(0);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showTaskEditView, setShowTaskEditView] = useState(false);
  const [deleteTaskDialogOpen, setDeleteTaskDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [taskSearchQuery, setTaskSearchQuery] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>("all");
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>("all");
  const [taskAssigneeFilter, setTaskAssigneeFilter] = useState<string>("all");
  
  // Sidebar counts from dashboard analytics (single source of truth)
  const [sidebarCounts, setSidebarCounts] = useState<{
    orders: number;
    ordersNew: number;
    leads: number;
    leadsNew: number;
    members: number;
    membersNew: number;
    tasks: number;
    tasksNew: number;
    applications: number;
    applicationsNew: number;
  }>({
    orders: 0,
    ordersNew: 0,
    leads: 0,
    leadsNew: 0,
    members: 0,
    membersNew: 0,
    tasks: 0,
    tasksNew: 0,
    applications: 0,
    applicationsNew: 0,
  });
  const [taskViewMode, setTaskViewMode] = useState<"list" | "kanban">("list");
  
  const editForm = useForm({
    defaultValues: {
      title: '',
      description: '',
      tags: '',
    }
  });

  // Map sidebar items to their corresponding admin modules - organized by function
  const sidebarItemsConfig = [
    // Overview
    { title: "Dashboard", value: "dashboard", icon: LayoutDashboard, module: ADMIN_MODULES.ADMIN_DASHBOARD, group: "overview" },
    
    // Content Types (Item definitions)
    { title: "Events", value: "events", icon: Calendar, module: ADMIN_MODULES.ADMIN_EVENTS, group: "content" },
    { title: "Classes", value: "classes", icon: GraduationCap, module: ADMIN_MODULES.ADMIN_CLASSES, group: "content" },
    { title: "Applications", value: "applications", icon: Code, module: ADMIN_MODULES.ADMIN_APPLICATIONS, group: "content" },
    { title: "Raffles", value: "raffles", icon: Ticket, module: ADMIN_MODULES.ADMIN_RAFFLES, group: "content" },
    { title: "Donations", value: "donations", icon: Heart, module: ADMIN_MODULES.ADMIN_DONATIONS, group: "content" },
    { title: "Newsletters", value: "newsletter", icon: Mail, module: ADMIN_MODULES.ADMIN_NEWSLETTER, group: "content" },
    { title: "Blogs", value: "blogs", icon: FileText, module: ADMIN_MODULES.ADMIN_BLOGS, group: "content" },
    
    // Operations (Runtime/Transactions)
    { title: "Orders", value: "orders", icon: ShoppingCart, module: ADMIN_MODULES.ADMIN_ORDERS, group: "operations" },
    { title: "All Applications", value: "all-applications", icon: ClipboardList, module: ADMIN_MODULES.ADMIN_VENDORS, group: "operations" },
    { title: "Leads", value: "leads", icon: UserPlus, module: ADMIN_MODULES.ADMIN_LEADS, group: "operations" },
    { title: "Members", value: "members", icon: Users, module: ADMIN_MODULES.ADMIN_MEMBERS, group: "operations" },
    { title: "Tasks", value: "tasks", icon: ClipboardList, module: ADMIN_MODULES.ADMIN_TASKS, group: "operations" },
    { title: "Communications", value: "communications", icon: MessageSquare, module: ADMIN_MODULES.ADMIN_COMMUNICATIONS, group: "operations" },
    { title: "Marketing", value: "campaign-leads", icon: Target, module: ADMIN_MODULES.ADMIN_MARKETING, group: "operations" },
    
    // Directory (Entities)
    { title: "Vendors", value: "vendors", icon: Store, module: ADMIN_MODULES.ADMIN_VENDORS, group: "directory" },
    { title: "Sponsors", value: "sponsors", icon: Megaphone, module: ADMIN_MODULES.ADMIN_SPONSORS, group: "directory" },
    
    // System
    { title: "Images", value: "images", icon: Image, module: ADMIN_MODULES.ADMIN_IMAGES, group: "system" },
    { title: "Automations", value: "automations", icon: Zap, module: ADMIN_MODULES.ADMIN_AUTOMATIONS, group: "system" },
    { title: "Settings", value: "settings", icon: Settings, module: ADMIN_MODULES.ADMIN_SETTINGS, group: "system" },
  ];

  // Get user's role from customer data
  const realUserRole = customer?._customer_role?.role as Role | undefined;
  
  // Get impersonation context
  const { state: impersonationState, getEffectiveRole, startMemberImpersonation } = useImpersonation();
  
  // Use effective role (impersonated or real)
  const userRole = getEffectiveRole(realUserRole);

  // Filter sidebar items based on role permissions
  const sidebarItems = useMemo(() => {
    return sidebarItemsConfig.filter(item => hasAdminModuleAccess(userRole, item.module));
  }, [userRole]);

  // Set active tab to first accessible module when role changes
  useEffect(() => {
    if (sidebarItems.length > 0 && !sidebarItems.find(item => item.value === activeTab)) {
      setActiveTab(sidebarItems[0].value);
    }
  }, [sidebarItems, activeTab]);

  // Helper function to get communication type styling
  const getCommunicationTypeStyle = (type: string) => {
    const lowerType = type.toLowerCase();
    
    if (lowerType.includes('email') || lowerType.includes('postmark')) {
      return {
        variant: 'default' as const,
        icon: Mail,
        label: 'Email',
        className: 'bg-blue-500/10 text-blue-600 border-blue-200'
      };
    }
    
    if (lowerType.includes('sms') || lowerType.includes('text')) {
      return {
        variant: 'default' as const,
        icon: MessageSquare,
        label: 'SMS',
        className: 'bg-green-500/10 text-green-600 border-green-200'
      };
    }
    
    if (lowerType.includes('phone') || lowerType.includes('call')) {
      return {
        variant: 'default' as const,
        icon: Phone,
        label: 'Phone',
        className: 'bg-purple-500/10 text-purple-600 border-purple-200'
      };
    }
    
    if (lowerType.includes('notification') || lowerType.includes('push')) {
      return {
        variant: 'default' as const,
        icon: Bell,
        label: 'Notification',
        className: 'bg-orange-500/10 text-orange-600 border-orange-200'
      };
    }
    
    return {
      variant: 'secondary' as const,
      icon: Send,
      label: type || 'System',
      className: 'bg-gray-500/10 text-gray-600 border-gray-200'
    };
  };

  // Helper function to handle admin API errors
  const handleAdminAPIError = (error: any, defaultMessage: string = "An error occurred") => {
    console.error('Admin API error:', error);
    
    // Check if it's an authentication error
    if (error?.code === 'AUTH_REQUIRED') {
      toast({
        title: "Authentication Required",
        description: "Please sign in to access admin features",
        variant: "destructive",
      });
      navigate('/sign-up');
      return true; // Indicates auth error was handled
    }
    
    // Show default error message
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : defaultMessage,
      variant: "destructive",
    });
    return false; // Indicates regular error
  };

  // Track user ID for signout
  useEffect(() => {
    if (user?.id) {
      userIdRef.current = user.id;
    }
  }, [user?.id]);

  // Detect signout and call Elegant API
  useEffect(() => {
    if (previousSignedInRef.current && !isSignedIn && userIdRef.current) {
      elegantAPI.signOutCustomer(userIdRef.current).catch((error) => {
        console.error("Failed to sign out from Elegant API:", error);
      });
    }
    
    previousSignedInRef.current = isSignedIn;
  }, [isSignedIn]);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate('/sign-in');
    }
  }, [isLoaded, isSignedIn, navigate]);

  useEffect(() => {
    const fetchCustomer = async () => {
      if (user?.id) {
        setIsLoadingCustomer(true);
        try {
          // First check shop testmode and load custom statuses
          const shopData = await adminAPI.getShop(user.id);
          setIsTestMode(shopData.testmode);
          if (shopData._franchisor?.id) {
            setFranchisorId(shopData._franchisor.id);
          }
          
          // Load custom statuses config from shop settings
          const savedStatusesConfig = shopData._shop_info?.shops_settings?.custom_statuses_config;
          if (savedStatusesConfig && typeof savedStatusesConfig === 'object') {
            setCustomStatusesConfig(savedStatusesConfig);
          } else {
            // Migrate old custom_application_statuses if present
            const oldApplicationStatuses = shopData._shop_info?.shops_settings?.custom_application_statuses;
            if (oldApplicationStatuses && Array.isArray(oldApplicationStatuses)) {
              setCustomStatusesConfig({ Application: oldApplicationStatuses });
            }
          }

          const customerData = await elegantAPI.getCustomer(user.id);
          
          // Check if user has any admin module access (not just admin role)
          const userRoleFromApi = customerData.customer._customer_role?.role as Role | undefined;
          const hasAnyAdminAccess = userRoleFromApi && sidebarItemsConfig.some(item => 
            hasAdminModuleAccess(userRoleFromApi, item.module)
          );
          
          if (!hasAnyAdminAccess) {
            toast({
              title: "Access Denied",
              description: "You do not have permission to access the admin dashboard",
              variant: "destructive",
            });
            navigate('/');
            return;
          }
          
          setCustomer(customerData.customer);
        } catch (error: any) {
          console.error("Failed to fetch customer data:", error);
          
          // Check if it's an authentication error
          if (error?.code === 'AUTH_REQUIRED') {
            toast({
              title: "Authentication Required",
              description: "Please sign in to access admin features",
              variant: "destructive",
            });
            navigate('/sign-up');
            return;
          }
          
          toast({
            title: "Error",
            description: "Failed to fetch customer data from Elegant API",
            variant: "destructive",
          });
        } finally {
          setIsLoadingCustomer(false);
        }
      }
    };

    if (isLoaded && isSignedIn && user) {
      fetchCustomer();
    }
  }, [isLoaded, isSignedIn, user, toast, navigate]);

  // Fetch dashboard analytics once on load for sidebar counts (single API call)
  useEffect(() => {
    const fetchSidebarAnalytics = async () => {
      if (!user?.id || !customer) return;
      
      try {
        const analytics = await adminAPI.getDashboardAnalytics(user.id);
        
        // Extract counts from analytics response
        const metrics = analytics.metrics;
        
        // Calculate total tasks from status breakdown
        const taskTotal = metrics?.tasks?.total?.reduce((sum, t) => sum + (t.tasks_count || 0), 0) || 0;
        const taskNew = metrics?.tasks?.new_total?.reduce((sum, t) => sum + (t.tasks_count || 0), 0) || 0;
        
        // Get vendor applications count from booking types
        const vendorBookingType = metrics?.bookings?.total_booking_types?.find(
          (bt) => bt.booking_types?.toLowerCase() === 'vendor'
        );
        const applicationsTotal = vendorBookingType?.bookings || 0;
        
        setSidebarCounts({
          orders: metrics?.bookings?.total || 0,
          ordersNew: metrics?.bookings?.new || 0,
          leads: metrics?.leads?.total || 0,
          leadsNew: metrics?.leads?.new || 0,
          members: metrics?.customers?.total || 0,
          membersNew: metrics?.customers?.new || 0,
          tasks: taskTotal,
          tasksNew: taskNew,
          applications: applicationsTotal,
          applicationsNew: 0, // API doesn't provide new vendor applications specifically
        });
        
        // Also set order filter options while we have the data
        const bookingTypes = metrics?.bookings?.total_booking_types || [];
        setOrderBookingTypeOptions(bookingTypes.filter((b: any) => b.booking_types && b.booking_types.trim() !== ''));
        
        const itemTypes = metrics?.bookings?.total_booking_items || [];
        setOrderItemTypeOptions(itemTypes.filter((i: any) => i.booking_items && i.booking_items.trim() !== ''));
      } catch (error) {
        console.error('Failed to fetch sidebar analytics:', error);
      }
    };
    
    fetchSidebarAnalytics();
  }, [user?.id, customer]);

  const fetchMediaItems = async (page: number = 1) => {
    if (!user?.id) return;

    setIsLoadingMedia(true);
    try {
      const response = await adminAPI.getMediaFiles(user.id, page, 12);
      setMediaItems(response.items);
      setMediaTotalPages(response.pageTotal || 1);
    } catch (error: any) {
      console.error('Failed to fetch media:', error);
      
      // Check if it's an authentication error
      if (error?.code === 'AUTH_REQUIRED') {
        toast({
          title: "Authentication Required",
          description: "Please sign in to access admin features",
          variant: "destructive",
        });
        navigate('/sign-up');
        return;
      }
      
      toast({
        title: "Failed to load media",
        description: error instanceof Error ? error.message : "Could not load media files",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMedia(false);
    }
  };

  const handleMediaClick = (item: MediaFile) => {
    if (!isSignedIn) {
      toast({
        title: "Login Required",
        description: "Please sign in to edit media files",
      });
      navigate("/sign-in");
      return;
    }
    setSelectedMedia(item);
    editForm.reset({
      title: '',
      description: '',
      tags: '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdateMedia = async (data: any) => {
    if (!user || !selectedMedia || !customer) return;

    try {
      console.log('Updating media with ID:', selectedMedia.id);
      
      // Send title, description, tags and required modified_by_id
      const updatePayload = {
        title: data.title || "",
        description: data.description || "",
        tags: data.tags || "",
        modified_by_id: customer.id,
      };
      
      await adminAPI.updateMediaFile(
        selectedMedia.id,
        updatePayload,
        user.id
      );

      toast({
        title: "Success",
        description: "Media file updated successfully",
      });

      setEditDialogOpen(false);
      fetchMediaItems();
    } catch (error) {
      console.error('Failed to update media:', error);
      toast({
        title: "Error",
        description: "Failed to update media file",
        variant: "destructive",
      });
    }
  };

  const fetchEvents = async (page: number = 1) => {
    if (!user?.id) return;

    setLoadingEvents(true);
    try {
      // Pass customers_id for non-admin roles to filter by owner
      const customersId = userRole !== 'admin' ? customer?.id : undefined;
      const response = await adminAPI.getItems(user.id, page, 25, 'Event', customersId);
      
      // Auto-disable events older than today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const eventsToDisable = response.items.filter((evt: any) => {
        if (evt.Is_disabled) return false; // Already disabled
        const startDate = evt.item_info?.startDate;
        if (!startDate) return false;
        const eventDate = new Date(startDate);
        return eventDate < today;
      });
      
      // Patch outdated events to disable them
      if (eventsToDisable.length > 0) {
        await Promise.all(
          eventsToDisable.map((evt: any) =>
            adminAPI.updateItem(evt.id, { Is_disabled: true }, user.id)
          )
        );
        
        // Update local state to reflect disabled events
        response.items = response.items.map((evt: any) => {
          if (eventsToDisable.some((e: any) => e.id === evt.id)) {
            return { ...evt, Is_disabled: true };
          }
          return evt;
        });
      }
      
      setEvents(response.items);
      setCurrentPage(response.curPage);
      setTotalPages(response.pageTotal);
      setTotalItems(response.itemsTotal);
    } catch (error: any) {
      console.error('Failed to fetch events:', error);
      
      if (error?.code === 'AUTH_REQUIRED') {
        toast({
          title: "Authentication Required",
          description: "Please sign in to access admin features",
          variant: "destructive",
        });
        navigate('/sign-up');
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive",
      });
    } finally {
      setLoadingEvents(false);
    }
  };

  const fetchClasses = async (page: number = 1) => {
    if (!user?.id) return;

    setLoadingClasses(true);
    try {
      // Pass customers_id for non-admin roles to filter by owner
      const customersId = userRole !== 'admin' ? customer?.id : undefined;
      const response = await adminAPI.getItems(user.id, page, 25, 'Classes', customersId);
      
      // Auto-disable classes older than today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const classesToDisable = response.items.filter((cls: any) => {
        if (cls.Is_disabled) return false; // Already disabled
        const startDate = cls.item_info?.startDate;
        if (!startDate) return false;
        const classDate = new Date(startDate);
        return classDate < today;
      });
      
      // Patch outdated classes to disable them
      if (classesToDisable.length > 0) {
        await Promise.all(
          classesToDisable.map((cls: any) =>
            adminAPI.updateItem(cls.id, { Is_disabled: true }, user.id)
          )
        );
        
        // Update local state to reflect disabled classes
        response.items = response.items.map((cls: any) => {
          if (classesToDisable.some((c: any) => c.id === cls.id)) {
            return { ...cls, Is_disabled: true };
          }
          return cls;
        });
      }
      
      setClasses(response.items);
      setClassesPage(response.curPage);
      setClassesTotalPages(response.pageTotal);
      setClassesTotalItems(response.itemsTotal);
    } catch (error: any) {
      console.error('Failed to fetch classes:', error);
      
      if (error?.code === 'AUTH_REQUIRED') {
        toast({
          title: "Authentication Required",
          description: "Please sign in to access admin features",
          variant: "destructive",
        });
        navigate('/sign-up');
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to load classes",
        variant: "destructive",
      });
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchVendors = async (page: number = 1) => {
    if (!user?.id) return;

    setLoadingVendors(true);
    try {
      // Pass customers_id for non-admin roles to filter by owner
      const customersId = userRole !== 'admin' ? customer?.id : undefined;
      const response = await adminAPI.getItems(user.id, page, 25, 'Vendors', customersId);
      setVendors(response.items);
      setVendorsPage(response.curPage);
      setVendorsTotalPages(response.pageTotal);
      setVendorsTotalItems(response.itemsTotal);
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
      toast({
        title: "Error",
        description: "Failed to load vendors",
        variant: "destructive",
      });
    } finally {
      setLoadingVendors(false);
    }
  };

  const fetchVendorApplications = async (page: number = 1, status?: string, search?: string) => {
    if (!user?.id) return;

    setLoadingVendorApplications(true);
    try {
      // Use status filter - pass undefined for 'all' to get all statuses
      const statusValue = status === 'all' ? undefined : status;
      const searchValue = search?.trim() || undefined;
      const response = await adminAPI.getVendorApplications(user.id, page, 25, statusValue, searchValue);
      
      setVendorApplications(response.items || []);
      setVendorApplicationsPage(response.curPage || 1);
      setVendorApplicationsTotalPages(response.pageTotal || 1);
      setVendorApplicationsTotalItems(response.itemsTotal || 0);
    } catch (error) {
      console.error('Failed to fetch vendor applications:', error);
      toast({
        title: "Error",
        description: "Failed to load vendor applications",
        variant: "destructive",
      });
      setVendorApplications([]);
    } finally {
      setLoadingVendorApplications(false);
    }
  };

  // Fetch all applications (no booking_type filter)
  const fetchAllApplications = async (
    page: number = 1, 
    options?: {
      status?: string;
      search?: string;
      checkoutType?: string;
      paymentStatus?: string;
      bookingType?: string;
      itemsType?: string;
      startDate?: string;
      endDate?: string;
      isDeleted?: boolean;
    }
  ) => {
    if (!user?.id) return;

    setLoadingAllApplications(true);
    try {
      const perPage = allApplicationsPerPage;
      const response = await adminAPI.getOrders(user.id, page, perPage, {
        status: options?.status === 'all' ? undefined : options?.status,
        search: options?.search?.trim() || undefined,
        checkoutType: options?.checkoutType === 'all' ? undefined : options?.checkoutType,
        paymentStatus: options?.paymentStatus === 'all' ? undefined : options?.paymentStatus,
        bookingType: options?.bookingType === 'all' ? undefined : options?.bookingType,
        itemsType: options?.itemsType === 'all' ? undefined : options?.itemsType,
        startDate: options?.startDate,
        endDate: options?.endDate,
        isDeleted: options?.isDeleted,
      });
      
      setAllApplications(response.items || []);
      setAllApplicationsPage(response.curPage || 1);
      setAllApplicationsTotalPages(response.pageTotal || 1);
      setAllApplicationsTotalItems(response.itemsTotal || 0);
      setSelectedApplications(new Set()); // Clear selection when filters change
    } catch (error) {
      console.error('Failed to fetch all applications:', error);
      toast({
        title: "Error",
        description: "Failed to load applications",
        variant: "destructive",
      });
      setAllApplications([]);
    } finally {
      setLoadingAllApplications(false);
    }
  };

  // Helper to get current filter options for All Applications
  const getAllApplicationsFilterOptions = () => ({
    status: allApplicationsStatusFilter,
    search: allApplicationsSearchQuery,
    checkoutType: allApplicationsCheckoutTypeFilter,
    paymentStatus: allApplicationsPaymentStatusFilter,
    bookingType: allApplicationsBookingTypeFilter,
    itemsType: allApplicationsItemsTypeFilter,
    startDate: allApplicationsDateRange.from ? format(allApplicationsDateRange.from, 'yyyy-MM-dd') : undefined,
    endDate: allApplicationsDateRange.to ? format(allApplicationsDateRange.to, 'yyyy-MM-dd') : undefined,
    isDeleted: showDeletedAllApplications,
  });

  // Toggle application selection
  const toggleApplicationSelection = (applicationId: number) => {
    setSelectedApplications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(applicationId)) {
        newSet.delete(applicationId);
      } else {
        newSet.add(applicationId);
      }
      return newSet;
    });
  };

  // Toggle all applications selection
  const toggleAllApplicationsSelection = () => {
    if (selectedApplications.size === allApplications.length) {
      setSelectedApplications(new Set());
    } else {
      setSelectedApplications(new Set(allApplications.map(app => app.id)));
    }
  };

  // Bulk assign applications to campaign
  const handleBulkAssignApplicationsToCampaign = async () => {
    const campaignToUse = selectedCampaignForApplicationsAssign;
    if (!user?.id || !campaignToUse || selectedApplications.size === 0) return;

    setBulkAssigningApplications(true);
    setBulkAssignApplicationsProgress({ total: selectedApplications.size, processed: 0, errors: [] });
    
    const applicationIds = Array.from(selectedApplications);
    const errors: string[] = [];
    const successfulAssignments: Array<{ appId: number; campaignsId: string }> = [];
    
    for (let i = 0; i < applicationIds.length; i++) {
      const appId = applicationIds[i];
      const app = allApplications.find(a => a.id === appId);
      const leadsId = app?.leads_id;
      
      if (!leadsId) {
        const errorMsg = app?._leads?.email || `Application #${appId}`;
        errors.push(`${errorMsg} (no lead)`);
        setBulkAssignApplicationsProgress(prev => prev ? { 
          ...prev, 
          processed: i + 1, 
          errors: [...prev.errors, `${errorMsg} (no lead)`] 
        } : null);
        continue;
      }
      
      try {
        const result = await adminAPI.assignLeadToCampaign(
          campaignToUse.id,
          leadsId,
          user.id
        );
        // Track successful assignment with the returned campaigns_id
        successfulAssignments.push({ 
          appId, 
          campaignsId: result?.id ? String(result.id) : `temp-${appId}` 
        });
        setBulkAssignApplicationsProgress(prev => prev ? { ...prev, processed: i + 1 } : null);
      } catch (error) {
        console.error(`Failed to assign application ${appId} to campaign:`, error);
        const errorMsg = app?._leads?.email || `Application #${appId}`;
        errors.push(errorMsg);
        setBulkAssignApplicationsProgress(prev => prev ? { 
          ...prev, 
          processed: i + 1, 
          errors: [...prev.errors, errorMsg] 
        } : null);
      }
      // Small delay between requests
      if (i < applicationIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    setBulkAssigningApplications(false);
    
    // Update client-side tracking for successful assignments
    if (successfulAssignments.length > 0) {
      setApplicationsInCampaign(prev => {
        const newMap = new Map(prev);
        successfulAssignments.forEach(({ appId, campaignsId }) => {
          newMap.set(appId, {
            campaignId: campaignToUse.id,
            campaignName: campaignToUse.title || `Campaign #${campaignToUse.id}`,
            campaignsId
          });
        });
        return newMap;
      });
    }
    
    if (errors.length === 0) {
      toast({
        title: "Success",
        description: `${applicationIds.length} application(s) assigned to campaign successfully`,
      });
      setBulkAssignApplicationsToCampaignDialogOpen(false);
      setSelectedCampaignForApplicationsAssign(null);
      setSelectedApplications(new Set());
      setBulkAssignApplicationsProgress(null);
    } else if (errors.length < applicationIds.length) {
      toast({
        title: "Partial Success",
        description: `${applicationIds.length - errors.length} of ${applicationIds.length} applications assigned. ${errors.length} failed.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to assign applications to campaign",
        variant: "destructive",
      });
    }
  };

  // Handle removing application from campaign
  const handleRemoveFromCampaignClick = (appId: number, campaignName: string, campaignsId: string) => {
    setApplicationToRemoveFromCampaign({ appId, campaignName, campaignsId });
    setRemoveFromCampaignDialogOpen(true);
  };

  const handleRemoveFromCampaignConfirm = async () => {
    if (!applicationToRemoveFromCampaign || !user?.id) return;

    setRemovingFromCampaign(true);
    try {
      await adminAPI.deleteCampaignLead(applicationToRemoveFromCampaign.campaignsId, user.id);
      
      // Remove from client-side tracking
      setApplicationsInCampaign(prev => {
        const newMap = new Map(prev);
        newMap.delete(applicationToRemoveFromCampaign.appId);
        return newMap;
      });
      
      toast({
        title: "Success",
        description: "Application removed from campaign",
      });
      setRemoveFromCampaignDialogOpen(false);
      setApplicationToRemoveFromCampaign(null);
    } catch (error) {
      console.error('Failed to remove from campaign:', error);
      toast({
        title: "Error",
        description: "Failed to remove application from campaign",
        variant: "destructive",
      });
    } finally {
      setRemovingFromCampaign(false);
    }
  };

  // Export all applications to CSV
  const handleExportAllApplicationsCSV = async () => {
    if (!user?.id) return;
    
    setExportingAllApplications(true);
    try {
      // Fetch all applications with current filters (up to 1000)
      const allApps: any[] = [];
      let page = 1;
      let hasMore = true;
      const statusValue = allApplicationsStatusFilter === 'all' ? undefined : allApplicationsStatusFilter;
      const searchValue = allApplicationsSearchQuery.trim() || undefined;
      
      while (hasMore && page <= 40) { // Max 40 pages * 25 = 1000 records
        const response = await adminAPI.getOrders(user.id, page, 25, {
          status: statusValue,
          search: searchValue,
        });
        allApps.push(...(response.items || []));
        hasMore = response.nextPage !== null && (response.items?.length || 0) === 25;
        page++;
      }
      
      // Helper function to safely get string value
      const getStringValue = (val: any): string => typeof val === 'string' ? val : '';
      
      // Build CSV headers
      const headers = [
        'ID',
        'Date',
        'Applicant Name',
        'Email',
        'Phone',
        'Type',
        'Status',
        'Payment Status',
        'Checkout Type',
        'Amount',
        'Booking Slug'
      ];
      
      // Build CSV rows
      const rows = allApps.map(app => {
        const leads = app._leads;
        const leadPayload = leads?.lead_payload || app.lead_payload || {};
        const bookingInfo = app.booking_info || {};
        const bookingItems = app._booking_items?.items || app._booking_items_of_bookings?.items || [];
        const firstBookingItem = bookingItems[0];
        const itemInfo = firstBookingItem?._items;
        
        const leadFirstName = getStringValue(leadPayload.first_name) || getStringValue(leadPayload.firstName);
        const leadLastName = getStringValue(leadPayload.last_name) || getStringValue(leadPayload.lastName);
        const fullNameFromParts = [leadFirstName, leadLastName].filter(Boolean).join(' ');
        const fullLeadName = getStringValue(leads?.name) || fullNameFromParts ||
          getStringValue(leadPayload.name) || getStringValue(leadPayload.full_name) ||
          getStringValue(bookingInfo.name) || getStringValue(bookingInfo.full_name) ||
          getStringValue(app._customers?.Full_name) || 'Unknown';
        const leadEmail = getStringValue(leads?.email) || getStringValue(leadPayload.email) || 
          getStringValue(bookingInfo.email) || '';
        const leadPhone = getStringValue(leadPayload.phone) || getStringValue(leadPayload.mobile) || 
          getStringValue(leadPayload.mobile_number) || getStringValue(bookingInfo.phone) || '';
        const bookingType = getStringValue(app.booking_type) || getStringValue(itemInfo?.item_type) || '';
        const statusValue = typeof app.status === 'string' ? app.status : '';
        const paymentStatusValue = typeof app.payment_status === 'string' ? app.payment_status : 'Pending';
        const checkoutType = typeof app.checkout_type === 'string' ? app.checkout_type : 'Cash/Check';
        const totalAmount = typeof app.total_amount === 'number' ? app.total_amount : 
          bookingItems.reduce((sum: number, item: any) => sum + (typeof item.price === 'number' ? item.price : 0), 0);
        const bookingSlug = getStringValue(app.booking_slug);
        
        return [
          app.id,
          new Date(app.created_at).toLocaleDateString(),
          fullLeadName,
          leadEmail,
          leadPhone,
          bookingType,
          statusValue,
          paymentStatusValue,
          checkoutType,
          totalAmount.toFixed(2),
          bookingSlug
        ].map(val => {
          const str = String(val || '');
          // Escape CSV values
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',');
      });
      
      const csvContent = [headers.join(','), ...rows].join('\n');
      
      // Download the CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().split('T')[0];
      
      link.setAttribute('href', url);
      link.setAttribute('download', `all-applications-${timestamp}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Complete",
        description: `Exported ${allApps.length} applications to CSV`,
      });
    } catch (error) {
      console.error('Failed to export applications:', error);
      toast({
        title: "Error",
        description: "Failed to export applications to CSV",
        variant: "destructive",
      });
    } finally {
      setExportingAllApplications(false);
    }
  };

  // Export selected applications to CSV
  const handleExportSelectedApplicationsCSV = () => {
    if (selectedApplications.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select applications to export",
        variant: "destructive",
      });
      return;
    }

    const selectedApps = allApplications.filter(app => selectedApplications.has(app.id));
    
    // Helper function to safely get string value
    const getStringValue = (val: any): string => typeof val === 'string' ? val : '';
    
    // Build CSV headers
    const headers = [
      'ID',
      'Date',
      'Applicant Name',
      'Email',
      'Phone',
      'Type',
      'Status',
      'Payment Status',
      'Checkout Type',
      'Amount',
      'Booking Slug'
    ];
    
    // Build CSV rows
    const rows = selectedApps.map(app => {
      const leads = app._leads;
      const leadPayload = leads?.lead_payload || app.lead_payload || {};
      const bookingInfo = app.booking_info || {};
      const bookingItems = app._booking_items?.items || app._booking_items_of_bookings?.items || [];
      const firstBookingItem = bookingItems[0];
      const itemInfo = firstBookingItem?._items;
      
      const leadFirstName = getStringValue(leadPayload.first_name) || getStringValue(leadPayload.firstName);
      const leadLastName = getStringValue(leadPayload.last_name) || getStringValue(leadPayload.lastName);
      const fullNameFromParts = [leadFirstName, leadLastName].filter(Boolean).join(' ');
      const fullLeadName = getStringValue(leads?.name) || fullNameFromParts ||
        getStringValue(leadPayload.name) || getStringValue(leadPayload.full_name) ||
        getStringValue(bookingInfo.name) || getStringValue(bookingInfo.full_name) ||
        getStringValue(app._customers?.Full_name) || 'Unknown';
      const leadEmail = getStringValue(leads?.email) || getStringValue(leadPayload.email) || 
        getStringValue(bookingInfo.email) || '';
      const leadPhone = getStringValue(leadPayload.phone) || getStringValue(leadPayload.mobile) || 
        getStringValue(leadPayload.mobile_number) || getStringValue(bookingInfo.phone) || '';
      const bookingType = getStringValue(app.booking_type) || getStringValue(itemInfo?.item_type) || '';
      const statusValue = typeof app.status === 'string' ? app.status : '';
      const paymentStatusValue = typeof app.payment_status === 'string' ? app.payment_status : 'Pending';
      const checkoutType = typeof app.checkout_type === 'string' ? app.checkout_type : 'Cash/Check';
      const totalAmount = typeof app.total_amount === 'number' ? app.total_amount : 
        bookingItems.reduce((sum: number, item: any) => sum + (typeof item.price === 'number' ? item.price : 0), 0);
      const bookingSlug = getStringValue(app.booking_slug);
      
      return [
        app.id,
        new Date(app.created_at).toLocaleDateString(),
        fullLeadName,
        leadEmail,
        leadPhone,
        bookingType,
        statusValue,
        paymentStatusValue,
        checkoutType,
        totalAmount.toFixed(2),
        bookingSlug
      ].map(val => {
        const str = String(val || '');
        // Escape CSV values
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    // Download the CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().split('T')[0];
    
    link.setAttribute('href', url);
    link.setAttribute('download', `selected-applications-${timestamp}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: `Exported ${selectedApps.length} selected applications to CSV`,
    });
  };

  // Constants for page size options
  const ALL_APPLICATIONS_PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100, 250, 500, 1000];

  const handleViewApplication = async (application: any) => {
    setLoadingApplicationDetails(true);
    try {
      // Use booking_slug to fetch full application details via GET /applications/{slug}
      const bookingSlug = application.booking_slug;
      
      if (bookingSlug && user?.id) {
        // Fetch full application details from GET /applications/{slug}
        const applicationDetails = await adminAPI.getApplicationDetails(bookingSlug, user.id);
        
        // Form data is in _booking_items.items[0].booking_items_info
        const bookingItems = applicationDetails._booking_items?.items || [];
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
            title: firstBookingItem?._items?.title || application.booking_slug,
          },
        };
        setViewingApplication(enrichedApplication);
      } else {
        // No booking_slug available, show with existing data
        setViewingApplication(application);
      }
    } catch (error) {
      console.error('Failed to fetch application details:', error);
      // Show with existing data if fetch fails
      setViewingApplication(application);
    } finally {
      setLoadingApplicationDetails(false);
    }
  };

  const fetchVendorApplicationStatusCounts = async () => {
    if (!user?.id) return;
    
    const statuses = ['new', 'applied', 'pending', 'approved', 'rejected'];
    const counts: Record<string, number> = {};
    
    await Promise.all(
      statuses.map(async (status) => {
        try {
          const response = await adminAPI.getVendorApplications(user.id, 1, 1, status);
          counts[status] = response.itemsTotal || 0;
        } catch {
          counts[status] = 0;
        }
      })
    );
    
    setVendorApplicationStatusCounts(counts);
  };

  const handleUpdateApplicationStatus = async (applicationId: number, newStatus: string) => {
    if (!user?.id) return;
    
    try {
      await elegantAPI.patch(`/booking/${applicationId}`, {
        status: newStatus
      }, user.id);
      
      toast({
        title: "Status Updated",
        description: `Application status changed to ${newStatus}`,
      });
      
      // Refresh the applications list and status counts
      fetchVendorApplications(vendorApplicationsPage, vendorApplicationStatusFilter);
      fetchVendorApplicationStatusCounts();
    } catch (error) {
      console.error('Failed to update application status:', error);
      toast({
        title: "Error",
        description: "Failed to update application status",
        variant: "destructive",
      });
    }
  };

  // Helper to get application statuses (backward compatible)
  const getApplicationStatuses = () => getAllStatusesForType('Application', customStatusesConfig);
  const getApplicationFilterStatuses = () => getFilterStatusesForType('Application', customStatusesConfig);

  const fetchSponsors = async (page: number = 1) => {
    if (!user?.id) return;

    setLoadingSponsors(true);
    try {
      // Pass customers_id for non-admin roles to filter by owner
      const customersId = userRole !== 'admin' ? customer?.id : undefined;
      const response = await adminAPI.getItems(user.id, page, 25, 'AD', customersId);
      setSponsors(response.items);
      setSponsorsPage(response.curPage);
      setSponsorsTotalPages(response.pageTotal);
      setSponsorsTotalItems(response.itemsTotal);
    } catch (error) {
      console.error('Failed to fetch sponsors:', error);
      toast({
        title: "Error",
        description: "Failed to load sponsors",
        variant: "destructive",
      });
    } finally {
      setLoadingSponsors(false);
    }
  };

  const fetchCampaigns = async (page: number = 1) => {
    if (!user?.id) return;

    setLoadingCampaigns(true);
    try {
      // Pass customers_id for non-admin roles to filter by owner
      const customersId = userRole !== 'admin' ? customer?.id : undefined;
      const response = await adminAPI.getItems(user.id, page, 25, 'Campaign', customersId);
      setCampaigns(response.items);
      setCampaignsPage(response.curPage);
      setCampaignsTotalPages(response.pageTotal);
      setCampaignsTotalItems(response.itemsTotal);
      
      // Fetch lead counts for each campaign in parallel
      const countsMap = new Map<number, number>();
      await Promise.all(
        response.items.map(async (campaign) => {
          try {
            const leadsResponse = await adminAPI.getCampaignLeads(user.id, campaign.id, 1, 1);
            countsMap.set(campaign.id, leadsResponse.itemsTotal);
          } catch (error) {
            console.error(`Failed to fetch lead count for campaign ${campaign.id}:`, error);
            countsMap.set(campaign.id, 0);
          }
        })
      );
      setCampaignLeadCounts(countsMap);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      toast({
        title: "Error",
        description: "Failed to load campaigns",
        variant: "destructive",
      });
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const fetchDonations = async (page: number = 1) => {
    if (!user?.id) return;

    setLoadingDonations(true);
    try {
      // Pass customers_id for non-admin roles to filter by owner
      const customersId = userRole !== 'admin' ? customer?.id : undefined;
      const response = await adminAPI.getItems(user.id, page, 25, 'Donation', customersId);
      setDonations(response.items);
      setDonationsPage(response.curPage);
      setDonationsTotalPages(response.pageTotal);
      setDonationsTotalItems(response.itemsTotal);
    } catch (error) {
      console.error('Failed to fetch donations:', error);
      toast({
        title: "Error",
        description: "Failed to load donations",
        variant: "destructive",
      });
    } finally {
      setLoadingDonations(false);
    }
  };

  const fetchRaffles = async (page: number = 1) => {
    if (!user?.id) return;

    setLoadingRaffles(true);
    try {
      // Pass customers_id for non-admin roles to filter by owner
      const customersId = userRole !== 'admin' ? customer?.id : undefined;
      const response = await adminAPI.getItems(user.id, page, 25, 'Raffle', customersId);
      setRaffles(response.items);
      setRafflesPage(response.curPage);
      setRafflesTotalPages(response.pageTotal);
      setRafflesTotalItems(response.itemsTotal);
    } catch (error) {
      console.error('Failed to fetch raffles:', error);
      toast({
        title: "Error",
        description: "Failed to load raffles",
        variant: "destructive",
      });
    } finally {
      setLoadingRaffles(false);
    }
  };

  const fetchRaffleEntries = async (itemsId: number, page: number = 1) => {
    if (!user?.id) return;

    setLoadingRaffleEntries(true);
    try {
      // Fetch participants and winners in parallel
      const [entriesResponse, winnersResponse] = await Promise.all([
        adminAPI.getRaffleEntries(itemsId, user.id, page),
        adminAPI.getRaffleWinners(itemsId, user.id, 1)
      ]);
      
      const entries = entriesResponse.items || [];
      const winners = winnersResponse.items || [];
      
      setRaffleEntries(entries);
      setRaffleEntriesPage(entriesResponse.curPage || 1);
      setRaffleEntriesTotalPages(entriesResponse.pageTotal || 1);
      setRaffleEntriesTotalItems(entriesResponse.itemsTotal || 0);
      setRaffleWinners(winners);
    } catch (error) {
      console.error('Failed to fetch raffle entries:', error);
      toast({
        title: "Error",
        description: "Failed to load raffle entries",
        variant: "destructive",
      });
    } finally {
      setLoadingRaffleEntries(false);
    }
  };

  const handlePickWinner = async () => {
    if (!user?.id || !selectedRaffleForEntries) return;

    setPickingWinner(true);
    try {
      const winner = await adminAPI.pickRaffleWinner(selectedRaffleForEntries.id, user.id);
      
      // Trigger confetti celebration
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#FF69B4', '#00CED1', '#9370DB'],
      });
      
      // Add winner to the winners list
      const newWinner: RaffleEntry = {
        id: winner.id,
        items_id: winner.items_id,
        email: winner.email,
        full_name: winner.full_name,
        mobile_number: winner.mobile_number?.toString(),
        created_at: winner.created_at,
        customers_id: winner.customers_id || undefined,
        leads_id: winner.leads_id || undefined,
        is_winner: true,
        date_won: winner.date_won,
      };
      
      setRaffleWinners(prev => [newWinner, ...prev]);
      setRaffleEntriesActiveTab('winners');
      
      toast({
        title: "🎉 Winner Selected!",
        description: `Congratulations to ${winner.full_name}!`,
      });
      
      // Refresh entries to update the list
      await fetchRaffleEntries(selectedRaffleForEntries.id, raffleEntriesPage);
    } catch (error) {
      console.error('Failed to pick winner:', error);
      toast({
        title: "Error",
        description: "Failed to pick a winner. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPickingWinner(false);
    }
  };

  // Campaign Leads functions
  const fetchCampaignLeads = async (itemsId: number, page: number = 1, filterNew: boolean = true) => {
    if (!user?.id) return;

    setLoadingCampaignLeads(true);
    try {
      const response = await adminAPI.getCampaignLeads(user.id, itemsId, page, 25, filterNew);
      setCampaignLeads(response.items);
      setCampaignLeadsPage(response.curPage);
      setCampaignLeadsTotalPages(response.pageTotal);
      setCampaignLeadsTotalItems(response.itemsTotal);
    } catch (error) {
      console.error('Failed to fetch campaign leads:', error);
      toast({
        title: "Error",
        description: "Failed to load campaign leads",
        variant: "destructive",
      });
    } finally {
      setLoadingCampaignLeads(false);
    }
  };

  const fetchCampaignLeadDetail = async (campaignId: string) => {
    if (!user?.id) return;

    setLoadingCampaignLeadDetail(true);
    try {
      const response = await adminAPI.getCampaignLeadDetail(campaignId, user.id);
      setSelectedCampaignLead(response);
      setShowCampaignLeadDetailView(true);
    } catch (error) {
      console.error('Failed to fetch campaign lead detail:', error);
      toast({
        title: "Error",
        description: "Failed to load campaign lead details",
        variant: "destructive",
      });
    } finally {
      setLoadingCampaignLeadDetail(false);
    }
  };

  const handleAssignLeadToCampaign = async () => {
    const campaignToUse = selectedCampaignForLeads || selectedCampaignForAssign;
    if (!user?.id || !campaignToUse || !selectedLeadForAssign) return;

    setAssigningLead(true);
    try {
      await adminAPI.assignLeadToCampaign(
        campaignToUse.id,
        selectedLeadForAssign.id,
        user.id
      );
      
      // Track lead assignment in Microsoft Clarity
      if (typeof window !== 'undefined' && (window as any).clarity) {
        (window as any).clarity('identify', 'lead_id', selectedLeadForAssign.id.toString());
        (window as any).clarity('identify', 'item_id', campaignToUse.sku || campaignToUse.id.toString());
      }
      
      toast({
        title: "Success",
        description: "Lead assigned to campaign successfully",
      });
      setAssignLeadDialogOpen(false);
      setSelectedCampaignForAssign(null);
      setSelectedLeadForAssign(null);
      if (selectedCampaignForLeads) {
        fetchCampaignLeads(Number(selectedCampaignForLeads.id), campaignLeadsPage);
      }
    } catch (error) {
      console.error('Failed to assign lead to campaign:', error);
      toast({
        title: "Error",
        description: "Failed to assign lead to campaign",
        variant: "destructive",
      });
    } finally {
      setAssigningLead(false);
    }
  };

  const handleBulkAssignLeadsToCampaign = async () => {
    const campaignToUse = selectedCampaignForAssign;
    if (!user?.id || !campaignToUse || selectedLeads.size === 0) return;

    setBulkAssigningLeads(true);
    setBulkAssignProgress({ total: selectedLeads.size, processed: 0, errors: [] });
    
    const leadIds = Array.from(selectedLeads);
    const errors: string[] = [];
    
    for (let i = 0; i < leadIds.length; i++) {
      const leadId = leadIds[i];
      const lead = leads.find(l => l.id === leadId);
      try {
        await adminAPI.assignLeadToCampaign(
          campaignToUse.id,
          leadId,
          user.id
        );
        setBulkAssignProgress(prev => prev ? { ...prev, processed: i + 1 } : null);
      } catch (error) {
        console.error(`Failed to assign lead ${leadId} to campaign:`, error);
        errors.push(lead?.email || `Lead #${leadId}`);
        setBulkAssignProgress(prev => prev ? { ...prev, processed: i + 1, errors: [...prev.errors, lead?.email || `Lead #${leadId}`] } : null);
      }
      // Small delay between requests
      if (i < leadIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    setBulkAssigningLeads(false);
    
    if (errors.length === 0) {
      toast({
        title: "Success",
        description: `${leadIds.length} lead(s) assigned to campaign successfully`,
      });
      setBulkAssignToCampaignDialogOpen(false);
      setSelectedCampaignForAssign(null);
      setSelectedLeads(new Set());
      setBulkAssignProgress(null);
    } else if (errors.length < leadIds.length) {
      toast({
        title: "Partial Success",
        description: `${leadIds.length - errors.length} of ${leadIds.length} leads assigned. ${errors.length} failed.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to assign leads to campaign",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCampaignLeadClick = (campaignLead: CampaignLead) => {
    setCampaignLeadToDelete(campaignLead);
    setDeleteCampaignLeadDialogOpen(true);
  };

  const handleDeleteCampaignLeadConfirm = async () => {
    if (!campaignLeadToDelete || !user?.id) return;

    try {
      // Use campaigns_id (the campaign lead's own ID) for deletion
      await adminAPI.deleteCampaignLead(String(campaignLeadToDelete.id), user.id);
      toast({
        title: "Success",
        description: "Campaign lead deleted successfully",
      });
      setDeleteCampaignLeadDialogOpen(false);
      setCampaignLeadToDelete(null);
      if (selectedCampaignForLeads) {
        fetchCampaignLeads(Number(selectedCampaignForLeads.id), campaignLeadsPage);
      }
    } catch (error) {
      console.error('Failed to delete campaign lead:', error);
      toast({
        title: "Error",
        description: "Failed to delete campaign lead",
        variant: "destructive",
      });
    }
  };

  // Helper to get base URL for an item based on its type
  const getItemBaseUrl = (item: Item): string => {
    const baseUrl = window.location.origin;
    const itemType = item.item_type?.toLowerCase() || '';
    const slug = item.slug || item.id.toString();
    
    switch (itemType) {
      case 'event':
        return `${baseUrl}/event/${slug}`;
      case 'classes':
        return `${baseUrl}/classes/${slug}`;
      case 'product':
        return `${baseUrl}/shop/${slug}`;
      case 'vendors':
        return `${baseUrl}/vendors/${slug}`;
      case 'membership':
        return `${baseUrl}/memberships/${slug}`;
      case 'raffle':
        return `${baseUrl}/raffles/${slug}`;
      default:
        return `${baseUrl}/${slug}`;
    }
  };

  // Fetch sharable links for a related item
  const fetchSharableLinksForItem = async (itemId: number, item: Item, campaignId: number) => {
    setLoadingSharableLinks(prev => new Set(prev).add(itemId));
    try {
      const baseUrl = getItemBaseUrl(item);
      const links = await elegantAPI.getSharableLinks(itemId, baseUrl, 0, campaignId);
      setRelatedItemsSharableLinks(prev => new Map(prev).set(itemId, links));
    } catch (error) {
      console.error(`Failed to fetch sharable links for item ${itemId}:`, error);
    } finally {
      setLoadingSharableLinks(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  // Fetch related items for a campaign
  const fetchRelatedItems = async (itemsId: number) => {
    if (!user?.id) return;

    setLoadingRelatedItems(true);
    setRelatedItemsSharableLinks(new Map());
    setRelatedItemMedia(new Map());
    try {
      const response = await adminAPI.getRelatedItems(itemsId, user.id);
      setRelatedItems(response.items);
      
      // Fetch item details for each related item (images are included in the response)
      const detailsMap = new Map<number, Item>();
      const mediaMap = new Map<number, ItemImage[]>();
      await Promise.all(
        response.items.map(async (relatedItem) => {
          try {
            const itemDetail = await adminAPI.getItemById(relatedItem.related_items_id, user.id);
            detailsMap.set(relatedItem.related_items_id, itemDetail);
            
            // Extract images from item response (_item_images_of_items)
            const itemImages = itemDetail._item_images_of_items?.items || [];
            // Map to ItemImage format
            const mappedImages: ItemImage[] = itemImages.map((img: any) => ({
              id: img.id,
              display_image: img.display_image,
              image_type: img.image_type,
              seq: img.seq,
              items_id: img.items_id
            }));
            mediaMap.set(relatedItem.related_items_id, mappedImages);
          } catch (error) {
            console.error(`Failed to fetch item ${relatedItem.related_items_id}:`, error);
            mediaMap.set(relatedItem.related_items_id, []);
          }
        })
      );
      setRelatedItemDetails(detailsMap);
      setRelatedItemMedia(mediaMap);

      // Fetch sharable links for each related item
      for (const relatedItem of response.items) {
        const itemDetail = detailsMap.get(relatedItem.related_items_id);
        if (itemDetail) {
          fetchSharableLinksForItem(relatedItem.related_items_id, itemDetail, itemsId);
        }
      }
    } catch (error) {
      console.error('Failed to fetch related items:', error);
      setRelatedItems([]);
      setRelatedItemDetails(new Map());
      setRelatedItemMedia(new Map());
    } finally {
      setLoadingRelatedItems(false);
    }
  };

  // Fetch available items for linking (all items that aren't already linked)
  const fetchAvailableItemsForLinking = async (search?: string, itemType?: string, page: number = 1, append: boolean = false) => {
    if (!user?.id) return;

    if (append) {
      setLoadingMoreItems(true);
    } else {
      setLoadingAvailableItems(true);
    }
    
    try {
      // Pass customers_id for non-admin roles to filter by owner
      const customersId = userRole !== 'admin' ? customer?.id : undefined;
      const typeFilter = itemType && itemType !== 'all' ? itemType : undefined;
      const searchFilter = search?.trim() || undefined;
      const perPage = 50;
      const response = await adminAPI.getItems(user.id, page, perPage, typeFilter, customersId, searchFilter);
      
      // Filter out already linked items
      const linkedIds = new Set(relatedItems.map(ri => ri.related_items_id));
      const available = response.items.filter(item => !linkedIds.has(item.id));
      
      if (append) {
        setAvailableItemsForLinking(prev => [...prev, ...available]);
      } else {
        setAvailableItemsForLinking(available);
      }
      
      setLinkItemPage(page);
      setLinkItemTotalPages(response.pageTotal || 1);
      setLinkItemTotalItems(response.itemsTotal || response.items.length);
    } catch (error) {
      console.error('Failed to fetch available items:', error);
    } finally {
      setLoadingAvailableItems(false);
      setLoadingMoreItems(false);
    }
  };

  // Load more items for linking
  const handleLoadMoreLinkItems = () => {
    if (linkItemPage < linkItemTotalPages && !loadingMoreItems) {
      fetchAvailableItemsForLinking(linkItemSearchQuery, linkItemTypeFilter, linkItemPage + 1, true);
    }
  };

  // Debounced search for link items
  const linkItemSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!addRelatedItemDialogOpen) return;
    
    // Clear previous timeout
    if (linkItemSearchTimeoutRef.current) {
      clearTimeout(linkItemSearchTimeoutRef.current);
    }
    
    // Reset to page 1 when search/filter changes
    setLinkItemPage(1);
    
    // Debounce the search
    linkItemSearchTimeoutRef.current = setTimeout(() => {
      fetchAvailableItemsForLinking(linkItemSearchQuery, linkItemTypeFilter, 1, false);
    }, 300);
    
    return () => {
      if (linkItemSearchTimeoutRef.current) {
        clearTimeout(linkItemSearchTimeoutRef.current);
      }
    };
  }, [linkItemSearchQuery, linkItemTypeFilter, addRelatedItemDialogOpen]);

  // Fetch available item types from API (uses global cache)
  const fetchItemTypes = async () => {
    if (!user?.id) return;
    
    setLoadingItemTypes(true);
    try {
      const sortedTypes = await adminAPI.getCachedItemTypes(user.id);
      setAvailableItemTypes(sortedTypes);
    } catch (error) {
      console.error('Failed to fetch item types:', error);
    } finally {
      setLoadingItemTypes(false);
    }
  };

  // Fetch item types when dialog opens
  useEffect(() => {
    if (addRelatedItemDialogOpen && availableItemTypes.length === 0) {
      fetchItemTypes();
    }
  }, [addRelatedItemDialogOpen]);

  // Create related item (link an item to a campaign)
  const handleLinkItem = async (campaignId: number) => {
    if (!user?.id || !selectedItemToLink) return;

    setLinkingItem(true);
    try {
      const nextSeq = relatedItems.length > 0 
        ? Math.max(...relatedItems.map(ri => ri.seq)) + 1 
        : 1;

      await adminAPI.createRelatedItem({
        items_id: campaignId,
        related_items_id: parseInt(selectedItemToLink),
        seq: nextSeq,
        is_visible: true
      }, user.id);

      toast({
        title: "Item linked",
        description: "The item has been linked to this campaign.",
      });

      setAddRelatedItemDialogOpen(false);
      setSelectedItemToLink("");
      fetchRelatedItems(campaignId);
    } catch (error) {
      console.error('Failed to link item:', error);
      toast({
        title: "Error",
        description: "Failed to link the item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLinkingItem(false);
    }
  };

  // Delete related item (unlink an item from a campaign)
  const handleUnlinkItem = async (relatedItemId: number, campaignId: number) => {
    if (!user?.id) return;

    setDeletingRelatedItemId(relatedItemId);
    try {
      await adminAPI.deleteRelatedItem(relatedItemId, user.id);

      toast({
        title: "Item unlinked",
        description: "The item has been removed from this campaign.",
      });

      fetchRelatedItems(campaignId);
    } catch (error) {
      console.error('Failed to unlink item:', error);
      toast({
        title: "Error",
        description: "Failed to unlink the item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingRelatedItemId(null);
    }
  };

  // Fetch available bookings for linking to campaigns
  const fetchAvailableBookingsForLinking = async (search?: string, bookingType?: string, page: number = 1, append: boolean = false) => {
    if (!user?.id) return;

    if (append) {
      setLoadingMoreBookings(true);
    } else {
      setLoadingAvailableBookings(true);
    }
    
    try {
      const typeFilter = bookingType && bookingType !== 'all' ? bookingType : undefined;
      const searchFilter = search?.trim() || undefined;
      const perPage = 50;
      
      const response = await adminAPI.getOrders(user.id, page, perPage, {
        bookingType: typeFilter,
        search: searchFilter,
      });
      
      // Filter out already linked bookings
      const linkedIds = new Set(linkedBookings.map(lb => lb.id));
      const available = response.items.filter(item => !linkedIds.has(item.id));
      
      if (append) {
        setAvailableBookingsForLinking(prev => [...prev, ...available]);
      } else {
        setAvailableBookingsForLinking(available);
      }
      
      setBookingLinkPage(page);
      setBookingLinkTotalPages(response.pageTotal || 1);
      setBookingLinkTotalItems(response.itemsTotal || response.items.length);
    } catch (error) {
      console.error('Failed to fetch available bookings:', error);
    } finally {
      setLoadingAvailableBookings(false);
      setLoadingMoreBookings(false);
    }
  };

  // Load more bookings for linking
  const handleLoadMoreBookings = () => {
    if (bookingLinkPage < bookingLinkTotalPages && !loadingMoreBookings) {
      fetchAvailableBookingsForLinking(bookingSearchQuery, bookingTypeFilter, bookingLinkPage + 1, true);
    }
  };

  // Debounced search for link bookings
  const bookingSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!addBookingDialogOpen) return;
    
    // Clear previous timeout
    if (bookingSearchTimeoutRef.current) {
      clearTimeout(bookingSearchTimeoutRef.current);
    }
    
    // Reset to page 1 when search/filter changes
    setBookingLinkPage(1);
    
    // Debounce the search
    bookingSearchTimeoutRef.current = setTimeout(() => {
      fetchAvailableBookingsForLinking(bookingSearchQuery, bookingTypeFilter, 1, false);
    }, 300);
    
    return () => {
      if (bookingSearchTimeoutRef.current) {
        clearTimeout(bookingSearchTimeoutRef.current);
      }
    };
  }, [bookingSearchQuery, bookingTypeFilter, addBookingDialogOpen]);

  // Link a booking to a campaign (store in item_info)
  const handleLinkBooking = async (campaignId: number) => {
    if (!user?.id || !selectedBookingToLink) return;

    setLinkingBooking(true);
    try {
      const bookingToLink = availableBookingsForLinking.find(b => b.id.toString() === selectedBookingToLink);
      if (!bookingToLink) {
        throw new Error('Booking not found');
      }

      // Convert Order to LinkedBooking format
      const linkedBooking: import('@/lib/email-utils').LinkedBooking = {
        id: bookingToLink.id,
        booking_slug: bookingToLink.booking_slug,
        status: bookingToLink.status,
        total_amount: typeof (bookingToLink as any).total_amount === 'number' ? (bookingToLink as any).total_amount : undefined,
        payment_status: typeof (bookingToLink as any).payment_status === 'string' ? (bookingToLink as any).payment_status : undefined,
        checkout_type: typeof (bookingToLink as any).checkout_type === 'string' ? (bookingToLink as any).checkout_type : undefined,
        booking_type: bookingToLink.booking_type,
        quantity: 1,
        created_at: bookingToLink.created_at,
        booking_info: bookingToLink.booking_info,
        _leads: bookingToLink._leads ? {
          email: bookingToLink._leads.email,
          name: (bookingToLink._leads as any).name || undefined,
          lead_payload: bookingToLink._leads.lead_payload,
        } : undefined,
        _items: bookingToLink._items ? {
          id: bookingToLink._items.id,
          slug: bookingToLink._items.slug,
          title: bookingToLink._items.title,
          item_type: bookingToLink._items.item_type,
          item_info: bookingToLink._items.item_info,
        } : undefined,
        _booking_items: bookingToLink._booking_items ? {
          items: bookingToLink._booking_items.items?.map(item => ({
            id: item.id,
            price: item.price,
            quantity: item.quantity,
            item_type: item._items?.item_type,
            booking_items_info: item.booking_items_info,
            _items: item._items,
          })),
        } : undefined,
      };

      // Add to linked bookings
      const newLinkedBookings = [...linkedBookings, linkedBooking];
      setLinkedBookings(newLinkedBookings);

      // Persist to campaign item_info
      const campaign = selectedCampaignForLeads || editingCampaign;
      if (campaign) {
        const updatedItemInfo = {
          ...campaign.item_info,
          linked_bookings: newLinkedBookings,
        };
        await adminAPI.updateItem(campaign.id, { item_info: updatedItemInfo }, user.id);
      }

      toast({
        title: "Booking linked",
        description: "The booking has been linked to this campaign.",
      });

      setAddBookingDialogOpen(false);
      setSelectedBookingToLink("");
    } catch (error) {
      console.error('Failed to link booking:', error);
      toast({
        title: "Error",
        description: "Failed to link the booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLinkingBooking(false);
    }
  };

  // Unlink a booking from a campaign
  const handleUnlinkBooking = async (bookingId: number, campaignId: number) => {
    if (!user?.id) return;

    try {
      const newLinkedBookings = linkedBookings.filter(b => b.id !== bookingId);
      setLinkedBookings(newLinkedBookings);

      // Persist to campaign item_info
      const campaign = selectedCampaignForLeads || editingCampaign;
      if (campaign) {
        const updatedItemInfo = {
          ...campaign.item_info,
          linked_bookings: newLinkedBookings,
        };
        await adminAPI.updateItem(campaign.id, { item_info: updatedItemInfo }, user.id);
      }

      toast({
        title: "Booking unlinked",
        description: "The booking has been removed from this campaign.",
      });
    } catch (error) {
      console.error('Failed to unlink booking:', error);
      toast({
        title: "Error",
        description: "Failed to unlink the booking. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Load linked bookings when campaign is selected
  useEffect(() => {
    const campaign = selectedCampaignForLeads || editingCampaign;
    if (campaign?.item_info?.linked_bookings) {
      setLinkedBookings(campaign.item_info.linked_bookings);
    } else {
      setLinkedBookings([]);
    }
  }, [selectedCampaignForLeads?.id, editingCampaign?.id]);

  // Fetch newsletters
  const fetchNewsletters = async (page: number = 1) => {
    if (!user?.id) return;
    
    setLoadingNewsletters(true);
    try {
      // Pass customers_id for non-admin roles to filter by owner
      const customersId = userRole !== 'admin' ? customer?.id : undefined;
      const response = await adminAPI.getItems(user.id, page, 25, 'Newsletter', customersId);
      setNewsletters(response.items);
      setNewslettersPage(response.curPage);
      setNewslettersTotalPages(response.pageTotal);
      setNewslettersTotalItems(response.itemsTotal);
    } catch (error) {
      console.error('Failed to fetch newsletters:', error);
    } finally {
      setLoadingNewsletters(false);
    }
  };

  // Fetch blogs
  const fetchBlogs = async (page: number = 1) => {
    if (!user?.id) return;
    
    setLoadingBlogs(true);
    try {
      // Pass customers_id for non-admin roles to filter by owner
      const customersId = userRole !== 'admin' ? customer?.id : undefined;
      const response = await adminAPI.getItems(user.id, page, 25, 'Blog', customersId);
      setBlogs(response.items);
      setBlogsPage(response.curPage);
      setBlogsTotalPages(response.pageTotal);
      setBlogsTotalItems(response.itemsTotal);
    } catch (error) {
      console.error('Failed to fetch blogs:', error);
    } finally {
      setLoadingBlogs(false);
    }
  };

  // Fetch applications
  const fetchApplications = async (page: number = 1) => {
    if (!user?.id) return;
    
    setLoadingApplications(true);
    try {
      // Pass customers_id for non-admin roles to filter by owner
      const customersId = userRole !== 'admin' ? customer?.id : undefined;
      const response = await adminAPI.getItems(user.id, page, 25, 'Application', customersId);
      setApplications(response.items);
      setApplicationsPage(response.curPage);
      setApplicationsTotalPages(response.pageTotal);
      setApplicationsTotalItems(response.itemsTotal);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoadingApplications(false);
    }
  };

  // Fetch members with server-side filtering
  const fetchMembers = async (
    page: number = 1,
    search?: string,
    role?: string,
    status?: string
  ) => {
    if (!user?.id) return;
    
    setLoadingMembers(true);
    try {
      const response = await adminAPI.getAllCustomers(user.id, page, 25, {
        search: search || undefined,
        role: role || undefined,
        status: status || undefined,
      });
      setMembers(response.items);
      setMembersPage(response.curPage);
      setMembersTotalPages(response.pageTotal);
      setMembersTotalItems(response.itemsTotal);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  // Fetch leads with server-side filtering
  const fetchLeads = async (page: number = 1) => {
    if (!user?.id) return;
    
    setLoadingLeads(true);
    try {
      const response = await adminAPI.getLeads(user.id, page, 25, {
        filter_new: leadFilterNew,
        email: debouncedLeadSearch || undefined,
        status: leadStatusFilter !== 'all' ? leadStatusFilter : undefined,
      });
      setLeads(response.items);
      setLeadsPage(response.curPage);
      setLeadsTotalPages(response.pageTotal);
      setLeadsTotalItems(response.itemsTotal);
      setSelectedLeads(new Set()); // Clear selection when filters change
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoadingLeads(false);
    }
  };

  // Fetch orders
  const fetchOrders = async (page: number = 1) => {
    if (!user?.id) return;
    
    setLoadingOrders(true);
    try {
      // Get status filter - convert Set to single value or undefined
      const statusValue = orderStatusFilters.size === 1 
        ? Array.from(orderStatusFilters)[0] 
        : orderStatusFilters.size === 0 ? 'all' : undefined;
      
      const response = await adminAPI.getOrders(user.id, page, 25, {
        bookingType: orderBookingTypeFilter !== 'all' ? orderBookingTypeFilter : undefined,
        itemsType: orderItemTypeFilter !== 'all' ? orderItemTypeFilter : undefined,
        status: statusValue,
        search: orderSearchQuery || undefined,
        bookingSlug: orderBookingSlugFilter || undefined,
        startDate: orderDateRange.from ? format(orderDateRange.from, 'yyyy-MM-dd') : undefined,
        endDate: orderDateRange.to ? format(orderDateRange.to, 'yyyy-MM-dd') : undefined,
        isDeleted: showDeletedOrders ? true : undefined,
      });
      setOrders(response.items || []);
      setOrdersPage(response.curPage);
      setOrdersTotalPages(response.pageTotal);
      setOrdersTotalItems(response.itemsTotal);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Fetch tasks
  const fetchTasks = async (page: number = 1) => {
    if (!user?.id) return;
    
    setLoadingTasks(true);
    try {
      const response = await adminAPI.getTasks(user.id, page, 25);
      setTasks(response.items);
      setTasksPage(response.curPage);
      setTasksTotalPages(response.pageTotal);
      setTasksTotalItems(response.itemsTotal);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Task CRUD handlers
  const handleTaskSaved = () => {
    setShowTaskEditView(false);
    setEditingTask(null);
    fetchTasks(tasksPage);
  };

  const handleDeleteTaskClick = (task: Task) => {
    setTaskToDelete(task);
    setDeleteTaskDialogOpen(true);
  };

  const handleDeleteTaskConfirm = async () => {
    if (!taskToDelete || !user?.id) return;

    try {
      await adminAPI.deleteTask(taskToDelete.id, user.id);
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
      setDeleteTaskDialogOpen(false);
      setTaskToDelete(null);
      fetchTasks(tasksPage);
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Search filter
      if (taskSearchQuery) {
        const query = taskSearchQuery.toLowerCase();
        const matchesSearch = 
          task.title?.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query) ||
          task.task_type?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (taskStatusFilter !== "all" && task.status?.toLowerCase() !== taskStatusFilter.toLowerCase()) {
        return false;
      }
      
      // Task type filter
      if (taskTypeFilter !== "all" && task.task_type !== taskTypeFilter) {
        return false;
      }
      
      // Assignee filter
      if (taskAssigneeFilter !== "all") {
        if (taskAssigneeFilter === "unassigned") {
          if (task.assigned_customers_id) return false;
        } else {
          if (task.assigned_customers_id !== taskAssigneeFilter) return false;
        }
      }
      
      return true;
    });
  }, [tasks, taskSearchQuery, taskStatusFilter, taskTypeFilter, taskAssigneeFilter]);

  // Get unique assignees from tasks for filter dropdown
  const taskAssignees = useMemo(() => {
    const assigneeMap = new Map<string, { id: string; name: string }>();
    tasks.forEach(task => {
      if (task.assigned_customers_id && task._assigned_customer?.Full_name) {
        assigneeMap.set(task.assigned_customers_id, {
          id: task.assigned_customers_id,
          name: task._assigned_customer.Full_name
        });
      }
    });
    return Array.from(assigneeMap.values());
  }, [tasks]);

  const hasActiveTaskFilters = taskSearchQuery || taskStatusFilter !== "all" || taskTypeFilter !== "all" || taskAssigneeFilter !== "all";

  const clearTaskFilters = () => {
    setTaskSearchQuery("");
    setTaskStatusFilter("all");
    setTaskTypeFilter("all");
    setTaskAssigneeFilter("all");
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: string, previousStatus: string) => {
    if (!user?.id) return;
    
    // Optimistic update - move task immediately
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    
    try {
      await adminAPI.updateTask(taskId, { status: newStatus }, user.id);
      toast({
        title: "Success",
        description: `Task moved to ${newStatus}`,
      });
    } catch (error) {
      console.error('Failed to update task status:', error);
      // Rollback on failure
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: previousStatus } : t));
      toast({
        title: "Error",
        description: "Failed to update task status. Changes reverted.",
        variant: "destructive",
      });
    }
  };

  const handleEventSaved = () => {
    setShowEventEditView(false);
    setEditingEvent(null);
    fetchEvents(currentPage);
  };

  const handleDeleteClick = (event: Item) => {
    setEventToDelete(event);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!eventToDelete || !user?.id) return;

    try {
      await adminAPI.deleteItem(eventToDelete.id, user.id);
      toast({
        title: "Success",
        description: "Event deleted successfully",
      });
      setDeleteDialogOpen(false);
      setEventToDelete(null);
      fetchEvents(currentPage);
    } catch (error) {
      console.error('Failed to delete event:', error);
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
    }
  };

  const handleCopyEventClick = (event: Item) => {
    setEventToCopy(event);
    setCopyEventTitle(event.title || '');
    setCopyEventDialogOpen(true);
  };

  const handleCopyEvent = async () => {
    if (!user?.id || !eventToCopy) return;

    try {
      // Generate unique slug
      let newSlug = `${eventToCopy.slug}-copy`;
      let counter = 1;
      
      // Check if slug exists and increment counter
      const existingSlugs = events.map(e => e.slug);
      while (existingSlugs.includes(newSlug)) {
        newSlug = `${eventToCopy.slug}-${counter}`;
        counter++;
      }

      // Create a copy of the event with new slug and custom title
      const eventCopy: any = {
        ...eventToCopy,
        slug: newSlug,
        title: copyEventTitle.trim() || eventToCopy.title,
      };

      // Remove id and timestamps that shouldn't be copied
      delete eventCopy.id;
      delete eventCopy.created_at;

      await adminAPI.createItem(eventCopy, user.id);
      
      toast({
        title: "Success",
        description: "Event duplicated successfully",
      });
      
      setCopyEventDialogOpen(false);
      setEventToCopy(null);
      setCopyEventTitle("");
      fetchEvents(currentPage);
    } catch (error) {
      console.error('Failed to copy event:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate event",
        variant: "destructive",
      });
    }
  };

  const handleClassSaved = () => {
    setShowClassEditView(false);
    setEditingClass(null);
    fetchClasses(classesPage);
  };

  const handleDeleteClassClick = (classItem: Item) => {
    setClassToDelete(classItem);
    setDeleteClassDialogOpen(true);
  };

  const handleDeleteClassConfirm = async () => {
    if (!classToDelete || !user?.id) return;

    try {
      await adminAPI.deleteItem(classToDelete.id, user.id);
      toast({
        title: "Success",
        description: "Class deleted successfully",
      });
      setDeleteClassDialogOpen(false);
      setClassToDelete(null);
      fetchClasses(classesPage);
    } catch (error) {
      console.error('Failed to delete class:', error);
      toast({
        title: "Error",
        description: "Failed to delete class",
        variant: "destructive",
      });
    }
  };

  const handleCopyClassClick = (classItem: Item) => {
    setClassToCopy(classItem);
    setCopyClassTitle(classItem.title || '');
    setCopyClassDialogOpen(true);
  };

  const handleCopyClass = async () => {
    if (!user?.id || !classToCopy) return;

    try {
      // Generate unique slug
      let newSlug = `${classToCopy.slug}-copy`;
      let counter = 1;
      
      // Check if slug exists and increment counter
      const existingSlugs = classes.map(c => c.slug);
      while (existingSlugs.includes(newSlug)) {
        newSlug = `${classToCopy.slug}-${counter}`;
        counter++;
      }

      // Create a copy of the class with new slug and custom title
      const classCopy: any = {
        ...classToCopy,
        slug: newSlug,
        title: copyClassTitle.trim() || classToCopy.title,
      };

      // Remove id and timestamps that shouldn't be copied
      delete classCopy.id;
      delete classCopy.created_at;

      await adminAPI.createItem(classCopy, user.id);
      
      toast({
        title: "Success",
        description: "Class duplicated successfully",
      });
      
      setCopyClassDialogOpen(false);
      setClassToCopy(null);
      setCopyClassTitle("");
      fetchClasses(classesPage);
    } catch (error) {
      console.error('Failed to copy class:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate class",
        variant: "destructive",
      });
    }
  };

  const handleAddClassToCampaign = async (classItem: Item) => {
    if (!user?.id) return;

    try {
      // Generate unique slug for the campaign
      let newSlug = `campaign-${classItem.slug}`;
      let counter = 1;
      
      // Check if slug exists in campaigns and increment counter
      const existingSlugs = campaigns.map(c => c.slug);
      while (existingSlugs.includes(newSlug)) {
        newSlug = `campaign-${classItem.slug}-${counter}`;
        counter++;
      }

      // Create a campaign item based on the class
      const campaignData: any = {
        slug: newSlug,
        title: `Campaign: ${classItem.title}`,
        description: classItem.description,
        item_type: 'Campaign',
        tags: classItem.tags,
        price: classItem.price || 0,
        currency: classItem.currency || 'USD',
        Is_disabled: false,
        item_info: {
          ...(classItem.item_info || {}),
          source_item_id: classItem.id,
          source_item_type: 'Classes',
        },
      };

      // Create the campaign item
      const createdCampaign = await adminAPI.createItem(campaignData, user.id);
      
      // Link the original class as a related item to the campaign
      await adminAPI.createRelatedItem({
        items_id: createdCampaign.id,
        related_items_id: classItem.id,
        seq: 1,
        is_visible: true,
      }, user.id);
      
      toast({
        title: "Success",
        description: "Class added to new campaign and linked as related item",
      });
      
      // Refresh campaigns list
      fetchCampaigns(campaignsPage);
    } catch (error) {
      console.error('Failed to add class to campaign:', error);
      toast({
        title: "Error",
        description: "Failed to add class to campaign",
        variant: "destructive",
      });
    }
  };

  const handleAddEventToCampaign = async (eventItem: Item) => {
    if (!user?.id) return;

    try {
      let newSlug = `campaign-${eventItem.slug}`;
      let counter = 1;
      
      const existingSlugs = campaigns.map(c => c.slug);
      while (existingSlugs.includes(newSlug)) {
        newSlug = `campaign-${eventItem.slug}-${counter}`;
        counter++;
      }

      const campaignData: any = {
        slug: newSlug,
        title: `Campaign: ${eventItem.title}`,
        description: eventItem.description,
        item_type: 'Campaign',
        tags: eventItem.tags,
        price: eventItem.price || 0,
        currency: eventItem.currency || 'USD',
        Is_disabled: false,
        item_info: {
          ...(eventItem.item_info || {}),
          source_item_id: eventItem.id,
          source_item_type: 'Event',
        },
      };

      const createdCampaign = await adminAPI.createItem(campaignData, user.id);
      
      await adminAPI.createRelatedItem({
        items_id: createdCampaign.id,
        related_items_id: eventItem.id,
        seq: 1,
        is_visible: true,
      }, user.id);
      
      toast({
        title: "Success",
        description: "Event added to new campaign and linked as related item",
      });
      
      fetchCampaigns(campaignsPage);
    } catch (error) {
      console.error('Failed to add event to campaign:', error);
      toast({
        title: "Error",
        description: "Failed to add event to campaign",
        variant: "destructive",
      });
    }
  };

  const handleAddDonationToCampaign = async (donationItem: Item) => {
    if (!user?.id) return;

    try {
      let newSlug = `campaign-${donationItem.slug}`;
      let counter = 1;
      
      const existingSlugs = campaigns.map(c => c.slug);
      while (existingSlugs.includes(newSlug)) {
        newSlug = `campaign-${donationItem.slug}-${counter}`;
        counter++;
      }

      const campaignData: any = {
        slug: newSlug,
        title: `Campaign: ${donationItem.title}`,
        description: donationItem.description,
        item_type: 'Campaign',
        tags: donationItem.tags,
        price: donationItem.price || 0,
        currency: donationItem.currency || 'USD',
        Is_disabled: false,
        item_info: {
          ...(donationItem.item_info || {}),
          source_item_id: donationItem.id,
          source_item_type: 'Donation',
        },
      };

      const createdCampaign = await adminAPI.createItem(campaignData, user.id);
      
      await adminAPI.createRelatedItem({
        items_id: createdCampaign.id,
        related_items_id: donationItem.id,
        seq: 1,
        is_visible: true,
      }, user.id);
      
      toast({
        title: "Success",
        description: "Donation added to new campaign and linked as related item",
      });
      
      fetchCampaigns(campaignsPage);
    } catch (error) {
      console.error('Failed to add donation to campaign:', error);
      toast({
        title: "Error",
        description: "Failed to add donation to campaign",
        variant: "destructive",
      });
    }
  };

  const handleAddRaffleToCampaign = async (raffleItem: Item) => {
    if (!user?.id) return;

    try {
      let newSlug = `campaign-${raffleItem.slug}`;
      let counter = 1;
      
      const existingSlugs = campaigns.map(c => c.slug);
      while (existingSlugs.includes(newSlug)) {
        newSlug = `campaign-${raffleItem.slug}-${counter}`;
        counter++;
      }

      const campaignData: any = {
        slug: newSlug,
        title: `Campaign: ${raffleItem.title}`,
        description: raffleItem.description,
        item_type: 'Campaign',
        tags: raffleItem.tags,
        price: raffleItem.price || 0,
        currency: raffleItem.currency || 'USD',
        Is_disabled: false,
        item_info: {
          ...(raffleItem.item_info || {}),
          source_item_id: raffleItem.id,
          source_item_type: 'Raffle',
        },
      };

      const createdCampaign = await adminAPI.createItem(campaignData, user.id);
      
      await adminAPI.createRelatedItem({
        items_id: createdCampaign.id,
        related_items_id: raffleItem.id,
        seq: 1,
        is_visible: true,
      }, user.id);
      
      toast({
        title: "Success",
        description: "Raffle added to new campaign and linked as related item",
      });
      
      fetchCampaigns(campaignsPage);
    } catch (error) {
      console.error('Failed to add raffle to campaign:', error);
      toast({
        title: "Error",
        description: "Failed to add raffle to campaign",
        variant: "destructive",
      });
    }
  };

  // Quick Send Email to filtered campaign leads
  const handleQuickSendEmail = async (filteredLeads: CampaignLead[], templateOverride?: PostmarkTemplate) => {
    const templateToUse = templateOverride || quickSendSelectedTemplate;
    
    if (!user?.id || !selectedCampaignForLeads || !templateToUse) {
      toast({
        title: "Missing Information",
        description: "Please select a campaign and email template",
        variant: "destructive",
      });
      return;
    }

    // Check if campaign has template mappings configured
    const templateMappings = selectedCampaignForLeads.item_info?.email_template_mappings as Record<string, string> | undefined;
    
    setQuickSendLoading(true);
    setQuickSendResults(null);
    emailSendCancelledRef.current = false;
    emailSendPausedRef.current = false;

    try {
      // Build field resolution context for the shared utility
      const fieldContext: FieldResolutionContext = {
        campaignItem: selectedCampaignForLeads,
        relatedItems: [],
        relatedItemDetails: new Map(),
        relatedItemMedia: new Map(),
        sharableLinks: undefined,
      };

      // Build recipients from filtered leads using shared utility
      const recipients = filteredLeads
        .filter(cl => cl._leads?.email || cl._leads?.lead_payload?.email)
        .map(cl => {
          const email = cl._leads?.email || cl._leads?.lead_payload?.email || '';
          
          // Convert to EmailLeadRecipient format
          const recipient: EmailLeadRecipient = {
            id: cl.id,
            leads_id: cl.leads_id,
            status: cl.status,
            last_contact_date: cl.last_contact_date,
            _leads: cl._leads,
          };
          
          // Use shared template model builder
          const templateModel = buildTemplateModelFromMappings(
            templateMappings,
            recipient,
            fieldContext
          );
          
          return {
            campaigns_id: cl.id,
            email,
            template_model: templateModel,
            last_contact_date: cl.last_contact_date,
          };
        });

      if (recipients.length === 0) {
        toast({
          title: "No Recipients",
          description: "No leads with email addresses found in the filtered list",
          variant: "destructive",
        });
        setQuickSendLoading(false);
        return;
      }

      // Get throttle settings from shop_info
      const shopInfo = customer?._shops?._shop_info;
      const throttleSettings: EmailThrottleSettings = {
        maxEmailsPerDay: shopInfo?.max_emails_per_day ?? 2,
        emailContactDaysFreq: shopInfo?.email_contact_days_freq ?? 5,
        fromEmail: shopInfo?.from_email,
      };

      // Initialize email progress dialog with all recipients
      const initialStatuses: EmailSendStatus[] = recipients.map(r => ({
        email: r.email,
        status: 'pending',
        campaignsId: r.campaigns_id,
      }));

      setEmailProgressState({
        isOpen: true,
        total: recipients.length,
        current: 0,
        currentEmail: '',
        delayRemaining: 0,
        emailStatuses: initialStatuses,
        isComplete: false,
        isCancelled: false,
        isPaused: false,
      });

      const result = await batchSendEmails(user.id, recipients, {
        template_id: templateToUse.TemplateId,
        delayRange: { min: 15, max: 60 }, // Random delay between 15-60 seconds
        throttleSettings,
        shouldCancel: () => emailSendCancelledRef.current,
        isPaused: () => emailSendPausedRef.current,
        onProgress: (progress) => {
          setQuickSendProgress(progress);
          setEmailProgressState(prev => ({
            ...prev,
            current: progress.current,
            currentEmail: progress.currentEmail,
            delayRemaining: progress.delayRemaining,
            isCancelled: progress.status === 'cancelled',
            isPaused: progress.status === 'paused',
          }));
        },
        onEmailSent: (recipient, success, skipped, skipReason, is429Error) => {
          setEmailProgressState(prev => ({
            ...prev,
            emailStatuses: prev.emailStatuses.map(s => 
              s.email === recipient.email 
                ? { 
                    ...s, 
                    status: is429Error ? 'rate_limited' : (skipped ? 'skipped' : (success ? 'success' : 'failed')),
                    skipReason: skipReason,
                    error: success || skipped ? undefined : (is429Error ? 'Rate limited - too many requests' : 'Send failed'),
                    campaignsId: recipient.campaigns_id,
                  } 
                : s
            ),
          }));
        },
      });

      // Mark as complete
      setEmailProgressState(prev => ({
        ...prev,
        isComplete: true,
        isCancelled: emailSendCancelledRef.current,
      }));

      setQuickSendResults(result);
      setQuickSendProgress(null);

      if (result.success > 0) {
        const skippedMsg = result.skipped > 0 ? `, ${result.skipped} skipped (contacted recently)` : '';
        const failedMsg = result.failed > 0 ? `, ${result.failed} failed` : '';
        const rateLimitedMsg = result.rateLimited > 0 ? `, ${result.rateLimited} rate limited` : '';
        toast({
          title: "Emails Sent",
          description: `Successfully sent ${result.success} email${result.success !== 1 ? 's' : ''}${failedMsg}${skippedMsg}${rateLimitedMsg}`,
        });
        // Refresh campaign leads to update last_contact_date and clear selection
        setSelectedCampaignLeadIds(new Set());
        fetchCampaignLeads(Number(selectedCampaignForLeads.id), campaignLeadsPage);
      } else if (result.skipped > 0 && result.failed === 0 && result.rateLimited === 0) {
        toast({
          title: "All Emails Skipped",
          description: `${result.skipped} email${result.skipped !== 1 ? 's' : ''} skipped - leads were contacted too recently`,
        });
      } else if (result.rateLimited > 0) {
        toast({
          title: "Rate Limited",
          description: `${result.rateLimited} email${result.rateLimited !== 1 ? 's' : ''} were rate limited. Use the Reset button to clear contact status.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Send Failed",
          description: "Failed to send any emails",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to send emails:', error);
      setEmailProgressState(prev => ({
        ...prev,
        isComplete: true,
      }));
      toast({
        title: "Error",
        description: "An error occurred while sending emails",
        variant: "destructive",
      });
    } finally {
      setQuickSendLoading(false);
      setQuickSendProgress(null);
    }
  };

  // Handle cancel email sending
  const handleCancelEmailSend = () => {
    emailSendCancelledRef.current = true;
    setEmailProgressState(prev => ({
      ...prev,
      isCancelled: true,
    }));
  };

  // Handle close email progress dialog
  const handleCloseEmailProgressDialog = () => {
    emailSendPausedRef.current = false;
    setEmailProgressState(createInitialEmailProgressState());
  };

  // Handle pause email sending
  const handlePauseEmailSend = () => {
    emailSendPausedRef.current = true;
    setEmailProgressState(prev => ({
      ...prev,
      isPaused: true,
    }));
  };

  // Handle resume email sending
  const handleResumeEmailSend = () => {
    emailSendPausedRef.current = false;
    setEmailProgressState(prev => ({
      ...prev,
      isPaused: false,
    }));
  };

  // Handle reset lead contact status
  const handleResetLeadContact = async (campaignsId: string, email: string): Promise<boolean> => {
    if (!user?.id) return false;
    
    try {
      await adminAPI.resetCampaignLead(campaignsId, user.id);
      
      // Update the status in the dialog to 'reset' so user can resend
      setEmailProgressState(prev => ({
        ...prev,
        emailStatuses: prev.emailStatuses.map(s => 
          s.campaignsId === campaignsId 
            ? { ...s, status: 'reset', error: undefined, skipReason: undefined } 
            : s
        ),
      }));
      
      toast({
        title: "Lead Reset",
        description: `Contact status reset for ${email}. Click the mail icon to resend.`,
      });
      
      return true;
    } catch (error) {
      console.error('Failed to reset lead:', error);
      toast({
        title: "Reset Failed",
        description: `Could not reset contact status for ${email}`,
        variant: "destructive",
      });
      return false;
    }
  };

  // Handle resending email to a reset lead
  const handleResendEmail = async (campaignsId: string, email: string): Promise<boolean> => {
    if (!user?.id) return false;
    
    // Find the email status to get the template info
    const emailStatus = emailProgressState.emailStatuses.find(s => s.campaignsId === campaignsId);
    if (!emailStatus) return false;

    // Update status to sending
    setEmailProgressState(prev => ({
      ...prev,
      emailStatuses: prev.emailStatuses.map(s => 
        s.campaignsId === campaignsId 
          ? { ...s, status: 'sending' } 
          : s
      ),
    }));

    try {
      // Get the campaign info to retrieve template settings
      const campaign = selectedCampaignForApplicationsEmail;
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const templateAlias = campaign.item_info?.email_template_alias;
      const templateMappings = campaign.item_info?.email_template_fields || {};
      
      if (!templateAlias) {
        throw new Error('No email template configured');
      }

      // Find the original application data for this email
      const app = applications.find(a => a._leads?.email === email);
      
      if (!app) {
        throw new Error('Application not found');
      }

      // Build the linked booking structure like in handleGenerateEmailPreview
      const firstName = app._leads?.lead_payload?.firstName || app._leads?.lead_payload?.first_name || '';
      const lastName = app._leads?.lead_payload?.lastName || app._leads?.lead_payload?.last_name || '';
      
      const linkedBooking: LinkedBooking = {
        id: app.id,
        booking_slug: app.booking_slug,
        status: app.status,
        total_amount: (app as any).total_amount,
        payment_status: (app as any).payment_status,
        checkout_type: (app as any).checkout_type,
        booking_type: (app as any).booking_type,
        quantity: 1,
        created_at: app.created_at,
        booking_info: app.booking_info,
        _leads: app._leads ? {
          email: app._leads.email,
          name: firstName ? `${firstName} ${lastName || ''}`.trim() : undefined,
          lead_payload: app._leads.lead_payload,
        } : undefined,
        _items: app._items ? {
          id: app._items.id,
          slug: app._items.slug,
          title: app._items.title,
          item_type: app._items.item_type,
          item_info: (app._items as any).item_info,
        } : undefined,
        _booking_items: (app as any)._booking_items ? {
          items: (app as any)._booking_items.items?.map((item: any) => ({
            id: item.id,
            price: item.price,
            quantity: item.quantity,
            item_type: item._items?.item_type,
            booking_items_info: item.booking_items_info,
            _items: item._items,
          })),
        } : undefined,
      };

      // Build context
      const fieldContext: FieldResolutionContext = {
        campaignItem: campaign,
        relatedItems: [],
        relatedItemDetails: new Map(),
        relatedItemMedia: new Map(),
        linkedBookings: [linkedBooking],
        sharableLinks: undefined,
      };

      // Build recipient for template model
      const recipient: EmailLeadRecipient = {
        id: (app as any).leads_id?.toString() || app.id.toString(),
        leads_id: (app as any).leads_id || 0,
        status: app.status,
        last_contact_date: (app as any).last_contact_date || null,
        _leads: app._leads,
      };

      // Build template model
      const templateModel = buildTemplateModelFromMappings(
        templateMappings,
        recipient,
        fieldContext
      );

      // Find template ID from alias
      const templatesResponse = await adminAPI.getPostmarkTemplates(user.id);
      const template = templatesResponse.Templates.find(t => t.Alias === templateAlias);
      if (!template) {
        throw new Error(`Template "${templateAlias}" not found`);
      }

      // Send the email
      await adminAPI.sendTemplateEmail(user.id, {
        campaigns_id: campaignsId,
        template_id: template.TemplateId,
        to: email,
        template_model: templateModel,
      });

      // Update status to success
      setEmailProgressState(prev => ({
        ...prev,
        emailStatuses: prev.emailStatuses.map(s => 
          s.campaignsId === campaignsId 
            ? { ...s, status: 'success' } 
            : s
        ),
      }));

      toast({
        title: "Email Sent",
        description: `Email resent to ${email}`,
      });

      return true;
    } catch (error) {
      console.error('Failed to resend email:', error);
      
      // Update status back to reset so they can try again
      setEmailProgressState(prev => ({
        ...prev,
        emailStatuses: prev.emailStatuses.map(s => 
          s.campaignsId === campaignsId 
            ? { ...s, status: 'reset', error: error instanceof Error ? error.message : 'Send failed' } 
            : s
        ),
      }));

      toast({
        title: "Send Failed",
        description: `Could not resend email to ${email}`,
        variant: "destructive",
      });
      
      return false;
    }
  };

  // Generate email preview for first application before sending
  const handleGenerateEmailPreview = async () => {
    const campaignToUse = selectedCampaignForApplicationsEmail;
    if (!user?.id || !campaignToUse || selectedApplications.size === 0) {
      toast({
        title: "Missing Information",
        description: "Please select a campaign and applications",
        variant: "destructive",
      });
      return;
    }

    // Check if campaign has template configured
    const templateAlias = campaignToUse.item_info?.email_template_alias;
    const templateMappings = campaignToUse.item_info?.email_template_mappings as Record<string, string> | undefined;
    
    if (!templateAlias) {
      toast({
        title: "No Template Configured",
        description: "The selected campaign doesn't have an email template configured. Please configure it in the Campaign Email view first.",
        variant: "destructive",
      });
      return;
    }

    // Get selected applications and filter valid ones
    const applicationIds = Array.from(selectedApplications);
    const selectedApps = allApplications.filter(app => applicationIds.includes(app.id));
    const validApps = selectedApps.filter(app => 
      (app._leads?.email || app._leads?.lead_payload?.email) && app.leads_id
    );

    if (validApps.length === 0) {
      toast({
        title: "No Valid Recipients",
        description: "No applications with email addresses and lead IDs found in the selection",
        variant: "destructive",
      });
      return;
    }

    // Generate preview for the first valid application
    const firstApp = validApps[0];
    const email = firstApp._leads?.email || firstApp._leads?.lead_payload?.email || '';
    const firstName = firstApp._leads?.lead_payload?.first_name || '';
    const lastName = firstApp._leads?.lead_payload?.last_name || '';
    const recipientName = `${firstName} ${lastName}`.trim() || 'Unknown';

    // Build the linked booking format
    const linkedBooking: import('@/lib/email-utils').LinkedBooking = {
      id: firstApp.id,
      booking_slug: firstApp.booking_slug,
      status: firstApp.status,
      total_amount: (firstApp as any).total_amount,
      payment_status: (firstApp as any).payment_status,
      checkout_type: (firstApp as any).checkout_type,
      booking_type: firstApp.booking_type,
      quantity: 1,
      created_at: firstApp.created_at,
      booking_info: firstApp.booking_info,
      _leads: firstApp._leads ? {
        email: firstApp._leads.email,
        name: firstName ? `${firstName} ${lastName || ''}`.trim() : undefined,
        lead_payload: firstApp._leads.lead_payload,
      } : undefined,
      _items: firstApp._items ? {
        id: firstApp._items.id,
        slug: firstApp._items.slug,
        title: firstApp._items.title,
        item_type: firstApp._items.item_type,
        item_info: firstApp._items.item_info,
      } : undefined,
      _booking_items: firstApp._booking_items ? {
        items: firstApp._booking_items.items?.map(item => ({
          id: item.id,
          price: item.price,
          quantity: item.quantity,
          item_type: item._items?.item_type,
          booking_items_info: item.booking_items_info,
          _items: item._items,
        })),
      } : undefined,
    };

    // Build context
    const fieldContext: FieldResolutionContext = {
      campaignItem: campaignToUse,
      relatedItems: [],
      relatedItemDetails: new Map(),
      relatedItemMedia: new Map(),
      linkedBookings: [linkedBooking],
      sharableLinks: undefined,
    };

    // Build recipient for template model
    const recipient: import('@/lib/email-utils').EmailLeadRecipient = {
      id: firstApp.leads_id?.toString() || firstApp.id.toString(),
      leads_id: firstApp.leads_id || 0,
      status: firstApp.status,
      last_contact_date: (firstApp as any).last_contact_date || null,
      _leads: firstApp._leads,
    };

    // Build template model
    const templateModel = buildTemplateModelFromMappings(
      templateMappings,
      recipient,
      fieldContext
    );

    // Set preview data and show dialog
    setEmailPreviewData({
      templateAlias,
      recipientEmail: email,
      recipientName,
      templateModel,
      totalRecipients: validApps.length,
    });
    setSendEmailToApplicationsDialogOpen(false);
    setShowEmailPreview(true);
  };

  // Handle sending emails to selected applications using campaign template + booking data
  const handleSendEmailToApplications = async () => {
    const campaignToUse = selectedCampaignForApplicationsEmail;
    if (!user?.id || !campaignToUse || selectedApplications.size === 0) {
      toast({
        title: "Missing Information",
        description: "Please select a campaign and applications",
        variant: "destructive",
      });
      return;
    }

    // Hide preview if it was open
    setShowEmailPreview(false);

    // Check if campaign has template configured
    const templateAlias = campaignToUse.item_info?.email_template_alias;
    const templateMappings = campaignToUse.item_info?.email_template_mappings as Record<string, string> | undefined;
    
    if (!templateAlias) {
      toast({
        title: "No Template Configured",
        description: "The selected campaign doesn't have an email template configured. Please configure it in the Campaign Email view first.",
        variant: "destructive",
      });
      return;
    }
    // Find the template ID from alias
    let templateId: number | null = null;
    try {
      const templatesResponse = await adminAPI.getPostmarkTemplates(user.id);
      const template = templatesResponse.Templates.find(t => t.Alias === templateAlias);
      if (!template) {
        toast({
          title: "Template Not Found",
          description: `Could not find email template with alias "${templateAlias}"`,
          variant: "destructive",
        });
        return;
      }
      templateId = template.TemplateId;
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast({
        title: "Error",
        description: "Failed to fetch email templates",
        variant: "destructive",
      });
      return;
    }

    setSendingEmailsToApplications(true);
    emailSendCancelledRef.current = false;
    emailSendPausedRef.current = false;

    try {
      // Get selected applications
      const applicationIds = Array.from(selectedApplications);
      const selectedApps = allApplications.filter(app => applicationIds.includes(app.id));

      // Filter applications with valid email and leads_id
      const validApps = selectedApps.filter(app => 
        (app._leads?.email || app._leads?.lead_payload?.email) && app.leads_id
      );

      if (validApps.length === 0) {
        toast({
          title: "No Valid Recipients",
          description: "No applications with email addresses and lead IDs found in the selection",
          variant: "destructive",
        });
        setSendingEmailsToApplications(false);
        return;
      }

      // Step 1: Create campaign leads for each application
      toast({
        title: "Adding to Campaign",
        description: `Adding ${validApps.length} application(s) to campaign...`,
      });

      const campaignLeadMap = new Map<number, string>(); // appId -> campaignsId (UUID)
      
      for (const app of validApps) {
        try {
          const result = await adminAPI.assignLeadToCampaign(
            campaignToUse.id,
            app.leads_id!,
            user.id
          );
          if (result?.id) {
            campaignLeadMap.set(app.id, result.id);
          }
        } catch (error) {
          // If lead already exists in campaign, try to find existing campaign lead
          console.log(`Lead ${app.leads_id} may already be in campaign, continuing...`);
        }
      }

      // Step 2: Build recipients from applications with campaign lead UUIDs
      const recipients = validApps
        .map(app => {
          const email = app._leads?.email || app._leads?.lead_payload?.email || '';
          const campaignsId = campaignLeadMap.get(app.id);
          
          // Convert application to LinkedBooking format for field resolution
          const linkedBooking: import('@/lib/email-utils').LinkedBooking = {
            id: app.id,
            booking_slug: app.booking_slug,
            status: app.status,
            total_amount: (app as any).total_amount,
            payment_status: (app as any).payment_status,
            checkout_type: (app as any).checkout_type,
            booking_type: app.booking_type,
            quantity: 1,
            created_at: app.created_at,
            booking_info: app.booking_info,
            _leads: app._leads ? {
              email: app._leads.email,
              name: app._leads.lead_payload?.first_name 
                ? `${app._leads.lead_payload.first_name} ${app._leads.lead_payload.last_name || ''}`.trim() 
                : undefined,
              lead_payload: app._leads.lead_payload,
            } : undefined,
            _items: app._items ? {
              id: app._items.id,
              slug: app._items.slug,
              title: app._items.title,
              item_type: app._items.item_type,
              item_info: app._items.item_info,
            } : undefined,
            _booking_items: app._booking_items ? {
              items: app._booking_items.items?.map(item => ({
                id: item.id,
                price: item.price,
                quantity: item.quantity,
                item_type: item._items?.item_type,
                booking_items_info: item.booking_items_info,
                _items: item._items,
              })),
            } : undefined,
          };
          
          // Build context with the booking for this specific application
          const fieldContext: FieldResolutionContext = {
            campaignItem: campaignToUse,
            relatedItems: [],
            relatedItemDetails: new Map(),
            relatedItemMedia: new Map(),
            linkedBookings: [linkedBooking], // This application's booking data
            sharableLinks: undefined,
          };
          
          // Convert to EmailLeadRecipient format for template model building
          const recipient: import('@/lib/email-utils').EmailLeadRecipient = {
            id: app.leads_id?.toString() || app.id.toString(),
            leads_id: app.leads_id || 0,
            status: app.status,
            last_contact_date: (app as any).last_contact_date || null,
            _leads: app._leads,
          };
          
          // Build template model using campaign mappings + booking data
          const templateModel = buildTemplateModelFromMappings(
            templateMappings,
            recipient,
            fieldContext
          );
          
          return {
            campaigns_id: campaignsId, // Campaign lead UUID for reset functionality
            email,
            template_model: templateModel,
            last_contact_date: (app as any).last_contact_date || null,
          };
        });

      if (recipients.length === 0) {
        toast({
          title: "No Recipients",
          description: "No applications with email addresses found in the selection",
          variant: "destructive",
        });
        setSendingEmailsToApplications(false);
        return;
      }

      // Get throttle settings from shop_info
      const shopInfo = customer?._shops?._shop_info;
      const throttleSettings: EmailThrottleSettings = {
        maxEmailsPerDay: shopInfo?.max_emails_per_day ?? 2,
        emailContactDaysFreq: shopInfo?.email_contact_days_freq ?? 5,
        fromEmail: shopInfo?.from_email,
      };

      // Initialize email progress dialog with campaign lead UUIDs
      const initialStatuses: EmailSendStatus[] = recipients.map(r => ({
        email: r.email,
        status: 'pending',
        campaignsId: r.campaigns_id, // Campaign lead UUID for reset
      }));

      setEmailProgressState({
        isOpen: true,
        total: recipients.length,
        current: 0,
        currentEmail: '',
        delayRemaining: 0,
        emailStatuses: initialStatuses,
        isComplete: false,
        isCancelled: false,
        isPaused: false,
      });

      const result = await batchSendEmails(user.id, recipients, {
        template_id: templateId,
        delayRange: { min: 15, max: 60 },
        throttleSettings,
        shouldCancel: () => emailSendCancelledRef.current,
        isPaused: () => emailSendPausedRef.current,
        onProgress: (progress) => {
          setEmailProgressState(prev => ({
            ...prev,
            current: progress.current,
            currentEmail: progress.currentEmail,
            delayRemaining: progress.delayRemaining,
            isCancelled: progress.status === 'cancelled',
            isPaused: progress.status === 'paused',
          }));
        },
        onEmailSent: (recipient, success, skipped, skipReason, is429Error) => {
          setEmailProgressState(prev => ({
            ...prev,
            emailStatuses: prev.emailStatuses.map(s => 
              s.email === recipient.email 
                ? { 
                    ...s, 
                    status: is429Error ? 'rate_limited' : skipped ? 'skipped' : success ? 'success' : 'failed',
                    skipReason: skipped ? skipReason : undefined,
                    error: !success && !skipped && !is429Error ? 'Send failed' : undefined,
                  } 
                : s
            ),
          }));
        },
      });

      // Mark complete
      setEmailProgressState(prev => ({
        ...prev,
        isComplete: true,
      }));

      setSendEmailToApplicationsDialogOpen(false);
      setSelectedApplications(new Set());

      if (result.success > 0) {
        toast({
          title: "Emails Sent",
          description: `Successfully sent ${result.success} email${result.success !== 1 ? 's' : ''}${result.failed > 0 ? `, ${result.failed} failed` : ''}${result.skipped > 0 ? `, ${result.skipped} skipped` : ''}`,
        });
      } else {
        toast({
          title: "Send Failed",
          description: "No emails were sent successfully",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to send emails to applications:', error);
      setEmailProgressState(prev => ({
        ...prev,
        isComplete: true,
      }));
      toast({
        title: "Error",
        description: "An error occurred while sending emails",
        variant: "destructive",
      });
    } finally {
      setSendingEmailsToApplications(false);
    }
  };

  // Fetch templates for quick send
  const fetchQuickSendTemplates = async () => {
    if (!user?.id) return;
    
    try {
      const response = await adminAPI.getPostmarkTemplates(user.id);
      const standardTemplates = response.Templates.filter(t => t.TemplateType === 'Standard' && t.Active);
      setQuickSendTemplates(standardTemplates);
      
      // Auto-select the template saved in campaign item_info
      if (selectedCampaignForLeads?.item_info?.email_template_alias) {
        const savedTemplate = standardTemplates.find(
          t => t.Alias === selectedCampaignForLeads.item_info?.email_template_alias
        );
        if (savedTemplate) {
          setQuickSendSelectedTemplate(savedTemplate);
        }
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const handleDownloadCSV = async () => {
    if (!user?.id) return;

    setIsDownloadingCSV(true);
    
    try {
      const allClasses = await CSVUtils.fetchAllClasses(user.id);
      
      if (allClasses.length === 0) {
        toast({
          title: "No Classes",
          description: "There are no classes to export",
        });
        return;
      }

      const csvContent = CSVUtils.itemsToRawCSV(allClasses);
      const filename = `classes-export-${new Date().toISOString().split('T')[0]}.csv`;
      
      CSVUtils.downloadCSV(filename, csvContent);
      
      toast({
        title: "Export Complete",
        description: `Downloaded ${allClasses.length} classes`,
      });
    } catch (error) {
      console.error('CSV download error:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : 'Failed to export classes',
        variant: "destructive",
      });
    } finally {
      setIsDownloadingCSV(false);
    }
  };

  const handleVendorSaved = () => {
    setVendorDialogOpen(false);
    setEditingVendor(null);
    fetchVendors(vendorsPage);
  };

  const handleDeleteVendorClick = (vendor: Item) => {
    setVendorToDelete(vendor);
    setDeleteVendorDialogOpen(true);
  };

  const handleDeleteVendorConfirm = async () => {
    if (!vendorToDelete || !user?.id) return;

    try {
      await adminAPI.deleteItem(vendorToDelete.id, user.id);
      toast({
        title: "Success",
        description: "Vendor deleted successfully",
      });
      setDeleteVendorDialogOpen(false);
      setVendorToDelete(null);
      fetchVendors(vendorsPage);
    } catch (error) {
      console.error('Failed to delete vendor:', error);
      toast({
        title: "Error",
        description: "Failed to delete vendor",
        variant: "destructive",
      });
    }
  };

  const handleSponsorSaved = () => {
    setShowSponsorEditView(false);
    setEditingSponsor(null);
    fetchSponsors(sponsorsPage);
  };

  const handleDeleteSponsorClick = (sponsor: Item) => {
    setSponsorToDelete(sponsor);
    setDeleteSponsorDialogOpen(true);
  };

  const handleDeleteSponsorConfirm = async () => {
    if (!sponsorToDelete || !user?.id) return;

    try {
      await adminAPI.deleteItem(sponsorToDelete.id, user.id);
      toast({
        title: "Success",
        description: "Sponsor deleted successfully",
      });
      setDeleteSponsorDialogOpen(false);
      setSponsorToDelete(null);
      fetchSponsors(sponsorsPage);
    } catch (error) {
      console.error('Failed to delete sponsor:', error);
      toast({
        title: "Error",
        description: "Failed to delete sponsor",
        variant: "destructive",
      });
    }
  };

  const handleCopySponsor = async (sponsor: Item) => {
    if (!user?.id) return;

    try {
      let newSlug = `${sponsor.slug}-copy`;
      let counter = 1;
      
      const existingSlugs = sponsors.map(s => s.slug);
      while (existingSlugs.includes(newSlug)) {
        newSlug = `${sponsor.slug}-${counter}`;
        counter++;
      }

      const sponsorCopy: any = {
        ...sponsor,
        slug: newSlug,
        title: `${sponsor.title} (Copy)`,
      };

      delete sponsorCopy.id;
      delete sponsorCopy.created_at;

      await adminAPI.createItem(sponsorCopy, user.id);
      
      toast({
        title: "Success",
        description: "Sponsor duplicated successfully",
      });
      
      fetchSponsors(sponsorsPage);
    } catch (error) {
      console.error('Failed to copy sponsor:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate sponsor",
        variant: "destructive",
      });
    }
  };

  // Campaign handlers
  const handleCampaignSaved = () => {
    setShowCampaignEditView(false);
    setEditingCampaign(null);
    fetchCampaigns(campaignsPage);
  };

  const handleDeleteCampaignClick = (campaign: Item) => {
    setCampaignToDelete(campaign);
    setDeleteCampaignDialogOpen(true);
  };

  const handleDeleteCampaignConfirm = async () => {
    if (!campaignToDelete || !user?.id) return;

    try {
      await adminAPI.deleteItem(campaignToDelete.id, user.id);
      toast({
        title: "Success",
        description: "Campaign deleted successfully",
      });
      setDeleteCampaignDialogOpen(false);
      setCampaignToDelete(null);
      fetchCampaigns(campaignsPage);
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive",
      });
    }
  };

  const handleEditCampaignClick = async (campaign: Item) => {
    if (!user?.id) return;

    try {
      const campaignDetails = await adminAPI.getItemById(Number(campaign.id), user.id);
      setEditingCampaign(campaignDetails);
      setShowCampaignEditView(true);
    } catch (error) {
      console.error('Failed to fetch campaign details:', error);
      toast({
        title: "Error",
        description: "Failed to load campaign details",
        variant: "destructive",
      });
    }
  };

  const handleCopyCampaign = async (campaign: Item) => {
    if (!user?.id) return;

    try {
      let newSlug = `${campaign.slug}-copy`;
      let counter = 1;
      
      const existingSlugs = campaigns.map(c => c.slug);
      while (existingSlugs.includes(newSlug)) {
        newSlug = `${campaign.slug}-${counter}`;
        counter++;
      }

      const campaignCopy: any = {
        ...campaign,
        slug: newSlug,
        title: `${campaign.title} (Copy)`,
      };

      delete campaignCopy.id;
      delete campaignCopy.created_at;

      await adminAPI.createItem(campaignCopy, user.id);
      
      toast({
        title: "Success",
        description: "Campaign duplicated successfully",
      });
      
      fetchCampaigns(campaignsPage);
    } catch (error) {
      console.error('Failed to copy campaign:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate campaign",
        variant: "destructive",
      });
    }
  };

  // Donation handlers
  const handleDonationSaved = () => {
    setShowDonationEditView(false);
    setEditingDonation(null);
    fetchDonations(donationsPage);
  };

  const handleDeleteDonationClick = (donation: Item) => {
    setDonationToDelete(donation);
    setDeleteDonationDialogOpen(true);
  };

  const handleDeleteDonationConfirm = async () => {
    if (!donationToDelete || !user?.id) return;

    try {
      await adminAPI.deleteItem(donationToDelete.id, user.id);
      toast({
        title: "Success",
        description: "Donation deleted successfully",
      });
      setDeleteDonationDialogOpen(false);
      setDonationToDelete(null);
      fetchDonations(donationsPage);
    } catch (error) {
      console.error('Failed to delete donation:', error);
      toast({
        title: "Error",
        description: "Failed to delete donation",
        variant: "destructive",
      });
    }
  };

  const handleEditDonationClick = async (donation: Item) => {
    if (!user?.id) return;

    try {
      const donationDetails = await adminAPI.getItemById(Number(donation.id), user.id);
      setEditingDonation(donationDetails);
      setShowDonationEditView(true);
    } catch (error) {
      console.error('Failed to fetch donation details:', error);
      toast({
        title: "Error",
        description: "Failed to load donation details",
        variant: "destructive",
      });
    }
  };

  const handleCopyDonation = async (donation: Item) => {
    if (!user?.id) return;

    try {
      let newSlug = `${donation.slug}-copy`;
      let counter = 1;
      
      const existingSlugs = donations.map(d => d.slug);
      while (existingSlugs.includes(newSlug)) {
        newSlug = `${donation.slug}-${counter}`;
        counter++;
      }

      const donationCopy: any = {
        ...donation,
        slug: newSlug,
        title: `${donation.title} (Copy)`,
      };

      delete donationCopy.id;
      delete donationCopy.created_at;

      await adminAPI.createItem(donationCopy, user.id);
      
      toast({
        title: "Success",
        description: "Donation duplicated successfully",
      });
      
      fetchDonations(donationsPage);
    } catch (error) {
      console.error('Failed to copy donation:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate donation",
        variant: "destructive",
      });
    }
  };

  // Raffle handlers
  const handleRaffleSaved = () => {
    setShowRaffleEditView(false);
    setEditingRaffle(null);
    fetchRaffles(rafflesPage);
  };

  const handleDeleteRaffleClick = (raffle: Item) => {
    setRaffleToDelete(raffle);
    setDeleteRaffleDialogOpen(true);
  };

  const handleDeleteRaffleConfirm = async () => {
    if (!raffleToDelete || !user?.id) return;

    try {
      await adminAPI.deleteItem(raffleToDelete.id, user.id);
      toast({
        title: "Success",
        description: "Raffle deleted successfully",
      });
      setDeleteRaffleDialogOpen(false);
      setRaffleToDelete(null);
      fetchRaffles(rafflesPage);
    } catch (error) {
      console.error('Failed to delete raffle:', error);
      toast({
        title: "Error",
        description: "Failed to delete raffle",
        variant: "destructive",
      });
    }
  };

  const handleCopyRaffle = async (raffle: Item) => {
    if (!user?.id) return;

    try {
      let newSlug = `${raffle.slug}-copy`;
      let counter = 1;
      
      const existingSlugs = raffles.map(r => r.slug);
      while (existingSlugs.includes(newSlug)) {
        newSlug = `${raffle.slug}-${counter}`;
        counter++;
      }

      const raffleCopy: any = {
        ...raffle,
        slug: newSlug,
        title: `${raffle.title} (Copy)`,
      };

      delete raffleCopy.id;
      delete raffleCopy.created_at;

      await adminAPI.createItem(raffleCopy, user.id);
      
      toast({
        title: "Success",
        description: "Raffle duplicated successfully",
      });
      
      fetchRaffles(rafflesPage);
    } catch (error) {
      console.error('Failed to copy raffle:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate raffle",
        variant: "destructive",
      });
    }
  };

  const handleCopyVendor = async (vendor: Item) => {
    if (!user?.id) return;

    try {
      // Generate unique slug
      let newSlug = `${vendor.slug}-copy`;
      let counter = 1;
      
      // Check if slug exists and increment counter
      const existingSlugs = vendors.map(v => v.slug);
      while (existingSlugs.includes(newSlug)) {
        newSlug = `${vendor.slug}-${counter}`;
        counter++;
      }

      // Create a copy of the vendor with new slug and title
      const vendorCopy: any = {
        ...vendor,
        slug: newSlug,
        title: `${vendor.title} (Copy)`,
      };

      // Remove id and timestamps that shouldn't be copied
      delete vendorCopy.id;
      delete vendorCopy.created_at;

      await adminAPI.createItem(vendorCopy, user.id);
      
      toast({
        title: "Success",
        description: "Vendor duplicated successfully",
      });
      
      fetchVendors(vendorsPage);
    } catch (error) {
      console.error('Failed to copy vendor:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate vendor",
        variant: "destructive",
      });
    }
  };

  const handleApplicationSaved = () => {
    setShowApplicationEditView(false);
    setEditingApplication(null);
    fetchApplications(applicationsPage);
  };

  const handleDeleteApplicationClick = (application: Item) => {
    setApplicationToDelete(application);
    setDeleteApplicationDialogOpen(true);
  };

  const handleDeleteApplicationConfirm = async () => {
    if (!applicationToDelete || !user?.id) return;

    try {
      await adminAPI.deleteItem(applicationToDelete.id, user.id);
      toast({
        title: "Success",
        description: "Application deleted successfully",
      });
      setDeleteApplicationDialogOpen(false);
      setApplicationToDelete(null);
      fetchApplications(applicationsPage);
    } catch (error) {
      console.error('Failed to delete application:', error);
      toast({
        title: "Error",
        description: "Failed to delete application",
        variant: "destructive",
      });
    }
  };

  const handleCopyApplicationClick = (application: Item) => {
    setApplicationToCopy(application);
    setCopyApplicationTitle(application.title || '');
    setCopyApplicationDialogOpen(true);
  };

  const handleCopyApplication = async () => {
    if (!user?.id || !applicationToCopy) return;

    try {
      let newSlug = `${applicationToCopy.slug}-copy`;
      let counter = 1;
      
      const existingSlugs = applications.map(a => a.slug);
      while (existingSlugs.includes(newSlug)) {
        newSlug = `${applicationToCopy.slug}-${counter}`;
        counter++;
      }

      const applicationCopy: any = {
        ...applicationToCopy,
        slug: newSlug,
        title: copyApplicationTitle.trim() || applicationToCopy.title || 'Untitled',
      };

      delete applicationCopy.id;
      delete applicationCopy.created_at;

      await adminAPI.createItem(applicationCopy, user.id);
      
      toast({
        title: "Success",
        description: "Application duplicated successfully",
      });
      
      setCopyApplicationDialogOpen(false);
      setApplicationToCopy(null);
      setCopyApplicationTitle("");
      fetchApplications(applicationsPage);
    } catch (error) {
      console.error('Failed to copy application:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate application",
        variant: "destructive",
      });
    }
  };

  // Filter applications based on search and filters
  const filteredApplications = applications.filter((application) => {
    const appInfo = application.item_info || {};
    const leadPayload = application._leads?.lead_payload || application.lead_payload || {};
    const bookingInfo = application.booking_info || {};
    
    // Extract searchable fields from _leads
    const leadEmail = application._leads?.email || leadPayload.Email || leadPayload.email || bookingInfo.email || '';
    const leadName = leadPayload.business_name || leadPayload.company_name || leadPayload.name || 
      leadPayload.first_name || leadPayload.full_name ||
      bookingInfo.business_name || bookingInfo.company_name || bookingInfo.name || 
      bookingInfo.full_name || bookingInfo.fullName || bookingInfo.applicant_name ||
      application._customers?.Full_name || '';
    
    const matchesSearch =
      applicationSearchQuery === "" ||
      (application.title || '').toLowerCase().includes(applicationSearchQuery.toLowerCase()) ||
      (application.description || '').toLowerCase().includes(applicationSearchQuery.toLowerCase()) ||
      leadName.toLowerCase().includes(applicationSearchQuery.toLowerCase()) ||
      leadEmail.toLowerCase().includes(applicationSearchQuery.toLowerCase()) ||
      (appInfo.applicantName || '').toLowerCase().includes(applicationSearchQuery.toLowerCase()) ||
      (appInfo.applicantEmail || '').toLowerCase().includes(applicationSearchQuery.toLowerCase()) ||
      (appInfo.businessName || '').toLowerCase().includes(applicationSearchQuery.toLowerCase());

    const matchesStatus =
      applicationStatusFilter === "all" ||
      (appInfo.status || 'pending') === applicationStatusFilter;

    const matchesType =
      applicationTypeFilter === "all" ||
      (appInfo.applicationType || 'vendor') === applicationTypeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Export applications to CSV
  const exportApplicationsToCSV = () => {
    const applicationsToExport = filteredApplications;

    const csvHeaders = [
      'Title', 'Status', 'Application Type', 'Applicant Name', 'Applicant Email', 'Applicant Phone',
      'Business Name', 'Business Type', 'Business Description', 'Products/Services',
      'Event Name', 'Booth Size', 'Booth Preference', 'Special Requests',
      'Admin Notes', 'Submitted Date', 'Created At', 'Is Disabled'
    ];
    
    const csvRows = applicationsToExport.map(application => {
      const appInfo = application.item_info || {};
      const leadPayload = application._leads?.lead_payload || application.lead_payload || {};
      const bookingInfo = application.booking_info || {};
      
      // Extract lead info for CSV export
      const leadEmail = application._leads?.email || leadPayload.Email || leadPayload.email || bookingInfo.email || appInfo.applicantEmail || '';
      const leadName = leadPayload.business_name || leadPayload.company_name || leadPayload.name || 
        leadPayload.first_name || leadPayload.full_name ||
        bookingInfo.business_name || bookingInfo.company_name || bookingInfo.name || 
        bookingInfo.full_name || bookingInfo.fullName || bookingInfo.applicant_name ||
        application._customers?.Full_name || appInfo.applicantName || '';
      const leadPhone = leadPayload.phone || leadPayload.mobile || leadPayload.mobile_number ||
        bookingInfo.phone || bookingInfo.mobile || bookingInfo.phone_number || appInfo.applicantPhone || '';
      
      return [
        application.title || '',
        appInfo.status || 'pending',
        appInfo.applicationType || 'vendor',
        leadName,
        leadEmail,
        leadPhone,
        appInfo.businessName || leadPayload.business_name || bookingInfo.business_name || '',
        appInfo.businessType || '',
        appInfo.businessDescription || '',
        appInfo.productsServices || '',
        appInfo.eventName || '',
        appInfo.boothSize || '',
        appInfo.boothPreference || '',
        appInfo.specialRequests || '',
        appInfo.adminNotes || '',
        appInfo.submittedAt ? new Date(appInfo.submittedAt).toLocaleDateString() : '',
        application.created_at ? new Date(application.created_at).toLocaleDateString() : '',
        application.Is_disabled ? 'Yes' : 'No'
      ];
    });

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `applications_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Success",
      description: `Exported ${applicationsToExport.length} application(s) to CSV`,
    });
  };

  // Members helper functions
  const handleMemberSaved = () => {
    setShowMemberDetailView(false);
    setEditingMember(null);
    fetchMembers(membersPage, memberSearchQuery, memberRoleFilter, memberStatusFilter);
  };

  // Members are now filtered server-side, so we use the members array directly
  const filteredMembers = members;

  const exportToCSV = () => {
    const membersToExport = filteredMembers;
    const csvHeaders = ['Name', 'Email', 'Role', 'Status', 'Created At'];
    const csvRows = membersToExport.map(member => [
      member._customers?.Full_name || '',
      member._customers?.email || '',
      member.role || '',
      member.status || '',
      member.created_at ? new Date(member.created_at).toLocaleDateString() : ''
    ]);
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `members_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Success", description: `Exported ${membersToExport.length} member(s) to CSV` });
  };

  const handleBulkRoleUpdate = async () => {
    if (!user?.id || !bulkActionRole || selectedMembers.size === 0) return;
    for (const memberId of selectedMembers) {
      await adminAPI.updateCustomerInfo(memberId, { role: bulkActionRole }, user.id);
    }
    setSelectedMembers(new Set());
    setBulkActionRole("");
    fetchMembers(membersPage, memberSearchQuery, memberRoleFilter, memberStatusFilter);
    toast({ title: "Success", description: `Updated role for ${selectedMembers.size} member(s)` });
  };

  const handleBulkStatusUpdate = async () => {
    if (!user?.id || !bulkActionStatus || selectedMembers.size === 0) return;
    for (const memberId of selectedMembers) {
      await adminAPI.updateCustomerInfo(memberId, { status: bulkActionStatus }, user.id);
    }
    setSelectedMembers(new Set());
    setBulkActionStatus("");
    fetchMembers(membersPage, memberSearchQuery, memberRoleFilter, memberStatusFilter);
    toast({ title: "Success", description: `Updated status for ${selectedMembers.size} member(s)` });
  };

  const toggleSelectAll = () => {
    if (selectedMembers.size === filteredMembers.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(filteredMembers.map(m => m.id)));
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    const newSelection = new Set(selectedMembers);
    if (newSelection.has(memberId)) {
      newSelection.delete(memberId);
    } else {
      newSelection.add(memberId);
    }
    setSelectedMembers(newSelection);
  };

  const getMemberMembershipStatus = (member: Customer) => {
    const booking = membershipBookings.find(b => (b as any).customers_id === member.id);
    if (!booking) return null;
    const paidDate = new Date(booking.booking_items_info?.membership_paid_date || booking.created_at);
    const expiryDate = addYears(paidDate, 1);
    const daysRemaining = differenceInDays(expiryDate, new Date());
    return {
      isActive: daysRemaining > 0,
      daysRemaining,
      membershipType: booking.booking_items_info?.membership_type || 'Standard',
      expiryDate
    };
  };

  // Leads helper functions - server-side filtering now handles search/status
  const filteredLeads = leads;

  const toggleSelectAllLeads = () => {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(filteredLeads.map(l => l.id)));
    }
  };

  const toggleLeadSelection = (leadId: number) => {
    const newSelection = new Set(selectedLeads);
    if (newSelection.has(leadId)) {
      newSelection.delete(leadId);
    } else {
      newSelection.add(leadId);
    }
    setSelectedLeads(newSelection);
  };

  const exportLeadsToCSV = () => {
    const leadsToExport = filteredLeads;
    const csvHeaders = ['Email', 'First Name', 'Last Name', 'Mobile', 'Address', 'Status', 'Created At'];
    const csvRows = leadsToExport.map(lead => [
      lead.email || '',
      lead.lead_payload?.first_name || '',
      lead.lead_payload?.last_name || '',
      lead.lead_payload?.mobile_number || '',
      lead.lead_payload?.property_address || '',
      lead.status || '',
      lead.created_at ? new Date(lead.created_at).toLocaleDateString() : ''
    ]);
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `leads_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Success", description: `Exported ${leadsToExport.length} lead(s) to CSV` });
  };

  const downloadLeadsTemplate = () => {
    const headers = ['email', 'first_name', 'last_name', 'mobile_number', 'property_address'];
    const csvContent = headers.join(',');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'leads_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvUpload = async (file: File) => {
    if (!user?.id) return;
    setIsUploadingCsv(true);
    setCsvUploadProgress({ total: 0, processed: 0, errors: [] });
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length < 2) throw new Error('CSV file is empty or has no data rows');
      const headers = lines[0].split(',').map(h => h.toLowerCase().trim());
      const dataRows = lines.slice(1);
      setCsvUploadProgress({ total: dataRows.length, processed: 0, errors: [] });
      const errors: string[] = [];
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const leadData: any = { lead_payload: {} };
        headers.forEach((header, idx) => {
          if (header === 'email') leadData.email = row[idx];
          else if (header === 'first_name') leadData.lead_payload.first_name = row[idx];
          else if (header === 'last_name') leadData.lead_payload.last_name = row[idx];
          else if (header === 'mobile_number') leadData.lead_payload.mobile_number = row[idx];
          else if (header === 'property_address') leadData.lead_payload.property_address = row[idx];
        });
        try {
          await adminAPI.createLead(leadData, user.id);
        } catch (e) {
          errors.push(`Row ${i + 2}: ${(e as Error).message}`);
        }
        setCsvUploadProgress({ total: dataRows.length, processed: i + 1, errors });
      }
      if (errors.length === 0) {
        toast({ title: "Success", description: `Imported ${dataRows.length} leads successfully` });
        setBulkUploadDialogOpen(false);
        fetchLeads(leadsPage);
      } else {
        toast({ title: "Partial Import", description: `Imported ${dataRows.length - errors.length} leads with ${errors.length} errors`, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsUploadingCsv(false);
      setCsvFile(null);
    }
  };

  const handleDeleteLead = async () => {
    if (!user?.id || !leadToDelete) return;
    try {
      await adminAPI.deleteLead(leadToDelete.id, user.id);
      toast({ title: "Success", description: "Lead deleted successfully" });
      setDeleteLeadDialogOpen(false);
      setLeadToDelete(null);
      fetchLeads(leadsPage);
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete lead", variant: "destructive" });
    }
  };

  // Orders helper functions
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      orderSearchQuery === "" ||
      (order.booking_slug || '').toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      (order._customers?.Full_name || '').toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      (order._customers?.email || '').toLowerCase().includes(orderSearchQuery.toLowerCase());
    const matchesStatus = orderStatusFilters.size === 0 || orderStatusFilters.has((order.status || '').toLowerCase());
    const matchesBookingType = orderBookingTypeFilter === "all" || (order.booking_type || '').toLowerCase() === orderBookingTypeFilter;
    const matchesItemType = orderItemTypeFilter === "all" || 
      order._booking_items_of_bookings?.items?.some((item: any) => item._items?.item_type === orderItemTypeFilter);
    const matchesDateRange = (!orderDateRange.from || new Date(order.created_at) >= orderDateRange.from) &&
      (!orderDateRange.to || new Date(order.created_at) <= orderDateRange.to);
    const matchesDeleted = showDeletedOrders || !order.is_deleted;
    return matchesSearch && matchesStatus && matchesBookingType && matchesItemType && matchesDateRange && matchesDeleted;
  });

  const orderItemTypes = [...new Set(orders.flatMap(o => 
    o._booking_items_of_bookings?.items?.map((item: any) => item._items?.item_type).filter(Boolean) || []
  ))];

  const hasActiveOrderFilters = orderSearchQuery !== "" || orderStatusFilters.size > 0 || 
    orderBookingTypeFilter !== "all" || orderItemTypeFilter !== "all" || orderDateRange.from || orderDateRange.to || orderBookingSlugFilter !== "";

  const clearOrderFilters = () => {
    setOrderSearchQuery("");
    setOrderStatusFilters(new Set());
    setOrderBookingTypeFilter("all");
    setOrderItemTypeFilter("all");
    setOrderDateRange({ from: undefined, to: undefined });
    setOrderBookingSlugFilter("");
  };

  const toggleOrderStatusFilter = (status: string) => {
    const newFilters = new Set(orderStatusFilters);
    const lowerStatus = status.toLowerCase();
    if (newFilters.has(lowerStatus)) {
      newFilters.delete(lowerStatus);
    } else {
      newFilters.add(lowerStatus);
    }
    setOrderStatusFilters(newFilters);
  };

  const getOrderStatusColor = (status: string) => {
    const lowerStatus = (status || '').toLowerCase();
    if (lowerStatus === 'paid') return 'bg-green-500/10 text-green-600';
    if (lowerStatus === 'pending') return 'bg-yellow-500/10 text-yellow-600';
    if (lowerStatus === 'cancelled') return 'bg-red-500/10 text-red-600';
    if (lowerStatus === 'completed') return 'bg-blue-500/10 text-blue-600';
    return 'bg-gray-500/10 text-gray-600';
  };

  const calculateOrderTotal = (order: Order) => {
    return order._booking_items_of_bookings?.items?.reduce((sum: number, item: any) => {
      return sum + (item.price || 0) * (item.quantity || 1);
    }, 0) || 0;
  };

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetail(true);
  };

  const handleBackToOrderList = () => {
    setSelectedOrder(null);
    setShowOrderDetail(false);
  };

  const handleDeleteOrderClick = (order: Order) => {
    setOrderToDelete(order);
    setDeleteOrderDialogOpen(true);
  };

  const handleDeleteOrder = async () => {
    if (!user?.id || !orderToDelete) return;
    
    setIsDeletingOrder(true);
    try {
      await adminAPI.deleteBooking(orderToDelete.id, user.id);
      toast({ title: "Success", description: "Order deleted successfully" });
      setDeleteOrderDialogOpen(false);
      setOrderToDelete(null);
      // If we're in detail view, go back to list
      if (showOrderDetail && selectedOrder?.id === orderToDelete.id) {
        setSelectedOrder(null);
        setShowOrderDetail(false);
      }
      fetchOrders(ordersPage);
    } catch (error) {
      console.error('Failed to delete order:', error);
      toast({ title: "Error", description: "Failed to delete order", variant: "destructive" });
    } finally {
      setIsDeletingOrder(false);
    }
  };

  // Delete All Application handlers
  const handleDeleteAllApplicationClick = (application: any) => {
    setAllApplicationToDelete(application);
    setDeleteAllApplicationDialogOpen(true);
  };

  const handleDeleteAllApplicationConfirm = async () => {
    if (!allApplicationToDelete || !user?.id) return;
    
    setIsDeletingAllApplication(true);
    try {
      await adminAPI.deleteBooking(allApplicationToDelete.id, user.id);
      toast({ title: "Success", description: "Application deleted successfully" });
      setDeleteAllApplicationDialogOpen(false);
      setAllApplicationToDelete(null);
      // Refetch with current filters
      fetchAllApplications(allApplicationsPage, getAllApplicationsFilterOptions());
    } catch (error) {
      console.error('Failed to delete application:', error);
      toast({ title: "Error", description: "Failed to delete application", variant: "destructive" });
    } finally {
      setIsDeletingAllApplication(false);
    }
  };

  // Bulk delete all applications handler
  const handleBulkDeleteAllApplicationsConfirm = async () => {
    if (!user?.id || selectedApplications.size === 0) return;
    
    setIsBulkDeletingAllApplications(true);
    const applicationIds = Array.from(selectedApplications);
    const progress = { total: applicationIds.length, processed: 0, errors: [] as string[] };
    setBulkDeleteAllApplicationsProgress(progress);
    
    for (const appId of applicationIds) {
      try {
        await adminAPI.deleteBooking(appId, user.id);
        progress.processed++;
        setBulkDeleteAllApplicationsProgress({ ...progress });
      } catch (error) {
        console.error(`Failed to delete application ${appId}:`, error);
        progress.errors.push(`Failed to delete application ID: ${appId}`);
        progress.processed++;
        setBulkDeleteAllApplicationsProgress({ ...progress });
      }
    }
    
    setIsBulkDeletingAllApplications(false);
    setBulkDeleteAllApplicationsDialogOpen(false);
    setBulkDeleteAllApplicationsProgress(null);
    setSelectedApplications(new Set());
    
    if (progress.errors.length > 0) {
      toast({
        title: "Partially Completed",
        description: `Deleted ${progress.total - progress.errors.length} of ${progress.total} applications. ${progress.errors.length} failed.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Successfully deleted ${progress.total} application${progress.total !== 1 ? 's' : ''}`,
      });
    }
    
    // Refresh the list
    fetchAllApplications(allApplicationsPage, getAllApplicationsFilterOptions());
  };

  // Bulk update application statuses
  const handleBulkStatusUpdateConfirm = async () => {
    if (!user?.id || selectedApplications.size === 0 || !selectedBulkStatus) return;
    
    setIsBulkUpdatingStatus(true);
    const applicationIds = Array.from(selectedApplications);
    const progress = { total: applicationIds.length, processed: 0, errors: [] as string[] };
    setBulkStatusUpdateProgress(progress);
    
    for (const appId of applicationIds) {
      try {
        await elegantAPI.patch(`/booking/${appId}`, {
          status: selectedBulkStatus
        }, user.id);
        progress.processed++;
        setBulkStatusUpdateProgress({ ...progress });
      } catch (error) {
        console.error(`Failed to update application ${appId}:`, error);
        progress.errors.push(`Failed to update application ID: ${appId}`);
        progress.processed++;
        setBulkStatusUpdateProgress({ ...progress });
      }
      // Small delay between requests to avoid rate limiting
      if (progress.processed < applicationIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    setIsBulkUpdatingStatus(false);
    setBulkStatusUpdateDialogOpen(false);
    setBulkStatusUpdateProgress(null);
    setSelectedBulkStatus('');
    setSelectedApplications(new Set());
    
    if (progress.errors.length > 0) {
      toast({
        title: "Partially Completed",
        description: `Updated ${progress.total - progress.errors.length} of ${progress.total} applications. ${progress.errors.length} failed.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Successfully updated ${progress.total} application${progress.total !== 1 ? 's' : ''} to "${formatStatusLabel(selectedBulkStatus)}"`,
      });
    }
    
    // Refresh the list and status counts
    fetchAllApplications(allApplicationsPage, getAllApplicationsFilterOptions());
    fetchVendorApplicationStatusCounts();
  };

  const toggleOrderSelection = (orderId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const toggleAllOrdersSelection = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const handleBulkDeleteOrders = async () => {
    if (!user?.id || selectedOrders.size === 0) return;
    
    setIsBulkDeletingOrders(true);
    let successCount = 0;
    let failCount = 0;
    
    for (const orderId of selectedOrders) {
      try {
        await adminAPI.deleteBooking(orderId, user.id);
        successCount++;
      } catch (error) {
        console.error(`Failed to delete order ${orderId}:`, error);
        failCount++;
      }
    }
    
    setBulkDeleteOrderDialogOpen(false);
    setSelectedOrders(new Set());
    setIsBulkDeletingOrders(false);
    
    if (failCount === 0) {
      toast({ title: "Success", description: `Deleted ${successCount} order${successCount !== 1 ? 's' : ''}` });
    } else {
      toast({ 
        title: "Partial Success", 
        description: `Deleted ${successCount} order${successCount !== 1 ? 's' : ''}, ${failCount} failed`,
        variant: "destructive"
      });
    }
    
    fetchOrders(ordersPage);
  };

  const handleUpdateBookingType = async (bookingType: string) => {
    if (!user?.id || !selectedOrder) return;
    try {
      await adminAPI.updateBooking(selectedOrder.id, { booking_type: bookingType }, user.id);
      toast({ title: "Success", description: "Booking type updated" });
      fetchOrders(ordersPage);
    } catch (error) {
      toast({ title: "Error", description: "Failed to update booking type", variant: "destructive" });
    }
  };

  const handleAddNote = async () => {
    if (!user?.id || !selectedOrder || !newNote.trim()) return;
    try {
      await adminAPI.createCustomerNote({
        customers_id: selectedOrder.customers_id,
        notes: newNote
      }, user.id);
      setNewNote('');
      toast({ title: "Success", description: "Note added" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to add note", variant: "destructive" });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!user?.id) return;
    try {
      await adminAPI.deleteCustomerNote(noteId, user.id);
      toast({ title: "Success", description: "Note deleted" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete note", variant: "destructive" });
    }
  };

  const exportOrdersToCSV = () => {
    const ordersToExport = filteredOrders;
    const csvHeaders = ['Order #', 'Customer', 'Email', 'Status', 'Type', 'Total', 'Created At'];
    const csvRows = ordersToExport.map(order => [
      order.booking_slug || '',
      order._customers?.Full_name || '',
      order._customers?.email || '',
      order.status || '',
      order.booking_type || '',
      calculateOrderTotal(order).toFixed(2),
      order.created_at ? new Date(order.created_at).toLocaleDateString() : ''
    ]);
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Success", description: `Exported ${ordersToExport.length} order(s) to CSV` });
  };

  const getEventInfo = (event: Item) => {
    try {
      return event.item_info ? JSON.parse(JSON.stringify(event.item_info)) : null;
    } catch {
      return null;
    }
  };

  // Fetch media items when component mounts and user is available or page changes
  useEffect(() => {
    if (user?.id && customer) {
      fetchMediaItems(mediaPage);
    }
  }, [user?.id, customer, mediaPage]);

  // Fetch events when on events tab
  useEffect(() => {
    if (user?.id && activeTab === 'events') {
      fetchEvents(currentPage);
    }
  }, [user?.id, activeTab, currentPage]);

  // Fetch classes when on classes tab
  useEffect(() => {
    if (user?.id && activeTab === 'classes') {
      fetchClasses(classesPage);
    }
  }, [user?.id, activeTab, classesPage]);

  // Fetch vendors when on vendors tab
  useEffect(() => {
    if (user?.id && activeTab === 'vendors') {
      if (vendorsSubTab === 'list') {
        fetchVendors(vendorsPage);
      } else if (vendorsSubTab === 'applications') {
        fetchVendorApplications(vendorApplicationsPage, vendorApplicationStatusFilter, vendorApplicationSearchQuery);
      } else if (vendorsSubTab === 'all-applications') {
        fetchAllApplications(allApplicationsPage, getAllApplicationsFilterOptions());
      }
      // Fetch status counts when entering vendors tab
      fetchVendorApplicationStatusCounts();
    }
  }, [user?.id, activeTab, vendorsPage, vendorsSubTab, vendorApplicationsPage, vendorApplicationStatusFilter, allApplicationsPage, allApplicationsPerPage, allApplicationsStatusFilter, allApplicationsCheckoutTypeFilter, allApplicationsPaymentStatusFilter, allApplicationsBookingTypeFilter, allApplicationsItemsTypeFilter, allApplicationsDateRange]);

  // Fetch sponsors when on sponsors tab
  useEffect(() => {
    if (user?.id && activeTab === 'sponsors') {
      fetchSponsors(sponsorsPage);
    }
  }, [user?.id, activeTab, sponsorsPage]);

  // Fetch donations when on donations tab
  useEffect(() => {
    if (user?.id && activeTab === 'donations') {
      fetchDonations(donationsPage);
    }
  }, [user?.id, activeTab, donationsPage]);

  // Fetch blogs when on blogs tab
  useEffect(() => {
    if (user?.id && activeTab === 'blogs') {
      fetchBlogs(blogsPage);
    }
  }, [user?.id, activeTab, blogsPage]);

  // Fetch campaigns when on campaign-leads tab
  useEffect(() => {
    if (user?.id && activeTab === 'campaign-leads') {
      // Fetch campaigns list first (shown by default)
      if (campaigns.length === 0) fetchCampaigns(1);
      // Also fetch leads for the assign dialog
      if (leads.length === 0) fetchLeads(1);
    }
  }, [user?.id, activeTab]);

  // Fetch campaign leads when a campaign is selected
  useEffect(() => {
    if (user?.id && selectedCampaignForLeads) {
      fetchCampaignLeads(Number(selectedCampaignForLeads.id), campaignLeadsPage);
      // Also fetch related items for this campaign
      fetchRelatedItems(selectedCampaignForLeads.id);
      // Fetch sharable links for the campaign itself
      const baseUrl = `${customer?._shops?.custom_domain || window.location.origin}/donation`;
      elegantAPI.getSharableLinks(selectedCampaignForLeads.id, baseUrl, 0, 0)
        .then(links => setCampaignSharableLinks(links))
        .catch(err => console.error('Failed to fetch campaign sharable links:', err));
    } else {
      setCampaignSharableLinks(null);
    }
  }, [user?.id, selectedCampaignForLeads, campaignLeadsPage]);

  // Fetch related items when editing a campaign
  useEffect(() => {
    if (user?.id && editingCampaign && showCampaignEditView) {
      fetchRelatedItems(editingCampaign.id);
    }
  }, [user?.id, editingCampaign, showCampaignEditView]);

  // Fetch raffles when on raffles tab
  useEffect(() => {
    if (user?.id && activeTab === 'raffles') {
      fetchRaffles(rafflesPage);
    }
  }, [user?.id, activeTab, rafflesPage]);

  // Fetch newsletters when on newsletter tab
  useEffect(() => {
    if (user?.id && activeTab === 'newsletter') {
      fetchNewsletters(newslettersPage);
    }
  }, [user?.id, activeTab, newslettersPage]);

  // Fetch applications when on applications tab
  useEffect(() => {
    if (user?.id && activeTab === 'applications') {
      fetchApplications(applicationsPage);
    }
  }, [user?.id, activeTab, applicationsPage]);

  // Fetch members when on members tab or when filters change
  useEffect(() => {
    if (user?.id && activeTab === 'members') {
      // Debounce search queries
      const timeoutId = setTimeout(() => {
        fetchMembers(membersPage, memberSearchQuery, memberRoleFilter, memberStatusFilter);
      }, memberSearchQuery ? 300 : 0);
      
      return () => clearTimeout(timeoutId);
    }
  }, [user?.id, activeTab, membersPage, memberSearchQuery, memberRoleFilter, memberStatusFilter]);

  // Debounce lead search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedLeadSearch(leadSearchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [leadSearchQuery]);

  // Fetch leads when on leads tab or filters change
  useEffect(() => {
    if (user?.id && activeTab === 'leads') {
      setLeadsPage(1); // Reset to page 1 when filters change
      fetchLeads(1);
    }
  }, [user?.id, activeTab, debouncedLeadSearch, leadStatusFilter, leadFilterNew]);

  // Fetch leads when page changes (but not on filter changes)
  useEffect(() => {
    if (user?.id && activeTab === 'leads' && leadsPage > 1) {
      fetchLeads(leadsPage);
    }
  }, [leadsPage]);

  // Note: Order filter options are now populated by the initial sidebar analytics fetch

  // Fetch orders when Orders tab is active or filters change
  useEffect(() => {
    if (activeTab === 'orders' && user?.id) {
      fetchOrders(ordersPage);
    }
  }, [user?.id, activeTab, ordersPage, orderBookingTypeFilter, orderItemTypeFilter, orderStatusFilters, orderSearchQuery, orderDateRange, showDeletedOrders, orderBookingSlugFilter]);

  // Fetch tasks when Tasks tab is active
  useEffect(() => {
    if (activeTab === 'tasks' && user?.id) {
      fetchTasks(tasksPage);
      // Also fetch members for task assignment
      if (members.length === 0) {
        fetchMembers(1);
      }
    }
  }, [user?.id, activeTab, tasksPage]);


  const handleMediaUploaded = async (url: string, mediaType?: 'Image' | 'Video' | 'YouTube') => {
    console.log('Media uploaded to admin:', url, 'Type:', mediaType);
    // Refresh media list after upload
    if (user?.id) {
      setMediaPage(1); // Reset to first page
      await fetchMediaItems(1);
      toast({
        title: "Success",
        description: `${mediaType || 'Media'} uploaded successfully`,
      });
    }
  };

  const handleMediaDeleteClick = (e: React.MouseEvent, item: MediaFile) => {
    e.stopPropagation();
    setMediaToDelete(item);
    setDeleteMediaDialogOpen(true);
  };

  const handleMediaDeleteConfirm = async () => {
    if (!mediaToDelete || !user?.id) return;
    
    setDeletingMedia(true);
    try {
      await adminAPI.deleteImage(mediaToDelete.id.toString(), user.id);
      toast({
        title: "Success",
        description: "Media deleted successfully",
      });
      setDeleteMediaDialogOpen(false);
      setMediaToDelete(null);
      // Refresh the list
      await fetchMediaItems(mediaPage);
    } catch (error) {
      console.error("Failed to delete media:", error);
      toast({
        title: "Error",
        description: "Failed to delete media",
        variant: "destructive",
      });
    } finally {
      setDeletingMedia(false);
    }
  };

  const handleMediaSelectChange = (itemId: string, checked: boolean) => {
    setSelectedMediaIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  };

  const handleSelectAllMedia = (filteredItems: MediaFile[]) => {
    if (selectedMediaIds.size === filteredItems.length) {
      setSelectedMediaIds(new Set());
    } else {
      setSelectedMediaIds(new Set(filteredItems.map(item => item.id)));
    }
  };

  const handleBulkDeleteMediaConfirm = async () => {
    if (selectedMediaIds.size === 0 || !user?.id) return;
    
    setBulkDeletingMedia(true);
    try {
      const deletePromises = Array.from(selectedMediaIds).map(mediafilesId =>
        adminAPI.deleteImage(mediafilesId.toString(), user.id)
      );
      
      await Promise.all(deletePromises);
      
      toast({
        title: "Success",
        description: `${selectedMediaIds.size} media file(s) deleted successfully`,
      });
      setBulkDeleteMediaDialogOpen(false);
      setSelectedMediaIds(new Set());
      await fetchMediaItems(mediaPage);
    } catch (error) {
      console.error("Failed to delete media:", error);
      toast({
        title: "Error",
        description: "Failed to delete some media files",
        variant: "destructive",
      });
    } finally {
      setBulkDeletingMedia(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Helper component for auth-gated actions
  const AuthGatedButton = ({ children, onClick, ...props }: any) => {
    if (!isSignedIn) {
      return (
        <Button 
          {...props}
          onClick={() => {
            toast({
              title: "Login Required",
              description: "Please sign in to perform this action",
            });
            navigate("/sign-in");
          }}
        >
          {children}
        </Button>
      );
    }
    return <Button {...props} onClick={onClick}>{children}</Button>;
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen w-full flex bg-background">
        {/* Sidebar */}
        <AdminSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          sidebarItems={sidebarItems}
          vendorsSubTab={vendorsSubTab}
          setVendorsSubTab={setVendorsSubTab}
          vendorApplicationStatusFilter={vendorApplicationStatusFilter}
          setVendorApplicationStatusFilter={setVendorApplicationStatusFilter}
          vendorApplicationStatusCounts={vendorApplicationStatusCounts}
          setVendorApplicationsPage={setVendorApplicationsPage}
          setAllApplicationsPage={setAllApplicationsPage}
          itemCounts={{
            orders: sidebarCounts.orders,
            'all-applications': sidebarCounts.applications,
            leads: sidebarCounts.leads,
            members: sidebarCounts.members,
            tasks: sidebarCounts.tasks,
          }}
          newItemCounts={{
            orders: sidebarCounts.ordersNew,
            'all-applications': sidebarCounts.applicationsNew,
            leads: sidebarCounts.leadsNew,
            members: sidebarCounts.membersNew,
            tasks: sidebarCounts.tasksNew,
          }}
          customStatusesConfig={customStatusesConfig}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header - Mobile Optimized */}
          <header className={`border-b bg-card sticky z-10 ${impersonationState.isActive ? 'top-10' : 'top-0'}`}>
            <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
              {/* Mobile Header Row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                  <SidebarTrigger className="h-10 w-10 shrink-0" />
                  <div className="min-w-0">
                    <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">Admin Dashboard</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate hidden sm:block">
                      Mineral & Science Club Management
                    </p>
                  </div>
                </div>
                
                {/* Right Side Actions */}
                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                  <Link to="/" className="hidden sm:block">
                    <Button variant="outline" size="sm">
                      <Home className="h-4 w-4 sm:mr-2" />
                      <span className="hidden md:inline">Home</span>
                    </Button>
                  </Link>
                  <Link to="/" className="sm:hidden">
                    <Button variant="outline" size="icon" className="h-10 w-10">
                      <Home className="h-5 w-5" />
                    </Button>
                  </Link>
                  
                  {/* Role Preview Selector - only for admins (hidden on mobile) */}
                  {realUserRole === 'admin' && !impersonationState.isActive && (
                    <div className="hidden lg:block">
                      <RolePreviewSelector currentRole={realUserRole} />
                    </div>
                  )}
                  
                  {isSignedIn ? (
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-xs sm:text-sm text-muted-foreground hidden md:block max-w-[200px] truncate">
                        {customer?.Full_name || user?.firstName || user?.emailAddresses[0]?.emailAddress}
                      </span>
                      <UserButton afterSignOutUrl="/" />
                    </div>
                  ) : (
                    <Link to="/sign-in">
                      <Button size="sm" className="h-10 px-3 sm:px-4">
                        Sign In
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </header>

          <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 overflow-x-hidden pb-20 md:pb-8">
            {/* Public Access Info */}
            {!isSignedIn && (
              <Alert className="mb-4 sm:mb-6">
                <AlertTitle className="text-sm sm:text-base">Public View Mode</AlertTitle>
                <AlertDescription className="text-xs sm:text-sm">
                  You're viewing in read-only mode. <Link to="/sign-in" className="underline font-medium">Sign in</Link> to manage content.
                </AlertDescription>
              </Alert>
            )}
            
            {/* Test Mode Alert */}
            {isTestMode && (
              <Alert variant="destructive" className="mb-4 sm:mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-sm sm:text-base">Test Mode Active</AlertTitle>
                <AlertDescription className="text-xs sm:text-sm">
                  Authorization checks are disabled for admin pages.
                </AlertDescription>
              </Alert>
            )}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
              {/* Dashboard Tab */}
              <TabsContent value="dashboard" className="space-y-4">
                <VersionCheck checkInterval={60000} />
                <div className="mb-4">
                  <h2 className="text-xl sm:text-2xl font-bold">Dashboard</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">Analytics overview and key metrics</p>
                </div>
                <AdminDashboard clerkUserId={user?.id || ''} />
              </TabsContent>

              {/* Events Tab */}
              <TabsContent value="events" className="space-y-4">
                {showEventEditView ? (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-fit h-10 touch-manipulation"
                        onClick={() => {
                          setShowEventEditView(false);
                          setEditingEvent(null);
                        }}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1 sm:mr-2" />
                        <span className="text-sm">Back</span>
                      </Button>
                      <div className="min-w-0">
                        <h2 className="text-xl sm:text-2xl font-bold truncate">
                          {editingEvent ? 'Edit Event' : 'Create New Event'}
                        </h2>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {editingEvent ? 'Update event information' : 'Add a new event to your calendar'}
                        </p>
                      </div>
                    </div>
                    <Card className="p-3 sm:p-6">
                      <EventForm event={editingEvent} onSuccess={handleEventSaved} />
                    </Card>
                  </div>
                ) : (
                <>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4">
                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl font-bold">Events Management</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">Create and manage club events</p>
                  </div>
                  <AuthGatedButton 
                    className="w-full sm:w-auto h-10 touch-manipulation"
                    onClick={() => {
                      setEditingEvent(null);
                      setShowEventEditView(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Event
                  </AuthGatedButton>
                </div>

                {loadingEvents ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <div className="h-32 sm:h-48 bg-muted rounded-t-lg" />
                        <CardHeader className="p-3 sm:p-6">
                          <div className="h-5 sm:h-6 bg-muted rounded" />
                          <div className="h-3 sm:h-4 bg-muted rounded w-2/3" />
                        </CardHeader>
                        <CardContent className="p-3 sm:p-6 pt-0">
                          <div className="space-y-2">
                            <div className="h-3 sm:h-4 bg-muted rounded" />
                            <div className="h-3 sm:h-4 bg-muted rounded w-5/6" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : events.length === 0 ? (
                  <Card className="text-center py-8 sm:py-12">
                    <CardContent>
                      <Calendar className="h-10 sm:h-12 w-10 sm:w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-base sm:text-lg font-semibold mb-2">No events yet</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Create your first event to get started
                      </p>
                      {isSignedIn && (
                        <Button 
                          className="h-10 touch-manipulation"
                          onClick={() => {
                            setEditingEvent(null);
                            setShowEventEditView(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Event
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {events.map((event) => {
                        const eventInfo = getEventInfo(event);
                        const imageUrl = eventInfo?.image?.[0] || null;
                        
                        // Detect media type from URL
                        const getMediaType = (url: string | null): 'Image' | 'Video' | 'YouTube' => {
                          if (!url) return 'Image';
                          if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
                          if (url.match(/\.(mp4|webm|ogg|mov)$/i)) return 'Video';
                          return 'Image';
                        };
                        
                        const mediaType = getMediaType(imageUrl);
                        
                        return (
                          <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                            {imageUrl && (
                              <div className="aspect-video w-full overflow-hidden bg-black relative">
                                {mediaType === 'YouTube' ? (
                                  <iframe
                                    src={imageUrl}
                                    className="w-full h-full object-cover"
                                    title={event.title}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  />
                                ) : mediaType === 'Video' ? (
                                  <video
                                    src={imageUrl}
                                    className="w-full h-full object-cover"
                                    muted
                                    loop
                                    playsInline
                                  />
                                ) : (
                                  <img
                                    src={imageUrl}
                                    alt={event.title}
                                    className="w-full h-full object-cover"
                                  />
                                )}
                                {/* Slug Badge */}
                                <Badge variant="secondary" className="absolute bottom-2 left-2 z-10 font-mono text-xs">
                                  {event.slug}
                                </Badge>
                              </div>
                            )}
                            <CardHeader className="p-3 sm:p-6">
                              <div className="flex items-start justify-between gap-2">
                                <CardTitle className="text-base sm:text-xl line-clamp-2">{event.title}</CardTitle>
                                <div className="flex gap-0.5 shrink-0 -mr-2">
                                  <Link to={`/event/${event.slug}`} target="_blank" rel="noopener noreferrer">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-9 w-9 sm:h-8 sm:w-8 touch-manipulation"
                                      title="Preview Event"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                  {isSignedIn && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 sm:h-8 sm:w-8 touch-manipulation"
                                        onClick={() => {
                                          setEditingEvent(event);
                                          setShowEventEditView(true);
                                        }}
                                        title="Edit Event"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 sm:h-8 sm:w-8 touch-manipulation hidden sm:flex"
                                        onClick={() => handleCopyEventClick(event)}
                                        title="Duplicate Event"
                                      >
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 sm:h-8 sm:w-8 touch-manipulation hidden sm:flex"
                                        onClick={() => handleAddEventToCampaign(event)}
                                        title="Start a new campaign"
                                      >
                                        <Target className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 sm:h-8 sm:w-8 touch-manipulation"
                                        onClick={() => handleDeleteClick(event)}
                                        title="Delete Event"
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                              <CardDescription className="line-clamp-2 text-xs sm:text-sm">
                                {event.description}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2 sm:space-y-3 p-3 sm:p-6 pt-0">
                              {eventInfo?.startDate && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Calendar className="h-4 w-4" />
                                  <span>
                                    {new Date(eventInfo.startDate).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                    {' at '}
                                    {new Date(eventInfo.startDate).toLocaleTimeString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                    {eventInfo.endDate && ` - ${new Date(eventInfo.endDate).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}`}
                                  </span>
                                </div>
                              )}
                              {eventInfo?.location?.name && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <MapPin className="h-4 w-4" />
                                  <span className="line-clamp-1">{eventInfo.location.name}</span>
                                </div>
                              )}
                              {event.tags && (
                                <div className="flex flex-wrap gap-1">
                                  {event.tags.split(',').map((tag, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                      {tag.trim()}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                            <CardFooter>
                              <Badge variant={event.Is_disabled ? "destructive" : "default"}>
                                {event.Is_disabled ? 'Disabled' : 'Active'}
                              </Badge>
                            </CardFooter>
                          </Card>
                        );
                      })}
                    </div>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-4 mt-8">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="text-sm text-muted-foreground">
                          Page {currentPage} of {totalPages} ({totalItems} total events)
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the event "{eventToDelete?.title}". 
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteConfirm}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Copy Event Confirmation Dialog */}
                <AlertDialog open={copyEventDialogOpen} onOpenChange={setCopyEventDialogOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Duplicate Event</AlertDialogTitle>
                      <AlertDialogDescription>
                        Enter a title for the duplicated event.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                      <Label htmlFor="copy-event-title">Title</Label>
                      <Input
                        id="copy-event-title"
                        value={copyEventTitle}
                        onChange={(e) => setCopyEventTitle(e.target.value)}
                        placeholder="Enter title for the copy"
                        className="mt-2"
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCopyEvent}>
                        Duplicate
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                </>
                )}
              </TabsContent>

              {/* Classes Tab */}
              <TabsContent value="classes" className="space-y-4">
                {showClassEditView ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 mb-6">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowClassEditView(false);
                          setEditingClass(null);
                        }}
                      >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Back to Classes
                      </Button>
                      <div>
                        <h2 className="text-2xl font-bold">
                          {editingClass ? 'Edit Class' : 'Create New Class'}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {editingClass ? 'Update class information' : 'Add a new class to your catalog'}
                        </p>
                      </div>
                    </div>
                    <Card className="p-6">
                      <ClassForm classItem={editingClass} onSuccess={handleClassSaved} />
                    </Card>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h2 className="text-2xl font-bold">Classes Management</h2>
                        <p className="text-muted-foreground">Create and manage club classes & workshops</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={handleDownloadCSV}
                          disabled={isDownloadingCSV || classes.length === 0}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {isDownloadingCSV ? 'Exporting...' : 'Export CSV'}
                        </Button>
                        <AuthGatedButton onClick={() => {
                          setEditingClass(null);
                          setShowClassEditView(true);
                        }}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Class
                        </AuthGatedButton>
                      </div>
                    </div>

                    {loadingClasses ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <div className="h-48 bg-muted rounded-t-lg" />
                        <CardHeader>
                          <div className="h-6 bg-muted rounded" />
                          <div className="h-4 bg-muted rounded w-2/3" />
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="h-4 bg-muted rounded" />
                            <div className="h-4 bg-muted rounded w-5/6" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                    ) : classes.length === 0 ? (
                      <Card className="text-center py-12">
                        <CardContent>
                          <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No classes yet</h3>
                          <p className="text-muted-foreground mb-4">
                            Create your first class to get started
                          </p>
                          {isSignedIn && (
                            <Button onClick={() => {
                              setEditingClass(null);
                              setShowClassEditView(true);
                            }}>
                              <Plus className="h-4 w-4 mr-2" />
                              Create Class
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {classes.map((classItem) => {
                            const classInfo = getEventInfo(classItem);
                            const imageUrl = classInfo?.image?.[0] || null;
                            
                            const getMediaType = (url: string | null): 'Image' | 'Video' | 'YouTube' => {
                              if (!url) return 'Image';
                              if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
                              if (url.match(/\.(mp4|webm|ogg|mov)$/i)) return 'Video';
                              return 'Image';
                            };
                            
                            const mediaType = getMediaType(imageUrl);
                            
                            return (
                              <Card key={classItem.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                {imageUrl && (
                                  <div className="aspect-video w-full overflow-hidden bg-black relative">
                                    {mediaType === 'YouTube' ? (
                                      <iframe
                                        src={imageUrl}
                                        className="w-full h-full object-cover"
                                        title={classItem.title}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      />
                                    ) : mediaType === 'Video' ? (
                                      <video
                                        src={imageUrl}
                                        className="w-full h-full object-cover"
                                        muted
                                        loop
                                        playsInline
                                      />
                                    ) : (
                                      <img
                                        src={imageUrl}
                                        alt={classItem.title}
                                        className="w-full h-full object-cover"
                                      />
                                    )}
                                    <Badge variant="secondary" className="absolute bottom-2 left-2 z-10 font-mono text-xs">
                                      {classItem.slug}
                                    </Badge>
                                    {/* Price Badge */}
                                    <Badge variant="secondary" className="absolute bottom-2 right-2 z-10 font-semibold">
                                      {!classItem.price || classItem.price === 0 ? (
                                        'FREE'
                                      ) : (
                                        <span className="flex items-start">
                                          <span className="text-base leading-none">
                                            ${Math.floor(classItem.price)}
                                          </span>
                                          <span className="text-[0.6em] leading-none ml-0.5">
                                            .{(classItem.price % 1).toFixed(2).split('.')[1]}
                                          </span>
                                        </span>
                                      )}
                                    </Badge>
                                  </div>
                                )}
                                <CardHeader>
                                  <div className="flex items-start justify-between">
                                    <CardTitle className="text-xl">{classItem.title}</CardTitle>
                                    <div className="flex gap-1">
                                      {isSignedIn && (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                              setEditingClass(classItem);
                                              setShowClassEditView(true);
                                            }}
                                            title="Edit Class"
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleCopyClassClick(classItem)}
                                            title="Duplicate Class"
                                          >
                                            <Copy className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleAddClassToCampaign(classItem)}
                                            title="Start a new campaign"
                                          >
                                            <Target className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteClassClick(classItem)}
                                            title="Delete Class"
                                          >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <CardDescription className="line-clamp-2">
                                    {classItem.description}
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  {classInfo?.educationalLevel && (
                                    <Badge variant="outline" className="mb-2">
                                      {classInfo.educationalLevel}
                                    </Badge>
                                  )}
                                  {classInfo?.startDate && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Calendar className="h-4 w-4" />
                                      <span>
                                        {new Date(classInfo.startDate).toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric'
                                        })}
                                        {' at '}
                                        {new Date(classInfo.startDate).toLocaleTimeString('en-US', {
                                          hour: 'numeric',
                                          minute: '2-digit',
                                          hour12: true
                                        })}
                                      </span>
                                    </div>
                                  )}
                                  {classInfo?.duration && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Clock className="h-4 w-4" />
                                      <span>{(() => {
                                        // Convert ISO 8601 duration to readable format
                                        const match = classInfo.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
                                        if (!match) return classInfo.duration;
                                        const hours = parseInt(match[1] || '0');
                                        const minutes = parseInt(match[2] || '0');
                                        if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
                                        if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
                                        if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
                                        return classInfo.duration;
                                      })()}</span>
                                    </div>
                                  )}
                                  {classInfo?.maximumAttendeeCapacity && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Users className="h-4 w-4" />
                                      <span>Max: {classInfo.maximumAttendeeCapacity} students</span>
                                    </div>
                                  )}
                                  {classItem.tags && (
                                    <div className="flex flex-wrap gap-1">
                                      {classItem.tags.split(',').map((tag, idx) => (
                                        <Badge key={idx} variant="secondary" className="text-xs">
                                          {tag.trim()}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </CardContent>
                                <CardFooter>
                                  <Badge variant={classItem.Is_disabled ? "destructive" : "default"}>
                                    {classItem.Is_disabled ? 'Disabled' : 'Active'}
                                  </Badge>
                                </CardFooter>
                              </Card>
                            );
                          })}
                        </div>

                        {classesTotalPages > 1 && (
                          <div className="flex items-center justify-center gap-4 mt-8">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setClassesPage(p => Math.max(1, p - 1))}
                              disabled={classesPage === 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="text-sm text-muted-foreground">
                              Page {classesPage} of {classesTotalPages} ({classesTotalItems} total classes)
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setClassesPage(p => Math.min(classesTotalPages, p + 1))}
                              disabled={classesPage === classesTotalPages}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={deleteClassDialogOpen} onOpenChange={setDeleteClassDialogOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the class "{classToDelete?.title}". 
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteClassConfirm}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Copy Class Confirmation Dialog */}
                <AlertDialog open={copyClassDialogOpen} onOpenChange={setCopyClassDialogOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Duplicate Class</AlertDialogTitle>
                      <AlertDialogDescription>
                        Enter a title for the duplicated class.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                      <Label htmlFor="copy-class-title">Title</Label>
                      <Input
                        id="copy-class-title"
                        value={copyClassTitle}
                        onChange={(e) => setCopyClassTitle(e.target.value)}
                        placeholder="Enter title for the copy"
                        className="mt-2"
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCopyClass}>
                        Duplicate
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TabsContent>

              {/* Vendors Tab */}
              <TabsContent value="vendors" className="space-y-4">
                {vendorsSubTab === 'applications' ? (
                  /* Vendor Applications View */
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h2 className="text-2xl font-bold">Vendor Applications</h2>
                        <p className="text-muted-foreground">
                          Viewing <span className="capitalize font-medium">{vendorApplicationStatusFilter}</span> applications
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search by name, email, or slug..."
                            value={vendorApplicationSearchQuery}
                            onChange={(e) => setVendorApplicationSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setVendorApplicationsPage(1);
                                fetchVendorApplications(1, vendorApplicationStatusFilter, vendorApplicationSearchQuery);
                              }
                            }}
                            className="pl-10 w-64"
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setVendorApplicationsPage(1);
                            fetchVendorApplications(1, vendorApplicationStatusFilter, vendorApplicationSearchQuery);
                          }}
                        >
                          Search
                        </Button>
                        {vendorApplicationSearchQuery && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setVendorApplicationSearchQuery("");
                              setVendorApplicationsPage(1);
                              fetchVendorApplications(1, vendorApplicationStatusFilter, "");
                            }}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Clear
                          </Button>
                        )}
                        <Badge variant="secondary" className="text-lg px-4 py-2">
                          {vendorApplicationsTotalItems} Application{vendorApplicationsTotalItems !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>

                    {loadingVendorApplications ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                          <Card key={i} className="animate-pulse">
                            <CardHeader>
                              <div className="h-6 bg-muted rounded" />
                              <div className="h-4 bg-muted rounded w-2/3" />
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                <div className="h-4 bg-muted rounded" />
                                <div className="h-4 bg-muted rounded w-5/6" />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : vendorApplications.length === 0 ? (
                      <Card className="text-center py-12">
                        <CardContent>
                          <Code className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No {vendorApplicationStatusFilter} applications</h3>
                          <p className="text-muted-foreground">
                            There are no vendor applications with status "{vendorApplicationStatusFilter}"
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <>
                        {/* Inline Application Detail View - Full Width at Top */}
                        {viewingApplication && (
                          <Card className="mb-6 border-2 border-primary/20">
                            <CardHeader className="pb-3 border-b">
                              <div className="flex items-center justify-between">
                                <div>
                                  <CardTitle className="flex items-center gap-2">
                                    Application Details
                                    <Badge 
                                      variant={
                                        viewingApplication.status === 'new' ? 'default' :
                                        viewingApplication.status === 'applied' ? 'secondary' :
                                        viewingApplication.status === 'pending' ? 'outline' :
                                        viewingApplication.status === 'approved' ? 'default' :
                                        'destructive'
                                      }
                                      className={`capitalize ${viewingApplication.status === 'approved' ? 'bg-green-600' : ''}`}
                                    >
                                      {viewingApplication.status}
                                    </Badge>
                                  </CardTitle>
                                  <CardDescription>
                                    {viewingApplication._leads?.email || viewingApplication.lead_payload?.email || 'No email'}
                                  </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                  <PaymentReceiptView 
                                    application={viewingApplication}
                                    isAdmin={true}
                                    clerkUserId={user?.id || ''}
                                    trigger={
                                      <Button variant="outline" size="sm">
                                        <Receipt className="h-4 w-4 mr-2" />
                                        View Receipt
                                      </Button>
                                    }
                                  />
                                  <Select
                                    value={viewingApplication.status}
                                    onValueChange={(value) => {
                                      handleUpdateApplicationStatus(viewingApplication.id, value);
                                      setViewingApplication({ ...viewingApplication, status: value });
                                    }}
                                  >
                                    <SelectTrigger className="w-36">
                                      <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-background border z-50">
                                      {getApplicationStatuses().map(status => (
                                        <SelectItem key={status} value={status}>
                                          {formatStatusLabel(status)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button variant="ghost" size="icon" onClick={() => setViewingApplication(null)} title="Close">
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                              <ApplicationPrintPreview
                                application={viewingApplication}
                                open={true}
                                onOpenChange={() => {}}
                                inline={true}
                              />
                            </CardContent>
                          </Card>
                        )}

                        {/* Pagination Controls at Top */}
                        {vendorApplicationsTotalPages > 1 && (
                          <div className="flex items-center justify-between mb-4">
                            <div className="text-sm text-muted-foreground">
                              Page {vendorApplicationsPage} of {vendorApplicationsTotalPages} ({vendorApplicationsTotalItems} total)
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setVendorApplicationsPage(p => Math.max(1, p - 1))}
                                disabled={vendorApplicationsPage === 1}
                              >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Previous
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setVendorApplicationsPage(p => Math.min(vendorApplicationsTotalPages, p + 1))}
                                disabled={vendorApplicationsPage === vendorApplicationsTotalPages}
                              >
                                Next
                                <ChevronRight className="h-4 w-4 ml-1" />
                              </Button>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {vendorApplications.map((application) => {
                            const leads = application._leads;
                            const leadPayload = leads?.lead_payload || application.lead_payload || {};
                            const bookingInfo = application.booking_info || {};
                            const bookingInfoKeys = Object.keys(bookingInfo);
                            
                            // Get item info from nested booking items (new structure)
                            const bookingItems = application._booking_items_of_bookings?.items || [];
                            const firstBookingItem = bookingItems[0];
                            const itemInfo = firstBookingItem?._items;
                            
                            // Extract applicant info - prioritize _leads data
                            const fullLeadEmail = leads?.email || leadPayload.Email || leadPayload.email || 
                              bookingInfo.email || bookingInfo.Email || 'N/A';
                            
                            // Mask email: show first 3 chars + ***@domain.com
                            const maskEmail = (email: string) => {
                              if (!email || email === 'N/A' || !email.includes('@')) return email;
                              const [local, domain] = email.split('@');
                              const visibleChars = Math.min(3, local.length);
                              return `${local.substring(0, visibleChars)}***@${domain}`;
                            };
                            const leadEmail = maskEmail(fullLeadEmail);
                            
                            // Build name from _leads data first - prioritize _leads.name
                            const leadFirstName = leadPayload.first_name || leadPayload.firstName || '';
                            const leadLastName = leadPayload.last_name || leadPayload.lastName || '';
                            const fullNameFromParts = [leadFirstName, leadLastName].filter(Boolean).join(' ');
                            
                            const fullLeadName = leads?.name || fullNameFromParts ||
                              leadPayload.name || leadPayload.full_name || leadPayload.fullName ||
                              leadPayload.business_name || leadPayload.company_name ||
                              bookingInfo.name || bookingInfo.full_name || bookingInfo.fullName ||
                              bookingInfo.business_name || bookingInfo.company_name || bookingInfo.applicant_name ||
                              application._customers?.Full_name || application.booking_slug || 'Unknown Applicant';
                            
                            // Mask name: first name + first initial of last name with dot
                            const maskName = (name: string) => {
                              const parts = name.trim().split(/\s+/);
                              if (parts.length <= 1) return name;
                              const firstName = parts[0];
                              const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
                              return `${firstName} ${lastInitial}.`;
                            };
                            const leadName = maskName(fullLeadName);
                            
                            // Get title from item or booking slug
                            const applicationTitle = itemInfo?.slug || application.booking_slug || `#${application.id}`;
                            const applicationPhone = leadPayload.phone || leadPayload.mobile || leadPayload.mobile_number ||
                              bookingInfo.phone || bookingInfo.mobile || bookingInfo.phone_number || null;
                            const isExpanded = expandedApplicationIds.has(application.id);
                            
                            // Calculate total from booking items
                            const totalAmount = application.total_amount || 
                              bookingItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
                            
                            const formatFieldLabel = (key: string) => {
                              return key
                                .replace(/_/g, ' ')
                                .replace(/([A-Z])/g, ' $1')
                                .replace(/^./, str => str.toUpperCase())
                                .trim();
                            };

                            const formatFieldValue = (value: unknown): string => {
                              if (value === null || value === undefined) return '-';
                              if (typeof value === 'boolean') return value ? 'Yes' : 'No';
                              if (typeof value === 'object') return JSON.stringify(value);
                              return String(value);
                            };

                            const handleDownloadPDF = async () => {
                              // Fetch full application details first, then use comprehensive PDF generation
                              try {
                                const bookingSlug = application.booking_slug;
                                let enrichedApp = application;
                                
                                if (bookingSlug && user?.id) {
                                  const applicationDetails = await adminAPI.getApplicationDetails(bookingSlug, user.id);
                                  const bookingItems = applicationDetails._booking_items?.items || [];
                                  const firstBookingItem = bookingItems[0];
                                  const bookingItemsInfo = firstBookingItem?.booking_items_info || {};
                                  const bookingInfoData = applicationDetails.booking_info || {};
                                  const itemInfoData = firstBookingItem?._items?.item_info || {};
                                  
                                  enrichedApp = {
                                    ...applicationDetails,
                                    booking_info: { ...bookingInfoData, ...bookingItemsInfo },
                                    _booking_items_info: bookingItemsInfo,
                                    _items: firstBookingItem?._items || applicationDetails._items || {
                                      item_info: itemInfoData,
                                      title: firstBookingItem?._items?.title || bookingSlug,
                                    },
                                  };
                                }
                                
                                // Generate comprehensive PDF similar to ApplicationPrintPreview
                                const doc = new jsPDF('p', 'mm', 'a4');
                                const pageWidth = doc.internal.pageSize.getWidth();
                                const pageHeight = doc.internal.pageSize.getHeight();
                                const margin = 15;
                                const contentWidth = pageWidth - (margin * 2);
                                let y = margin;
                                
                                const wrapText = (text: string, maxWidth: number, fontSize: number = 10): string[] => {
                                  doc.setFontSize(fontSize);
                                  return doc.splitTextToSize(text, maxWidth);
                                };
                                
                                // Header background
                                doc.setFillColor(245, 245, 245);
                                doc.rect(0, 0, pageWidth, 50, 'F');
                                
                                let titleY = 12;
                                if (enrichedApp.booking_slug) {
                                  doc.setFontSize(11);
                                  doc.setFont('helvetica', 'bold');
                                  doc.setTextColor(59, 130, 246);
                                  doc.text(`#${enrichedApp.booking_slug.toUpperCase()}`, pageWidth / 2, titleY, { align: 'center' });
                                  titleY += 8;
                                }
                                
                                const appTitle = enrichedApp._items?.title || enrichedApp.booking_slug || `Application #${enrichedApp.id}`;
                                doc.setFontSize(16);
                                doc.setFont('helvetica', 'bold');
                                doc.setTextColor(30, 30, 30);
                                const titleLines = wrapText(appTitle, contentWidth - 10, 16);
                                titleLines.forEach((line: string) => {
                                  doc.text(line, pageWidth / 2, titleY, { align: 'center' });
                                  titleY += 7;
                                });
                                
                                // Status, checkout, payment info
                                doc.setFontSize(9);
                                doc.setFont('helvetica', 'normal');
                                doc.setTextColor(100, 100, 100);
                                const statusText = typeof enrichedApp.status === 'string' ? enrichedApp.status.toUpperCase() : 'UNKNOWN';
                                const checkoutText = typeof enrichedApp.checkout_type === 'string' && enrichedApp.checkout_type ? enrichedApp.checkout_type : 'Cash/Check';
                                const paymentText = typeof enrichedApp.payment_status === 'string' && enrichedApp.payment_status ? enrichedApp.payment_status : 'Pending';
                                const submittedDate = new Date(enrichedApp.created_at).toLocaleDateString();
                                doc.text(`Status: ${statusText} • Checkout: ${checkoutText} • Payment: ${paymentText} • Submitted: ${submittedDate}`, pageWidth / 2, titleY + 3, { align: 'center' });
                                
                                if (enrichedApp.total_amount && enrichedApp.total_amount > 0) {
                                  doc.text(`Amount: $${Number(enrichedApp.total_amount).toFixed(2)}`, pageWidth / 2, titleY + 9, { align: 'center' });
                                  y = titleY + 18;
                                } else {
                                  y = titleY + 12;
                                }
                                
                                // Applicant Information Box with all lead_payload fields
                                const enrichedLeads = enrichedApp._leads || {};
                                const enrichedLeadPayload = enrichedLeads.lead_payload || enrichedApp.lead_payload || {};
                                const leadPayloadFields = Object.entries(enrichedLeadPayload)
                                  .filter(([key, val]) => val !== null && val !== undefined && val !== '' && typeof val !== 'object')
                                  .map(([key, val]) => ({ label: formatFieldLabel(key), value: String(val) }));
                                
                                const totalRows = Math.ceil((2 + leadPayloadFields.filter(f => !f.label.toLowerCase().includes('name') && !f.label.toLowerCase().includes('email')).length) / 2);
                                const boxHeight = Math.max(24, 12 + (totalRows * 7));
                                
                                doc.setFillColor(250, 250, 250);
                                doc.setDrawColor(220, 220, 220);
                                doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'FD');
                                
                                doc.setFontSize(9);
                                doc.setFont('helvetica', 'bold');
                                doc.setTextColor(80, 80, 80);
                                doc.text('APPLICANT INFORMATION', margin + 4, y + 6);
                                
                                doc.setFontSize(9);
                                doc.setFont('helvetica', 'normal');
                                doc.setTextColor(30, 30, 30);
                                
                                let infoY = y + 13;
                                let colIndex = 0;
                                
                                doc.setFont('helvetica', 'bold');
                                doc.text('Name:', margin + 4, infoY);
                                doc.setFont('helvetica', 'normal');
                                doc.text(fullLeadName.substring(0, 40), margin + 18, infoY);
                                colIndex++;
                                
                                doc.setFont('helvetica', 'bold');
                                doc.text('Email:', margin + contentWidth / 2, infoY);
                                doc.setFont('helvetica', 'normal');
                                doc.text(leadEmail.substring(0, 30), margin + contentWidth / 2 + 14, infoY);
                                colIndex++;
                                
                                const remainingFields = leadPayloadFields.filter(f => 
                                  !f.label.toLowerCase().includes('name') && !f.label.toLowerCase().includes('email')
                                );
                                for (const field of remainingFields) {
                                  if (colIndex % 2 === 0) infoY += 7;
                                  const xPos = colIndex % 2 === 0 ? margin + 4 : margin + contentWidth / 2;
                                  doc.setFont('helvetica', 'bold');
                                  doc.text(`${field.label.substring(0, 12)}:`, xPos, infoY);
                                  doc.setFont('helvetica', 'normal');
                                  doc.text(field.value.substring(0, 25), xPos + 25, infoY);
                                  colIndex++;
                                }
                                
                                y += boxHeight + 8;
                                
                                // Form data section
                                if (bookingInfoKeys.length > 0) {
                                  doc.setFillColor(240, 240, 240);
                                  doc.rect(margin, y, contentWidth, 8, 'F');
                                  doc.setFontSize(9);
                                  doc.setFont('helvetica', 'bold');
                                  doc.setTextColor(60, 60, 60);
                                  doc.text('APPLICATION FORM DATA', margin + 4, y + 5.5);
                                  y += 12;
                                  
                                  doc.setFontSize(9);
                                  doc.setFont('helvetica', 'normal');
                                  doc.setTextColor(30, 30, 30);
                                  
                                  const mergedBooking = enrichedApp.booking_info || {};
                                  for (const key of bookingInfoKeys) {
                                    const value = mergedBooking[key] ?? bookingInfo[key];
                                    const isImage = typeof value === 'string' && value.startsWith('data:image');
                                    const isFileUpload = !isImage && typeof value === 'string' && value.startsWith('data:');
                                    
                                    if (y > pageHeight - (isImage ? 45 : 20)) {
                                      doc.addPage();
                                      y = margin;
                                    }
                                    
                                    doc.setFont('helvetica', 'bold');
                                    doc.text(`${formatFieldLabel(key)}:`, margin, y);
                                    y += 5;
                                    
                                    doc.setFont('helvetica', 'normal');
                                    if (isImage) {
                                      try {
                                        const imgFormat = value.includes('image/png') ? 'PNG' : 'JPEG';
                                        doc.addImage(value, imgFormat, margin, y, 60, 30);
                                        y += 35;
                                      } catch {
                                        doc.text('[Image could not be rendered]', margin, y);
                                        y += 6;
                                      }
                                    } else if (isFileUpload) {
                                      doc.text('[File uploaded]', margin, y);
                                      y += 6;
                                    } else {
                                      const formattedValue = formatFieldValue(value);
                                      const lines = doc.splitTextToSize(formattedValue, contentWidth);
                                      doc.text(lines, margin, y);
                                      y += lines.length * 4 + 3;
                                    }
                                  }
                                }
                                
                                const fileName = `application-${fullLeadName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${application.id}.pdf`;
                                doc.save(fileName);
                              } catch (error) {
                                console.error('Error generating PDF:', error);
                                toast({ title: 'Error', description: 'Failed to generate PDF', variant: 'destructive' });
                              }
                            };
                            
                            return (
                              <Card 
                                key={application.id} 
                                className={`overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${viewingApplication?.id === application.id ? 'ring-2 ring-primary' : ''}`}
                                onClick={() => handleViewApplication(application)}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <p className="font-medium truncate">{fullLeadName}</p>
                                        <p className="text-sm text-muted-foreground truncate">{leadEmail}</p>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                          <span className="text-xs text-muted-foreground">{new Date(application.created_at).toLocaleDateString()}</span>
                                          {totalAmount > 0 && (
                                            <span className="text-xs font-medium text-foreground">${Number(totalAmount).toFixed(2)}</span>
                                          )}
                                          <Badge 
                                            variant={
                                              application.status === 'new' ? 'default' :
                                              application.status === 'applied' ? 'secondary' :
                                              application.status === 'pending' ? 'outline' :
                                              application.status === 'approved' ? 'default' :
                                              'destructive'
                                            }
                                            className={`capitalize text-xs ${application.status === 'approved' ? 'bg-green-600' : ''}`}
                                          >
                                            {typeof application.status === 'string' ? application.status : 'Unknown'}
                                          </Badge>
                                          <Badge variant="outline" className="capitalize text-xs">
                                            {typeof application.checkout_type === 'string' && application.checkout_type ? application.checkout_type : 'Cash/Check'}
                                          </Badge>
                                          <Badge 
                                            variant={
                                              application.payment_status === 'paid' ? 'default' :
                                              application.payment_status === 'failed' ? 'destructive' :
                                              'outline'
                                            }
                                            className={`capitalize text-xs ${application.payment_status === 'paid' ? 'bg-green-600' : ''}`}
                                          >
                                            {typeof application.payment_status === 'string' && application.payment_status ? application.payment_status : 'Pending'}
                                          </Badge>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewApplication(application)} title="View">
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </>
                ) : vendorsSubTab === 'all-applications' ? (
                  /* All Applications Table View */
                  <>
                    <div className="flex flex-col gap-4 mb-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                        <div className="min-w-0">
                          <h2 className="text-xl sm:text-2xl font-bold">All Applications</h2>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            All applications across all types
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Per Page Selector */}
                          <div className="flex items-center gap-1.5">
                            <Label htmlFor="apps-per-page" className="text-xs text-muted-foreground whitespace-nowrap">Per page:</Label>
                            <Select 
                              value={String(allApplicationsPerPage)} 
                              onValueChange={(v) => {
                                setAllApplicationsPerPage(parseInt(v));
                                setAllApplicationsPage(1);
                              }}
                            >
                              <SelectTrigger id="apps-per-page" className="w-[70px] h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ALL_APPLICATIONS_PAGE_SIZE_OPTIONS.map(size => (
                                  <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 touch-manipulation"
                            onClick={handleExportSelectedApplicationsCSV}
                            disabled={selectedApplications.size === 0}
                          >
                            <Download className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Export Selected ({selectedApplications.size})</span>
                            <span className="sm:hidden">{selectedApplications.size}</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 touch-manipulation"
                            onClick={handleExportAllApplicationsCSV}
                            disabled={exportingAllApplications || allApplicationsTotalItems === 0}
                          >
                            {exportingAllApplications ? (
                              <Loader2 className="h-4 w-4 animate-spin sm:mr-1" />
                            ) : (
                              <Download className="h-4 w-4 sm:mr-1" />
                            )}
                            <span className="hidden sm:inline">{exportingAllApplications ? 'Exporting...' : 'Export All'}</span>
                          </Button>
                          <Badge variant="secondary" className="px-3 py-1.5 text-xs sm:text-sm">
                            {allApplicationsTotalItems} Total
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Search and Filter Row - Stacked on mobile */}
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search name, email..."
                              value={allApplicationsSearchQuery}
                              onChange={(e) => setAllApplicationsSearchQuery(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  setAllApplicationsPage(1);
                                  fetchAllApplications(1, getAllApplicationsFilterOptions());
                                }
                              }}
                              className="pl-10 h-10"
                            />
                          </div>
                          <Button
                            className="h-10 touch-manipulation"
                            onClick={() => {
                              setAllApplicationsPage(1);
                              fetchAllApplications(1, getAllApplicationsFilterOptions());
                            }}
                          >
                            <Search className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Search</span>
                          </Button>
                        </div>
                        <Collapsible 
                          open={allApplicationsFiltersExpanded} 
                          onOpenChange={handleFiltersExpandedChange}
                        >
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-full flex items-center justify-between h-9 px-2 hover:bg-muted/50">
                              <span className="flex items-center gap-2 text-sm font-medium">
                                <Filter className="h-4 w-4" />
                                Filters
                                {(allApplicationsStatusFilter !== 'all' || allApplicationsCheckoutTypeFilter !== 'all' || allApplicationsPaymentStatusFilter !== 'all' || allApplicationsBookingTypeFilter !== 'all' || allApplicationsItemsTypeFilter !== 'all' || allApplicationsDateRange.from || showDeletedAllApplications) && (
                                  <Badge variant="secondary" className="text-xs">Active</Badge>
                                )}
                              </span>
                              {allApplicationsFiltersExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-2">
                            <div className="flex flex-wrap gap-2">
                              {/* Date Range Filter */}
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className="h-10 justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {allApplicationsDateRange.from ? (
                                      allApplicationsDateRange.to ? (
                                        <>
                                          {format(allApplicationsDateRange.from, "MMM dd")} - {format(allApplicationsDateRange.to, "MMM dd")}
                                        </>
                                      ) : (
                                        format(allApplicationsDateRange.from, "MMM dd, yyyy")
                                      )
                                    ) : (
                                      <span>Date Range</span>
                                    )}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <CalendarComponent
                                    mode="range"
                                    selected={{ from: allApplicationsDateRange.from, to: allApplicationsDateRange.to }}
                                    onSelect={(range) => {
                                      setAllApplicationsDateRange({ from: range?.from, to: range?.to });
                                      setAllApplicationsPage(1);
                                    }}
                                    numberOfMonths={2}
                                    className={cn("p-3 pointer-events-auto")}
                                  />
                                </PopoverContent>
                              </Popover>

                              <Select value={allApplicationsStatusFilter} onValueChange={(value) => {
                                setAllApplicationsStatusFilter(value);
                                setAllApplicationsPage(1);
                              }}>
                                <SelectTrigger className="w-full sm:w-32 h-10">
                                  <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent className="bg-background border z-50">
                                  <SelectItem value="all">All Status</SelectItem>
                                  {getApplicationFilterStatuses().map(status => (
                                    <SelectItem key={status} value={status}>
                                      {formatStatusLabel(status)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <Select value={allApplicationsBookingTypeFilter} onValueChange={(value) => {
                                setAllApplicationsBookingTypeFilter(value);
                                setAllApplicationsPage(1);
                              }}>
                                <SelectTrigger className="w-full sm:w-36 h-10">
                                  <SelectValue placeholder="Booking Type" />
                                </SelectTrigger>
                                <SelectContent className="bg-background border z-50">
                                  <SelectItem value="all">All Booking</SelectItem>
                                  <SelectItem value="vendor">Vendor</SelectItem>
                                  <SelectItem value="event">Event</SelectItem>
                                  <SelectItem value="class">Class</SelectItem>
                                  <SelectItem value="membership">Membership</SelectItem>
                                </SelectContent>
                              </Select>

                              <Select value={allApplicationsItemsTypeFilter} onValueChange={(value) => {
                                setAllApplicationsItemsTypeFilter(value);
                                setAllApplicationsPage(1);
                              }}>
                                <SelectTrigger className="w-full sm:w-36 h-10">
                                  <SelectValue placeholder="Item Type" />
                                </SelectTrigger>
                                <SelectContent className="bg-background border z-50">
                                  <SelectItem value="all">All Items</SelectItem>
                                  <SelectItem value="Application">Application</SelectItem>
                                  <SelectItem value="Event">Event</SelectItem>
                                  <SelectItem value="Class">Class</SelectItem>
                                  <SelectItem value="Membership">Membership</SelectItem>
                                </SelectContent>
                              </Select>

                              <Select value={allApplicationsCheckoutTypeFilter} onValueChange={(value) => {
                                setAllApplicationsCheckoutTypeFilter(value);
                                setAllApplicationsPage(1);
                              }}>
                                <SelectTrigger className="w-full sm:w-32 h-10">
                                  <SelectValue placeholder="Checkout" />
                                </SelectTrigger>
                                <SelectContent className="bg-background border z-50">
                                  <SelectItem value="all">All Checkout</SelectItem>
                                  <SelectItem value="stripe">Stripe</SelectItem>
                                  <SelectItem value="Cash/Check">Cash/Check</SelectItem>
                                </SelectContent>
                              </Select>

                              <Select value={allApplicationsPaymentStatusFilter} onValueChange={(value) => {
                                setAllApplicationsPaymentStatusFilter(value);
                                setAllApplicationsPage(1);
                              }}>
                                <SelectTrigger className="w-full sm:w-32 h-10">
                                  <SelectValue placeholder="Payment" />
                                </SelectTrigger>
                                <SelectContent className="bg-background border z-50">
                                  <SelectItem value="all">All Payment</SelectItem>
                                  <SelectItem value="Paid">Paid</SelectItem>
                                  <SelectItem value="Pending">Pending</SelectItem>
                                  <SelectItem value="Failed">Failed</SelectItem>
                                </SelectContent>
                              </Select>

                              {/* Show Deleted Toggle */}
                              <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-background">
                                <Checkbox 
                                  id="show-deleted-apps"
                                  checked={showDeletedAllApplications}
                                  onCheckedChange={(checked) => {
                                    setShowDeletedAllApplications(!!checked);
                                    setAllApplicationsPage(1);
                                    fetchAllApplications(1, { ...getAllApplicationsFilterOptions(), isDeleted: !!checked });
                                  }}
                                />
                                <label htmlFor="show-deleted-apps" className="text-sm text-muted-foreground whitespace-nowrap cursor-pointer">
                                  Show Deleted
                                </label>
                              </div>

                              {(allApplicationsSearchQuery || allApplicationsStatusFilter !== 'all' || allApplicationsCheckoutTypeFilter !== 'all' || allApplicationsPaymentStatusFilter !== 'all' || allApplicationsBookingTypeFilter !== 'all' || allApplicationsItemsTypeFilter !== 'all' || allApplicationsDateRange.from || showDeletedAllApplications) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10 shrink-0"
                                  onClick={() => {
                                    setAllApplicationsSearchQuery("");
                                    setAllApplicationsStatusFilter("all");
                                    setAllApplicationsCheckoutTypeFilter("all");
                                    setAllApplicationsPaymentStatusFilter("all");
                                    setAllApplicationsBookingTypeFilter("all");
                                    setAllApplicationsItemsTypeFilter("Application");
                                    setAllApplicationsDateRange({});
                                    setShowDeletedAllApplications(false);
                                    setAllApplicationsPage(1);
                                    fetchAllApplications(1, { status: "all", search: "", checkoutType: "all", paymentStatus: "all", bookingType: "all", itemsType: "Application", isDeleted: false });
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    </div>

                    {/* Bulk Action Bar */}
                    {selectedApplications.size > 0 && (
                      <Card className="border-primary bg-primary/5 mb-4">
                        <CardContent className="py-3 px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Checkbox 
                              checked={selectedApplications.size === allApplications.length}
                              onCheckedChange={toggleAllApplicationsSelection}
                            />
                            <span className="text-sm font-medium">
                              {selectedApplications.size} application{selectedApplications.size !== 1 ? 's' : ''} selected
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-9"
                              onClick={() => setSelectedApplications(new Set())}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Clear
                            </Button>
                            <Button 
                              size="sm"
                              className="h-9"
                              onClick={() => {
                                // Load campaigns if not already loaded
                                if (campaigns.length === 0 && !loadingCampaigns) {
                                  fetchCampaigns();
                                }
                                setBulkAssignApplicationsToCampaignDialogOpen(true);
                              }}
                            >
                              <Target className="h-4 w-4 mr-1" />
                              Add to Campaign
                            </Button>
                            <Button 
                              size="sm"
                              className="h-9"
                              onClick={() => {
                                // Load campaigns if not already loaded
                                if (campaigns.length === 0 && !loadingCampaigns) {
                                  fetchCampaigns();
                                }
                                setSendEmailToApplicationsDialogOpen(true);
                              }}
                            >
                              <Mail className="h-4 w-4 mr-1" />
                              Send Email
                            </Button>
                            <Button 
                              variant="outline"
                              size="sm"
                              className="h-9"
                              onClick={() => setBulkStatusUpdateDialogOpen(true)}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Update Status
                            </Button>
                            <Button 
                              variant="destructive"
                              size="sm"
                              className="h-9"
                              onClick={() => setBulkDeleteAllApplicationsDialogOpen(true)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete Selected
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Pagination at Top - Mobile Friendly */}
                    {allApplicationsTotalPages > 1 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mb-4">
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          Page {allApplicationsPage} of {allApplicationsTotalPages}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10 touch-manipulation"
                            onClick={() => setAllApplicationsPage(p => Math.max(1, p - 1))}
                            disabled={allApplicationsPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1">Previous</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10 touch-manipulation"
                            onClick={() => setAllApplicationsPage(p => Math.min(allApplicationsTotalPages, p + 1))}
                            disabled={allApplicationsPage === allApplicationsTotalPages}
                          >
                            <span className="hidden sm:inline mr-1">Next</span>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {loadingAllApplications ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                          <span className="text-muted-foreground">Loading applications...</span>
                        </div>
                        {[...Array(Math.min(allApplicationsPerPage, 5))].map((_, i) => (
                          <Skeleton key={i} className="h-20 sm:h-16 w-full rounded-lg" />
                        ))}
                      </div>
                    ) : allApplications.length === 0 ? (
                      <Card className="text-center py-8 sm:py-12">
                        <CardContent>
                          <ClipboardList className="h-10 sm:h-12 w-10 sm:w-12 mx-auto text-muted-foreground mb-4" />
                          <h3 className="text-base sm:text-lg font-semibold mb-2">No applications found</h3>
                          <p className="text-sm text-muted-foreground">
                            {allApplicationsSearchQuery || allApplicationsStatusFilter !== 'all'
                              ? 'Try adjusting your search or filters'
                              : 'No applications have been submitted yet'}
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <>
                        {/* Inline Application Detail View - Mobile Optimized */}
                        {viewingApplication && (
                          <Card className="mb-4 sm:mb-6 border-2 border-primary/20">
                            <CardHeader className="p-3 sm:pb-3 sm:p-6 border-b">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <CardTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
                                    <span className="truncate">Application Details</span>
                                    <Badge 
                                      variant={
                                        viewingApplication.status === 'new' ? 'default' :
                                        viewingApplication.status === 'applied' ? 'secondary' :
                                        viewingApplication.status === 'pending' ? 'outline' :
                                        viewingApplication.status === 'approved' ? 'default' :
                                        'destructive'
                                      }
                                      className={`capitalize ${viewingApplication.status === 'approved' ? 'bg-green-600' : ''}`}
                                    >
                                      {viewingApplication.status}
                                    </Badge>
                                  </CardTitle>
                                  <CardDescription className="text-xs sm:text-sm truncate">
                                    {viewingApplication._leads?.email || viewingApplication.lead_payload?.email || 'No email'}
                                  </CardDescription>
                                </div>
                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                  <PaymentReceiptView 
                                    application={viewingApplication}
                                    isAdmin={true}
                                    clerkUserId={user?.id || ''}
                                    trigger={
                                      <Button variant="outline" size="sm" className="h-10">
                                        <Receipt className="h-4 w-4 mr-2" />
                                        <span className="hidden sm:inline">View Receipt</span>
                                        <span className="sm:hidden">Receipt</span>
                                      </Button>
                                    }
                                  />
                                  <Select
                                    value={viewingApplication.status}
                                    onValueChange={(value) => {
                                      handleUpdateApplicationStatus(viewingApplication.id, value);
                                      setViewingApplication({ ...viewingApplication, status: value });
                                    }}
                                  >
                                    <SelectTrigger className="w-28 sm:w-36 h-10">
                                      <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-background border z-50">
                                      {getApplicationStatuses().map(status => (
                                        <SelectItem key={status} value={status}>
                                          {formatStatusLabel(status)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-10 w-10 touch-manipulation"
                                    onClick={() => setViewingApplication(null)} 
                                    title="Close"
                                  >
                                    <X className="h-5 w-5" />
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="p-3 sm:p-6 pt-3 sm:pt-4 overflow-x-auto">
                              <ApplicationPrintPreview
                                application={viewingApplication}
                                open={true}
                                onOpenChange={() => {}}
                                inline={true}
                              />
                            </CardContent>
                          </Card>
                        )}

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b bg-muted/50">
                                <th className="p-3 w-10" onClick={(e) => e.stopPropagation()}>
                                  <Checkbox 
                                    checked={selectedApplications.size > 0 && selectedApplications.size === allApplications.length}
                                    onCheckedChange={toggleAllApplicationsSelection}
                                  />
                                </th>
                                <th className="text-left p-3 font-medium text-muted-foreground">Applicant</th>
                                <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                                <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                                <th className="text-left p-3 font-medium text-muted-foreground">Payment</th>
                                <th className="text-right p-3 font-medium text-muted-foreground">Total Owed</th>
                                <th className="text-right p-3 font-medium text-muted-foreground">Paid</th>
                                <th className="text-right p-3 font-medium text-muted-foreground">Balance</th>
                                <th className="text-center p-3 font-medium text-muted-foreground">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {allApplications.map((application) => {
                                const leads = application._leads;
                                const leadPayload = leads?.lead_payload || application.lead_payload || {};
                                const bookingInfo = application.booking_info || {};
                                const bookingItems = application._booking_items?.items || application._booking_items_of_bookings?.items || [];
                                const bookingPayments = application._booking_payments || [];
                                const firstBookingItem = bookingItems[0];
                                const itemInfo = firstBookingItem?._items;
                                
                                const leadFirstName = typeof leadPayload.first_name === 'string' ? leadPayload.first_name : 
                                  (typeof leadPayload.firstName === 'string' ? leadPayload.firstName : '');
                                const leadLastName = typeof leadPayload.last_name === 'string' ? leadPayload.last_name : 
                                  (typeof leadPayload.lastName === 'string' ? leadPayload.lastName : '');
                                const fullNameFromParts = [leadFirstName, leadLastName].filter(Boolean).join(' ');
                                
                                const getStringValue = (val: any): string => typeof val === 'string' ? val : '';
                                
                                const fullLeadName = getStringValue(leads?.name) || fullNameFromParts ||
                                  getStringValue(leadPayload.name) || getStringValue(leadPayload.full_name) ||
                                  getStringValue(bookingInfo.name) || getStringValue(bookingInfo.full_name) ||
                                  getStringValue(application._customers?.Full_name) || 'Unknown';
                                const leadEmail = getStringValue(leads?.email) || getStringValue(leadPayload.email) || 
                                  getStringValue(bookingInfo.email) || '-';
                                const bookingType = getStringValue(application.booking_type) || getStringValue(itemInfo?.item_type) || '-';
                                const statusValue = typeof application.status === 'string' ? application.status : 'new';
                                const checkoutTypeValue = typeof application.checkout_type === 'string' && application.checkout_type ? application.checkout_type : 'Cash/Check';
                                
                                // Calculate total owed from booking items
                                const totalOwed = bookingItems.reduce((sum: number, item: any) => sum + (typeof item.price === 'number' ? item.price : 0), 0);
                                
                                // Calculate total paid from booking payments
                                const totalPaid = bookingPayments.reduce((sum: number, payment: any) => sum + (typeof payment.paid_amount === 'number' ? payment.paid_amount : 0), 0);
                                
                                // Calculate balance due
                                const balanceDue = totalOwed - totalPaid;
                                
                                // Get payment status from _booking_payments or fallback
                                const primaryPayment = bookingPayments[0];
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
                                const paymentStatusValue = primaryPayment?.payment_status || extractPaymentStatus(application.payment_status);
                                const paymentMethod = primaryPayment?.payment_method || checkoutTypeValue;
                                
                                const isDeleted = application.is_deleted === true;
                                
                                return (
                                  <Fragment key={application.id}>
                                    <tr 
                                      className={cn(
                                        "border-b hover:bg-muted/30 cursor-pointer transition-colors",
                                        selectedApplications.has(application.id) && "bg-primary/5",
                                        isDeleted && "opacity-60 bg-destructive/5"
                                      )}
                                      onClick={() => handleViewApplication(application)}
                                    >
                                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                      <Checkbox 
                                        checked={selectedApplications.has(application.id)}
                                        onCheckedChange={() => toggleApplicationSelection(application.id)}
                                      />
                                    </td>
                                    <td className="p-3">
                                      <div className={cn("font-medium", isDeleted && "line-through text-muted-foreground")}>
                                        {fullLeadName}
                                        {isDeleted && (
                                          <Badge variant="destructive" className="ml-2 text-xs">Deleted</Badge>
                                        )}
                                      </div>
                                      <div className="text-sm text-muted-foreground truncate max-w-48">{leadEmail}</div>
                                    </td>
                                    <td className="p-3">
                                      <Badge variant="outline" className="capitalize">{bookingType}</Badge>
                                    </td>
                                    <td className="p-3 text-sm text-muted-foreground">
                                      {new Date(application.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="p-3">
                                      <Badge 
                                        variant={
                                          statusValue === 'new' ? 'default' :
                                          statusValue === 'applied' ? 'secondary' :
                                          statusValue === 'pending' ? 'outline' :
                                          statusValue === 'approved' ? 'default' :
                                          'destructive'
                                        }
                                        className={`capitalize ${statusValue === 'approved' ? 'bg-green-600' : ''}`}
                                      >
                                        {statusValue}
                                      </Badge>
                                    </td>
                                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                      <div className="flex items-center gap-2">
                                        <div className="flex flex-col gap-1 flex-1">
                                          <Badge 
                                            variant={
                                              paymentStatusValue === 'paid' ? 'default' :
                                              paymentStatusValue === 'failed' ? 'destructive' :
                                              'outline'
                                            }
                                            className={`capitalize ${paymentStatusValue === 'paid' ? 'bg-green-600' : ''}`}
                                          >
                                            {paymentStatusValue || 'Pending'}
                                          </Badge>
                                          <span className="text-xs text-muted-foreground">{paymentMethod}</span>
                                        </div>
                                        <PaymentEditDialog
                                          bookingsSlug={application.bookings_slug || application.booking_slug || ''}
                                          bookingsId={application.id}
                                          payment={primaryPayment ? {
                                            id: primaryPayment.id,
                                            payment_id: primaryPayment.payment_id,
                                            payment_response: primaryPayment.payment_response,
                                            paid_amount: primaryPayment.paid_amount,
                                            payment_status: primaryPayment.payment_status,
                                            payment_method: primaryPayment.payment_method,
                                          } : undefined}
                                          customStatusesConfig={customStatusesConfig}
                                          onPaymentUpdated={() => fetchAllApplications(allApplicationsPage)}
                                        />
                                      </div>
                                    </td>
                                    <td className="p-3 text-right font-medium">
                                      ${totalOwed.toFixed(2)}
                                    </td>
                                    <td className="p-3 text-right font-medium text-green-600">
                                      ${totalPaid.toFixed(2)}
                                    </td>
                                    <td className="p-3 text-right font-medium">
                                      {balanceDue > 0 ? (
                                        <span className="text-destructive">${balanceDue.toFixed(2)}</span>
                                      ) : (
                                        <span className="text-green-600">$0.00</span>
                                      )}
                                    </td>
                                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                      <div className="flex items-center justify-center gap-1">
                                        {applicationsInCampaign.has(application.id) && (
                                          <Badge 
                                            variant="secondary" 
                                            className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs whitespace-nowrap"
                                          >
                                            <Target className="h-3 w-3 mr-1" />
                                            {applicationsInCampaign.get(application.id)?.campaignName}
                                          </Badge>
                                        )}
                                        <PaymentReceiptView 
                                          application={application}
                                          isAdmin={true}
                                          clerkUserId={user?.id || ''}
                                          trigger={
                                            <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              className="h-8 w-8" 
                                              title="View Receipt"
                                              disabled={!application.total_amount || application.total_amount <= 0}
                                            >
                                              <Receipt className="h-4 w-4" />
                                            </Button>
                                          }
                                        />
                                        <NotesButton
                                          totalNotes={application._notes_of_bookings?.reduce((sum: number, n: any) => sum + n.total, 0) || 0}
                                          unreadCount={application._notes_of_bookings?.filter((n: any) => !n.is_read).reduce((sum: number, n: any) => sum + n.total, 0) || 0}
                                          isExpanded={expandedNotesApplicationIds.has(application.id)}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedNotesApplicationIds(prev => {
                                              const next = new Set(prev);
                                              if (next.has(application.id)) {
                                                next.delete(application.id);
                                              } else {
                                                next.add(application.id);
                                              }
                                              return next;
                                            });
                                          }}
                                        />
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewApplication(application)} title="View">
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" 
                                          onClick={() => handleDeleteAllApplicationClick(application)}
                                          title="Delete Application"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                        {applicationsInCampaign.has(application.id) && (
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" 
                                            onClick={() => {
                                              const campaignInfo = applicationsInCampaign.get(application.id);
                                              if (campaignInfo) {
                                                handleRemoveFromCampaignClick(application.id, campaignInfo.campaignName, campaignInfo.campaignsId);
                                              }
                                            }}
                                            title="Remove from Campaign"
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                  {expandedNotesApplicationIds.has(application.id) && (
                                    <NotesExpandedRow
                                      bookingsId={application.id}
                                      colSpan={10}
                                    />
                                  )}
                                  </Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-3">
                          {allApplications.map((application) => {
                            const leads = application._leads;
                            const leadPayload = leads?.lead_payload || application.lead_payload || {};
                            const bookingInfo = application.booking_info || {};
                            const bookingItems = application._booking_items?.items || application._booking_items_of_bookings?.items || [];
                            const bookingPayments = application._booking_payments || [];
                            const firstBookingItem = bookingItems[0];
                            const itemInfo = firstBookingItem?._items;
                            
                            const getStringValue = (val: any): string => typeof val === 'string' ? val : '';
                            
                            const leadFirstName = getStringValue(leadPayload.first_name) || getStringValue(leadPayload.firstName);
                            const leadLastName = getStringValue(leadPayload.last_name) || getStringValue(leadPayload.lastName);
                            const fullNameFromParts = [leadFirstName, leadLastName].filter(Boolean).join(' ');
                            const fullLeadName = getStringValue(leads?.name) || fullNameFromParts ||
                              getStringValue(leadPayload.name) || getStringValue(leadPayload.full_name) ||
                              getStringValue(bookingInfo.name) || getStringValue(bookingInfo.full_name) ||
                              getStringValue(application._customers?.Full_name) || 'Unknown';
                            const leadEmail = getStringValue(leads?.email) || getStringValue(leadPayload.email) || 
                              getStringValue(bookingInfo.email) || '-';
                            const bookingType = getStringValue(application.booking_type) || getStringValue(itemInfo?.item_type) || '-';
                            const statusValue = typeof application.status === 'string' ? application.status : 'new';
                            
                            // Calculate total owed from booking items
                            const totalOwed = bookingItems.reduce((sum: number, item: any) => sum + (typeof item.price === 'number' ? item.price : 0), 0);
                            
                            // Calculate total paid from booking payments
                            const totalPaid = bookingPayments.reduce((sum: number, payment: any) => sum + (typeof payment.paid_amount === 'number' ? payment.paid_amount : 0), 0);
                            
                            // Calculate balance due
                            const balanceDue = totalOwed - totalPaid;
                            
                            // Get payment status from _booking_payments or fallback
                            const primaryPayment = bookingPayments[0];
                            const paymentStatusValue = primaryPayment?.payment_status || (typeof application.payment_status === 'string' ? application.payment_status : '');
                            const paymentMethod = primaryPayment?.payment_method || (typeof application.checkout_type === 'string' && application.checkout_type ? application.checkout_type : 'Cash/Check');
                            
                            const isDeleted = application.is_deleted === true;
                            
                            return (
                              <Card 
                                key={application.id} 
                                className={cn(
                                  "cursor-pointer hover:bg-muted/30 transition-colors",
                                  selectedApplications.has(application.id) && "border-primary bg-primary/5",
                                  isDeleted && "opacity-60 bg-destructive/5 border-destructive/20"
                                )}
                                onClick={() => handleViewApplication(application)}
                              >
                                <CardContent className="p-4">
                                  <div className="flex gap-3">
                                    <div 
                                      className="flex-shrink-0 pt-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleApplicationSelection(application.id);
                                      }}
                                    >
                                      <Checkbox 
                                        checked={selectedApplications.has(application.id)}
                                        onCheckedChange={() => toggleApplicationSelection(application.id)}
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1 min-w-0">
                                          <p className={cn("font-medium truncate", isDeleted && "line-through text-muted-foreground")}>
                                            {fullLeadName}
                                          </p>
                                          {isDeleted && (
                                            <Badge variant="destructive" className="text-xs mt-1">Deleted</Badge>
                                          )}
                                          <p className="text-sm text-muted-foreground truncate">{leadEmail}</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="font-medium">${totalOwed.toFixed(2)}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {new Date(application.created_at).toLocaleDateString()}
                                          </p>
                                        </div>
                                      </div>
                                      {/* Payment Summary Row */}
                                      <div className="flex items-center gap-3 mb-2 text-sm">
                                        <div className="flex items-center gap-1">
                                          <span className="text-muted-foreground">Paid:</span>
                                          <span className="font-medium text-green-600">${totalPaid.toFixed(2)}</span>
                                        </div>
                                        {balanceDue > 0 && (
                                          <div className="flex items-center gap-1">
                                            <span className="text-muted-foreground">Due:</span>
                                            <span className="font-medium text-destructive">${balanceDue.toFixed(2)}</span>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        <Badge variant="outline" className="capitalize text-xs">{bookingType}</Badge>
                                        <Badge 
                                          variant={
                                            statusValue === 'new' ? 'default' :
                                            statusValue === 'applied' ? 'secondary' :
                                            statusValue === 'pending' ? 'outline' :
                                            statusValue === 'approved' ? 'default' :
                                            'destructive'
                                          }
                                          className={`capitalize text-xs ${statusValue === 'approved' ? 'bg-green-600' : ''}`}
                                        >
                                          {statusValue}
                                        </Badge>
                                        <Badge variant="outline" className="capitalize text-xs">
                                          {paymentMethod}
                                        </Badge>
                                        <Badge 
                                          variant={
                                            paymentStatusValue === 'paid' ? 'default' :
                                            paymentStatusValue === 'failed' ? 'destructive' :
                                            'outline'
                                          }
                                          className={`capitalize text-xs ${paymentStatusValue === 'paid' ? 'bg-green-600' : ''}`}
                                        >
                                          {paymentStatusValue || 'Pending'}
                                        </Badge>
                                        {applicationsInCampaign.has(application.id) && (
                                          <Badge 
                                            variant="secondary" 
                                            className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs flex items-center gap-1"
                                          >
                                            <Target className="h-3 w-3" />
                                            {applicationsInCampaign.get(application.id)?.campaignName}
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const campaignInfo = applicationsInCampaign.get(application.id);
                                                if (campaignInfo) {
                                                  handleRemoveFromCampaignClick(application.id, campaignInfo.campaignName, campaignInfo.campaignsId);
                                                }
                                              }}
                                              className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                                            >
                                              <X className="h-3 w-3 text-destructive" />
                                            </button>
                                          </Badge>
                                        )}
                                      </div>
                                      {/* Action buttons for mobile */}
                                      <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                                        <PaymentEditDialog
                                          bookingsSlug={application.bookings_slug || application.booking_slug || ''}
                                          bookingsId={application.id}
                                          payment={primaryPayment ? {
                                            id: primaryPayment.id,
                                            payment_id: primaryPayment.payment_id,
                                            payment_response: primaryPayment.payment_response,
                                            paid_amount: primaryPayment.paid_amount,
                                            payment_status: primaryPayment.payment_status,
                                            payment_method: primaryPayment.payment_method,
                                          } : undefined}
                                          customStatusesConfig={customStatusesConfig}
                                          onPaymentUpdated={() => fetchAllApplications(allApplicationsPage)}
                                          trigger={
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 px-2"
                                            >
                                              <Edit className="h-3 w-3 mr-1" />
                                              Payment
                                            </Button>
                                          }
                                        />
                                        {application.total_amount && application.total_amount > 0 && (
                                          <PaymentReceiptView 
                                            application={application}
                                            isAdmin={true}
                                            clerkUserId={user?.id || ''}
                                            trigger={
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 px-2"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <Receipt className="h-3 w-3 mr-1" />
                                                Receipt
                                              </Button>
                                            }
                                          />
                                        )}
                                        <NotesPanel
                                          bookingsId={application.id}
                                          compact={true}
                                          initialNotesCount={application._notes_of_bookings?.reduce((sum: number, n: any) => sum + n.total, 0) || 0}
                                          initialUnreadCount={application._notes_of_bookings?.filter((n: any) => !n.is_read).reduce((sum: number, n: any) => sum + n.total, 0) || 0}
                                        />
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteAllApplicationClick(application);
                                          }}
                                        >
                                          <Trash2 className="h-3 w-3 mr-1" />
                                          Delete
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  /* Vendor List View */
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h2 className="text-2xl font-bold">Vendors Management</h2>
                        <p className="text-muted-foreground">Create and manage vendor listings</p>
                      </div>
                      <Dialog open={vendorDialogOpen} onOpenChange={setVendorDialogOpen}>
                        <DialogTrigger asChild>
                          <AuthGatedButton onClick={() => setEditingVendor(null)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Vendor
                          </AuthGatedButton>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>
                              {editingVendor ? 'Edit Vendor' : 'Create New Vendor'}
                            </DialogTitle>
                          </DialogHeader>
                          <VendorForm vendor={editingVendor} onSuccess={handleVendorSaved} />
                        </DialogContent>
                      </Dialog>
                    </div>

                    {loadingVendors ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                          <Card key={i} className="animate-pulse">
                            <div className="h-48 bg-muted rounded-t-lg" />
                            <CardHeader>
                              <div className="h-6 bg-muted rounded" />
                              <div className="h-4 bg-muted rounded w-2/3" />
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                <div className="h-4 bg-muted rounded" />
                                <div className="h-4 bg-muted rounded w-5/6" />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : vendors.length === 0 ? (
                      <Card className="text-center py-12">
                        <CardContent>
                          <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No vendors yet</h3>
                          <p className="text-muted-foreground mb-4">
                            Create your first vendor to get started
                          </p>
                          {isSignedIn && (
                            <Button onClick={() => setVendorDialogOpen(true)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Create Vendor
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {vendors.map((vendor) => {
                            const vendorInfo = getEventInfo(vendor);
                            const imageUrl = vendorInfo?.image?.[0] || null;
                            
                            const getMediaType = (url: string | null): 'Image' | 'Video' | 'YouTube' => {
                              if (!url) return 'Image';
                              if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
                              if (url.match(/\.(mp4|webm|ogg|mov)$/i)) return 'Video';
                              return 'Image';
                            };
                            
                            const mediaType = getMediaType(imageUrl);
                            
                            return (
                              <Card key={vendor.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                {imageUrl && (
                                  <div className="aspect-video w-full overflow-hidden bg-black relative">
                                    {mediaType === 'YouTube' ? (
                                      <iframe
                                        src={imageUrl}
                                        className="w-full h-full object-cover"
                                        title={vendor.title}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      />
                                    ) : mediaType === 'Video' ? (
                                      <video
                                        src={imageUrl}
                                        className="w-full h-full object-cover"
                                        muted
                                        loop
                                        playsInline
                                      />
                                    ) : (
                                      <img
                                        src={imageUrl}
                                        alt={vendor.title}
                                        className="w-full h-full object-cover"
                                      />
                                    )}
                                    <Badge variant="secondary" className="absolute bottom-2 left-2 z-10 font-mono text-xs">
                                      {vendor.slug}
                                    </Badge>
                                  </div>
                                )}
                                <CardHeader>
                                  <div className="flex items-start justify-between">
                                    <CardTitle className="text-xl">{vendor.title}</CardTitle>
                                    <div className="flex gap-1">
                                      <Link to={`/vendors/${vendor.slug}`} target="_blank" rel="noopener noreferrer">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          title="Preview Vendor"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </Link>
                                      {isSignedIn && (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                              setEditingVendor(vendor);
                                              setVendorDialogOpen(true);
                                            }}
                                            title="Edit Vendor"
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleCopyVendor(vendor)}
                                            title="Duplicate Vendor"
                                          >
                                            <Copy className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteVendorClick(vendor)}
                                            title="Delete Vendor"
                                          >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <CardDescription className="line-clamp-2">
                                    {vendor.description}
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  {vendorInfo?.telephone && (
                                    <div className="text-sm text-muted-foreground">
                                      📞 {vendorInfo.telephone}
                                    </div>
                                  )}
                                  {vendorInfo?.address?.addressLocality && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <MapPin className="h-4 w-4" />
                                      <span className="line-clamp-1">
                                        {vendorInfo.address.addressLocality}, {vendorInfo.address.addressRegion}
                                      </span>
                                    </div>
                                  )}
                                  {vendor.tags && (
                                    <div className="flex flex-wrap gap-1">
                                      {vendor.tags.split(',').map((tag, idx) => (
                                        <Badge key={idx} variant="secondary" className="text-xs">
                                          {tag.trim()}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </CardContent>
                                <CardFooter>
                                  <Badge variant={vendor.Is_disabled ? "destructive" : "default"}>
                                    {vendor.Is_disabled ? 'Disabled' : 'Active'}
                                  </Badge>
                                </CardFooter>
                              </Card>
                            );
                          })}
                        </div>

                        {vendorsTotalPages > 1 && (
                          <div className="flex items-center justify-center gap-4 mt-8">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setVendorsPage(p => Math.max(1, p - 1))}
                              disabled={vendorsPage === 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="text-sm text-muted-foreground">
                              Page {vendorsPage} of {vendorsTotalPages} ({vendorsTotalItems} total vendors)
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setVendorsPage(p => Math.min(vendorsTotalPages, p + 1))}
                              disabled={vendorsPage === vendorsTotalPages}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}

                    {/* Delete Confirmation Dialog */}
                    <AlertDialog open={deleteVendorDialogOpen} onOpenChange={setDeleteVendorDialogOpen}>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the vendor "{vendorToDelete?.title}". 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteVendorConfirm}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </TabsContent>

              {/* Sponsors Tab */}
              <TabsContent value="sponsors" className="space-y-4">
                {showSponsorEditView ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 mb-6">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowSponsorEditView(false);
                          setEditingSponsor(null);
                        }}
                      >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Back to Sponsors
                      </Button>
                      <h2 className="text-2xl font-bold">
                        {editingSponsor ? `Edit: ${editingSponsor.title}` : 'Create New Sponsor'}
                      </h2>
                    </div>
                    <Card>
                      <CardContent className="pt-6">
                        <SponsorForm sponsor={editingSponsor} onSuccess={handleSponsorSaved} customersId={userRole !== 'admin' ? customer?.id : undefined} />
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h2 className="text-2xl font-bold">Sponsors Management</h2>
                        <p className="text-muted-foreground">Create and manage sponsor ads</p>
                      </div>
                      <Button onClick={() => {
                        setEditingSponsor(null);
                        setShowSponsorEditView(true);
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Sponsor
                      </Button>
                    </div>

                    {loadingSponsors ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                          <Card key={i} className="animate-pulse">
                            <div className="h-48 bg-muted rounded-t-lg" />
                            <CardHeader>
                              <div className="h-6 bg-muted rounded" />
                              <div className="h-4 bg-muted rounded w-2/3" />
                            </CardHeader>
                          </Card>
                        ))}
                      </div>
                    ) : sponsors.length === 0 ? (
                      <Card className="text-center py-12">
                        <CardContent>
                          <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No sponsors yet</h3>
                          <p className="text-muted-foreground mb-4">
                            Create your first sponsor to display ads on your site
                          </p>
                          <Button onClick={() => {
                            setEditingSponsor(null);
                            setShowSponsorEditView(true);
                          }}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Sponsor
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {sponsors.map((sponsor) => (
                            <Card key={sponsor.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                              <CardHeader>
                                <div className="flex items-start justify-between">
                                  <CardTitle className="text-xl">{sponsor.title}</CardTitle>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setEditingSponsor(sponsor);
                                        setShowSponsorEditView(true);
                                      }}
                                      title="Edit Sponsor"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleCopySponsor(sponsor)}
                                      title="Duplicate Sponsor"
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteSponsorClick(sponsor)}
                                      title="Delete Sponsor"
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                                <CardDescription className="line-clamp-2">
                                  {sponsor.description || 'No description'}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-2">
                                {sponsor.item_info?.reference_url && (
                                  <div className="text-sm text-muted-foreground truncate">
                                    <span className="font-medium">URL:</span> {sponsor.item_info.reference_url}
                                  </div>
                                )}
                                <Badge variant={sponsor.Is_disabled ? "destructive" : "default"}>
                                  {sponsor.Is_disabled ? 'Disabled' : 'Active'}
                                </Badge>
                              </CardContent>
                            </Card>
                          ))}
                        </div>

                        {sponsorsTotalPages > 1 && (
                          <div className="flex items-center justify-center gap-4 mt-8">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setSponsorsPage(p => Math.max(1, p - 1))}
                              disabled={sponsorsPage === 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="text-sm text-muted-foreground">
                              Page {sponsorsPage} of {sponsorsTotalPages} ({sponsorsTotalItems} total)
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setSponsorsPage(p => Math.min(sponsorsTotalPages, p + 1))}
                              disabled={sponsorsPage === sponsorsTotalPages}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}

                    {/* Delete Confirmation Dialog */}
                    <AlertDialog open={deleteSponsorDialogOpen} onOpenChange={setDeleteSponsorDialogOpen}>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the sponsor "{sponsorToDelete?.title}". 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteSponsorConfirm}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </TabsContent>

              {/* Applications Tab */}
              <TabsContent value="applications" className="space-y-4">
                {showApplicationEditView ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 mb-6">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowApplicationEditView(false);
                          setEditingApplication(null);
                        }}
                      >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Back to Applications
                      </Button>
                      <div>
                        <h2 className="text-2xl font-bold">
                          {editingApplication ? 'Edit Application' : 'Create New Application'}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {editingApplication ? 'Update application information' : 'Add a new application'}
                        </p>
                      </div>
                    </div>
                    <Card className="p-6">
                      <ApplicationForm application={editingApplication} onSuccess={handleApplicationSaved} />
                    </Card>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                      <div>
                        <h2 className="text-2xl font-bold">Applications Management</h2>
                        <p className="text-muted-foreground">Review and manage all applications</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={exportApplicationsToCSV}>
                          <Download className="h-4 w-4 mr-2" />
                          Export CSV
                        </Button>
                        <AuthGatedButton onClick={() => {
                          setEditingApplication(null);
                          setShowApplicationEditView(true);
                        }}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Application
                        </AuthGatedButton>
                      </div>
                    </div>

                    {/* Search and Filters */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name, email, business..."
                          value={applicationSearchQuery}
                          onChange={(e) => setApplicationSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Select value={applicationStatusFilter} onValueChange={setApplicationStatusFilter}>
                        <SelectTrigger className="w-full sm:w-[150px]">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          {getApplicationFilterStatuses().map(status => (
                            <SelectItem key={status} value={status}>
                              {formatStatusLabel(status)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={applicationTypeFilter} onValueChange={setApplicationTypeFilter}>
                        <SelectTrigger className="w-full sm:w-[150px]">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="vendor">Vendor</SelectItem>
                          <SelectItem value="exhibitor">Exhibitor</SelectItem>
                          <SelectItem value="sponsor">Sponsor</SelectItem>
                          <SelectItem value="volunteer">Volunteer</SelectItem>
                          <SelectItem value="membership">Membership</SelectItem>
                        </SelectContent>
                      </Select>
                      {(applicationSearchQuery || applicationStatusFilter !== "all" || applicationTypeFilter !== "all") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setApplicationSearchQuery("");
                            setApplicationStatusFilter("all");
                            setApplicationTypeFilter("all");
                          }}
                          title="Clear filters"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {loadingApplications ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                          <Card key={i} className="animate-pulse">
                            <CardHeader>
                              <div className="h-6 bg-muted rounded" />
                              <div className="h-4 bg-muted rounded w-2/3" />
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                <div className="h-4 bg-muted rounded" />
                                <div className="h-4 bg-muted rounded w-5/6" />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : filteredApplications.length === 0 ? (
                      <Card className="text-center py-12">
                        <CardContent>
                          <Code className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">
                            {applications.length === 0 ? 'No applications yet' : 'No applications match your filters'}
                          </h3>
                          <p className="text-muted-foreground mb-4">
                            {applications.length === 0 
                              ? 'Applications submitted will appear here' 
                              : 'Try adjusting your search or filter criteria'}
                          </p>
                          {applications.length === 0 && isSignedIn && (
                            <Button onClick={() => {
                              setEditingApplication(null);
                              setShowApplicationEditView(true);
                            }}>
                              <Plus className="h-4 w-4 mr-2" />
                              Create Application
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ) : (
                      <>
                        <div className="text-sm text-muted-foreground mb-4">
                          Showing {filteredApplications.length} of {applicationsTotalItems} applications
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {filteredApplications.map((application) => {
                            const appInfo = application.item_info || {};
                            const statusColors: Record<string, string> = {
                              pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
                              approved: 'bg-green-500/10 text-green-600 border-green-200',
                              rejected: 'bg-red-500/10 text-red-600 border-red-200',
                              under_review: 'bg-blue-500/10 text-blue-600 border-blue-200',
                              waitlisted: 'bg-purple-500/10 text-purple-600 border-purple-200',
                            };
                            
                            return (
                              <Card key={application.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                <CardHeader>
                                  <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                      <CardTitle className="text-xl">{application.title || appInfo.title || 'Untitled Application'}</CardTitle>
                                      <div className="flex gap-2">
                                        <Badge className={statusColors[appInfo.status] || 'bg-muted'}>
                                          {appInfo.status?.replace('_', ' ').toUpperCase() || 'PENDING'}
                                        </Badge>
                                        <Badge variant="outline">
                                          {appInfo.applicationType || 'vendor'}
                                        </Badge>
                                      </div>
                                    </div>
                                    <div className="flex gap-1">
                                      {isSignedIn && (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                              setEditingApplication(application);
                                              setShowApplicationEditView(true);
                                            }}
                                            title="Edit Application"
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleCopyApplicationClick(application)}
                                            title="Duplicate Application"
                                          >
                                            <Copy className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteApplicationClick(application)}
                                            title="Delete Application"
                                          >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <CardDescription className="line-clamp-2">
                                    {application.description || 'No description'}
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  {appInfo.applicantName && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Users className="h-4 w-4 text-muted-foreground" />
                                      <span>{appInfo.applicantName}</span>
                                    </div>
                                  )}
                                  {appInfo.applicantEmail && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Mail className="h-4 w-4" />
                                      <span>{appInfo.applicantEmail}</span>
                                    </div>
                                  )}
                                  {appInfo.businessName && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Store className="h-4 w-4" />
                                      <span>{appInfo.businessName}</span>
                                    </div>
                                  )}
                                  {appInfo.submittedAt && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Calendar className="h-4 w-4" />
                                      <span>Submitted: {new Date(appInfo.submittedAt).toLocaleDateString()}</span>
                                    </div>
                                  )}
                                  {application.tags && (
                                    <div className="flex flex-wrap gap-1">
                                      {application.tags.split(',').map((tag, idx) => (
                                        <Badge key={idx} variant="secondary" className="text-xs">
                                          {tag.trim()}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </CardContent>
                                <CardFooter>
                                  <Badge variant={application.Is_disabled ? "destructive" : "default"}>
                                    {application.Is_disabled ? 'Disabled' : 'Active'}
                                  </Badge>
                                </CardFooter>
                              </Card>
                            );
                          })}
                        </div>

                        {applicationsTotalPages > 1 && (
                          <div className="flex items-center justify-center gap-4 mt-8">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setApplicationsPage(p => Math.max(1, p - 1))}
                              disabled={applicationsPage === 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="text-sm text-muted-foreground">
                              Page {applicationsPage} of {applicationsTotalPages} ({applicationsTotalItems} total applications)
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setApplicationsPage(p => Math.min(applicationsTotalPages, p + 1))}
                              disabled={applicationsPage === applicationsTotalPages}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}

                    {/* Delete Confirmation Dialog */}
                    <AlertDialog open={deleteApplicationDialogOpen} onOpenChange={setDeleteApplicationDialogOpen}>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the application "{applicationToDelete?.title}". 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteApplicationConfirm}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    {/* Copy Application Confirmation Dialog */}
                    <AlertDialog open={copyApplicationDialogOpen} onOpenChange={setCopyApplicationDialogOpen}>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Duplicate Application</AlertDialogTitle>
                          <AlertDialogDescription>
                            Enter a title for the duplicated application.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="py-4">
                          <Label htmlFor="copy-application-title">Title</Label>
                          <Input
                            id="copy-application-title"
                            value={copyApplicationTitle}
                            onChange={(e) => setCopyApplicationTitle(e.target.value)}
                            placeholder="Enter title for the copy"
                            className="mt-2"
                          />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleCopyApplication}>
                            Duplicate
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </TabsContent>

              {/* Members Tab */}
              <TabsContent value="members" className="space-y-4">
                {showMemberDetailView && editingMember ? (
                  <div className="space-y-4">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowMemberDetailView(false);
                        setEditingMember(null);
                        setMemberDetailTab("details");
                      }}
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Back to Members List
                    </Button>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-2xl">
                          {editingMember._customers?.Full_name || 'Unknown Member'}
                        </CardTitle>
                        <CardDescription>
                          {editingMember._customers?.email || ''}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Tabs value={memberDetailTab} onValueChange={setMemberDetailTab}>
                          <TabsList className="mb-4">
                            <TabsTrigger value="details">Member Details</TabsTrigger>
                            <TabsTrigger value="communications">Communications</TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="details" className="space-y-6">
                            <MemberDetailForm
                              member={editingMember}
                              franchisorId={franchisorId}
                              onSuccess={() => {
                                handleMemberSaved();
                                setShowMemberDetailView(false);
                                setEditingMember(null);
                              }}
                            />
                          </TabsContent>
                          
                          <TabsContent value="communications" className="space-y-4">
                            <Card>
                              <CardHeader>
                                <CardTitle>Communications History</CardTitle>
                                <CardDescription>
                                  View and manage communications with this member
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                {loadingCommunications ? (
                                  <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                      <Skeleton key={i} className="h-20 w-full" />
                                    ))}
                                  </div>
                                ) : memberCommunications?.length > 0 ? (
                                  <div className="space-y-4">
                                    {memberCommunications.map((comm) => {
                                      const typeStyle = getCommunicationTypeStyle(comm.communication_type);
                                      const IconComponent = typeStyle.icon;
                                      const isExpanded = expandedMemberComms.has(comm.id);
                                      
                                      return (
                                        <Card key={comm.id} className="hover:shadow-md transition-shadow">
                                          <CardContent className="pt-4">
                                            <div className="flex items-start gap-4">
                                              <div className="mt-1">
                                                <IconComponent className="h-5 w-5 text-muted-foreground" />
                                              </div>
                                              <div className="flex-1 space-y-2">
                                                <div className="flex items-center justify-between">
                                                  <div className="flex items-center gap-2 flex-wrap">
                                                    <Badge className={typeStyle.className}>
                                                      {typeStyle.label}
                                                    </Badge>
                                                    {comm.message_id && (
                                                      <Badge variant="outline" className="text-xs font-mono">
                                                        {comm.message_id}
                                                      </Badge>
                                                    )}
                                                  </div>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                      setExpandedMemberComms(prev => {
                                                        const newSet = new Set(prev);
                                                        if (newSet.has(comm.id)) {
                                                          newSet.delete(comm.id);
                                                        } else {
                                                          newSet.add(comm.id);
                                                        }
                                                        return newSet;
                                                      });
                                                    }}
                                                  >
                                                    {isExpanded ? (
                                                      <ChevronUp className="h-4 w-4" />
                                                    ) : (
                                                      <ChevronDown className="h-4 w-4" />
                                                    )}
                                                  </Button>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                  <Clock className="h-3 w-3" />
                                                  <span>{new Date(comm.created_at).toLocaleString()}</span>
                                                </div>
                                                {isExpanded && comm.message_info && (
                                                  <div className="text-xs bg-muted/50 p-3 rounded-md border">
                                                    <div className="font-medium mb-1">Message Details:</div>
                                                    <pre className="overflow-auto text-muted-foreground">
                                                      {JSON.stringify(comm.message_info, null, 2)}
                                                    </pre>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </CardContent>
                                        </Card>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="text-sm text-muted-foreground text-center py-8">
                                    No communications yet. Start a conversation to track member interactions.
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h2 className="text-2xl font-bold">Members Management</h2>
                        <p className="text-muted-foreground">View and manage club members</p>
                      </div>
                    </div>

                {/* Search, Filters, and Pagination */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          placeholder="Search by name or email..."
                          value={memberSearchQuery}
                          onChange={(e) => {
                            setMemberSearchQuery(e.target.value);
                            setMembersPage(1); // Reset to first page on search
                          }}
                          className="pl-9"
                        />
                      </div>
                      <Select 
                        value={memberRoleFilter} 
                        onValueChange={(value) => {
                          setMemberRoleFilter(value);
                          setMembersPage(1); // Reset to first page on filter change
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Filter by role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Roles</SelectItem>
                          <SelectItem value="none">Guest (No Role)</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="vendor">Vendor</SelectItem>
                          <SelectItem value="contributor">Contributor</SelectItem>
                          <SelectItem value="instructor">Instructor</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select 
                        value={memberStatusFilter} 
                        onValueChange={(value) => {
                          setMemberStatusFilter(value);
                          setMembersPage(1); // Reset to first page on filter change
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="Online">Online</SelectItem>
                          <SelectItem value="Offline">Offline</SelectItem>
                          <SelectItem value="Away">Away</SelectItem>
                          <SelectItem value="Busy">Busy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {(memberSearchQuery || memberRoleFilter !== "all" || memberStatusFilter !== "all") && (
                          <>
                            <Badge variant="secondary">
                              Filtered results
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setMemberSearchQuery("");
                                setMemberRoleFilter("all");
                                setMemberStatusFilter("all");
                                setMembersPage(1);
                              }}
                            >
                              Clear Filters
                            </Button>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={exportToCSV}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export CSV {selectedMembers.size > 0 && `(${selectedMembers.size})`}
                        </Button>
                      </div>
                    </div>
                    
                    {/* Server-side Pagination Controls */}
                    {membersTotalPages > 0 && (
                      <div className="mt-4 pt-4 border-t flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Page {membersPage} of {membersTotalPages} ({membersTotalItems} total members)
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setMembersPage(p => Math.max(1, p - 1))}
                            disabled={membersPage === 1 || loadingMembers}
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setMembersPage(p => Math.min(membersTotalPages, p + 1))}
                            disabled={membersPage === membersTotalPages || loadingMembers}
                          >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {loadingMembers ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardHeader>
                          <div className="h-6 bg-muted rounded" />
                          <div className="h-4 bg-muted rounded w-2/3" />
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="h-4 bg-muted rounded" />
                            <div className="h-4 bg-muted rounded w-5/6" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {members.length === 0 ? "No members found" : "No members match the current filters"}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {selectedMembers.size > 0 && (
                      <Card className="mb-4 bg-primary/5">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-4">
                              <Badge variant="default" className="text-base py-1 px-3">
                                {selectedMembers.size} member(s) selected
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedMembers(new Set())}
                              >
                                Clear Selection
                              </Button>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Select value={bulkActionRole} onValueChange={setBulkActionRole}>
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Select Role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="member">Member</SelectItem>
                                  <SelectItem value="vendor">Vendor</SelectItem>
                                  <SelectItem value="contributor">Contributor</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                onClick={handleBulkRoleUpdate}
                                disabled={!bulkActionRole}
                                size="sm"
                              >
                                Update Role
                              </Button>
                              <Select value={bulkActionStatus} onValueChange={setBulkActionStatus}>
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Online">Online</SelectItem>
                                  <SelectItem value="Offline">Offline</SelectItem>
                                  <SelectItem value="Away">Away</SelectItem>
                                  <SelectItem value="Busy">Busy</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                onClick={handleBulkStatusUpdate}
                                disabled={!bulkActionStatus}
                                size="sm"
                              >
                                Update Status
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    <div className="flex items-center gap-2 mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleSelectAll}
                      >
                        {selectedMembers.size === filteredMembers.length ? (
                          <CheckSquare className="h-4 w-4 mr-2" />
                        ) : (
                          <Square className="h-4 w-4 mr-2" />
                        )}
                        Select All
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {filteredMembers.map((member) => {
                        const getInitials = (name: string) => {
                          if (!name) return '?';
                          const parts = name.trim().split(' ');
                          if (parts.length >= 2) {
                            return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
                          }
                          return name.substring(0, 2).toUpperCase();
                        };
                        
                        const avatarUrl = member._customers?.avatar_url || member._customers?.image_url;
                        
                        return (
                        <Card
                          key={member.id}
                          className={`hover:shadow-lg transition-shadow ${selectedMembers.has(member.id) ? 'ring-2 ring-primary' : ''}`}
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between gap-2">
                              <div
                                className="flex-shrink-0 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleMemberSelection(member.id);
                                }}
                              >
                                {selectedMembers.has(member.id) ? (
                                  <CheckSquare className="h-5 w-5 text-primary" />
                                ) : (
                                  <Square className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                              <div 
                                className="flex-1 cursor-pointer flex items-start gap-3"
                                onClick={() => {
                                  setEditingMember(member);
                                  setShowMemberDetailView(true);
                                }}
                              >
                                <div className="flex-shrink-0">
                                  {avatarUrl ? (
                                    <img
                                      src={avatarUrl}
                                      alt={member._customers?.Full_name || 'Member'}
                                      className="h-12 w-12 rounded-full object-cover border-2 border-border"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                      }}
                                    />
                                  ) : null}
                                  <div className={`h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold ${avatarUrl ? 'hidden' : ''}`}>
                                    {getInitials(member._customers?.Full_name || '')}
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-lg truncate">
                                    {revealedMemberIds.has(member.id?.toString() || '') 
                                      ? (member._customers?.Full_name || 'Unknown')
                                      : maskName(member._customers?.Full_name)}
                                  </CardTitle>
                                  <CardDescription className="text-xs mt-1 truncate">
                                    {revealedMemberIds.has(member.id?.toString() || '')
                                      ? (member._customers?.email || '')
                                      : maskEmail(member._customers?.email)}
                                  </CardDescription>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleMemberReveal(member.id?.toString() || '');
                                  }}
                                  title={revealedMemberIds.has(member.id?.toString() || '') ? "Hide info" : "Show full info"}
                                >
                                  <Eye className={cn("h-4 w-4", revealedMemberIds.has(member.id?.toString() || '') ? "text-primary" : "text-muted-foreground")} />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent
                            className="space-y-2 cursor-pointer"
                            onClick={() => {
                              setEditingMember(member);
                              setShowMemberDetailView(true);
                            }}
                          >
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Role:</span>
                              <Badge variant="outline">
                                {member.role || 'Guest'}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Status:</span>
                              <Badge variant={member.status === 'Online' ? 'default' : 'secondary'}>
                                {member.status || 'Offline'}
                              </Badge>
                            </div>
                            {(() => {
                              const membershipStatus = getMemberMembershipStatus(member);
                              if (!membershipStatus) return null;
                              const statusLabel = membershipStatus.isActive ? 'Active' : 'Expired';
                              return (
                                <div className="space-y-1 pt-2 border-t">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Membership:</span>
                                    <Badge variant={membershipStatus.isActive ? 'default' : 'destructive'}>
                                      {statusLabel}
                                    </Badge>
                                  </div>
                                  {membershipStatus.expiryDate && (
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">Expires:</span>
                                      <span className={membershipStatus.isActive && membershipStatus.daysRemaining <= 30 ? 'text-orange-500 font-medium' : membershipStatus.isActive ? 'text-muted-foreground' : 'text-destructive'}>
                                        {format(membershipStatus.expiryDate, 'MMM dd, yyyy')}
                                        {membershipStatus.isActive ? ` (${membershipStatus.daysRemaining}d)` : ''}
                                      </span>
                                    </div>
                                  )}
                                  {membershipStatus.membershipType && (
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">Type:</span>
                                      <span className="text-muted-foreground truncate max-w-[120px]" title={membershipStatus.membershipType}>
                                        {membershipStatus.membershipType}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                            {member.is_manager && (
                              <Badge variant="secondary" className="w-full justify-center">
                                Manager
                              </Badge>
                            )}
                            {member.is_owner && (
                              <Badge variant="secondary" className="w-full justify-center">
                                Owner
                              </Badge>
                            )}
                            {member._customers?.is_blocked_or_denied && (
                              <Badge variant="destructive" className="w-full justify-center">
                                Blocked
                              </Badge>
                            )}
                            <div className="text-xs text-muted-foreground pt-2">
                              Member since {new Date(member._customers?.created_at || member.created_at).toLocaleDateString()}
                            </div>
                          </CardContent>
                          {/* View As button - only for admins */}
                          {realUserRole === 'admin' && (
                            <CardFooter className="pt-0 pb-3">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startMemberImpersonation(member);
                                  toast({
                                    title: "View As Mode Active",
                                    description: `Now viewing as ${member._customers?.Full_name || 'member'}. The app will show what this member sees.`,
                                  });
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View As
                              </Button>
                            </CardFooter>
                          )}
                        </Card>
                      );
                      })}
                    </div>

                    {/* Bottom pagination removed - now at top */}
                  </>
                )}

                  </>
                )}
              </TabsContent>

              {/* Leads Tab */}
              <TabsContent value="leads" className="space-y-4">
                {showLeadEditView ? (
                  <LeadForm
                    lead={editingLead}
                    clerkUserId={user?.id || ''}
                    onSave={() => {
                      setShowLeadEditView(false);
                      setEditingLead(null);
                      fetchLeads(leadsPage);
                    }}
                    onCancel={() => {
                      setShowLeadEditView(false);
                      setEditingLead(null);
                    }}
                  />
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h2 className="text-2xl font-bold">Leads Management</h2>
                        <p className="text-muted-foreground">Create, track, and manage leads</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setEditingLead(null);
                            setShowLeadEditView(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Lead
                        </Button>
                        <Dialog open={bulkUploadDialogOpen} onOpenChange={(open) => {
                          setBulkUploadDialogOpen(open);
                          if (!open) {
                            setCsvFile(null);
                            setCsvUploadProgress(null);
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="outline">
                              <Upload className="h-4 w-4 mr-2" />
                              Bulk Upload
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Bulk Upload Leads</DialogTitle>
                              <DialogDescription>
                                Upload a CSV file to import multiple leads at once
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div 
                                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                                onClick={() => csvFileInputRef.current?.click()}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const file = e.dataTransfer.files[0];
                                  if (file && file.name.endsWith('.csv')) {
                                    setCsvFile(file);
                                  }
                                }}
                              >
                                {csvFile ? (
                                  <div className="space-y-2">
                                    <div className="h-12 w-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                                      <Upload className="h-6 w-6 text-primary" />
                                    </div>
                                    <p className="font-medium">{csvFile.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {(csvFile.size / 1024).toFixed(1)} KB
                                    </p>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCsvFile(null);
                                      }}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground mb-2">
                                      Drag and drop your CSV file here, or click to browse
                                    </p>
                                  </>
                                )}
                                <Input 
                                  ref={csvFileInputRef}
                                  type="file" 
                                  accept=".csv" 
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) setCsvFile(file);
                                  }}
                                />
                              </div>

                              {csvUploadProgress && (
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span>Processing...</span>
                                    <span>{csvUploadProgress.processed} / {csvUploadProgress.total}</span>
                                  </div>
                                  <div className="w-full bg-muted rounded-full h-2">
                                    <div 
                                      className="bg-primary h-2 rounded-full transition-all"
                                      style={{ width: `${(csvUploadProgress.processed / csvUploadProgress.total) * 100}%` }}
                                    />
                                  </div>
                                  {csvUploadProgress.errors.length > 0 && (
                                    <div className="text-xs text-destructive max-h-20 overflow-y-auto">
                                      {csvUploadProgress.errors.map((error, i) => (
                                        <p key={i}>{error}</p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              <div className="text-xs text-muted-foreground">
                                <p className="font-medium mb-1">CSV Format Requirements:</p>
                                <ul className="list-disc list-inside space-y-1">
                                  <li>Required: email</li>
                                  <li>Optional: mobile_number, property_address, status</li>
                                  <li>Maximum 1000 leads per upload</li>
                                </ul>
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="p-0 h-auto mt-2"
                                  onClick={downloadLeadsTemplate}
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  Download template
                                </Button>
                              </div>

                              <Button 
                                className="w-full" 
                                onClick={() => csvFile && handleCsvUpload(csvFile)}
                                disabled={!csvFile || isUploadingCsv}
                              >
                                {isUploadingCsv ? (
                                  <>Processing...</>
                                ) : (
                                  <>Upload & Process</>
                                )}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    {/* Search and Filters */}
                    <Card>
                      <CardContent className="pt-6">
                        {/* Pagination at top */}
                        {leadsTotalPages > 1 && (
                          <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b">
                            <div className="text-sm text-muted-foreground">
                              Page {leadsPage} of {leadsTotalPages} ({leadsTotalItems} total)
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setLeadsPage(p => Math.max(1, p - 1))}
                                disabled={leadsPage === 1 || loadingLeads}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setLeadsPage(p => Math.min(leadsTotalPages, p + 1))}
                                disabled={leadsPage === leadsTotalPages || loadingLeads}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input
                              placeholder="Search by email..."
                              value={leadSearchQuery}
                              onChange={(e) => setLeadSearchQuery(e.target.value)}
                              className="pl-9"
                            />
                          </div>
                          <Select value={leadStatusFilter} onValueChange={setLeadStatusFilter}>
                            <SelectTrigger>
                              <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Status</SelectItem>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="unrefined">Unrefined</SelectItem>
                              <SelectItem value="contacted">Contacted</SelectItem>
                              <SelectItem value="qualified">Qualified</SelectItem>
                              <SelectItem value="converted">Converted</SelectItem>
                              <SelectItem value="lost">Lost</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="filter-new"
                              checked={leadFilterNew}
                              onCheckedChange={(checked) => setLeadFilterNew(checked === true)}
                            />
                            <label 
                              htmlFor="filter-new" 
                              className="text-sm font-medium cursor-pointer select-none"
                            >
                              Show new only
                            </label>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            {(leadSearchQuery || leadStatusFilter !== "all" || !leadFilterNew) && (
                              <>
                                <Badge variant="secondary">
                                  {leadsTotalItems} leads
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setLeadSearchQuery("");
                                    setLeadStatusFilter("all");
                                    setLeadFilterNew(true);
                                  }}
                                >
                                  Clear Filters
                                </Button>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={exportLeadsToCSV}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Export CSV {selectedLeads.size > 0 && `(${selectedLeads.size})`}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {loadingLeads ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {[...Array(8)].map((_, i) => (
                          <Card key={i} className="animate-pulse">
                            <CardContent className="py-3">
                              <div className="space-y-2">
                                <div className="h-4 bg-muted rounded w-3/4" />
                                <div className="h-3 bg-muted rounded w-1/2" />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : filteredLeads.length === 0 ? (
                      <Card>
                        <CardContent className="py-12 text-center">
                          <UserPlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground mb-4">
                            {leads.length === 0 ? "No leads found" : "No leads match the current filters"}
                          </p>
                          {leads.length === 0 && (
                            <Button
                              onClick={() => {
                                setEditingLead(null);
                                setShowLeadEditView(true);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Create Your First Lead
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-2 mb-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={toggleSelectAllLeads}
                            >
                              {selectedLeads.size === filteredLeads.length ? (
                                <CheckSquare className="h-4 w-4 mr-2" />
                              ) : (
                                <Square className="h-4 w-4 mr-2" />
                              )}
                              Select All
                            </Button>
                            {selectedLeads.size > 0 && (
                              <Badge variant="default" className="ml-2">
                                {selectedLeads.size} selected
                              </Badge>
                            )}
                          </div>
                          {selectedLeads.size > 0 && (
                            <Button
                              size="sm"
                              onClick={() => {
                                // Load campaigns if not already loaded
                                if (campaigns.length === 0 && !loadingCampaigns) {
                                  fetchCampaigns();
                                }
                                setSelectedCampaignForAssign(null);
                                setBulkAssignProgress(null);
                                setBulkAssignToCampaignDialogOpen(true);
                              }}
                            >
                              <Target className="h-4 w-4 mr-2" />
                              Add {selectedLeads.size} to Campaign
                            </Button>
                          )}
                        </div>

                        {/* Compact Lead Tiles Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                          {filteredLeads.map((lead) => {
                            const displayName = lead.name 
                              || (lead.lead_payload?.first_name || lead.lead_payload?.last_name
                                ? `${lead.lead_payload?.first_name || ''} ${lead.lead_payload?.last_name || ''}`.trim()
                                : lead.email || 'Unknown');
                            
                            return (
                              <Card
                                key={lead.id}
                                className={`hover:shadow-md transition-all cursor-pointer group ${selectedLeads.has(lead.id) ? 'ring-2 ring-primary' : ''}`}
                                onClick={() => {
                                  setEditingLead(lead);
                                  setShowLeadEditView(true);
                                }}
                              >
                                <CardContent className="p-3">
                                  <div className="flex items-start gap-2">
                                    <div
                                      className="flex-shrink-0 cursor-pointer mt-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleLeadSelection(lead.id);
                                      }}
                                    >
                                      {selectedLeads.has(lead.id) ? (
                                        <CheckSquare className="h-4 w-4 text-primary" />
                                      ) : (
                                        <Square className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                          <p className="font-medium text-sm truncate" title={displayName}>
                                            {displayName}
                                          </p>
                                          <p className="text-xs text-muted-foreground truncate" title={lead.email}>
                                            {lead.email}
                                          </p>
                                        </div>
                                        <Badge 
                                          variant={lead.status === 'new' ? 'default' : lead.status === 'converted' ? 'outline' : 'secondary'}
                                          className="text-xs flex-shrink-0"
                                        >
                                          {lead.status}
                                        </Badge>
                                      </div>
                                      
                                      {lead.lead_payload?.mobile_number && (
                                        <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                                          <Phone className="h-3 w-3" />
                                          <span className="truncate">{lead.lead_payload.mobile_number}</span>
                                        </div>
                                      )}
                                      
                                      {lead.lead_payload?.property_address && (
                                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                          <MapPin className="h-3 w-3 flex-shrink-0" />
                                          <span className="truncate" title={lead.lead_payload.property_address}>
                                            {lead.lead_payload.property_address}
                                          </span>
                                        </div>
                                      )}

                                      <div className="flex items-center justify-between mt-2 pt-2 border-t">
                                        <span className="text-xs text-muted-foreground">
                                          {new Date(lead.created_at).toLocaleDateString()}
                                        </span>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              // Load campaigns if not already loaded
                                              if (campaigns.length === 0 && !loadingCampaigns) {
                                                fetchCampaigns();
                                              }
                                              setSelectedLeadForAssign(lead);
                                              setSelectedCampaignForLeads(null);
                                              setAssignLeadDialogOpen(true);
                                            }}
                                            title="Add to Campaign"
                                          >
                                            <Target className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingLead(lead);
                                              setShowLeadEditView(true);
                                            }}
                                          >
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-destructive hover:text-destructive"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setLeadToDelete(lead);
                                              setDeleteLeadDialogOpen(true);
                                            }}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>

                                      {lead.created_by?.Full_name && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          by {lead.created_by.Full_name}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>

                        {/* Pagination removed from bottom - now at top */}
                      </>
                    )}
                  </>
                )}

                {/* Delete Lead Confirmation Dialog */}
                <AlertDialog open={deleteLeadDialogOpen} onOpenChange={setDeleteLeadDialogOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Lead</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this lead? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setLeadToDelete(null)}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteLead} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TabsContent>

              {/* Orders Tab */}
              <TabsContent value="orders" className="space-y-4">
                {!showOrderDetail ? (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h2 className="text-2xl font-bold">Order History</h2>
                        <p className="text-muted-foreground">Track and manage customer orders</p>
                      </div>
                      <Button onClick={exportOrdersToCSV} disabled={loadingOrders || orders.length === 0}>
                        <Download className="h-4 w-4 mr-2" />
                        Export to CSV
                      </Button>
                    </div>

                    {/* Search and Filters */}
                    <Card>
                      <CardContent className="pt-6 space-y-4">
                        {/* Search Bar */}
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search by order #, customer, email, or item..."
                              value={orderSearchQuery}
                              onChange={(e) => setOrderSearchQuery(e.target.value)}
                              className="pl-9"
                            />
                          </div>
                          {hasActiveOrderFilters && (
                            <Button variant="outline" onClick={clearOrderFilters}>
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
                                <Calendar className="mr-2 h-4 w-4" />
                                {orderDateRange.from ? (
                                  orderDateRange.to ? (
                                    <>
                                      {format(orderDateRange.from, "MMM dd, yyyy")} - {format(orderDateRange.to, "MMM dd, yyyy")}
                                    </>
                                  ) : (
                                    format(orderDateRange.from, "MMM dd, yyyy")
                                  )
                                ) : (
                                  <span>Date Range</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="range"
                                selected={{ from: orderDateRange.from, to: orderDateRange.to }}
                                onSelect={(range) => setOrderDateRange({ from: range?.from, to: range?.to })}
                                numberOfMonths={2}
                                className={cn("p-3 pointer-events-auto")}
                              />
                            </PopoverContent>
                          </Popover>

                          {/* Booking Type Filter */}
                          <Select value={orderBookingTypeFilter} onValueChange={setOrderBookingTypeFilter}>
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Booking Type" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              <SelectItem value="all">All Booking Types</SelectItem>
                              {orderBookingTypeOptions.map((option) => (
                                <SelectItem key={option.booking_types} value={option.booking_types}>
                                  {option.booking_types} ({option.bookings})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Item Type Filter */}
                          <Select value={orderItemTypeFilter} onValueChange={setOrderItemTypeFilter}>
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Item Type" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              <SelectItem value="all">All Item Types</SelectItem>
                              {orderItemTypeOptions.map((option) => (
                                <SelectItem key={option.booking_items} value={option.booking_items}>
                                  {option.booking_items} ({option.bookings})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Booking Slug Filter */}
                          <div className="relative w-[160px]">
                            <Input
                              placeholder="Booking Slug"
                              value={orderBookingSlugFilter}
                              onChange={(e) => setOrderBookingSlugFilter(e.target.value)}
                              className="h-10"
                            />
                          </div>
                        </div>

                        {/* Status Filter Chips */}
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="text-sm text-muted-foreground self-center">Status:</span>
                          {["Paid", "Pending", "New", "Cancelled", "Completed"].map((status) => {
                            const isActive = orderStatusFilters.has(status.toLowerCase());
                            return (
                              <Badge
                                key={status}
                                variant={isActive ? "default" : "outline"}
                                className={cn(
                                  "cursor-pointer transition-colors",
                                  isActive && getOrderStatusColor(status)
                                )}
                                onClick={() => toggleOrderStatusFilter(status)}
                              >
                                {status}
                              </Badge>
                            );
                          })}
                          <div className="border-l pl-3 ml-2 flex items-center gap-2">
                            <Checkbox
                              id="show-deleted"
                              checked={showDeletedOrders}
                              onCheckedChange={(checked) => setShowDeletedOrders(checked === true)}
                            />
                            <Label htmlFor="show-deleted" className="text-sm text-muted-foreground cursor-pointer">
                              Show Deleted
                            </Label>
                          </div>
                        </div>

                        {/* Results Count */}
                        {hasActiveOrderFilters && (
                          <div className="text-sm text-muted-foreground">
                            Showing {filteredOrders.length} of {orders.length} orders
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {loadingOrders ? (
                      <div className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="animate-pulse">
                            <div className="h-16 bg-muted rounded" />
                          </div>
                        ))}
                      </div>
                    ) : filteredOrders.length === 0 ? (
                      <Card>
                        <CardContent className="py-12 text-center">
                          <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            {orders.length === 0 ? "No orders found" : "No orders match the current filters"}
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <>
                        {/* Bulk Action Bar */}
                        {selectedOrders.size > 0 && (
                          <Card className="border-primary bg-primary/5">
                            <CardContent className="py-3 px-4 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Checkbox 
                                  checked={selectedOrders.size === filteredOrders.length}
                                  onCheckedChange={toggleAllOrdersSelection}
                                />
                                <span className="text-sm font-medium">
                                  {selectedOrders.size} order{selectedOrders.size !== 1 ? 's' : ''} selected
                                </span>
                              </div>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setBulkDeleteOrderDialogOpen(true)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Selected
                              </Button>
                            </CardContent>
                          </Card>
                        )}

                        {/* Compact Table */}
                        <Card>
                          <CardContent className="p-0">
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="border-b bg-muted/50">
                                  <tr>
                                    <th className="w-12 p-4">
                                      <Checkbox 
                                        checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                                        onCheckedChange={toggleAllOrdersSelection}
                                      />
                                    </th>
                                    <th className="text-left p-4 font-medium text-sm">Order Info</th>
                                    <th className="text-left p-4 font-medium text-sm hidden md:table-cell">Customer</th>
                                    <th className="text-left p-4 font-medium text-sm hidden lg:table-cell">Items</th>
                                    <th className="text-right p-4 font-medium text-sm">Total</th>
                                    <th className="text-center p-4 font-medium text-sm">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredOrders.map((order) => {
                                    const total = calculateOrderTotal(order);
                                    const itemCount = (order._booking_items_of_bookings?.items || []).length;
                                    const firstItem = (order._booking_items_of_bookings?.items || [])[0];
                                    
                                    return (
                                      <tr 
                                        key={order.id} 
                                        className={cn(
                                          "border-b hover:bg-muted/30 transition-colors cursor-pointer",
                                          selectedOrders.has(order.id) && "bg-primary/5"
                                        )}
                                        onClick={() => handleOrderClick(order)}
                                      >
                                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                          <Checkbox 
                                            checked={selectedOrders.has(order.id)}
                                            onCheckedChange={() => toggleOrderSelection(order.id, { stopPropagation: () => {} } as React.MouseEvent)}
                                          />
                                        </td>
                                         <td className="p-4">
                                          <div className="space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                               <Badge variant="outline" className="font-mono text-xs uppercase">
                                                {order.booking_slug}
                                              </Badge>
                                              {/* Show all distinct item types from order items */}
                                              {Array.from(
                                                new Set(
                                                  (order._booking_items_of_bookings?.items || []).map(item => item._items?.item_type)
                                                )
                                              ).filter(Boolean).map((itemType) => (
                                                <Badge key={itemType} variant="secondary" className="text-xs">
                                                  {itemType}
                                                </Badge>
                                              ))}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              {new Date(order.created_at).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                              })}
                                            </div>
                                          </div>
                                        </td>
                                        <td className="p-4 hidden md:table-cell">
                                          <div className="space-y-1">
                                            <div className="font-medium text-sm">
                                              {order._customers?.Full_name || 'Guest'}
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                              {order._customers?.email || 'No email'}
                                            </div>
                                          </div>
                                        </td>
                                        <td className="p-4 hidden lg:table-cell">
                                          <div className="space-y-1">
                                            <div className="text-sm font-medium">
                                              {firstItem?._items?.title || 'Unknown Item'}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              {itemCount > 1 ? `+${itemCount - 1} more item${itemCount - 1 > 1 ? 's' : ''}` : `${firstItem?._items?.item_type || ''}`}
                                            </div>
                                          </div>
                                        </td>
                                        <td className="p-4 text-right">
                                          <div className="space-y-1">
                                            <div className="font-semibold text-sm">
                                              ${(total).toFixed(2)}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              {itemCount} item{itemCount !== 1 ? 's' : ''}
                                            </div>
                                          </div>
                                        </td>
                                        <td className="p-4 text-center">
                                          <Badge 
                                            variant={
                                              order.status === 'Completed' ? 'default' : 
                                              order.status === 'New' ? 'secondary' : 
                                              'outline'
                                            }
                                            className="whitespace-nowrap"
                                          >
                                            {order.status}
                                          </Badge>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </CardContent>
                        </Card>

                        {ordersTotalPages > 1 && (
                          <div className="flex items-center justify-center gap-4 mt-8">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setOrdersPage(p => Math.max(1, p - 1))}
                              disabled={ordersPage === 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="text-sm text-muted-foreground">
                              Page {ordersPage} of {ordersTotalPages} ({ordersTotalItems} total orders)
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setOrdersPage(p => Math.min(ordersTotalPages, p + 1))}
                              disabled={ordersPage === ordersTotalPages}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  /* Order Detail View */
                  selectedOrder && (
                    <div className="space-y-4">
                      {/* Header with Back Button */}
                      <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={handleBackToOrderList}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold flex items-center gap-2">
                            <ShoppingCart className="h-6 w-6" />
                            Order Details
                          </h2>
                          <p className="text-muted-foreground">
                            Order {selectedOrder.booking_slug.toUpperCase()}
                          </p>
                        </div>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDeleteOrderClick(selectedOrder)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Order
                        </Button>
                      </div>

                      {/* Order Summary */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Order Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-muted-foreground">Order ID</Label>
                            <p className="font-medium">{selectedOrder.id}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Booking Slug</Label>
                            <Badge variant="outline" className="font-mono uppercase">
                              {selectedOrder.booking_slug}
                            </Badge>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Status</Label>
                            <div className="mt-1">
                              <Badge variant={
                                selectedOrder.status === 'Completed' ? 'default' : 
                                selectedOrder.status === 'New' ? 'secondary' : 
                                'outline'
                              }>
                                {selectedOrder.status}
                              </Badge>
                            </div>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Order Date</Label>
                            <p className="font-medium">
                              {new Date(selectedOrder.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Booking Type</Label>
                            <Select 
                              value={selectedOrder.booking_type || ''} 
                              onValueChange={handleUpdateBookingType}
                            >
                              <SelectTrigger className="w-full mt-1">
                                <SelectValue placeholder="Select type..." />
                              </SelectTrigger>
                              <SelectContent className="bg-background z-50">
                                <SelectItem value="Class">Class</SelectItem>
                                <SelectItem value="Event">Event</SelectItem>
                                <SelectItem value="Product">Product</SelectItem>
                                <SelectItem value="Membership">Membership</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Total Amount</Label>
                            <p className="font-semibold text-lg">
                              ${calculateOrderTotal(selectedOrder).toFixed(2)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Customer Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Customer Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground">Name</Label>
                            <p className="font-medium">{selectedOrder._customers?.Full_name || 'Guest'}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Email</Label>
                            <p className="font-medium">{selectedOrder._customers?.email || 'No email'}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Customer ID</Label>
                            <p className="font-mono text-sm">{selectedOrder.customers_id}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Online Status</Label>
                            <Badge variant={selectedOrder._customers?.is_online_now ? 'default' : 'secondary'}>
                              {selectedOrder._customers?.is_online_now ? 'Online' : 'Offline'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Payment Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Payment Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-muted-foreground">Payment ID</Label>
                              <p className="font-mono text-sm">{selectedOrder.payment_id || 'N/A'}</p>
                            </div>
                            {selectedOrder.payment_response && (
                              <div>
                                <Label className="text-muted-foreground">Payment Response</Label>
                                <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                                  {JSON.stringify(selectedOrder.payment_response, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Order Items */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Order Items ({(selectedOrder._booking_items_of_bookings?.items || []).length})</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="divide-y">
                            {(selectedOrder._booking_items_of_bookings?.items || []).map((item) => (
                              <div key={item.id} className="p-4 hover:bg-muted/30 transition-colors">
                                <div className="flex items-center gap-4">
                                  {/* Item Info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-semibold text-sm truncate">{item._items.title}</h4>
                                      <Badge variant="secondary" className="text-xs shrink-0">{item._items.item_type}</Badge>
                                    </div>
                                    {item._items.description && (
                                      <p className="text-xs text-muted-foreground line-clamp-1">
                                        {item._items.description}
                                      </p>
                                    )}
                                  </div>
                                  
                                  {/* Quantity & Price - Compact Inline */}
                                  <div className="flex items-center gap-4 text-sm shrink-0">
                                    <div className="text-center">
                                      <p className="text-xs text-muted-foreground">Qty</p>
                                      <p className="font-semibold">{item.quantity}</p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-xs text-muted-foreground">Price</p>
                                      <p className="font-semibold">${item.price.toFixed(2)}</p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-xs text-muted-foreground">Total</p>
                                      <p className="font-bold text-primary">${(item.price * item.quantity).toFixed(2)}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="border-t bg-muted/20 px-4 py-3 flex justify-between items-center">
                            <span className="font-semibold">Order Total</span>
                            <span className="font-bold text-xl">
                              ${calculateOrderTotal(selectedOrder).toFixed(2)}
                            </span>
                          </div>
                         </CardContent>
                      </Card>

                      {/* Order Notes Section */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Order Notes</CardTitle>
                          <CardDescription>Internal notes for tracking purposes</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* Add New Note */}
                          <div className="space-y-3">
                            <Textarea
                              placeholder="Add internal note for tracking purposes..."
                              value={newNote}
                              onChange={(e) => setNewNote(e.target.value)}
                              className="min-h-[100px]"
                            />
                            <Button 
                              onClick={handleAddNote}
                              disabled={!newNote.trim()}
                              className="w-full sm:w-auto"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Note
                            </Button>
                          </div>

                          {/* Notes List */}
                          <div className="space-y-3">
                            {orderNotes.length === 0 ? (
                              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                                <p className="text-muted-foreground text-sm">
                                  No notes yet. Add a note to track order information.
                                </p>
                              </div>
                            ) : (
                              orderNotes.map((note) => (
                                <div key={note.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                                  <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1 space-y-2">
                                      <p className="text-sm">{note.notes}</p>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span className="font-medium">{note._created_by?.Full_name}</span>
                                        <span>•</span>
                                        <span>{new Date(note.created_at).toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}</span>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteNote(note.id)}
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )
                )}
                
                {/* Delete Order Confirmation Dialog */}
                <AlertDialog open={deleteOrderDialogOpen} onOpenChange={setDeleteOrderDialogOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Order</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete order <span className="font-mono font-semibold uppercase">{orderToDelete?.booking_slug}</span>? This action cannot be undone and will permanently remove the order and all associated booking items.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeletingOrder}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteOrder} 
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isDeletingOrder}
                      >
                        {isDeletingOrder ? 'Deleting...' : 'Delete'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                
                {/* Bulk Delete Orders Confirmation Dialog */}
                <AlertDialog open={bulkDeleteOrderDialogOpen} onOpenChange={setBulkDeleteOrderDialogOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Multiple Orders</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete <span className="font-semibold">{selectedOrders.size}</span> order{selectedOrders.size !== 1 ? 's' : ''}? This action cannot be undone and will permanently remove all selected orders and their associated booking items.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isBulkDeletingOrders}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleBulkDeleteOrders} 
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isBulkDeletingOrders}
                      >
                        {isBulkDeletingOrders ? `Deleting ${selectedOrders.size}...` : `Delete ${selectedOrders.size} Order${selectedOrders.size !== 1 ? 's' : ''}`}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TabsContent>

              {/* Tasks Tab */}
              <TabsContent value="tasks" className="space-y-4">
                {showTaskEditView ? (
                  <TaskForm
                    task={editingTask}
                    clerkUserId={user?.id || ''}
                    members={members}
                    onSave={handleTaskSaved}
                    onCancel={() => {
                      setShowTaskEditView(false);
                      setEditingTask(null);
                    }}
                  />
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h2 className="text-2xl font-bold">Tasks</h2>
                        <p className="text-muted-foreground">Manage and track tasks</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* View Toggle */}
                        <div className="flex items-center border rounded-lg p-1">
                          <Button
                            variant={taskViewMode === "list" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setTaskViewMode("list")}
                            className="h-8 px-3"
                          >
                            <List className="h-4 w-4 mr-1" />
                            List
                          </Button>
                          <Button
                            variant={taskViewMode === "kanban" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setTaskViewMode("kanban")}
                            className="h-8 px-3"
                          >
                            <Columns className="h-4 w-4 mr-1" />
                            Kanban
                          </Button>
                        </div>
                        <Button onClick={() => {
                          setEditingTask(null);
                          setShowTaskEditView(true);
                        }}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Task
                        </Button>
                      </div>
                    </div>

                    {/* Search and Filters */}
                    <Card>
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search by title, description, or type..."
                              value={taskSearchQuery}
                              onChange={(e) => setTaskSearchQuery(e.target.value)}
                              className="pl-9"
                            />
                          </div>
                          {hasActiveTaskFilters && (
                            <Button variant="outline" onClick={clearTaskFilters}>
                              <X className="h-4 w-4 mr-2" />
                              Clear Filters
                            </Button>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-3">
                          {/* Status Filter */}
                          <Select value={taskStatusFilter} onValueChange={setTaskStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              <SelectItem value="all">All Statuses</SelectItem>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="in progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>

                          {/* Task Type Filter */}
                          <Select value={taskTypeFilter} onValueChange={setTaskTypeFilter}>
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Task Type" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              <SelectItem value="all">All Types</SelectItem>
                              <SelectItem value="Send Email">Send Email</SelectItem>
                              <SelectItem value="Phone Call">Phone Call</SelectItem>
                              <SelectItem value="Follow Up">Follow Up</SelectItem>
                              <SelectItem value="Meeting">Meeting</SelectItem>
                              <SelectItem value="Review">Review</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>

                          {/* Assignee Filter */}
                          <Select value={taskAssigneeFilter} onValueChange={setTaskAssigneeFilter}>
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Assignee" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              <SelectItem value="all">All Assignees</SelectItem>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {taskAssignees.map((assignee) => (
                                <SelectItem key={assignee.id} value={assignee.id}>
                                  {assignee.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Results Count */}
                        {hasActiveTaskFilters && (
                          <div className="text-sm text-muted-foreground">
                            Showing {filteredTasks.length} of {tasks.length} tasks
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {loadingTasks ? (
                      <div className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="animate-pulse">
                            <div className="h-20 bg-muted rounded" />
                          </div>
                        ))}
                      </div>
                    ) : tasks.length === 0 ? (
                      <Card>
                        <CardContent className="py-12 text-center">
                          <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">No tasks found</p>
                          <Button 
                            className="mt-4" 
                            onClick={() => {
                              setEditingTask(null);
                              setShowTaskEditView(true);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create First Task
                          </Button>
                        </CardContent>
                      </Card>
                    ) : taskViewMode === "kanban" ? (
                      /* Kanban Board View */
                      <TaskKanbanBoard
                        tasks={filteredTasks}
                        members={members}
                        onEditTask={(task) => {
                          setEditingTask(task);
                          setShowTaskEditView(true);
                        }}
                        onDeleteTask={handleDeleteTaskClick}
                        onStatusChange={handleTaskStatusChange}
                      />
                    ) : (
                      /* List View */
                      <>
                        {filteredTasks.length === 0 ? (
                          <Card>
                            <CardContent className="py-12 text-center">
                              <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                              <p className="text-muted-foreground">No tasks match the current filters</p>
                            </CardContent>
                          </Card>
                        ) : (
                          <>
                            <div className="grid gap-4">
                              {filteredTasks.map((task) => {
                                return (
                                  <Card key={task.id} className="hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-2">
                                      <div className="flex items-start justify-between">
                                        <div className="space-y-1 flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground font-mono">#{task.id}</span>
                                            <CardTitle className="text-lg">{task.title}</CardTitle>
                                          </div>
                                          <CardDescription>{task.description}</CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Badge 
                                            variant={task.status === 'Completed' ? 'default' : task.status === 'New' ? 'secondary' : 'outline'}
                                            className={cn(
                                              task.status === 'Completed' && 'bg-green-500/10 text-green-600 border-green-200',
                                              task.status === 'New' && 'bg-blue-500/10 text-blue-600 border-blue-200',
                                              task.status === 'In Progress' && 'bg-yellow-500/10 text-yellow-600 border-yellow-200'
                                            )}
                                          >
                                            {task.status}
                                          </Badge>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                              setEditingTask(task);
                                              setShowTaskEditView(true);
                                            }}
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteTaskClick(task)}
                                          >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                          </Button>
                                        </div>
                                      </div>
                                    </CardHeader>
                                    <CardContent className="pt-2">
                                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                          <ClipboardList className="h-4 w-4" />
                                          <span>{task.task_type}</span>
                                        </div>
                                        {task.due_date && (
                                          <div className="flex items-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            <span>Due: {format(new Date(task.due_date), 'MMM dd, yyyy')}</span>
                                          </div>
                                        )}
                                        <div className="flex items-center gap-1">
                                          <Calendar className="h-4 w-4" />
                                          <span>Created: {format(new Date(task.created_at), 'MMM dd, yyyy')}</span>
                                        </div>
                                        {task._created_by_customer && (
                                          <div className="flex items-center gap-1">
                                            <User className="h-4 w-4" />
                                            <span>By: {task._created_by_customer.Full_name}</span>
                                          </div>
                                        )}
                                        {task._assigned_customer ? (
                                          <div className="flex items-center gap-1">
                                            <Users className="h-4 w-4" />
                                            <span>Assigned: {task._assigned_customer.Full_name}</span>
                                          </div>
                                        ) : task.assigned_customers_id === null && (
                                          <div className="flex items-center gap-1 text-muted-foreground/60">
                                            <Users className="h-4 w-4" />
                                            <span>Unassigned</span>
                                          </div>
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>

                            {/* Pagination */}
                            {tasksTotalPages > 1 && (
                              <div className="flex items-center justify-between mt-6">
                                <div className="text-sm text-muted-foreground">
                                  Showing page {tasksPage} of {tasksTotalPages} ({tasksTotalItems} total tasks)
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setTasksPage(p => Math.max(1, p - 1))}
                                    disabled={tasksPage <= 1}
                                  >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Previous
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setTasksPage(p => Math.min(tasksTotalPages, p + 1))}
                                    disabled={tasksPage >= tasksTotalPages}
                                  >
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Delete Task Confirmation Dialog */}
              <AlertDialog open={deleteTaskDialogOpen} onOpenChange={setDeleteTaskDialogOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Task</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{taskToDelete?.title}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setTaskToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteTaskConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Donations Tab */}
              <TabsContent value="donations" className="space-y-4">
                {showDonationEditView ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 mb-6">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowDonationEditView(false);
                          setEditingDonation(null);
                        }}
                      >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Back to Donations
                      </Button>
                      <h2 className="text-2xl font-bold">
                        {editingDonation ? `Edit: ${editingDonation.title}` : 'Create New Donation'}
                      </h2>
                    </div>
                    <Card>
                      <CardContent className="pt-6">
                        <CampaignForm campaign={editingDonation} onSuccess={handleDonationSaved} itemType="Donation" />
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h2 className="text-2xl font-bold">Donations</h2>
                        <p className="text-muted-foreground">Create and manage donation items</p>
                      </div>
                      <Button onClick={() => {
                        setEditingDonation(null);
                        setShowDonationEditView(true);
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Donation
                      </Button>
                    </div>

                    {loadingDonations ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                          <Card key={i} className="animate-pulse">
                            <div className="h-48 bg-muted rounded-t-lg" />
                            <CardHeader>
                              <div className="h-6 bg-muted rounded" />
                              <div className="h-4 bg-muted rounded w-2/3" />
                            </CardHeader>
                          </Card>
                        ))}
                      </div>
                    ) : donations.length === 0 ? (
                      <Card className="text-center py-12">
                        <CardContent>
                          <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No donations yet</h3>
                          <p className="text-muted-foreground mb-4">
                            Create your first donation item to start collecting donations
                          </p>
                          <Button onClick={() => {
                            setEditingDonation(null);
                            setShowDonationEditView(true);
                          }}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Donation
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {donations.map((donation) => {
                            const goalAmount = donation.item_info?.goal_amount || 0;
                            const goalAchieved = donation.item_info?.goal_achieved || 0;
                            const progressPercentage = goalAmount > 0 ? Math.min((goalAchieved / goalAmount) * 100, 100) : 0;
                            
                            return (
                              <Card key={donation.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                <CardHeader>
                                  <div className="flex items-start justify-between">
                                    <CardTitle className="text-xl">{donation.title}</CardTitle>
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEditDonationClick(donation)}
                                        title="Edit Donation"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleCopyDonation(donation)}
                                        title="Duplicate Donation"
                                      >
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleAddDonationToCampaign(donation)}
                                        title="Start a new campaign"
                                      >
                                        <Target className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteDonationClick(donation)}
                                        title="Delete Donation"
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </div>
                                  <CardDescription className="line-clamp-2">
                                    {donation.description || 'No description'}
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  {/* Progress Bar */}
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                      <span className="font-medium">${goalAchieved.toLocaleString()} raised</span>
                                      <span className="text-muted-foreground">{progressPercentage.toFixed(0)}%</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-primary transition-all duration-300"
                                        style={{ width: `${progressPercentage}%` }}
                                      />
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      Goal: ${goalAmount.toLocaleString()}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <Badge variant={donation.Is_disabled ? "destructive" : "default"}>
                                      {donation.Is_disabled ? 'Disabled' : 'Active'}
                                    </Badge>
                                    {progressPercentage >= 100 && (
                                      <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-200">
                                        Goal Reached!
                                      </Badge>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>

                        {donationsTotalPages > 1 && (
                          <div className="flex items-center justify-center gap-4 mt-8">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setDonationsPage(p => Math.max(1, p - 1))}
                              disabled={donationsPage === 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="text-sm text-muted-foreground">
                              Page {donationsPage} of {donationsTotalPages} ({donationsTotalItems} total)
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setDonationsPage(p => Math.min(donationsTotalPages, p + 1))}
                              disabled={donationsPage === donationsTotalPages}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}

                    {/* Delete Confirmation Dialog */}
                    <AlertDialog open={deleteDonationDialogOpen} onOpenChange={setDeleteDonationDialogOpen}>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the donation "{donationToDelete?.title}". 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteDonationConfirm}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </TabsContent>

              {/* Campaign Leads Tab */}
              <TabsContent value="campaign-leads" className="space-y-4">
                {showCampaignEditView ? (
                  // Campaign Edit View (within Marketing tab)
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 mb-6">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowCampaignEditView(false);
                          setEditingCampaign(null);
                        }}
                      >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Back to Campaigns
                      </Button>
                      <h2 className="text-2xl font-bold">
                        {editingCampaign ? `Edit: ${editingCampaign.title}` : 'Create New Campaign'}
                      </h2>
                    </div>
                    <Card>
                      <CardContent className="pt-6">
                        <CampaignForm campaign={editingCampaign} onSuccess={handleCampaignSaved} itemType="Campaign" />
                      </CardContent>
                    </Card>
                    
                    {/* Related Items Section */}
                    {editingCampaign && (
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                              <Target className="h-5 w-5" />
                              Marketing Campaigns
                            </CardTitle>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setAddRelatedItemDialogOpen(true);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Item
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => fetchRelatedItems(editingCampaign.id)}
                                disabled={loadingRelatedItems}
                              >
                                {loadingRelatedItems ? 'Loading...' : 'Refresh'}
                              </Button>
                            </div>
                          </div>
                          <CardDescription>
                            Items linked to this campaign via related_items
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {loadingRelatedItems ? (
                            <div className="space-y-2">
                              {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                              ))}
                            </div>
                          ) : relatedItems.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>No related items linked to this campaign</p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-3"
                                onClick={() => {
                                  setAddRelatedItemDialogOpen(true);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Link First Item
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {relatedItems.map((item) => {
                                const itemDetail = relatedItemDetails.get(item.related_items_id);
                                return (
                                  <div 
                                    key={item.id} 
                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                                        <Target className="h-5 w-5 text-primary" />
                                      </div>
                                      <div>
                                        <p className="font-medium text-sm">
                                          {itemDetail?.title || `Item #${item.related_items_id}`}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          {itemDetail?.item_type && (
                                            <Badge variant="outline" className="text-xs px-1.5 py-0">
                                              {itemDetail.item_type}
                                            </Badge>
                                          )}
                                          <span>Seq: {item.seq}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant={item.is_visible ? 'default' : 'secondary'}>
                                        {item.is_visible ? 'Active' : 'Hidden'}
                                      </Badge>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleUnlinkItem(item.id, editingCampaign.id)}
                                        disabled={deletingRelatedItemId === item.id}
                                      >
                                        {deletingRelatedItemId === item.id ? (
                                          <span className="animate-pulse">...</span>
                                        ) : (
                                          <Trash2 className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Campaign Leads Section */}
                    {editingCampaign && (
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                              <UserPlus className="h-5 w-5" />
                              Campaign Leads
                            </CardTitle>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                setSelectedCampaignForLeads(editingCampaign);
                                setShowCampaignEditView(false);
                                setEditingCampaign(null);
                                setSelectedCampaignLeadIds(new Set());
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View All Leads
                            </Button>
                          </div>
                          <CardDescription>
                            Leads assigned to this campaign
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center py-4">
                            <p className="text-sm text-muted-foreground mb-3">
                              Manage leads assigned to "{editingCampaign.title}"
                            </p>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedCampaignForLeads(editingCampaign);
                                setShowCampaignEditView(false);
                                setEditingCampaign(null);
                                setSelectedCampaignLeadIds(new Set());
                              }}
                            >
                              <Target className="h-4 w-4 mr-2" />
                              View Leads
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : showCampaignLeadDetailView && selectedCampaignLead ? (
                  // Lead Detail View
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 mb-6">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowCampaignLeadDetailView(false);
                          setSelectedCampaignLead(null);
                        }}
                      >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Back to Leads
                      </Button>
                      <h2 className="text-2xl font-bold">Campaign Lead Details</h2>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            Campaign Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-sm text-muted-foreground">Title</span>
                              <p className="font-medium">{selectedCampaignLead._items?.title || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Type</span>
                              <p className="font-medium">{selectedCampaignLead._items?.item_type || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">SKU</span>
                              <p className="font-medium">{selectedCampaignLead._items?.sku || 'N/A'}</p>
                            </div>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Description</span>
                            <p className="mt-1 text-sm">{selectedCampaignLead._items?.description || 'No description'}</p>
                          </div>
                          <Badge variant="secondary">{selectedCampaignLead.status}</Badge>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <UserPlus className="h-5 w-5" />
                                Lead Information
                              </div>
                              {(selectedCampaignLead._leads?.lead_payload?.first_name || selectedCampaignLead._leads?.lead_payload?.last_name) && (
                                <span className="text-lg font-semibold text-foreground">
                                  {`${selectedCampaignLead._leads?.lead_payload?.first_name || ''} ${selectedCampaignLead._leads?.lead_payload?.last_name || ''}`.trim()}
                                </span>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (selectedCampaignLead.leads_id) {
                                  const leadToEdit: Lead = {
                                    id: selectedCampaignLead.leads_id,
                                    created_at: selectedCampaignLead._leads?.created_at || Date.now(),
                                    shops_id: selectedCampaignLead.shops_id,
                                    lead_payload: selectedCampaignLead._leads?.lead_payload || {},
                                    status: selectedCampaignLead._leads?.status || 'new',
                                    customers_id: selectedCampaignLead._leads?.customers_id || null,
                                    geo_location: {},
                                    headers: {},
                                    email: selectedCampaignLead._leads?.email || '',
                                    modified_by_id: selectedCampaignLead._leads?.modified_by_id || null,
                                    _shops: { id: '', name: '', slug: '' },
                                    _leads_assignment: [],
                                  };
                                  setEditingLead(leadToEdit);
                                  setShowLeadEditView(true);
                                  setActiveTab('leads');
                                }
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Lead
                            </Button>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-sm text-muted-foreground">Email</span>
                              <p className="font-medium">{selectedCampaignLead._leads?.email || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Status</span>
                              <Badge variant="outline">{selectedCampaignLead._leads?.status || 'N/A'}</Badge>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Mobile</span>
                              <p className="font-medium">{selectedCampaignLead._leads?.lead_payload?.mobile_number || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Address</span>
                              <p className="font-medium">{selectedCampaignLead._leads?.lead_payload?.property_address || 'N/A'}</p>
                            </div>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Notes</span>
                            <p className="mt-1 text-sm">{selectedCampaignLead._leads?.lead_payload?.notes || 'No notes'}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Created</span>
                            <p className="mt-1">{new Date(selectedCampaignLead.created_at).toLocaleDateString()}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : selectedCampaignForLeads && showEmailCampaignView ? (
                  // Email Campaign View
                  <EmailCampaignForm
                    campaignId={String(selectedCampaignForLeads.id)}
                    campaignTitle={selectedCampaignForLeads.title}
                    campaignItem={selectedCampaignForLeads}
                    sharableLinks={campaignSharableLinks || undefined}
                    relatedItems={relatedItems}
                    relatedItemDetails={relatedItemDetails}
                    relatedItemMedia={relatedItemMedia}
                    linkedBookings={linkedBookings}
                    useBookingAsReference={linkedBookings.length > 0}
                    onBack={() => setShowEmailCampaignView(false)}
                    onSuccess={() => {
                      // Optionally refresh leads after sending
                    }}
                  />
                ) : selectedCampaignForLeads ? (
                  // Leads List for selected campaign
                  <>
                    <div className="flex items-center gap-4 mb-6">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedCampaignForLeads(null);
                          setCampaignLeads([]);
                          setCampaignLeadSearchQuery("");
                          setCampaignLeadStatusFilter("all");
                          setShowEmailCampaignView(false);
                          setSelectedCampaignLeadIds(new Set());
                        }}
                      >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Back to Campaigns
                      </Button>
                      <div>
                        <h2 className="text-2xl font-bold">{selectedCampaignForLeads.title}</h2>
                        <p className="text-muted-foreground">View leads assigned to this campaign</p>
                      </div>
                      <div className="ml-auto flex gap-2">
                        <Button 
                          variant="outline"
                          onClick={() => setShowEmailCampaignView(true)}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Configure Email
                        </Button>
                        <Button onClick={() => setAssignLeadDialogOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Assign Lead
                        </Button>
                      </div>
                    </div>

                    <Collapsible defaultOpen={false} className="mb-6">
                      <Card>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="py-4 cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Target className="h-5 w-5" />
                                Marketing Campaigns
                                {relatedItems.length > 0 && (
                                  <Badge variant="secondary" className="ml-2">{relatedItems.length}</Badge>
                                )}
                              </CardTitle>
                              <div className="flex items-center gap-2">
                                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [&[data-state=open]>svg]:rotate-180" />
                              </div>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-0">
                            <div className="flex gap-2 mb-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAddRelatedItemDialogOpen(true);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Item
                              </Button>
                              <Button
                                variant={linkedBookings.length === 0 ? "default" : "outline"}
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAddBookingDialogOpen(true);
                                }}
                                title="Add a reference booking to define the field schema for application emails"
                              >
                                <ClipboardList className="h-4 w-4 mr-2" />
                                {linkedBookings.length === 0 ? 'Add Reference Booking' : 'Change Reference Booking'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  fetchRelatedItems(selectedCampaignForLeads.id);
                                }}
                                disabled={loadingRelatedItems}
                              >
                                {loadingRelatedItems ? 'Loading...' : 'Refresh'}
                              </Button>
                            </div>
                            
                            {/* Reference Booking Display - for Application Email Templates */}
                            {linkedBookings.length > 0 && (
                              <div className="mb-4 p-3 border rounded-lg bg-primary/5 border-primary/20">
                                <h4 className="text-sm font-medium mb-1 flex items-center gap-2">
                                  <ClipboardList className="h-4 w-4 text-primary" />
                                  Reference Booking (Template Schema)
                                </h4>
                                <p className="text-xs text-muted-foreground mb-3">
                                  This booking defines the field structure for application emails. When sending to applications, each application's data will replace these placeholders.
                                </p>
                                <div className="space-y-2">
                                  {linkedBookings.map((booking) => (
                                    <div 
                                      key={booking.id}
                                      className="flex items-center justify-between p-2 border rounded bg-background"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-sm truncate">
                                            {booking._items?.title || booking.booking_slug}
                                          </span>
                                          <Badge variant="outline" className="text-xs">
                                            {booking.status}
                                          </Badge>
                                          <Badge variant="secondary" className="text-xs">
                                            {booking.booking_type}
                                          </Badge>
                                          {booking.total_amount !== undefined && booking.total_amount > 0 && (
                                            <Badge variant="secondary" className="text-xs">
                                              ${booking.total_amount.toFixed(2)}
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-xs text-muted-foreground font-mono truncate">
                                          {booking.booking_slug}
                                        </p>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleUnlinkBooking(booking.id, selectedCampaignForLeads.id)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                        {loadingRelatedItems ? (
                          <div className="flex gap-2">
                            {[...Array(3)].map((_, i) => (
                              <div key={i} className="h-10 w-32 bg-muted rounded animate-pulse" />
                            ))}
                          </div>
                        ) : relatedItems.length === 0 ? (
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">No items linked to this campaign</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setAddRelatedItemDialogOpen(true);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Link First Item
                            </Button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-3">
                            {relatedItems.map((item) => {
                              const itemDetail = relatedItemDetails.get(item.related_items_id);
                              const sharableLinks = relatedItemsSharableLinks.get(item.related_items_id);
                              const isLoadingLinks = loadingSharableLinks.has(item.related_items_id);
                              
                              return (
                                <div 
                                  key={item.id} 
                                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors group"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                      <Target className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="font-medium text-sm truncate">
                                        {itemDetail?.title || `Item #${item.related_items_id}`}
                                      </p>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                        {itemDetail?.item_type && (
                                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                                            {itemDetail.item_type}
                                          </Badge>
                                        )}
                                        <span>Seq: {item.seq}</span>
                                        {!item.is_visible && (
                                          <Badge variant="secondary" className="text-xs px-1.5 py-0">Hidden</Badge>
                                        )}
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 transition-opacity"
                                      onClick={() => handleUnlinkItem(item.id, selectedCampaignForLeads.id)}
                                      disabled={deletingRelatedItemId === item.id}
                                    >
                                      {deletingRelatedItemId === item.id ? (
                                        <span className="animate-pulse">...</span>
                                      ) : (
                                        <Trash2 className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                  
                                  {/* Social Sharing Section */}
                                  <div className="mt-3 pt-3 border-t">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground font-medium">Share Links</span>
                                    </div>
                                    {isLoadingLinks ? (
                                      <div className="flex gap-2">
                                        {[...Array(4)].map((_, i) => (
                                          <div key={i} className="h-8 w-8 rounded bg-muted animate-pulse" />
                                        ))}
                                      </div>
                                    ) : sharableLinks ? (
                                      <div className="flex flex-wrap gap-2">
                                        {sharableLinks.facebook && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 px-2 text-xs gap-1.5 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600"
                                            onClick={() => window.open(sharableLinks.facebook, '_blank')}
                                          >
                                            <Facebook className="h-3.5 w-3.5" />
                                            Facebook
                                          </Button>
                                        )}
                                        {sharableLinks.twitter && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 px-2 text-xs gap-1.5 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-600"
                                            onClick={() => window.open(sharableLinks.twitter, '_blank')}
                                          >
                                            <Twitter className="h-3.5 w-3.5" />
                                            Twitter
                                          </Button>
                                        )}
                                        {sharableLinks.linkedin && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 px-2 text-xs gap-1.5 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700"
                                            onClick={() => window.open(sharableLinks.linkedin, '_blank')}
                                          >
                                            <Linkedin className="h-3.5 w-3.5" />
                                            LinkedIn
                                          </Button>
                                        )}
                                        {sharableLinks.whatsapp && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 px-2 text-xs gap-1.5 hover:bg-green-50 hover:border-green-300 hover:text-green-600"
                                            onClick={() => window.open(sharableLinks.whatsapp, '_blank')}
                                          >
                                            <MessageSquare className="h-3.5 w-3.5" />
                                            WhatsApp
                                          </Button>
                                        )}
                                        {sharableLinks.email && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 px-2 text-xs gap-1.5 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600"
                                            onClick={() => window.open(`mailto:?body=${encodeURIComponent(sharableLinks.email || '')}`, '_blank')}
                                          >
                                            <Mail className="h-3.5 w-3.5" />
                                            Email
                                          </Button>
                                        )}
                                        {sharableLinks.copylink && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 px-2 text-xs gap-1.5 hover:bg-muted"
                                            onClick={() => {
                                              navigator.clipboard.writeText(sharableLinks.copylink || '');
                                              toast({
                                                title: "Link copied",
                                                description: "Campaign link copied to clipboard.",
                                              });
                                            }}
                                          >
                                            <Copy className="h-3.5 w-3.5" />
                                            Copy Link
                                          </Button>
                                        )}
                                        {itemDetail && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 px-2 text-xs gap-1.5 hover:bg-muted"
                                            onClick={() => window.open(getItemBaseUrl(itemDetail), '_blank')}
                                          >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            View
                                          </Button>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground">No share links available</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>

                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name or email..."
                          value={campaignLeadSearchQuery}
                          onChange={(e) => setCampaignLeadSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-background">
                        <Switch
                          checked={filterNewLeadsOnly}
                          onCheckedChange={(checked) => {
                            setFilterNewLeadsOnly(checked);
                            if (selectedCampaignForLeads?.id) {
                              fetchCampaignLeads(selectedCampaignForLeads.id, 1, checked);
                            }
                          }}
                        />
                        <Label className="text-sm whitespace-nowrap cursor-pointer">New only</Label>
                      </div>
                      <Select value={campaignLeadStatusFilter} onValueChange={setCampaignLeadStatusFilter}>
                        <SelectTrigger className="w-full sm:w-48">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="New">New</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Contacted">Contacted</SelectItem>
                          <SelectItem value="Converted">Converted</SelectItem>
                          <SelectItem value="Closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {loadingCampaignLeads ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                          <Card key={i} className="animate-pulse">
                            <CardHeader>
                              <div className="h-6 bg-muted rounded" />
                              <div className="h-4 bg-muted rounded w-2/3" />
                            </CardHeader>
                          </Card>
                        ))}
                      </div>
                    ) : (() => {
                      const filteredLeads = campaignLeads.filter((cl) => {
                        const searchLower = campaignLeadSearchQuery.toLowerCase();
                        const leadName = cl._leads?.name 
                          || `${cl._leads?.lead_payload?.first_name || ''} ${cl._leads?.lead_payload?.last_name || ''}`.trim()
                          || '';
                        const leadEmail = cl._leads?.email || cl._leads?.lead_payload?.email || '';
                        const matchesSearch = campaignLeadSearchQuery === "" || 
                          cl._customers?.Full_name?.toLowerCase().includes(searchLower) ||
                          cl._customers?.email?.toLowerCase().includes(searchLower) ||
                          leadName.toLowerCase().includes(searchLower) ||
                          leadEmail.toLowerCase().includes(searchLower);
                        const matchesStatus = campaignLeadStatusFilter === "all" || cl.status === campaignLeadStatusFilter;
                        return matchesSearch && matchesStatus;
                      });

                      return filteredLeads.length === 0 ? (
                        <Card className="text-center py-12">
                          <CardContent>
                            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No leads found</h3>
                            <p className="text-muted-foreground mb-4">
                              {campaignLeadSearchQuery || campaignLeadStatusFilter !== "all" 
                                ? "Try adjusting your search or filter" 
                                : "Assign leads to this campaign to track engagement"}
                            </p>
                          </CardContent>
                        </Card>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={selectedCampaignLeadIds.size === filteredLeads.length && filteredLeads.length > 0}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedCampaignLeadIds(new Set(filteredLeads.map(l => l.id)));
                                  } else {
                                    setSelectedCampaignLeadIds(new Set());
                                  }
                                }}
                              />
                              <span className="text-sm text-muted-foreground">
                                {selectedCampaignLeadIds.size > 0 
                                  ? `${selectedCampaignLeadIds.size} selected`
                                  : `Showing ${filteredLeads.length} lead${filteredLeads.length !== 1 ? 's' : ''}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {selectedCampaignLeadIds.size > 0 && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  disabled={quickSendLoading}
                                  onClick={async () => {
                                    // Check if campaign has template configured
                                    if (!selectedCampaignForLeads?.item_info?.email_template_alias || 
                                        !selectedCampaignForLeads?.item_info?.email_template_mappings) {
                                      toast({
                                        title: "Email Template Not Configured",
                                        description: "Please configure an email template and field mappings in the Email Campaign settings first.",
                                        variant: "destructive",
                                      });
                                      return;
                                    }
                                    
                                    try {
                                      const response = await adminAPI.getPostmarkTemplates(user?.id || '');
                                      const standardTemplates = response.Templates.filter((t: PostmarkTemplate) => t.TemplateType === 'Standard' && t.Active);
                                      const savedTemplate = standardTemplates.find(
                                        (t: PostmarkTemplate) => t.Alias === selectedCampaignForLeads.item_info?.email_template_alias
                                      );
                                      if (savedTemplate) {
                                        setQuickSendSelectedTemplate(savedTemplate);
                                        setQuickSendTemplates(standardTemplates);
                                        // Get selected leads and send directly - pass template directly to avoid async state issue
                                        const leadsToSend = filteredLeads.filter(l => selectedCampaignLeadIds.has(l.id));
                                        handleQuickSendEmail(leadsToSend, savedTemplate);
                                      } else {
                                        toast({
                                          title: "Template Not Found",
                                          description: "The configured email template could not be found. Please update the Email Campaign settings.",
                                          variant: "destructive",
                                        });
                                      }
                                    } catch (error) {
                                      console.error('Failed to fetch templates:', error);
                                      toast({
                                        title: "Error",
                                        description: "Failed to load email templates. Please try again.",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                >
                                  {quickSendLoading ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Send className="h-4 w-4 mr-2" />
                                  )}
                                  Send to {selectedCampaignLeadIds.size} Selected
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={filteredLeads.length === 0 || quickSendLoading}
                                onClick={async () => {
                                  // Check if campaign has template configured
                                  if (!selectedCampaignForLeads?.item_info?.email_template_alias || 
                                      !selectedCampaignForLeads?.item_info?.email_template_mappings) {
                                    toast({
                                      title: "Email Template Not Configured",
                                      description: "Please configure an email template and field mappings in the Email Campaign settings first.",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  
                                  try {
                                    const response = await adminAPI.getPostmarkTemplates(user?.id || '');
                                    const standardTemplates = response.Templates.filter((t: PostmarkTemplate) => t.TemplateType === 'Standard' && t.Active);
                                    const savedTemplate = standardTemplates.find(
                                      (t: PostmarkTemplate) => t.Alias === selectedCampaignForLeads.item_info?.email_template_alias
                                    );
                                    if (savedTemplate) {
                                      setQuickSendSelectedTemplate(savedTemplate);
                                      setQuickSendTemplates(standardTemplates);
                                      // Send to ALL filtered leads directly - pass template directly to avoid async state issue
                                      handleQuickSendEmail(filteredLeads, savedTemplate);
                                    } else {
                                      toast({
                                        title: "Template Not Found",
                                        description: "The configured email template could not be found. Please update the Email Campaign settings.",
                                        variant: "destructive",
                                      });
                                    }
                                  } catch (error) {
                                    console.error('Failed to fetch templates:', error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to load email templates. Please try again.",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                {quickSendLoading ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4 mr-2" />
                                )}
                                Send to All ({filteredLeads.length})
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredLeads.map((campaignLead) => {
                              const isSelected = selectedCampaignLeadIds.has(campaignLead.id);
                              const hasBeenContacted = !!campaignLead.last_contact_date;
                              
                              return (
                                <Card 
                                  key={campaignLead.id} 
                                  className={cn(
                                    "overflow-hidden hover:shadow-md transition-shadow cursor-pointer",
                                    isSelected && "ring-2 ring-primary",
                                    !hasBeenContacted && "border-l-4 border-l-amber-500"
                                  )}
                                  onClick={() => fetchCampaignLeadDetail(campaignLead.id)}
                                >
                                  <CardContent className="p-3">
                                    <div className="flex flex-col gap-2">
                                      <div className="flex items-center gap-2">
                                        <Checkbox
                                          checked={isSelected}
                                          onCheckedChange={(checked) => {
                                            const newSet = new Set(selectedCampaignLeadIds);
                                            if (checked) {
                                              newSet.add(campaignLead.id);
                                            } else {
                                              newSet.delete(campaignLead.id);
                                            }
                                            setSelectedCampaignLeadIds(newSet);
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                        <div className="flex items-center justify-between gap-2 flex-1 min-w-0">
                                          <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <span className="font-medium truncate text-sm">
                                              {campaignLead._leads?.name 
                                                || (campaignLead._leads?.lead_payload?.first_name || campaignLead._leads?.lead_payload?.last_name 
                                                  ? `${campaignLead._leads?.lead_payload?.first_name || ''} ${campaignLead._leads?.lead_payload?.last_name || ''}`.trim()
                                                  : campaignLead._leads?.email || 'Unknown')}
                                            </span>
                                            <Badge variant="secondary" className="text-xs shrink-0">{campaignLead.status}</Badge>
                                            {!hasBeenContacted && (
                                              <Badge variant="outline" className="text-xs shrink-0 border-amber-500 text-amber-600 bg-amber-50">
                                                New
                                              </Badge>
                                            )}
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteCampaignLeadClick(campaignLead);
                                            }}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-between text-xs text-muted-foreground pl-6">
                                        <span className="font-mono truncate flex-1">
                                          ID: {campaignLead.id.slice(0, 8)}...
                                        </span>
                                        <div className="flex items-center gap-3 shrink-0">
                                          <span title="Created">
                                            <Clock className="h-3 w-3 inline mr-1" />
                                            {new Date(campaignLead.created_at).toLocaleDateString()}
                                          </span>
                                          {hasBeenContacted ? (
                                            <span className="text-green-600" title="Last contacted">
                                              <Mail className="h-3 w-3 inline mr-1" />
                                              {new Date(campaignLead.last_contact_date!).toLocaleDateString()}
                                            </span>
                                          ) : (
                                            <span className="text-amber-600" title="Never contacted">
                                              <Mail className="h-3 w-3 inline mr-1" />
                                              Never
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}

                    {campaignLeadsTotalPages > 1 && (
                      <div className="flex items-center justify-center gap-4 mt-8">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCampaignLeadsPage(p => Math.max(1, p - 1))}
                          disabled={campaignLeadsPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Page {campaignLeadsPage} of {campaignLeadsTotalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCampaignLeadsPage(p => Math.min(campaignLeadsTotalPages, p + 1))}
                          disabled={campaignLeadsPage === campaignLeadsTotalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  // Campaigns List View (default)
                  <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                      <div>
                        <h2 className="text-2xl font-bold">Marketing</h2>
                        <p className="text-muted-foreground">Manage campaigns and their leads</p>
                      </div>
                      <Button onClick={() => {
                        setEditingCampaign(null);
                        setShowCampaignEditView(true);
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Campaign
                      </Button>
                    </div>

                    {loadingCampaigns ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                          <Card key={i} className="animate-pulse">
                            <CardHeader>
                              <div className="h-6 bg-muted rounded" />
                              <div className="h-4 bg-muted rounded w-2/3" />
                            </CardHeader>
                          </Card>
                        ))}
                      </div>
                    ) : campaigns.length === 0 ? (
                      <Card className="text-center py-12">
                        <CardContent>
                          <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
                          <p className="text-muted-foreground mb-4">
                            Create your first marketing campaign to get started
                          </p>
                          <Button onClick={() => {
                            setEditingCampaign(null);
                            setShowCampaignEditView(true);
                          }}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Campaign
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {campaigns.map((campaign) => (
                          <Card 
                            key={campaign.id} 
                            className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                            onClick={() => {
                              setSelectedCampaignForLeads(campaign);
                              setCampaignLeadsPage(1);
                              setSelectedCampaignLeadIds(new Set());
                              // Fetch leads for this campaign
                              fetchCampaignLeads(Number(campaign.id), 1);
                            }}
                          >
                          <CardHeader className="pb-3">
                              {/* Action buttons row on top */}
                              <div className="flex items-center justify-between mb-3">
                                <Badge variant={campaign.Is_disabled ? "destructive" : "default"}>
                                  {campaign.Is_disabled ? 'Inactive' : 'Active'}
                                </Badge>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditCampaignClick(campaign);
                                    }}
                                    title="Edit Campaign"
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteCampaignClick(campaign);
                                    }}
                                    title="Delete Campaign"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                              {/* Title stretching full width */}
                              <div className="flex items-center gap-2">
                                <Megaphone className="h-5 w-5 text-primary flex-shrink-0" />
                                <CardTitle className="text-lg leading-tight">{campaign.title}</CardTitle>
                              </div>
                              <p className="text-xs text-muted-foreground font-mono mt-1">/{campaign.slug}</p>
                              <CardDescription className="line-clamp-2 mt-2">
                                {campaign.description || 'No description'}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center justify-between gap-2 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Target className="h-4 w-4" />
                                  <span>
                                    Goal: ${campaign.item_info?.goal_amount || 0}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Users className="h-4 w-4 text-primary" />
                                  <span className="font-medium text-primary">
                                    {campaignLeadCounts.get(campaign.id) ?? '—'}
                                  </span>
                                  <span className="text-muted-foreground text-xs">leads</span>
                                </div>
                              </div>
                            </CardContent>
                            <CardFooter>
                              <Button variant="ghost" size="sm" className="ml-auto">
                                <Eye className="h-4 w-4 mr-2" />
                                View Leads ({campaignLeadCounts.get(campaign.id) ?? 0})
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    )}

                    {campaignsTotalPages > 1 && (
                      <div className="flex items-center justify-center gap-4 mt-8">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCampaignsPage(p => Math.max(1, p - 1))}
                          disabled={campaignsPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Page {campaignsPage} of {campaignsTotalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCampaignsPage(p => Math.min(campaignsTotalPages, p + 1))}
                          disabled={campaignsPage === campaignsTotalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {/* Add Related Item Dialog */}
                <Dialog open={addRelatedItemDialogOpen} onOpenChange={(open) => {
                  setAddRelatedItemDialogOpen(open);
                  if (!open) {
                    setLinkItemSearchQuery("");
                    setLinkItemTypeFilter("all");
                    setSelectedItemToLink("");
                    setLinkItemPage(1);
                    setAvailableItemsForLinking([]);
                  }
                }}>
                  <DialogContent className="max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                      <DialogTitle>Link Item to Campaign</DialogTitle>
                      <DialogDescription>
                        Select an item to link to {selectedCampaignForLeads?.title || editingCampaign?.title || 'this campaign'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {/* Filters Row */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search by title or ID..."
                              value={linkItemSearchQuery}
                              onChange={(e) => setLinkItemSearchQuery(e.target.value)}
                              className="pl-9"
                            />
                          </div>
                        </div>
                        <Select value={linkItemTypeFilter} onValueChange={setLinkItemTypeFilter} disabled={loadingItemTypes}>
                          <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder={loadingItemTypes ? "Loading..." : "All Types"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            {availableItemTypes.map((itemType) => (
                              <SelectItem key={itemType} value={itemType}>
                                {itemType}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Items List */}
                      <div className="space-y-2">
                        <Label>Select Item</Label>
                        {loadingAvailableItems ? (
                          <div className="space-y-2">
                            {[...Array(5)].map((_, i) => (
                              <div key={i} className="h-14 bg-muted rounded animate-pulse" />
                            ))}
                          </div>
                        ) : (
                          <ScrollArea className="h-[300px] border rounded-md">
                            <div className="p-2 space-y-1">
                              {availableItemsForLinking.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                  <p className="text-sm">No items found matching your filters</p>
                                  {(linkItemSearchQuery || linkItemTypeFilter !== "all") && (
                                    <Button
                                      variant="link"
                                      size="sm"
                                      onClick={() => {
                                        setLinkItemSearchQuery("");
                                        setLinkItemTypeFilter("all");
                                      }}
                                    >
                                      Clear filters
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                availableItemsForLinking.map((item) => (
                                  <div
                                    key={item.id}
                                    className={cn(
                                      "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                                      selectedItemToLink === item.id.toString()
                                        ? "bg-primary/10 border border-primary"
                                        : "hover:bg-muted border border-transparent"
                                    )}
                                    onClick={() => setSelectedItemToLink(item.id.toString())}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium truncate">{item.title}</span>
                                        <Badge variant="outline" className="text-xs shrink-0">
                                          {item.item_type}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded">ID: {item.id}</span>
                                        {item.slug && <span className="truncate">/{item.slug}</span>}
                                      </div>
                                    </div>
                                    {selectedItemToLink === item.id.toString() && (
                                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                                        <CheckSquare className="h-3 w-3 text-primary-foreground" />
                                      </div>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          </ScrollArea>
                        )}
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            Showing {availableItemsForLinking.length} of {linkItemTotalItems} items
                            {(linkItemSearchQuery || linkItemTypeFilter !== "all") && ' with current filters'}
                          </p>
                          {linkItemPage < linkItemTotalPages && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleLoadMoreLinkItems}
                              disabled={loadingMoreItems}
                            >
                              {loadingMoreItems ? (
                                <>
                                  <span className="animate-spin mr-2">⟳</span>
                                  Loading...
                                </>
                              ) : (
                                <>Load More</>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setAddRelatedItemDialogOpen(false);
                          setSelectedItemToLink("");
                          setLinkItemSearchQuery("");
                          setLinkItemTypeFilter("all");
                          setLinkItemPage(1);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          const campaignId = selectedCampaignForLeads?.id || editingCampaign?.id;
                          if (campaignId) {
                            handleLinkItem(campaignId);
                          }
                        }}
                        disabled={!selectedItemToLink || linkingItem}
                      >
                        {linkingItem ? 'Linking...' : 'Link Item'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Add Booking Dialog */}
                <Dialog open={addBookingDialogOpen} onOpenChange={(open) => {
                  setAddBookingDialogOpen(open);
                  if (!open) {
                    setBookingSearchQuery("");
                    setBookingTypeFilter("all");
                    setSelectedBookingToLink("");
                    setBookingLinkPage(1);
                    setAvailableBookingsForLinking([]);
                  }
                }}>
                  <DialogContent className="max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                      <DialogTitle>Link Booking to Campaign</DialogTitle>
                      <DialogDescription>
                        Select a booking/application to link to {selectedCampaignForLeads?.title || editingCampaign?.title || 'this campaign'}. 
                        Booking fields will be available for email template mapping.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search by slug or email..."
                              value={bookingSearchQuery}
                              onChange={(e) => setBookingSearchQuery(e.target.value)}
                              className="pl-9"
                            />
                          </div>
                        </div>
                        <Select value={bookingTypeFilter} onValueChange={setBookingTypeFilter}>
                          <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="All Types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="vendor">Vendor</SelectItem>
                            <SelectItem value="membership">Membership</SelectItem>
                            <SelectItem value="class">Class</SelectItem>
                            <SelectItem value="event">Event</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Select Booking</Label>
                        {loadingAvailableBookings ? (
                          <div className="space-y-2">
                            {[...Array(5)].map((_, i) => (
                              <div key={i} className="h-14 bg-muted rounded animate-pulse" />
                            ))}
                          </div>
                        ) : (
                          <ScrollArea className="h-[300px] border rounded-md">
                            <div className="p-2 space-y-1">
                              {availableBookingsForLinking.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                  <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                  <p className="text-sm">No bookings found matching your filters</p>
                                </div>
                              ) : (
                                availableBookingsForLinking.map((booking) => (
                                  <div
                                    key={booking.id}
                                    className={cn(
                                      "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                                      selectedBookingToLink === booking.id.toString()
                                        ? "bg-primary/10 border border-primary"
                                        : "hover:bg-muted border border-transparent"
                                    )}
                                    onClick={() => setSelectedBookingToLink(booking.id.toString())}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium truncate">
                                          {booking._items?.title || booking.booking_slug}
                                        </span>
                                        <Badge variant="outline" className="text-xs shrink-0">
                                          {booking.status}
                                        </Badge>
                                        <Badge variant="secondary" className="text-xs shrink-0">
                                          {booking.booking_type}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded truncate">
                                          {booking.booking_slug}
                                        </span>
                                        {booking._leads?.email && (
                                          <span className="truncate">{booking._leads.email}</span>
                                        )}
                                      </div>
                                    </div>
                                    {selectedBookingToLink === booking.id.toString() && (
                                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                                        <CheckSquare className="h-3 w-3 text-primary-foreground" />
                                      </div>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          </ScrollArea>
                        )}
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            Showing {availableBookingsForLinking.length} of {bookingLinkTotalItems} bookings
                          </p>
                          {bookingLinkPage < bookingLinkTotalPages && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleLoadMoreBookings}
                              disabled={loadingMoreBookings}
                            >
                              {loadingMoreBookings ? 'Loading...' : 'Load More'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setAddBookingDialogOpen(false);
                          setSelectedBookingToLink("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          const campaignId = selectedCampaignForLeads?.id || editingCampaign?.id;
                          if (campaignId) {
                            handleLinkBooking(campaignId);
                          }
                        }}
                        disabled={!selectedBookingToLink || linkingBooking}
                      >
                        {linkingBooking ? 'Linking...' : 'Link Booking'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Delete Campaign Confirmation Dialog */}
                <AlertDialog open={deleteCampaignDialogOpen} onOpenChange={setDeleteCampaignDialogOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the campaign "{campaignToDelete?.title}". 
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteCampaignConfirm}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Delete Campaign Lead Confirmation Dialog */}
                <AlertDialog open={deleteCampaignLeadDialogOpen} onOpenChange={setDeleteCampaignLeadDialogOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Campaign Lead?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove the lead "{campaignLeadToDelete?._leads?.lead_payload?.first_name} {campaignLeadToDelete?._leads?.lead_payload?.last_name}" from this campaign.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteCampaignLeadConfirm}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Quick Send Email Dialog */}
                <Dialog open={quickSendEmailDialogOpen} onOpenChange={(open) => {
                  setQuickSendEmailDialogOpen(open);
                  if (!open) {
                    setQuickSendResults(null);
                    setQuickSendProgress(null);
                  }
                }}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Send className="h-5 w-5" />
                        Send Email to Campaign Leads
                      </DialogTitle>
                      <DialogDescription>
                        {(() => {
                          const filteredLeads = campaignLeads.filter((cl) => {
                            const matchesSearch = campaignLeadSearchQuery === "" || 
                              cl._customers?.Full_name?.toLowerCase().includes(campaignLeadSearchQuery.toLowerCase()) ||
                              cl._customers?.email?.toLowerCase().includes(campaignLeadSearchQuery.toLowerCase());
                            const matchesStatus = campaignLeadStatusFilter === "all" || cl.status === campaignLeadStatusFilter;
                            return matchesSearch && matchesStatus;
                          });
                          const selectedCount = selectedCampaignLeadIds.size;
                          
                          if (selectedCount > 0) {
                            return `Send emails to ${selectedCount} selected lead${selectedCount !== 1 ? 's' : ''} using the configured template`;
                          }
                          return `Send emails to all ${filteredLeads.length} filtered lead${filteredLeads.length !== 1 ? 's' : ''} using the configured template`;
                        })()}
                      </DialogDescription>
                    </DialogHeader>

                    {quickSendProgress ? (
                      <div className="space-y-4 py-4">
                        <div className="text-center">
                          <p className="text-sm font-medium mb-2">
                            Sending {quickSendProgress.current} of {quickSendProgress.total}
                          </p>
                          <p className="text-xs text-muted-foreground mb-4">
                            {quickSendProgress.currentEmail}
                          </p>
                          <div className="w-full bg-muted rounded-full h-2 mb-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all" 
                              style={{ width: `${(quickSendProgress.current / quickSendProgress.total) * 100}%` }}
                            />
                          </div>
                          {quickSendProgress.delayRemaining > 0 && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Next email in {Math.floor(quickSendProgress.delayRemaining / 60)}:{String(quickSendProgress.delayRemaining % 60).padStart(2, '0')}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : quickSendResults ? (
                      <div className="space-y-4 py-4">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-4 mb-4">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-green-600">{quickSendResults.success}</p>
                              <p className="text-xs text-muted-foreground">Sent</p>
                            </div>
                            {quickSendResults.failed > 0 && (
                              <div className="text-center">
                                <p className="text-2xl font-bold text-destructive">{quickSendResults.failed}</p>
                                <p className="text-xs text-muted-foreground">Failed</p>
                              </div>
                            )}
                          </div>
                          <Button onClick={() => {
                            setQuickSendEmailDialogOpen(false);
                            setQuickSendResults(null);
                          }}>
                            Done
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Email Template</Label>
                          <Select 
                            value={quickSendSelectedTemplate?.Alias || ""} 
                            onValueChange={(value) => {
                              const template = quickSendTemplates.find(t => t.Alias === value);
                              setQuickSendSelectedTemplate(template || null);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a template" />
                            </SelectTrigger>
                            <SelectContent>
                              {quickSendTemplates.map((template) => (
                                <SelectItem key={template.TemplateId} value={template.Alias}>
                                  {template.Name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {quickSendTemplates.length === 0 && (
                            <p className="text-xs text-muted-foreground">Loading templates...</p>
                          )}
                        </div>

                        {selectedCampaignForLeads?.item_info?.email_template_alias && (
                          <Alert>
                            <Mail className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              Using template configuration from campaign. Go to "Configure Email" to change field mappings.
                            </AlertDescription>
                          </Alert>
                        )}

                        {!selectedCampaignForLeads?.item_info?.email_template_mappings && (
                          <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>No Field Mappings</AlertTitle>
                            <AlertDescription className="text-xs">
                              Please configure email field mappings first using the "Configure Email" button.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}

                    {!quickSendProgress && !quickSendResults && (
                      <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setQuickSendEmailDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => {
                            const filteredLeads = campaignLeads.filter((cl) => {
                              const matchesSearch = campaignLeadSearchQuery === "" || 
                                cl._customers?.Full_name?.toLowerCase().includes(campaignLeadSearchQuery.toLowerCase()) ||
                                cl._customers?.email?.toLowerCase().includes(campaignLeadSearchQuery.toLowerCase());
                              const matchesStatus = campaignLeadStatusFilter === "all" || cl.status === campaignLeadStatusFilter;
                              return matchesSearch && matchesStatus;
                            });
                            
                            // Use selected leads if any, otherwise use all filtered leads
                            const leadsToSend = selectedCampaignLeadIds.size > 0
                              ? filteredLeads.filter(l => selectedCampaignLeadIds.has(l.id))
                              : filteredLeads;
                            
                            handleQuickSendEmail(leadsToSend);
                          }}
                          disabled={!quickSendSelectedTemplate || !selectedCampaignForLeads?.item_info?.email_template_mappings || quickSendLoading}
                        >
                          {quickSendLoading ? 'Sending...' : `Send to ${selectedCampaignLeadIds.size > 0 ? selectedCampaignLeadIds.size + ' Selected' : 'All'}`}
                        </Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </TabsContent>

              <TabsContent value="raffles" className="space-y-4">
                {showRaffleEntriesView && selectedRaffleForEntries ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 mb-6">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowRaffleEntriesView(false);
                          setSelectedRaffleForEntries(null);
                          setRaffleEntries([]);
                          setRaffleWinners([]);
                          setRaffleEntriesActiveTab('participants');
                        }}
                      >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Back to Raffles
                      </Button>
                      <h2 className="text-2xl font-bold">
                        {selectedRaffleForEntries.title}
                      </h2>
                      <div className="ml-auto flex items-center gap-3">
                        <Badge variant="secondary">
                          {raffleEntriesTotalItems} {raffleEntriesTotalItems === 1 ? 'Entry' : 'Entries'}
                        </Badge>
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                          <Crown className="h-3 w-3 mr-1" />
                          {raffleWinners.length} Winner{raffleWinners.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <Tabs value={raffleEntriesActiveTab} onValueChange={(v) => setRaffleEntriesActiveTab(v as 'participants' | 'winners')} className="w-auto">
                        <TabsList>
                          <TabsTrigger value="participants" className="gap-2">
                            <Users className="h-4 w-4" />
                            Participants
                          </TabsTrigger>
                          <TabsTrigger value="winners" className="gap-2">
                            <Crown className="h-4 w-4" />
                            Winners ({raffleWinners.length})
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                      
                      <Button 
                        onClick={handlePickWinner}
                        disabled={pickingWinner || raffleEntries.length === 0}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                      >
                        {pickingWinner ? (
                          <>
                            <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                            Picking...
                          </>
                        ) : (
                          <>
                            <Gift className="h-4 w-4 mr-2" />
                            Pick a Winner
                          </>
                        )}
                      </Button>
                    </div>
                    {raffleEntriesActiveTab === 'participants' && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Raffle Participants
                        </CardTitle>
                        <CardDescription>
                          All entries for this raffle. Each row represents one ticket entry.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {loadingRaffleEntries ? (
                          <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Skeleton key={i} className="h-16 w-full" />
                            ))}
                          </div>
                        ) : raffleEntries.length === 0 ? (
                          <div className="text-center py-12">
                            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No entries yet</h3>
                            <p className="text-muted-foreground">
                              No one has entered this raffle yet.
                            </p>
                          </div>
                        ) : (
                          <>
                            {/* Aggregate entries by email */}
                            {(() => {
                              const aggregated = raffleEntries.reduce((acc, entry) => {
                                const key = entry.email;
                                if (!acc[key]) {
                                  acc[key] = {
                                    email: entry.email,
                                    full_name: entry.full_name,
                                    mobile_number: entry.mobile_number,
                                    count: 0,
                                    entries: [],
                                    is_winner: false
                                  };
                                }
                                acc[key].count += 1;
                                acc[key].entries.push(entry);
                                if (entry.is_winner) acc[key].is_winner = true;
                                return acc;
                              }, {} as Record<string, { email: string; full_name: string; mobile_number?: string; count: number; entries: RaffleEntry[]; is_winner: boolean }>);

                              const participants = Object.values(aggregated).sort((a, b) => b.count - a.count);

                              return (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between text-sm text-muted-foreground pb-2 border-b">
                                    <span>{participants.length} unique participant{participants.length !== 1 ? 's' : ''}</span>
                                    <span>{raffleEntriesTotalItems} total ticket{raffleEntriesTotalItems !== 1 ? 's' : ''}</span>
                                  </div>
                                  {participants.map((participant, index) => (
                                    <Card key={participant.email} className={cn(
                                      "hover:shadow-sm transition-shadow",
                                      participant.is_winner && "ring-2 ring-amber-500 bg-gradient-to-r from-amber-500/10 to-orange-500/5"
                                    )}>
                                      <CardContent className="py-4">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-4">
                                            <div className={cn(
                                              "flex items-center justify-center w-10 h-10 rounded-full font-semibold",
                                              participant.is_winner 
                                                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white" 
                                                : "bg-primary/10 text-primary"
                                            )}>
                                              {participant.is_winner ? <Crown className="h-5 w-5" /> : index + 1}
                                            </div>
                                            <div>
                                              <div className="flex items-center gap-2">
                                                <p className="font-medium text-foreground">{participant.full_name}</p>
                                                {participant.is_winner && (
                                                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1">
                                                    <Crown className="h-3 w-3" />
                                                    Winner
                                                  </Badge>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                  <Mail className="h-3 w-3" />
                                                  {participant.email}
                                                </span>
                                                {participant.mobile_number && (
                                                  <span className="flex items-center gap-1">
                                                    <Phone className="h-3 w-3" />
                                                    {participant.mobile_number}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <Badge variant="secondary" className="text-lg px-3 py-1">
                                              {participant.count} {participant.count === 1 ? 'ticket' : 'tickets'}
                                            </Badge>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              );
                            })()}

                            {raffleEntriesTotalPages > 1 && (
                              <div className="flex items-center justify-center gap-4 mt-6">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    const newPage = Math.max(1, raffleEntriesPage - 1);
                                    setRaffleEntriesPage(newPage);
                                    fetchRaffleEntries(selectedRaffleForEntries.id, newPage);
                                  }}
                                  disabled={raffleEntriesPage === 1}
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div className="text-sm text-muted-foreground">
                                  Page {raffleEntriesPage} of {raffleEntriesTotalPages}
                                </div>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    const newPage = Math.min(raffleEntriesTotalPages, raffleEntriesPage + 1);
                                    setRaffleEntriesPage(newPage);
                                    fetchRaffleEntries(selectedRaffleForEntries.id, newPage);
                                  }}
                                  disabled={raffleEntriesPage === raffleEntriesTotalPages}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                    )}
                  </div>
                ) : showRaffleEditView ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 mb-6">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowRaffleEditView(false);
                          setEditingRaffle(null);
                        }}
                      >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Back to Raffles
                      </Button>
                      <h2 className="text-2xl font-bold">
                        {editingRaffle ? `Edit: ${editingRaffle.title}` : 'Create New Raffle'}
                      </h2>
                    </div>
                    <Card>
                      <CardContent className="pt-6">
                        <RaffleForm raffle={editingRaffle} onSuccess={handleRaffleSaved} />
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h2 className="text-2xl font-bold">Raffles</h2>
                        <p className="text-muted-foreground">Create and manage raffles and giveaways</p>
                      </div>
                      <Button onClick={() => {
                        setEditingRaffle(null);
                        setShowRaffleEditView(true);
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Raffle
                      </Button>
                    </div>

                    {loadingRaffles ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                          <Card key={i} className="animate-pulse">
                            <div className="h-48 bg-muted rounded-t-lg" />
                            <CardHeader>
                              <div className="h-6 bg-muted rounded" />
                              <div className="h-4 bg-muted rounded w-2/3" />
                            </CardHeader>
                          </Card>
                        ))}
                      </div>
                    ) : raffles.length === 0 ? (
                      <Card className="text-center py-12">
                        <CardContent>
                          <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No raffles yet</h3>
                          <p className="text-muted-foreground mb-4">
                            Create your first raffle to start collecting entries
                          </p>
                          <Button onClick={() => {
                            setEditingRaffle(null);
                            setShowRaffleEditView(true);
                          }}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Raffle
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {raffles.map((raffle) => {
                            const endDate = raffle.item_info?.['end-date'];
                            const isEnded = endDate ? new Date() > new Date(endDate) : false;
                            const ticketPrice = raffle.item_info?.ticket_price || raffle.price || 0;
                            
                            return (
                              <Card key={raffle.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                <CardHeader>
                                  <div className="flex items-start justify-between">
                                    <CardTitle className="text-xl">{raffle.title}</CardTitle>
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          setEditingRaffle(raffle);
                                          setShowRaffleEditView(true);
                                        }}
                                        title="Edit Raffle"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleCopyRaffle(raffle)}
                                        title="Duplicate Raffle"
                                      >
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleAddRaffleToCampaign(raffle)}
                                        title="Start a new campaign"
                                      >
                                        <Target className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteRaffleClick(raffle)}
                                        title="Delete Raffle"
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </div>
                                  <CardDescription className="line-clamp-2">
                                    {raffle.description || 'No description'}
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  {/* End Date */}
                                  {endDate && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Clock className="h-4 w-4 text-muted-foreground" />
                                      <span>
                                        {isEnded ? 'Ended: ' : 'Ends: '}
                                        {format(new Date(endDate), 'PPP')}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {/* Ticket Price */}
                                  <div className="flex items-center gap-2 text-sm">
                                    <Ticket className="h-4 w-4 text-muted-foreground" />
                                    <span>
                                      Ticket Price: {ticketPrice > 0 ? `$${ticketPrice.toFixed(2)}` : 'Free'}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <Badge variant={raffle.Is_disabled ? "destructive" : "default"}>
                                      {raffle.Is_disabled ? 'Disabled' : 'Active'}
                                    </Badge>
                                    {isEnded && (
                                      <Badge variant="secondary">
                                        Ended
                                      </Badge>
                                    )}
                                  </div>
                                </CardContent>
                                <CardFooter className="pt-0">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => {
                                      setSelectedRaffleForEntries(raffle);
                                      setShowRaffleEntriesView(true);
                                      fetchRaffleEntries(raffle.id);
                                    }}
                                  >
                                    <Users className="h-4 w-4 mr-2" />
                                    View Entries
                                  </Button>
                                </CardFooter>
                              </Card>
                            );
                          })}
                        </div>

                        {rafflesTotalPages > 1 && (
                          <div className="flex items-center justify-center gap-4 mt-8">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setRafflesPage(p => Math.max(1, p - 1))}
                              disabled={rafflesPage === 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="text-sm text-muted-foreground">
                              Page {rafflesPage} of {rafflesTotalPages} ({rafflesTotalItems} total)
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setRafflesPage(p => Math.min(rafflesTotalPages, p + 1))}
                              disabled={rafflesPage === rafflesTotalPages}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}

                    {/* Delete Confirmation Dialog */}
                    <AlertDialog open={deleteRaffleDialogOpen} onOpenChange={setDeleteRaffleDialogOpen}>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the raffle "{raffleToDelete?.title}". 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteRaffleConfirm}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </TabsContent>

              {/* Communications Tab */}
              <TabsContent value="communications" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>All Communications</CardTitle>
                    <CardDescription>View all system communications and interactions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingAllCommunications ? (
                      <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Skeleton key={i} className="h-24 w-full" />
                        ))}
                      </div>
                    ) : allCommunications?.length > 0 ? (
                      <>
                        <div className="space-y-3">
                          {allCommunications.map((comm) => {
                            const typeStyle = getCommunicationTypeStyle(comm.communication_type);
                            const IconComponent = typeStyle.icon;
                            const isExpanded = expandedAllComms.has(comm.id);
                            
                            return (
                              <Card key={comm.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="pt-4">
                                  <div className="flex items-start gap-4">
                                    <div className="mt-1">
                                      <IconComponent className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 space-y-3">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <Badge className={typeStyle.className}>
                                            {typeStyle.label}
                                          </Badge>
                                          {comm.message_id && (
                                            <Badge variant="outline" className="text-xs font-mono">
                                              {comm.message_id}
                                            </Badge>
                                          )}
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setExpandedAllComms(prev => {
                                              const newSet = new Set(prev);
                                              if (newSet.has(comm.id)) {
                                                newSet.delete(comm.id);
                                              } else {
                                                newSet.add(comm.id);
                                              }
                                              return newSet;
                                            });
                                          }}
                                        >
                                          {isExpanded ? (
                                            <ChevronUp className="h-4 w-4" />
                                          ) : (
                                            <ChevronDown className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                          <Clock className="h-3 w-3" />
                                          <span className="font-medium">Created:</span>
                                          <span>{new Date(comm.created_at).toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                          <UserPlus className="h-3 w-3" />
                                          <span className="font-medium">Lead ID:</span>
                                          <span>{comm.leads_id}</span>
                                        </div>
                                      </div>
                                      {isExpanded && comm.message_info && (
                                        <div className="text-xs bg-muted/50 p-3 rounded-md border">
                                          <div className="font-medium mb-2">Message Details:</div>
                                          <pre className="overflow-auto text-muted-foreground max-h-40">
                                            {JSON.stringify(comm.message_info, null, 2)}
                                          </pre>
                                        </div>
                                      )}
                                      {isExpanded && comm.integration_response && Object.keys(comm.integration_response).length > 0 && (
                                        <div className="text-xs bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                                          <div className="font-medium mb-2 text-blue-700 dark:text-blue-300">Integration Response:</div>
                                          <pre className="overflow-auto text-blue-600 dark:text-blue-400 max-h-40">
                                            {JSON.stringify(comm.integration_response, null, 2)}
                                          </pre>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                        
                        {allCommunicationsTotalPages > 1 && (
                          <div className="flex items-center justify-between mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAllCommunicationsPage(p => Math.max(1, p - 1))}
                              disabled={allCommunicationsPage === 1}
                            >
                              <ChevronLeft className="h-4 w-4 mr-2" />
                              Previous
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              Page {allCommunicationsPage} of {allCommunicationsTotalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAllCommunicationsPage(p => Math.min(allCommunicationsTotalPages, p + 1))}
                              disabled={allCommunicationsPage === allCommunicationsTotalPages}
                            >
                              Next
                              <ChevronRight className="h-4 w-4 ml-2" />
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground text-center py-8">
                        No communications recorded yet.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Newsletter Tab */}
              <TabsContent value="newsletter" className="space-y-4">
                {showNewsletterEditView ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Button variant="ghost" size="icon" onClick={() => { setShowNewsletterEditView(false); setEditingNewsletter(null); }}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div>
                        <h2 className="text-2xl font-bold">{editingNewsletter ? 'Edit Newsletter' : 'Create Newsletter'}</h2>
                        <p className="text-muted-foreground">Build your newsletter layout</p>
                      </div>
                    </div>
                    <NewsletterForm
                      newsletter={editingNewsletter}
                      onSuccess={() => {
                        setShowNewsletterEditView(false);
                        setEditingNewsletter(null);
                        fetchNewsletters(newslettersPage);
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Manage Newsletters</CardTitle>
                            <CardDescription>Create and manage club newsletters</CardDescription>
                          </div>
                          <AuthGatedButton onClick={() => { setEditingNewsletter(null); setShowNewsletterEditView(true); }}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Newsletter
                          </AuthGatedButton>
                        </div>
                      </CardHeader>
                    </Card>

                    {loadingNewsletters ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                          <Skeleton key={i} className="h-48 rounded-lg" />
                        ))}
                      </div>
                    ) : newsletters.length === 0 ? (
                      <Card>
                        <CardContent className="py-12 text-center">
                          <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">No newsletters created yet</p>
                          <p className="text-sm text-muted-foreground mt-1">Click "Create Newsletter" to get started</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {newsletters.map((newsletter) => {
                            const coverImage = newsletter.item_info?.coverImageUrl || newsletter.item_info?.image?.[0];
                            const blogCount = newsletter.item_info?.selectedBlogs?.length || 0;
                            
                            return (
                              <Card key={newsletter.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                                {/* Newsletter Preview Image */}
                                <div className="relative h-40 bg-gradient-to-br from-primary/20 to-primary/5">
                                  {coverImage ? (
                                    <img 
                                      src={coverImage} 
                                      alt={newsletter.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Mail className="h-12 w-12 text-primary/30" />
                                    </div>
                                  )}
                                  {/* Status Badge Overlay */}
                                  <Badge 
                                    variant={newsletter.Is_disabled ? "secondary" : "default"}
                                    className="absolute top-2 right-2"
                                  >
                                    {newsletter.Is_disabled ? "Draft" : "Published"}
                                  </Badge>
                                  {/* Issue Date Overlay */}
                                  {(newsletter.item_info?.issueMonth || newsletter.item_info?.issueYear) && (
                                    <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium">
                                      {newsletter.item_info?.issueMonth} {newsletter.item_info?.issueYear}
                                    </div>
                                  )}
                                </div>
                                
                                <CardHeader className="pb-2 pt-3">
                                  <div className="space-y-1">
                                    <CardTitle className="text-lg line-clamp-1">{newsletter.title}</CardTitle>
                                    {blogCount > 0 && (
                                      <CardDescription className="flex items-center gap-1">
                                        <FileText className="h-3 w-3" />
                                        {blogCount} {blogCount === 1 ? 'article' : 'articles'}
                                      </CardDescription>
                                    )}
                                  </div>
                                </CardHeader>
                                <CardContent className="pb-2">
                                  <p className="text-sm text-muted-foreground line-clamp-2">{newsletter.description}</p>
                                </CardContent>
                                <CardFooter className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => { setEditingNewsletter(newsletter); setShowNewsletterEditView(true); }}>
                                    <Edit className="h-3 w-3 mr-1" />
                                    Edit
                                  </Button>
                                  <Button size="sm" variant="outline" asChild>
                                    <Link to={`/newsletter/${newsletter.slug}`} target="_blank">
                                      <Eye className="h-3 w-3 mr-1" />
                                      Preview
                                    </Link>
                                  </Button>
                                  <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={() => { setNewsletterToDelete(newsletter); setDeleteNewsletterDialogOpen(true); }}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </CardFooter>
                              </Card>
                            );
                          })}
                        </div>

                        {newslettersTotalPages > 1 && (
                          <div className="flex items-center justify-center gap-4 mt-8">
                            <Button variant="outline" size="icon" onClick={() => setNewslettersPage(p => Math.max(1, p - 1))} disabled={newslettersPage === 1}>
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm text-muted-foreground">Page {newslettersPage} of {newslettersTotalPages}</span>
                            <Button variant="outline" size="icon" onClick={() => setNewslettersPage(p => Math.min(newslettersTotalPages, p + 1))} disabled={newslettersPage === newslettersTotalPages}>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}

                    <AlertDialog open={deleteNewsletterDialogOpen} onOpenChange={setDeleteNewsletterDialogOpen}>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Newsletter</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{newsletterToDelete?.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground"
                            onClick={async () => {
                              if (newsletterToDelete && user?.id) {
                                try {
                                  await adminAPI.deleteItem(newsletterToDelete.id, user.id);
                                  toast({ title: "Success", description: "Newsletter deleted" });
                                  fetchNewsletters(newslettersPage);
                                } catch (error) {
                                  toast({ title: "Error", description: "Failed to delete newsletter", variant: "destructive" });
                                }
                              }
                              setDeleteNewsletterDialogOpen(false);
                              setNewsletterToDelete(null);
                            }}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </TabsContent>

              {/* Blogs Tab */}
              <TabsContent value="blogs" className="space-y-4">
                {showBlogEditView ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Button variant="ghost" size="icon" onClick={() => { setShowBlogEditView(false); setEditingBlog(null); }}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div>
                        <h2 className="text-2xl font-bold">{editingBlog ? 'Edit Blog' : 'Create Blog'}</h2>
                        <p className="text-muted-foreground">Write and publish your blog post</p>
                      </div>
                    </div>
                    <BlogForm
                      blog={editingBlog}
                      onSuccess={() => {
                        setShowBlogEditView(false);
                        setEditingBlog(null);
                        fetchBlogs(blogsPage);
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Manage Blogs</CardTitle>
                            <CardDescription>Write and publish blog posts</CardDescription>
                          </div>
                          <AuthGatedButton onClick={() => { setEditingBlog(null); setShowBlogEditView(true); }}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Blog
                          </AuthGatedButton>
                        </div>
                      </CardHeader>
                    </Card>

                    {loadingBlogs ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                          <Skeleton key={i} className="h-48 rounded-lg" />
                        ))}
                      </div>
                    ) : blogs.length === 0 ? (
                      <Card>
                        <CardContent className="py-12 text-center">
                          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">No blogs created yet</p>
                          <p className="text-sm text-muted-foreground mt-1">Click "Create Blog" to get started</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {blogs.map((blog) => (
                            <Card key={blog.id} className="hover:shadow-lg transition-shadow">
                              <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                  <div className="space-y-1">
                                    <CardTitle className="text-lg line-clamp-1">{blog.title}</CardTitle>
                                    <CardDescription className="text-xs">
                                      {blog.item_info?.authorName && <span>By {blog.item_info.authorName}</span>}
                                      {blog.item_info?.category && <Badge variant="outline" className="ml-2 text-xs">{blog.item_info.category}</Badge>}
                                    </CardDescription>
                                  </div>
                                  <Badge variant={blog.Is_disabled ? "secondary" : "default"}>
                                    {blog.Is_disabled ? "Draft" : "Published"}
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="pb-2">
                                {blog.item_info?.image?.[0] && (
                                  <img 
                                    src={blog.item_info.image[0]} 
                                    alt={blog.title}
                                    className="w-full h-32 object-cover rounded-md mb-2"
                                  />
                                )}
                                <p className="text-sm text-muted-foreground line-clamp-2">{blog.description}</p>
                              </CardContent>
                              <CardFooter className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={async () => {
                                  if (user?.id) {
                                    const details = await adminAPI.getItemById(blog.id, user.id);
                                    setEditingBlog(details);
                                    setShowBlogEditView(true);
                                  }
                                }}>
                                  <Edit className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                                <Button size="sm" variant="outline" asChild>
                                  <Link to={`/blog/${blog.slug}`} target="_blank">
                                    <Eye className="h-3 w-3 mr-1" />
                                    Preview
                                  </Link>
                                </Button>
                                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { setBlogToDelete(blog); setDeleteBlogDialogOpen(true); }}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </CardFooter>
                            </Card>
                          ))}
                        </div>

                        {blogsTotalPages > 1 && (
                          <div className="flex items-center justify-center gap-4 mt-8">
                            <Button variant="outline" size="icon" onClick={() => setBlogsPage(p => Math.max(1, p - 1))} disabled={blogsPage === 1}>
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm text-muted-foreground">Page {blogsPage} of {blogsTotalPages}</span>
                            <Button variant="outline" size="icon" onClick={() => setBlogsPage(p => Math.min(blogsTotalPages, p + 1))} disabled={blogsPage === blogsTotalPages}>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}

                    <AlertDialog open={deleteBlogDialogOpen} onOpenChange={setDeleteBlogDialogOpen}>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Blog</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{blogToDelete?.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground"
                            onClick={async () => {
                              if (blogToDelete && user?.id) {
                                try {
                                  await adminAPI.deleteItem(blogToDelete.id, user.id);
                                  toast({ title: "Success", description: "Blog deleted" });
                                  fetchBlogs(blogsPage);
                                } catch (error) {
                                  toast({ title: "Error", description: "Failed to delete blog", variant: "destructive" });
                                }
                              }
                              setDeleteBlogDialogOpen(false);
                              setBlogToDelete(null);
                            }}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-6">
                <Tabs defaultValue="shop" className="w-full">
                  <TabsList className="mb-4 flex-wrap h-auto gap-1">
                    <TabsTrigger value="shop">Shop Settings</TabsTrigger>
                    <TabsTrigger value="roles">Role Permissions</TabsTrigger>
                    {hasAdminModuleAccess(userRole, ADMIN_MODULES.ADMIN_STATUS_MANAGER) && (
                      <TabsTrigger value="statuses">Status Manager</TabsTrigger>
                    )}
                  </TabsList>
                  
                  <TabsContent value="shop">
                    <ShopSettingsForm />
                  </TabsContent>
                  
                  <TabsContent value="roles">
                    <RoleModuleManager />
                  </TabsContent>
                  
                  {hasAdminModuleAccess(userRole, ADMIN_MODULES.ADMIN_STATUS_MANAGER) && (
                    <TabsContent value="statuses">
                      <StatusConfigurationManager />
                    </TabsContent>
                  )}
                </Tabs>
              </TabsContent>

              {/* Automations Tab */}
              <TabsContent value="automations" className="mt-0">
                <Tabs defaultValue="builder" className="w-full">
                  <TabsList className="mb-2 h-9">
                    <TabsTrigger value="builder" className="text-xs sm:text-sm gap-1.5">
                      <Zap className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Workflow</span> Builder
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="text-xs sm:text-sm gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Execution</span> Logs
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="builder" className="mt-0">
                    <AutomationBuilder />
                  </TabsContent>
                  <TabsContent value="logs" className="mt-0">
                    <WorkflowLogsViewer clerkUserId={user?.id || ""} />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              {/* Images Tab */}
              <TabsContent value="images" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Manage Images</CardTitle>
                    <CardDescription>Upload and manage site images and videos</CardDescription>
                  </CardHeader>
                  <CardContent>
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                   <div className="flex items-center gap-3">
                     <p className="text-sm text-muted-foreground">Filter by type:</p>
                     <Select value={mediaTypeFilter} onValueChange={(value) => { setMediaTypeFilter(value); setMediaPage(1); }}>
                       <SelectTrigger className="w-[140px]">
                         <SelectValue placeholder="All Types" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="all">All Types</SelectItem>
                         <SelectItem value="Image">Images</SelectItem>
                         <SelectItem value="Video">Videos</SelectItem>
                         <SelectItem value="YouTube">YouTube</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                   <ImageUploadDialog
                     onImageUploaded={handleMediaUploaded}
                     title="Upload Media"
                     description="Upload images, videos, or add YouTube/external URLs"
                     buttonText="Upload File"
                     showTypeSelector={true}
                   />
                 </div>
                {(() => {
                  const filteredMediaItems = mediaTypeFilter === "all" 
                    ? mediaItems 
                    : mediaItems.filter(item => item.image_type === mediaTypeFilter);
                  
                  const allSelected = filteredMediaItems.length > 0 && selectedMediaIds.size === filteredMediaItems.length;
                  const someSelected = selectedMediaIds.size > 0;
                  
                  return (
                    <>
                      {/* Bulk action bar */}
                      <div className="flex items-center justify-between mb-4 p-2 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={() => handleSelectAllMedia(filteredMediaItems)}
                            disabled={filteredMediaItems.length === 0}
                          />
                          <span className="text-sm text-muted-foreground">
                            {someSelected ? `${selectedMediaIds.size} selected` : 'Select all'}
                          </span>
                        </div>
                        {someSelected && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setBulkDeleteMediaDialogOpen(true)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Selected ({selectedMediaIds.size})
                          </Button>
                        )}
                      </div>
                      
                      {isLoadingMedia ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                          {[...Array(10)].map((_, i) => (
                            <Skeleton key={i} className="aspect-square rounded-lg" />
                          ))}
                        </div>
                      ) : filteredMediaItems.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                          {filteredMediaItems.map((item) => (
                            <MediaTile 
                              key={item.id} 
                              item={item} 
                              onClick={() => handleMediaClick(item)}
                              showDelete={true}
                              onDelete={(e) => handleMediaDeleteClick(e, item)}
                              selectable={true}
                              selected={selectedMediaIds.has(item.id)}
                              onSelectChange={(checked) => handleMediaSelectChange(item.id, checked)}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="border rounded-lg p-8 text-center text-muted-foreground">
                          <Image className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>{mediaTypeFilter !== "all" ? `No ${mediaTypeFilter.toLowerCase()} files found` : "No media files uploaded yet"}</p>
                          <p className="text-sm mt-1">{isSignedIn ? 'Click "Upload File" to add images or videos' : 'Sign in to upload media files'}</p>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Media Pagination */}
                {mediaTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMediaPage(p => Math.max(1, p - 1))}
                      disabled={mediaPage <= 1 || isLoadingMedia}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground px-4">
                      Page {mediaPage} of {mediaTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMediaPage(p => Math.min(mediaTotalPages, p + 1))}
                      disabled={mediaPage >= mediaTotalPages || isLoadingMedia}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}

                <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Edit Media File</DialogTitle>
                      <DialogDescription>
                        Update information for this media file and preview the schema.org JSON
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Form Section */}
                      <form onSubmit={editForm.handleSubmit(handleUpdateMedia)} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="title">Title</Label>
                          <Input
                            id="title"
                            {...editForm.register("title")}
                            placeholder="Enter title"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            {...editForm.register("description")}
                            placeholder="Enter description"
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tags">Tags</Label>
                          <Input
                            id="tags"
                            {...editForm.register("tags")}
                            placeholder="Enter tags (comma separated)"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit">
                            Update
                          </Button>
                        </div>
                      </form>

                      {/* JSON Preview Section */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Code className="h-4 w-4 text-muted-foreground" />
                          <Label className="text-sm font-medium">Schema.org JSON Preview</Label>
                        </div>
                        <div className="bg-muted rounded-lg p-4 overflow-auto max-h-[500px]">
                          <pre className="text-xs font-mono">
                            {selectedMedia && JSON.stringify({
                              mediafiles_id: selectedMedia.id,
                              seq: 2,
                              media_info: {
                                "@context": "https://schema.org",
                                "@type": "ImageObject",
                                "contentUrl": selectedMedia.image_type === 'Video' ? selectedMedia.video?.url : selectedMedia.image?.url,
                                "thumbnailUrl": selectedMedia.image_type === 'Video' ? selectedMedia.video?.url : selectedMedia.image?.url,
                                "name": editForm.watch("title") || selectedMedia.image?.name || selectedMedia.video?.name || "",
                                "description": editForm.watch("description") || "",
                                "uploadDate": new Date(selectedMedia.created_at).toISOString().split('T')[0],
                                "author": {
                                  "@type": "Person",
                                  "name": customer?.Full_name || user?.firstName || "Unknown"
                                },
                                "license": `${customer?._shops.custom_domain || customer?._shops.name}/licenses/${customer?.Full_name || user?.firstName}`,
                                "keywords": editForm.watch("tags") || ""
                              },
                              media_attributes: {
                                tags: editForm.watch("tags") || ""
                              },
                              modified_by_id: selectedMedia.id
                            }, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                  </Dialog>

                {/* Delete Media Confirmation Dialog */}
                <AlertDialog open={deleteMediaDialogOpen} onOpenChange={setDeleteMediaDialogOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Media</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this media file? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={deletingMedia} onClick={() => setMediaToDelete(null)}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleMediaDeleteConfirm}
                        disabled={deletingMedia}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deletingMedia ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Bulk Delete Media Confirmation Dialog */}
                <AlertDialog open={bulkDeleteMediaDialogOpen} onOpenChange={setBulkDeleteMediaDialogOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {selectedMediaIds.size} Media Files</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedMediaIds.size} media file(s)? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={bulkDeletingMedia}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleBulkDeleteMediaConfirm}
                        disabled={bulkDeletingMedia}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {bulkDeletingMedia ? "Deleting..." : `Delete ${selectedMediaIds.size} Files`}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>

          {/* Assign Lead Dialog - Moved outside Tabs to be accessible from any tab */}
          <Dialog open={assignLeadDialogOpen} onOpenChange={setAssignLeadDialogOpen}>
            <DialogContent className="max-w-md z-[100]">
              <DialogHeader>
                <DialogTitle>Assign Lead to Campaign</DialogTitle>
                <DialogDescription>
                  {selectedLeadForAssign && !selectedCampaignForLeads 
                    ? `Select a campaign for ${selectedLeadForAssign.email}`
                    : selectedCampaignForLeads 
                      ? `Select a lead to assign to ${selectedCampaignForLeads.title}`
                      : 'Select a campaign and lead to assign'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {!selectedCampaignForLeads && (
                  <div className="space-y-2">
                    <Label>Campaign</Label>
                    <Select 
                      value={selectedCampaignForAssign?.id?.toString() || ""} 
                      onValueChange={(value) => {
                        const campaign = campaigns.find(c => c.id.toString() === value);
                        setSelectedCampaignForAssign(campaign || null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a campaign" />
                      </SelectTrigger>
                      <SelectContent className="z-[101]">
                        {loadingCampaigns ? (
                          <div className="p-2 text-sm text-muted-foreground">Loading campaigns...</div>
                        ) : campaigns.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">No campaigns available</div>
                        ) : (
                          campaigns.map((campaign) => (
                            <SelectItem key={campaign.id} value={campaign.id.toString()}>
                              {campaign.title}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {/* Show lead info if pre-selected from leads management */}
                {selectedLeadForAssign && !selectedCampaignForLeads ? (
                  <div className="space-y-2">
                    <Label>Lead</Label>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="font-medium text-sm">
                        {selectedLeadForAssign.lead_payload?.first_name || selectedLeadForAssign.lead_payload?.last_name
                          ? `${selectedLeadForAssign.lead_payload?.first_name || ''} ${selectedLeadForAssign.lead_payload?.last_name || ''}`.trim()
                          : selectedLeadForAssign.email}
                      </p>
                      <p className="text-xs text-muted-foreground">{selectedLeadForAssign.email}</p>
                      {selectedLeadForAssign.lead_payload?.mobile_number && (
                        <p className="text-xs text-muted-foreground">{selectedLeadForAssign.lead_payload.mobile_number}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Lead</Label>
                    <Select 
                      value={selectedLeadForAssign?.id?.toString() || ""} 
                      onValueChange={(value) => {
                        const lead = leads.find(l => l.id.toString() === value);
                        setSelectedLeadForAssign(lead || null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a lead" />
                      </SelectTrigger>
                      <SelectContent className="z-[101]">
                        {leads.map((lead) => (
                          <SelectItem key={lead.id} value={lead.id.toString()}>
                            {lead.email} ({lead.lead_payload?.mobile_number || 'No phone'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setAssignLeadDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    const campaignToUse = selectedCampaignForLeads || selectedCampaignForAssign;
                    if (campaignToUse && selectedLeadForAssign) {
                      handleAssignLeadToCampaign();
                    }
                  }}
                  disabled={!(selectedCampaignForLeads || selectedCampaignForAssign) || !selectedLeadForAssign || assigningLead}
                >
                  {assigningLead ? 'Assigning...' : 'Assign Lead'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Bulk Assign Leads to Campaign Dialog - Moved outside Tabs */}
          <Dialog open={bulkAssignToCampaignDialogOpen} onOpenChange={(open) => {
            if (!bulkAssigningLeads) {
              setBulkAssignToCampaignDialogOpen(open);
              if (!open) {
                setBulkAssignProgress(null);
              }
            }
          }}>
            <DialogContent className="max-w-md z-[100]">
              <DialogHeader>
                <DialogTitle>Add Leads to Campaign</DialogTitle>
                <DialogDescription>
                  Assign {selectedLeads.size} selected lead(s) to a campaign
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Campaign</Label>
                  <Select 
                    value={selectedCampaignForAssign?.id?.toString() || ""} 
                    onValueChange={(value) => {
                      const campaign = campaigns.find(c => c.id.toString() === value);
                      setSelectedCampaignForAssign(campaign || null);
                    }}
                    disabled={bulkAssigningLeads}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a campaign" />
                    </SelectTrigger>
                    <SelectContent className="z-[101]">
                      {loadingCampaigns ? (
                        <div className="p-2 text-sm text-muted-foreground">Loading campaigns...</div>
                      ) : campaigns.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">No campaigns available</div>
                      ) : (
                        campaigns.map((campaign) => (
                          <SelectItem key={campaign.id} value={campaign.id.toString()}>
                            {campaign.title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Selected Leads ({selectedLeads.size})</Label>
                  <ScrollArea className="h-32 border rounded-md p-2">
                    <div className="space-y-1">
                      {Array.from(selectedLeads).map((leadId) => {
                        const lead = leads.find(l => l.id === leadId);
                        if (!lead) return null;
                        const displayName = lead.lead_payload?.first_name || lead.lead_payload?.last_name
                          ? `${lead.lead_payload?.first_name || ''} ${lead.lead_payload?.last_name || ''}`.trim()
                          : lead.email;
                        return (
                          <div key={leadId} className="text-sm py-1 border-b last:border-0">
                            <p className="font-medium truncate">{displayName}</p>
                            <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>

                {bulkAssignProgress && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progress</span>
                      <span>{bulkAssignProgress.processed} / {bulkAssignProgress.total}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${(bulkAssignProgress.processed / bulkAssignProgress.total) * 100}%` }}
                      />
                    </div>
                    {bulkAssignProgress.errors.length > 0 && (
                      <p className="text-xs text-destructive">
                        {bulkAssignProgress.errors.length} error(s): {bulkAssignProgress.errors.slice(0, 3).join(', ')}
                        {bulkAssignProgress.errors.length > 3 && '...'}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setBulkAssignToCampaignDialogOpen(false)}
                  disabled={bulkAssigningLeads}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleBulkAssignLeadsToCampaign}
                  disabled={!selectedCampaignForAssign || bulkAssigningLeads}
                >
                  {bulkAssigningLeads ? `Assigning... (${bulkAssignProgress?.processed || 0}/${selectedLeads.size})` : `Assign ${selectedLeads.size} Lead(s)`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Bulk Assign Applications to Campaign Dialog */}
          <Dialog open={bulkAssignApplicationsToCampaignDialogOpen} onOpenChange={(open) => {
            if (!bulkAssigningApplications) {
              setBulkAssignApplicationsToCampaignDialogOpen(open);
              if (!open) {
                setBulkAssignApplicationsProgress(null);
              }
            }
          }}>
            <DialogContent className="max-w-md z-[100]">
              <DialogHeader>
                <DialogTitle>Add Applications to Campaign</DialogTitle>
                <DialogDescription>
                  Assign {selectedApplications.size} selected application(s) to a campaign using their associated leads
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Campaign</Label>
                  <Select 
                    value={selectedCampaignForApplicationsAssign?.id?.toString() || ""} 
                    onValueChange={(value) => {
                      const campaign = campaigns.find(c => c.id.toString() === value);
                      setSelectedCampaignForApplicationsAssign(campaign || null);
                    }}
                    disabled={bulkAssigningApplications}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a campaign" />
                    </SelectTrigger>
                    <SelectContent className="z-[101]">
                      {loadingCampaigns ? (
                        <div className="p-2 text-sm text-muted-foreground">Loading campaigns...</div>
                      ) : campaigns.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">No campaigns available</div>
                      ) : (
                        campaigns.map((campaign) => (
                          <SelectItem key={campaign.id} value={campaign.id.toString()}>
                            {campaign.title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Selected Applications ({selectedApplications.size})</Label>
                  <ScrollArea className="h-32 border rounded-md p-2">
                    <div className="space-y-1">
                      {Array.from(selectedApplications).map((appId) => {
                        const app = allApplications.find(a => a.id === appId);
                        if (!app) return null;
                        const leads = app._leads;
                        const leadPayload = leads?.lead_payload || {};
                        const displayName = leadPayload.first_name || leadPayload.last_name
                          ? `${leadPayload.first_name || ''} ${leadPayload.last_name || ''}`.trim()
                          : leads?.email || app.booking_slug || `App #${appId}`;
                        const hasLead = !!app.leads_id;
                        return (
                          <div key={appId} className="text-sm py-1 border-b last:border-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium truncate">{displayName}</p>
                              {!hasLead && (
                                <Badge variant="outline" className="text-xs text-destructive border-destructive">No Lead</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {leads?.email || 'No email'} • {app.booking_type || 'Unknown type'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>

                {bulkAssignApplicationsProgress && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progress</span>
                      <span>{bulkAssignApplicationsProgress.processed} / {bulkAssignApplicationsProgress.total}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${(bulkAssignApplicationsProgress.processed / bulkAssignApplicationsProgress.total) * 100}%` }}
                      />
                    </div>
                    {bulkAssignApplicationsProgress.errors.length > 0 && (
                      <p className="text-xs text-destructive">
                        {bulkAssignApplicationsProgress.errors.length} error(s): {bulkAssignApplicationsProgress.errors.slice(0, 3).join(', ')}
                        {bulkAssignApplicationsProgress.errors.length > 3 && '...'}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setBulkAssignApplicationsToCampaignDialogOpen(false)}
                  disabled={bulkAssigningApplications}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleBulkAssignApplicationsToCampaign}
                  disabled={!selectedCampaignForApplicationsAssign || bulkAssigningApplications}
                >
                  {bulkAssigningApplications ? `Assigning... (${bulkAssignApplicationsProgress?.processed || 0}/${selectedApplications.size})` : `Assign ${selectedApplications.size} Application(s)`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Send Email to Applications Dialog */}
          <Dialog open={sendEmailToApplicationsDialogOpen} onOpenChange={(open) => {
            setSendEmailToApplicationsDialogOpen(open);
            if (!open) {
              setSelectedCampaignForApplicationsEmail(null);
            }
          }}>
            <DialogContent className="max-w-lg z-[100]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Send Email to Applications
                </DialogTitle>
                <DialogDescription>
                  Send emails to {selectedApplications.size} selected application(s) using a campaign's email template. 
                  Each application's booking data will be used to populate template placeholders.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select Campaign Template</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    The campaign's configured email template and field mappings will be used. Booking fields 
                    (like booking_0_total_amount, booking_0_status) will be resolved from each application.
                  </p>
                  <Select 
                    value={selectedCampaignForApplicationsEmail?.id?.toString() || ""} 
                    onValueChange={(value) => {
                      const campaign = campaigns.find(c => c.id.toString() === value);
                      setSelectedCampaignForApplicationsEmail(campaign || null);
                    }}
                    disabled={sendingEmailsToApplications}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a campaign with email template" />
                    </SelectTrigger>
                    <SelectContent className="z-[101]">
                      {loadingCampaigns ? (
                        <div className="p-2 text-sm text-muted-foreground">Loading campaigns...</div>
                      ) : campaigns.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">No campaigns available</div>
                      ) : (
                        campaigns
                          .filter(c => c.item_info?.email_template_alias)
                          .map((campaign) => (
                            <SelectItem key={campaign.id} value={campaign.id.toString()}>
                              <div className="flex items-center gap-2">
                                <span>{campaign.title}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {campaign.item_info?.email_template_alias}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))
                      )}
                      {campaigns.filter(c => c.item_info?.email_template_alias).length === 0 && !loadingCampaigns && (
                        <div className="p-2 text-sm text-muted-foreground">
                          No campaigns with email templates configured
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCampaignForApplicationsEmail && (
                  <div className="p-3 border rounded-lg bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Template:</span>
                      <Badge variant="outline">
                        {selectedCampaignForApplicationsEmail.item_info?.email_template_alias}
                      </Badge>
                    </div>
                    {selectedCampaignForApplicationsEmail.item_info?.email_template_mappings && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Mapped fields:</span>{' '}
                        {Object.keys(selectedCampaignForApplicationsEmail.item_info.email_template_mappings).length} fields configured
                      </div>
                    )}
                    {selectedCampaignForApplicationsEmail.item_info?.linked_bookings?.length > 0 ? (
                      <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                        <Check className="h-3.5 w-3.5" />
                        Reference booking configured for application fields
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                        <Info className="h-3.5 w-3.5" />
                        No reference booking - only lead/campaign fields available
                      </div>
                    )}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Selected Applications ({selectedApplications.size})</Label>
                  <ScrollArea className="h-32 border rounded-md p-2">
                    <div className="space-y-1">
                      {Array.from(selectedApplications).slice(0, 10).map((appId) => {
                        const app = allApplications.find(a => a.id === appId);
                        if (!app) return null;
                        const leads = app._leads;
                        const leadPayload = leads?.lead_payload || {};
                        const displayName = leadPayload.first_name || leadPayload.last_name
                          ? `${leadPayload.first_name || ''} ${leadPayload.last_name || ''}`.trim()
                          : leads?.email || app.booking_slug || `App #${appId}`;
                        const hasEmail = !!(leads?.email || leadPayload.email);
                        return (
                          <div key={appId} className="text-sm py-1 border-b last:border-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium truncate">{displayName}</p>
                              {!hasEmail && (
                                <Badge variant="outline" className="text-xs text-destructive border-destructive">No Email</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {leads?.email || leadPayload.email || 'No email'} • {app.status}
                            </p>
                          </div>
                        );
                      })}
                      {selectedApplications.size > 10 && (
                        <p className="text-xs text-muted-foreground pt-1">
                          + {selectedApplications.size - 10} more applications
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                <div className="p-3 border rounded-lg bg-amber-500/10 border-amber-500/30">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-600 dark:text-amber-400">Important</p>
                      <p className="text-muted-foreground text-xs mt-1">
                        Emails will be sent with random delays (15-60s) to avoid rate limiting. 
                        You can pause, resume, or cancel the process at any time.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setSendEmailToApplicationsDialogOpen(false)}
                  disabled={sendingEmailsToApplications}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleGenerateEmailPreview}
                  disabled={!selectedCampaignForApplicationsEmail || sendingEmailsToApplications}
                >
                  {sendingEmailsToApplications ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Preparing...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview & Send
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Email Preview Dialog */}
          {emailPreviewData && (
            <EmailPreviewDialog
              isOpen={showEmailPreview}
              onClose={() => {
                setShowEmailPreview(false);
                setSendEmailToApplicationsDialogOpen(true);
              }}
              onConfirmSend={handleSendEmailToApplications}
              templateAlias={emailPreviewData.templateAlias}
              recipientEmail={emailPreviewData.recipientEmail}
              recipientName={emailPreviewData.recipientName}
              templateModel={emailPreviewData.templateModel}
              totalRecipients={emailPreviewData.totalRecipients}
              isSending={sendingEmailsToApplications}
            />
          )}

          {/* Remove Application from Campaign AlertDialog */}
          <AlertDialog open={removeFromCampaignDialogOpen} onOpenChange={setRemoveFromCampaignDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove from Campaign?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove this application from "{applicationToRemoveFromCampaign?.campaignName}".
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={removingFromCampaign}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRemoveFromCampaignConfirm}
                  disabled={removingFromCampaign}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {removingFromCampaign ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    'Remove'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Delete All Application Confirmation Dialog */}
          <AlertDialog open={deleteAllApplicationDialogOpen} onOpenChange={setDeleteAllApplicationDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Application?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this application submission.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeletingAllApplication}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAllApplicationConfirm}
                  disabled={isDeletingAllApplication}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeletingAllApplication ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Bulk Delete All Applications Confirmation Dialog */}
          <AlertDialog open={bulkDeleteAllApplicationsDialogOpen} onOpenChange={setBulkDeleteAllApplicationsDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selectedApplications.size} Application{selectedApplications.size !== 1 ? 's' : ''}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete {selectedApplications.size} selected application{selectedApplications.size !== 1 ? 's' : ''}.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {bulkDeleteAllApplicationsProgress && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Deleting applications...</span>
                    <span>{bulkDeleteAllApplicationsProgress.processed} / {bulkDeleteAllApplicationsProgress.total}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-destructive h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${(bulkDeleteAllApplicationsProgress.processed / bulkDeleteAllApplicationsProgress.total) * 100}%` }}
                    />
                  </div>
                  {bulkDeleteAllApplicationsProgress.errors.length > 0 && (
                    <p className="text-xs text-destructive">
                      {bulkDeleteAllApplicationsProgress.errors.length} error(s) occurred
                    </p>
                  )}
                </div>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isBulkDeletingAllApplications}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleBulkDeleteAllApplicationsConfirm}
                  disabled={isBulkDeletingAllApplications}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isBulkDeletingAllApplications ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete All'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Bulk Status Update Dialog */}
          <Dialog open={bulkStatusUpdateDialogOpen} onOpenChange={(open) => {
            if (!isBulkUpdatingStatus) {
              setBulkStatusUpdateDialogOpen(open);
              if (!open) {
                setSelectedBulkStatus('');
                setBulkStatusUpdateProgress(null);
              }
            }
          }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Update Status for {selectedApplications.size} Application{selectedApplications.size !== 1 ? 's' : ''}</DialogTitle>
                <DialogDescription>
                  Select a new status to apply to all selected applications.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk-status">New Status</Label>
                  <Select
                    value={selectedBulkStatus}
                    onValueChange={setSelectedBulkStatus}
                    disabled={isBulkUpdatingStatus}
                  >
                    <SelectTrigger id="bulk-status">
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                    <SelectContent>
                      {getApplicationStatuses().map(status => (
                        <SelectItem key={status} value={status}>
                          {formatStatusLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {bulkStatusUpdateProgress && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Updating applications...</span>
                      <span>{bulkStatusUpdateProgress.processed} / {bulkStatusUpdateProgress.total}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${(bulkStatusUpdateProgress.processed / bulkStatusUpdateProgress.total) * 100}%` }}
                      />
                    </div>
                    {bulkStatusUpdateProgress.errors.length > 0 && (
                      <p className="text-xs text-destructive">
                        {bulkStatusUpdateProgress.errors.length} error(s) occurred
                      </p>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setBulkStatusUpdateDialogOpen(false)}
                  disabled={isBulkUpdatingStatus}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBulkStatusUpdateConfirm}
                  disabled={isBulkUpdatingStatus || !selectedBulkStatus}
                >
                  {isBulkUpdatingStatus ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update All'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          </div>
        </div>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <AdminBottomNav 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        visibleTabs={sidebarItems.map(item => item.value)}
      />
      
      {/* Email Progress Dialog */}
      <EmailProgressDialog
        state={emailProgressState}
        onClose={handleCloseEmailProgressDialog}
        onCancel={handleCancelEmailSend}
        onPause={handlePauseEmailSend}
        onResume={handleResumeEmailSend}
        onResetLead={handleResetLeadContact}
        onResendEmail={handleResendEmail}
      />
    </SidebarProvider>
  );
};

export default Admin;