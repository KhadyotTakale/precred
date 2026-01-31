import { useState, useEffect } from "react";
import { Store, ChevronDown, ChevronRight, Code } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getFilterStatusesForType, formatStatusLabel, type CustomStatusesConfig } from "@/components/StatusConfigurationManager";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { DarkModeToggle } from "@/components/DarkModeToggle";

interface SidebarItem {
  value: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: string;
}

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarItems: SidebarItem[];
  vendorsSubTab: 'list' | 'applications' | 'all-applications';
  setVendorsSubTab: (tab: 'list' | 'applications' | 'all-applications') => void;
  vendorApplicationStatusFilter: string;
  setVendorApplicationStatusFilter: (status: string) => void;
  vendorApplicationStatusCounts: Record<string, number>;
  setVendorApplicationsPage: (page: number) => void;
  setAllApplicationsPage: (page: number) => void;
  // Optional counts for sidebar badges (from already-fetched data)
  itemCounts?: Record<string, number>;
  // Optional "new" counts for highlighted badges
  newItemCounts?: Record<string, number>;
  // Custom statuses configuration
  customStatusesConfig?: CustomStatusesConfig;
}

// Group labels for display
const GROUP_LABELS: Record<string, string> = {
  overview: "Overview",
  content: "Content Types",
  operations: "Operations",
  directory: "Directory",
  system: "System",
};

// Group order for rendering
const GROUP_ORDER = ["overview", "content", "operations", "directory", "system"];

// LocalStorage key for persisting sidebar state
const SIDEBAR_STATE_KEY = "admin-sidebar-groups";

// Default open states
const DEFAULT_OPEN_GROUPS: Record<string, boolean> = {
  overview: true,
  content: true,
  operations: true,
  directory: false,
  system: false,
};

// Load saved state from localStorage
const loadSavedState = (): Record<string, boolean> => {
  try {
    const saved = localStorage.getItem(SIDEBAR_STATE_KEY);
    if (saved) {
      return { ...DEFAULT_OPEN_GROUPS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Failed to load sidebar state:", e);
  }
  return DEFAULT_OPEN_GROUPS;
};

export function AdminSidebar({
  activeTab,
  setActiveTab,
  sidebarItems,
  vendorsSubTab,
  setVendorsSubTab,
  vendorApplicationStatusFilter,
  setVendorApplicationStatusFilter,
  vendorApplicationStatusCounts,
  setVendorApplicationsPage,
  setAllApplicationsPage,
  itemCounts = {},
  newItemCounts = {},
  customStatusesConfig = {},
}: AdminSidebarProps) {
  const { setOpenMobile, isMobile } = useSidebar();
  
  // Track which groups are open - load from localStorage
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(loadSavedState);
  
  // Save state to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(openGroups));
    } catch (e) {
      console.error("Failed to save sidebar state:", e);
    }
  }, [openGroups]);

  // Toggle group open state
  const toggleGroup = (groupKey: string) => {
    if (groupKey === "overview") return; // Overview always stays open
    setOpenGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  // Close sidebar on mobile after selection
  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Group items by their group property
  const groupedItems = sidebarItems.reduce((acc, item) => {
    const group = item.group || "other";
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(item);
    return acc;
  }, {} as Record<string, SidebarItem[]>);

  // Render a single menu item
  const renderMenuItem = (item: SidebarItem) => {
    // Special handling for All Applications (runtime submissions)
    if (item.value === 'all-applications') {
      const count = itemCounts['all-applications'] || 0;
      const newCount = newItemCounts['all-applications'] || 0;
      return (
        <SidebarMenuItem key={item.value}>
          <SidebarMenuButton
            onClick={() => {
              setActiveTab('vendors');
              setVendorsSubTab('all-applications');
              setAllApplicationsPage(1);
              handleNavClick();
            }}
            isActive={activeTab === 'vendors' && vendorsSubTab === 'all-applications'}
            tooltip={item.title}
            className="min-h-[44px] touch-manipulation justify-between"
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-5 w-5" />
              <span className="text-sm font-medium">{item.title}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {newCount > 0 && (
                <Badge className="h-5 min-w-5 px-1.5 text-xs bg-primary text-primary-foreground">
                  {newCount} new
                </Badge>
              )}
              {count > 0 && (
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                  {count}
                </Badge>
              )}
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    }

    // Special handling for Vendors to add submenu (vendor applications by status)
    if (item.value === 'vendors') {
      return (
        <Collapsible key={item.value} defaultOpen={activeTab === 'vendors' && vendorsSubTab !== 'all-applications'}>
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                onClick={() => {
                  setActiveTab('vendors');
                  setVendorsSubTab('list');
                  handleNavClick();
                }}
                isActive={activeTab === 'vendors' && vendorsSubTab !== 'all-applications'}
                tooltip={item.title}
                className="w-full justify-between min-h-[44px] touch-manipulation"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{item.title}</span>
                </div>
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-6 mt-1 space-y-1 border-l pl-3">
                <SidebarMenuButton
                  onClick={() => {
                    setActiveTab('vendors');
                    setVendorsSubTab('list');
                    handleNavClick();
                  }}
                  isActive={activeTab === 'vendors' && vendorsSubTab === 'list'}
                  className="text-sm min-h-[40px] touch-manipulation"
                >
                  <Store className="h-4 w-4" />
                  <span>Vendor List</span>
                </SidebarMenuButton>
                <div className="py-2">
                  <span className="text-xs font-medium text-muted-foreground px-2">By Status</span>
                </div>
                {getFilterStatusesForType('Vendors', customStatusesConfig).map((status) => (
                  <SidebarMenuButton
                    key={status}
                    onClick={() => {
                      setActiveTab('vendors');
                      setVendorsSubTab('applications');
                      setVendorApplicationStatusFilter(status);
                      setVendorApplicationsPage(1);
                      handleNavClick();
                    }}
                    isActive={activeTab === 'vendors' && vendorsSubTab === 'applications' && vendorApplicationStatusFilter === status}
                    className="text-sm justify-between min-h-[40px] touch-manipulation"
                  >
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      <span>{formatStatusLabel(status)}</span>
                    </div>
                    {vendorApplicationStatusCounts[status] !== undefined && vendorApplicationStatusCounts[status] > 0 && (
                      <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                        {vendorApplicationStatusCounts[status]}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                ))}
              </div>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );
    }
    
    const count = itemCounts[item.value] || 0;
    const newCount = newItemCounts[item.value] || 0;
    
    return (
      <SidebarMenuItem key={item.value}>
        <SidebarMenuButton
          onClick={() => {
            setActiveTab(item.value);
            handleNavClick();
          }}
          isActive={activeTab === item.value}
          tooltip={item.title}
          className="min-h-[44px] touch-manipulation justify-between"
        >
          <div className="flex items-center gap-3">
            <item.icon className="h-5 w-5" />
            <span className="text-sm font-medium">{item.title}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {newCount > 0 && (
              <Badge className="h-5 min-w-5 px-1.5 text-xs bg-primary text-primary-foreground">
                {newCount} new
              </Badge>
            )}
            {count > 0 && (
              <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                {count}
              </Badge>
            )}
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent className="pt-2">
        {GROUP_ORDER.map((groupKey) => {
          const items = groupedItems[groupKey];
          if (!items || items.length === 0) return null;

          const isOpen = openGroups[groupKey] ?? true;
          const isOverview = groupKey === "overview";

          return (
            <SidebarGroup key={groupKey}>
              {isOverview ? (
                // Overview group - not collapsible
                <>
                  <SidebarGroupLabel className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {GROUP_LABELS[groupKey] || groupKey}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {items.map((item) => renderMenuItem(item))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </>
              ) : (
                // Other groups - collapsible
                <Collapsible open={isOpen} onOpenChange={() => toggleGroup(groupKey)}>
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:bg-muted/50 rounded-md flex items-center justify-between group">
                      <span>{GROUP_LABELS[groupKey] || groupKey}</span>
                      {isOpen ? (
                        <ChevronDown className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                      )}
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {items.map((item) => renderMenuItem(item))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarFooter className="p-3 border-t">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Theme</span>
          <DarkModeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
