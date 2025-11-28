function safeGetAccount(data) {
  if (!data) return { code: null, name: null, afm: null };

  const acct = data.Account_Name ?? data.Account ?? null;

  const readAfm = (obj) =>
    obj && (obj.Account_AFM || obj.Account_afm || obj.AFM || obj.afm || null);

  const afm = readAfm(acct) ?? readAfm(data) ?? null;

  let code = null;
  let name = null;
  if (acct && typeof acct === "object") {
    code = acct.id ?? acct.ID ?? acct.Code ?? acct.code ?? null;
    name = acct.name ?? acct.Name ?? null;
  } else {
    code = acct ?? null;
    name = acct ?? null;
  }

  return { code, name, afm };
}

async function mapDeal(rawEnvelope) {
  const firstEvent = rawEnvelope?.events?.[0] ?? null;
  const data = firstEvent?.data ?? rawEnvelope?.data ?? rawEnvelope ?? {};

  const dealId = data?.id ?? data?.ID ?? null;

  const account = safeGetAccount(data);
  let customerCode = null;
  const customerName = account.name ?? null;

  // Try to enrich with account info from accounts service when available
  if (account?.code) {
    const accountsServiceMod = await import("../accounts/service.js");
    const accountsService = accountsServiceMod.getAccountERPCode
      ? accountsServiceMod
      : accountsServiceMod.default || accountsServiceMod;

    const erpCode = await accountsService.getAccountERPCode(account.code);
    if (erpCode) customerCode = erpCode;

    if (typeof accountsService.getAccountAFM === "function") {
      const afmFromService = await accountsService.getAccountAFM(account.code);
      if (afmFromService) account.afm = afmFromService;
    }
  }

  const now = new Date();
  const officialDate = `${now.getDate()}/${
    now.getMonth() + 1
  }/${now.getFullYear()}`;

  const customerObj = {
    Code: customerCode || "",
    Name: customerName,
  };
  if (account?.afm) customerObj.Tin = account.afm;

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
        CommercialEntryLines: [{ ItemID: "OO.PARAGGELIA", Qty: 1, Price: 1 }],
        UserFields: [{ Field: "StringField1", Value: dealId }],
      },
    ],
    Client: { ClientID: "", UserID: "", AppName: "MEIDANIS", Version: "" },
    MessageHeader: {
      RequestID: "",
      AuthKey: "",
      Date: "/Date(-62135596800000)/",
      EntityType: "",
      RecordCount: 1,
      CrcValue: "",
    },
    WebScenario: { ID: "", Code: "001" },
  };

  return payload;
}

export { mapDeal };
