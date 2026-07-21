const DEFAULT_API_BASE = "https://crm.miretazam.com/api";

const apiBaseUrlInput = document.getElementById("apiBaseUrl");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const statusEl = document.getElementById("status");

function setStatus(message, kind = "") {
  statusEl.textContent = message;
  statusEl.className = `status${kind ? ` ${kind}` : ""}`;
}

async function refreshStatus() {
  const stored = await chrome.storage.local.get(["gc_api_base_url", "gc_user_email"]);
  apiBaseUrlInput.value = stored.gc_api_base_url || DEFAULT_API_BASE;
  if (stored.gc_user_email && !emailInput.value) {
    emailInput.value = stored.gc_user_email;
  }

  const res = await chrome.runtime.sendMessage({ type: "gc-auth-status" });
  if (res?.loggedIn) {
    setStatus(`Signed in as ${res.email || "GroovCRM user"}\nAPI: ${res.apiBaseUrl}`, "ok");
    logoutBtn.disabled = false;
  } else {
    setStatus(res?.error ? `Not signed in — ${res.error}` : "Not signed in", res?.error ? "err" : "");
    logoutBtn.disabled = true;
  }
}

loginBtn.addEventListener("click", async () => {
  const apiBaseUrl = apiBaseUrlInput.value.trim() || DEFAULT_API_BASE;
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    setStatus("Email and password are required.", "err");
    return;
  }

  loginBtn.disabled = true;
  setStatus("Signing in…");

  try {
    const res = await chrome.runtime.sendMessage({
      type: "gc-login",
      payload: { email, password, rememberMe: true, apiBaseUrl }
    });

    if (!res?.ok) {
      throw new Error(res?.error || "Login failed");
    }

    passwordInput.value = "";
    setStatus(`Signed in as ${res.user?.email || email}`, "ok");
    await refreshStatus();
  } catch (error) {
    setStatus(error.message || "Login failed", "err");
  } finally {
    loginBtn.disabled = false;
  }
});

logoutBtn.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "gc-logout" });
  setStatus("Signed out");
  await refreshStatus();
});

refreshStatus();
