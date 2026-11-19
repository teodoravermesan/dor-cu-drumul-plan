import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Trip = Tables<"trips">;
export type Activity = Tables<"activities">;
export type Booking = Tables<"bookings">;
export type Expense = Tables<"expenses">;

async function must<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}

export const tripsQuery = () =>
  queryOptions({
    queryKey: ["trips"],
    queryFn: () => must<Trip[]>(supabase.from("trips").select("*").order("start_date")),
  });
export const tripQuery = (id: string) =>
  queryOptions({
    queryKey: ["trip", id],
    queryFn: () => must<Trip>(supabase.from("trips").select("*").eq("id", id).single()),
  });
export const activitiesQuery = (id: string) =>
  queryOptions({
    queryKey: ["activities", id],
    queryFn: () =>
      must<Activity[]>(supabase.from("activities").select("*").eq("trip_id", id).order("day").order("position")),
  });
export const bookingsQuery = (id: string) =>
  queryOptions({
    queryKey: ["bookings", id],
    queryFn: () =>
      must<Booking[]>(supabase.from("bookings").select("*").eq("trip_id", id).order("starts_at", { nullsFirst: false })),
  });
export const expensesQuery = (id: string) =>
  queryOptions({
    queryKey: ["expenses", id],
    queryFn: () =>
      must<Expense[]>(supabase.from("expenses").select("*").eq("trip_id", id).order("spent_on", { ascending: false })),
  });
export { must };
