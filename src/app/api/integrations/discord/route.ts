import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const jwt = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!jwt || !url || !key) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await client.auth.getUser(jwt);
  if (error || !user) return NextResponse.json({ error: "Ungültige Sitzung." }, { status: 401 });

  const body = await request.json() as { webhookUrl?: string; summary?: string };
  let webhook: URL;
  try { webhook = new URL(body.webhookUrl || ""); } catch { return NextResponse.json({ error: "Ungültige Discord-Webhook-URL." }, { status: 400 }); }
  const allowedHost = webhook.hostname === "discord.com" || webhook.hostname.endsWith(".discord.com") || webhook.hostname === "discordapp.com" || webhook.hostname.endsWith(".discordapp.com");
  if (webhook.protocol !== "https:" || !allowedHost || !webhook.pathname.startsWith("/api/webhooks/")) return NextResponse.json({ error: "Erlaubt sind ausschließlich offizielle Discord-Webhook-URLs." }, { status: 400 });
  const summary = String(body.summary || "").trim().slice(0, 1900);
  if (!summary) return NextResponse.json({ error: "Die Planung ist leer." }, { status: 400 });
  const discordResponse = await fetch(webhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: `**Clash-Tool-Planung**\n${summary}` }), cache: "no-store", redirect: "error" });
  if (!discordResponse.ok) return NextResponse.json({ error: "Discord hat den Webhook abgelehnt." }, { status: discordResponse.status });
  return NextResponse.json({ ok: true });
}
