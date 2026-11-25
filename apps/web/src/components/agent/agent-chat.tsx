"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { useHotkey } from "@tanstack/react-hotkeys";
import { Bubble, BubbleContent } from "@meeteora/ui/components/bubble";
import { Button } from "@meeteora/ui/components/button";
import {
  AiSparkleIcon,
  ArrowRightIcon,
  CloseIcon,
  CursorIcon,
  EraserIcon,
} from "@meeteora/ui/components/icons";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@meeteora/ui/components/input-group";
import { Message, MessageContent } from "@meeteora/ui/components/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@meeteora/ui/components/message-scroller";
import { cn } from "@meeteora/ui/lib/utils";
import { useEffect, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

const suggestions = [
  "Summarize today's bookings",
  "Which events are filling up?",
  "Draft a reschedule note",
];

// Placeholder until the agent backend exists. Swap for a streaming call
// (e.g. AI SDK `useChat`) — the UI only needs `messages` + `pending`.
function reply(_prompt: string, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () =>
        resolve(
          "I'm not connected to a model yet. Once the agent backend is wired up, I'll answer questions about your events and bookings here.",
        ),
      700,
    );
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}

export function AgentChat() {
  const [open, setOpen] = useState(false);
  // Keyboard toggles are frequent: skip the animation for them.
  const [instant, setInstant] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  useHotkey("Meta+I", () => {
    setInstant(true);
    setOpen((prev) => !prev);
  });

  const send = async (text: string) => {
    const prompt = text.trim();
    if (!prompt || pending) return;

    setDraft("");
    setPending(true);
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", text: prompt },
    ]);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const answer = await reply(prompt, controller.signal);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", text: answer },
      ]);
    } catch {
      // Aborted (cleared or unmounted) — nothing to show.
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setPending(false);
      }
    }
  };

  const clear = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPending(false);
    setMessages([]);
    inputRef.current?.focus();
  };

  const empty = messages.length === 0;

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(next, details) => {
        // A chat is a parallel task: keep it open while the page is used.
        if (
          !next &&
          (details.reason === "outside-press" || details.reason === "focus-out")
        ) {
          return;
        }
        setInstant(false);
        setOpen(next);
      }}
    >
      <PopoverPrimitive.Trigger
        render={
          <Button
            variant="secondary"
            size="sm"
            className="transition-[background-color,scale] duration-150 ease-out active:scale-[0.97] aria-expanded:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_8%)]"
          />
        }
      >
        Agent
        <AiSparkleIcon />
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal keepMounted>
        <PopoverPrimitive.Positioner
          side="top"
          align="end"
          sideOffset={8}
          collisionPadding={16}
          className="isolate z-50"
        >
          <PopoverPrimitive.Popup
            data-instant={instant || undefined}
            initialFocus={inputRef}
            className={cn(
              "flex h-[min(36rem,calc(100dvh-6rem))] w-[min(24rem,calc(100vw-2rem))] origin-(--transform-origin) flex-col overflow-hidden rounded-3xl text-sm text-popover-foreground outline-hidden",
              "bg-popover/85 shadow-2xl ring-1 ring-foreground/10 backdrop-blur-xl backdrop-saturate-150",
              "[@media(prefers-reduced-transparency:reduce)]:bg-popover [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none",
              "transition-[opacity,scale,translate,filter] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
              "data-starting-style:translate-y-2 data-starting-style:scale-[0.96] data-starting-style:opacity-0 data-starting-style:blur-xs",
              "data-ending-style:translate-y-2 data-ending-style:scale-[0.96] data-ending-style:opacity-0 data-ending-style:blur-xs data-ending-style:duration-150",
              "data-instant:duration-0",
              "motion-reduce:data-starting-style:translate-y-0 motion-reduce:data-starting-style:scale-100 motion-reduce:data-starting-style:blur-none motion-reduce:data-ending-style:translate-y-0 motion-reduce:data-ending-style:scale-100 motion-reduce:data-ending-style:blur-none",
            )}
          >
            <header className="flex shrink-0 items-center gap-2 py-2.5 pr-2.5 pl-4 bg-muted/40">
              <div className="flex min-w-0 flex-1 flex-col">
                <PopoverPrimitive.Title className="text-sm font-medium tracking-tight">
                  Agent
                </PopoverPrimitive.Title>
                <PopoverPrimitive.Description className="truncate text-xs text-muted-foreground">
                  Ask about your events and bookings
                </PopoverPrimitive.Description>
              </div>
              {!empty && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={clear}
                  aria-label="Clear conversation"
                  className="text-muted-foreground"
                >
                  <EraserIcon />
                </Button>
              )}
              <PopoverPrimitive.Close
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Close agent"
                    className="text-muted-foreground"
                  />
                }
              >
                <CloseIcon />
              </PopoverPrimitive.Close>
            </header>

            {empty ? (
              <EmptyState onPick={send} />
            ) : (
              <MessageScrollerProvider autoScroll>
                <MessageScroller className="flex-1">
                  <MessageScrollerViewport className="px-4">
                    <MessageScrollerContent className="gap-5 pt-2 pb-4">
                      {messages.map((message) => (
                        <MessageScrollerItem
                          key={message.id}
                          messageId={message.id}
                          scrollAnchor={message.role === "user"}
                          className="transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] starting:translate-y-1.5 starting:opacity-0 motion-reduce:starting:translate-y-0"
                        >
                          <ChatBubble message={message} />
                        </MessageScrollerItem>
                      ))}
                      {pending && (
                        <MessageScrollerItem messageId="pending">
                          <TypingIndicator />
                        </MessageScrollerItem>
                      )}
                    </MessageScrollerContent>
                  </MessageScrollerViewport>
                  <MessageScrollerButton size="icon-xs" />
                </MessageScroller>
              </MessageScrollerProvider>
            )}

            <form
              className="shrink-0 p-2 pt-0"
              onSubmit={(event) => {
                event.preventDefault();
                void send(draft);
              }}
            >
              <InputGroup className="bg-input/60">
                <InputGroupTextarea
                  ref={inputRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      void send(draft);
                    }
                  }}
                  placeholder="Ask the agent…"
                  aria-label="Message the agent"
                  rows={1}
                  className="max-h-40 min-h-11 px-4"
                />
                <InputGroupAddon align="inline-end" className="self-end pb-1.5">
                  <InputGroupButton
                    type="submit"
                    variant="default"
                    size="icon-sm"
                    disabled={!draft.trim() || pending}
                    aria-label="Send message"
                    className="transition-[scale,opacity,background-color] duration-150 ease-out active:scale-[0.94]"
                  >
                    <ArrowRightIcon className="-rotate-90" />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </form>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const mine = message.role === "user";
  return (
    <Message align={mine ? "end" : "start"}>
      <MessageContent>
        <Bubble
          align={mine ? "end" : "start"}
          variant={mine ? "muted" : "ghost"}
        >
          <BubbleContent className="whitespace-pre-wrap">
            {message.text}
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}

function TypingIndicator() {
  return (
    <div
      role="status"
      aria-label="Agent is typing"
      className="flex h-5 items-center gap-1 text-muted-foreground"
    >
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          style={{ animationDelay: `${delay}ms` }}
          className="size-1.5 animate-pulse rounded-full bg-current motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-1 flex-col justify-end gap-3 px-4 pb-4">
      <p className="text-pretty text-muted-foreground">
        What do you want to know? Try one of these:
      </p>
      <div className="flex flex-col items-start gap-1.5">
        {suggestions.map((text) => (
          <Button
            key={text}
            variant="outline"
            size="sm"
            onClick={() => onPick(text)}
            className="transition-[background-color,scale] duration-150 ease-out active:scale-[0.97]"
          >
            {text}
          </Button>
        ))}
      </div>
    </div>
  );
}
