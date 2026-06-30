"use client";

import { useEffect, useState } from "react";
import {
  getStoredThemePreference,
  storeThemePreference,
  type ThemePreference,
} from "@/components/ThemeBootstrap";

export function ThemeSection() {
  const [theme, setTheme] = useState<ThemePreference>("light");

  useEffect(() => {
    setTheme(getStoredThemePreference());
  }, []);

  function handleThemeChange(nextTheme: ThemePreference) {
    setTheme(nextTheme);
    storeThemePreference(nextTheme);
  }

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-4">Appearance</h2>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-900">Theme</p>
          <p className="text-xs text-gray-500 mt-1">Choose how Linkora looks on this device.</p>
        </div>
        <div
          className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1"
          role="group"
          aria-label="Choose theme"
        >
          {(["light", "dark"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => handleThemeChange(option)}
              className={`min-w-[72px] rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                theme === option
                  ? "bg-violet-600 text-white"
                  : "text-gray-700 hover:bg-white hover:text-gray-900"
              }`}
              aria-pressed={theme === option}
            >
              {option === "light" ? "Light" : "Dark"}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
