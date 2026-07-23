import { useRef, useState } from "react";
import { ingestStream } from "../api";

export function useIngest(supportedExtensions: string[], skipDirs: string[]) {
  const [ingesting, setIngesting] = useState(false);
  const [ingestProgress, setIngestProgress] = useState<{
    ingested: number;
    total: number;
    percent: number;
  } | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const ingestAbortRef = useRef<AbortController | null>(null);

  async function handleIngest(repoPath: string) {
    setIngesting(true);
    setIngestProgress({ ingested: 0, total: 0, percent: 0 });
    setIngestError(null);

    const controller = new AbortController();
    ingestAbortRef.current = controller;

    try {
      const response = await ingestStream(
        repoPath,
        supportedExtensions,
        skipDirs,
        controller.signal,
      );

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const data = JSON.parse(line.slice(6));
          if (data.status === "progress") {
            setIngestProgress(data);
          } else if (data.status === "done") {
            setIngesting(false);
            setIngestProgress(null);
          } else if (data.status === "error") {
            setIngestError(data.message);
            setIngesting(false);
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setIngestError("Ingestion failed. Check the server.");
      }
      setIngesting(false);
      setIngestProgress(null);
    }
  }

  function handleCancelIngest() {
    ingestAbortRef.current?.abort();
    setIngesting(false);
    setIngestProgress(null);
    setIngestError(null);
  }
  return { ingesting, ingestProgress, ingestError, handleIngest, handleCancelIngest };
}
