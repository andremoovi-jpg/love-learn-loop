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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          condition_type: string
          condition_value: number | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          points: number | null
          updated_at: string
        }
        Insert: {
          condition_type: string
          condition_value?: number | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          points?: number | null
          updated_at?: string
        }
        Update: {
          condition_type?: string
          condition_value?: number | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          email: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string | null
          title: string
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          title: string
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          title?: string
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          cartpanda_product_id: string | null
          content: Json | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          estimated_duration: string | null
          id: string
          is_active: boolean | null
          level: string | null
          name: string
          product_type: string
          slug: string
          updated_at: string
        }
        Insert: {
          cartpanda_product_id?: string | null
          content?: Json | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          estimated_duration?: string | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          name: string
          product_type: string
          slug: string
          updated_at?: string
        }
        Update: {
          cartpanda_product_id?: string | null
          content?: Json | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          estimated_duration?: string | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          name?: string
          product_type?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          total_points: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          total_points?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          total_points?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      upsells: {
        Row: {
          cartpanda_checkout_url: string | null
          created_at: string
          description: string | null
          discount_percentage: number | null
          id: string
          is_active: boolean | null
          parent_product_id: string
          price: number
          title: string
          updated_at: string
          upsell_product_id: string
        }
        Insert: {
          cartpanda_checkout_url?: string | null
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          parent_product_id: string
          price: number
          title: string
          updated_at?: string
          upsell_product_id: string
        }
        Update: {
          cartpanda_checkout_url?: string | null
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          parent_product_id?: string
          price?: number
          title?: string
          updated_at?: string
          upsell_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upsells_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsells_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsells_upsell_product_id_fkey"
            columns: ["upsell_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsells_upsell_product_id_fkey"
            columns: ["upsell_product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          created_at: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          created_at?: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          created_at?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_products: {
        Row: {
          cartpanda_order_id: string | null
          completed_at: string | null
          completed_lessons: string[] | null
          created_at: string
          id: string
          last_accessed_at: string | null
          product_id: string
          progress: number | null
          purchased_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cartpanda_order_id?: string | null
          completed_at?: string | null
          completed_lessons?: string[] | null
          created_at?: string
          id?: string
          last_accessed_at?: string | null
          product_id: string
          progress?: number | null
          purchased_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cartpanda_order_id?: string | null
          completed_at?: string | null
          completed_lessons?: string[] | null
          created_at?: string
          id?: string
          last_accessed_at?: string | null
          product_id?: string
          progress?: number | null
          purchased_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_upsell_views: {
        Row: {
          clicked: boolean | null
          clicked_at: string | null
          created_at: string
          id: string
          updated_at: string
          upsell_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          clicked?: boolean | null
          clicked_at?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          upsell_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          clicked?: boolean | null
          clicked_at?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          upsell_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_upsell_views_upsell_id_fkey"
            columns: ["upsell_id"]
            isOneToOne: false
            referencedRelation: "upsells"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          processed: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          payload: Json
          processed?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      products_public: {
        Row: {
          content: Json | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          estimated_duration: string | null
          id: string | null
          is_active: boolean | null
          level: string | null
          name: string | null
          product_type: string | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          content?: never
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          estimated_duration?: string | null
          id?: string | null
          is_active?: boolean | null
          level?: string | null
          name?: string | null
          product_type?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: never
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          estimated_duration?: string | null
          id?: string | null
          is_active?: boolean | null
          level?: string | null
          name?: string | null
          product_type?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_leads_with_password: {
        Args: { password_input: string }
        Returns: {
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
          whatsapp: string
        }[]
      }
      get_product_with_access_control: {
        Args: { product_slug: string }
        Returns: {
          content: Json
          cover_image_url: string
          created_at: string
          description: string
          estimated_duration: string
          has_access: boolean
          id: string
          is_active: boolean
          level: string
          name: string
          product_type: string
          slug: string
          updated_at: string
        }[]
      }
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      user_has_purchased_product: {
        Args: { product_id: string }
        Returns: boolean
      }
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
