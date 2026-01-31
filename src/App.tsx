import { ClerkProvider, useUser } from "@clerk/clerk-react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import { toast } from "sonner";
import { adminAPI } from "./lib/admin-api";
import { elegantAPI } from "./lib/elegant-api";
import { CartProvider } from "./contexts/CartContext";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";
import { WorkflowProvider } from "./contexts/WorkflowContext";
import { ImpersonationBanner } from "./components/ImpersonationBanner";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SessionMonitor } from "./components/SessionMonitor";
import { RateLimitIndicator } from "./components/RateLimitIndicator";
import { MEMBER_MODULES } from "./lib/role-permissions";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeProvider } from "./components/ThemeProvider";

// Lazy load all page components
const Index = lazy(() => import("./pages/Index"));
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const Admin = lazy(() => import("./pages/Admin"));
const GuestDashboard = lazy(() => import("./pages/GuestDashboard"));
const VendorDashboard = lazy(() => import("./pages/VendorDashboard"));
const ContributorDashboard = lazy(() => import("./pages/ContributorDashboard"));
const Events = lazy(() => import("./pages/Events"));
const EventDetails = lazy(() => import("./pages/EventDetails"));
const Classes = lazy(() => import("./pages/Classes"));
const ClassDetails = lazy(() => import("./pages/ClassDetails"));
const Memberships = lazy(() => import("./pages/Memberships"));
const MembershipDetails = lazy(() => import("./pages/MembershipDetails"));
const Shop = lazy(() => import("./pages/Shop"));
const Cart = lazy(() => import("./pages/Cart"));
const RockIdentification = lazy(() => import("./pages/RockIdentification"));
const RockDetails = lazy(() => import("./pages/RockDetails"));
const About = lazy(() => import("./pages/About"));
const Vendors = lazy(() => import("./pages/Vendors"));
const VendorDetails = lazy(() => import("./pages/VendorDetails"));
const Blogs = lazy(() => import("./pages/Blogs"));
const BlogDetails = lazy(() => import("./pages/BlogDetails"));
const Jobs = lazy(() => import("./pages/Jobs"));
const Search = lazy(() => import("./pages/Search"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Donations = lazy(() => import("./pages/Donations"));
const DonationDetails = lazy(() => import("./pages/DonationDetails"));
const Raffles = lazy(() => import("./pages/Raffles"));
const RaffleDetails = lazy(() => import("./pages/RaffleDetails"));
const Newsletters = lazy(() => import("./pages/Newsletters"));
const NewsletterDetails = lazy(() => import("./pages/NewsletterDetails"));
const Images = lazy(() => import("./pages/Images"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const CheckoutCancel = lazy(() => import("./pages/CheckoutCancel"));
const OrderHistory = lazy(() => import("./pages/OrderHistory"));
const MemberPortalLayout = lazy(() => import("./pages/MemberPortal/MemberPortalLayout"));
const MemberDashboard = lazy(() => import("./pages/MemberPortal/Dashboard"));
const MemberOrders = lazy(() => import("./pages/MemberPortal/Orders"));
const MemberMembership = lazy(() => import("./pages/MemberPortal/Membership"));
const MemberProfile = lazy(() => import("./pages/MemberPortal/Profile"));
const MemberInbox = lazy(() => import("./pages/MemberPortal/Inbox"));
const MemberApplications = lazy(() => import("./pages/MemberPortal/Applications"));
const ApplicationDetails = lazy(() => import("./pages/ApplicationDetails"));
const NotFound = lazy(() => import("./pages/NotFound"));
const NoAccess = lazy(() => import("./pages/NoAccess"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays fresh for 60 seconds - reduces refetches after publish
      staleTime: 60 * 1000,
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Don't refetch on window focus immediately after load
      refetchOnWindowFocus: false,
    },
  },
});

// Page loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="space-y-4 w-full max-w-md px-4">
      <Skeleton className="h-8 w-3/4 mx-auto" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-32 w-full" />
    </div>
  </div>
);

// Get Clerk publishable key from environment
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Check if Clerk key is valid (not placeholder or empty)
const isClerkEnabled = CLERK_PUBLISHABLE_KEY && 
  CLERK_PUBLISHABLE_KEY.startsWith('pk_') && 
  !CLERK_PUBLISHABLE_KEY.includes('your_key_here');

const CustomerSyncHandler = () => {
  const { user, isLoaded } = useUser();
  const [hasSynced, setHasSynced] = useState(false);

  useEffect(() => {
    const syncCustomer = async () => {
      if (isLoaded && user && !hasSynced) {
        const email = user.primaryEmailAddress?.emailAddress || '';
        const fullName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim();
        
        // Set the clerk user ID for all future API calls
        elegantAPI.setClerkUserId(user.id);
        
        try {
          await elegantAPI.createOrUpdateCustomer(user.id, email, fullName);
          
          // Delay secondary API calls to avoid rate limiting on initial load
          setTimeout(() => {
            // Pre-fetch and cache item types for faster admin experience
            adminAPI.getCachedItemTypes(user.id).catch(() => {
              // Silently fail - item types will be fetched when needed
            });
          }, 1000); // Delay 1 second after customer sync
          
          // Track new member signup in Microsoft Clarity
          if (typeof window !== 'undefined' && (window as any).clarity) {
            (window as any).clarity('identify', 'user_id', user.id);
            (window as any).clarity('identify', 'user_email', email);
          }
          
          setHasSynced(true);
        } catch (error) {
          console.error('Error syncing customer:', error);
          toast.error('Sync Failed', {
            description: 'Failed to sync your account. Please try refreshing the page.',
          });
        }
      } else if (isLoaded && !user) {
        // Clear the clerk user ID when user signs out
        elegantAPI.setClerkUserId(null);
      }
    };

    syncCustomer();
  }, [isLoaded, user, hasSynced]);

  return null;
};

const TestModeChecker = () => {
  const { user } = useUser();

  useEffect(() => {
    // Delay test mode check to reduce initial API load
    const timer = setTimeout(() => {
      const checkTestMode = async () => {
        if (user?.id) {
          try {
            const shopData = await adminAPI.getShop(user.id);
            if (shopData.testmode) {
              toast.warning("Test Mode Active", {
                description: "This site is currently running in test mode.",
                duration: 10000,
              });
            }
          } catch (error) {
            console.error('Failed to fetch shop data:', error);
          }
        }
      };
      checkTestMode();
    }, 2000); // Delay 2 seconds after mount

    return () => clearTimeout(timer);
  }, [user?.id]);

  return null;
};

// Clarity page view tracker - tracks route changes
const ClarityTracker = () => {
  const location = useLocation();

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).clarity) {
      // Track page view with current path
      (window as any).clarity('set', 'page_path', location.pathname);
      (window as any).clarity('set', 'page_search', location.search);
      (window as any).clarity('set', 'page_url', `${location.pathname}${location.search}`);
    }
  }, [location.pathname, location.search]);

  return null;
};

const App = () => {
  // Only wrap with ClerkProvider if valid key exists
  if (isClerkEnabled) {
    return (
      <ClerkProvider 
        publishableKey={CLERK_PUBLISHABLE_KEY}
        signUpUrl="/sign-up"
        signInUrl="/sign-in"
        signUpFallbackRedirectUrl="/"
        signInFallbackRedirectUrl="/"
        signUpForceRedirectUrl="/"
        signInForceRedirectUrl="/"
        localization={{
          signIn: {
            start: {
              title: "Welcome to TBMSC",
              subtitle: "Sign in to continue"
            }
          },
          signUp: {
            start: {
              title: "Join TBMSC",
              subtitle: "Create your account"
            }
          }
        }}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        <QueryClientProvider client={queryClient}>
          <ImpersonationProvider>
            <CartProvider>
              <TooltipProvider>
            <ImpersonationBanner />
                <Toaster />
                <Sonner />
                <RateLimitIndicator />
                <CustomerSyncHandler />
                <TestModeChecker />
                <SessionMonitor checkInterval={30000} />
              <BrowserRouter>
                <ClarityTracker />
                <ErrorBoundary>
                <WorkflowProvider>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/sign-in" element={<SignIn />} />
                    <Route path="/sign-up" element={<SignUp />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/guest-dashboard" element={<GuestDashboard />} />
                    <Route path="/vendor-dashboard" element={<VendorDashboard />} />
                    <Route path="/contributor-dashboard" element={<ContributorDashboard />} />
                    <Route path="/event" element={<Events />} />
                    <Route path="/event/:slug" element={<EventDetails />} />
                    <Route path="/classes" element={<Classes />} />
                    <Route path="/classes/:slug" element={<ClassDetails />} />
                    <Route path="/memberships" element={<Memberships />} />
                    <Route path="/memberships/:slug" element={<MembershipDetails />} />
                    <Route path="/shop" element={<Shop />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/checkout/success" element={<CheckoutSuccess />} />
                    <Route path="/checkout/cancel" element={<CheckoutCancel />} />
                    <Route path="/order-history" element={<OrderHistory />} />
                    <Route path="/member-portal" element={<MemberPortalLayout />}>
                      <Route index element={<ProtectedRoute module={MEMBER_MODULES.MEMBER_DASHBOARD} moduleType="member"><MemberDashboard /></ProtectedRoute>} />
                      <Route path="inbox" element={<ProtectedRoute module={MEMBER_MODULES.MEMBER_INBOX} moduleType="member"><MemberInbox /></ProtectedRoute>} />
                      <Route path="applications" element={<ProtectedRoute module={MEMBER_MODULES.MEMBER_APPLICATIONS} moduleType="member"><MemberApplications /></ProtectedRoute>} />
                      <Route path="orders" element={<ProtectedRoute module={MEMBER_MODULES.MEMBER_ORDERS} moduleType="member"><MemberOrders /></ProtectedRoute>} />
                      <Route path="membership" element={<ProtectedRoute module={MEMBER_MODULES.MEMBER_MEMBERSHIP} moduleType="member"><MemberMembership /></ProtectedRoute>} />
                      <Route path="profile" element={<ProtectedRoute module={MEMBER_MODULES.MEMBER_PROFILE} moduleType="member"><MemberProfile /></ProtectedRoute>} />
                    </Route>
                    <Route path="/no-access" element={<NoAccess />} />
                    <Route path="/rock-identification" element={<RockIdentification />} />
                    <Route path="/rocks/:slug" element={<RockDetails />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/vendors" element={<Vendors />} />
                    <Route path="/vendors/:slug" element={<VendorDetails />} />
                    <Route path="/application/:slug" element={<ApplicationDetails />} />
                    <Route path="/blog" element={<Blogs />} />
                    <Route path="/blog/:slug" element={<BlogDetails />} />
                    <Route path="/jobs" element={<Jobs />} />
                    <Route path="/search" element={<Search />} />
                    <Route path="/calendar" element={<Calendar />} />
                    <Route path="/donation" element={<Donations />} />
                    <Route path="/donation/:slug" element={<DonationDetails />} />
                    <Route path="/raffles" element={<Raffles />} />
                    <Route path="/raffles/:slug" element={<RaffleDetails />} />
                    <Route path="/newsletter" element={<Newsletters />} />
                    <Route path="/newsletter/:slug" element={<NewsletterDetails />} />
                    <Route path="/images" element={<Images />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                </WorkflowProvider>
                </ErrorBoundary>
              </BrowserRouter>
            </TooltipProvider>
          </CartProvider>
          </ImpersonationProvider>
        </QueryClientProvider>
        </ThemeProvider>
      </ClerkProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <ImpersonationProvider>
        <CartProvider>
          <TooltipProvider>
            <ImpersonationBanner />
            <Toaster />
            <Sonner />
            <RateLimitIndicator />
            <BrowserRouter>
              <ClarityTracker />
              <ErrorBoundary>
              <WorkflowProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/sign-in" element={<SignIn />} />
              <Route path="/sign-up" element={<SignUp />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/guest-dashboard" element={<GuestDashboard />} />
              <Route path="/vendor-dashboard" element={<VendorDashboard />} />
              <Route path="/contributor-dashboard" element={<ContributorDashboard />} />
              <Route path="/event" element={<Events />} />
              <Route path="/event/:slug" element={<EventDetails />} />
              <Route path="/classes" element={<Classes />} />
              <Route path="/classes/:slug" element={<ClassDetails />} />
              <Route path="/memberships" element={<Memberships />} />
              <Route path="/memberships/:slug" element={<MembershipDetails />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout/success" element={<CheckoutSuccess />} />
              <Route path="/checkout/cancel" element={<CheckoutCancel />} />
              <Route path="/order-history" element={<OrderHistory />} />
              <Route path="/member-portal" element={<MemberPortalLayout />}>
                <Route index element={<ProtectedRoute module={MEMBER_MODULES.MEMBER_DASHBOARD} moduleType="member"><MemberDashboard /></ProtectedRoute>} />
                <Route path="inbox" element={<ProtectedRoute module={MEMBER_MODULES.MEMBER_INBOX} moduleType="member"><MemberInbox /></ProtectedRoute>} />
                <Route path="applications" element={<ProtectedRoute module={MEMBER_MODULES.MEMBER_APPLICATIONS} moduleType="member"><MemberApplications /></ProtectedRoute>} />
                <Route path="orders" element={<ProtectedRoute module={MEMBER_MODULES.MEMBER_ORDERS} moduleType="member"><MemberOrders /></ProtectedRoute>} />
                <Route path="membership" element={<ProtectedRoute module={MEMBER_MODULES.MEMBER_MEMBERSHIP} moduleType="member"><MemberMembership /></ProtectedRoute>} />
                <Route path="profile" element={<ProtectedRoute module={MEMBER_MODULES.MEMBER_PROFILE} moduleType="member"><MemberProfile /></ProtectedRoute>} />
              </Route>
              <Route path="/no-access" element={<NoAccess />} />
              <Route path="/rock-identification" element={<RockIdentification />} />
              <Route path="/rocks/:slug" element={<RockDetails />} />
              <Route path="/about" element={<About />} />
              <Route path="/vendors" element={<Vendors />} />
              <Route path="/vendors/:slug" element={<VendorDetails />} />
              <Route path="/application/:slug" element={<ApplicationDetails />} />
              <Route path="/blog" element={<Blogs />} />
              <Route path="/blog/:slug" element={<BlogDetails />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/search" element={<Search />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/donation" element={<Donations />} />
              <Route path="/donation/:slug" element={<DonationDetails />} />
              <Route path="/raffles" element={<Raffles />} />
              <Route path="/raffles/:slug" element={<RaffleDetails />} />
              <Route path="/newsletter" element={<Newsletters />} />
              <Route path="/newsletter/:slug" element={<NewsletterDetails />} />
              <Route path="/images" element={<Images />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
              </Suspense>
              </WorkflowProvider>
              </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
        </CartProvider>
      </ImpersonationProvider>
    </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;