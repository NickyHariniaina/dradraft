"use client";

import { useEffect, useRef, useState } from "react";
import { useBoard } from "@/lib/store";
import { sceneFromJSON } from "@/lib/export";
import { Github, Loader2, LogOut, Moon, Sun } from "lucide-react";
import { useSession, signIn, signOut } from "next-auth/react";

export function GithubConnect() {
  const { data: session, status } = useSession();
  const [repoName, setRepoName] = useState("dradraft-scenes");
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    const key = "dradraft:githubRepo";
    if (localStorage.getItem(key)) return;
    setChecking(true);
    fetch("/api/github/repo")
      .then((r) => {
        if (r.status === 404) setShowModal(true);
      })
      .finally(() => setChecking(false));
  }, [status]);

  if (status === "loading") {
    return <span className="float-bar h-9 w-28 animate-pulse rounded-2xl" />;
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn("github")}
        className="flex items-center gap-2 rounded-2xl bg-[#24292e] px-4 py-2 text-sm font-medium text-white hover:bg-black"
      >
        <Github className="h-4 w-4" /> Sign in with GitHub
      </button>
    );
  }

  return (
    <>
      <div className="float-bar flex items-center gap-2 rounded-2xl px-3 py-1.5">
        {session.user?.image && <img src={session.user.image} alt="" className="h-7 w-7 rounded-full" />}
        <span className="text-sm font-medium">{session.user?.name ?? session.user?.email}</span>
        <button onClick={() => signOut()} className="tool-btn rounded-lg p-1" title="Sign out">
          <LogOut className="h-4 w-4" />
        </button>
        <button onClick={() => setShowModal(true)} className="rounded-lg bg-[#24292e] px-3 py-1.5 text-sm font-medium text-white">
          {checking ? "Checking..." : "Storage repo"}
        </button>
      </div>
      {showModal && (
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
              <button onClick={() => setShowModal(false)} className="rounded-lg px-3 py-1.5 text-sm">
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
                    setShowModal(false);
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
