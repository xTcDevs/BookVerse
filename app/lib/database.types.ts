// Types for the Milestone 1 schema (supabase/migrations/*_foundation.sql).
// Regenerate with `npm run db:types` once the local stack is running.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type PreferenceScope = 'appearance' | 'browse' | 'reader_text' | 'reader_visual' | 'reader_audio';
export type StaffRole = 'moderator' | 'editor' | 'admin';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          handle: string | null;
          display_name: string | null;
          bio: string | null;
          avatar_path: string | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: {
          handle?: string | null;
          display_name?: string | null;
          bio?: string | null;
          avatar_path?: string | null;
          is_public?: boolean;
        };
        Relationships: [];
      };
      user_roles: {
        Row: { user_id: string; role: StaffRole; granted_by: string | null; granted_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      user_preferences: {
        Row: { user_id: string; scope: PreferenceScope; schema_version: number; prefs: Json; updated_at: string };
        Insert: { user_id: string; scope: PreferenceScope; schema_version?: number; prefs: Json; updated_at?: string };
        Update: { schema_version?: number; prefs?: Json; updated_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: { preference_scope: PreferenceScope; staff_role: StaffRole };
    CompositeTypes: Record<string, never>;
  };
}
