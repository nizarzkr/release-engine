// ⚠️ Fichier généré depuis le schéma Supabase — NE PAS ÉDITER À LA MAIN.
// Régénérer après chaque migration (outil MCP generate_typescript_types).
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      api_key: {
        Row: {
          created_at: string | null
          encrypted_key: string
          id: string
          key_hint: string | null
          provider: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          encrypted_key: string
          id?: string
          key_hint?: string | null
          provider: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          encrypted_key?: string
          id?: string
          key_hint?: string | null
          provider?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      artist_profile: {
        Row: {
          artist_name: string
          constraints: string | null
          created_at: string | null
          da_keywords: string[] | null
          genres: string[] | null
          id: string
          image_stance: string | null
          platforms: string[] | null
          references_art: string[] | null
          updated_at: string | null
          user_id: string
          weekly_capacity: number | null
        }
        Insert: {
          artist_name: string
          constraints?: string | null
          created_at?: string | null
          da_keywords?: string[] | null
          genres?: string[] | null
          id?: string
          image_stance?: string | null
          platforms?: string[] | null
          references_art?: string[] | null
          updated_at?: string | null
          user_id: string
          weekly_capacity?: number | null
        }
        Update: {
          artist_name?: string
          constraints?: string | null
          created_at?: string | null
          da_keywords?: string[] | null
          genres?: string[] | null
          id?: string
          image_stance?: string | null
          platforms?: string[] | null
          references_art?: string[] | null
          updated_at?: string | null
          user_id?: string
          weekly_capacity?: number | null
        }
        Relationships: []
      }
      checklist_item: {
        Row: {
          created_at: string | null
          due_date: string | null
          id: string
          is_done: boolean | null
          label: string
          phase: string | null
          release_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_done?: boolean | null
          label: string
          phase?: string | null
          release_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_done?: boolean | null
          label?: string
          phase?: string | null
          release_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_item_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "release"
            referencedColumns: ["id"]
          },
        ]
      }
      content_item: {
        Row: {
          assignee: string | null
          brief: Json | null
          created_at: string | null
          format: string | null
          id: string
          is_published: boolean | null
          objective_tag: string | null
          pipeline_status: string | null
          platform: string | null
          release_id: string
          scheduled_date: string | null
          source_block_id: string | null
          tags: string[] | null
          theme: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assignee?: string | null
          brief?: Json | null
          created_at?: string | null
          format?: string | null
          id?: string
          is_published?: boolean | null
          objective_tag?: string | null
          pipeline_status?: string | null
          platform?: string | null
          release_id: string
          scheduled_date?: string | null
          source_block_id?: string | null
          tags?: string[] | null
          theme: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assignee?: string | null
          brief?: Json | null
          created_at?: string | null
          format?: string | null
          id?: string
          is_published?: boolean | null
          objective_tag?: string | null
          pipeline_status?: string | null
          platform?: string | null
          release_id?: string
          scheduled_date?: string | null
          source_block_id?: string | null
          tags?: string[] | null
          theme?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_item_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "release"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_item_source_block_id_fkey"
            columns: ["source_block_id"]
            isOneToOne: false
            referencedRelation: "source_block"
            referencedColumns: ["id"]
          },
        ]
      }
      content_theme: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      release: {
        Row: {
          bpm: number | null
          cover_url: string | null
          created_at: string | null
          dsp_links: Json | null
          id: string
          mood: string | null
          parent_release_id: string | null
          release_date: string
          status: string | null
          title: string
          type: string | null
          updated_at: string | null
          user_id: string
          window_template: string | null
        }
        Insert: {
          bpm?: number | null
          cover_url?: string | null
          created_at?: string | null
          dsp_links?: Json | null
          id?: string
          mood?: string | null
          parent_release_id?: string | null
          release_date: string
          status?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
          user_id: string
          window_template?: string | null
        }
        Update: {
          bpm?: number | null
          cover_url?: string | null
          created_at?: string | null
          dsp_links?: Json | null
          id?: string
          mood?: string | null
          parent_release_id?: string | null
          release_date?: string
          status?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string
          window_template?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "release_parent_release_id_fkey"
            columns: ["parent_release_id"]
            isOneToOne: false
            referencedRelation: "release"
            referencedColumns: ["id"]
          },
        ]
      }
      source_block: {
        Row: {
          asset_link: string | null
          created_at: string | null
          id: string
          release_id: string
          shoot_date: string | null
          status: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          asset_link?: string | null
          created_at?: string | null
          id?: string
          release_id: string
          shoot_date?: string | null
          status?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          asset_link?: string | null
          created_at?: string | null
          id?: string
          release_id?: string
          shoot_date?: string | null
          status?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_block_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "release"
            referencedColumns: ["id"]
          },
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
