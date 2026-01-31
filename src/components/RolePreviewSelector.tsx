import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Role } from '@/lib/role-permissions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Shield, User, Store, Mic, GraduationCap, UserCheck, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ROLES: { value: Role; label: string; icon: React.ReactNode }[] = [
  { value: 'admin', label: 'Admin', icon: <Shield className="h-4 w-4" /> },
  { value: 'member', label: 'Member', icon: <User className="h-4 w-4" /> },
  { value: 'vendor', label: 'Vendor', icon: <Store className="h-4 w-4" /> },
  { value: 'contributor', label: 'Contributor', icon: <Mic className="h-4 w-4" /> },
  { value: 'instructor', label: 'Instructor', icon: <GraduationCap className="h-4 w-4" /> },
  { value: 'guest', label: 'Guest', icon: <UserCheck className="h-4 w-4" /> },
  { value: 'newsletter', label: 'Newsletter', icon: <Newspaper className="h-4 w-4" /> },
];

interface RolePreviewSelectorProps {
  currentRole: Role | undefined;
}

export function RolePreviewSelector({ currentRole }: RolePreviewSelectorProps) {
  const { state, startRolePreview, exitImpersonation } = useImpersonation();

  const handleRoleChange = (value: string) => {
    if (value === 'exit') {
      exitImpersonation();
    } else {
      startRolePreview(value as Role);
    }
  };

  const currentValue = state.isActive && state.mode === 'role' ? state.previewRole : '';

  return (
    <div className="flex items-center gap-2">
      <Eye className="h-4 w-4 text-muted-foreground" />
      <Select value={currentValue || ''} onValueChange={handleRoleChange}>
        <SelectTrigger className="w-[160px] h-8 text-sm">
          <SelectValue placeholder="Preview as role..." />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((role) => (
            <SelectItem 
              key={role.value} 
              value={role.value}
              disabled={role.value === currentRole && !state.isActive}
            >
              <div className="flex items-center gap-2">
                {role.icon}
                <span>{role.label}</span>
                {role.value === currentRole && !state.isActive && (
                  <span className="text-xs text-muted-foreground">(current)</span>
                )}
              </div>
            </SelectItem>
          ))}
          {state.isActive && state.mode === 'role' && (
            <SelectItem value="exit">
              <span className="text-destructive">Exit Preview</span>
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
