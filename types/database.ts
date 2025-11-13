export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          company_name: string | null;
          phone: string | null;
          website: string | null;
          bio: string | null;
          avatar_url: string | null;
          updated_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          company_name?: string | null;
          phone?: string | null;
          website?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          updated_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          full_name?: string | null;
          company_name?: string | null;
          phone?: string | null;
          website?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          updated_at?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          seller_id: string;
          name: string;
          description: string | null;
          price: number;
          currency: string;
          status: "draft" | "published" | "archived";
          inventory: number | null;
          category_id: string | null;
          subcategory_id: string | null;
          hs_code: string | null;
          min_order_quantity: number | null;
          lead_time_days: number | null;
          packaging_length_cm: number | null;
          packaging_width_cm: number | null;
          packaging_height_cm: number | null;
          packaging_weight_kg: number | null;
          shipping_notes: string | null;
        moq: number;
        cartons_per_moq: number | null;
        pallets_per_moq: number | null;
        containers_20ft_per_moq: number | null;
        containers_40ft_per_moq: number | null;
          primary_image_id: string | null;
          images_count: number;
          images_last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          name: string;
          description?: string | null;
          price: number;
          currency?: string;
          status?: "draft" | "published" | "archived";
          inventory?: number | null;
          category_id?: string | null;
          subcategory_id?: string | null;
          hs_code?: string | null;
          min_order_quantity?: number | null;
          lead_time_days?: number | null;
          packaging_length_cm?: number | null;
          packaging_width_cm?: number | null;
          packaging_height_cm?: number | null;
          packaging_weight_kg?: number | null;
          shipping_notes?: string | null;
        moq?: number;
        cartons_per_moq?: number | null;
        pallets_per_moq?: number | null;
        containers_20ft_per_moq?: number | null;
        containers_40ft_per_moq?: number | null;
          primary_image_id?: string | null;
          images_count?: number;
          images_last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          price?: number;
          currency?: string;
          status?: "draft" | "published" | "archived";
          inventory?: number | null;
          category_id?: string | null;
          subcategory_id?: string | null;
          hs_code?: string | null;
          min_order_quantity?: number | null;
          lead_time_days?: number | null;
          packaging_length_cm?: number | null;
          packaging_width_cm?: number | null;
          packaging_height_cm?: number | null;
          packaging_weight_kg?: number | null;
          shipping_notes?: string | null;
        moq?: number;
        cartons_per_moq?: number | null;
        pallets_per_moq?: number | null;
        containers_20ft_per_moq?: number | null;
        containers_40ft_per_moq?: number | null;
          primary_image_id?: string | null;
          images_count?: number;
          images_last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_seller_id_fkey";
            columns: ["seller_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_subcategory_id_fkey";
            columns: ["subcategory_id"];
            referencedRelation: "subcategories";
            referencedColumns: ["id"];
          },
        ];
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          storage_path: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          storage_path: string;
          position: number;
          created_at?: string;
        };
        Update: {
          product_id?: string;
          storage_path?: string;
          position?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      subcategories: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          slug: string;
          created_at?: string;
        };
        Update: {
          category_id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      product_incoterms: {
        Row: {
          id: string;
          product_id: string;
          term: string;
          currency: string;
          price: number;
          port: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          term: string;
          currency: string;
          price: number;
          port: string;
          created_at?: string;
        };
        Update: {
          product_id?: string;
          term?: string;
          currency?: string;
          price?: number;
          port?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_incoterms_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Enums: {
      product_status: "draft" | "published" | "archived";
    };
  };
}

