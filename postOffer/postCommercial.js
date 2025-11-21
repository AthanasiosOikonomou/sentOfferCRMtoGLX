import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import dotenv from "dotenv";

dotenv.config();

// 1. CONFIGURATION
const CONFIG = {
  BASE_URL: "http://192.168.0.123:9096", // Defined centrally like your test
  USERNAME: process.env.AUTH_USERNAME,
  PASSWORD: process.env.AUTH_PASSWORD,
  TIMEOUT: 60000,
};

// 2. SETUP CLIENT
// FIX: Added baseURL here. This ensures CookieJar matches the domain perfectly.
const jar = new CookieJar();
const client = wrapper(
  axios.create({
    baseURL: CONFIG.BASE_URL,
    jar,
    timeout: CONFIG.TIMEOUT,
    headers: {
      "Content-Type": "application/json",
      Connection: "keep-alive",
    },
  })
);

// Internal helper: Authentication
async function authenticate() {
  if (!CONFIG.USERNAME || !CONFIG.PASSWORD) {
    throw new Error("❌ Missing AUTH_USERNAME or AUTH_PASSWORD in .env");
  }

  // FIX: Use relative path, exactly like your working local test
  const url = `/auth?username=${encodeURIComponent(
    CONFIG.USERNAME
  )}&password=${encodeURIComponent(CONFIG.PASSWORD)}`;

  console.log(`[auth] 🟡 Authenticating user: ${CONFIG.USERNAME}...`);

  const start = Date.now();
  const res = await client.get(url);

  console.log(`[auth] 🟢 Success (${Date.now() - start}ms)`);
  return res.data;
}

// -------------------------------------------------------
// EXPORTED FUNCTION
// -------------------------------------------------------
export async function postCommercialEntry(payload) {
  try {
    // 1. Ensure we have a session
    await authenticate();

    // FIX: Use relative path. The CookieJar relies on the baseURL context.
    const url = `/PostCommercialEntry`;

    console.log(`[post] 🟡 Posting Entry to ${CONFIG.BASE_URL}${url}...`);

    // 2. Send Payload
    const start = Date.now();
    const res = await client.post(url, payload);

    console.log(`[post] 🟢 Success (${Date.now() - start}ms)`);

    return res;
  } catch (err) {
    // 3. DETAILED ERROR LOGGING
    console.error("\n❌ POST COMMERCIAL ENTRY FAILED");
    console.error("------------------------------------------------");

    if (axios.isAxiosError(err)) {
      if (err.response) {
        console.error(`Status Code: ${err.response.status}`);
        console.error("RAW RESPONSE DATA:");
        console.log(JSON.stringify(err.response.data, null, 2));
      } else if (err.request) {
        console.error("No Response Received (Network Timeout/Firewall)");
        console.error(err.message);
      } else {
        console.error("Request Setup Error:", err.message);
      }
    } else {
      console.error("Runtime Error:", err);
    }
    console.error("------------------------------------------------");

    throw err;
  }
}
