# sentOfferCRMtoGLX

Professional serverless function template to map Zoho CRM `Deals` events into a CommercialEntries payload and (optionally) forward it to an external ERP/GLX endpoint.

This repository contains a minimal, production-minded implementation with:

- environment-first configuration (`.env` + `config/index.js`)
- Zoho OAuth lookup for Account custom field `ERP_Customer_ID`
- a mapper that transforms incoming Deals events into the target JSON
- a small test harness (`test-run.js`) that pretty-prints payloads and writes `mapped-output.json`

--

## Table of Contents

- [Quick start](#quick-start)
- [Prerequisites](#prerequisites)
- [Configuration (.env)](#configuration-env)
- [How mapping works](#how-mapping-works)
- [Running locally](#running-locally)
- [Enabling live Zoho lookups](#enabling-live-zoho-lookups)
- [Deploying](#deploying)
- [Security and secrets](#security-and-secrets)
- [Extending the project](#extending-the-project)
- [Files of interest](#files-of-interest)
- [License](#license)

## Quick start

1. Install dependencies:

```powershell
npm install
```

2. Create a `.env` in the project root (a sample is already included). Fill the required values (see below).

3. Run the local test harness to see pretty-printed raw and mapped payloads:

```powershell
node .\test-run.js
```

Mapped JSON will be written to `mapped-output.json` in the project root.

## Prerequisites

- Node.js 18+ (or a runtime that provides global `fetch`).
- A Zoho OAuth refresh token + client id/secret if you want live Account lookups.

## Configuration (.env)

The following environment variables are used by the project. Put them in `.env` (do not commit real secrets).

- `AUTH_USERNAME` — (optional) username for external target API (if used)
- `AUTH_PASSWORD` — (optional) password for external target API (if used)
- `BASE_URL` — (optional) base URL for outbound API
- `ZOHO_CLIENT_ID` — Zoho OAuth client id (required for live lookups)
- `ZOHO_CLIENT_SECRET` — Zoho OAuth client secret
- `ZOHO_REFRESH_TOKEN` — Zoho OAuth refresh token
- `ZOHO_ACCOUNTS_BASE_URL` — (optional) Zoho accounts endpoint (defaults to region-aware URL)
- `ZOHO_API_BASE_URL` — (optional) Zoho API base (defaults to `https://www.zohoapis.eu`)

The local `.env` file is already listed in `.gitignore`.

## How mapping works

The mapper (`deals/mapper.js`) follows these rules:

- `PaymentCode` is taken from `data.Payment_Code` in the incoming Deal event.
- `Customer.Code` is resolved from the Accounts module custom field `ERP_Customer_ID` by looking up the Account using the id present in `Account_Name.id`.
  - If the Zoho lookup fails or `ERP_Customer_ID` is not present, the mapper falls back to using the Account id.
- `Customer.Name` is taken from `Account_Name.name` (when present).
- `UserFields[0].Value` is set to the Deal `id`.
- Several fields are intentionally hardcoded to match the target JSON you specified (e.g. `EntryTypeCode`, `OfficialDate: "xxx"`, etc.).

Example mapped payload:

```json
{
  "CommercialEntries": [
    {
      "EntryTypeCode": "ΠΡΟΣΦΧΟΝ",
      "OfficialDate": "xxx",
      "WareHouseCode": "00",
      "PaymentCode": 1,
      "Customer": { "Code": "<ERP_Customer_ID>", "Name": "cusName" },
      "CommercialEntryLines": [
        { "ItemID": "OO.PARAGGELIA", "Qty": 1, "Price": 1 }
      ],
      "UserFields": [{ "Field": "StringField1", "Value": "DealId" }]
    }
  ]
}
```

## Running locally

Use the test harness to validate mapping without calling Zoho (default behavior):

```powershell
node .\test-run.js
```

The script pretty-prints the raw event and the mapped output and writes `mapped-output.json`.

To enable live Zoho lookups for local testing, set:

```powershell
node .\test-run.js
```

> Note: be careful when running live lookups — use sandbox/test Zoho credentials where possible.

## Deploying

This function is intended to run as a serverless event function (Zoho Catalyst or similar). See `catalyst-config.json` for an example runtime config (`execution.main` points to `main.js`).

For production:

1. Move secrets to your platform's secrets store (do not keep `.env`).
2. Deploy using your platform's deployment tools (Catalyst CLI, CI/CD pipeline).
3. Monitor logs and add retry/backoff for outbound HTTP calls.

## Security and best practices

- Do not commit `.env` or any secrets. Use the platform secrets mechanism for production.
- Use least-privilege OAuth credentials and rotate refresh tokens periodically.
- Add retries, exponential backoff, circuit breakers for remote calls.

## Extending the project

- Forwarding: add an HTTP client in `main.js` to POST the mapped payload to your GLX endpoint and handle auth using `AUTH_USERNAME`/`AUTH_PASSWORD`.
- Tests: add unit tests for `deals/mapper.js` that mock `accounts/service.js` so lookups are deterministic.
- Validation: add JSON schema validation for the mapped payload before sending.

## Files of interest

- `main.js` — entry point for the serverless function
- `config/index.js` — environment/config loader
- `deals/mapper.js` — mapping logic (async, uses `accounts/service`)
- `accounts/service.js` — Zoho token exchange + Account lookup, returns `ERP_Customer_ID`
- `test-run.js` — local test harness (pretty prints and writes `mapped-output.json`)
