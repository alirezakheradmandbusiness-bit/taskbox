const express = require("express");
const path = require("path");
const db = require("./db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const port = 3000;

// رمز مخفی برای امضای توکن‌ها
const JWT_SECRET = "taskbox-secret-key-2024";

app.use(express.json());
app.use(express.static(__dirname));

// ============================================
// تابع احراز هویت (چک کردن توکن)
// ============================================
function authenticateToken(request, response, next) {
  const authHeader = request.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return response.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    request.user = verified;
    next();
  } catch (err) {
    return response.status(401).json({ error: "Invalid token." });
  }
}

// ============================================
// مسیرهای احراز هویت (بدون نیاز به توکن)
// ============================================

// مسیر ثبت‌نام
app.post("/api/register", function (request, response) {
  const { username, password } = request.body;

  if (!username || !password) {
    return response.status(400).json({ error: "Username and password are required" });
  }

  if (password.length < 4) {
    return response.status(400).json({ error: "Password must be at least 4 characters" });
  }

  const existingUser = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

  if (existingUser) {
    return response.status(400).json({ error: "Username already exists" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  const statement = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)");
  const result = statement.run(username, hashedPassword);

  console.log("New user registered:", username);

  response.json({ message: "User registered successfully", userId: result.lastInsertRowid });
});

// مسیر لاگین
app.post("/api/login", function (request, response) {
  const { username, password } = request.body;

  if (!username || !password) {
    return response.status(400).json({ error: "Username and password are required" });
  }

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

  if (!user) {
    return response.status(400).json({ error: "Invalid username or password" });
  }

  const passwordMatch = bcrypt.compareSync(password, user.password);

  if (!passwordMatch) {
    return response.status(400).json({ error: "Invalid username or password" });
  }

  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });

  console.log("User logged in:", username);

  response.json({ message: "Login successful", token: token, username: user.username });
});

// ============================================
// مسیرهای محافظت‌شده (نیاز به توکن دارند)
// ============================================

// خواندن لیست کارها (فقط کارهای کاربر لاگین‌شده)
app.get("/api/tasks", authenticateToken, function (request, response) {
  const userId = request.user.userId;
  const tasks = db.prepare("SELECT * FROM tasks WHERE user_id = ?").all(userId);
  response.json(tasks);
});

// اضافه کردن کار جدید
// اضافه کردن کار جدید
app.post("/api/tasks", authenticateToken, function (request, response) {
  const userId = request.user.userId;
  const { text, start_time } = request.body;

  const statement = db.prepare("INSERT INTO tasks (text, user_id, start_time) VALUES (?, ?, ?)");
  const result = statement.run(text, userId, start_time);

  const newTask = {
    id: result.lastInsertRowid,
    text: text,
    completed: 0,
    user_id: userId,
    start_time: start_time,
    end_time: null
  };

  console.log("Task added by user", userId, ":", newTask);
  response.json(newTask);
});

// حذف کردن کار
app.delete("/api/tasks/:id", authenticateToken, function (request, response) {
  const userId = request.user.userId;
  const taskId = parseInt(request.params.id);

  const statement = db.prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?");
  statement.run(taskId, userId);

  console.log("Task deleted:", taskId, "by user", userId);
  response.json({ message: "Task deleted" });
});

// به‌روزرسانی وضعیت یا متن کار
// به‌روزرسانی وضعیت یا متن کار
app.patch("/api/tasks/:id", authenticateToken, function (request, response) {
  const userId = request.user.userId;
  const taskId = parseInt(request.params.id);

  if (request.body.completed !== undefined) {
    const statement = db.prepare("UPDATE tasks SET completed = ? WHERE id = ? AND user_id = ?");
    statement.run(request.body.completed, taskId, userId);
    console.log("Task completed updated:", taskId);
  }

  if (request.body.text !== undefined) {
    const statement = db.prepare("UPDATE tasks SET text = ? WHERE id = ? AND user_id = ?");
    statement.run(request.body.text, taskId, userId);
    console.log("Task text updated:", taskId);
  }

  if (request.body.end_time !== undefined) {
    const statement = db.prepare("UPDATE tasks SET end_time = ? WHERE id = ? AND user_id = ?");
    statement.run(request.body.end_time, taskId, userId);
    console.log("Task end_time updated:", taskId);
  }

  response.json({ message: "Task updated" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, function () {
  console.log("Server is running on port " + PORT);
});