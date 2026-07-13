import { getSupabaseClient } from "@/lib/supabase";

function base64UrlToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const bytes = atob(base64);
  return Uint8Array.from(bytes, (character) => character.charCodeAt(0));
}

export async function enableWebPush(): Promise<void> {
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  )
    throw new Error("Web Push wird von diesem Browser nicht unterstützt.");
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
  if (!publicKey)
    throw new Error(
      "Web Push ist auf dem Server noch nicht vollständig konfiguriert.",
    );
  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    throw new Error("Benachrichtigungen wurden nicht erlaubt.");
  const registration = await navigator.serviceWorker.register("/sw.js");
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(publicKey),
    }));
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth)
    throw new Error(
      "Der Browser hat kein vollständiges Push-Abonnement erstellt.",
    );
  const client = getSupabaseClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Bitte melde dich erneut an.");
  const { error } = await client
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth_key: json.keys.auth,
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
  if (error) throw new Error(error.message);
}

export async function sendTestPush(): Promise<void> {
  const {
    data: { session },
  } = await getSupabaseClient().auth.getSession();
  if (!session) throw new Error("Bitte melde dich erneut an.");
  const response = await fetch("/api/push/test", {
    method: "POST",
    headers: { authorization: `Bearer ${session.access_token}` },
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Test-Push konnte nicht gesendet werden.");
}
