import { useState, useEffect } from "react";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const themes = [
  { name: "Emerald", value: "emerald", description: "Default mineral-inspired" },
  { name: "Ocean", value: "ocean", description: "Cool blues and aqua" },
  { name: "Sunset", value: "sunset", description: "Warm oranges and purples" },
  { name: "Forest", value: "forest", description: "Natural greens and browns" },
  { name: "Rose", value: "rose", description: "Elegant pinks and magentas" },
  { name: "Slate", value: "slate", description: "Professional grays" },
];

export function ThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = useState("emerald");

  useEffect(() => {
    const savedTheme = localStorage.getItem("color-theme") || "emerald";
    setCurrentTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (theme: string) => {
    const root = document.documentElement;
    
    // Remove all theme attributes
    themes.forEach(t => {
      root.removeAttribute(`data-theme`);
    });
    
    // Apply new theme (emerald is default, no data attribute needed)
    if (theme !== "emerald") {
      root.setAttribute("data-theme", theme);
    }
  };

  const handleThemeChange = (theme: string) => {
    setCurrentTheme(theme);
    localStorage.setItem("color-theme", theme);
    applyTheme(theme);
  };

  const currentThemeInfo = themes.find(t => t.value === currentTheme);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Choose color theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {themes.map((theme) => (
          <DropdownMenuItem
            key={theme.value}
            onClick={() => handleThemeChange(theme.value)}
            className={currentTheme === theme.value ? "bg-accent" : ""}
          >
            <div className="flex flex-col gap-1">
              <span className="font-medium">{theme.name}</span>
              <span className="text-xs text-muted-foreground">
                {theme.description}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
