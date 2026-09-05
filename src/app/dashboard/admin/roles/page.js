"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/contexts/ToastContext";
import { rolesService, permissionsService } from "@/services/roles.service";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Badge from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui";

export default function AdminRolesPage() {
  const toast = useToast();

  const [roles, setRoles] = useState([]);
  const [permissionsGrouped, setPermissionsGrouped] = useState({});
  const [loading, setLoading] = useState(true);

  // Modals
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);

  // Form
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [],
  });
  const [saving, setSaving] = useState(false);

  const fetchRolesData = async () => {
    try {
      setLoading(true);
      const [rolesRes, permsRes] = await Promise.all([
        rolesService.getAll(),
        permissionsService.getAll(),
      ]);
      setRoles(rolesRes.data || []);
      setPermissionsGrouped(permsRes.data?.grouped || {});
    } catch (err) {
      toast.error("فشل جلب قائمة الأدوار والصلاحيات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesData();
  }, []);

  const handleOpenAdd = () => {
    setEditingRole(null);
    setFormData({
      name: "",
      description: "",
      permissions: [],
    });
    setRoleModalOpen(true);
  };

  const handleOpenEdit = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || "",
      permissions: (role.permissions || []).map((p) => p._id || p),
    });
    setRoleModalOpen(true);
  };

  const handlePermissionToggle = (permId) => {
    setFormData((prev) => {
      const exists = prev.permissions.includes(permId);
      if (exists) {
        return {
          ...prev,
          permissions: prev.permissions.filter((id) => id !== permId),
        };
      } else {
        return { ...prev, permissions: [...prev.permissions, permId] };
      }
    });
  };

  const handleToggleModuleGroup = (modulePerms) => {
    const permIds = modulePerms.map((p) => p._id);
    const allSelected = permIds.every((id) =>
      formData.permissions.includes(id),
    );

    if (allSelected) {
      // Unselect all in this module
      setFormData((prev) => ({
        ...prev,
        permissions: prev.permissions.filter((id) => !permIds.includes(id)),
      }));
    } else {
      // Select all in this module
      setFormData((prev) => ({
        ...prev,
        permissions: Array.from(new Set([...prev.permissions, ...permIds])),
      }));
    }
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("اسم الدور مطلوب");
      return;
    }
    setSaving(true);
    try {
      if (editingRole) {
        const res = await rolesService.update(editingRole._id, formData);
        setRoles((prev) =>
          prev.map((r) => (r._id === editingRole._id ? res.data : r)),
        );
        toast.success("تم تحديث الدور والصلاحيات بنجاح ✅");
      } else {
        const res = await rolesService.create(formData);
        setRoles((prev) => [...prev, res.data]);
        toast.success("تم إنشاء الدور الجديد بنجاح ✅");
      }
      setRoleModalOpen(false);
    } catch (err) {
      const msg = err.response?.data?.message || "فشل حفظ بيانات الدور";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    setSaving(true);
    try {
      await rolesService.remove(roleToDelete._id);
      setRoles((prev) => prev.filter((r) => r._id !== roleToDelete._id));
      toast.success("تم حذف الدور بنجاح 🗑️");
      setDeleteDialogOpen(false);
    } catch (err) {
      const msg = err.response?.data?.message || "فشل حذف الدور";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const getModuleNameAr = (moduleKey) => {
    const map = {
      schedules: "الجداول الأسبوعية والخطة",
      users: "المستخدمون والمعلمون",
      subjects: "المواد الدراسية",
      roles: "الأدوار والصلاحيات",
      settings: "إعدادات وبيانات المدرسة",
      "audit-logs": "سجل العمليات والتدقيق",
    };
    return map[moduleKey] || moduleKey;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            نظام الصلاحيات والأدوار (RBAC)
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            تخصيص أدوار المستخدمين ومنح صلاحيات دقيقة على مستوى الحقول والوحدات.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm hover:shadow transition-all text-sm"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>إنشاء دور جديد</span>
        </button>
      </div>

      {/* Roles Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 border border-gray-100"
              >
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-48 mb-4" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))
          : roles.map((role) => (
              <div
                key={role._id}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="font-bold text-gray-900 text-base">
                      {role.name}
                    </h3>
                    <Badge variant={role.isSystem ? "purple" : "default"}>
                      {role.isSystem ? "نظام أساسي" : "مخصص"}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mb-4 line-clamp-2">
                    {role.description || "لا يوجد وصف محدد لهذا الدور."}
                  </p>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs mb-4">
                    <span className="text-slate-500 font-semibold">
                      عدد الصلاحيات الممنوحة:{" "}
                    </span>
                    <span className="font-bold text-blue-700">
                      {role.permissions?.length || 0} صلاحية
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleOpenEdit(role)}
                    className="px-3.5 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg transition-all"
                  >
                    تعديل الصلاحيات ⚙️
                  </button>
                  {!role.isSystem && (
                    <button
                      onClick={() => {
                        setRoleToDelete(role);
                        setDeleteDialogOpen(true);
                      }}
                      className="p-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="حذف الدور"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
      </div>

      {/* Add / Edit Role Modal */}
      <Modal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title={
          editingRole
            ? `تعديل صلاحيات الدور: ${editingRole.name}`
            : "إنشاء دور وصلاحيات جديدة"
        }
        size="xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setRoleModalOpen(false)}
              disabled={saving}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-xl"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSaveRole}
              disabled={saving}
              className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
            >
              {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveRole} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                اسم الدور <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                disabled={
                  editingRole?.isSystem && editingRole?.name === "super_admin"
                }
                required
                placeholder="مثال: معلم رياضيات / مشرف جداول"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                الوصف
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="توضيح مختصر لمهام هذا الدور"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Grouped Permissions Matrix */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">
              تحديد الصلاحيات الممنوحة لهذا الدور ({formData.permissions.length}{" "}
              محددة):
            </label>

            <div className="space-y-4 max-h-96 overflow-y-auto p-3 bg-gray-50 rounded-2xl border border-gray-200">
              {Object.entries(permissionsGrouped).map(([moduleKey, perms]) => {
                const permIds = perms.map((p) => p._id);
                const allSelected = permIds.every((id) =>
                  formData.permissions.includes(id),
                );

                return (
                  <div
                    key={moduleKey}
                    className="bg-white p-4 rounded-xl border border-gray-200"
                  >
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-gray-900">
                          {getModuleNameAr(moduleKey)}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                          ({moduleKey})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleModuleGroup(perms)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800"
                      >
                        {allSelected ? "إلغاء تحديد الكل" : "تحديد كل الوحدة"}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {perms.map((perm) => {
                        const checked = formData.permissions.includes(perm._id);
                        return (
                          <label
                            key={perm._id}
                            className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer text-xs transition-all ${
                              checked
                                ? "bg-blue-50 border border-blue-200 text-blue-950 font-semibold"
                                : "hover:bg-gray-50 border border-transparent text-gray-700"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handlePermissionToggle(perm._id)}
                              className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                              <p className="font-bold">
                                {perm.description || perm.name}
                              </p>
                              <p className="text-[10px] text-gray-400 font-mono">
                                {perm.name}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteRole}
        title="تأكيد حذف الدور"
        message={`هل أنت متأكد من رغبتك في حذف الدور "${roleToDelete?.name}"؟ لن يتم الحذف إذا كان هناك مستخدمون مسندين إليه.`}
        confirmLabel="نعم، حذف الدور"
        variant="danger"
        loading={saving}
      />
    </div>
  );
}
