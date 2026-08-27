// ============================================
// بررسی لاگین بودن کاربر
// ============================================
const token = localStorage.getItem("token");
const username = localStorage.getItem("username");

if (!token) {
  window.location.href = "/login.html";
}

// نمایش نام کاربری در هدر
document.getElementById("usernameDisplay").textContent = username || "User";

// تابع خروج
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  window.location.href = "/login.html";
}

// ============================================
// متغیرهای عمومی
// ============================================
let allTasks = [];
let currentFilter = "all";
let pendingTaskText = "";
let pendingTaskId = null;

// ============================================
// تابع کمکی برای فرستادن درخواست با توکن
// ============================================
function authFetch(url, options = {}) {
  const headers = options.headers || {};
  headers["Authorization"] = "Bearer " + token;

  return fetch(url, {
    ...options,
    headers: headers
  });
}

// ============================================
// تابع کمکی برای گرفتن زمان فعلی
// ============================================
function getCurrentDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return year + "-" + month + "-" + day + "T" + hours + ":" + minutes;
}

// ============================================
// پاپ‌آپ زمان شروع
// ============================================
function openStartModal(taskText) {
  pendingTaskText = taskText;
  document.getElementById("startTimeInput").value = getCurrentDateTime();
  document.getElementById("startTimeModal").classList.add("active");
}

function closeStartModal() {
  document.getElementById("startTimeModal").classList.remove("active");
  pendingTaskText = "";
}

async function confirmStartTime() {
  const startTime = document.getElementById("startTimeInput").value;
  const taskText = pendingTaskText;

  if (!startTime) {
    alert("Please select a start time.");
    return;
  }

  closeStartModal();

  const response = await authFetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: taskText, start_time: startTime })
  });

  const savedTask = await response.json();

  allTasks.push(savedTask);

  if (currentFilter === "all" || currentFilter === "active") {
    createTaskElement(savedTask);
  }

  updateStats();
  document.getElementById("taskInput").value = "";
}

// ============================================
// پاپ‌آپ زمان اتمام
// ============================================
function openEndModal(taskId) {
  pendingTaskId = taskId;
  document.getElementById("endTimeInput").value = getCurrentDateTime();
  document.getElementById("endTimeModal").classList.add("active");
}

function closeEndModal() {
  document.getElementById("endTimeModal").classList.remove("active");
  pendingTaskId = null;
}

async function confirmEndTime() {
  const endTime = document.getElementById("endTimeInput").value;
  const taskId = pendingTaskId;

  if (!endTime) {
    alert("Please select an end time.");
    return;
  }

  closeEndModal();

  await authFetch("/api/tasks/" + taskId, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed: 1, end_time: endTime })
  });

  const task = allTasks.find(function (t) {
    return t.id === taskId;
  });

  if (task) {
    task.completed = 1;
    task.end_time = endTime;
  }

  updateStats();
  renderTasks();
}

// ============================================
// آمار
// ============================================
function updateStats() {
  const total = allTasks.length;
  const completed = allTasks.filter(function (task) {
    return task.completed === 1;
  }).length;
  const remaining = total - completed;

  document.getElementById("stat-total").textContent = "Total: " + total;
  document.getElementById("stat-completed").textContent = "Completed: " + completed;
  document.getElementById("stat-remaining").textContent = "Remaining: " + remaining;
}

// ============================================
// بارگذاری کارها از سرور
// ============================================
async function loadTasks() {
  const response = await authFetch("/api/tasks");

  if (response.status === 401) {
    window.location.href = "/login.html";
    return;
  }

  allTasks = await response.json();
  renderTasks();
  updateStats();
}

// ============================================
// نمایش کارها بر اساس فیلتر
// ============================================
function renderTasks() {
  const list = document.getElementById("taskList");
  list.innerHTML = "";

  let filteredTasks = allTasks;

  if (currentFilter === "active") {
    filteredTasks = allTasks.filter(function (task) {
      return task.completed === 0;
    });
  } else if (currentFilter === "completed") {
    filteredTasks = allTasks.filter(function (task) {
      return task.completed === 1;
    });
  }

  filteredTasks.forEach(function (task) {
    createTaskElement(task);
  });
}

// ============================================
// تغییر فیلتر
// ============================================
function setFilter(filter, clickedButton) {
  currentFilter = filter;
  renderTasks();

  const buttons = document.querySelectorAll(".filter-btn");
  buttons.forEach(function (btn) {
    btn.classList.remove("active");
  });
  clickedButton.classList.add("active");
}

// ============================================
// ویرایش متن کار (با دابل‌کلیک)
// ============================================
function startEditing(task, taskTextSpan) {
  const currentText = task.text;

  const input = document.createElement("input");
  input.type = "text";
  input.value = currentText;
  input.className = "edit-input";

  taskTextSpan.replaceWith(input);
  input.focus();

  input.onkeydown = async function (event) {
    if (event.key === "Enter") {
      const newText = input.value.trim();

      if (newText !== "" && newText !== currentText) {
        await authFetch("/api/tasks/" + task.id, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: newText })
        });

        task.text = newText;
      }

      renderTasks();
    }

    if (event.key === "Escape") {
      renderTasks();
    }
  };

  input.onblur = function () {
    renderTasks();
  };
}

// ============================================
// فرمت کردن زمان برای نمایش
// ============================================
function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) return "";
  const date = new Date(dateTimeStr);
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const dayName = dayNames[date.getDay()];
  const day = date.getDate();
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return dayName + ", " + month + " " + day + " " + year + " at " + hours + ":" + minutes;
}

// ============================================
// ساختن یک آیتم کار
// ============================================
function createTaskElement(task) {
  const newTask = document.createElement("li");

  const taskContent = document.createElement("div");
  taskContent.className = "task-content";

  const taskTextSpan = document.createElement("span");
  taskTextSpan.textContent = task.text;
  taskTextSpan.className = "task-text";

  taskContent.appendChild(taskTextSpan);

  if (task.start_time) {
    const startTimeEl = document.createElement("div");
    startTimeEl.className = "task-time";
    startTimeEl.textContent = "Start: " + formatDateTime(task.start_time);
    taskContent.appendChild(startTimeEl);
  }

  if (task.end_time) {
    const endTimeEl = document.createElement("div");
    endTimeEl.className = "task-time";
    endTimeEl.textContent = "End: " + formatDateTime(task.end_time);
    taskContent.appendChild(endTimeEl);
  }

  taskTextSpan.ondblclick = function () {
    if (task.completed === 0) {
      startEditing(task, taskTextSpan);
    }
  };

  const completeButton = document.createElement("button");
  completeButton.className = "complete-btn";

  if (task.completed === 1) {
    completeButton.textContent = "Completed";
    completeButton.classList.add("completed");
  } else {
    completeButton.textContent = "Complete";
  }

  completeButton.onclick = async function () {
    if (task.completed === 1) {
      await authFetch("/api/tasks/" + task.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: 0 })
      });

      task.completed = 0;
      task.end_time = null;

      updateStats();
      renderTasks();
    } else {
      openEndModal(task.id);
    }
  };

  const deleteButton = document.createElement("button");
  deleteButton.textContent = "Delete";
  deleteButton.className = "delete-btn";
  deleteButton.onclick = async function () {
    await authFetch("/api/tasks/" + task.id, {
      method: "DELETE"
    });

    allTasks = allTasks.filter(function (t) {
      return t.id !== task.id;
    });

    newTask.remove();
    updateStats();
  };

  newTask.appendChild(taskContent);
  newTask.appendChild(completeButton);
  newTask.appendChild(deleteButton);

  const list = document.getElementById("taskList");
  list.appendChild(newTask);
}

// ============================================
// اضافه کردن کار جدید
// ============================================
function addTask() {
  const input = document.getElementById("taskInput");
  const taskText = input.value.trim();

  if (taskText === "") {
    alert("Please enter a task first.");
    return;
  }

  openStartModal(taskText);
}

// ============================================
// اینتر برای اضافه کردن کار
// ============================================
document.getElementById("taskInput").addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    addTask();
  }
});

// ============================================
// زوم بک‌گراند
// ============================================
const mainWrapper = document.querySelector(".main-wrapper");
const bgLayer = document.querySelector(".bg-layer");

mainWrapper.addEventListener("mouseenter", function () {
  bgLayer.classList.add("zoom");
});

mainWrapper.addEventListener("mouseleave", function () {
  bgLayer.classList.remove("zoom");
});

// ============================================
// بارگذاری اولیه
// ============================================
loadTasks();