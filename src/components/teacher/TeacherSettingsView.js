"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { subjectsService } from "@/services/subjects.service";
import { authService } from "@/services/auth.service";

const arabicRegex = /^[\u0600-\u06FF\s]+$/;

function InputField({ label, required, hint, error, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-bold text-gray-700">
        {label}
        {required && <span className="text-red-500 mr-1">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}

function Card({ title, icon, children }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
      <h2 className="text-base font-bold text-gray-900 pb-3 border-b border-gray-100 flex items-center gap-2">
        <span>{icon}</span>
        <span>{title}</span>
      </h2>
      {children}
    </div>
  );
}

export default function TeacherSettingsView() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const initialized = useRef(false);

  // Profile fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [nameError, setNameError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Subjects
  const [allSubjects, setAllSubjects] = useState([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  // Password
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  // Init form once when user loads
  useEffect(() => {
    if (user && !initialized.current) {
      initialized.current = true;
      setName(user.name || "");
      setPhone(user.phone || "");
      setSelectedSubjectIds(
        (user.subjects || []).map((s) => (typeof s === "object" ? s._id : s))
      );
    }
  }, [user]);

  // Load subjects
  useEffect(() => {
    subjectsService
      .getAll({ isActive: true })
      .then((r) => setAllSubjects(r.data || []))
      .catch(() => {})
      .finally(() => setLoadingSubjects(false));
  }, []);

  const handleNameChange = (val) => {
    setName(val);
    setNameError(
      val.trim() && !arabicRegex.test(val.trim())
        ? "الاسم يجب أن يكون باللغة العربية فقط"
        : ""
    );
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      toast.error("يرجى إدخال الاسم الكامل");
      return;
    }
    if (!arabicRegex.test(trimmedName)) {
      toast.error("الاسم يجب أن يكون باللغة العربية فقط");
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({
        name: trimmedName,
        phone: phone.trim(),
        subjectIds: selectedSubjectIds,
      });
      toast.success("تم حفظ الملف الشخصي بنجاح ✅");
    } catch (err) {
      toast.error(err?.response?.data?.message || "فشل حفظ البيانات");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("يرجى ملء جميع حقول كلمة المرور");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("كلمة المرور الجديدة وتأكيدها غير متطابقتين");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    setSavingPassword(true);
    try {
      await authService.changePassword(oldPassword, newPassword);
      toast.success("تم تغيير كلمة المرور بنجاح ✅");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err?.response?.data?.message || "فشل تغيير كلمة المرور");
    } finally {
      setSavingPassword(false);
    }
  };

  const toggleSubject = (id) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const filteredSubjects = allSubjects.filter((s) =>
    s.name?.toLowerCase().includes(subjectSearch.toLowerCase())
  );

  const inputClass =
    "w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-right";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-3xl" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">
          إعدادات الملف الشخصي
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          تعديل بياناتك الشخصية ومواد التدريس وكلمة المرور.
        </p>
      </div>

      {/* Avatar / Profile Summary */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-950 rounded-2xl p-5 text-white flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-white/15 border-2 border-white/25 flex items-center justify-center text-3xl shrink-0">
          👨‍🏫
        </div>
        <div>
          <p className="text-lg font-black">{name || user?.name || "المعلم"}</p>
          <p className="text-blue-200 text-xs mt-0.5">
            {selectedSubjectIds.length > 0
              ? `${selectedSubjectIds.length} مادة محددة`
              : "لم تحدد مواداً بعد"}
          </p>
          {user?.email && (
            <p className="text-blue-300 text-xs mt-0.5" dir="ltr">
              {user.email}
            </p>
          )}
        </div>
      </div>

      {/* ── Profile Card ── */}
      <Card title="البيانات الشخصية" icon="👤">
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="الاسم الكامل"
              required
              hint="يجب أن يكون بالعربية تماماً كما هو في الجدول الدراسي"
              error={nameError}
            >
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="أدخل اسمك الكامل بالعربي"
                className={inputClass}
              />
            </InputField>

            <InputField label="رقم الهاتف" hint="اختياري">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05xxxxxxxx"
                className={inputClass}
                dir="ltr"
              />
            </InputField>
          </div>

          {/* Subjects */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700">
                المواد التي تدرّسها
              </label>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                {selectedSubjectIds.length} محددة
              </span>
            </div>

            {loadingSubjects ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-4 justify-center border border-dashed border-gray-200 rounded-xl">
                <span className="animate-spin">⏳</span>
                <span>جارٍ تحميل المواد...</span>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Search + Actions */}
                <div className="flex items-center gap-2 p-2.5 bg-gray-50 border-b border-gray-200">
                  <span className="text-gray-400 text-sm">🔍</span>
                  <input
                    type="text"
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    placeholder="ابحث عن مادة..."
                    className="flex-1 bg-transparent text-sm outline-none text-right text-gray-700 placeholder-gray-400"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedSubjectIds(allSubjects.map((s) => s._id))
                      }
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      الكل
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedSubjectIds([])}
                      className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      مسح
                    </button>
                  </div>
                </div>

                {/* Subject list */}
                <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
                  {filteredSubjects.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-6">
                      لا توجد مواد مطابقة
                    </p>
                  ) : (
                    filteredSubjects.map((subject) => {
                      const checked = selectedSubjectIds.includes(subject._id);
                      return (
                        <label
                          key={subject._id}
                          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none transition-colors ${
                            checked
                              ? "bg-blue-50 hover:bg-blue-100"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSubject(subject._id)}
                            className="accent-blue-600 w-4 h-4 shrink-0"
                          />
                          {subject.color && (
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: subject.color }}
                            />
                          )}
                          <span
                            className={`text-sm flex-1 ${
                              checked
                                ? "font-semibold text-blue-900"
                                : "text-gray-700"
                            }`}
                          >
                            {subject.name}
                          </span>
                          {checked && (
                            <span className="text-blue-500 text-xs font-bold">
                              ✓
                            </span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
            <p className="text-xs text-gray-400">
              ⚠️ المواد المحددة تُستخدم لمطابقة اسمك في جدول الحصص
            </p>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={savingProfile || !!nameError}
              className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-sm"
            >
              {savingProfile ? "جارٍ الحفظ..." : "💾 حفظ البيانات"}
            </button>
          </div>
        </form>
      </Card>

      {/* ── Password Card ── */}
      <Card title="تغيير كلمة المرور" icon="🔒">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500">
              اختر كلمة مرور قوية لا تقل عن 6 أحرف
            </p>
            <button
              type="button"
              onClick={() => setShowPasswords(!showPasswords)}
              className="text-xs text-gray-500 hover:text-gray-800 font-medium flex items-center gap-1"
            >
              <span>{showPasswords ? "🙈" : "👁️"}</span>
              <span>{showPasswords ? "إخفاء" : "إظهار"}</span>
            </button>
          </div>

          <InputField label="كلمة المرور الحالية">
            <input
              type={showPasswords ? "text" : "password"}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
              dir="ltr"
            />
          </InputField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="كلمة المرور الجديدة">
              <input
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
                dir="ltr"
              />
            </InputField>

            <InputField
              label="تأكيد كلمة المرور الجديدة"
              error={
                confirmPassword && newPassword !== confirmPassword
                  ? "كلمتا المرور غير متطابقتين"
                  : ""
              }
            >
              <input
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={`${inputClass} ${
                  confirmPassword && newPassword !== confirmPassword
                    ? "border-red-400 focus:ring-red-400"
                    : ""
                }`}
                dir="ltr"
              />
            </InputField>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={savingPassword}
              className="px-8 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-sm"
            >
              {savingPassword ? "جارٍ التغيير..." : "🔑 تغيير كلمة المرور"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
