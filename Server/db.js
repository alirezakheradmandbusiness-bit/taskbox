const Database = require("better-sqlite3");
const path = require("path");

// مسیر فایل دیتابیس: در کنار همین فایل (db.js)
const dbPath = path.join(__dirname, "taskbox.db");

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