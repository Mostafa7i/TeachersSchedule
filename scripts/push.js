#!/usr/bin/env node
/**
 * scripts/push.js
 * Cross-platform script to stage, commit, and push updates to GitHub
 * for both the Frontend (TeachersSchedule) and Backend (TeachersBack) repositories.
 *
 * Usage:
 *   node scripts/push.js                  # Pushes both with default message
 *   node scripts/push.js "Update message" # Pushes both with custom message
 *   node scripts/push.js --target=front   # Pushes only Frontend
 *   node scripts/push.js --target=back    # Pushes only Backend
 */

const { execSync } = require("child_process");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const backendDir = path.join(rootDir, "backend");

// Parse CLI arguments
const args = process.argv.slice(2);
let target = "all";
let customMessage = "";

for (const arg of args) {
  if (arg.startsWith("--target=")) {
    target = arg.split("=")[1].toLowerCase();
  } else if (!customMessage) {
    customMessage = arg;
  }
}

const defaultMessage = `Auto update: ${new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}`;
const commitMsg = customMessage || defaultMessage;

function run(command, cwd) {
  try {
    return execSync(command, { cwd, stdio: "pipe", encoding: "utf-8" }).trim();
  } catch (err) {
    const errorOutput = err.stderr ? err.stderr.toString() : err.message;
    throw new Error(errorOutput);
  }
}

function pushRepo(name, dir, repoUrl) {
  console.log(`\n==================================================`);
  console.log(`🚀 بدء رفع تحديثات: [ ${name} ]`);
  console.log(`📁 المسار: ${dir}`);
  console.log(`==================================================`);

  try {
    // 1. Check status
    const status = run("git status --porcelain", dir);
    if (!status) {
      console.log(
        `ℹ️ لا توجد تعديلات غير محفوظة في ${name}. جاري فحص الـ Commits المعلقة...`,
      );
    } else {
      console.log(`📦 جاري إضافة الملفات المعدلة (git add)...`);
      run("git add -A", dir);

      console.log(`✍️ جاري عمل Commit: "${commitMsg}"`);
      run(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, dir);
    }

    // 2. Push to remote
    console.log(`🌐 جاري الرفع إلى GitHub (${repoUrl})...`);
    const pushResult = run("git push origin main", dir);
    if (pushResult) console.log(pushResult);

    console.log(`✅ تم رفع ${name} بنجاح إلى GitHub! 🎉`);
  } catch (error) {
    if (
      error.message.includes("Everything up-to-date") ||
      error.message.includes("nothing to commit")
    ) {
      console.log(`✅ ${name} محدث بالفعل على GitHub (Everything up-to-date).`);
    } else {
      console.error(`❌ خطأ أثناء رفع ${name}:`, error.message);
    }
  }
}

console.log(`\n🔄 أداة رفع التحديثات التلقائية إلى GitHub`);

if (target === "all" || target === "front" || target === "frontend") {
  pushRepo(
    "Frontend (Next.js)",
    rootDir,
    "https://github.com/Mostafa7i/TeachersSchedule",
  );
}

if (target === "all" || target === "back" || target === "backend") {
  pushRepo(
    "Backend (Express API)",
    backendDir,
    "https://github.com/Mostafa7i/TeachersBack",
  );
}

console.log(`\n✨ اكتملت العملية!\n`);
