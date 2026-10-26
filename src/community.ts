export const communityBase = import.meta.env.VITE_COMMUNITY_URL
  ? import.meta.env.VITE_COMMUNITY_URL.replace(/\/$/, "") + "/__community"
  : import.meta.env.DEV
    ? "/__community"
    : "";
export async function communityRequest(
  route: string,
  body: unknown = {},
  session = "",
) {
  if (!communityBase)
    throw Error(
      "The live community service is not configured for this published blog yet.",
    );
  const response = await fetch(communityBase + route, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Community-Client": "1",
      ...(session ? { Authorization: "Bearer " + session } : {}),
    },
    body: JSON.stringify(body),
  });
  const value = await response.json();
  if (!response.ok)
    throw Object.assign(
      Error(value.error || "Community service unavailable."),
      { status: response.status },
    );
  return value;
}
