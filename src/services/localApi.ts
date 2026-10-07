export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
export interface StreamOptions {
  messages: ChatMessage[];
  signal?: AbortSignal;
  temperature?: number;
  maxTokens?: number;
  onToken: (t: string) => void;
  onError: (e: string) => void;
  onComplete: () => void;
}
export async function streamChat(o: StreamOptions): Promise<void> {
  try {
    const res = await fetch("/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: o.signal,
      body: JSON.stringify({
        messages: o.messages,
        temperature: o.temperature ?? 0.7,
        max_tokens: o.maxTokens ?? 512,
        stream: true,
      }),
    });
    if (!res.ok || !res.body) throw new Error(`Engine error: HTTP ${res.status}`);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
        try {
          const tok = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content;
          if (tok) o.onToken(tok);
        } catch { /* partial JSON */ }
      }
    }
    o.onComplete();
  } catch (err: any) {
    if (err?.name === "AbortError") o.onComplete();
    else o.onError(err?.message ?? "Stream failed");
  }
}
