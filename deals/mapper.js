/**
 * deals/mapper.js
 *
 * Mapper for Deals module that builds the target CommercialEntries payload.
 * Hardcoded values remain as specified by the user. Values wrapped in ${}
 * are taken from the incoming raw event.
 */

function safeGetAccount(data) {
  // Prefer explicit Account_Name object when present
  if (!data) return { code: null, name: null, afm: null };
  const acct = data.Account_Name || data.Account || null;
  // Helper to read AFM from object using several common key variants
  const readAfmFrom = (obj) => {
    if (!obj) return null;
    return obj.Account_AFM || null;
  };

  // Try reading AFM from the account object when it's an object
  let afm = typeof acct === "object" && acct ? readAfmFrom(acct) : null;

  // If not found on the account object, check top-level keys on the event payload
  if (!afm) {
    afm = readAfmFrom(data);
  }

  // Normalize returned code/name depending on whether acct is an object or a simple value
  const code =
    acct && typeof acct === "object" ? acct.id || null : acct || null;
  const name =
    acct && typeof acct === "object" ? acct.name || null : acct || null;

  return { code, name, afm };
}

/**
 * mapDeal
 * Builds the target payload described by the user. Hardcoded values remain as-is.
 * - ${code} / ${cusName} -> fetched from Accounts ERP_Customer_ID when possible
 * - ${dealId} -> data.id
 */
async function mapDeal(rawEnvelope) {
  // rawEnvelope is expected to be the full event payload containing events[]
  const firstEvent =
    (rawEnvelope && rawEnvelope.events && rawEnvelope.events[0]) || null;
  const data =
    firstEvent && firstEvent.data
      ? firstEvent.data
      : (rawEnvelope && rawEnvelope.data) || rawEnvelope;

  const dealId = data && (data.id || data.ID || null);

  // Default customer values from the event
  const account = safeGetAccount(data);
  // Use ERP customer code only. Do NOT default to the CRM record id.
  // customerCode will remain null unless an ERP code is found via the accounts service.
  let customerCode = null;
  let customerName = account.name;

  // If Zoho creds are provided, try to fetch the ERP_Customer_ID from Accounts endpoint
  // NOTE: do not swallow failures from the accounts service. If the account service fails
  // (network, auth, etc.) we want the pipeline to stop and surface the error to the caller.
  // Import accounts service (ESM)
  const accountsServiceMod = await import("../accounts/service.js");
  const accountsService = accountsServiceMod.getAccountERPCode
    ? accountsServiceMod
    : accountsServiceMod.default || accountsServiceMod;
  if (account && account.code) {
    // account.code currently holds account id; attempt to fetch ERP_Customer_ID
    // and AFM (Tin) from the Accounts service
    const erpCode = await accountsService.getAccountERPCode(account.code);
    if (erpCode) customerCode = erpCode;

    // Try fetching AFM/Tin from the accounts service as well; prefer explicit AFM
    const afmFromService =
      typeof accountsService.getAccountAFM === "function"
        ? await accountsService.getAccountAFM(account.code)
        : null;
    if (afmFromService) account.afm = afmFromService;
  }

  // OfficialDate should be today's date in D/M/YYYY format (e.g. 24/4/2020)
  const now = new Date();
  const officialDate = `${now.getDate()}/${
    now.getMonth() + 1
  }/${now.getFullYear()}`;

  // Build Customer object and include Tin only when AFM exists
  // Ensure Code contains ONLY the ERP customer code (or empty string when not available)
  const customerObj = {
    Code: customerCode || "",
    Name: customerName,
  };
  if (account && account.afm) customerObj.Tin = account.afm;

  const payload = {
    CommercialEntries: [
      {
        TradeCode: "",
        EntryTypeCode: "ΠΡΟΣΦΧΟΝ",
        OfficialDate: officialDate,
        CustomerEmail: "",
        CurrencyCode: "EUR",
        WareHouseCode: "00",
        Customer: customerObj,
        VoucherCode: "",
        CommercialEntryLines: [
          {
            ItemID: "OO.PARAGGELIA",
            Qty: 1,
            Price: 1,
          },
        ],
        UserFields: [
          {
            Field: "StringField1",
            Value: dealId,
          },
        ],
      },
    ],
    Client: {
      ClientID: "",
      UserID: "",
      AppName: "MEIDANIS",
      Version: "",
    },
    MessageHeader: {
      RequestID: "",
      AuthKey: "",
      Date: "/Date(-62135596800000)/",
      EntityType: "",
      RecordCount: 1,
      CrcValue: "",
    },
    WebScenario: {
      ID: "",
      Code: "001",
    },
  };

  return payload;
}

export { mapDeal };
