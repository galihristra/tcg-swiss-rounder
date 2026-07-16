import { supabase } from "./supabase";
import type {
  Player,
  SwissMatch,
  SingleEliminationBracket,
  DoubleEliminationBracket,
} from "../engine/tournament";

export type Mode = "swiss" | "single" | "double";

/** Everything about one event that we persist (excludes transient UI like the add-player input). */
export interface EventState {
  mode: Mode;
  players: Player[];
  matches: SwissMatch[];
  round: number;
  roundsInput: string;
  eventFinished: boolean;
  singleBracket: SingleEliminationBracket | null;
  doubleBracket: DoubleEliminationBracket | null;
}

export interface EventRecord {
  id: string;
  name: string;
  state: EventState;
}

export interface ArchivedEventSummary {
  id: string;
  name: string;
  updated_at: string;
  state: EventState;
}

const TABLE = "events";

export function emptyState(): EventState {
  return {
    mode: "swiss",
    players: [],
    matches: [],
    round: 0,
    roundsInput: "3",
    eventFinished: false,
    singleBracket: null,
    doubleBracket: null,
  };
}

export function defaultEventName(): string {
  return `Event ${new Date().toISOString().slice(0, 10)}`;
}

/** Fill in any fields missing from a persisted blob (forward-compatible with older rows). */
function normalizeState(state: Partial<EventState> | null | undefined): EventState {
  return { ...emptyState(), ...(state ?? {}) };
}

/** Load the current active event, creating a fresh empty one if none exists yet. */
export async function loadOrCreateActiveEvent(): Promise<EventRecord> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, name, state")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data) return { id: data.id, name: data.name, state: normalizeState(data.state) };
  return createActiveEvent();
}

async function createActiveEvent(): Promise<EventRecord> {
  const name = defaultEventName();
  const state = emptyState();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ name, state, status: "active" })
    .select("id, name, state")
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name, state: normalizeState(data.state) };
}

export async function saveEvent(id: string, name: string, state: EventState): Promise<void> {
  const { error } = await supabase.from(TABLE).update({ name, state }).eq("id", id);
  if (error) throw error;
}

/** Archive the current event and start a fresh active one; returns the new active event. */
export async function archiveAndCreate(currentId: string): Promise<EventRecord> {
  const { error } = await supabase.from(TABLE).update({ status: "archived" }).eq("id", currentId);
  if (error) throw error;
  return createActiveEvent();
}

export async function listArchivedEvents(): Promise<ArchivedEventSummary[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, name, updated_at, state")
    .eq("status", "archived")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    updated_at: r.updated_at,
    state: normalizeState(r.state),
  }));
}
