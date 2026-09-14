export type LiveSessionStatus =
  | "ready"
  | "countdown"
  | "running"
  | "paused"
  | "finished";

export type LiveSessionBlock = {
  id: string;
  order: number;
  name: string;
  durationSec: number;
  description?: string | null;
  color?: string | null;

  targetFtpMin?: number | null;
  targetFtpMax?: number | null;

  targetRpmMin?: number | null;
  targetRpmMax?: number | null;

  targetBorg?: number | null;

  [key: string]: unknown;
};

export type PassSnapshot = {
  schemaVersion: number;
  passId: string;
  name: string;
  activity: string;
  intensityModel?: string | null;
  totalDurationSec: number;
  hostName?: string | null;
  blocks: LiveSessionBlock[];
};

export type LiveSession = {
  id: string;
  pass_id: string | null;
  host_user_id: string | null;

  status: LiveSessionStatus;
  current_block_index: number;

  started_at: string | null;
  clock_anchor_at: string | null;
  position_ms: number;

  countdown_ends_at: string | null;

  pass_snapshot: PassSnapshot;

  created_at: string;
  updated_at: string;
  ended_at: string | null;
};

export const ACTIVE_SESSION_STATUSES: LiveSessionStatus[] = [
  "ready",
  "countdown",
  "running",
  "paused",
];
