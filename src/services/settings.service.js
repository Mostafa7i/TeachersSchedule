// services/settings.service.js
import api from "@/lib/api";

export const settingsService = {
  async get() {
    const { data } = await api.get("/school-settings");
    return data;
  },

  async update(settingsData) {
    const { data } = await api.put("/school-settings", settingsData);
    return data;
  },

  /** Save a Cloudinary URL as the school logo (replaces old multer upload) */
  async updateLogo(logoUrl) {
    const { data } = await api.patch("/school-settings/logo", { logoUrl });
    return data;
  },
};

export const auditLogsService = {
  async getAll(params = {}) {
    const { data } = await api.get("/audit-logs", { params });
    return data;
  },
};
