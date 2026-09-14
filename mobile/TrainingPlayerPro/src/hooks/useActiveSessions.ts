import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";
import {
  ACTIVE_SESSION_STATUSES,
  LiveSession,
} from "../types/liveSession";

export function useActiveSessions() {
  const [sessions, setSessions] =
    useState<LiveSession[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadSessions =
    useCallback(async () => {
      setError(null);

      const { data, error } =
        await supabase
          .from("live_sessions")
          .select("*")
          .in(
            "status",
            ACTIVE_SESSION_STATUSES
          )
          .order("created_at", {
            ascending: false,
          });

      if (error) {
        console.log(
          "Could not load active sessions:",
          error
        );

        setError(error.message);
        setLoading(false);
        return;
      }

      setSessions(
        (data ?? []) as LiveSession[]
      );

      setLoading(false);
    }, []);

  useEffect(() => {
    loadSessions();

    const channel = supabase
      .channel("active-live-sessions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_sessions",
        },
        () => {
          loadSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadSessions]);

  return {
    sessions,
    loading,
    error,
    refresh: loadSessions,
  };
}
