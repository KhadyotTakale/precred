import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { ElegantCustomer } from '@/lib/elegant-api';
import { Customer } from '@/lib/admin-api';
import { Role } from '@/lib/role-permissions';

interface ImpersonationState {
  isActive: boolean;
  mode: 'role' | 'member' | null;
  previewRole: Role | null;
  impersonatedMember: Customer | null;
}

interface ImpersonationContextType {
  state: ImpersonationState;
  // Role preview mode
  startRolePreview: (role: Role) => void;
  // Member impersonation mode
  startMemberImpersonation: (member: Customer) => void;
  // Exit any impersonation
  exitImpersonation: () => void;
  // Get effective role (impersonated or real)
  getEffectiveRole: (realRole: Role | undefined) => Role | undefined;
  // Get effective customer ID for API filtering
  getEffectiveCustomerId: (realCustomerId: string | undefined) => string | undefined;
}

const defaultState: ImpersonationState = {
  isActive: false,
  mode: null,
  previewRole: null,
  impersonatedMember: null,
};

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ImpersonationState>(defaultState);

  const startRolePreview = useCallback((role: Role) => {
    setState({
      isActive: true,
      mode: 'role',
      previewRole: role,
      impersonatedMember: null,
    });
  }, []);

  const startMemberImpersonation = useCallback((member: Customer) => {
    setState({
      isActive: true,
      mode: 'member',
      previewRole: null,
      impersonatedMember: member,
    });
  }, []);

  const exitImpersonation = useCallback(() => {
    setState(defaultState);
  }, []);

  const getEffectiveRole = useCallback((realRole: Role | undefined): Role | undefined => {
    if (!state.isActive) return realRole;
    
    if (state.mode === 'role' && state.previewRole) {
      return state.previewRole;
    }
    
    if (state.mode === 'member' && state.impersonatedMember) {
      return (state.impersonatedMember.role as Role) || 'guest';
    }
    
    return realRole;
  }, [state]);

  const getEffectiveCustomerId = useCallback((realCustomerId: string | undefined): string | undefined => {
    if (!state.isActive) return realCustomerId;
    
    if (state.mode === 'member' && state.impersonatedMember) {
      return state.impersonatedMember.customers_id;
    }
    
    // For role preview, still use real customer ID for API calls
    return realCustomerId;
  }, [state]);

  return (
    <ImpersonationContext.Provider
      value={{
        state,
        startRolePreview,
        startMemberImpersonation,
        exitImpersonation,
        getEffectiveRole,
        getEffectiveCustomerId,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
}
