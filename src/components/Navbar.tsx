import { Menu, Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useUser, UserButton } from "@clerk/clerk-react";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const Navbar = () => {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "Home", route: "/" },
    { label: "Admin", route: "/admin" },
  ];

  return (
    <nav className="fixed top-0 w-full z-50" style={{ backgroundColor: "transparent" }}>
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-xl font-bold text-slate-900">Precred</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {navItems.map((item) => (
              <Button
                key={item.label}
                variant="ghost"
                size="sm"
                onClick={() => navigate(item.route)}
                className="text-slate-600 hover:text-slate-900 hover:bg-white/50 rounded-xl"
              >
                {item.label}
              </Button>
            ))}
          </div>

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search something"
                className="w-52 pl-10 h-10 bg-slate-100 border-0 rounded-full text-sm"
              />
            </div>

            {/* Notifications */}
            <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm hover:shadow-md transition-shadow">
              <Bell className="h-5 w-5 text-slate-600" />
            </button>

            {/* User */}
            {user ? (
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "h-10 w-10 rounded-full"
                  }
                }}
              />
            ) : (
              <Button
                onClick={() => navigate("/sign-up")}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-6"
              >
                Sign Up
              </Button>
            )}
          </div>

          {/* Mobile Navigation */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="rounded-xl">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[280px]" style={{ backgroundColor: "#e8ebf7" }}>
              <div className="flex flex-col gap-2 mt-8">
                {navItems.map((item) => (
                  <Button
                    key={item.label}
                    variant="ghost"
                    className="w-full justify-start text-slate-700 hover:bg-white/50 rounded-xl"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate(item.route);
                    }}
                  >
                    {item.label}
                  </Button>
                ))}

                <div className="h-px bg-slate-200 my-4" />

                {user ? (
                  <div className="flex items-center gap-3 p-3">
                    <UserButton
                      appearance={{
                        elements: {
                          avatarBox: "h-10 w-10"
                        }
                      }}
                    />
                    <span className="text-sm text-slate-600">Account</span>
                  </div>
                ) : (
                  <Button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate("/sign-up");
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl"
                  >
                    Sign Up
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
