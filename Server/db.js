const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// در Railway از volume استفاده می‌کنیم، در حالت لوکال از پوشه Server
const dataDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || __dirname;

// مطمئن شو پوشه data وجود دارد (برای Railway)
if (process.env.RAILWAY_VOLUME_MOUNT_PATH && !fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// مسیر فایل دیتابیس
const dbPath = path.join(dataDir, "taskbox.db");

console.log("Database path:", dbPath);

// ایجاد یا باز کردن دیتابیس
const db = new Database(dbPath);

// ایجاد جدول users اگر وجود ندارد
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  )
`);

// ایجاد جدول tasks اگر وجود ندارد
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    user_id INTEGER,
    start_time TEXT,
    end_time TEXT
  )
`);
// ساخت جدول بازدیدها
db.exec(`
  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_count INTEGER DEFAULT 0
  )
`);

// اگر جدول خالی است، یک ردیف اولیه بساز
const visitRow = db.prepare("SELECT COUNT(*) as count FROM visits").get();
if (visitRow.count === 0) {
  db.prepare("INSERT INTO visits (visit_count) VALUES (0)").run();
}
// بررسی و اضافه کردن فیلدهای جدید به جدول tasks (برای دیتابیس‌های قبلی)
const tableInfo = db.prepare("PRAGMA table_info(tasks)").all();

const hasUserId = tableInfo.some(function (col) {
  return col.name === "user_id";
});

const hasStartTime = tableInfo.some(function (col) {
  return col.name === "start_time";
});

const hasEndTime = tableInfo.some(function (col) {
  return col.name === "end_time";
});

if (!hasUserId) {
  db.exec("ALTER TABLE tasks ADD COLUMN user_id INTEGER");
  console.log("Added user_id column to tasks table");
}

if (!hasStartTime) {
  db.exec("ALTER TABLE tasks ADD COLUMN start_time TEXT");
  console.log("Added start_time column to tasks table");
}

if (!hasEndTime) {
  db.exec("ALTER TABLE tasks ADD COLUMN end_time TEXT");
  console.log("Added end_time column to tasks table");
}

console.log("Database and tables created successfully!");

// اکسپورت کردن دیتابیس برای استفاده در فایل‌های دیگر
module.exports = db;