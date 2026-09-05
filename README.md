# 🏫 نظام إدارة الجداول والخطة الأسبوعية المدرسية (School Weekly Schedule Management Platform)

منصة متكاملة واحترافية لإدارة الجداول والخطط الأسبوعية للمدارس، مبنية بأحدث معايير الويب ومعمارية معيارية قابلة للتوسع المستقبلي لإضافة (الطلاب، الحضور، الدرجات، الواجبات، الفصول).

> 🤖 **سياق الذكاء الاصطناعي والمطورين**: يتوفر دليل تقني شامل للمشروع وأحدث ما تم تنفيذه في ملف [PROJECT_AI_CONTEXT.md](./PROJECT_AI_CONTEXT.md).

---

## 🌟 الميزات الرئيسية (Key Features)

1. **الجدول الأسبوعي المتقدم (Weekly Schedule Matrix)**:
   - تصميم مطابق للجداول المدرسية المعتمدة مع إمكانية إظهار شعار المدرسة، الترويسة الرسمية، والعام الدراسي.
   - تقسيم تفصيلي لجميع أيام الأسبوع وحصص اليوم (الحصة 1 إلى 8).
   - حقول لكل حصة: (المادة، المعلم، عنوان الدرس، الواجبات، الأنشطة الصفية، الملاحظات).
   - توافق وتجاوب كامل (100% Responsive) على كافة مقاسات الشاشات والجوال.

2. **الأمان ونظام الصلاحيات الديناميكي (Dynamic RBAC)**:
   - نظام حقيقي للأدوار والصلاحيات (Dynamic Permissions).
   - صلاحيات دقيقة على مستوى الحقول (`schedules.edit_title`, `schedules.edit_homework`, `schedules.edit_activities`, `schedules.edit_notes`).
   - عزل صارم للمواد على مستوى الخادم (Server-Side Authorization): المعلم لا يستطيع تعديل إلا الحصص والمواد المسندة إليه فقط.
   - جلسات آمنة باستخدام **HttpOnly Cookies** وتشفير كلمات المرور بواسطة **Bcrypt (12 Rounds)**.

3. **لوحة تحكم المدير (Admin Dashboard)**:
   - إدارة كاملة للمعلمين والمستخدمين (إضافة، تعديل، تعطيل/تفعيل، تعيين المواد، إعادة تعيين كلمة المرور).
   - إدارة المواد الدراسية وتخصيص ألوان التمييز لكل مادة.
   - إدارة الأسابيع الدراسية وتحديد نطاقات التواريخ.
   - ميزة **نسخ جدول أسبوع كامل** إلى أسبوع آخر بنقرة واحدة.
   - إدارة بيانات وشعار المدرسة والترويسة الرسمية.
   - سجل العمليات والتدقيق المباشر (**Audit Logs**).

4. **بوابة المعلم (Teacher Portal)**:
   - واجهة مخصصة لكل معلم تعرض جدوله الأسبوعي مع تمييز مادته.
   - تعديل عناوين الدروس والواجبات والأنشطة وفق الصلاحيات الممنوحة له.

5. **تصدير عالي الدقة (High-Resolution Exports)**:
   - **تصدير كصورة PNG عالية الدقة** بدقة طباعة فائقة واحتواء لكامل الترويسة والشعار.
   - **تصدير كمستند PDF** منسق وجاهز للطباعة بدعم كامل للغة العربية والاتجاه من اليمين لليسار (RTL).
   - طباعة مباشرة من المتصفح عبر أنماط طباعة مخصصة.

---

## 🛠️ التقنيات المستخدمة (Tech Stack)

- **Frontend**: Next.js 16 (App Router) + React 19 + JavaScript (No TypeScript)
- **Styling**: Tailwind CSS + Arabic Typography (Cairo Font) + Full RTL
- **Backend API**: Node.js + Express.js + RESTful Architecture
- **Database**: MongoDB + Mongoose ODM
- **Security**: HttpOnly Cookies, JWT, Helmet, Express-Rate-Limit, Mongo-Sanitize, BcryptJS
- **Exporting**: html2canvas, jsPDF

---

## 📁 هيكل المشروع (Project Architecture)

```
employs/
├── backend/                       # خادم Express.js و MongoDB
│   ├── src/
│   │   ├── config/                # إعدادات الاتصال بقاعدة البيانات (db.js)
│   │   ├── controllers/           # وحدات التحكم المنطقية (Auth, Schedules, Users, Roles...)
│   │   ├── middleware/            # التحقق والمصادقة والصلاحيات (Auth, RBAC, AuditLog)
│   │   ├── models/                # نماذج Mongoose (User, Schedule, Subject, Week, Role...)
│   │   ├── routes/                # مسارات REST API
│   │   ├── seed/                  # سكريبت تهيئة البيانات الأولية (seed.js)
│   │   ├── utils/                 # دوال الاستجابة والأخطاء (apiResponse, AppError)
│   │   ├── app.js                 # تكوين تطبيق Express
│   │   └── server.js              # نقطة بدء تشغيل الخادم
│   ├── .env.example
│   └── package.json
├── src/                           # واجهة المستخدم Next.js (App Router)
│   ├── app/
│   │   ├── (auth)/login/          # صفحة تسجيل الدخول
│   │   ├── (dashboard)/
│   │   │   ├── admin/             # لوحات وإدارات المدير (Users, Roles, Schedules, Settings...)
│   │   │   └── teacher/           # بوابة المعلم والجدول
│   │   ├── globals.css            # أنماط RTL والخطوط
│   │   └── layout.js              # المخطط العام والمزودات (Context Providers)
│   ├── components/
│   │   ├── layout/                # الشريط الجانبي (Sidebar) وشريط التنقل (Navbar)
│   │   ├── schedule/              # جدول الحصص الأسبوعي، التنقل بين الأسابيع، التصدير
│   │   └── ui/                    # مكونات الواجهة (Modal, ConfirmDialog, Badge...)
│   ├── contexts/                  # إدارة الحالة العامة (AuthContext, ToastContext)
│   ├── services/                  # دوال استدعاء الـ APIs عبر Axios
│   └── constants/                 # الثوابت والصلاحيات
├── .env.example
├── next.config.mjs
└── package.json
```

---

## 🚀 دليل التشغيل والتثبيت (Getting Started)

### 1. المتطلبات الأساسية (Prerequisites)
- [Node.js](https://nodejs.org/) (إصدار 18 أو أحدث)
- [MongoDB Community Server](https://www.mongodb.com/try/download/community) يعمل على المنفذ `27017`

---

### 2. إعداد وتشغيل خادم الـ Backend

1. انتقل إلى مجلد `backend`:
```bash
cd backend
```

2. تثبيت الحزم:
```bash
npm install
```

3. قم بإنشاء ملف `.env` (أو استخدام القيم الافتراضية من `.env.example`):
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/school_schedule
JWT_SECRET=school_schedule_super_secret_jwt_key_2024_change_me
JWT_EXPIRES_IN=7d
COOKIE_SECRET=school_cookie_secret_change_in_prod
FRONTEND_URL=http://localhost:3000
```

4. **تشغيل سكريبت تهيئة البيانات الأولية (Seed Data)**:
```bash
npm run seed
```
> سيقوم السكريبت بإنشاء الصلاحيات، الأدوار، المواد، والأسابيع، وحسابات المدير والمعلمين مع جدول أسبوعي نموذجي.

5. تشغيل خادم الـ Backend:
```bash
npm start
# أو للتطوير مع إعادة التحميل التلقائي:
npm run dev
```
سيعمل الخادم على الرابط: `http://localhost:5000`

---

### 3. إعداد وتشغيل واجهة المستخدم (Next.js Frontend)

1. من المجلد الرئيسي للمشروع (`employs`):
```bash
npm install
```

2. تشغيل الواجهة في وضع التطوير:
```bash
npm run dev
```
سيعمل الموقع على الرابط: `http://localhost:3000`

---

## 🔑 الحسابات التجريبية الافتراضية (Default Credentials)

| الحساب | البريد الإلكتروني | كلمة المرور | الدور |
| :--- | :--- | :--- | :--- |
| **مدير النظام (Admin)** | `admin@school.com` | `Admin@123456` | صلاحيات كاملة لإدارة النظام والجداول والمدارس |
| **معلم الرياضيات (Math Teacher)** | `teacher@school.com` | `Teacher@123456` | تعديل حصص الرياضيات، الواجبات، الأنشطة، وتصدير الجدول |
| **معلمة العلوم (Science Teacher)** | `science.teacher@school.com` | `Teacher@123456` | تعديل حصص مادة العلوم فقط |

---

## 🛡️ نموذج الصلاحيات الديناميكي (Dynamic RBAC Permissions)

يدعم النظام تخصيص صلاحيات دقيقة لأي دور يتم إنشاؤه:

- **الجداول (Schedules)**:
  - `schedules.view` — عرض الجداول
  - `schedules.create` — إضافة حصص
  - `schedules.edit` — تعديل كامل الحقول
  - `schedules.edit_title` — تعديل عنوان الدرس فقط
  - `schedules.edit_homework` — تعديل الواجب فقط
  - `schedules.edit_activities` — تعديل الأنشطة فقط
  - `schedules.edit_notes` — تعديل الملاحظات فقط
  - `schedules.delete` — حذف حصة
  - `schedules.copy_week` — نسخ أسبوع كامل
  - `schedules.export` — تصدير PNG / PDF
- **المستخدمون (Users)**: `users.view`, `users.create`, `users.edit`, `users.delete`
- **الأدوار (Roles)**: `roles.view`, `roles.create`, `roles.edit`, `roles.delete`
- **المواد (Subjects)**: `subjects.view`, `subjects.create`, `subjects.edit`, `subjects.delete`
- **الإعدادات (Settings)**: `settings.view`, `settings.edit`
- **سجل العمليات (Audit Logs)**: `audit-logs.view`

---

## 🔮 القابلية للتوسع المستقبلي (Future Expansion)

تم بناء هيكلية البيانات وواجهات برمجة التطبيقات بنمط Modular يتيح إضافة:
- **الطلاب (Students)**: عبر إنشاء `Student.model.js` وربطه بالفصول الدراسية.
- **الفصول الدراسية (Classes)**: عبر ربط `Schedule` بمعرف `classId`.
- **الغياب والحضور (Attendance)**: عبر تسجيل حضور الطلاب لكل حصة في `Schedule`.
- **الدرجات والتقييم (Grades & Assessments)**.
- **الواجبات التفاعلية (Online Assignments)**.

---

## 📦 البناء للإنتاج (Production Build)

1. بناء واجهة الـ Frontend:
```bash
npm run build
npm start
```

2. تشغيل الـ Backend في بيئة الإنتاج:
```bash
cd backend
NODE_ENV=production npm start
```
