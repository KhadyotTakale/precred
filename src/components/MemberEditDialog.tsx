import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useUser } from "@clerk/clerk-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { adminAPI, type Customer } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Shield, UserCog, Crown, ShieldAlert, Users, Store, PenTool, User, Loader2 } from "lucide-react";

const memberSchema = z.object({
  role: z.string().nullable(),
  status: z.string(),
  block_deny_access: z.boolean(),
  is_manager: z.boolean(),
  is_owner: z.boolean(),
});

type MemberFormValues = z.infer<typeof memberSchema>;

interface MemberEditDialogProps {
  member: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  franchisorId?: number;
}

// Role configuration with icons and descriptions
const ROLE_CONFIG = {
  admin: {
    label: "Admin",
    icon: Shield,
    color: "bg-red-500/10 text-red-600 border-red-500/20",
    description: "Full system access",
  },
  member: {
    label: "Member",
    icon: Users,
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    description: "Member portal access",
  },
  vendor: {
    label: "Vendor",
    icon: Store,
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    description: "Vendor dashboard access",
  },
  contributor: {
    label: "Contributor",
    icon: PenTool,
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    description: "Content submission access",
  },
  instructor: {
    label: "Instructor",
    icon: UserCog,
    color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    description: "Class teaching access",
  },
  guest: {
    label: "Guest",
    icon: User,
    color: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    description: "Limited access",
  },
};

export function MemberEditDialog({ member, open, onOpenChange, onSuccess, franchisorId }: MemberEditDialogProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [isUpdatingManager, setIsUpdatingManager] = useState(false);

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      role: null,
      status: "Offline",
      block_deny_access: false,
      is_manager: false,
      is_owner: false,
    },
  });

  useEffect(() => {
    if (member) {
      form.reset({
        role: member.role || null,
        status: member.status || "Offline",
        block_deny_access: member.block_deny_access || false,
        is_manager: member.is_manager || false,
        is_owner: member.is_owner || false,
      });
    }
  }, [member, form]);

  const handleManagerToggle = async (checked: boolean) => {
    if (!user?.id || !member || !franchisorId) {
      toast({
        title: "Error",
        description: "Missing required data to update manager status",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingManager(true);
    try {
      const customerId = member._customers?.id || member.id;
      if (checked) {
        await adminAPI.updateFranchisorManager(franchisorId, customerId, user.id);
      } else {
        await adminAPI.deleteFranchisorManager(franchisorId, customerId, user.id);
      }
      form.setValue('is_manager', checked);
      toast({
        title: "Success",
        description: `Manager status ${checked ? 'enabled' : 'disabled'} successfully`,
      });
      onSuccess();
    } catch (error) {
      console.error("Failed to update manager status:", error);
      toast({
        title: "Error",
        description: "Failed to update manager status",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingManager(false);
    }
  };

  const onSubmit = async (data: MemberFormValues) => {
    if (!user?.id || !member) return;

    try {
      const customerId = member._customers?.id || member.id;
      await adminAPI.updateCustomerInfo(
        customerId,
        {
          role: data.role,
          status: data.status,
          block_deny_access: data.block_deny_access,
        },
        user.id
      );

      toast({
        title: "Success",
        description: "Member information updated successfully",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update member:", error);
      toast({
        title: "Error",
        description: "Failed to update member information",
        variant: "destructive",
      });
    }
  };

  if (!member) return null;

  const watchedRole = form.watch("role");
  const watchedIsManager = form.watch("is_manager");
  const watchedIsOwner = form.watch("is_owner");
  const currentRoleConfig = ROLE_CONFIG[(watchedRole as keyof typeof ROLE_CONFIG) || 'guest'] || ROLE_CONFIG.guest;
  const RoleIcon = currentRoleConfig.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Edit Member: {member._customers?.Full_name || 'Unknown'}
          </DialogTitle>
          <DialogDescription>
            Update member role, status, and permissions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Member Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Email:</span>
              <p className="font-medium">{member._customers?.email || ''}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Member ID:</span>
              <p className="font-mono text-xs">{member.id}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Member Since:</span>
              <p>{new Date(member._customers?.created_at || member.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Online Status:</span>
              <Badge variant={member._customers?.is_online_now ? "default" : "secondary"} className="ml-2">
                {member._customers?.is_online_now ? "Online" : "Offline"}
              </Badge>
            </div>
          </div>

          {/* Current Role Badge */}
          <div className={`flex items-center justify-between p-3 rounded-lg border-2 ${currentRoleConfig.color}`}>
            <div className="flex items-center gap-2">
              <RoleIcon className="h-4 w-4" />
              <span className="font-medium">{currentRoleConfig.label}</span>
              <span className="text-xs text-muted-foreground">- {currentRoleConfig.description}</span>
            </div>
            <div className="flex gap-2">
              {watchedIsManager && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs">
                  <UserCog className="h-3 w-3 mr-1" />
                  Manager
                </Badge>
              )}
              {watchedIsOwner && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 text-xs">
                  <Crown className="h-3 w-3 mr-1" />
                  Owner
                </Badge>
              )}
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Role</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>Guest (No Role)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="member">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-500" />
                            <span>Member</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="vendor">
                          <div className="flex items-center gap-2">
                            <Store className="h-4 w-4 text-emerald-500" />
                            <span>Vendor</span>
                          </div>
                        </SelectItem>
                        {watchedIsManager && (
                          <>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-red-500" />
                                <span>Admin</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="contributor">
                              <div className="flex items-center gap-2">
                                <PenTool className="h-4 w-4 text-purple-500" />
                                <span>Contributor</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="instructor">
                              <div className="flex items-center gap-2">
                                <UserCog className="h-4 w-4 text-orange-500" />
                                <span>Instructor</span>
                              </div>
                            </SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Manager & Owner Permissions - Side by side */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="is_manager"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-amber-500/5 border-amber-500/20">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm flex items-center gap-1">
                          <UserCog className="h-3 w-3 text-amber-600" />
                          Manager
                        </FormLabel>
                      </div>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          {isUpdatingManager && <Loader2 className="h-3 w-3 animate-spin" />}
                          <Switch
                            checked={field.value}
                            onCheckedChange={handleManagerToggle}
                            disabled={isUpdatingManager || !franchisorId || watchedRole === 'vendor'}
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_owner"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-yellow-500/5 border-yellow-500/20 opacity-60">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm flex items-center gap-1">
                          <Crown className="h-3 w-3 text-yellow-600" />
                          Owner
                        </FormLabel>
                        <FormDescription className="text-xs">
                          Cannot be changed
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          disabled={true}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Online">Online</SelectItem>
                        <SelectItem value="Offline">Offline</SelectItem>
                        <SelectItem value="Away">Away</SelectItem>
                        <SelectItem value="Busy">Busy</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="block_deny_access"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 border-destructive bg-destructive/5">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm text-destructive">Block Access</FormLabel>
                      <FormDescription className="text-xs">
                        Block this member from accessing the system
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
