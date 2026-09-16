"use client";

import { useEffect, useRef, useState } from "react";
import { useBoard } from "@/lib/store";
import { sceneFromJSON } from "@/lib/export";
import { FolderOpen, GitBranch, Loader2, LogOut, Moon, Sun } from "lucide-react";
import { useSession, signIn, signOut } from "next-auth/react";

export function GithubConnect() {
  const { data: session, status } = useSession();
  const [repoName, setRepoName] = useState("dradraft-scenes");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBrowseModal, setShowBrowseModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [drafts, setDrafts] = useState<{ name: string; path: string; download_url: string | null; type: string }[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);

  const storedRepo = typeof window !== "undefined" ? localStorage.getItem("dradraft:githubRepo") : null;
  const activeRepo = storedRepo || repoName;

  useEffect(() => {
    if (status !== "authenticated") return;
    if (showCreateModal || showBrowseModal) return;
    const key = "dradraft:githubRepo";
    const stored = localStorage.getItem(key);
    const nameToCheck = stored || repoName;
    setChecking(true);
    fetch(`/api/github/repo?name=${encodeURIComponent(nameToCheck)}`)
      .then((r) => {
        if (r.status === 404) setShowCreateModal(true);
        else if (r.ok) r.json().then((data) => localStorage.setItem(key, data.name ?? nameToCheck));
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [status]);

  async function openBrowse() {
    const repo = localStorage.getItem("dradraft:githubRepo") || repoName;
    setShowBrowseModal(true);
    setLoadingDrafts(true);
    try {
      const res = await fetch(`/api/github/contents?repo=${encodeURIComponent(repo)}`);
      if (res.ok) {
        const data = await res.json();
        const files = Array.isArray(data) ? data.filter((f: any) => f.type === "file") : [];
        setDrafts(files);
      } else {
        setDrafts([]);
      }
    } finally {
      setLoadingDrafts(false);
    }
  }

  async function loadDraft(file: { download_url: string | null; path: string }) {
    if (!file.download_url) return;
    const res = await fetch(file.download_url);
    const text = await res.text();
    try {
      const { elements, name } = sceneFromJSON(text);
      useBoard.getState().replaceAll(elements);
      useBoard.getState().setSceneName(name);
      setShowBrowseModal(false);
    } catch {
      alert("Invalid draft file");
    }
  }

  if (status === "loading") {
    return <span className="float-bar h-9 w-28 animate-pulse rounded-2xl" />;
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn("github")}
        className="flex items-center gap-2 rounded-2xl bg-[#24292e] px-4 py-2 text-sm font-medium text-white hover:bg-black"
      >
        <GitBranch className="h-4 w-4" /> Sign in with GitHub
      </button>
    );
  }

  return (
    <>
      <div className="float-bar flex items-center gap-2 rounded-2xl px-3 py-1.5">
        {session.user?.image && <img src={session.user.image} alt="" className="h-7 w-7 rounded-full" />}
        <button onClick={openBrowse} className="flex items-center gap-1.5 rounded-lg bg-[#24292e] px-3 py-1.5 text-sm font-medium text-white">
          <FolderOpen className="h-4 w-4" /> Browse my drafts
        </button>
        <button onClick={() => signOut()} className="tool-btn rounded-lg p-1" title="Sign out">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
      {showCreateModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="float-bar w-full max-w-md rounded-2xl p-5">
            <h3 className="text-[15px] font-semibold">Create private repository</h3>
            <p className="mt-1 text-sm text-black/60">Pick a name — one private repo holds all drawings.</p>
            <input
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              placeholder="dradraft-scenes"
              className="mt-3 w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowCreateModal(false)} className="rounded-lg px-3 py-1.5 text-sm">
                Skip
              </button>
              <button
                disabled={creating || !repoName.trim()}
                onClick={async () => {
                  setCreating(true);
                  const res = await fetch("/api/github/create-repo", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: repoName.trim() }),
                  });
                  if (res.ok) {
                    localStorage.setItem("dradraft:githubRepo", repoName.trim());
                    setShowCreateModal(false);
                  } else {
                    const t = await res.text();
                    alert(t || "Failed to create repo");
                  }
                  setCreating(false);
                }}
                className="flex items-center gap-2 rounded-lg bg-[#24292e] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />} Create private repo
              </button>
            </div>
            {checking && <p className="mt-2 text-xs text-black/50">Checking...</p>}
          </div>
        </div>
      )}
      {showBrowseModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="float-bar flex max-h-[70vh] w-full max-w-lg flex-col rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold">My drafts — {activeRepo}</h3>
              <button onClick={() => setShowBrowseModal(false)} className="tool-btn rounded-lg px-2 py-1 text-sm">
                Close
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => setShowBrowseModal(false)}
                className="rounded-lg border border-black/15 px-3 py-1.5 text-sm"
              >
                Change repo
              </button>
              <button onClick={() => setShowCreateModal(true)} className="rounded-lg bg-[#24292e] px-3 py-1.5 text-sm text-white">
                New repo
              </button>
              <button
                onClick={openBrowse}
                disabled={loadingDrafts}
                className="tool-btn rounded-lg px-3 py-1.5 text-sm disabled:opacity-50"
              >
                {loadingDrafts ? "Loading..." : "Refresh"}
              </button>
            </div>
            <div className="mt-4 flex-1 overflow-auto rounded-xl border border-black/10">
              {loadingDrafts ? (
                <div className="flex items-center justify-center gap-2 p-8 text-sm text-black/60">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading drafts...
                </div>
              ) : drafts.length === 0 ? (
                <div className="p-6 text-center text-sm text-black/60">
                  No drafts yet in this repo. Save a draft to see it here.
                  <div className="mt-3">
                    <button onClick={() => { setShowBrowseModal(false); setShowCreateModal(true); }} className="rounded-lg bg-[#24292e] px-3 py-1.5 text-sm text-white">
                      Create repo
                    </button>
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-black/10">
                  {drafts.map((f) => (
                    <li key={f.path} className="flex items-center justify-between gap-2 p-3">
                      <span className="truncate text-sm font-medium">{f.name}</span>
                      <button
                        onClick={() => loadDraft(f)}
                        className="shrink-0 rounded-lg bg-[#24292e] px-3 py-1 text-xs font-medium text-white"
                      >
                        Load
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function ThemeToggle() {
  const theme = useBoard((s) => s.theme);
  const toggleTheme = useBoard((s) => s.toggleTheme);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <button
      onClick={toggleTheme}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      className="float-bar tool-btn flex h-10 w-10 items-center justify-center rounded-2xl"
    >
      {!mounted ? (
        <span className="h-4 w-4" />
      ) : theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}

export function SceneName() {
  const sceneName = useBoard((s) => s.sceneName);
  const setSceneName = useBoard((s) => s.setSceneName);
  return (
    <div className="float-bar flex items-center gap-2 rounded-2xl px-3 py-1.5">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1a1917] font-serif text-[15px] italic text-[#f5f3ec]">
        d
      </div>
      <input
        value={sceneName}
        onChange={(e) => setSceneName(e.target.value)}
        className="w-36 bg-transparent text-center text-[13.5px] font-medium outline-none"
      />
    </div>
  );
}

export default function TopBar() {
  const setSceneName = useBoard((s) => s.setSceneName);
  const replaceAll = useBoard((s) => s.replaceAll);
  const clearAll = useBoard((s) => s.clearAll);
  const undo = useBoard((s) => s.undo);
  const redo = useBoard((s) => s.redo);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="float-bar flex items-center gap-1 rounded-2xl px-2 py-1.5 text-[13px]">
      <button onClick={undo} className="tool-btn rounded-lg px-2 py-1" title="Undo (Ctrl+Z)">↩</button>
      <button onClick={redo} className="tool-btn rounded-lg px-2 py-1" title="Redo (Ctrl+Shift+Z)">↪</button>
      <div className="mx-1 h-4 w-px bg-black/10" />
      <button onClick={() => fileRef.current?.click()} className="tool-btn rounded-lg px-2 py-1 font-medium">Open</button>
      <button onClick={() => { if (confirm("Clear canvas?")) clearAll(); }} className="tool-btn rounded-lg px-2 py-1 text-[#c96442]" title="Clear">✕</button>
      <input
        ref={fileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          f.text().then((t) => {
            try {
              const { elements: els, name } = sceneFromJSON(t);
              replaceAll(els);
              setSceneName(name);
            } catch {
              alert("Invalid scene file");
            }
          });
          e.target.value = "";
        }}
      />
    </div>
  );
}
