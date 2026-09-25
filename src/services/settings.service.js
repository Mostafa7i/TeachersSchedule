// services/settings.service.js
import api from "@/lib/api";

let cachedSettings = null;
let cachedSettingsTime = 0;
const SETTINGS_CACHE_TTL = 30000; // 30 seconds

export const settingsService = {
  async get(force = false) {
    const now = Date.now();
    if (!force && cachedSettings && now - cachedSettingsTime < SETTINGS_CACHE_TTL) {
      return cachedSettings;
    }
    const { data } = await api.get("/school-settings");
    cachedSettings = data;
    cachedSettingsTime = now;
    return data;
  },

  async update(settingsData) {
    const { data } = await api.put("/school-settings", settingsData);
    cachedSettings = data;
    cachedSettingsTime = Date.now();
    return data;
  },

  /** Save a Cloudinary URL as the school logo (replaces old multer upload) */
  async updateLogo(logoUrl) {
    const { data } = await api.patch("/school-settings/logo", { logoUrl });
    cachedSettings = data;
    cachedSettingsTime = Date.now();
    return data;
  },
};

export const auditLogsService = {
  async getAll(params = {}) {
    const { data } = await api.get("/audit-logs", { params });
    return data;
  },
};
