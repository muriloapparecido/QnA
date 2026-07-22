import { useState, useRef, useEffect } from "react";
import "./App.css";
import type { Message, Repository } from "./types";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { ChatMessage } from "./components/ChatMessage/ChatMessage";
import { SettingsPanel } from "./components/SettingsPanel/SettingsPanel";

//  Mock data (replace with real data later)
const INITIAL_REPOS: Repository[] = [
  { id: "maps", name: "MAPS", path: "../../MAPS", messages: [] },
];

//  Main App
export default function App() {
  const [repos, setRepos] = useState<Repository[]>(INITIAL_REPOS);
  const [activeRepoId, setActiveRepoId] = useState<string>(INITIAL_REPOS[0].id);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [supportedExtensions, setSupportedExtensions] = useState<string[]>([
    ".ts",
    ".tsx",
    ".java",
    ".py",
    ".js",
    ".md",
  ]);
  const [skipDirs, setSkipDirs] = useState<string[]>([
    "node_modules",
    ".git",
    "build",
    "dist",
    "frontend_license",
    "venv",
    "target",
    "docs",
    ".vscode",
    ".venv",
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [ingestProgress, setIngestProgress] = useState<{
    ingested: number;
    total: number;
    percent: number;
  } | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeRepo = repos.find((r) => r.id === activeRepoId)!;

  const ingestAbortRef = useRef<AbortController | null>(null);

  async function handleIngest(repoPath: string) {
    setIngesting(true);
    setIngestProgress({ ingested: 0, total: 0, percent: 0 });
    setIngestError(null);

    const controller = new AbortController();
    ingestAbortRef.current = controller;

    try {
      const response = await fetch("http://localhost:8000/ingest-stream", {
        signal: controller.signal,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_path: repoPath,
          supported_extensions: supportedExtensions,
          skip_dirs: skipDirs,
        }),
      });

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
    setIngestError(null) 
  }

  function handleAddRepo(repo: Repository) {
    setRepos((prev) => [...prev, repo]);
    setActiveRepoId(repo.id);
  }

  function handleDeleteRepo(id: string) {
    if (!window.confirm("Remove this repository from the list?")) return;
    setRepos((prev) => prev.filter((r) => r.id !== id));
    // if we're deleting the active repo, switch to the first remaining one
    if (activeRepoId === id) {
      const remaining = repos.filter((r) => r.id !== id);
      if (remaining.length > 0) setActiveRepoId(remaining[0].id);
    }
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeRepo.messages]);

  function addMessage(repoId: string, message: Message) {
    setRepos((prev) =>
      prev.map((r) =>
        r.id === repoId ? { ...r, messages: [...r.messages, message] } : r,
      ),
    );
  }

  async function handleSubmit() {
    const question = input.trim();
    if (!question || loading) return;

    setInput("");
    setError(null);

    // Add user message immediately
    const userMsg: Message = {
      id: Date.now(),
      role: "user",
      content: question,
    };
    addMessage(activeRepoId, userMsg);
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          repo_path: activeRepo.path,
          ignored_extensions: supportedExtensions,
          skip_dirs: skipDirs,
        }),
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const data = await response.json();

      const assistantMsg: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.Response ?? data.answer ?? "No response.",
        sources: data.Source ?? data.sources,
      };
      addMessage(activeRepoId, assistantMsg);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="layout">
      {/* Ingestion popup */}
      {(ingesting && ingestProgress) || ingestError ? (
        <div className="ingest-overlay">
          <div className="ingest-modal">
            <h3>
              {ingesting ? "Ingesting repository..." : "Ingestion failed"}
            </h3>

            {ingestProgress && (
              <>
                <div className="progress-bar">
                  <div
                    className="progress-bar__fill"
                    style={{ width: `${ingestProgress.percent}%` }}
                  />
                </div>
                <p className="progress-label">
                  {ingestProgress.ingested} / {ingestProgress.total} chunks (
                  {ingestProgress.percent}%)
                </p>
                {ingestProgress.percent < 30 && ingestProgress.total > 1000 && (
                  <p className="progress-hint">
                    Taking too long? Try restricting supported extensions or
                    adding folders to skip.
                  </p>
                )}
              </>
            )}

            {ingestError && (
              <p className="progress-hint" style={{ color: "var(--error)" }}>
                {ingestError}
              </p>
            )}

            <button className="btn btn--sm" onClick={handleCancelIngest}>
              {ingesting ? "Cancel" : "Dismiss"}
            </button>
          </div>
        </div>
      ) : null}
      {/* Left sidebar — repo list */}
      <Sidebar
        repos={repos}
        activeId={activeRepoId}
        collapsed={sidebarCollapsed}
        onSelect={setActiveRepoId}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        onIngest={(path) => handleIngest(path)}
        ingesting={ingesting}
        onAddRepo={handleAddRepo}
        onDelete={handleDeleteRepo}
      />

      {/* Main chat area */}
      <main className="chat">
        <header className="chat__header">
          <span className="chat__repo-name">{activeRepo.name}</span>
          <span className="chat__subtitle">Folder Q&A</span>
        </header>

        <div className="chat__messages">
          {activeRepo.messages.length === 0 && (
            <div className="chat__empty">
              <p>
                Ask anything about <strong>{activeRepo.name}</strong>.
              </p>
              <p className="chat__empty-hint">
                Try: "where is the add row button?" or "how does saving work?"
              </p>
            </div>
          )}

          {activeRepo.messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}

          {loading && (
            <div className="message message--assistant">
              <div className="message__bubble message__bubble--loading">
                <span className="loading-dot" />
                <span className="loading-dot" />
                <span className="loading-dot" />
              </div>
            </div>
          )}

          {error && <div className="chat__error">{error}</div>}

          <div ref={bottomRef} />
        </div>

        <form
          className="chat__input-row"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <textarea
            className="chat__textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Ask a question about the codebase… (Enter to send, Shift+Enter for newline)"
            rows={2}
            disabled={loading}
          />
          <button
            type="submit"
            className="btn btn--primary"
            disabled={loading || input.trim() === ""}
          >
            {loading ? "…" : "Ask"}
          </button>
        </form>
      </main>

      {/* Right settings panel */}
      <SettingsPanel
        open={settingsOpen}
        supportedExtensions={supportedExtensions}
        skipDirs={skipDirs}
        onToggle={() => setSettingsOpen((v) => !v)}
        onSupportedExtensionsChange={setSupportedExtensions}
        onSkipDirsChange={setSkipDirs}
      />
    </div>
  );
}
