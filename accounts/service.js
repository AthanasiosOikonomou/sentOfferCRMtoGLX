require("./config");

// Simple in-memory token cache
let cached = {
  accessToken: null,
  expiry: 0,
};

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

async function getAccessToken() {
  const zoho = config.zoho || {};
  const { clientId, clientSecret, refreshToken } = zoho;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Zoho credentials are missing in config (ZOHO_CLIENT_ID/SECRET/REFRESH_TOKEN)"
    );
  }

  if (cached.accessToken && cached.expiry > nowSeconds() + 60) {
    return cached.accessToken;
  }

  const accountsBase = zoho.accountsBaseUrl || "https://accounts.zoho.eu";
  const url = `${accountsBase.replace(/\/?$/, "")}/oauth/v2/token`;

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

  cached.accessToken = json.access_token;
  const expiresIn = json.expires_in || json.expires_in_sec || 3600;
  cached.expiry = nowSeconds() + Number(expiresIn);
  return cached.accessToken;
}

async function getAccountERPCode(accountId) {
  if (!accountId) return null;
  // Allow tests/local runs to disable live Zoho lookups
  if (
    process.env.DISABLE_ZOHO_LOOKUP &&
    process.env.DISABLE_ZOHO_LOOKUP !== "0"
  ) {
    return null;
  }
  const zoho = config.zoho || {};
  const apiBase = (zoho.apiBaseUrl || "https://www.zohoapis.eu").replace(
    /\/?$/,
    ""
  );

  // get access token
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
  // Zoho returns { data: [ { ... } ], info: { ... } }
  if (json && Array.isArray(json.data) && json.data.length > 0) {
    const record = json.data[0];
    // custom field API name is ERP_Customer_ID per your note
    return record.ERP_Customer_ID || null;
  }
  return null;
}

async function getAccountAFM(accountId) {
  if (!accountId) return null;
  // Allow tests/local runs to disable live Zoho lookups
  if (
    process.env.DISABLE_ZOHO_LOOKUP &&
    process.env.DISABLE_ZOHO_LOOKUP !== "0"
  ) {
    return null;
  }
  const zoho = config.zoho || {};
  const apiBase = (zoho.apiBaseUrl || "https://www.zohoapis.eu").replace(
    /\/?$/,
    ""
  );

  // get access token
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
    const record = json.data[0];
    // AFM/TIN might be stored under several possible API names; check common variants
    return (
      record.Account_AFM ||
      record.Account_afm ||
      record.account_afm ||
      record.AFM ||
      record.afm ||
      record.AccountAFM ||
      null
    );
  }
  return null;
}

module.exports = {
  getAccountERPCode,
  getAccountAFM,
};
