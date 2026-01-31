import { LayoutDashboard, ShoppingCart, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  visibleTabs?: string[];
}

const navItems = [
  { value: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { value: "orders", label: "Orders", icon: ShoppingCart },
  { value: "members", label: "Members", icon: Users },
  { value: "settings", label: "Settings", icon: Settings },
];

export function AdminBottomNav({ activeTab, onTabChange, visibleTabs }: AdminBottomNavProps) {
  // Filter items based on visibility (permissions)
  const filteredItems = visibleTabs 
    ? navItems.filter(item => visibleTabs.includes(item.value))
    : navItems;

  if (filteredItems.length === 0) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {filteredItems.map((item) => {
          const isActive = activeTab === item.value;
          return (
            <button
              key={item.value}
              onClick={() => onTabChange(item.value)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full px-2 py-2 gap-1 touch-manipulation transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span className={cn(
                "text-xs font-medium truncate max-w-full",
                isActive && "text-primary"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
