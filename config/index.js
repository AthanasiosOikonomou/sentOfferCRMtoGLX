const fs = require("fs");
const path = require("path");

// Use dotenv for local development; in production rely on platform env/secrets
require("dotenv").config();

// Grouped configuration export
const config = {
  auth: {
    username: process.env.AUTH_USERNAME || "",
    password: process.env.AUTH_PASSWORD || "",
  },
  api: {
    baseUrl: process.env.BASE_URL || "",
  },
  zoho: {
    clientId: process.env.ZOHO_CLIENT_ID || "",
    clientSecret: process.env.ZOHO_CLIENT_SECRET || "",
    refreshToken: process.env.ZOHO_REFRESH_TOKEN || "",
    accountsBaseUrl:
      process.env.ZOHO_ACCOUNTS_BASE_URL || "https://accounts.zoho.eu",
    apiBaseUrl: process.env.ZOHO_API_BASE_URL || "https://www.zohoapis.eu",
  },
};

module.exports = config;
