"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { usersService } from "@/services/users.service";
import { rolesService } from "@/services/roles.service";
import { subjectsService } from "@/services/subjects.service";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Badge from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui";

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modals
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resetPwdModalOpen, setResetPwdModalOpen] = useState(false);
  const [targetResetUser, setTargetResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
    subjects: [],
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.isActive = statusFilter;

      const res = await usersService.getAll(params);
      setUsers(res.data || []);
    } catch (err) {
      toast.error("فشل جلب قائمة المستخدمين");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const [rolesRes, subjectsRes] = await Promise.all([
          rolesService.getAll(),
          subjectsService.getAll({ isActive: true }),
        ]);
        setRoles(rolesRes.data || []);
        setSubjects(subjectsRes.data || []);
      } catch (err) {
        console.error("Error fetching roles/subjects:", err);
      }
    };
    init();
    fetchUsers();
  }, [search, roleFilter, statusFilter]);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      role: roles[0]?._id || "",
      subjects: [],
      isActive: true,
    });
    setUserModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role?._id || user.role || "",
      subjects: (user.subjects || []).map((s) => s._id || s),
      isActive: user.isActive,
    });
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingUser) {
        const res = await usersService.update(editingUser._id, formData);
        setUsers((prev) =>
          prev.map((u) => (u._id === editingUser._id ? res.data : u)),
        );
        toast.success("تم تحديث بيانات المستخدم بنجاح ✅");
      } else {
        const res = await usersService.create(formData);
        setUsers((prev) => [res.data, ...prev]);
        toast.success("تمت إضافة المستخدم بنجاح ✅");
      }
      setUserModalOpen(false);
    } catch (err) {
      const msg = err.response?.data?.message || "فشل حفظ بيانات المستخدم";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      const res = await usersService.toggleStatus(user._id);
      setUsers((prev) =>
        prev.map((u) =>
          u._id === user._id ? { ...u, isActive: res.data.isActive } : u,
        ),
      );
      toast.success(`تم ${res.data.isActive ? "تفعيل" : "تعطيل"} الحساب بنجاح`);
    } catch (err) {
      const msg = err.response?.data?.message || "فشل تغيير حالة الحساب";
      toast.error(msg);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    setSaving(true);
    try {
      await usersService.resetPassword(targetResetUser._id, newPassword);
      toast.success("تم تعيين كلمة المرور الجديدة بنجاح 🔑");
      setResetPwdModalOpen(false);
      setNewPassword("");
    } catch (err) {
      const msg = err.response?.data?.message || "فشل إعادة تعيين كلمة المرور";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    setSaving(true);
    try {
      await usersService.remove(userToDelete._id);
      setUsers((prev) => prev.filter((u) => u._id !== userToDelete._id));
      toast.success("تم حذف المستخدم بنجاح 🗑️");
      setDeleteDialogOpen(false);
    } catch (err) {
      const msg = err.response?.data?.message || "فشل حذف المستخدم";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSubjectToggle = (subjId) => {
    setFormData((prev) => {
      const exists = prev.subjects.includes(subjId);
      if (exists) {
        return {
          ...prev,
          subjects: prev.subjects.filter((id) => id !== subjId),
        };
      } else {
        return { ...prev, subjects: [...prev.subjects, subjId] };
      }
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            إدارة المستخدمين والمعلمين
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            إضافة المعلمين والمشرفين، إسناد المواد الدراسية، وتعيين الأدوار
            والصلاحيات.
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
          <span>إضافة مستخدم جديد</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="البحث بالاسم أو البريد الإلكتروني..."
              className="w-full px-4 py-2.5 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none pe-10"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </span>
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3.5 py-2.5 text-xs sm:text-sm font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">جميع الأدوار</option>
            {roles.map((r) => (
              <option key={r._id} value={r._id}>
                {r.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 text-xs sm:text-sm font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">جميع الحالات</option>
            <option value="true">نشط</option>
            <option value="false">معطل</option>
          </select>
        </div>

        <div className="text-xs text-gray-500 font-bold">
          إجمالي المستخدمين:{" "}
          <span className="text-blue-600">{users.length}</span>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-xs text-gray-600 font-bold">
                <th className="px-6 py-4">المستخدم</th>
                <th className="px-6 py-4">الدور الوظيفي</th>
                <th className="px-6 py-4">المواد المسندة</th>
                <th className="px-6 py-4 text-center">الحالة</th>
                <th className="px-6 py-4 text-center">آخر دخول</th>
                <th className="px-6 py-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-6 py-4">
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    لا يوجد مستخدمون مطابقون لمعايير البحث
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u._id}
                    className="hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm flex-shrink-0">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{u.name}</p>
                          <p
                            className="text-xs text-gray-400 font-mono"
                            dir="ltr"
                          >
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <Badge variant={u.role?.isSystem ? "purple" : "info"}>
                        {u.role?.name || "مستخدم"}
                      </Badge>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {u.subjects && u.subjects.length > 0 ? (
                          u.subjects.map((s) => (
                            <span
                              key={s._id || s}
                              className="px-2 py-0.5 rounded text-[11px] font-bold text-white shadow-xs"
                              style={{ backgroundColor: s.color || "#3b82f6" }}
                            >
                              {s.name || "مادة"}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-300 text-xs italic">
                            لا توجد مواد مسندة
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        disabled={u._id === currentUser?._id}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                          u.isActive
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-red-100 text-red-700 hover:bg-red-200"
                        } disabled:opacity-50`}
                      >
                        {u.isActive ? "● نشط" : "○ معطل"}
                      </button>
                    </td>

                    <td className="px-6 py-4 text-center text-xs text-gray-400 font-mono">
                      {u.lastLogin
                        ? new Date(u.lastLogin).toLocaleDateString("ar-SA", {
                            month: "numeric",
                            day: "numeric",
                          })
                        : "لم يسجل دخول"}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          title="تعديل البيانات"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => {
                            setTargetResetUser(u);
                            setNewPassword("");
                            setResetPwdModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                          title="إعادة تعيين كلمة المرور"
                        >
                          🔑
                        </button>
                        {u._id !== currentUser?._id && (
                          <button
                            onClick={() => {
                              setUserToDelete(u);
                              setDeleteDialogOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                            title="حذف المستخدم"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      <Modal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title={editingUser ? "تعديل بيانات المستخدم" : "إضافة مستخدم جديد"}
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setUserModalOpen(false)}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSaveUser}
              disabled={saving}
              className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
            >
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              الاسم الكامل <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              placeholder="مثال: أحمد محمد علي"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              البريد الإلكتروني <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              placeholder="teacher@school.com"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              dir="ltr"
            />
          </div>

          {!editingUser && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                كلمة المرور الأولية <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                placeholder="6 أحرف على الأقل"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              الدور الوظيفي والصلاحيات <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
              required
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">-- اختر الدور --</option>
              {roles.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name} {r.isSystem ? "(نظام)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Assignment Checkboxes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              المواد الدراسية المسندة للمعلم
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-gray-50 rounded-xl border border-gray-200">
              {subjects.map((subj) => {
                const checked = formData.subjects.includes(subj._id);
                return (
                  <label
                    key={subj._id}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs font-semibold transition-all ${
                      checked
                        ? "bg-blue-100 text-blue-900 border border-blue-300"
                        : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleSubjectToggle(subj._id)}
                      className="rounded text-blue-600"
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: subj.color || "#3b82f6" }}
                    />
                    <span>{subj.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={resetPwdModalOpen}
        onClose={() => setResetPwdModalOpen(false)}
        title={`إعادة تعيين كلمة المرور: ${targetResetUser?.name}`}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setResetPwdModalOpen(false)}
              disabled={saving}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-xl"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={saving || !newPassword}
              className="px-5 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm"
            >
              {saving ? "جاري التعيين..." : "تعيين كلمة المرور"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            أدخل كلمة المرور الجديدة للمستخدم وسيتمكن من تسجيل الدخول بها فوراً.
          </p>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="كلمة المرور الجديدة (6 أحرف على الأقل)"
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>
      </Modal>

      {/* Delete User Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteUser}
        title="تأكيد حذف المستخدم"
        message={`هل أنت متأكد من رغبتك في حذف حساب المستخدم "${userToDelete?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="نعم، حذف الحساب"
        variant="danger"
        loading={saving}
      />
    </div>
  );
}
