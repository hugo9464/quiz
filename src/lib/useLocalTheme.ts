import { useEffect, useState } from "react";
import type { Theme } from "./types";

// Thème propre à CET appareil (page Animer), persisté en localStorage.
// Contrairement au thème TV (stocké en base et partagé), il ne concerne que
// le téléphone/navigateur courant.
const KEY = "quiz-host-theme";

function read(): Theme {
  if (typeof localStorage === "undefined") return "dark";
  const v = localStorage.getItem(KEY);
  return v === "light" || v === "dark" ? v : "dark";
}

export function useLocalTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(read);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // Stockage indisponible (mode privé strict) : on ignore, le thème reste en mémoire.
    }
  }, [theme]);

  return [theme, setTheme];
}
