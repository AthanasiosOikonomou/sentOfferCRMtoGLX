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

    if (!response.data || !response.data.SessionId) {
      throw new Error("Invalid authentication response: missing SessionId");
    }

    return response.data.SessionId;
  } catch (err) {
    console.error("Authentication error:", err.message);
    throw err;
  }
}
