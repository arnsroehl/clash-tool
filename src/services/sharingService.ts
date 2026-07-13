import { getSupabaseClient } from "@/lib/supabase";

export async function sharePlanningToDiscord(
  webhookUrl: string,
  summary: string,
): Promise<void> {
  const {
    data: { session },
  } = await getSupabaseClient().auth.getSession();
  if (!session) throw new Error("Bitte melde dich erneut an.");
  const response = await fetch("/api/integrations/discord", {
    method: "POST",
    headers: {
      authorization: `Bearer ${session.access_token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ webhookUrl, summary }),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Discord-Freigabe fehlgeschlagen.");
}
