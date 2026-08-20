"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { QuestionnaireSession } from "@/types/Session";

const STORAGE_KEY = "lira:session";

interface SessionContextValue {
  session: QuestionnaireSession | null;
  setSession: (session: QuestionnaireSession) => void;
  clearSession: () => void;
  /**
   * False until sessionStorage has been read. Consumers must wait for this
   * before deciding a session is missing, or the first paint after a refresh
   * would wrongly show the "result unavailable" fallback.
   */
  ready: boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<QuestionnaireSession | null>(null);
  const [ready, setReady] = useState(false);

  // sessionStorage does not exist during server rendering, so the read happens
  // after mount. This is also what makes a refresh on /results survive.
  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEY);

      if (stored) {
        setSessionState(JSON.parse(stored) as QuestionnaireSession);
      }
    } catch (error) {
      // Malformed or unreadable storage (private mode, quota) is not fatal:
      // the user simply starts over.
      console.warn("Could not restore session:", error);
    } finally {
      setReady(true);
    }
  }, []);

  const setSession = useCallback((next: QuestionnaireSession) => {
    setSessionState(next);

    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      // Keep the in-memory value: navigation still works for this tab.
      console.warn("Could not persist session:", error);
    }
  }, []);

  const clearSession = useCallback(() => {
    setSessionState(null);

    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to recover from — the in-memory value is already cleared.
    }
  }, []);

  return (
    <SessionContext.Provider
      value={{ session, setSession, clearSession, ready }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used inside a SessionProvider.");
  }

  return context;
}
