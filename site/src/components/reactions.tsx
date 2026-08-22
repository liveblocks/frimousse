import { Liveblocks as LiveblocksClient } from "@liveblocks/node";
import {
  DEFAULT_REACTIONS,
  isEmojiReaction,
  type ReactionsJson,
  ROOM_ID,
} from "liveblocks.config";
import { cacheLife } from "next/cache";
import { type ComponentProps, Suspense } from "react";
import {
  Reactions as ClientReactions,
  FallbackReactions,
  ReactionsList,
} from "./reactions.client";

const liveblocks = new LiveblocksClient({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

async function ServerReactions() {
  "use cache";

  cacheLife("seconds");

  let reactions: ReactionsJson | undefined;

  try {
    reactions = (await liveblocks.getStorageDocument(ROOM_ID, "json"))
      .reactions;
  } catch {
    /* Do nothing */
  }

  // Empty or uninitialized room: the same defaults the client seeds via
  // initialStorage, so server and live views agree.
  if (!reactions || Object.keys(reactions).length === 0) {
    reactions = DEFAULT_REACTIONS;
  }

  // Clients have write access to the room, so reaction keys can't be trusted
  // to be emojis. Rendering already hides junk keys, but filter them here too
  // to keep vandal content out of the payload.
  reactions = Object.fromEntries(
    Object.entries(reactions).filter(([emoji]) => isEmojiReaction(emoji))
  );

  return <ClientReactions roomId={ROOM_ID} serverReactions={reactions} />;
}

export function Reactions(props: Omit<ComponentProps<"div">, "children">) {
  return (
    <ReactionsList {...props}>
      <Suspense fallback={<FallbackReactions />}>
        <ServerReactions />
      </Suspense>
    </ReactionsList>
  );
}
