import axios from "axios";
import config from "../config/index.js";
import { authenticate } from "../glxAuth/auth.js";

/**
 * postCommercialEntry
 * Posts the mapped payload to the GLX offer endpoint using an authenticated session cookie.
 * @param {object} payload - The mapped payload to send
 * @returns {Promise<object>} - { status, data, headers }
 */
export async function postCommercialEntry(payload) {
  if (!config.offer_base_url) {
    throw new Error("offer_base_url is not configured (config.offer_base_url)");
  }

  const username = config.auth && config.auth.username;
  const password = config.auth && config.auth.password;

  if (!username || !password) {
    throw new Error(
      "GLX auth credentials missing in config.auth.username/password"
    );
  }

  // Authenticate and get session information (may include Set-Cookie)
  const authRes = await authenticate(username, password);
  if (!authRes || (!authRes.sessionId && !authRes.setCookie)) {
    throw new Error("Failed to obtain session information from GLX auth");
  }

  // Prefer server-provided Set-Cookie if available (ensures cookie name/flags match server)
  let cookieHeader = null;
  if (authRes.setCookie) {
    // authRes.setCookie may be an array of cookie strings
    cookieHeader = Array.isArray(authRes.setCookie)
      ? authRes.setCookie.map((c) => c.split(";")[0]).join("; ")
      : String(authRes.setCookie).split(";")[0];
  } else if (authRes.sessionId) {
    // Fall back to SessionId JSON value if present (server expects Cookie: SessionId=...)
    cookieHeader = `SessionId=${authRes.sessionId}`;
  }

  // Debug: surface what we got from the auth step so we can diagnose 401s
  try {
    console.log("[postCommercialEntry] auth result:", {
      sessionId: authRes.sessionId ? "<present>" : null,
      setCookie: authRes.setCookie ? authRes.setCookie : null,
    });
    console.log("[postCommercialEntry] Cookie header to send:", cookieHeader);
  } catch (e) {
    /* ignore logging errors */
  }

  const base = String(config.offer_base_url).replace(/\/+$/, "");
  const url = `${base}/PostCommercialEntry`;

  // Send POST with sessionId as Cookie header
  try {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (cookieHeader) headers.Cookie = cookieHeader;

    const resp = await axios.post(url, payload, {
      headers,
      timeout: 20000,
    });

    return { status: resp.status, data: resp.data, headers: resp.headers };
  } catch (err) {
    // Normalize error
    if (err.response) {
      // Server responded with non-2xx
      return {
        status: err.response.status,
        data: err.response.data,
        headers: err.response.headers,
        error: err.message,
      };
    }
    // If timeout or network error, make it easier to see
    console.error(
      "[postCommercialEntry] request error:",
      err && err.message ? err.message : err
    );
    throw err;
  }
}
