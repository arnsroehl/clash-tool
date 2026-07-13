import { createPublicKey, verify } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  buildDiscordInteractionResponse,
  isDiscordTimestampFresh,
  type DiscordInteraction,
} from "@/features/discord/discord-interactions";

export const runtime = "nodejs";

function verifyDiscordRequest(
  body: string,
  signature: string,
  timestamp: string,
  publicKeyHex: string,
): boolean {
  try {
    if (
      !/^[0-9a-f]{64}$/i.test(publicKeyHex) ||
      !/^[0-9a-f]{128}$/i.test(signature)
    )
      return false;
    const spkiPrefix = Buffer.from("302a300506032b6570032100", "hex");
    const key = createPublicKey({
      key: Buffer.concat([spkiPrefix, Buffer.from(publicKeyHex, "hex")]),
      format: "der",
      type: "spki",
    });
    return verify(
      null,
      Buffer.from(timestamp + body),
      key,
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY || "";
  const signature = request.headers.get("x-signature-ed25519") || "";
  const timestamp = request.headers.get("x-signature-timestamp") || "";
  const body = await request.text();
  if (!publicKey)
    return NextResponse.json(
      { error: "Discord public key is not configured." },
      { status: 503 },
    );
  if (!isDiscordTimestampFresh(timestamp))
    return NextResponse.json(
      { error: "Expired request timestamp." },
      { status: 401 },
    );
  if (!verifyDiscordRequest(body, signature, timestamp, publicKey))
    return NextResponse.json(
      { error: "Invalid request signature." },
      { status: 401 },
    );

  let interaction: DiscordInteraction;
  try {
    interaction = JSON.parse(body) as DiscordInteraction;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  return NextResponse.json(buildDiscordInteractionResponse(interaction));
}
