const DEFAULT_API_BASE = "https://crm.miretazam.com/api";
const STORAGE_KEYS = {
  apiBaseUrl: "gc_api_base_url",
  accessToken: "gc_access_token",
  refreshToken: "gc_refresh_token",
  userEmail: "gc_user_email"
};

async function getSettings() {
  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.apiBaseUrl,
    STORAGE_KEYS.accessToken,
    STORAGE_KEYS.refreshToken,
    STORAGE_KEYS.userEmail
  ]);

  return {
    apiBaseUrl: String(stored[STORAGE_KEYS.apiBaseUrl] || DEFAULT_API_BASE).replace(/\/$/, ""),
    accessToken: stored[STORAGE_KEYS.accessToken] || null,
    refreshToken: stored[STORAGE_KEYS.refreshToken] || null,
    userEmail: stored[STORAGE_KEYS.userEmail] || null
  };
}

async function setTokens({ accessToken, refreshToken, userEmail }) {
  const payload = {};
  if (accessToken !== undefined) payload[STORAGE_KEYS.accessToken] = accessToken;
  if (refreshToken !== undefined) payload[STORAGE_KEYS.refreshToken] = refreshToken;
  if (userEmail !== undefined) payload[STORAGE_KEYS.userEmail] = userEmail;
  await chrome.storage.local.set(payload);
}

async function clearTokens() {
  await chrome.storage.local.remove([
    STORAGE_KEYS.accessToken,
    STORAGE_KEYS.refreshToken,
    STORAGE_KEYS.userEmail
  ]);
}

async function apiFetch(path, options = {}, { retry = true } = {}) {
  const settings = await getSettings();
  if (!settings.accessToken && !path.startsWith("/auth/login") && !path.startsWith("/auth/refresh")) {
    throw new Error("Not logged in. Open extension Options and sign in to GroovCRM.");
  }

  const headers = {
    Accept: "application/json",
    ...(options.headers || {})
  };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (settings.accessToken && !path.startsWith("/auth/login")) {
    headers.Authorization = `Bearer ${settings.accessToken}`;
  }

  const res = await fetch(`${settings.apiBaseUrl}${path}`, {
    ...options,
    headers
  });

  if (res.status === 401 && retry && settings.refreshToken && !path.startsWith("/auth/")) {
    const refreshed = await refreshAccessToken(settings);
    if (refreshed) {
      return apiFetch(path, options, { retry: false });
    }
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message =
      data?.error ||
      data?.message ||
      (typeof data?.details === "string" ? data.details : null) ||
      `Request failed: ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    err.debug = { status: res.status, path, textSnippet: text.slice(0, 300) };
    throw err;
  }

  return { data, status: res.status, debug: { status: res.status, path } };
}

async function refreshAccessToken(settings) {
  try {
    const res = await fetch(`${settings.apiBaseUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refreshToken: settings.refreshToken })
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.accessToken) {
      await clearTokens();
      return false;
    }

    await setTokens({ accessToken: data.accessToken });
    return true;
  } catch {
    await clearTokens();
    return false;
  }
}

async function login({ email, password, rememberMe = true, apiBaseUrl }) {
  const base = String(apiBaseUrl || DEFAULT_API_BASE).replace(/\/$/, "");
  await chrome.storage.local.set({ [STORAGE_KEYS.apiBaseUrl]: base });

  const res = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password, rememberMe })
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Login failed: ${res.status}`);
  }

  await setTokens({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    userEmail: data.user?.email || email
  });

  return { email: data.user?.email || email, name: data.user?.name || null };
}

async function getAuthStatus() {
  const settings = await getSettings();
  if (!settings.accessToken) {
    return { ok: false, loggedIn: false, apiBaseUrl: settings.apiBaseUrl };
  }

  try {
    const { data } = await apiFetch("/auth/me");
    return {
      ok: true,
      loggedIn: true,
      apiBaseUrl: settings.apiBaseUrl,
      email: data?.email || settings.userEmail,
      name: data?.name || null
    };
  } catch (error) {
    return {
      ok: false,
      loggedIn: false,
      apiBaseUrl: settings.apiBaseUrl,
      error: error.message
    };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message?.type === "gc-open-options") {
      chrome.runtime.openOptionsPage();
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === "gc-auth-status") {
      sendResponse(await getAuthStatus());
      return;
    }

    if (message?.type === "gc-login" && message.payload) {
      try {
        const user = await login(message.payload);
        sendResponse({ ok: true, user });
      } catch (error) {
        sendResponse({ ok: false, error: error.message || "Login failed" });
      }
      return;
    }

    if (message?.type === "gc-logout") {
      await clearTokens();
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === "ig-lead-get-handles") {
      try {
        const { data, debug } = await apiFetch("/prospects/lead-index", {
          method: "GET",
          cache: "no-store"
        });
        sendResponse({ ok: true, data, debug });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error.message || "Failed to load leads",
          debug: error.debug || null
        });
      }
      return;
    }

    if (message?.type === "ig-lead-save" && message.payload) {
      try {
        const { data, debug } = await apiFetch("/prospects/instagram-lead", {
          method: "POST",
          body: JSON.stringify(message.payload)
        });
        sendResponse({ ok: true, data, debug });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error.message || "Save failed",
          debug: error.debug || null
        });
      }
      return;
    }

    sendResponse({ ok: false, error: "Unknown message type" });
  })();

  return true;
});
