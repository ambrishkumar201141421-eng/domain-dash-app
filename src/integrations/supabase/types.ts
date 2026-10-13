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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      chats: {
        Row: {
          applicant_id: string
          created_at: string
          id: number
          poster_id: string
          status: string
          task_id: number
        }
        Insert: {
          applicant_id: string
          created_at?: string
          id?: never
          poster_id: string
          status?: string
          task_id: number
        }
        Update: {
          applicant_id?: string
          created_at?: string
          id?: never
          poster_id?: string
          status?: string
          task_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "chats_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_poster_id_fkey"
            columns: ["poster_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      colleges: {
        Row: {
          domain: string
          name: string
          short_name: string
        }
        Insert: {
          domain: string
          name: string
          short_name: string
        }
        Update: {
          domain?: string
          name?: string
          short_name?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          chat_id: number
          created_at: string
          id: number
          message_text: string
          sender_id: string
        }
        Insert: {
          chat_id: number
          created_at?: string
          id?: never
          message_text: string
          sender_id: string
        }
        Update: {
          chat_id?: number
          created_at?: string
          id?: never
          message_text?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_flags: {
        Row: {
          content: string
          context: string
          created_at: string
          id: number
          matched_terms: string[]
          review_status: Database["public"]["Enums"]["flag_review_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          user_id: string
        }
        Insert: {
          content: string
          context?: string
          created_at?: string
          id?: never
          matched_terms?: string[]
          review_status?: Database["public"]["Enums"]["flag_review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          user_id: string
        }
        Update: {
          content?: string
          context?: string
          created_at?: string
          id?: never
          matched_terms?: string[]
          review_status?: Database["public"]["Enums"]["flag_review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_flags_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          campus: string
          created_at: string
          id: number
          is_read: boolean
          message: string | null
          reward: string | null
          task_id: number | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          campus: string
          created_at?: string
          id?: never
          is_read?: boolean
          message?: string | null
          reward?: string | null
          task_id?: number | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          campus?: string
          created_at?: string
          id?: never
          is_read?: boolean
          message?: string | null
          reward?: string | null
          task_id?: number | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          college_domain: string
          created_at: string
          full_name: string
          id: string
          notify_campus_tasks: boolean
          rating: number
          ratings_count: number
          status: Database["public"]["Enums"]["account_status"]
          suspended_until: string | null
          theme_pref: string
        }
        Insert: {
          avatar_url?: string | null
          college_domain: string
          created_at?: string
          full_name?: string
          id: string
          notify_campus_tasks?: boolean
          rating?: number
          ratings_count?: number
          status?: Database["public"]["Enums"]["account_status"]
          suspended_until?: string | null
          theme_pref?: string
        }
        Update: {
          avatar_url?: string | null
          college_domain?: string
          created_at?: string
          full_name?: string
          id?: string
          notify_campus_tasks?: boolean
          rating?: number
          ratings_count?: number
          status?: Database["public"]["Enums"]["account_status"]
          suspended_until?: string | null
          theme_pref?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: number
          reviewee_id: string
          reviewer_id: string
          stars: number
          task_id: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: never
          reviewee_id: string
          reviewer_id: string
          stars: number
          task_id: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: never
          reviewee_id?: string
          reviewer_id?: string
          stars?: number
          task_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "ratings_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          accepted_at: string | null
          category: Database["public"]["Enums"]["task_category"]
          completed_at: string | null
          created_at: string
          description: string | null
          expires_at: string | null
          handshake_pin: number | null
          helper_id: string | null
          id: number
          poster_id: string
          reward: string
          status: Database["public"]["Enums"]["task_status"]
          title: string
        }
        Insert: {
          accepted_at?: string | null
          category: Database["public"]["Enums"]["task_category"]
          completed_at?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          handshake_pin?: number | null
          helper_id?: string | null
          id?: never
          poster_id: string
          reward: string
          status?: Database["public"]["Enums"]["task_status"]
          title: string
        }
        Update: {
          accepted_at?: string | null
          category?: Database["public"]["Enums"]["task_category"]
          completed_at?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          handshake_pin?: number | null
          helper_id?: string | null
          id?: never
          poster_id?: string
          reward?: string
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_poster_id_fkey"
            columns: ["poster_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_applicant: { Args: { p_chat_id: number }; Returns: undefined }
      complete_task: {
        Args: { p_pin: number; p_task_id: number }
        Returns: boolean
      }
      current_domain: { Args: never; Returns: string }
      ensure_profile: {
        Args: { p_full_name: string }
        Returns: {
          avatar_url: string | null
          college_domain: string
          created_at: string
          full_name: string
          id: string
          notify_campus_tasks: boolean
          rating: number
          ratings_count: number
          status: Database["public"]["Enums"]["account_status"]
          suspended_until: string | null
          theme_pref: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      expire_verification: { Args: never; Returns: undefined }
      get_handshake_pin: { Args: { p_task_id: number }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_user: { Args: never; Returns: boolean }
      is_chat_member: { Args: { p_chat_id: number }; Returns: boolean }
      record_violation: {
        Args: { p_content: string; p_context?: string; p_terms: string[] }
        Returns: {
          avatar_url: string | null
          college_domain: string
          created_at: string
          full_name: string
          id: string
          notify_campus_tasks: boolean
          rating: number
          ratings_count: number
          status: Database["public"]["Enums"]["account_status"]
          suspended_until: string | null
          theme_pref: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      review_flag: {
        Args: { p_flag_id: number; p_guilty: boolean }
        Returns: undefined
      }
    }
    Enums: {
      account_status: "active" | "in_verification" | "permanently_banned"
      app_role: "admin" | "moderator" | "user"
      flag_review_status: "pending" | "guilty" | "cleared"
      task_category: "Hustle" | "Playground" | "Lounge"
      task_status: "Open" | "Accepted" | "Completed" | "Expired" | "Cancelled"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ["active", "in_verification", "permanently_banned"],
      app_role: ["admin", "moderator", "user"],
      flag_review_status: ["pending", "guilty", "cleared"],
      task_category: ["Hustle", "Playground", "Lounge"],
      task_status: ["Open", "Accepted", "Completed", "Expired", "Cancelled"],
    },
  },
} as const
