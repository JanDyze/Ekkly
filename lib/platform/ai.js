// Whether a church may use an AI feature right now, and on which model.
//
// Two switches decide it, and both must be on: the platform's own (Console →
// AI, for switching every AI call off at once) and the church's plan (the AI
// assist app). The model is the platform's choice per feature, read from
// platform/private with a minute's cache (lib/platform/config.js).
import { enabledAppsFrom } from "../apps.js";
import { withAiDefaults } from "../aiModels.js";
import { getPlatformPrivate } from "./config.js";

export { recordAiUse } from "./usage.js";

/**
 * `{ allowed: true, model }` or `{ allowed: false, reason }`.
 * `church` is lib/tenant.js's `{ id, ref, data }`.
 */
export async function aiAccess(church, feature) {
  const [privateConfig, apps] = await Promise.all([
    getPlatformPrivate(),
    church.ref.collection("subscription").doc("apps").get(),
  ]);

  const ai = withAiDefaults(privateConfig.ai);
  if (!ai.enabled) {
    return { allowed: false, reason: "AI features are switched off on the platform for now." };
  }

  const enabled = enabledAppsFrom(apps.exists ? apps.data() : null);
  if (enabled && !enabled.has("ai")) {
    return {
      allowed: false,
      reason: "AI assist is not part of this church's plan. An administrator can turn it on under Settings → Apps & plan.",
    };
  }

  return { allowed: true, model: ai.models[feature] };
}
