export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          is_beta_tester: boolean
          level: number
          username: string
          xp: number
        }
        Insert: {
          id: string
          is_beta_tester?: boolean
          level?: number
          username: string
          xp?: number
        }
        Update: {
          id?: string
          is_beta_tester?: boolean
          level?: number
          username?: string
          xp?: number
        }
        Relationships: []
      }
      pubs: {
        Row: {
          address: string
          id: string
          lat: number
          lng: number
          name: string
        }
        Insert: {
          address: string
          id: string
          lat: number
          lng: number
          name: string
        }
        Update: {
          address?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          created_at: string
          id: number
          price: number
          pub_id: string
          quality: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          price: number
          pub_id: string
          quality: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          price?: number
          pub_id?: string
          quality?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_pub_id_fkey"
            columns: ["pub_id"]
            referencedRelation: "pubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}