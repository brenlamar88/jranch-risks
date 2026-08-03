// Typed Supabase client wrapper
import { supabase as supabaseClient } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Re-export with explicit typing to ensure type inference works correctly
export const supabase = supabaseClient;

// Type helpers for common operations
export type SupabaseClient = typeof supabaseClient;
export type DbTables = Database["public"]["Tables"];
export type DbTable<T extends keyof DbTables> = DbTables[T]["Row"];
export type DbInsert<T extends keyof DbTables> = DbTables[T]["Insert"];
export type DbUpdate<T extends keyof DbTables> = DbTables[T]["Update"];
