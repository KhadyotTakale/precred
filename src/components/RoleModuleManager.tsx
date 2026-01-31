import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, Store, Edit3, UserCircle, Save, RotateCcw, GraduationCap, LayoutDashboard, Settings, Loader2, Newspaper } from "lucide-react";
import { 
  MEMBER_MODULES, 
  ADMIN_MODULES, 
  MemberModule, 
  AdminModule, 
  Role,
  RoleModuleMappings,
  updateRoleModuleAccess,
  getDefaultRoleModuleMappings,
} from "@/lib/role-permissions";
import { adminAPI } from "@/lib/admin-api";

const MEMBER_MODULE_LABELS: Record<MemberModule, { label: string; description: string }> = {
  [MEMBER_MODULES.MEMBER_DASHBOARD]: { label: "Dashboard", description: "Main member dashboard" },
  [MEMBER_MODULES.MEMBER_INBOX]: { label: "Inbox", description: "Messages and notifications" },
  [MEMBER_MODULES.MEMBER_APPLICATIONS]: { label: "Applications", description: "View submitted applications" },
  [MEMBER_MODULES.MEMBER_ORDERS]: { label: "Orders", description: "Order history" },
  [MEMBER_MODULES.MEMBER_MEMBERSHIP]: { label: "Membership", description: "Membership management" },
  [MEMBER_MODULES.MEMBER_PROFILE]: { label: "Profile", description: "Profile settings" },
};

const ADMIN_MODULE_LABELS: Record<AdminModule, { label: string; description: string }> = {
  [ADMIN_MODULES.ADMIN_DASHBOARD]: { label: "Dashboard", description: "Analytics overview" },
  [ADMIN_MODULES.ADMIN_EVENTS]: { label: "Events", description: "Manage events" },
  [ADMIN_MODULES.ADMIN_CLASSES]: { label: "Classes", description: "Manage classes" },
  [ADMIN_MODULES.ADMIN_VENDORS]: { label: "Vendors", description: "Manage vendors" },
  [ADMIN_MODULES.ADMIN_SPONSORS]: { label: "Sponsors", description: "Manage sponsors" },
  [ADMIN_MODULES.ADMIN_APPLICATIONS]: { label: "Applications", description: "Review applications" },
  [ADMIN_MODULES.ADMIN_MEMBERS]: { label: "Members", description: "Manage members" },
  [ADMIN_MODULES.ADMIN_LEADS]: { label: "Leads", description: "Manage leads" },
  [ADMIN_MODULES.ADMIN_ORDERS]: { label: "Orders", description: "View all orders" },
  [ADMIN_MODULES.ADMIN_TASKS]: { label: "Tasks", description: "Manage tasks" },
  [ADMIN_MODULES.ADMIN_DONATIONS]: { label: "Donations", description: "Manage donations" },
  [ADMIN_MODULES.ADMIN_MARKETING]: { label: "Marketing", description: "Email campaigns" },
  [ADMIN_MODULES.ADMIN_RAFFLES]: { label: "Raffles", description: "Manage raffles" },
  [ADMIN_MODULES.ADMIN_COMMUNICATIONS]: { label: "Communications", description: "Member communications" },
  [ADMIN_MODULES.ADMIN_NEWSLETTER]: { label: "Newsletter", description: "Newsletter management" },
  [ADMIN_MODULES.ADMIN_BLOGS]: { label: "Blogs", description: "Write and publish blog posts" },
  [ADMIN_MODULES.ADMIN_IMAGES]: { label: "Images", description: "Media library" },
  [ADMIN_MODULES.ADMIN_AUTOMATIONS]: { label: "Automations", description: "Workflow automations" },
  [ADMIN_MODULES.ADMIN_SETTINGS]: { label: "Settings", description: "System settings" },
  [ADMIN_MODULES.ADMIN_STATUS_MANAGER]: { label: "Status Manager", description: "Configure custom statuses" },
};

const ROLE_CONFIG: Record<Role, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  admin: { label: "Admin", icon: Shield, color: "bg-red-500/10 text-red-600 border-red-200" },
  member: { label: "Member", icon: Users, color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  vendor: { label: "Vendor", icon: Store, color: "bg-green-500/10 text-green-600 border-green-200" },
  contributor: { label: "Contributor", icon: Edit3, color: "bg-purple-500/10 text-purple-600 border-purple-200" },
  instructor: { label: "Instructor", icon: GraduationCap, color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  guest: { label: "Guest", icon: UserCircle, color: "bg-gray-500/10 text-gray-600 border-gray-200" },
  newsletter: { label: "Newsletter", icon: Newspaper, color: "bg-cyan-500/10 text-cyan-600 border-cyan-200" },
};

const ROLES: Role[] = ['admin', 'member', 'vendor', 'contributor', 'instructor', 'guest', 'newsletter'];
const ALL_MEMBER_MODULES = Object.values(MEMBER_MODULES);
const ALL_ADMIN_MODULES = Object.values(ADMIN_MODULES);

export const RoleModuleManager = () => {
  const { toast } = useToast();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [memberModuleAccess, setMemberModuleAccess] = useState<Record<Role, MemberModule[]>>(
    getDefaultRoleModuleMappings().memberModuleAccess
  );
  const [adminModuleAccess, setAdminModuleAccess] = useState<Record<Role, AdminModule[]>>(
    getDefaultRoleModuleMappings().adminModuleAccess
  );
  const [hasChanges, setHasChanges] = useState(false);

  // Load saved mappings from shop settings on mount
  useEffect(() => {
    const loadSavedMappings = async () => {
      if (!user?.id) return;
      
      try {
        setIsLoading(true);
        const shopData = await adminAPI.getShop(user.id);
        const savedMappings = shopData._shop_info?.shops_settings?.role_module_mappings;
        
        if (savedMappings) {
          const parsedMappings: RoleModuleMappings = typeof savedMappings === 'string' 
            ? JSON.parse(savedMappings) 
            : savedMappings;
          
          // Ensure admin role always has full access to all modules
          const memberAccess = {
            ...parsedMappings.memberModuleAccess,
            admin: Object.values(MEMBER_MODULES), // Force admin to have all member modules
          };
          const adminAccess = {
            ...parsedMappings.adminModuleAccess,
            admin: Object.values(ADMIN_MODULES), // Force admin to have all admin modules
          };
          
          setMemberModuleAccess(memberAccess);
          setAdminModuleAccess(adminAccess);
          
          // Apply to in-memory access control with admin overrides
          updateRoleModuleAccess({
            memberModuleAccess: memberAccess,
            adminModuleAccess: adminAccess,
          });
        }
      } catch (error) {
        console.error('Failed to load role-module mappings:', error);
        toast({
          title: "Error",
          description: "Failed to load saved permissions. Using defaults.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedMappings();
  }, [user?.id]);

  const toggleMemberModuleAccess = (role: Role, module: MemberModule) => {
    setMemberModuleAccess(prev => {
      const currentModules = prev[role] || [];
      const hasModule = currentModules.includes(module);
      const newModules = hasModule
        ? currentModules.filter(m => m !== module)
        : [...currentModules, module];
      return { ...prev, [role]: newModules };
    });
    setHasChanges(true);
  };

  const toggleAdminModuleAccess = (role: Role, module: AdminModule) => {
    setAdminModuleAccess(prev => {
      const currentModules = prev[role] || [];
      const hasModule = currentModules.includes(module);
      const newModules = hasModule
        ? currentModules.filter(m => m !== module)
        : [...currentModules, module];
      return { ...prev, [role]: newModules };
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to save settings.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      
      // Ensure admin role always has full access before saving
      const mappings: RoleModuleMappings = {
        memberModuleAccess: {
          ...memberModuleAccess,
          admin: Object.values(MEMBER_MODULES),
        },
        adminModuleAccess: {
          ...adminModuleAccess,
          admin: Object.values(ADMIN_MODULES),
        },
      };

      // Save to API via PATCH /shop_info (admin API)
      await adminAPI.updateShopInfo(user.id, {
        role_module_mappings: mappings,
      });

      // Update in-memory permissions
      updateRoleModuleAccess(mappings);

      toast({
        title: "Settings Saved",
        description: "Role-module mappings have been saved successfully.",
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save role-module mappings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const defaults = getDefaultRoleModuleMappings();
    setMemberModuleAccess(defaults.memberModuleAccess);
    setAdminModuleAccess(defaults.adminModuleAccess);
    setHasChanges(true);
    toast({
      title: "Settings Reset",
      description: "Role-module mappings have been reset to defaults. Click Save to persist.",
    });
  };

  const renderModuleGrid = (
    modules: readonly string[],
    labels: Record<string, { label: string; description: string }>,
    accessMap: Record<Role, string[]>,
    toggleFn: (role: Role, module: any) => void,
    role: Role
  ) => {
    const accessibleModules = accessMap[role] || [];
    const isAdmin = role === 'admin';

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {modules.map(module => {
          const moduleConfig = labels[module];
          const isChecked = accessibleModules.includes(module);

          return (
            <label
              key={module}
              className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                isChecked 
                  ? 'bg-primary/5 border-primary/30' 
                  : 'bg-muted/30 border-border hover:bg-muted/50'
              } ${isAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <Checkbox
                checked={isChecked}
                onCheckedChange={() => !isAdmin && toggleFn(role, module)}
                disabled={isAdmin}
                className="mt-0.5"
              />
              <div className="space-y-0.5 min-w-0">
                <div className="font-medium truncate">{moduleConfig?.label || module}</div>
                <div className="text-xs text-muted-foreground truncate">{moduleConfig?.description}</div>
              </div>
            </label>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading permissions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Role Permissions</h2>
          <p className="text-muted-foreground">Configure module access for each role</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={isSaving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="admin-modules" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="admin-modules" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Admin Dashboard Modules
          </TabsTrigger>
          <TabsTrigger value="member-modules" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Member Portal Modules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="admin-modules" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Admin Dashboard Access by Role</CardTitle>
              <CardDescription>
                Configure which admin modules each role can access. Admin role has full access.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {ROLES.map(role => {
                const config = ROLE_CONFIG[role];
                const Icon = config.icon;
                const accessibleModules = adminModuleAccess[role] || [];

                return (
                  <div key={role} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${config.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{config.label}</span>
                        <Badge variant="secondary" className="text-xs">
                          {accessibleModules.length}/{ALL_ADMIN_MODULES.length}
                        </Badge>
                      </div>
                      {role === 'admin' && (
                        <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
                          Full Access
                        </Badge>
                      )}
                    </div>
                    {renderModuleGrid(
                      ALL_ADMIN_MODULES,
                      ADMIN_MODULE_LABELS,
                      adminModuleAccess,
                      toggleAdminModuleAccess,
                      role
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="member-modules" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Member Portal Access by Role</CardTitle>
              <CardDescription>
                Configure which member portal modules each role can access.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {ROLES.map(role => {
                const config = ROLE_CONFIG[role];
                const Icon = config.icon;
                const accessibleModules = memberModuleAccess[role] || [];

                return (
                  <div key={role} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${config.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{config.label}</span>
                        <Badge variant="secondary" className="text-xs">
                          {accessibleModules.length}/{ALL_MEMBER_MODULES.length}
                        </Badge>
                      </div>
                      {role === 'admin' && (
                        <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
                          Full Access
                        </Badge>
                      )}
                    </div>
                    {renderModuleGrid(
                      ALL_MEMBER_MODULES,
                      MEMBER_MODULE_LABELS,
                      memberModuleAccess,
                      toggleMemberModuleAccess,
                      role
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Access Matrix Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Access Matrix Overview</CardTitle>
          <CardDescription>Quick view of all role-module permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="admin-matrix">
            <TabsList>
              <TabsTrigger value="admin-matrix">Admin Modules</TabsTrigger>
              <TabsTrigger value="member-matrix">Member Modules</TabsTrigger>
            </TabsList>
            
            <TabsContent value="admin-matrix" className="mt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">Module</th>
                      {ROLES.map(role => (
                        <th key={role} className="text-center py-2 px-2 font-medium">
                          <Badge variant="outline" className={`${ROLE_CONFIG[role].color} text-xs`}>
                            {ROLE_CONFIG[role].label}
                          </Badge>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ALL_ADMIN_MODULES.map(module => (
                      <tr key={module} className="border-b last:border-0">
                        <td className="py-2 px-3">{ADMIN_MODULE_LABELS[module]?.label}</td>
                        {ROLES.map(role => (
                          <td key={role} className="text-center py-2 px-2">
                            {(adminModuleAccess[role] || []).includes(module) ? (
                              <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
                            ) : (
                              <span className="inline-block w-3 h-3 rounded-full bg-muted" />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="member-matrix" className="mt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">Module</th>
                      {ROLES.map(role => (
                        <th key={role} className="text-center py-2 px-2 font-medium">
                          <Badge variant="outline" className={`${ROLE_CONFIG[role].color} text-xs`}>
                            {ROLE_CONFIG[role].label}
                          </Badge>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ALL_MEMBER_MODULES.map(module => (
                      <tr key={module} className="border-b last:border-0">
                        <td className="py-2 px-3">{MEMBER_MODULE_LABELS[module]?.label}</td>
                        {ROLES.map(role => (
                          <td key={role} className="text-center py-2 px-2">
                            {(memberModuleAccess[role] || []).includes(module) ? (
                              <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
                            ) : (
                              <span className="inline-block w-3 h-3 rounded-full bg-muted" />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};