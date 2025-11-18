import { authenticate } from "./auth.js";
import config from "../config/index.js";

(async () => {
  try {
    const sessionId = await authenticate(
      config.auth.username,
      config.auth.password
    );
    console.log("SessionId:", sessionId);
  } catch (err) {
    console.error("Auth failed:", err.message);
  }
})();
