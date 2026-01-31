// Module definitions - each navigation menu item is a module

// Member Portal Modules
export const MEMBER_MODULES = {
  MEMBER_DASHBOARD: 'member-dashboard',
  MEMBER_INBOX: 'member-inbox',
  MEMBER_APPLICATIONS: 'member-applications',
  MEMBER_ORDERS: 'member-orders',
  MEMBER_MEMBERSHIP: 'member-membership',
  MEMBER_PROFILE: 'member-profile',
} as const;

// Admin Dashboard Modules
export const ADMIN_MODULES = {
  ADMIN_DASHBOARD: 'admin-dashboard-analytics',
  ADMIN_EVENTS: 'admin-events',
  ADMIN_CLASSES: 'admin-classes',
  ADMIN_VENDORS: 'admin-vendors',
  ADMIN_SPONSORS: 'admin-sponsors',
  ADMIN_APPLICATIONS: 'admin-applications',
  ADMIN_MEMBERS: 'admin-members',
  ADMIN_LEADS: 'admin-leads',
  ADMIN_ORDERS: 'admin-orders',
  ADMIN_TASKS: 'admin-tasks',
  ADMIN_DONATIONS: 'admin-donations',
  ADMIN_MARKETING: 'admin-marketing',
  ADMIN_RAFFLES: 'admin-raffles',
  ADMIN_COMMUNICATIONS: 'admin-communications',
  ADMIN_NEWSLETTER: 'admin-newsletter',
  ADMIN_BLOGS: 'admin-blogs',
  ADMIN_IMAGES: 'admin-images',
  ADMIN_AUTOMATIONS: 'admin-automations',
  ADMIN_SETTINGS: 'admin-settings',
  ADMIN_STATUS_MANAGER: 'admin-status-manager',
} as const;

// Combined modules for backward compatibility
export const MODULES = {
  ...MEMBER_MODULES,
  ...ADMIN_MODULES,
  VENDOR_DASHBOARD: 'vendor-dashboard',
  CONTRIBUTOR_DASHBOARD: 'contributor-dashboard',
} as const;

export type MemberModule = typeof MEMBER_MODULES[keyof typeof MEMBER_MODULES];
export type AdminModule = typeof ADMIN_MODULES[keyof typeof ADMIN_MODULES];
export type Module = typeof MODULES[keyof typeof MODULES];

// Role definitions - added instructor and newsletter roles
export type Role = 'admin' | 'member' | 'vendor' | 'contributor' | 'guest' | 'instructor' | 'newsletter';

// Role to Member Portal Module access mapping
export const ROLE_MEMBER_MODULE_ACCESS: Record<Role, MemberModule[]> = {
  admin: Object.values(MEMBER_MODULES),
  member: [
    MEMBER_MODULES.MEMBER_DASHBOARD,
    MEMBER_MODULES.MEMBER_INBOX,
    MEMBER_MODULES.MEMBER_APPLICATIONS,
    MEMBER_MODULES.MEMBER_ORDERS,
    MEMBER_MODULES.MEMBER_MEMBERSHIP,
    MEMBER_MODULES.MEMBER_PROFILE,
  ],
  vendor: [
    MEMBER_MODULES.MEMBER_DASHBOARD,
    MEMBER_MODULES.MEMBER_APPLICATIONS,
    MEMBER_MODULES.MEMBER_ORDERS,
    MEMBER_MODULES.MEMBER_PROFILE,
  ],
  contributor: [
    MEMBER_MODULES.MEMBER_DASHBOARD,
    MEMBER_MODULES.MEMBER_INBOX,
    MEMBER_MODULES.MEMBER_APPLICATIONS,
    MEMBER_MODULES.MEMBER_PROFILE,
  ],
  instructor: [
    MEMBER_MODULES.MEMBER_DASHBOARD,
    MEMBER_MODULES.MEMBER_INBOX,
    MEMBER_MODULES.MEMBER_APPLICATIONS,
    MEMBER_MODULES.MEMBER_ORDERS,
    MEMBER_MODULES.MEMBER_PROFILE,
  ],
  guest: [
    MEMBER_MODULES.MEMBER_DASHBOARD,
    MEMBER_MODULES.MEMBER_APPLICATIONS,
    MEMBER_MODULES.MEMBER_PROFILE,
  ],
  newsletter: [
    MEMBER_MODULES.MEMBER_DASHBOARD,
    MEMBER_MODULES.MEMBER_INBOX,
    MEMBER_MODULES.MEMBER_APPLICATIONS,
    MEMBER_MODULES.MEMBER_PROFILE,
  ],
};

// Role to Admin Dashboard Module access mapping
export const ROLE_ADMIN_MODULE_ACCESS: Record<Role, AdminModule[]> = {
  admin: Object.values(ADMIN_MODULES), // Admin has access to all
  member: [], // Members don't have admin access
  vendor: [], // Vendors don't have admin access
  contributor: [
    ADMIN_MODULES.ADMIN_DASHBOARD,
    ADMIN_MODULES.ADMIN_EVENTS,
    ADMIN_MODULES.ADMIN_CLASSES,
    ADMIN_MODULES.ADMIN_VENDORS,
    ADMIN_MODULES.ADMIN_SPONSORS,
    ADMIN_MODULES.ADMIN_DONATIONS,
    ADMIN_MODULES.ADMIN_RAFFLES,
    ADMIN_MODULES.ADMIN_NEWSLETTER,
    ADMIN_MODULES.ADMIN_BLOGS,
    ADMIN_MODULES.ADMIN_IMAGES,
  ],
  instructor: [
    ADMIN_MODULES.ADMIN_EVENTS,
    ADMIN_MODULES.ADMIN_CLASSES,
    ADMIN_MODULES.ADMIN_NEWSLETTER,
    ADMIN_MODULES.ADMIN_BLOGS,
    ADMIN_MODULES.ADMIN_IMAGES,
  ],
  guest: [], // Guests don't have admin access
  newsletter: [
    ADMIN_MODULES.ADMIN_NEWSLETTER,
    ADMIN_MODULES.ADMIN_BLOGS,
    ADMIN_MODULES.ADMIN_IMAGES,
  ], // Newsletter editors can access newsletter, blogs, and images
};

// Combined Role to Module access mapping (for backward compatibility)
export const ROLE_MODULE_ACCESS: Record<Role, Module[]> = {
  admin: [
    ...Object.values(MEMBER_MODULES),
    ...Object.values(ADMIN_MODULES),
    MODULES.ADMIN_DASHBOARD,
    MODULES.VENDOR_DASHBOARD,
    MODULES.CONTRIBUTOR_DASHBOARD,
  ],
  member: [
    MEMBER_MODULES.MEMBER_DASHBOARD,
    MEMBER_MODULES.MEMBER_INBOX,
    MEMBER_MODULES.MEMBER_APPLICATIONS,
    MEMBER_MODULES.MEMBER_ORDERS,
    MEMBER_MODULES.MEMBER_MEMBERSHIP,
    MEMBER_MODULES.MEMBER_PROFILE,
  ],
  vendor: [
    MEMBER_MODULES.MEMBER_DASHBOARD,
    MEMBER_MODULES.MEMBER_APPLICATIONS,
    MEMBER_MODULES.MEMBER_ORDERS,
    MEMBER_MODULES.MEMBER_PROFILE,
    MODULES.VENDOR_DASHBOARD,
  ],
  contributor: [
    MEMBER_MODULES.MEMBER_DASHBOARD,
    MEMBER_MODULES.MEMBER_INBOX,
    MEMBER_MODULES.MEMBER_APPLICATIONS,
    MEMBER_MODULES.MEMBER_PROFILE,
    MODULES.CONTRIBUTOR_DASHBOARD,
    ...ROLE_ADMIN_MODULE_ACCESS.contributor,
  ],
  instructor: [
    MEMBER_MODULES.MEMBER_DASHBOARD,
    MEMBER_MODULES.MEMBER_INBOX,
    MEMBER_MODULES.MEMBER_APPLICATIONS,
    MEMBER_MODULES.MEMBER_ORDERS,
    MEMBER_MODULES.MEMBER_PROFILE,
    ...ROLE_ADMIN_MODULE_ACCESS.instructor,
  ],
  guest: [
    MEMBER_MODULES.MEMBER_DASHBOARD,
    MEMBER_MODULES.MEMBER_APPLICATIONS,
    MEMBER_MODULES.MEMBER_PROFILE,
  ],
  newsletter: [
    MEMBER_MODULES.MEMBER_DASHBOARD,
    MEMBER_MODULES.MEMBER_INBOX,
    MEMBER_MODULES.MEMBER_APPLICATIONS,
    MEMBER_MODULES.MEMBER_PROFILE,
    ...ROLE_ADMIN_MODULE_ACCESS.newsletter,
  ],
};

// Helper function to check if a role has access to a module
export const hasModuleAccess = (role: Role | undefined, module: Module): boolean => {
  if (!role) return false;
  return ROLE_MODULE_ACCESS[role]?.includes(module) ?? false;
};

// Helper function to check if a role has access to an admin module
export const hasAdminModuleAccess = (role: Role | undefined, module: AdminModule): boolean => {
  if (!role) return false;
  return ROLE_ADMIN_MODULE_ACCESS[role]?.includes(module) ?? false;
};

// Helper function to check if a role has access to a member module
export const hasMemberModuleAccess = (role: Role | undefined, module: MemberModule): boolean => {
  if (!role) return false;
  return ROLE_MEMBER_MODULE_ACCESS[role]?.includes(module) ?? false;
};

// Helper function to get all accessible modules for a role
export const getAccessibleModules = (role: Role | undefined): Module[] => {
  if (!role) return [];
  return ROLE_MODULE_ACCESS[role] ?? [];
};

// Helper function to get all accessible admin modules for a role
export const getAccessibleAdminModules = (role: Role | undefined): AdminModule[] => {
  if (!role) return [];
  return ROLE_ADMIN_MODULE_ACCESS[role] ?? [];
};

// Helper function to get all accessible member modules for a role
export const getAccessibleMemberModules = (role: Role | undefined): MemberModule[] => {
  if (!role) return [];
  return ROLE_MEMBER_MODULE_ACCESS[role] ?? [];
};

// Check if role can access admin dashboard at all
export const canAccessAdminDashboard = (role: Role | undefined): boolean => {
  if (!role) return false;
  return ROLE_ADMIN_MODULE_ACCESS[role]?.length > 0;
};

// Interface for persisted role-module mappings
export interface RoleModuleMappings {
  memberModuleAccess: Record<Role, MemberModule[]>;
  adminModuleAccess: Record<Role, AdminModule[]>;
}

// Update in-memory access mappings (for applying saved settings)
export const updateRoleModuleAccess = (mappings: RoleModuleMappings): void => {
  Object.keys(mappings.memberModuleAccess).forEach(role => {
    (ROLE_MEMBER_MODULE_ACCESS as Record<Role, MemberModule[]>)[role as Role] = mappings.memberModuleAccess[role as Role];
  });
  Object.keys(mappings.adminModuleAccess).forEach(role => {
    (ROLE_ADMIN_MODULE_ACCESS as Record<Role, AdminModule[]>)[role as Role] = mappings.adminModuleAccess[role as Role];
  });
};

// Get current mappings for persistence
export const getCurrentRoleModuleMappings = (): RoleModuleMappings => ({
  memberModuleAccess: { ...ROLE_MEMBER_MODULE_ACCESS },
  adminModuleAccess: { ...ROLE_ADMIN_MODULE_ACCESS },
});

// Get default mappings
export const getDefaultRoleModuleMappings = (): RoleModuleMappings => ({
  memberModuleAccess: {
    admin: Object.values(MEMBER_MODULES),
    member: [
      MEMBER_MODULES.MEMBER_DASHBOARD,
      MEMBER_MODULES.MEMBER_INBOX,
      MEMBER_MODULES.MEMBER_APPLICATIONS,
      MEMBER_MODULES.MEMBER_ORDERS,
      MEMBER_MODULES.MEMBER_MEMBERSHIP,
      MEMBER_MODULES.MEMBER_PROFILE,
    ],
    vendor: [
      MEMBER_MODULES.MEMBER_DASHBOARD,
      MEMBER_MODULES.MEMBER_APPLICATIONS,
      MEMBER_MODULES.MEMBER_ORDERS,
      MEMBER_MODULES.MEMBER_PROFILE,
    ],
    contributor: [
      MEMBER_MODULES.MEMBER_DASHBOARD,
      MEMBER_MODULES.MEMBER_INBOX,
      MEMBER_MODULES.MEMBER_APPLICATIONS,
      MEMBER_MODULES.MEMBER_PROFILE,
    ],
    instructor: [
      MEMBER_MODULES.MEMBER_DASHBOARD,
      MEMBER_MODULES.MEMBER_INBOX,
      MEMBER_MODULES.MEMBER_APPLICATIONS,
      MEMBER_MODULES.MEMBER_ORDERS,
      MEMBER_MODULES.MEMBER_PROFILE,
    ],
    guest: [
      MEMBER_MODULES.MEMBER_DASHBOARD,
      MEMBER_MODULES.MEMBER_APPLICATIONS,
      MEMBER_MODULES.MEMBER_PROFILE,
    ],
    newsletter: [
      MEMBER_MODULES.MEMBER_DASHBOARD,
      MEMBER_MODULES.MEMBER_INBOX,
      MEMBER_MODULES.MEMBER_APPLICATIONS,
      MEMBER_MODULES.MEMBER_PROFILE,
    ],
  },
  adminModuleAccess: {
    admin: Object.values(ADMIN_MODULES),
    member: [],
    vendor: [],
    contributor: [
      ADMIN_MODULES.ADMIN_DASHBOARD,
      ADMIN_MODULES.ADMIN_EVENTS,
      ADMIN_MODULES.ADMIN_CLASSES,
      ADMIN_MODULES.ADMIN_VENDORS,
      ADMIN_MODULES.ADMIN_SPONSORS,
      ADMIN_MODULES.ADMIN_DONATIONS,
      ADMIN_MODULES.ADMIN_RAFFLES,
      ADMIN_MODULES.ADMIN_NEWSLETTER,
      ADMIN_MODULES.ADMIN_BLOGS,
      ADMIN_MODULES.ADMIN_IMAGES,
    ],
    instructor: [
      ADMIN_MODULES.ADMIN_EVENTS,
      ADMIN_MODULES.ADMIN_CLASSES,
      ADMIN_MODULES.ADMIN_NEWSLETTER,
      ADMIN_MODULES.ADMIN_BLOGS,
      ADMIN_MODULES.ADMIN_IMAGES,
    ],
    guest: [],
    newsletter: [
      ADMIN_MODULES.ADMIN_NEWSLETTER,
      ADMIN_MODULES.ADMIN_BLOGS,
      ADMIN_MODULES.ADMIN_IMAGES,
    ],
  },
});
