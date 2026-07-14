import { NextRequest, NextResponse } from "next/server";
import webPush from "web-push";

export const runtime = "nodejs";

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
};

export async function POST(request: NextRequest) {
  const jwt = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
  const vapidPublicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const subject =
    process.env.WEB_PUSH_VAPID_SUBJECT || "mailto:admin@example.com";
  if (!jwt || !supabaseUrl || !supabasePublicKey || !supabaseSecretKey)
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  if (!vapidPublicKey || !privateKey)
    return NextResponse.json(
      { error: "Web Push ist noch nicht vollständig konfiguriert." },
      { status: 503 },
    );
  const userResponse = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`,
    {
      headers: {
        apikey: supabasePublicKey,
        authorization: `Bearer ${jwt}`,
      },
      cache: "no-store",
    },
  );
  if (!userResponse.ok)
    return NextResponse.json({ error: "Ungültige Sitzung." }, { status: 401 });
  const user = (await userResponse.json()) as { id?: string };
  if (!user.id)
    return NextResponse.json({ error: "Ungültige Sitzung." }, { status: 401 });
  const subscriptionsResponse = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/rest/v1/push_subscriptions?select=id,endpoint,p256dh,auth_key&user_id=eq.${encodeURIComponent(user.id)}`,
    {
      headers: { apikey: supabaseSecretKey },
      cache: "no-store",
    },
  );
  if (!subscriptionsResponse.ok)
    return NextResponse.json(
      { error: "Push-Abonnements konnten nicht geladen werden." },
      { status: 500 },
    );
  const subscriptions =
    (await subscriptionsResponse.json()) as PushSubscriptionRow[];
  if (!subscriptions?.length)
    return NextResponse.json(
      { error: "Auf diesem Account ist noch kein Push-Gerät registriert." },
      { status: 400 },
    );
  webPush.setVapidDetails(subject, vapidPublicKey, privateKey);
  let sent = 0;
  for (const subscription of subscriptions) {
    try {
      await webPush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth_key },
        },
        JSON.stringify({
          title: "Clash Tool",
          body: "Web Push funktioniert – deine Erinnerungen können dich jetzt auch außerhalb der geöffneten App erreichen.",
          url: "/",
        }),
      );
      sent += 1;
    } catch (pushError) {
      const statusCode =
        typeof pushError === "object" && pushError && "statusCode" in pushError
          ? Number(pushError.statusCode)
          : 0;
      if (statusCode === 404 || statusCode === 410)
        await fetch(
          `${supabaseUrl.replace(/\/$/, "")}/rest/v1/push_subscriptions?id=eq.${encodeURIComponent(subscription.id)}`,
          {
            method: "DELETE",
            headers: { apikey: supabaseSecretKey },
          },
        );
    }
  }
  return NextResponse.json({ sent });
}
