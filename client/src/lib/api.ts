const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type StreamCallbacks = {
  onData: (data: any) => void;
  onError: (error: any) => void;
  onClose: () => void;
};

async function processStream(res: Response, callbacks: StreamCallbacks) {
  if (!res.body) {
    callbacks.onError(new Error("Response body is empty"));
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        callbacks.onClose();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep the last partial line

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const json = line.substring(6);
          if (json) {
            try {
              const data = JSON.parse(json);
              callbacks.onData(data);
            } catch (e) {
              callbacks.onError(e);
            }
          }
        }
      }
    }
  } catch (e) {
    callbacks.onError(e);
  } finally {
    reader.releaseLock();
  }
}

export function startAgent(
  input: string,
  callbacks: StreamCallbacks
): () => void {
  const controller = new AbortController();
  const signal = controller.signal;

  fetch(`${BASE}/agent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input }),
    signal,
  })
    .then((res) => {
      if (!res.ok) throw new Error(`Start agent failed: ${res.status}`);
      return processStream(res, callbacks);
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        callbacks.onError(err);
      }
    });

  return () => controller.abort();
}

export function approveAgent(
  threadId: string,
  approve: boolean,
  callbacks: StreamCallbacks
): () => void {
  const controller = new AbortController();
  const signal = controller.signal;

  fetch(`${BASE}/agent/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ threadId, approve }),
    signal,
  })
    .then((res) => {
      if (!res.ok) throw new Error(`Approve step failed: ${res.status}`);
      return processStream(res, callbacks);
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        callbacks.onError(err);
      }
    });

  return () => controller.abort();
}
