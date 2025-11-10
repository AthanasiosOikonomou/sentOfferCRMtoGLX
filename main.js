// Load configuration (will read .env if present)
require("./config");

module.exports = async (event, context) => {
  // RAW_DATA comes from the `Deals` module
  const RAW_DATA = event.getRawData();
  console.log("RAW DATA ", JSON.stringify(RAW_DATA));

  // Map the raw deal to the target payload (mapper will be implemented per rules)
  try {
    const { mapDeal } = require("./deals/mapper");
    const mapped = await mapDeal(RAW_DATA);
    console.log("MAPPED PAYLOAD ", JSON.stringify(mapped));
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    console.error("Mapper error:", err && err.stack ? err.stack : err);
    // On mapping/account lookup failure we stop the function and report failure
    if (context && typeof context.closeWithFailure === "function") {
      // Provide the error message to the platform/context where supported
      try {
        context.closeWithFailure(msg);
      } catch (e) {
        /* ignore */
      }
    }
    return;
  }

  // Keep handler minimal for now — forwarding will be added later
  context.closeWithSuccess();
};
