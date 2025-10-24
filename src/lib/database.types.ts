export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      tracks: {
        Row: {
          id: string;
          title: string;
          storage_url: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          storage_url: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          storage_url?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      results: {
        Row: {
          id: string;
          track_id: string;
          matches: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          track_id: string;
          matches: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          track_id?: string;
          matches?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      royalty_events: {
        Row: {
          id: string;
          result_id: string;
          total_amount_cents: number;
          splits: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          result_id: string;
          total_amount_cents: number;
          splits: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          result_id?: string;
          total_amount_cents?: number;
          splits?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
