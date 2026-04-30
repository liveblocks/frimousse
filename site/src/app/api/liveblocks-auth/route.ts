import { Liveblocks } from "@liveblocks/node";
import { ipAddress } from "@vercel/functions";
import { type NextRequest, NextResponse } from "next/server";
import { createUserId } from "./create-user-id";

function getLiveblocks() {
  return new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY!,
  });
}

export async function POST(request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const liveblocks = getLiveblocks();
  const userId = createUserId(
    ipAddress(request),
    process.env.LIVEBLOCKS_USER_ID_SALT,
  );
  const session = liveblocks.prepareSession(userId);
  session.allow("*", session.FULL_ACCESS);
  const { status, body } = await session.authorize();

  return new NextResponse(body, { status });
}
