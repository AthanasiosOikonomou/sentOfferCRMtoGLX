import config from "../config/index.js";

// In-memory token cache
const tokenCache = { accessToken: null, expiry: 0 };

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function shouldSkipZohoLookup() {
  return (
    process.env.DISABLE_ZOHO_LOOKUP && process.env.DISABLE_ZOHO_LOOKUP !== "0"
  );
}

async function getAccessToken() {
  const zoho = config.zoho || {};
  const { clientId, clientSecret, refreshToken } = zoho;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Zoho credentials missing (ZOHO_CLIENT_ID/SECRET/REFRESH_TOKEN)"
    );
  }

  if (tokenCache.accessToken && tokenCache.expiry > nowSeconds() + 60) {
    return tokenCache.accessToken;
  }

  const accountsBase = (
    zoho.accountsBaseUrl || "https://accounts.zoho.eu"
  ).replace(/\/?$/, "");
  const url = `${accountsBase}/oauth/v2/token`;

  const params = new URLSearchParams();
  params.append("refresh_token", refreshToken);
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("grant_type", "refresh_token");

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Failed to fetch Zoho access token: ${resp.status} ${txt}`);
  }

  const json = await resp.json();
  if (!json.access_token) {
    throw new Error("No access_token in Zoho token response");
  }

  tokenCache.accessToken = json.access_token;
  const expiresIn = json.expires_in || json.expires_in_sec || 3600;
  tokenCache.expiry = nowSeconds() + Number(expiresIn);
  return tokenCache.accessToken;
}

async function fetchAccountRecord(accountId) {
  if (!accountId) return null;
  if (shouldSkipZohoLookup()) return null;

  const zoho = config.zoho || {};
  const apiBase = (zoho.apiBaseUrl || "https://www.zohoapis.eu").replace(
    /\/?$/,
    ""
  );
  const token = await getAccessToken();

  const url = `${apiBase}/crm/v2/Accounts/${encodeURIComponent(accountId)}`;
  let resp;
  try {
    resp = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    throw new Error(
      `Failed to call Zoho API for account ${accountId}: ${err.message}`
    );
  }

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Zoho API returned ${resp.status}: ${txt}`);
  }

  const json = await resp.json();
  if (json && Array.isArray(json.data) && json.data.length > 0) {
    return json.data[0];
  }
  return null;
}

async function getAccountERPCode(accountId) {
  const record = await fetchAccountRecord(accountId);
  if (!record) return null;
  return record.ERP_Customer_ID || null;
}

async function getAccountAFM(accountId) {
  const record = await fetchAccountRecord(accountId);
  if (!record) return null;
  return record.Account_AFM || null;
}

export { getAccountERPCode, getAccountAFM };
