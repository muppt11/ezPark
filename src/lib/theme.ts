export type ThemePref = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_COOKIE = "theme";
const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Runs in <head> before first paint. Reads the saved preference from the cookie,
 * resolves "system" via prefers-color-scheme, and sets data-theme / data-theme-pref on <html>.
 * Kept as a string so it can be inlined; must stay dependency-free ES5.
 */
export const themeScript = `(function(){try{
var d=document.documentElement,m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/),
p=m?decodeURIComponent(m[1]):"system";
if(p!=="light"&&p!=="dark")p="system";
var q=window.matchMedia("(prefers-color-scheme: dark)");
var apply=function(){d.setAttribute("data-theme",p==="system"?(q.matches?"dark":"light"):p)};
d.setAttribute("data-theme-pref",p);apply();
q.addEventListener("change",function(){if(d.getAttribute("data-theme-pref")==="system")d.setAttribute("data-theme",q.matches?"dark":"light")});
}catch(e){}})()`;

export function readThemePref(): ThemePref {
  if (typeof document === "undefined") return "system";
  const p = document.documentElement.getAttribute("data-theme-pref");
  return p === "light" || p === "dark" ? p : "system";
}

export function resolveTheme(pref: ThemePref): ResolvedTheme {
  if (pref !== "system") return pref;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyThemePref(pref: ThemePref) {
  const d = document.documentElement;
  d.setAttribute("data-theme-pref", pref);
  d.setAttribute("data-theme", resolveTheme(pref));
  document.cookie = `${THEME_COOKIE}=${pref}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent("ezpark:theme"));
}
