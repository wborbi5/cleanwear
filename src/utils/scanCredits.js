// ============================================================
// Scan Credits — Tracks free scan usage + earned credits
// Anonymous: localStorage | Authenticated: Supabase
// ============================================================

import { FREE_SCAN_LIMIT, LS_SCAN_COUNT, LS_SCAN_CREDITS } from "../config.js";

/** Get number of scans used (anonymous = localStorage) */
export function getScanCount() {
  return parseInt(localStorage.getItem(LS_SCAN_COUNT) || "0", 10);
}

/** Get bonus credits earned (from sharing, etc.) */
export function getBonusCredits() {
  return parseInt(localStorage.getItem(LS_SCAN_CREDITS) || "0", 10);
}

/** How many scans remain for anonymous user */
export function getAvailableScans() {
  const used = getScanCount();
  const bonus = getBonusCredits();
  return Math.max(0, FREE_SCAN_LIMIT + bonus - used);
}

/** Check if user can scan */
export function canScan(user) {
  // Authenticated users always can scan
  if (user) return true;
  return getAvailableScans() > 0;
}

/** Increment scan count after a scan */
export function incrementScanCount() {
  const current = getScanCount();
  localStorage.setItem(LS_SCAN_COUNT, String(current + 1));
}

/** Add 1 bonus credit (e.g. from sharing) */
export function addScanCredit() {
  const current = getBonusCredits();
  localStorage.setItem(LS_SCAN_CREDITS, String(current + 1));
}

/** Reset scan data (used on auth migration) */
export function resetLocalScanData() {
  localStorage.removeItem(LS_SCAN_COUNT);
  localStorage.removeItem(LS_SCAN_CREDITS);
}

/** Get display info for UI */
export function getScanStatus(user) {
  if (user) return { unlimited: true, remaining: Infinity, used: 0, bonus: 0 };
  const used = getScanCount();
  const bonus = getBonusCredits();
  const remaining = Math.max(0, FREE_SCAN_LIMIT + bonus - used);
  return { unlimited: false, remaining, used, bonus, total: FREE_SCAN_LIMIT + bonus };
}
