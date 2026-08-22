"use client";

import { LiveMap } from "@liveblocks/client";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
  useMutation,
  useSelf,
  useStorage,
} from "@liveblocks/react/suspense";
import NumberFlow from "@number-flow/react";
import {
  CREATED_AT_KEY,
  DEFAULT_KEYS_COUNT,
  DEFAULT_REACTIONS,
  getVisibleReactions,
  getVisibleReactionsEntries,
  isJunkReaction,
  MAX_REACTIONS,
  type ReactionsJson,
  sortReactionsEntries,
  UPDATED_AT_KEY,
} from "liveblocks.config";
import {
  type ComponentProps,
  createContext,
  memo,
  type RefObject,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useIsInitialRender } from "@/hooks/use-initial-render";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsMounted } from "@/hooks/use-mounted";
import { getFastBoundingRects } from "@/lib/get-fast-bounding-rects";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "./ui/drawer";
import { EmojiPicker } from "./ui/emoji-picker";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

const ZWJ = "\u200D";
const SKIN_TONE_MODIFIERS =
  /\u{1F3FB}|\u{1F3FC}|\u{1F3FD}|\u{1F3FE}|\u{1F3FF}/gu;
const REACTIONS_HIDING_DEBOUNCE_DELAY = 500;

interface ReactionButtonProps
  extends Pick<ComponentProps<"button">, "onClick" | "disabled"> {
  type?: "fallback" | "server" | "client";
  emoji: string;
  count: number;
  active?: boolean;
  hidden?: boolean;
}

interface ReactionPlaceholderProps
  extends Omit<ComponentProps<"div">, "children"> {
  emoji: string;
}

interface AddReactionButtonProps
  extends Omit<ComponentProps<"button">, "children"> {
  onEmojiSelect?: (emoji: string) => void;
}

interface ReactionsProps {
  roomId: string;
  serverReactions: ReactionsJson;
}

const FirstHiddenReactionIndexContext = createContext<number>(
  Number.POSITIVE_INFINITY
);

const AddReactionContext = createContext<RefObject<(emoji: string) => void>>({
  current: () => {},
});

function getBaseEmoji(emoji: string) {
  return emoji
    .split(ZWJ)
    .map((segment) => segment.replace(SKIN_TONE_MODIFIERS, ""))
    .join(ZWJ);
}

const numberFlowTransition: EffectTiming = {
  duration: 300,
  easing: "cubic-bezier(0.75, 0, 0.175, 1)",
};

const ReactionButton = memo(
  ({
    type = "client",
    emoji,
    active,
    count,
    hidden,
    disabled,
    onClick,
  }: ReactionButtonProps) => {
    const isMounted = useIsMounted();
    const isInitialRender = useIsInitialRender();

    return (
      <button
        aria-hidden={hidden ? "true" : undefined}
        aria-label={`${count} reaction${count !== 1 ? "s" : ""} with ${emoji}`}
        aria-pressed={active}
        className={cn(
          buttonVariants({ variant: "none" }),
          "group rounded-full border border-transparent bg-muted px-2.5 py-1 text-sm tabular-nums will-change-transform hover:border-border hover:bg-background focus-visible:border-border focus-visible:bg-background data-[state=open]:border-border data-[state=open]:bg-background",
          active && !isInitialRender
            ? "border-accent/80 bg-accent/10 text-accent outline-accent/20 selection:bg-accent/30 hover:border-accent hover:bg-accent/20 focus-visible:border-accent dark:bg-accent/20 dark:focus-visible:bg-accent/20 dark:hover:bg-accent/30 dark:selection:bg-accent/40"
            : "text-secondary-foreground focus-visible:border-muted-foreground/80"
        )}
        data-count={count}
        data-reaction={emoji}
        disabled={(type === "client" ? isInitialRender : true) || disabled}
        onClick={onClick}
        tabIndex={hidden ? -1 : undefined}
        type="button"
      >
        <span
          className={cn("inline-flex items-center gap-1.5", {
            "opacity-0": type === "fallback",
            "fade-in animate-in fill-mode-both duration-300 ease-out":
              type === "server" && !isMounted && isInitialRender,
            "animate-none opacity-100": type === "client",
          })}
        >
          <span className="relative transition-transform will-change-transform group-active:rotate-6 group-active:scale-80">
            {emoji}
          </span>{" "}
          <NumberFlow
            className="inline-flex justify-center transition-[width] duration-300 ease-[cubic-bezier(0.75,0,0.175,1)]"
            opacityTiming={numberFlowTransition}
            style={{ width: `${count.toString().length}ch` }}
            transformTiming={numberFlowTransition}
            value={count}
            willChange
          />
        </span>
      </button>
    );
  }
);

function ReactionPlaceholder({
  emoji,
  className,
  ...props
}: ReactionPlaceholderProps) {
  return (
    <div
      className={cn(
        buttonVariants({ variant: "none" }),
        "group rounded-full border border-border border-dotted bg-background px-2.5 py-1 text-muted-foreground text-sm tabular-nums",
        className
      )}
      {...props}
    >
      <span className="inline-flex items-center gap-1.5">
        <span className="relative">{emoji}</span>{" "}
        <span className="inline-flex w-[1ch] justify-center">0</span>
      </span>
    </div>
  );
}

function EmojiPlusIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>Add emoji</title>
      <path d="M9 1.07A7 7 0 1 0 14.93 7" />
      <path d="M5.5 9.5S6.25 11 8 11s2.5-1.5 2.5-1.5M6 6h0" />
      <circle cx="6" cy="6" r=".25" />
      <path d="M10 6h0" />
      <circle cx="10" cy="6" r=".25" />
      <path d="M11 3h4m-2-2v4" />
    </svg>
  );
}

function AddReactionButton({
  onEmojiSelect,
  ...props
}: AddReactionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isMounted = useIsMounted();
  const isMobile = useIsMobile();

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      onEmojiSelect?.(getBaseEmoji(emoji));
    },
    [onEmojiSelect]
  );

  const trigger = (
    <button
      aria-label="Try it"
      className={cn(
        buttonVariants({ variant: "default" }),
        "group rounded-full"
      )}
      title="Try it"
      {...props}
    >
      <EmojiPlusIcon className="-ml-0.5 relative transition-transform will-change-transform group-active:rotate-6 group-active:scale-85" />{" "}
      Try it
    </button>
  );
  const emojiPicker = (
    <EmojiPicker
      autoFocus
      onEmojiSelect={({ emoji }) => {
        handleEmojiSelect?.(emoji);
        setIsOpen(false);
      }}
    />
  );

  if (!isMounted) {
    return trigger;
  }

  return isMobile ? (
    <Drawer fixed onOpenChange={setIsOpen} open={isOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerTitle className="sr-only">Emoji picker</DrawerTitle>
        <DrawerDescription className="sr-only">
          Select an emoji
        </DrawerDescription>
        {emojiPicker}
      </DrawerContent>
    </Drawer>
  ) : (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent side="bottom" sideOffset={6}>
        {emojiPicker}
      </PopoverContent>
    </Popover>
  );
}

function LiveblocksReactions() {
  const { id } = useSelf();
  const onEmojiSelectRef = use(AddReactionContext);
  const firstHiddenReactionIndex = use(FirstHiddenReactionIndexContext);
  const reactions = useStorage((storage) => storage.reactions);
  const sortedReactions = useMemo(
    () => getVisibleReactions(reactions),
    [reactions]
  );

  const toggleReaction = useMutation(
    ({ storage }, emoji: string) => {
      if (!id) {
        return;
      }

      const reactions = storage.get("reactions");
      const reaction = reactions?.get(emoji);
      const now = Date.now();

      if (!reaction) {
        // If the reaction doesn't exist, initialize it with self
        reactions?.set(
          emoji,
          new LiveMap([
            [CREATED_AT_KEY, now],
            [UPDATED_AT_KEY, now],
            [id, 1],
          ])
        );
      } else if (reaction.has(id)) {
        // If the reaction exists and is active, remove self
        reaction.delete(id);
        reaction.set(UPDATED_AT_KEY, now);

        if (reaction.size === DEFAULT_KEYS_COUNT) {
          reactions?.delete(emoji);
        }
      } else {
        // If the reaction exists and isn't active, add self
        if (reaction.size === DEFAULT_KEYS_COUNT) {
          reaction.set(CREATED_AT_KEY, now);
        }

        reaction.set(id, 1);
        reaction.set(UPDATED_AT_KEY, now);
      }

      // Delete junk written to storage directly by malicious clients
      for (const key of Array.from(reactions?.keys() ?? [])) {
        if (isJunkReaction(key)) {
          reactions?.delete(key);
        }
      }

      // Delete all reactions above the limit
      if (sortedReactions && sortedReactions.length > MAX_REACTIONS) {
        for (const [emoji] of sortedReactions.slice(
          MAX_REACTIONS,
          sortedReactions.length
        )) {
          reactions?.delete(emoji);
        }
      }
    },
    [sortedReactions, id]
  );

  useLayoutEffect(() => {
    onEmojiSelectRef.current = toggleReaction;
  }, [onEmojiSelectRef, toggleReaction]);

  return (
    <>
      {sortedReactions.map(([emoji, count, data], index) => (
        <ReactionButton
          active={id ? data.has(id) : false}
          count={count}
          disabled={!id}
          emoji={emoji}
          hidden={index >= firstHiddenReactionIndex}
          key={emoji}
          onClick={() => {
            toggleReaction(emoji);
          }}
        />
      ))}
    </>
  );
}

function ServerReactions({ reactions }: { reactions: ReactionsJson }) {
  return (
    <>
      {getVisibleReactionsEntries(reactions).map(([emoji, count]) => (
        <ReactionButton count={count} emoji={emoji} key={emoji} type="server" />
      ))}
    </>
  );
}

function LocalReactions({
  reactions: initialReactions,
}: {
  reactions: ReactionsJson;
}) {
  const id = "#####";
  const onEmojiSelectRef = use(AddReactionContext);
  const [reactions, setReactions] = useState(() => ({ ...initialReactions }));
  const sortedReactions = useMemo(
    () => getVisibleReactionsEntries(reactions),
    [reactions]
  );
  const firstHiddenReactionIndex = use(FirstHiddenReactionIndexContext);
  const toggleReaction = useCallback((emoji: string) => {
    setReactions((reactions) => {
      const reaction = reactions[emoji];

      if (!reaction) {
        // If the reaction doesn't exist, initialize it with self and remove reactions above the limit
        const updatedReactions = {
          ...reactions,
          [emoji]: {
            [CREATED_AT_KEY]: Date.now(),
            [UPDATED_AT_KEY]: Date.now(),
            [id]: 1,
          },
        };

        // Delete all reactions above the limit
        if (Object.keys(updatedReactions).length > MAX_REACTIONS) {
          const sortedReactions =
            Object.entries(updatedReactions).sort(sortReactionsEntries);

          for (const [emoji] of sortedReactions.slice(
            MAX_REACTIONS,
            sortedReactions.length
          )) {
            delete updatedReactions[emoji];
          }
        }

        return updatedReactions;
      }

      if (id in reaction) {
        // If the reaction exists and is active, remove self
        const { [id]: _, ...inactiveReaction } = reaction;

        return {
          ...reactions,
          [emoji]: {
            ...inactiveReaction,
            [UPDATED_AT_KEY]: Date.now(),
          },
        };
      }

      // If the reaction exists and isn't active, add self
      return {
        ...reactions,
        [emoji]: {
          ...reaction,
          [UPDATED_AT_KEY]: Date.now(),
          [id]: 1,
        },
      };
    });
  }, []);

  useLayoutEffect(() => {
    onEmojiSelectRef.current = toggleReaction;
  }, [onEmojiSelectRef, toggleReaction]);

  return (
    <>
      {sortedReactions.map(([emoji, count, data], index) => (
        <ReactionButton
          active={id in data}
          count={count}
          emoji={emoji}
          hidden={index >= firstHiddenReactionIndex}
          key={emoji}
          onClick={() => {
            toggleReaction(emoji);
          }}
        />
      ))}
    </>
  );
}

export function FallbackReactions() {
  return (
    <>
      {getVisibleReactionsEntries(DEFAULT_REACTIONS).map(([emoji, count]) => (
        <ReactionButton
          count={count}
          emoji={emoji}
          key={emoji}
          type="fallback"
        />
      ))}
    </>
  );
}

const initialStorage: Liveblocks["Storage"] = {
  reactions: new LiveMap(
    Object.entries(DEFAULT_REACTIONS).map(([emoji, data]) => [
      emoji,
      new LiveMap(Object.entries(data)),
    ])
  ),
};

export function Reactions({ roomId, serverReactions }: ReactionsProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider id={roomId} initialStorage={initialStorage}>
        <ClientSideSuspense
          fallback={<ServerReactions reactions={serverReactions} />}
        >
          <ErrorBoundary
            fallback={<LocalReactions reactions={serverReactions} />}
          >
            <LiveblocksReactions />
          </ErrorBoundary>
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}

export function ReactionsList({
  children,
  className,
  ...props
}: ComponentProps<"div">) {
  const ref = useRef<HTMLDivElement>(null!);
  const onEmojiSelectRef = useRef<(emoji: string) => void>(() => {});
  const [firstHiddenReactionIndex, setFirstHiddenReactionIndex] =
    useState<number>(0);

  const handleEmojiSelect = useCallback((emoji: string) => {
    onEmojiSelectRef.current(emoji);
  }, []);

  useEffect(() => {
    let debounceTimeout: ReturnType<typeof setTimeout>;

    const updateLastVisibleReaction = () => {
      const reactions = [
        ref.current,
        ...Array.from(ref.current.querySelectorAll("[data-reaction]")),
      ];

      getFastBoundingRects(reactions).then((rects) => {
        const [containerRect, ...reactionRects] = rects.values();
        const rows = new Map<number, number>();
        let index = 0;

        for (const reactionRect of reactionRects) {
          if (!rows.has(reactionRect.top)) {
            rows.set(reactionRect.top, index);

            if (
              reactionRect.top >=
              containerRect!.top + containerRect!.height
            ) {
              setFirstHiddenReactionIndex(index);

              return;
            }
          }

          index++;
        }

        setFirstHiddenReactionIndex(Number.POSITIVE_INFINITY);
      });
    };

    const debouncedUpdateLastVisibleReaction = () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(
        updateLastVisibleReaction,
        REACTIONS_HIDING_DEBOUNCE_DELAY
      );
    };

    const resizeObserver = new ResizeObserver(
      debouncedUpdateLastVisibleReaction
    );
    const mutationObserver = new MutationObserver(
      debouncedUpdateLastVisibleReaction
    );

    resizeObserver.observe(ref.current);
    mutationObserver.observe(ref.current, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-count"],
    });

    return () => {
      clearTimeout(debounceTimeout);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return (
    <div
      className={cn(
        "2xs:[--rows:4] [--button-height:calc(var(--spacing)*8)] [--gap:calc(var(--spacing)*1.5)] [--rows:5] xs:[--rows:3]",
        "flex max-h-[calc(var(--button-height)_*_var(--rows)_+_var(--gap)_*_(var(--rows)_-_1))] min-h-(--button-height) flex-wrap gap-(--gap) [clip-path:inset(-3px)]",
        className
      )}
      ref={ref}
      {...props}
    >
      <AddReactionContext.Provider value={onEmojiSelectRef}>
        <AddReactionButton onEmojiSelect={handleEmojiSelect} />
        <FirstHiddenReactionIndexContext.Provider
          value={firstHiddenReactionIndex}
        >
          {children}
        </FirstHiddenReactionIndexContext.Provider>
        {/* 🐰🥚 */}
        <ReactionPlaceholder className="not-nth-[2]:hidden" emoji="🐰" />
        <ReactionPlaceholder className="not-nth-[3]:hidden" emoji="🥚" />
      </AddReactionContext.Provider>
    </div>
  );
}
