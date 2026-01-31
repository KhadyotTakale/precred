import { LayoutDashboard, Package, Users, UserCircle, Inbox, FileText, ChevronDown, Loader2, Tag } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { elegantAPI, BookingTypeMetric, BookingItemMetric } from "@/lib/elegant-api";
import { MEMBER_MODULES, MemberModule, Role, hasMemberModuleAccess } from "@/lib/role-permissions";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  module: MemberModule;
}

const menuItems: MenuItem[] = [
  { title: "Dashboard", url: "/member-portal", icon: LayoutDashboard, end: true, module: MEMBER_MODULES.MEMBER_DASHBOARD },
  { title: "Inbox", url: "/member-portal/inbox", icon: Inbox, module: MEMBER_MODULES.MEMBER_INBOX },
  { title: "Order History", url: "/member-portal/orders", icon: Package, module: MEMBER_MODULES.MEMBER_ORDERS },
  { title: "Membership", url: "/member-portal/membership", icon: Users, module: MEMBER_MODULES.MEMBER_MEMBERSHIP },
  { title: "Profile", url: "/member-portal/profile", icon: UserCircle, module: MEMBER_MODULES.MEMBER_PROFILE },
];

export function MemberSidebar() {
  const { open, setOpenMobile, isMobile } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { user } = useUser();
  const [userRole, setUserRole] = useState<Role | undefined>(undefined);
  const [bookingTypes, setBookingTypes] = useState<BookingTypeMetric[]>([]);
  const [itemTypes, setItemTypes] = useState<BookingItemMetric[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [bookingTypesOpen, setBookingTypesOpen] = useState(false);
  const [itemTypesOpen, setItemTypesOpen] = useState(false);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user?.id) {
        try {
          const response = await elegantAPI.getCustomer(user.id);
          const role = response?.customer?._customer_role?.role as Role;
          setUserRole(role || 'guest');
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole('guest');
        }
      }
    };
    fetchUserRole();
  }, [user?.id]);

  useEffect(() => {
    const fetchTypes = async () => {
      if (user?.id) {
        try {
          setLoadingTypes(true);
          const analytics = await elegantAPI.getMemberDashboardAnalytics(user.id);
          const bookings = analytics.metrics.bookings.total_booking_types.filter(
            (b) => b.booking_types && b.bookings > 0
          );
          setBookingTypes(bookings);
          const items = analytics.metrics.bookings.total_booking_items.filter(
            (i) => i.booking_items && i.bookings > 0
          );
          setItemTypes(items);
        } catch (error) {
          console.error('Error fetching types:', error);
        } finally {
          setLoadingTypes(false);
        }
      }
    };
    fetchTypes();
  }, [user?.id]);

  const filteredMenuItems = menuItems.filter(item =>
    hasMemberModuleAccess(userRole, item.module)
  );

  const isExpanded = filteredMenuItems.some((item) =>
    item.end ? currentPath === item.url : currentPath.startsWith(item.url)
  );

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Check if current path is a booking type or item type filter
  const currentBookingType = new URLSearchParams(location.search).get('booking_type');
  const currentItemType = new URLSearchParams(location.search).get('items_type');

  return (
    <Sidebar
      className={open ? "w-60" : "w-14"}
      collapsible="icon"
    >
      <SidebarTrigger className="m-2 self-end" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Member Portal</SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.end}
                      className="hover:bg-muted/50 w-full"
                      activeClassName="bg-muted text-primary font-medium"
                      onClick={handleNavClick}
                    >
                      <item.icon className="h-4 w-4" />
                      {open && <span className="ml-2">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Dynamic Booking Types Section */}
        {hasMemberModuleAccess(userRole, MEMBER_MODULES.MEMBER_ORDERS) && bookingTypes.length > 0 && open && (
          <SidebarGroup>
            <Collapsible open={bookingTypesOpen} onOpenChange={setBookingTypesOpen}>
              <CollapsibleTrigger className="w-full">
                <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded px-2 py-1">
                  <span>Booking Types</span>
                  {loadingTypes ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ChevronDown className={cn("h-3 w-3 transition-transform", bookingTypesOpen && "rotate-180")} />
                  )}
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {bookingTypes.map((type) => (
                      <SidebarMenuItem key={type.booking_types}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={`/member-portal/orders?booking_type=${encodeURIComponent(type.booking_types)}`}
                            className={cn(
                              "hover:bg-muted/50 w-full text-sm",
                              currentBookingType === type.booking_types && "bg-muted text-primary font-medium"
                            )}
                            onClick={handleNavClick}
                          >
                            <Package className="h-3 w-3" />
                            <span className="ml-2 flex-1 truncate">{type.booking_types}</span>
                            <span className="text-xs text-muted-foreground">{type.bookings}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {/* Dynamic Item Types Section */}
        {hasMemberModuleAccess(userRole, MEMBER_MODULES.MEMBER_ORDERS) && itemTypes.length > 0 && open && (
          <SidebarGroup>
            <Collapsible open={itemTypesOpen} onOpenChange={setItemTypesOpen}>
              <CollapsibleTrigger className="w-full">
                <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded px-2 py-1">
                  <span>Item Types</span>
                  {loadingTypes ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ChevronDown className={cn("h-3 w-3 transition-transform", itemTypesOpen && "rotate-180")} />
                  )}
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {itemTypes.map((type) => (
                      <SidebarMenuItem key={type.booking_items}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={`/member-portal/orders?items_type=${encodeURIComponent(type.booking_items)}`}
                            className={cn(
                              "hover:bg-muted/50 w-full text-sm",
                              currentItemType === type.booking_items && "bg-muted text-primary font-medium"
                            )}
                            onClick={handleNavClick}
                          >
                            <Tag className="h-3 w-3" />
                            <span className="ml-2 flex-1 truncate">{type.booking_items}</span>
                            <span className="text-xs text-muted-foreground">{type.bookings}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
