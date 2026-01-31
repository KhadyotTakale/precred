import { Menu, ShoppingCart as ShoppingCartIcon, ChevronDown, Calendar, Users, BookOpen, Store, Heart, Info, Newspaper, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useUser, UserButton } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { elegantAPI, ElegantCustomer } from "@/lib/elegant-api";
import { useCart } from "@/contexts/CartContext";
import clubLogo from "@/assets/club-logo-new.png";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

interface NavGroup {
  label: string;
  icon: React.ReactNode;
  items: { label: string; id: string; route?: string }[];
}

const Navbar = () => {
  const { user, isLoaded } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<ElegantCustomer | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const { totalItems } = useCart();
  const isIndexPage = location.pathname === '/';

  // Delay customer fetch to reduce initial API load
  useEffect(() => {
    if (!isLoaded || !user) return;
    
    // Delay 500ms to let critical page content load first
    const timer = setTimeout(() => {
      elegantAPI.getCustomer(user.id)
        .then((response) => setCustomer(response.customer))
        .catch((error) => console.error('Error fetching customer:', error));
    }, 500);
    
    return () => clearTimeout(timer);
  }, [isLoaded, user]);

  const scrollToSection = (id: string) => {
    if (isIndexPage) {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate(`/#${id}`);
    }
  };

  const handleNavigation = (item: { label: string; id: string; route?: string }) => {
    if (item.route) {
      navigate(item.route);
    } else {
      scrollToSection(item.id);
    }
  };

  // Grouped navigation for better organization
  const navGroups: NavGroup[] = [
    {
      label: "Explore",
      icon: <Calendar className="h-4 w-4" />,
      items: [
        { label: "Events", id: "events", route: "/event" },
        { label: "Classes", id: "classes", route: "/classes" },
        { label: "Calendar", id: "calendar", route: "/calendar" },
      ]
    },
    {
      label: "Community",
      icon: <Users className="h-4 w-4" />,
      items: [
        { label: "Vendors", id: "vendors", route: "/vendors" },
        { label: "Memberships", id: "memberships", route: "/memberships" },
        { label: "Volunteer", id: "jobs", route: "/jobs" },
      ]
    },
    {
      label: "Resources",
      icon: <BookOpen className="h-4 w-4" />,
      items: [
        { label: "Blogs", id: "blogs", route: "/blog" },
        { label: "Newsletters", id: "newsletters", route: "/newsletter" },
        { label: "Images", id: "images", route: "/images" },
        { label: "About", id: "about", route: "/about" },
      ]
    },
  ];

  // Standalone nav items (always visible)
  const standaloneItems = [
    { label: "Shop", id: "shop", route: "/shop", icon: <Store className="h-4 w-4" /> },
    { label: "Donate", id: "donations", route: "/donation", icon: <Heart className="h-4 w-4" /> },
  ];

  const getUserButtonMenuItems = () => {
    const role = customer?._customer_role?.role;
    
    const baseItems = [
      {
        label: 'Member Portal',
        labelIcon: <Menu className="h-4 w-4" />,
        onClick: () => window.location.href = '/member-portal'
      }
    ];
    
    if (role === 'admin') {
      return [
        ...baseItems,
        {
          label: 'Club Administration',
          labelIcon: <Menu className="h-4 w-4" />,
          onClick: () => window.location.href = '/admin'
        }
      ];
    } else if (role === 'member') {
      return baseItems;
    } else if (role === 'vendor') {
      return [
        ...baseItems,
        {
          label: 'Vendor Dashboard',
          labelIcon: <Menu className="h-4 w-4" />,
          onClick: () => window.location.href = '/vendor-dashboard'
        }
      ];
    } else if (role === 'contributor') {
      return [
        ...baseItems,
        {
          label: 'Contributor Dashboard',
          labelIcon: <Menu className="h-4 w-4" />,
          onClick: () => window.location.href = '/contributor-dashboard'
        }
      ];
    }
    return baseItems;
  };

  const handleMobileNavigation = (item: { label: string; id: string; route?: string }) => {
    setMobileMenuOpen(false);
    handleNavigation(item);
  };

  const toggleMobileGroup = (label: string) => {
    setOpenGroups(prev => 
      prev.includes(label) 
        ? prev.filter(g => g !== label)
        : [...prev, label]
    );
  };

  return (
    <nav className="fixed top-0 w-full bg-card/80 backdrop-blur-md z-50 border-b border-border">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3">
            <img src={clubLogo} alt="Tampa Bay Minerals & Science Club" className="h-10 w-auto object-contain" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex gap-1 items-center">
            {/* Grouped Dropdowns */}
            {navGroups.map((group) => (
              <DropdownMenu key={group.label}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 text-foreground hover:text-primary">
                    {group.icon}
                    {group.label}
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="min-w-[140px] bg-popover border border-border shadow-lg">
                  {group.items.map((item) => (
                    <DropdownMenuItem
                      key={item.id}
                      onClick={() => handleNavigation(item)}
                      className="cursor-pointer hover:bg-accent focus:bg-accent"
                    >
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ))}

            {/* Standalone Items */}
            {standaloneItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                onClick={() => handleNavigation(item)}
                className="gap-1 text-foreground hover:text-primary"
              >
                {item.icon}
                {item.label}
              </Button>
            ))}

            <div className="h-6 w-px bg-border mx-2" />

            {/* Newsletter */}
            <Button onClick={() => scrollToSection("newsletter")} size="sm" variant="outline" className="gap-1">
              <Newspaper className="h-4 w-4" />
              Newsletter
            </Button>

            {/* Cart */}
            <Button
              variant="outline"
              size="sm"
              className="relative"
              onClick={() => navigate("/cart")}
            >
              <ShoppingCartIcon className="h-4 w-4" />
              {totalItems > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {totalItems}
                </Badge>
              )}
            </Button>

            <ThemeSwitcher />

            {customer && (
              <Badge variant="secondary" className="text-xs font-semibold uppercase">
                {customer._customer_role?.role || 'Guest'}
              </Badge>
            )}
            
            {user ? (
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "h-8 w-8"
                  }
                }}
              >
                <UserButton.MenuItems>
                  {getUserButtonMenuItems().map((item, index) => (
                    <UserButton.Action
                      key={index}
                      label={item.label}
                      labelIcon={item.labelIcon}
                      onClick={item.onClick}
                    />
                  ))}
                </UserButton.MenuItems>
              </UserButton>
            ) : (
              <Button asChild size="sm">
                <a href="/sign-up">Sign Up</a>
              </Button>
            )}
          </div>

          {/* Tablet Navigation (simplified) */}
          <div className="hidden md:flex lg:hidden gap-2 items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Menu className="h-4 w-4" />
                  Menu
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover border border-border shadow-lg">
                {navGroups.map((group, groupIndex) => (
                  <div key={group.label}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-2">
                      {group.icon}
                      {group.label}
                    </div>
                    {group.items.map((item) => (
                      <DropdownMenuItem
                        key={item.id}
                        onClick={() => handleNavigation(item)}
                        className="cursor-pointer pl-8 hover:bg-accent focus:bg-accent"
                      >
                        {item.label}
                      </DropdownMenuItem>
                    ))}
                    {groupIndex < navGroups.length - 1 && <DropdownMenuSeparator />}
                  </div>
                ))}
                <DropdownMenuSeparator />
                {standaloneItems.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => handleNavigation(item)}
                    className="cursor-pointer hover:bg-accent focus:bg-accent flex items-center gap-2"
                  >
                    {item.icon}
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              className="relative"
              onClick={() => navigate("/cart")}
            >
              <ShoppingCartIcon className="h-4 w-4" />
              {totalItems > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {totalItems}
                </Badge>
              )}
            </Button>

            <ThemeSwitcher />

            {user ? (
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "h-8 w-8"
                  }
                }}
              >
                <UserButton.MenuItems>
                  {getUserButtonMenuItems().map((item, index) => (
                    <UserButton.Action
                      key={index}
                      label={item.label}
                      labelIcon={item.labelIcon}
                      onClick={item.onClick}
                    />
                  ))}
                </UserButton.MenuItems>
              </UserButton>
            ) : (
              <Button asChild size="sm">
                <a href="/sign-up">Sign Up</a>
              </Button>
            )}
          </div>

          {/* Mobile Navigation */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[280px] overflow-y-auto">
              <div className="flex flex-col gap-2 mt-6">
                {/* Collapsible Groups for Mobile */}
                {navGroups.map((group) => (
                  <Collapsible
                    key={group.label}
                    open={openGroups.includes(group.label)}
                    onOpenChange={() => toggleMobileGroup(group.label)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between text-left font-medium"
                      >
                        <span className="flex items-center gap-2">
                          {group.icon}
                          {group.label}
                        </span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${openGroups.includes(group.label) ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-6 space-y-1">
                      {group.items.map((item) => (
                        <Button
                          key={item.id}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-muted-foreground hover:text-foreground"
                          onClick={() => handleMobileNavigation(item)}
                        >
                          {item.label}
                        </Button>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ))}

                <div className="h-px bg-border my-2" />

                {/* Standalone Items */}
                {standaloneItems.map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className="w-full justify-start gap-2"
                    onClick={() => handleMobileNavigation(item)}
                  >
                    {item.icon}
                    {item.label}
                  </Button>
                ))}

                <div className="h-px bg-border my-2" />

                {/* Newsletter */}
                <Button 
                  onClick={() => { setMobileMenuOpen(false); scrollToSection("newsletter"); }} 
                  className="w-full justify-start gap-2" 
                  variant="ghost"
                >
                  <Newspaper className="h-4 w-4" />
                  Newsletter
                </Button>

                {/* Cart */}
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => { setMobileMenuOpen(false); navigate("/cart"); }}
                >
                  <ShoppingCartIcon className="h-4 w-4" />
                  Cart
                  {totalItems > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {totalItems}
                    </Badge>
                  )}
                </Button>

                <div className="h-px bg-border my-2" />

                {user && (
                  <Button
                    variant="default"
                    className="w-full justify-start gap-2"
                    onClick={() => { setMobileMenuOpen(false); navigate("/member-portal"); }}
                  >
                    <Users className="h-4 w-4" />
                    Member Portal
                  </Button>
                )}

                {customer?._customer_role?.role === 'admin' && (
                  <Button
                    variant="secondary"
                    className="w-full justify-start gap-2"
                    onClick={() => { setMobileMenuOpen(false); navigate("/admin"); }}
                  >
                    <Menu className="h-4 w-4" />
                    Club Administration
                  </Button>
                )}

                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-muted-foreground">Theme</span>
                  <ThemeSwitcher />
                </div>

                {customer && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">Role</span>
                    <Badge variant="secondary" className="text-xs font-semibold uppercase">
                      {customer._customer_role?.role || 'Guest'}
                    </Badge>
                  </div>
                )}

                {user ? (
                  <div className="flex items-center justify-between py-3 border-t border-border mt-2">
                    <span className="text-sm text-muted-foreground">Account</span>
                    <UserButton 
                      appearance={{
                        elements: {
                          avatarBox: "h-10 w-10"
                        }
                      }}
                    >
                      <UserButton.MenuItems>
                        {getUserButtonMenuItems().map((item, index) => (
                          <UserButton.Action
                            key={index}
                            label={item.label}
                            labelIcon={item.labelIcon}
                            onClick={item.onClick}
                          />
                        ))}
                      </UserButton.MenuItems>
                    </UserButton>
                  </div>
                ) : (
                  <Button asChild className="w-full mt-2">
                    <a href="/sign-up">Sign Up</a>
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
