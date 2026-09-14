import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AppState,
} from "react-native";

import { supabase } from "../lib/supabase";
import {
  LiveSession,
} from "../types/liveSession";

function calculatePositionMs(
  session: LiveSession | null
) {
  if (!session) {
    return 0;
  }

  const base =
    Number(session.position_ms) || 0;

  if (
    session.status !== "running" ||
    !session.clock_anchor_at
  ) {
    return base;
  }

  const anchor =
    new Date(
      session.clock_anchor_at
    ).getTime();

  return Math.max(
    0,
    base + (Date.now() - anchor)
  );
}

function calculateCountdownMs(
  session: LiveSession | null
) {
  if (
    !session ||
    session.status !== "countdown" ||
    !session.countdown_ends_at
  ) {
    return 0;
  }

  return Math.max(
    0,
    new Date(
      session.countdown_ends_at
    ).getTime() - Date.now()
  );
}

export function useLiveSession(
  sessionId: string | null
) {
  const [session, setSession] =
    useState<LiveSession | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [tick, setTick] =
    useState(0);

  const loadSession =
    useCallback(async () => {
      if (!sessionId) {
        setSession(null);
        setLoading(false);
        return;
      }

      setError(null);

      const { data, error } =
        await supabase
          .from("live_sessions")
          .select("*")
          .eq("id", sessionId)
          .single();

      if (error) {
        console.log(
          "Could not load live session:",
          error
        );

        setError(error.message);
        setLoading(false);
        return;
      }

      setSession(
        data as LiveSession
      );

      setLoading(false);
    }, [sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const channel = supabase
      .channel(
        `live-session-${sessionId}`
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          setSession(
            payload.new as LiveSession
          );
        }
      )
      .subscribe((status) => {
        if (
          status ===
          "SUBSCRIBED"
        ) {
          /*
           * Läs alltid om raden när
           * Realtime är tillbaka.
           *
           * Då spelar missade events
           * ingen roll.
           */
          loadSession();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    sessionId,
    loadSession,
  ]);

  useEffect(() => {
    const subscription =
      AppState.addEventListener(
        "change",
        (state) => {
          if (state === "active") {
            loadSession();
          }
        }
      );

    return () => {
      subscription.remove();
    };
  }, [loadSession]);

  useEffect(() => {
    const timer =
      setInterval(() => {
        setTick(
          (current) =>
            current + 1
        );
      }, 250);

    return () => {
      clearInterval(timer);
    };
  }, []);

  const currentPositionMs =
    useMemo(
      () =>
        calculatePositionMs(
          session
        ),
      [session, tick]
    );

  const countdownRemainingMs =
    useMemo(
      () =>
        calculateCountdownMs(
          session
        ),
      [session, tick]
    );

  const currentBlock =
    session?.pass_snapshot
      ?.blocks?.[
        session.current_block_index
      ] ?? null;

  return {
    session,
    loading,
    error,

    currentPositionMs,
    currentPositionSeconds:
      Math.floor(
        currentPositionMs / 1000
      ),

    countdownRemainingMs,
    countdownRemainingSeconds:
      Math.ceil(
        countdownRemainingMs /
          1000
      ),

    currentBlock,

    refresh: loadSession,
  };
}
