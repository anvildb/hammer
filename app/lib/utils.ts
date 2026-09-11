import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * True when the app runs inside an iframe (e.g. the anvildb.com
 * playground). Chrome blocks `autofocus` in cross-origin subframes and
 * logs a console warning for every attempt, so autofocus-carrying inputs
 * should pass `autoFocus={canAutoFocus()}` instead of `autoFocus`.
 * SSR-safe: returns false when `window` is unavailable.
 */
export function canAutoFocus(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self === window.top;
  } catch {
    // Cross-origin access to window.top throws -> we are framed.
    return false;
  }
}
