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
    { method: "POST", body: formData },
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || "فشل في رفع الصورة إلى Cloudinary");
  }

  const data = await response.json();
  return data.secure_url;
}

/**
 * Curated palette for distinct class badge coloring
 */
const CLASS_COLOR_PALETTES = [
  {
    bg: "bg-blue-50",
    text: "text-blue-900",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-900 border-blue-300",
    solid: "bg-blue-600 text-white",
    dot: "bg-blue-500",
  },
  {
    bg: "bg-emerald-50",
    text: "text-emerald-900",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-900 border-emerald-300",
    solid: "bg-emerald-600 text-white",
    dot: "bg-emerald-500",
  },
  {
    bg: "bg-purple-50",
    text: "text-purple-900",
    border: "border-purple-200",
    badge: "bg-purple-100 text-purple-900 border-purple-300",
    solid: "bg-purple-600 text-white",
    dot: "bg-purple-500",
  },
  {
    bg: "bg-amber-50",
    text: "text-amber-900",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-900 border-amber-300",
    solid: "bg-amber-600 text-white",
    dot: "bg-amber-500",
  },
  {
    bg: "bg-rose-50",
    text: "text-rose-900",
    border: "border-rose-200",
    badge: "bg-rose-100 text-rose-900 border-rose-300",
    solid: "bg-rose-600 text-white",
    dot: "bg-rose-500",
  },
  {
    bg: "bg-indigo-50",
    text: "text-indigo-900",
    border: "border-indigo-200",
    badge: "bg-indigo-100 text-indigo-900 border-indigo-300",
    solid: "bg-indigo-600 text-white",
    dot: "bg-indigo-500",
  },
  {
    bg: "bg-teal-50",
    text: "text-teal-900",
    border: "border-teal-200",
    badge: "bg-teal-100 text-teal-900 border-teal-300",
    solid: "bg-teal-600 text-white",
    dot: "bg-teal-500",
  },
  {
    bg: "bg-orange-50",
    text: "text-orange-900",
    border: "border-orange-200",
    badge: "bg-orange-100 text-orange-900 border-orange-300",
    solid: "bg-orange-600 text-white",
    dot: "bg-orange-500",
  },
  {
    bg: "bg-cyan-50",
    text: "text-cyan-900",
    border: "border-cyan-200",
    badge: "bg-cyan-100 text-cyan-900 border-cyan-300",
    solid: "bg-cyan-600 text-white",
    dot: "bg-cyan-500",
  },
  {
    bg: "bg-violet-50",
    text: "text-violet-900",
    border: "border-violet-200",
    badge: "bg-violet-100 text-violet-900 border-violet-300",
    solid: "bg-violet-600 text-white",
    dot: "bg-violet-500",
  },
  {
    bg: "bg-fuchsia-50",
    text: "text-fuchsia-900",
    border: "border-fuchsia-200",
    badge: "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300",
    solid: "bg-fuchsia-600 text-white",
    dot: "bg-fuchsia-500",
  },
];

/**
 * Returns a deterministic, distinct color palette for a class name.
 * @param {string} className
 * @returns {object} Object with Tailwind color classes
 */
export function getClassBadgeStyle(className) {
  if (!className || typeof className !== "string") {
    return {
      bg: "bg-gray-50",
      text: "text-gray-800",
      border: "border-gray-200",
      badge: "bg-gray-100 text-gray-800 border-gray-300",
      solid: "bg-gray-800 text-white",
      dot: "bg-gray-400",
    };
  }

  const str = className.trim();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % CLASS_COLOR_PALETTES.length;
  return CLASS_COLOR_PALETTES[index];
}

/**
 * Normalizes any class name to its canonical grade identifier.
 * Handles all Arabic variations:
 * - "أول أول", "أول ثاني", "1/1", "1/2", "صف أول 1", "الصف الأول أ", "أولى" -> "grade-1"
 * - "ثاني أول", "ثاني ثاني", "2/1", "2/2", "صف ثاني 1", "الصف الثاني" -> "grade-2"
 * - "ثالث أول", "ثالث ثاني", "3/1", "3/2", "صف ثالث", "الصف الثالث" -> "grade-3"
 * - "رابع أول", "4/1", "الصف الرابع" -> "grade-4"
 * - "خامس أول", "5/1", "الصف الخامس" -> "grade-5"
 * - "سادس أول", "6/1", "الصف السادس" -> "grade-6"
 *
 * @param {string} className
 * @returns {string} canonical grade key (e.g. "grade-1", "grade-2")
 */
export function getGradeCategory(className) {
  if (!className) return "";
  let name = String(className).trim();

  // Normalize arabic diacritics and letters
  name = name
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g, "") // remove harakat
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");

  // Remove common prefixes
  name = name.replace(/^(فصل|الصف|صف)\s+/, "");

  // Check Grade 1: اول, اولي, 1
  if (/^(اول|اولي|1)(\b|[\s\/\-_])/.test(name) || name === "اول" || name === "اولي") {
    return "grade-1";
  }
  // Check Grade 2: ثاني, ثانيه, 2
  if (/^(ثاني|ثانيه|2)(\b|[\s\/\-_])/.test(name) || name === "ثاني" || name === "ثانيه") {
    return "grade-2";
  }
  // Check Grade 3: ثالث, ثالثه, 3
  if (/^(ثالث|ثالثه|3)(\b|[\s\/\-_])/.test(name) || name === "ثالث" || name === "ثالثه") {
    return "grade-3";
  }
  // Check Grade 4: رابع, رابعه, 4
  if (/^(رابع|رابعه|4)(\b|[\s\/\-_])/.test(name) || name === "رابع" || name === "رابعه") {
    return "grade-4";
  }
  // Check Grade 5: خامس, خامسه, 5
  if (/^(خامس|خامسه|5)(\b|[\s\/\-_])/.test(name) || name === "خامس" || name === "خامسه") {
    return "grade-5";
  }
  // Check Grade 6: سادس, سادسه, 6
  if (/^(سادس|سادسه|6)(\b|[\s\/\-_])/.test(name) || name === "سادس" || name === "سادسه") {
    return "grade-6";
  }

  // General numbers: e.g. "7/1", "8/2"
  const numMatch = name.match(/^(\d+)/);
  if (numMatch) {
    return `grade-${numMatch[1]}`;
  }

  // Fallback: first word
  const parts = name.split(/[\s\/\-_]+/);
  return parts[0] || name;
}

/**
 * Returns a human-friendly Arabic label for a grade category.
 */
export function getGradeDisplayName(category) {
  const map = {
    "grade-1": "الصف الأول",
    "grade-2": "الصف الثاني",
    "grade-3": "الصف الثالث",
    "grade-4": "الصف الرابع",
    "grade-5": "الصف الخامس",
    "grade-6": "الصف السادس",
    "grade-7": "الصف الأول متوسط",
    "grade-8": "الصف الثاني متوسط",
    "grade-9": "الصف الثالث متوسط",
  };
  return map[category] || (category ? `صف (${category})` : "الصف");
}
