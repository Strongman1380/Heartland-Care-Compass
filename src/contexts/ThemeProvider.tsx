import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "heartland-theme",
  enableSystem = true,
  disableTransitionOnChange = false,
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  useEffect(() => {
    const storedTheme = localStorage.getItem(storageKey) as Theme | null;
    if (storedTheme) {
      setTheme(storedTheme);
    }
  }, [storageKey]);

  useEffect(() => {
    const root = window.document.documentElement;

    if (disableTransitionOnChange) {
      root.style.setProperty("transition", "none");
    }

    root.classList.remove("light", "dark");

    let cleanup: (() => void) | undefined;

    if (theme === "system" && enableSystem) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const applySystemTheme = () => {
        root.classList.remove("light", "dark");
        root.classList.add(mq.matches ? "dark" : "light");
      };
      applySystemTheme();
      mq.addEventListener("change", applySystemTheme);
      cleanup = () => mq.removeEventListener("change", applySystemTheme);
    } else if (theme === "system") {
      root.classList.add("light");
    } else {
      root.classList.add(theme);
    }

    if (disableTransitionOnChange) {
      void root.offsetHeight;
      root.style.removeProperty("transition");
    }

    localStorage.setItem(storageKey, theme);

    return cleanup;
  }, [theme, storageKey, disableTransitionOnChange, enableSystem]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
