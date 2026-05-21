// Manage Addresses Logic

function getToken() {
  return localStorage.getItem("token");
}

async function loadAddresses() {
  const token = getToken();
  if (!token) {
    window.location.replace("/login.html");
    return;
  }

  const addressList = document.getElementById("addressList");
  
  try {
    const response = await fetch("/customer/addresses", {
      headers: { "Authorization": "Bearer " + token }
    });

    if (response.ok) {
      const addresses = await response.json();
      window.currentAddresses = addresses;
      
      if (addresses.length === 0) {
        addressList.innerHTML = '<div style="grid-column: 1/-1; padding: 3rem; text-align: center; color: var(--text-muted); border: 2px dashed var(--border); border-radius: var(--radius-lg); background: var(--bg);"><h3>No addresses found</h3><p>Add a new address to get started.</p></div>';
        return;
      }

      addressList.innerHTML = addresses.map(addr => `
        <div class="address-card">
          <div class="address-details">
            <div style="font-weight: 700; color: var(--text); font-size: 1.125rem; margin-bottom: 0.5rem;">${addr.street}</div>
            <div>${addr.city}, ${addr.state} ${addr.zipCode}</div>
            <div>${addr.country}</div>
          </div>
          <div class="address-actions" style="margin-top: 1.5rem; border-top: 1px solid var(--border-light); padding-top: 1rem;">
            <button type="button" class="btn btn-ghost btn-sm" onclick="openAddressModal(${addr.id})">Edit</button>
            <button type="button" class="btn btn-ghost btn-sm" style="color: var(--error);" onclick="deleteAddress(${addr.id})">Delete</button>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error("Error loading addresses:", err);
  }
}

function openAddressModal(addressId = null) {
  const modal = document.getElementById("addressModal");
  const form = document.getElementById("addressForm");
  const title = document.getElementById("modalTitle");
  
  form.reset();
  document.getElementById("addressId").value = "";
  title.innerText = "Add Address";

  if (addressId) {
    const addr = window.currentAddresses.find(a => a.id === addressId);
    if (addr) {
      document.getElementById("addressId").value = addr.id;
      document.getElementById("street").value = addr.street;
      document.getElementById("city").value = addr.city;
      document.getElementById("state").value = addr.state;
      document.getElementById("zipCode").value = addr.zipCode;
      document.getElementById("country").value = addr.country;
      title.innerText = "Edit Address";
    }
  }
  
  modal.classList.add("show");
}

function closeAddressModal() {
  document.getElementById("addressModal").classList.remove("show");
}

async function handleAddressSubmit(event) {
  event.preventDefault();
  const token = getToken();
  const addressId = document.getElementById("addressId").value;
  
  const data = {
    street: document.getElementById("street").value,
    city: document.getElementById("city").value,
    state: document.getElementById("state").value,
    zipCode: document.getElementById("zipCode").value,
    country: document.getElementById("country").value,
    saveAddress: true
  };

  const url = addressId ? `/customer/addresses/${addressId}` : "/customer/addresses";
  const method = addressId ? "PUT" : "POST";

  try {
    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      closeAddressModal();
      loadAddresses();
    } else {
      alert("Failed to save address");
    }
  } catch (err) {
    console.error("Error saving address:", err);
  } finally {
    Loader.forceHide();
  }
}

async function deleteAddress(addressId) {
  if (!confirm("Are you sure you want to delete this address?")) return;
  
  const token = getToken();
  try {
    const response = await fetch(`/customer/addresses/${addressId}`, {
      method: "DELETE",
      headers: { "Authorization": "Bearer " + token }
    });

    if (response.ok) {
      loadAddresses();
    }
  } catch (err) {
    console.error("Error deleting address:", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadAddresses();
  const addressForm = document.getElementById("addressForm");
  if (addressForm) {
    addressForm.addEventListener("submit", handleAddressSubmit);
  }
});
