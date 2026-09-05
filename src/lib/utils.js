/**
 * src/lib/utils.js
 * Utility helpers shared across the frontend
 */

/**
 * Resolves a school logo path to a full URL.
 * The backend stores logo as a relative path like "/uploads/school-logo-xxx.png".
 * This helper prepends the backend base URL so the browser can fetch it.
 *
 * @param {string|null|undefined} logoPath - The logo value from school settings
 * @returns {string|null} Full URL or null if no logo
 */
export function getLogoUrl(logoPath) {
  if (!logoPath) return null;
  // Already a full URL (e.g. http:// or https://)
  if (logoPath.startsWith("http")) return logoPath;
  // Relative path from backend — prepend the backend base URL
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  const baseUrl = apiUrl.replace(/\/api$/, ""); // strip trailing /api
  return `${baseUrl}${logoPath}`;
}
