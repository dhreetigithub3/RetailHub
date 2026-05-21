async function registerUser(event) {
  event.preventDefault();

  const messageEl = document.getElementById("message");
  messageEl.innerText = "Processing...";
  messageEl.style.color = "var(--text-secondary)";

  const data = {
    name: document.getElementById("name").value,
    username: document.getElementById("username").value,
    email: document.getElementById("email").value,
    password: document.getElementById("password").value
  };

  try {
    const response = await fetch("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await response.json().catch(() => ({}));

    if (response.ok) {
      messageEl.innerText = result.message || "Registration successful! Redirecting...";
      messageEl.style.color = "var(--success)";
      setTimeout(() => {
        window.location.href = "/login.html";
      }, 1500);
    } else {
      messageEl.innerText = result.message || "Registration failed. Please try again.";
      messageEl.style.color = "var(--error)";
    }
  } catch (err) {
    messageEl.innerText = "Network error. Please check your connection.";
    messageEl.style.color = "var(--error)";
  }
}

async function loginUser(event) {
  event.preventDefault();

  const messageEl = document.getElementById("message");
  messageEl.innerText = "Signing in...";
  messageEl.style.color = "var(--text-secondary)";

  const data = {
    username: document.getElementById("username").value,
    password: document.getElementById("password").value
  };

  try {
    const response = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      messageEl.innerText = result.message || "Invalid credentials. Please try again.";
      messageEl.style.color = "var(--error)";
      return;
    }

    // Store auth data
    localStorage.setItem("token", result.token);
    localStorage.setItem("username", result.username);
    localStorage.setItem("role", result.role);
    localStorage.setItem("name", result.name);
    localStorage.setItem("isLoggedIn", "true");

    messageEl.innerText = "Login successful! Redirecting...";
    messageEl.style.color = "var(--success)";

    setTimeout(() => {
      if (result.role === "ADMIN") {
        window.location.href = "/admin-home.html";
      } else {
        window.location.href = "/index.html";
      }
    }, 1000);
  } catch (err) {
    messageEl.innerText = "Network error. Please check your connection.";
    messageEl.style.color = "var(--error)";
  } finally {
    Loader.forceHide();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");
  const loginForm = document.getElementById("loginForm");

  if (signupForm) {
    signupForm.addEventListener("submit", registerUser);
  }

  if (loginForm) {
    loginForm.addEventListener("submit", loginUser);
  }
});