import { useEffect, useRef, useState } from "react";
import { communityBase, communityRequest } from "../community";
import * as S from "../styles";
import styled from "styled-components";
import { createPortal } from "react-dom";
import { MessageCircle, X } from "lucide-react";

const ChatButton = styled(S.Button)`
  position: fixed;
  bottom: max(1.25rem, env(safe-area-inset-bottom));
  right: calc(max(1rem, env(safe-area-inset-right)) + 4.5rem);
  z-index: 1000;
  border-radius: 2rem;
  min-height: 3.75rem;
  box-shadow: 0 3px 14px #0003;
`;
const ChatWindow = styled(S.Panel)`
  position: fixed;
  right: max(1rem, env(safe-area-inset-right));
  bottom: calc(max(1.25rem, env(safe-area-inset-bottom)) + 4.5rem);
  z-index: 1001;
  width: min(26rem, calc(100vw - 2rem));
  max-height: calc(100dvh - 7rem);
  overflow-y: auto;
  box-sizing: border-box;
  margin: 0;
  padding: clamp(1rem, 4vw, 1.5rem);
  box-shadow: 0 8px 32px #0003;
  background: #fffefa;
  color: #24362b;
  &[hidden] { display: none; }
  h2 { margin: .5rem 0; font-size: 1.5rem; }
  html[data-high-contrast="true"] & { background: #000; color: #fff; }
`;
const UnreadBadge = styled.span`
  position: absolute;
  top: -.55rem;
  right: -.4rem;
  display: grid;
  place-items: center;
  min-width: 1.6rem;
  height: 1.6rem;
  padding: 0 .35rem;
  border-radius: 2rem;
  border: 2px solid white;
  background: #b42318;
  color: white;
  font-size: .8rem;
  font-weight: 700;
  line-height: 1;
`;

const emojis = [["😀", "Smile"], ["😂", "Laugh"], ["😍", "Love it"], ["🤔", "Thinking"], ["👋", "Hello"], ["👍", "Thumbs up"], ["👏", "Applause"], ["🙌", "Celebration"], ["❤️", "Heart"], ["🎉", "Party"], ["✨", "Sparkles"], ["📚", "Books"], ["💡", "Idea"], ["✅", "Done"], ["❓", "Question"], ["🌟", "Star"]];
const Bubble = styled.article<{ $own: boolean }>`
  max-width: 88%;
  width: fit-content;
  margin: .75rem 0 .75rem ${({ $own }) => $own ? "auto" : "0"};
  padding: .75rem 1rem;
  border: 1px solid #8d9b89;
  border-radius: 1rem;
  background: ${({ $own }) => $own ? "#e5efdf" : "#fffefa"};
  color: #24362b;
  overflow-wrap: anywhere;
  html[data-high-contrast="true"] & { background: #000; color: #fff; border-color: #fff; }
`;
type Message = {
  id: string;
  name: string;
  personId: string;
  text: string;
  date: string;
};
type Person = { id: string; name: string };
export default function LiveChat({
  room,
  label,
}: {
  room: string;
  label: string;
}) {
  const [name, setName] = useState(""),
    [open, setOpen] = useState(false),
    [unread, setUnread] = useState(0),
    [self, setSelf] = useState(""),
    [emojiOpen, setEmojiOpen] = useState(false),
    [text, setText] = useState(""),
    [status, setStatus] = useState("Not connected"),
    [error, setError] = useState(""),
    [connected, setConnected] = useState(false),
    [joining, setJoining] = useState(false),
    [people, setPeople] = useState<Person[]>([]),
    [messages, setMessages] = useState<Message[]>([]);
  const socket = useRef<WebSocket | null>(null),
    trigger = useRef<HTMLButtonElement>(null),
    heading = useRef<HTMLHeadingElement>(null),
    isOpen = useRef(false),
    input = useRef<HTMLTextAreaElement>(null),
    log = useRef<HTMLDivElement>(null),
    follow = useRef(true),
    active = useRef(true),
    deadline = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (log.current && follow.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages]);
  function addEmoji(emoji: string) {
    const field = input.current;
    const start = field?.selectionStart ?? text.length;
    const end = field?.selectionEnd ?? start;
    if (text.length - (end - start) + emoji.length > 500) return;
    setText(text.slice(0, start) + emoji + text.slice(end));
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  }
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      clearTimeout(deadline.current);
      socket.current?.close();
      socket.current = null;
    };
  }, []);
  async function join(e: React.FormEvent) {
    e.preventDefault();
    setJoining(true);
    setError("");
    setStatus("Connecting to live chat…");
    try {
      const { ticket } = await communityRequest("/chat/join", { room, name });
      if (!active.current) return;
      const url = new URL(communityBase + "/live", location.href);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      url.searchParams.set("ticket", ticket);
      const ws = new WebSocket(url);
      socket.current = ws;
      deadline.current = setTimeout(() => {
        ws.close();
        if (active.current) {
          setJoining(false);
          setStatus(
            "Connection timed out. The free service may be starting up. Try joining again.",
          );
        }
      }, 20000);
      ws.onmessage = (e) => {
        if (!active.current || socket.current !== ws) return;
        try {
          const data = JSON.parse(e.data);
          if (data.type === "welcome") {
            clearTimeout(deadline.current);
            setConnected(true);
            setUnread(0);
            setSelf(data.self.id);
            follow.current = true;
            setJoining(false);
            setMessages(data.messages);
            setStatus("Connected. Nicknames are not verified.");
          } else if (data.type === "presence") setPeople(data.people);
          else if (data.type === "message") {
            setMessages((m) => [...m, data.message].slice(-50));
            if (!isOpen.current) setUnread((n) => n + 1);
          }
          else if (data.type === "error") setError(data.message);
        } catch {
          setError("The chat sent an invalid response.");
        }
      };
      ws.onerror = () => {
        if (active.current)
          setError(
            "Chat connection failed. Check the service address or try again later.",
          );
      };
      ws.onclose = () => {
        clearTimeout(deadline.current);
        if (active.current && socket.current === ws) {
          setConnected(false);
          setJoining(false);
          setPeople([]);
          setStatus("Disconnected. Join again to see who is online.");
        }
      };
    } catch (e) {
      if (active.current) {
        setJoining(false);
        setStatus("Not connected");
        setError(e instanceof Error ? e.message : "Could not join chat.");
      }
    }
  }
  function closeWindow() {
    setOpen(false);
    isOpen.current = false;
    trigger.current?.focus();
  }
  return createPortal(
    <>
    <ChatButton ref={trigger} type="button" aria-label={unread ? `Open classroom chat, ${unread} unread messages` : "Open classroom chat"}
      aria-expanded={open} aria-controls="classroom-chat-window" onClick={() => {
        if (open) closeWindow();
        else {
          setOpen(true); isOpen.current = true; setUnread(0);
          requestAnimationFrame(() => { heading.current?.focus(); if (log.current && follow.current) log.current.scrollTop = log.current.scrollHeight; });
        }
      }}><MessageCircle size={22} aria-hidden="true" /> Chat {unread > 0 && <UnreadBadge aria-hidden="true">{unread > 99 ? "99+" : unread}</UnreadBadge>}</ChatButton>
    <S.ScreenReaderOnly role="status" aria-live="polite">{unread > 0 ? `${unread} unread chat messages` : ""}</S.ScreenReaderOnly>
    <ChatWindow id="classroom-chat-window" hidden={!open} role="region" aria-labelledby="live-chat-heading"
      onKeyDown={(e) => { if (e.key === "Escape" && !e.defaultPrevented) closeWindow(); }}>
      <S.Row style={{ justifyContent: "space-between" }}>
      <S.Eyebrow>LET’S CONNECT</S.Eyebrow>
      <S.Button $secondary type="button" aria-label="Minimize chat" onClick={closeWindow}><X size={18} aria-hidden="true" /></S.Button>
      </S.Row>
      <h2 id="live-chat-heading" ref={heading} tabIndex={-1}>Live classroom chat</h2>
      <p>
        {label}. Anyone visiting this room can join. Nicknames are unverified;
        messages are public and temporary, not private conversations.
      </p>
      {!communityBase ? (
        <S.Notice>
          Live chat is not configured yet. No online count or messages are
          simulated.
        </S.Notice>
      ) : (
        <>
          <p role="status" aria-live="polite">
            {status}
          </p>
          {!connected ? (
            <form onSubmit={join}>
              <label htmlFor="chat-name">Chat nickname</label>
              <input
                id="chat-name"
                minLength={2}
                maxLength={30}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={joining}
              />
              <p />
              <S.Button disabled={joining} type="submit">
                {joining ? "Connecting…" : "Join live chat"}
              </S.Button>
            </form>
          ) : (
            <>
              <S.Row>
                <strong>
                  {people.length} {people.length === 1 ? "person" : "people"}{" "}
                  connected to this room
                </strong>
                <S.Button
                  $secondary
                  onClick={() => {
                    socket.current?.close();
                    setConnected(false);
                    setPeople([]);
                    setMessages([]);
                  }}
                >
                  Leave chat
                </S.Button>
              </S.Row>
              <p>
                <small>
                  {people
                    .map((p) => p.name + " · " + p.id.slice(0, 4))
                    .join(", ")}
                </small>
              </p>
              <div
                ref={log}
                tabIndex={0}
                onScroll={() => { const el = log.current; if (el) follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60; }}
                role="log"
                aria-label="Live chat messages"
                aria-live="polite"
                aria-relevant="additions"
                style={{
                  maxHeight: "22rem",
                  overflowY: "auto",
                  border: "1px solid #718066",
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                {!messages.length && (
                  <p>No messages yet. Start a conversation.</p>
                )}
                {messages.map((m) => (
                  <Bubble
                    key={m.id}
                    $own={m.personId === self}
                  >
                    <strong>
                      {m.personId === self ? "You" : m.name} · {m.personId.slice(0, 4)}
                    </strong>{" "}
                    <small>
                      <time dateTime={m.date}>
                        {new Intl.DateTimeFormat("en", {
                          timeStyle: "short",
                        }).format(new Date(m.date))}
                      </time>
                    </small>
                    <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                      {m.text}
                    </p>
                  </Bubble>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const ws = socket.current;
                  if (ws?.readyState !== WebSocket.OPEN || !text.trim()) {
                    setError("Reconnect before sending a message.");
                    return;
                  }
                  ws.send(
                    JSON.stringify({ type: "message", text: text.trim() }),
                  );
                  setText("");
                  follow.current = true;
                  input.current?.focus();
                  setError("");
                }}
              >
                <label htmlFor="chat-message">
                  Your message (up to 500 characters)
                </label>
                <textarea
                  ref={input}
                  id="chat-message"
                  rows={3}
                  placeholder="Share an idea, ask a question…"
                  aria-describedby="chat-compose-help"
                  required
                  maxLength={500}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      if (text.trim()) e.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <p id="chat-compose-help"><small>Enter to send · Shift + Enter for a new line · {text.length}/500</small></p>
                <S.Row>
                  <S.Button $secondary type="button" aria-expanded={emojiOpen} aria-controls="chat-emojis" onClick={() => setEmojiOpen(!emojiOpen)}>😀 Emojis</S.Button>
                  <S.Button type="submit" disabled={!text.trim()}>Send message</S.Button>
                </S.Row>
                {emojiOpen && <div id="chat-emojis" role="group" aria-label="Choose an emoji" onKeyDown={(e) => { if (e.key === "Escape") { setEmojiOpen(false); input.current?.focus(); } }} style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  {emojis.map(([emoji, label]) => <S.Button $secondary key={label} type="button" aria-label={label} title={label} onClick={() => addEmoji(emoji)} style={{ minWidth: 44, minHeight: 44, padding: 8, fontSize: "1.4rem" }}><span aria-hidden="true">{emoji}</span></S.Button>)}
                </div>}
              </form>
            </>
          )}
          <p>
            <small>
              Only people who joined this chat are counted. History disappears
              when everyone leaves or the service restarts. Changing student
              pages leaves this room.
            </small>
          </p>
        </>
      )}
      {error && (
        <S.Notice $error role="alert">
          {error}
        </S.Notice>
      )}
    </ChatWindow>
    </>, document.body,
  );
}
