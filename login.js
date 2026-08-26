// تابع جابه‌جایی بین تب‌ها
function switchTab(tab) {
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const loginTab = document.getElementById("loginTab");
  const signupTab = document.getElementById("signupTab");

  if (tab === "login") {
    loginForm.classList.add("active");
    signupForm.classList.remove("active");
    loginTab.classList.add("active");
    signupTab.classList.remove("active");
  } else {
    loginForm.classList.remove("active");
    signupForm.classList.add("active");
    loginTab.classList.remove("active");
    signupTab.classList.add("active");
  }
}

// پردازش فرم لاگین
document.getElementById("loginForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  const errorEl = document.getElementById("loginError");

  errorEl.textContent = "";

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      // ذخیره توکن و نام کاربری در localStorage
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.username);

      // هدایت به صفحه اصلی
      window.location.href = "/";
    } else {
      errorEl.textContent = data.error;
    }
  } catch (err) {
    errorEl.textContent = "Something went wrong. Please try again.";
  }
});

// پردازش فرم ثبت‌نام
document.getElementById("signupForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  const username = document.getElementById("signupUsername").value.trim();
  const password = document.getElementById("signupPassword").value;
  const confirm = document.getElementById("signupConfirm").value;
  const errorEl = document.getElementById("signupError");
  const successEl = document.getElementById("signupSuccess");

  errorEl.textContent = "";
  successEl.textContent = "";

  // بررسی تطابق رمز عبور
  if (password !== confirm) {
    errorEl.textContent = "Passwords do not match.";
    return;
  }

  try {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      successEl.textContent = "Account created! You can now login.";

      // پاک کردن فرم
      document.getElementById("signupUsername").value = "";
      document.getElementById("signupPassword").value = "";
      document.getElementById("signupConfirm").value = "";

      // رفتن به تب لاگین بعد از ۱.۵ ثانیه
      setTimeout(function () {
        switchTab("login");
        successEl.textContent = "";
      }, 1500);
    } else {
      errorEl.textContent = data.error;
    }
  } catch (err) {
    errorEl.textContent = "Something went wrong. Please try again.";
  }
});