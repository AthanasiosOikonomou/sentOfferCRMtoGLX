// Load configuration (will read .env if present)
import "./config/index.js";

export default async function handler(event, context) {
  // DEAL_DETAILS comes from the `Deals` module
  const DEAL_DETAILS = event.getRawData();
  console.log("Deal Details ", JSON.stringify(DEAL_DETAILS));

  // Map the raw deal to the target payload (mapper will be implemented per rules)
  try {
    const mapperMod = await import("./deals/mapper.js");
    const mapDeal =
      mapperMod.mapDeal || (mapperMod.default && mapperMod.default.mapDeal);
    if (typeof mapDeal !== "function") {
      throw new Error("mapDeal is not a function in ./deals/mapper.js");
    }
    const mapped = await mapDeal(DEAL_DETAILS);
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
  if (context && typeof context.closeWithSuccess === "function") {
    context.closeWithSuccess();
  }
}
