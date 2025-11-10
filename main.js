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
    console.error("Mapper error:", err && err.stack ? err.stack : err);
    // proceed — still close successfully for now; adjust behavior when wiring HTTP
  }

  // Keep handler minimal for now — forwarding will be added later
  context.closeWithSuccess();
};
