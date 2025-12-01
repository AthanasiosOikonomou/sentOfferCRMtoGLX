import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import dotenv from "dotenv";
import http from "http";
import https from "https";

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
    },
  })
);
// Use global agents to enable keep-alive without passing agents to axios
// (axios-cookiejar-support rejects custom http/https agents when used via wrapper)
http.globalAgent = new http.Agent({ keepAlive: true, maxSockets: 100 });
https.globalAgent = new https.Agent({ keepAlive: true, maxSockets: 100 });

// Simple in-memory session cache (lives per container/process)
const sessionCached = { lastAuth: 0, ttlMs: 25 * 60 * 1000 };

// Internal helper: Authentication
async function authenticate() {
  if (!CONFIG.USERNAME || !CONFIG.PASSWORD) {
    throw new Error("❌ Missing AUTH_USERNAME or AUTH_PASSWORD in .env");
  }

  // FIX: Use relative path, exactly like your working local test
  const url = `/auth?username=${encodeURIComponent(
    CONFIG.USERNAME
  )}&password=${encodeURIComponent(CONFIG.PASSWORD)}`;

  // If the cookie jar already has a session cookie for the base host,
  // and we recently authenticated, skip re-authentication.
  try {
    const cookieBase = CONFIG.BASE_URL.replace(/\/$/, "") + "/";
    const cookieHeader = await jar.getCookieString(cookieBase);
    const hasSession =
      cookieHeader &&
      (cookieHeader.includes("ss-id") || cookieHeader.includes("ss-pid"));
    if (
      hasSession &&
      Date.now() - sessionCached.lastAuth < sessionCached.ttlMs
    ) {
      return null; // already authenticated for this container
    }
  } catch (cjErr) {
    // ignore cookie read errors and continue to authenticate
  }

  console.log(`[auth] 🟡 Authenticating user: ${CONFIG.USERNAME}...`);
  const start = Date.now();
  const res = await client.get(url);
  console.log(`[auth] 🟢 Success (${Date.now() - start}ms)`);

  // If server responded with a SessionId in the body, inject into the jar
  try {
    const cookieBase = CONFIG.BASE_URL.replace(/\/$/, "") + "/";
    if (res?.data?.SessionId) {
      const cookieStr1 = `ss-id=${res.data.SessionId}; Path=/; HttpOnly`;
      const cookieStr2 = `ss-pid=${res.data.SessionId}; Path=/; HttpOnly`;
      await jar.setCookie(cookieStr1, cookieBase);
      await jar.setCookie(cookieStr2, cookieBase);
    }
  } catch (cjErr) {
    console.warn("[auth] Failed to set cookie in jar:", cjErr.message);
  }

  sessionCached.lastAuth = Date.now();
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
