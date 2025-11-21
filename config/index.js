import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

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
  auth_base_url: process.env.BASE_URL_AUTH,
  offer_base_url: process.env.BASE_URL_OFFER,
};

export default config;
