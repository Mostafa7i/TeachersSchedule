/**
 * src/lib/utils.js
 * Utility helpers shared across the frontend
 */

/**
 * Resolves a school logo path/URL to a full displayable URL.
 * - Cloudinary URLs (https://res.cloudinary.com/...) are returned as-is.
 * - Legacy relative paths (/uploads/...) get the backend base URL prepended.
 *
 * @param {string|null|undefined} logoPath
 * @returns {string|null}
 */
export function getLogoUrl(logoPath) {
  if (!logoPath) return null;
  if (logoPath.startsWith("http")) return logoPath; // Full URL (Cloudinary or external)
  // Legacy relative path — prepend backend base URL
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  const baseUrl = apiUrl.replace(/\/api$/, "");
  return `${baseUrl}${logoPath}`;
}

/**
 * Uploads an image file directly to Cloudinary from the browser.
 * Uses an unsigned upload preset — no backend involvement needed.
 *
 * @param {File} file - The image File object from an <input type="file">
 * @returns {Promise<string>} The Cloudinary secure_url of the uploaded image
 */
export async function uploadImageToCloudinary(file) {
  const CLOUD_NAME = "dyqs8bid2";
  const UPLOAD_PRESET = "image_photo";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || "فشل في رفع الصورة إلى Cloudinary");
  }

  const data = await response.json();
  return data.secure_url;
}
