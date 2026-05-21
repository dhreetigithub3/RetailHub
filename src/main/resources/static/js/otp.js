// OTP Verification & Password Reset Logic

async function sendOtp() {
  const username = document.getElementById("username").value;
  const msg = document.getElementById("otpSendMessage");

  if (!username) {
    msg.innerText = "Please enter your username.";
    msg.style.color = "var(--error)";
    return;
  }

  msg.innerText = "Sending code...";
  msg.style.color = "var(--text-secondary)";

  try {
    const response = await fetch(`/auth/otp/send?username=${encodeURIComponent(username)}`, {
      method: "POST"
    });

    const result = await response.text();

    if (response.ok) {
      msg.innerText = "OTP sent successfully to your registered email.";
      msg.style.color = "var(--success)";
      document.getElementById("verifyOtpSection").style.display = "block";
    } else {
      msg.innerText = result || "Failed to send OTP. Please check your username.";
      msg.style.color = "var(--error)";
    }
  } catch (err) {
    msg.innerText = "Network error occurred.";
    msg.style.color = "var(--error)";
  }
}

async function verifyOtp() {
  const username = document.getElementById("username").value;
  const otp = document.getElementById("otp").value;
  const msg = document.getElementById("otpVerifyMessage");

  if (!username || !otp) {
    msg.innerText = "Username and OTP are required.";
    msg.style.color = "var(--error)";
    return;
  }

  msg.innerText = "Verifying...";
  msg.style.color = "var(--text-secondary)";

  try {
    const response = await fetch(`/auth/otp/verify?username=${encodeURIComponent(username)}&otp=${encodeURIComponent(otp)}`, {
      method: "POST"
    });

    const result = await response.text();

    if (response.ok) {
      msg.innerText = "Code verified! You can now set a new password.";
      msg.style.color = "var(--success)";
      document.getElementById("resetPasswordSection").style.display = "block";
    } else {
      msg.innerText = result || "Invalid OTP. Please try again.";
      msg.style.color = "var(--error)";
    }
  } catch (err) {
    msg.innerText = "Error connecting to server.";
    msg.style.color = "var(--error)";
  }
}

async function resetPassword() {
  const username = document.getElementById("username").value;
  const otp = document.getElementById("otp").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const msg = document.getElementById("resetPasswordMessage");

  if (!newPassword || !confirmPassword) {
    msg.innerText = "Please fill in all password fields.";
    msg.style.color = "var(--error)";
    return;
  }

  if (newPassword !== confirmPassword) {
    msg.innerText = "Passwords do not match.";
    msg.style.color = "var(--error)";
    return;
  }

  msg.innerText = "Updating password...";
  msg.style.color = "var(--text-secondary)";

  try {
    const response = await fetch(`/auth/otp/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, otp, newPassword, confirmPassword })
    });

    const result = await response.text();

    if (response.ok) {
      msg.innerText = "Password reset successful! Redirecting to login...";
      msg.style.color = "var(--success)";
      setTimeout(() => { window.location.href = "/login.html"; }, 2000);
    } else {
      msg.innerText = result || "Failed to reset password.";
      msg.style.color = "var(--error)";
    }
  } catch (err) {
    msg.innerText = "Error processing request.";
    msg.style.color = "var(--error)";
  }
}