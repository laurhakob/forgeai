type FeatureKey = "screenshot_upload" | "inline_code_edit";

/**
 * Returns a 403 response when the caller lacks `feature`, otherwise `undefined`.
 * The result must be returned by the handler — discarding it lets the request
 * through ungated.
 */
export const requirePro = <T>(
  auth: () => { has: (p: { feature: FeatureKey }) => boolean },
  status: (code: 403, body: { error: string }) => T,
  feature: FeatureKey,
): T | undefined => {
  const { has } = auth();

  if (!has({ feature })) return status(403, { error: "Pro is required" });

  return undefined;
};
