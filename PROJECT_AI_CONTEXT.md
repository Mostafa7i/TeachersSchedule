# 🏫 مرجع النظام وسياق الذكاء الاصطناعي | School Schedule & Lesson Plan System
> **ملاحظة للـ AI أو المطور القادم**: هذا الملف تم إعداده ليكون دليلاً شاملاً لكافة تفاصيل وبنية المشروع، قاعدة البيانات، الصفحات، والمميزات التي تمت إضافتها مؤخراً لتبدأ العمل فوراً دون الحاجة لقراءة وتحليل الكود من الصفر.

---

## 📌 1. نظرة عامة على المشروع (Project Overview)
نظام متكامل لإدارة ومتابعة **جداول الحصص المدرسية والتحضير الأسبوعي للمعلمين** للمدارس، يدعم اللغة العربية بالكامل (RTL)، ومصمم ليوفر تجربة مستخدم احترافية تطابق الجداول المدرسية المعتمدة (مثل نظام aSc Timetables) مع لوحة متابعة للإدارة، وبوابات مخصصة للمعلمين، ونظام تنبيهات لحظي، وإمكانية الطباعة وتصدير PDF/PNG عالية الدقة.

---

## 🛠️ 2. البنية التقنية (Tech Stack & Architecture)
* **Frontend**: Next.js 16.3.4 (App Router, Turbopack) + React 19 + Tailwind CSS 4 + Lucide Icons + jsPDF / html-to-image.
* **Backend**: Node.js + Express + Mongoose 8 + JWT (HttpOnly Cookies) + Helmet + CORS + Morgan.
* **Database**: MongoDB (Local or Atlas) - Port 27017 (Default database: `school_schedule`).
* **Ports**:
  * Frontend: `http://localhost:3000`
  * Backend API: `http://localhost:5000` (Prefix: `/api`)

---

## 📂 3. هيكل المجلدات والملفات الرئيسية (Folder Structure)

```text
employs/
├── src/
│   ├── app/                                 # مسارات وواجهات Next.js (App Router)
│   │   ├── dashboard/
│   │   │   ├── admin/
│   │   │   │   ├── teacher-timetables/      # صفحة توزيع الحصص (الجدول المجمع وجداول المعلمين)
│   │   │   │   ├── plan-completion/         # صفحة متابعة إنجاز وتحضير المعلمين والتنبيهات
│   │   │   │   ├── schedules/               # صفحة الخطة المدرسية العامة لجميع الفصول
│   │   │   │   ├── users/                   # إدارة المعلمين والمستخدمين
│   │   │   │   ├── subjects/                # المواد الدراسية وألوانها
│   │   │   │   ├── weeks/                   # الأسابيع والفصول الدراسية
│   │   │   │   ├── settings/                # إعدادات المدرسة والمدير والشعار
│   │   │   │   └── audit-logs/              # سجل حركات وعمليات النظام
│   │   │   ├── teacher/                     # بوابة المعلم (جدول الحصص والتحضير الأسبوعي)
│   │   │   └── layout.js                    # تخطيط لوحة التحكم (الهيدر، الشريط الجانبي)
│   │   ├── login/                           # تسجيل الدخول
│   │   ├── complete-profile/                # استكمال ملف المعلم (الاسم، المواد، الهاتف)
│   │   └── globals.css                      # التنسيقات العامة ومنع الـ Overflow الأفقي
│   │
│   ├── components/                          # المكونات القابلة لإعادة الاستخدام
│   │   ├── schedule/
│   │   │   ├── TeacherTimetableGrid.js      # جدول الحصص الورقي المعتمد (aSc) مع دعم البطاقات والمقياس
│   │   │   ├── MasterTimetableGrid.js       # الجدول الرئيسي المجمع للمعلمين والفصول
│   │   │   ├── WeeklyScheduleTable.js       # جدول خطة التحضير والدروس الأسبوعية
│   │   │   ├── PeriodTimingsModal.js        # نافذة ضبط أوقات الحصص (1-8) والفسحة
│   │   │   ├── ScheduleCellEditModal.js     # نافذة إدخال عنوان الدرس والواجب والملاحظات
│   │   │   ├── WeekNavigator.js             # شريط التنقل بين الأسابيع الدراسية
│   │   │   └── ExportButtons.js             # أزرار تصدير PDF و PNG والطباعة النظيفة
│   │   ├── notifications/
│   │   │   └── NotificationBell.js          # جرس التنبيهات مع القائمة المنسدلة للرسائل
│   │   └── layout/
│   │       ├── Sidebar.js                   # القائمة الجانبية والصلاحيات
│   │       └── Header.js                    # شريط المستخدم العلوي
│   │
│   ├── services/                            # دوال استدعاء الـ API (Axios Client)
│   │   ├── schedules.service.js             # جداول، خلايا مجمعة، إحصائيات إكمال
│   │   ├── users.service.js                 # المعلمون، التفعيل، كلمة المرور
│   │   ├── notifications.service.js         # التنبيهات المباشرة والإرسال الفردي/الجماعي
│   │   ├── settings.service.js              # توقيتات الحصص، الفسحة، بيانات المدرسة
│   │   └── auth.service.js                  # تسجيل الدخول، الجلسة، الملف الشخصي
│   │
│   └── contexts/                            # Context Providers
│       ├── AuthContext.js                   # المستخدم الحالي، تسجيل الخروج، فحص الصلاحيات
│       └── ToastContext.js                  # الإشعارات التنبيهية (Toasts)
│
├── backend/                                 # خادم Node.js / Express المستقل
│   ├── src/
│   │   ├── config/db.js                     # اتصال MongoDB Mongoose
│   │   ├── models/                          # نماذج قاعدة البيانات (Mongoose Models)
│   │   │   ├── User.model.js                # المستخدمون وكلمات المرور المشفرة والمواد
│   │   │   ├── Role.model.js                # الأدوار (super_admin, admin, teacher)
│   │   │   ├── Permission.model.js          # الصلاحيات
│   │   │   ├── Subject.model.js             # المواد الدراسية وألوان العرض
│   │   │   ├── Week.model.js                # الأسابيع وتواريخ البداية والنهاية
│   │   │   ├── Schedule.model.js            # خلايا الحصص (week, day, period, teacher, subject, className, lessonTitle, homework)
│   │   │   ├── SchoolSettings.model.js      # إعدادات المدرسة + periodTimings + breakTime
│   │   │   ├── Notification.model.js        # تنبيهات النظام ورسائل الإدارة للمعلمين
│   │   │   └── AuditLog.model.js            # سجل التغييرات والعمليات
│   │   ├── controllers/                     # المتحكمات
│   │   │   ├── schedules.controller.js      # الحفظ التلقائي، الجدول المجمع، إحصائيات الإنجاز
│   │   │   ├── notifications.controller.js  # التنبيهات المباشرة والإرسال
│   │   │   ├── schoolSettings.controller.js # حفظ التوقيتات وإعدادات الحصص
│   │   │   └── auth.controller.js           # تسجيل الدخول عبر HttpOnly Cookie
│   │   ├── routes/                          # مسارات API RESTful
│   │   ├── middleware/                      # Auth, RBAC, AuditLog, Validation
│   │   └── seed/seed.js                     # سكريبت البيانات التجريبية والصلاحيات
│   └── server.js                            # نقطة تشغيل الخادم الرئيسي (Port 5000)
└── PROJECT_AI_CONTEXT.md                    # هذا الملف (دليل الذكاء الاصطناعي)
```

---

## 🔑 4. حسابات الدخول التجريبية (Default Test Credentials)
تم تهيئة قاعدة البيانات مسبقاً بهذه الحسابات (عبر سكريبت `npm run seed` في مجلد `backend`):
1. **مدير النظام (Super Admin)**:
   * البريد: `admin@school.com`
   * كلمة المرور: `Admin@123456`
   * الصلاحيات: كامل صلاحيات النظام.
2. **معلم الرياضيات (Teacher)**:
   * البريد: `teacher@school.com`
   * كلمة المرور: `Teacher@123456`
   * الصلاحيات: بوابة المعلم، تحضير الحصص المسندة، عرض الجدول المدرسي.

---

## ⚡ 5. أهم المميزات التي تم إنجازها حديثاً (Recently Completed Features)

### أ) الجدول الرئيسي المجمع وتعديل توقيتات الحصص (Master Timetable Grid & Period Timings):
* المسار: `/dashboard/admin/teacher-timetables`
* **الجدول المجمع**: شاشة موحدة للإدارة تمكنها من رؤية وتوزيع جميع حصص اليوم لكافة المعلمين أو الفصول بنقرة زر ودون الحاجة للتنقل بين المعلمين، مع الحفظ التلقائي المباشر (Auto-save) وتحديث قاعدة البيانات لحظياً عبر `POST /api/schedules/master-cell`.
* **ضبط أوقات الحصص**: نافذة مخصصة (Modal) لتعديل عدد الحصص (5-8)، وأوقات البداية والنهاية لكل حصة، وموضع ووقت استراحة الفسحة، وحفظها ديناميكياً في `SchoolSettings`.

### ب) نظام مراقبة اكتمال خطط المعلمين والتنبيهات الآلية (Plan Completion & Notifications):
* المسار: `/dashboard/admin/plan-completion`
* واجهة ذكية تحلل الحصص المسندة للمعلمين وتكشف من لم يقم بتعبئة **عنوان وموضوع الدرس** أو **الواجب المنزلي**.
* إمكانية إرسال تنبيه مباشر لحساب المعلم بنقرة واحدة (أو تنبيه جماعي للمتأخرين)، يظهر فوراً في جرس التنبيهات العلوي (`NotificationBell`).
* تنبيه تحذيري تلقائي يظهر للمعلم في بوابته (`/dashboard/teacher`) يوضح عدد الحصص غير المكتملة لديه لهذا الأسبوع.

### ج) حل مشكلة السكرول العرضي على الموبايل ونظام المقاييس (Mobile Optimization & Scale):
* إزالة أي `minWidth` ثابت من الحاويات الرئيسية ومنع السكرول العرضي للشاشة (`overflow-x: hidden; max-width: 100vw`).
* **عرض البطاقات الذكي (Mobile Cards View)**: يتيح استعراض الحصص اليومية رأسياً مع تبويبات الأيام السريعة دون أي حاجة للتمرير الأفقي.
* **إمكانية العرض كجدول كامل**: خيار متاح دائماً للمعلم والإدارة للتبديل بين (عرض كجدول 📊) و (عرض كبطاقات 📱).
* **مقياس العرض (Scale Controller - 70% | 85% | 100%)**: أداة تحكم سريعة أعلى الجدول تمكن المعلم من تصغير مقياس الجدول ليظهر أكبر قدر ممكن من الأعمدة والحصص على الشاشة مباشرة.

### د) الطباعة والتصدير عالي الدقة (Clean PDF / PNG Export):
* حل خطأ دالة الألوان `lab` في التصدير.
* إخفاء أزرار الواجهة وعناصر التحرير تلقائياً أثناء التصدير والطباعة الورقية.
* الاحتفاظ بالعرض الكامل للجدول أثناء التصدير حتى لو تم طلبه من هاتف ذكي.

---

## 🚀 6. تشغيل المشروع محلياً أو للنشر (Run & Deploy Guide)

### أ) متطلبات التشغيل:
1. Node.js (v18+)
2. MongoDB يعمل محلياً أو رابط MongoDB Atlas عبر متغير البيئة `MONGODB_URI`.

### ب) تشغيل الخادم الخلفي (Backend):
```bash
cd backend
npm install
npm run seed     # لتعبئة الصلاحيات والمستخدمين التجريبيين (لأول مرة)
npm start        # أو npm run dev للتشغيل مع Nodemon على Port 5000
```

### ج) تشغيل الواجهة الأمامية (Frontend):
```bash
npm install
npm run dev      # وضع التطوير على Port 3000
# أو للبناء والإنتاج:
npm run build
npm start
```

### د) متغيرات البيئة الأساسية للإنتاج (Production .env):
* **Frontend (.env.local)**:
  * `NEXT_PUBLIC_API_URL=https://your-api-domain.com/api`
* **Backend (.env)**:
  * `PORT=5000`
  * `NODE_ENV=production`
  * `MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/school_schedule`
  * `JWT_SECRET=your_super_strong_jwt_secret_here`
  * `FRONTEND_URL=https://your-frontend-domain.com`

---

## 💡 7. قواعد مهمة لأي ذكاء اصطناعي قادم (AI Rules & Guidelines)
1. **نظام Next.js 16**: يستخدم App Router بمكونات عميل `"use client"` في واجهات التفاعل، ويجب مراعاة دوال الخادم والمكونات المشتركة.
2. **التعامل مع النصوص العربية في Windows PowerShell**: عند كتابة كود يحتوي نصوص عربية أو اقتباسات معقدة، يُفضل إنشاء سكريبت داخل مجلد الأرتيفاكت أو مجلد مؤقت وتشغيله عبر Node.js لتجنب مشاكل تشفير الأحرف ورموز السطر الجديد (`\n`).
3. **التحقق من البناء**: قبل إنهاء أي مهمة، شغّل دائماً `npm run build` للتأكد التام من خلو الكود من أخطاء الـ JSX أو الأنواع.
4. **تزامن البيانات**: التعديل في الجدول الرئيسي المجمع أو جدول المعلم الفردي يستهدف كولكشن `schedules` نفسها، لذا ينعكس التعديل لحظياً في كل بوابات المعلمين والإدارة.
5. **الطباعة والحفظ التلقائي**: تم إلغاء أزرار الحفظ اليدوية القديمة والاعتماد على الحفظ التلقائي الفوري لتوفير أفضل تجربة للمعلم والإدارة.