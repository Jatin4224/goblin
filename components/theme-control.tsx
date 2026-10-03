"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";

import {
  DARK_MEDIA_QUERY,
  applyTheme,
  chooseThemePreference,
  readThemePreference,
  readThemePreferenceOnServer,
  resolveTheme,
  subscribeToThemePreference,
  type ThemePreference,
} from "@/lib/theme";

const OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string; icon: ReactNode }> = [
  {
    value: "system",
    label: "Follow the system",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden>
        <rect x="2" y="3" width="12" height="8" rx="1" />
        <path d="M6 13.5h4" />
      </svg>
    ),
  },
  {
    value: "light",
    label: "Force light",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden>
        <circle cx="8" cy="8" r="3" />
        <path d="M8 1.5v1.5M8 13v1.5M1.5 8h1.5M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M12.6 3.4l-1 1M4.4 11.6l-1 1" />
      </svg>
    ),
  },
  {
    value: "dark",
    label: "Force dark",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden>
        <path d="M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5Z" />
      </svg>
    ),
  },
];

export function ThemeControl() {
  const preference = useSyncExternalStore(
    subscribeToThemePreference,
    readThemePreference,
    readThemePreferenceOnServer,
  );

  // Subscribes only. Nothing is written on mount: the pre-paint script already
  // put the right palette on the root element, and a click writes it directly.
  useEffect(() => {
    if (preference !== "system") {
      return;
    }

    const query = window.matchMedia(DARK_MEDIA_QUERY);
    const onChange = () => applyTheme(resolveTheme("system"));

    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [preference]);

  return (
    <div className="flex items-center border border-line" role="group" aria-label="Theme">
      {OPTIONS.map((option) => {
        const chosen = preference === option.value;

        return (
          <button
            key={option.value}
            type="button"
            title={option.label}
            aria-label={option.label}
            aria-pressed={chosen}
            onClick={() => chooseThemePreference(option.value)}
            className={`grid size-5 place-items-center ${
              chosen ? "bg-accent text-accent-fg" : "text-fg-faint hover:text-fg"
            }`}
          >
            <span className="size-3">{option.icon}</span>
          </button>
        );
      })}
    </div>
  );
}
