import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { elegantAPI } from "@/lib/elegant-api";
import { Module, MemberModule, AdminModule, Role, hasModuleAccess, hasMemberModuleAccess, hasAdminModuleAccess } from "@/lib/role-permissions";
import { Skeleton } from "@/components/ui/skeleton";

interface ProtectedRouteProps {
  children: React.ReactNode;
  module: Module | MemberModule | AdminModule;
  requireAuth?: boolean;
  moduleType?: 'member' | 'admin' | 'general';
}

export const ProtectedRoute = ({ 
  children, 
  module, 
  requireAuth = true,
  moduleType = 'general' 
}: ProtectedRouteProps) => {
  const { user, isLoaded } = useUser();
  const location = useLocation();
  const [userRole, setUserRole] = useState<Role | undefined>(undefined);
  const [isLoadingRole, setIsLoadingRole] = useState(true);

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
      setIsLoadingRole(false);
    };

    if (isLoaded) {
      if (user) {
        fetchUserRole();
      } else {
        setIsLoadingRole(false);
      }
    }
  }, [isLoaded, user?.id]);

  // Show loading state
  if (!isLoaded || isLoadingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-full max-w-md p-8">
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  // Redirect to sign-in if auth required but not signed in, preserving current path
  if (requireAuth && !user) {
    const redirectPath = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/sign-in?redirect=${redirectPath}`} replace />;
  }

  // Check module access based on type
  let hasAccess = false;
  if (moduleType === 'member') {
    hasAccess = hasMemberModuleAccess(userRole, module as MemberModule);
  } else if (moduleType === 'admin') {
    hasAccess = hasAdminModuleAccess(userRole, module as AdminModule);
  } else {
    hasAccess = hasModuleAccess(userRole, module as Module);
  }

  if (!hasAccess) {
    return <Navigate to="/no-access" replace />;
  }

  return <>{children}</>;
};
