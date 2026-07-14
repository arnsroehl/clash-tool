import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webPush from "web-push";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  )
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  if (!url || !secretKey || !publicKey || !privateKey)
    return NextResponse.json(
      { error: "Push-Umgebung ist unvollständig." },
      { status: 503 },
    );
  const client = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: due, error } = await client.rpc("get_due_push_deliveries", {
    cron_token: process.env.CRON_SECRET,
    batch_size: 100,
  });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if (!due?.length) return NextResponse.json({ sent: 0, notifications: 0 });
  webPush.setVapidDetails(
    process.env.WEB_PUSH_VAPID_SUBJECT || "mailto:admin@example.com",
    publicKey,
    privateKey,
  );
  let sent = 0;
  const delivered = new Set<string>();
  const expired = new Set<string>();
  for (const target of due) {
    try {
      await webPush.sendNotification(
        {
          endpoint: target.endpoint,
          keys: { p256dh: target.p256dh, auth: target.auth_key },
        },
        JSON.stringify({ title: target.title, body: target.message, url: "/" }),
      );
      sent += 1;
      delivered.add(target.notification_id);
    } catch (pushError) {
      const statusCode =
        typeof pushError === "object" && pushError && "statusCode" in pushError
          ? Number(pushError.statusCode)
          : 0;
      if (statusCode === 404 || statusCode === 410)
        expired.add(target.subscription_id);
    }
  }
  const { error: finalizeError } = await client.rpc(
    "finalize_push_deliveries",
    {
      cron_token: process.env.CRON_SECRET,
      sent_notification_ids: [...delivered],
      expired_subscription_ids: [...expired],
    },
  );
  if (finalizeError)
    return NextResponse.json(
      { error: finalizeError.message, sent },
      { status: 500 },
    );
  return NextResponse.json({
    sent,
    notifications: delivered.size,
    expiredSubscriptions: expired.size,
  });
}
