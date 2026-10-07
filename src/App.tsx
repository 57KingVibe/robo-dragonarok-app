import { useEffect, useRef, useState } from "react";
import { streamChat, ChatMessage } from "./services/localApi";

export default function App() {
  const [online, setOnline] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = async () => {
      try { setOnline((await fetch("/health")).ok); } catch { setOnline(false); }
    };
    check();
    const id = setInterval(check, 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !online || busy) return;
    const history: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput(""); setError(""); setBusy(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    await streamChat({
      messages: history,
      signal: ctrl.signal,
      onToken: (tok) =>
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          next[next.length - 1] = { ...last, content: last.content + tok };
          return next;
        }),
      onError: (m) => { setError(m); setBusy(false); },
      onComplete: () => setBusy(false),
    });
  };

  const btn = { padding: "10px 16px", border: "none", borderRadius: 6, color: "#fff", fontWeight: "bold" } as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#111", color: "#fff", fontFamily: "sans-serif" }}>
      <div style={{ padding: "10px 14px", background: "#161616", borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>Robo_dragonarok</strong>
        <span style={{ fontSize: 12, color: online ? "#4af626" : "#f55" }}>
          {online ? "● engine ready" : "○ engine offline/loading"}
        </span>
        <button style={{ ...btn, background: "#333", padding: "6px 10px" }} onClick={() => setMessages([])}>Clear</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0 && (
          <p style={{ color: "#666", textAlign: "center", marginTop: 60 }}>
            Local model, running on this phone. Nothing leaves the device.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%",
            background: m.role === "user" ? "#007acc" : "#252526",
            padding: "10px 14px", borderRadius: 8, whiteSpace: "pre-wrap", fontSize: 15, lineHeight: 1.5,
          }}>{m.content || "…"}</div>
        ))}
        {error && <div style={{ color: "#f77", fontSize: 13 }}>{error}</div>}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} style={{ display: "flex", gap: 8, padding: 10, background: "#161616", borderTop: "1px solid #333" }}>
        <input
          value={input} onChange={(e) => setInput(e.target.value)}
          disabled={!online || busy}
          placeholder={online ? "Message…" : "Waiting for engine…"}
          style={{ flex: 1, padding: 12, background: "#222", border: "1px solid #444", color: "#fff", borderRadius: 6, fontSize: 16 }}
        />
        {busy ? (
          <button type="button" style={{ ...btn, background: "#d32f2f" }} onClick={() => abortRef.current?.abort()}>Stop</button>
        ) : (
          <button type="submit" disabled={!online} style={{ ...btn, background: "#007acc", opacity: online ? 1 : 0.5 }}>Send</button>
        )}
      </form>
    </div>
  );
}
