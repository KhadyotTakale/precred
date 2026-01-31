import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Button } from '@/components/ui/button';
import { X, Eye, UserCog } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function ImpersonationBanner() {
  const { state, exitImpersonation } = useImpersonation();

  if (!state.isActive) return null;

  const getModeLabel = () => {
    if (state.mode === 'role') {
      return `Previewing as: ${state.previewRole}`;
    }
    if (state.mode === 'member' && state.impersonatedMember) {
      const memberName = state.impersonatedMember._customers?.Full_name || 'Unknown Member';
      const memberRole = state.impersonatedMember.role || 'No role';
      return `Viewing as: ${memberName} (${memberRole})`;
    }
    return 'Impersonation Active';
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-3">
        {state.mode === 'role' ? (
          <UserCog className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
        <span className="font-medium text-sm">{getModeLabel()}</span>
        <Badge variant="outline" className="bg-amber-600/20 border-amber-700 text-amber-950 text-xs">
          {state.mode === 'role' ? 'Role Preview' : 'Member View'}
        </Badge>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={exitImpersonation}
        className="h-7 px-2 text-amber-950 hover:bg-amber-600 hover:text-amber-950"
      >
        <X className="h-4 w-4 mr-1" />
        Exit
      </Button>
    </div>
  );
}
