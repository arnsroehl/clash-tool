import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webPush from "web-push";

export const runtime = "nodejs";

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
  const client = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: subscriptions, error } = await client
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth_key")
    .eq("user_id", user.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
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
        await client
          .from("push_subscriptions")
          .delete()
          .eq("id", subscription.id);
    }
  }
  return NextResponse.json({ sent });
}
