/**
 * deals/mapper.js
 *
 * Mapper for Deals module that builds the target CommercialEntries payload.
 * Hardcoded values remain as specified by the user. Values wrapped in ${}
 * are taken from the incoming raw event.
 */

function safeGetAccount(data) {
  // Prefer explicit Account_Name object when present
  if (!data) return { code: null, name: null };
  const acct = data.Account_Name || data.Account || null;
  if (!acct) return { code: null, name: null };
  return { code: acct.id || null, name: acct.name || null };
}

/**
 * mapDeal
 * Builds the target payload described by the user. Hardcoded values remain as-is.
 * - ${PaymentCode} -> data.Payment_Code
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

  const paymentCode =
    data &&
    (data.Payment_Code !== undefined
      ? data.Payment_Code
      : data.PaymentCode !== undefined
      ? data.PaymentCode
      : null);
  const dealId = data && (data.id || data.ID || null);

  // Default customer values from the event
  const account = safeGetAccount(data);
  let customerCode = account.code;
  let customerName = account.name;

  // If Zoho creds are provided, try to fetch the ERP_Customer_ID from Accounts endpoint
  // NOTE: do not swallow failures from the accounts service. If the account service fails
  // (network, auth, etc.) we want the pipeline to stop and surface the error to the caller.
  const accountsService = require("../accounts/service");
  if (account && account.code) {
    // account.code currently holds account id; attempt to fetch ERP_Customer_ID
    const erpCode = await accountsService.getAccountERPCode(account.code);
    if (erpCode) customerCode = erpCode;
  }

  const payload = {
    CommercialEntries: [
      {
        EntryTypeCode: "ΠΡΟΣΦΧΟΝ",
        OfficialDate: "xxx",
        WareHouseCode: "00",
        PaymentCode: paymentCode,
        Customer: {
          Code: customerCode,
          Name: customerName,
        },
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
  };

  return payload;
}

module.exports = {
  mapDeal,
};
