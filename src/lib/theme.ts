import { useEffect, useState } from "react";

export type ThemePref = "light" | "dark" | "system";
export const THEME_KEY = "ch-theme";

/** Runs before paint (inlined in <head>) so there is no flash of the wrong theme. */
export const THEME_BOOT_SCRIPT = `(function(){try{var p=localStorage.getItem('${THEME_KEY}')||'system';var d=p==='dark'||(p==='system'&&!window.matchMedia('(prefers-color-scheme: light)').matches);var r=document.documentElement;r.classList.toggle('light',!d);r.classList.toggle('dark',d);}catch(e){}})();`;

export function resolveTheme(pref: ThemePref): "light" | "dark" {
  if (pref !== "system") return pref;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyTheme(pref: ThemePref) {
  const mode = resolveTheme(pref);
  const root = document.documentElement;
  root.classList.add("theme-transition");
  root.classList.toggle("light", mode === "light");
  root.classList.toggle("dark", mode === "dark");
  window.setTimeout(() => root.classList.remove("theme-transition"), 250);
  window.dispatchEvent(new CustomEvent("ch-theme-change"));
}

export function getStoredTheme(): ThemePref {
  const v = localStorage.getItem(THEME_KEY);
  return v === "light" || v === "dark" ? v : "system";
}

export function setStoredTheme(pref: ThemePref) {
  localStorage.setItem(THEME_KEY, pref);
  applyTheme(pref);
}

/** Current resolved mode, kept in sync after hydration. */
export function useResolvedTheme() {
  const [mode, setMode] = useState<"light" | "dark">("dark");
  useEffect(() => {
    const read = () =>
      setMode(document.documentElement.classList.contains("light") ? "light" : "dark");
    read();
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onSys = () => {
      if (getStoredTheme() === "system") applyTheme("system");
    };
    window.addEventListener("ch-theme-change", read);
    mq.addEventListener("change", onSys);
    return () => {
      window.removeEventListener("ch-theme-change", read);
      mq.removeEventListener("change", onSys);
    };
  }, []);
  return mode;
}
