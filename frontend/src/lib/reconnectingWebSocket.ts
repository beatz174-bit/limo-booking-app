import { error } from "@/lib/logger";

interface ReconnectOptions {
  onMessage: (ev: MessageEvent) => void;
  onError?: (ev: Event) => void;
  onClose?: (ev: CloseEvent) => void;
  reconnectDelayMs?: number;
}

export function createReconnectingWebSocket(
  url: string,
  { onMessage, onError, onClose, reconnectDelayMs = 1000 }: ReconnectOptions,
): () => void {
  let ws: WebSocket | null = null;
  let shouldReconnect = true;

  const connect = () => {
    ws = new WebSocket(url);
    ws.onmessage = onMessage;
    ws.onerror = (ev) => {
      error("websocket", "connection error", { url, event: ev });
      onError?.(ev);
      if (shouldReconnect) {
        setTimeout(connect, reconnectDelayMs);
      }
    };
    ws.onclose = (ev) => {
      onClose?.(ev);
      if (shouldReconnect) {
        setTimeout(connect, reconnectDelayMs);
      }
    };
  };

  connect();

  return () => {
    shouldReconnect = false;
    ws?.close();
  };
}

