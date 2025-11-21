import "./config/index.js";
// We use static imports now because they are cleaner and safer
import { mapDeal } from "./deals/mapper.js";
import { postCommercialEntry } from "./postOffer/postCommercial.js";

export default async function handler(event, context) {
  // 1. GET DATA
  const DEAL_DETAILS = event.getRawData();
  console.log("\nDeal Details:", JSON.stringify(DEAL_DETAILS, null, 2));

  try {
    // 2. MAPPER
    // We assume mapDeal is exported from mapper.js
    if (typeof mapDeal !== "function") {
      throw new Error("mapDeal is not a function in ./deals/mapper.js");
    }

    let mapped = await mapDeal(DEAL_DETAILS);
    console.log("\nMAPPED PAYLOAD:", JSON.stringify(mapped, null, 2));

    // 3. SEND TO GLX
    console.log(
      "[main] Sending mapped payload to GLX via postCommercialEntry..."
    );

    // This will throw an error automatically if the server returns 4xx or 5xx
    // because of how we set up axios in the previous file.
    const glxResp = await postCommercialEntry(mapped);

    // 4. SUCCESS HANDLING
    console.log("--- GLX Success ---");
    console.log("Status:", glxResp.status);
    // IMPORTANT: Only log .data. Logging the whole object causes a circular JSON crash.
    console.log("Response:", JSON.stringify(glxResp.data, null, 2));

    if (context && typeof context.closeWithSuccess === "function") {
      context.closeWithSuccess();
    }
  } catch (err) {
    // 5. GLOBAL ERROR HANDLING
    console.error("\n❌ PROCESS FAILED");

    // Determine the error message safely
    let errorMsg = String(err);

    // If it's an Axios error passed from postCommercial, it might have details
    if (err.response) {
      console.error(`GLX Error Status: ${err.response.status}`);
      console.error(
        "GLX Error Data:",
        JSON.stringify(err.response.data, null, 2)
      );
      errorMsg = `GLX Failed: ${err.response.status} - ${err.response.statusText}`;
    } else if (err.message) {
      console.error("Error Message:", err.message);
      errorMsg = err.message;
    }

    // Close context with failure
    if (context && typeof context.closeWithFailure === "function") {
      try {
        context.closeWithFailure(errorMsg);
      } catch (e) {
        console.error("Failed to close context:", e);
      }
    }
  }
}
