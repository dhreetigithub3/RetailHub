// User Management Logic for Admin
let allUsers = [];
let userSearchQuery = '';
let userRoleFilter = 'all';

function getToken() {
  return localStorage.getItem("token");
}

function ensureAdmin() {
  const token = getToken();
  const role = localStorage.getItem("role");

  if (!token || role !== "ADMIN") {
    window.location.replace("/login.html");
    return false;
  }
  return true;
}

async function loadUsers() {
  const userList = document.getElementById("userList");
  if (!userList) return;

  try {
    const response = await fetch("/admin/users", {
      headers: { "Authorization": "Bearer " + getToken() }
    });

    if (!response.ok) throw new Error("Failed to load");

    allUsers = await response.json();
    renderUserTable();
  } catch (err) {
    userList.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">Error loading users.</td></tr>';
  }
}

function renderUserTable() {
  const userList = document.getElementById("userList");
  if (!userList) return;

  const filtered = allUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                          user.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                          user.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                          user.id.toString().includes(userSearchQuery);
    
    const matchesRole = userRoleFilter === 'all' || user.role === userRoleFilter;
    
    return matchesSearch && matchesRole;
  });

  if (!filtered.length) {
    userList.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 3rem;">No users found matching your search.</td></tr>';
    return;
  }

  userList.innerHTML = filtered.map(user => `
    <tr>
      <td>#${user.id}</td>
      <td style="font-weight: 600;">${user.name}</td>
      <td>${user.username}</td>
      <td>${user.email}</td>
      <td><span class="badge" style="background: ${user.role === 'ADMIN' ? 'var(--primary-glow)' : 'var(--bg-alt)'}; color: ${user.role === 'ADMIN' ? 'var(--primary)' : 'var(--text-secondary)'}; border: 1px solid var(--border);">${user.role}</span></td>
      <td>
        <div style="display: flex; gap: 0.5rem;">
          <a href="/edit-user-admin.html?id=${user.id}" class="btn btn-ghost btn-sm">Edit</a>
          <button onclick="deleteUser(${user.id})" class="btn btn-ghost btn-sm" style="color: var(--error);">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function deleteUser(id) {
  if (!confirm("Are you sure you want to delete this user?")) return;

  try {
    const response = await fetch(`/admin/users/${id}`, {
      method: "DELETE",
      headers: { "Authorization": "Bearer " + getToken() }
    });

    if (response.ok) {
      showNotification("User deleted successfully");
      loadUsers();
    } else {
      const result = await response.json().catch(() => ({}));
      showNotification(result.message || "Failed to delete user", "error");
    }
  } catch (err) {
    showNotification("Error connecting to server", "error");
  }
}

async function handleAddUser(event) {
  event.preventDefault();
  const messageEl = document.getElementById("message");

  const data = {
    name: document.getElementById("name").value,
    username: document.getElementById("username").value,
    email: document.getElementById("email").value,
    password: document.getElementById("password").value,
    role: document.getElementById("role").value
  };

  try {
    const response = await fetch("/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + getToken()
      },
      body: JSON.stringify(data)
    });

    const result = await response.json().catch(() => ({}));
    if (response.ok) {
      showNotification("User created successfully");
      setTimeout(() => { window.location.href = "/user-management-admin.html"; }, 1500);
    } else {
      messageEl.innerText = result.message || "Failed to create user";
      messageEl.style.color = "var(--error)";
    }
  } catch (err) {
    showNotification("Error connecting to server", "error");
  }
}

async function handleEditUser(event) {
  event.preventDefault();
  const id = document.getElementById("userId").value;

  const data = {
    name: document.getElementById("name").value,
    username: document.getElementById("username").value,
    email: document.getElementById("email").value,
    role: document.getElementById("role").value
  };

  try {
    const response = await fetch(`/admin/users/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + getToken()
      },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      showNotification("User updated successfully");
      setTimeout(() => { window.location.href = "/user-management-admin.html"; }, 1500);
    } else {
      const result = await response.json().catch(() => ({}));
      showNotification(result.message || "Failed to update user", "error");
    }
  } catch (err) {
    showNotification("Error connecting to server", "error");
  }
}

// Simple notification system
function showNotification(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = "animate-fade-in";
  toast.style.position = "fixed";
  toast.style.bottom = "2rem";
  toast.style.right = "2rem";
  toast.style.padding = "1rem 2rem";
  toast.style.borderRadius = "var(--radius)";
  toast.style.background = type === "success" ? "var(--success)" : "var(--error)";
  toast.style.color = "white";
  toast.style.boxShadow = "var(--shadow-lg)";
  toast.style.zIndex = "2000";
  toast.innerText = message;

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

document.addEventListener("DOMContentLoaded", () => {
  if (!ensureAdmin()) return;

  if (document.getElementById("userList")) {
    loadUsers();

    // Smart Filter Listeners
    const searchInput = document.getElementById('adminUserSearch');
    const roleSelect = document.getElementById('adminRoleFilter');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        userSearchQuery = e.target.value;
        renderUserTable();
      });
    }

    if (roleSelect) {
      roleSelect.addEventListener('change', (e) => {
        userRoleFilter = e.target.value;
        renderUserTable();
      });
    }
  }

  const addUserForm = document.getElementById("addUserForm");
  if (addUserForm) {
    addUserForm.addEventListener("submit", handleAddUser);
  }

  const editUserForm = document.getElementById("editUserForm");
  if (editUserForm) {
    editUserForm.addEventListener("submit", handleEditUser);

    // Fill form if editing
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
      document.getElementById("userId").value = id;
      // Optionally fetch user details to pre-fill
      fetch(`/admin/users/${id}`, {
        headers: { "Authorization": "Bearer " + getToken() }
      }).then(res => res.json()).then(user => {
        document.getElementById("name").value = user.name;
        document.getElementById("username").value = user.username;
        document.getElementById("email").value = user.email;
        document.getElementById("role").value = user.role;
      });
    }
  }
});
