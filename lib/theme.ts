export const THEME_STORAGE_KEY = "goblin-theme";

export const THEME_PREFERENCES = ["system", "light", "dark"] as const;

/** What the person chose. "system" is a preference, not a palette. */
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

/** What is actually on screen. Always one of two real palettes. */
export type ResolvedTheme = "light" | "dark";

// The root element carries the *resolved* theme, never "system". That keeps the
// CSS to one light block and one dark block instead of repeating the dark
// palette for the forced case and again inside a media query, and it means
// reading one attribute answers which palette is on screen.
export const THEME_ROOT_ATTRIBUTE = "data-theme";

export const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && (THEME_PREFERENCES as readonly string[]).includes(value);
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference !== "system") {
    return preference;
  }

  return window.matchMedia(DARK_MEDIA_QUERY).matches ? "dark" : "light";
}

export function applyTheme(theme: ResolvedTheme) {
  document.documentElement.setAttribute(THEME_ROOT_ATTRIBUTE, theme);
}

// Runs before the first paint. Without it the first frame shows whichever
// palette the server guessed and then swaps, which is exactly the kind of
// unrequested movement this UI doesn't do.
export const THEME_BOOTSTRAP = `(function(){var p=null;try{p=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)})}catch(e){}var d=p==="dark"||(p!=="light"&&window.matchMedia(${JSON.stringify(
  DARK_MEDIA_QUERY,
)}).matches);document.documentElement.setAttribute(${JSON.stringify(
  THEME_ROOT_ATTRIBUTE,
)},d?"dark":"light")})()`;

// The preference lives in storage, not in React state, so it is read as an
// external store rather than copied into state inside an effect.
const listeners = new Set<() => void>();

export function subscribeToThemePreference(onChange: () => void) {
  listeners.add(onChange);

  return () => {
    listeners.delete(onChange);
  };
}

export function readThemePreference(): ThemePreference {
  let stored: string | null = null;

  try {
    stored = localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    // Storage can be unavailable. Following the system is the honest fallback.
  }

  return isThemePreference(stored) ? stored : "system";
}

/** On the server there is no storage to read, so no segment reads as chosen. */
export function readThemePreferenceOnServer(): ThemePreference {
  return "system";
}

export function chooseThemePreference(next: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // The choice still applies to this page; it just won't survive a reload.
  }

  // Applied here rather than in a render effect. The attribute is already
  // correct from the pre-paint script, and writing it on mount would briefly
  // show the system palette over a stored preference that contradicts it.
  applyTheme(resolveTheme(next));

  for (const listener of listeners) {
    listener();
  }
}
