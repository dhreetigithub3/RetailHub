// Edit Profile Logic

function getToken() {
  return localStorage.getItem("token");
}

async function loadCurrentData() {
  const token = getToken();
  if (!token) {
    window.location.replace("/login.html");
    return;
  }

  try {
    // Load User Data
    const userResponse = await fetch("/auth/me", {
      headers: { "Authorization": "Bearer " + token }
    });

    if (userResponse.ok) {
      const user = await userResponse.json();
      document.getElementById("name").value = user.name || "";
      document.getElementById("username").value = user.username || "";
      document.getElementById("email").value = user.email || "";
      window.currentUserRole = user.role;
    }
  } catch (err) {
    console.error("Error loading profile data:", err);
  }
}

async function handleUpdate(event) {
  event.preventDefault();
  const token = getToken();
  const messageEl = document.getElementById("message");
  
  const data = {
    name: document.getElementById("name").value,
    username: document.getElementById("username").value,
    email: document.getElementById("email").value,
    password: document.getElementById("password").value || null,
    role: window.currentUserRole || "USER"
  };

  messageEl.innerText = "Updating...";
  messageEl.style.color = "var(--text-secondary)";

  try {
    const response = await fetch("/auth/update-profile", {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      const result = await response.json();
      localStorage.setItem("token", result.token);
      localStorage.setItem("username", result.username);
      localStorage.setItem("role", result.role);
      localStorage.setItem("name", result.name);
      localStorage.setItem("isLoggedIn", "true");

      messageEl.innerText = "Profile updated successfully! Redirecting...";
      messageEl.style.color = "var(--success)";

      if (window.updateNavbar) window.updateNavbar();

      setTimeout(() => {
        const dest = result.role === "ADMIN" ? "/admin-home.html" : "/customer-home.html";
        window.location.replace(dest);
      }, 1500);
    } else {
      const err = await response.json().catch(() => ({}));
      messageEl.innerText = err.message || "Update failed. Username or email might be taken.";
      messageEl.style.color = "var(--error)";
    }
  } catch (err) {
    messageEl.innerText = "Network error. Please try again.";
    messageEl.style.color = "var(--error)";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadCurrentData();
  const profileForm = document.getElementById("editProfileForm");
  if (profileForm) {
    profileForm.addEventListener("submit", handleUpdate);
  }
});
