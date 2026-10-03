import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { todayIn } from "./dates";
import type { Content, PersonalEvent, Profile } from "./domain";
import { buildPlan } from "./planner";

export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, user: data.user };
});

export const getProfile = cache(async (): Promise<Profile> => {
  const { supabase, user } = await getSession();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return (
    (data as Profile | null) ?? {
      id: user.id,
      name: "",
      timezone: "America/Sao_Paulo",
      recording_windows: {},
    }
  );
});

export const getToday = cache(async () => todayIn((await getProfile()).timezone));

export const getContents = cache(async (): Promise<Content[]> => {
  const { supabase } = await getSession();
  const { data, error } = await supabase
    .from("contents")
    .select("*")
    .order("publication_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as Content[];
});

export const getContent = cache(async (id: string): Promise<Content | null> => {
  const { supabase } = await getSession();
  const { data } = await supabase.from("contents").select("*").eq("id", id).maybeSingle();
  return data as Content | null;
});

export const getEvents = cache(async (): Promise<PersonalEvent[]> => {
  const { supabase } = await getSession();
  const { data, error } = await supabase
    .from("personal_events")
    .select("*")
    .order("date")
    .order("start_time");
  if (error) throw error;
  return data as PersonalEvent[];
});

export const getPlan = cache(async () => {
  const [profile, contents, events, today] = await Promise.all([
    getProfile(),
    getContents(),
    getEvents(),
    getToday(),
  ]);
  return buildPlan({ today, contents, events, windows: profile.recording_windows, horizonDays: 70 });
});
