import { useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate, Outlet } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import { MemberSidebar } from "@/components/MemberSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SidebarSwipeHandler } from "@/components/SidebarSwipeHandler";
import { SwipeHint } from "@/components/SwipeHint";
import { DarkModeToggle } from "@/components/DarkModeToggle";

const MemberPortalLayout = () => {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && !user) {
      navigate('/sign-in');
    }
  }, [isLoaded, user, navigate]);

  if (!isLoaded || !user) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Member Portal - Tampa Bay Mineral and Science Club</title>
        <meta name="description" content="Access your member dashboard, orders, and profile" />
        <link rel="canonical" href={`${window.location.origin}/member-portal`} />
        
        {/* Open Graph */}
        <meta property="og:title" content="Member Portal - Tampa Bay Mineral and Science Club" />
        <meta property="og:description" content="Access your member dashboard, orders, and profile" />
        <meta property="og:url" content={`${window.location.origin}/member-portal`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${window.location.origin}/club-logo-new.png`} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Member Portal - Tampa Bay Mineral and Science Club" />
        <meta name="twitter:description" content="Access your member dashboard, orders, and profile" />
        <meta name="twitter:image" content={`${window.location.origin}/club-logo-new.png`} />
      </Helmet>
      
      <Navbar />
      
      <SidebarProvider defaultOpen={true}>
        <SidebarSwipeHandler />
        <SwipeHint />
        <div className="flex min-h-screen w-full pt-20">
          <MemberSidebar />
          
          <main className="flex-1 bg-background">
            <header className="h-12 flex items-center justify-between border-b bg-card/50 backdrop-blur-sm sticky top-20 z-10 px-4">
              <SidebarTrigger />
              <DarkModeToggle />
            </header>
            
            <div className="p-6">
              <Outlet />
            </div>
          </main>
        </div>
      </SidebarProvider>
    </>
  );
};

export default MemberPortalLayout;
