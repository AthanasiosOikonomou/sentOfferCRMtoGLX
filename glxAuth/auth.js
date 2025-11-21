// glxAuth/auth.js
import axios from "axios";
import config from "../config/index.js";
/**
 * Authenticates a user and returns the SessionId.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<string>} SessionId
 */
export async function authenticate(username, password) {
  try {
    const url = `${config.auth_base_url}/auth?username=${encodeURIComponent(
      username
    )}&password=${encodeURIComponent(password)}`;

    const response = await axios.get(url);

    // Some GLX deployments return a SessionId in the JSON body,
    // others set a cookie via the Set-Cookie header. Capture both.
    const sessionId = response.data && response.data.SessionId;
    const setCookie = response.headers && response.headers["set-cookie"];

    if (!sessionId && !setCookie) {
      // Log full response for easier debugging
      console.error(
        "Authentication returned no SessionId and no Set-Cookie header:",
        {
          status: response.status,
          data: response.data,
          headers: response.headers,
        }
      );
      throw new Error(
        "Invalid authentication response: missing SessionId/Set-Cookie"
      );
    }

    // Return both values; callers can prefer Set-Cookie when present
    return { sessionId, setCookie };
  } catch (err) {
    console.error("Authentication error:", err.message);
    throw err;
  }
}
