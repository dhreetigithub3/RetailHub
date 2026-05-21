// Profile Page Logic

function getToken() {
  return localStorage.getItem("token");
}

async function loadProfile() {
  const token = getToken();
  if (!token) {
    window.location.replace("/login.html");
    return;
  }

  try {
    const response = await fetch("/auth/me", {
      headers: { "Authorization": "Bearer " + token }
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.clear();
        window.location.replace("/login.html");
      }
      throw new Error("Failed to load profile");
    }

    const user = await response.json();

    // Populate elements
    document.getElementById("profileFullName").innerText = user.name || "-";
    document.getElementById("profileUsername").innerText = user.username || "-";
    document.getElementById("profileEmail").innerText = user.email || "-";
    document.getElementById("profileMobile").innerText = user.mobile || "-";

    const initial = user.name ? user.name.charAt(0).toUpperCase() : (user.username ? user.username.charAt(0).toUpperCase() : "U");
    document.getElementById("profileInitial").innerText = initial;

    // Set edit link with ID
    const editBtn = document.getElementById("adminEditBtn");
    if (editBtn) {
      editBtn.href = `/edit-user-admin.html?id=${user.id}`;
    }

  } catch (err) {
    console.error("Profile load error:", err);
    // Show error in UI
    const card = document.querySelector(".card");
    if (card) {
      card.innerHTML = `<div class="empty-state" style="padding: 2rem;">
        <h3>Unable to load profile</h3>
        <p class="text-muted">There was an error connecting to the server. Please try again later.</p>
        <button onclick="window.location.reload()" class="btn btn-primary btn-sm">Retry</button>
      </div>`;
    }
  }
}

async function deleteAccount() {
  const password = prompt(
    "Enter your password to confirm account deletion"
  );

  if (!password) return;

  if (!confirm(
    "Are you absolutely sure you want to delete your account? This action cannot be undone and all your data will be permanently removed."
  )) {
    return;
  }

  const token = getToken();
  try {
    const response = await fetch("/auth/delete-account", {
      method: "DELETE",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": "Bearer " + token 
      },
      body: JSON.stringify({
        password: password
      })

    });

    if (response.ok) {
      alert("Your account has been successfully deleted.");
      localStorage.clear();
      window.location.replace("/index.html");
    } else {
      const data = await response.json().catch(() => ({}));
      alert(data.message || "Failed to delete account. Please try again.");
    }
  } catch (err) {
    alert("An error occurred while deleting your account.");
  } finally {
    Loader.forceHide();
  }
}

function requireAdminProfileGate() {
  if (document.body.getAttribute("data-admin-profile") !== "true") {
    return true;
  }
  const token = getToken();
  const role = localStorage.getItem("role");
  if (!token || role !== "ADMIN") {
    window.location.replace("/login.html");
    return false;
  }
  return true;
}

document.addEventListener("DOMContentLoaded", () => {
  if (!requireAdminProfileGate()) return;
  loadProfile();
});
