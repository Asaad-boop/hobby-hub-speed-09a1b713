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
      ad_campaigns: {
        Row: {
          attribution_method: Database["public"]["Enums"]["ad_attribution_method"]
          campaign_id_external: string | null
          campaign_name: string
          category_id: string | null
          created_at: string
          daily_budget: number | null
          end_date: string | null
          id: string
          notes: string | null
          platform: Database["public"]["Enums"]["ad_platform"]
          product_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["ad_status"]
          total_spend: number
          updated_at: string
        }
        Insert: {
          attribution_method?: Database["public"]["Enums"]["ad_attribution_method"]
          campaign_id_external?: string | null
          campaign_name: string
          category_id?: string | null
          created_at?: string
          daily_budget?: number | null
          end_date?: string | null
          id?: string
          notes?: string | null
          platform?: Database["public"]["Enums"]["ad_platform"]
          product_id?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["ad_status"]
          total_spend?: number
          updated_at?: string
        }
        Update: {
          attribution_method?: Database["public"]["Enums"]["ad_attribution_method"]
          campaign_id_external?: string | null
          campaign_name?: string
          category_id?: string | null
          created_at?: string
          daily_budget?: number | null
          end_date?: string | null
          id?: string
          notes?: string | null
          platform?: Database["public"]["Enums"]["ad_platform"]
          product_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["ad_status"]
          total_spend?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_campaigns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_spend_entries: {
        Row: {
          amount: number
          campaign_id: string
          created_at: string
          id: string
          notes: string | null
          spend_date: string
          synced_from: string
        }
        Insert: {
          amount: number
          campaign_id: string
          created_at?: string
          id?: string
          notes?: string | null
          spend_date: string
          synced_from?: string
        }
        Update: {
          amount?: number
          campaign_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          spend_date?: string
          synced_from?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_spend_entries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      addresses: {
        Row: {
          address_line: string
          city: string
          created_at: string
          district: string
          full_name: string
          id: string
          is_default: boolean
          label: string | null
          phone: string
          postal_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line: string
          city: string
          created_at?: string
          district: string
          full_name: string
          id?: string
          is_default?: boolean
          label?: string | null
          phone: string
          postal_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line?: string
          city?: string
          created_at?: string
          district?: string
          full_name?: string
          id?: string
          is_default?: boolean
          label?: string | null
          phone?: string
          postal_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cash_accounts: {
        Row: {
          account_number: string | null
          created_at: string
          current_balance: number
          display_order: number
          id: string
          is_active: boolean
          name: string
          type: Database["public"]["Enums"]["cash_account_type"]
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          created_at?: string
          current_balance?: number
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          type: Database["public"]["Enums"]["cash_account_type"]
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          created_at?: string
          current_balance?: number
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          type?: Database["public"]["Enums"]["cash_account_type"]
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupon_usage: {
        Row: {
          coupon_id: string
          created_at: string
          discount_amount: number
          id: string
          order_id: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          discount_amount?: number
          id?: string
          order_id: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          discount_amount?: number
          id?: string
          order_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applicable_categories: Json | null
          applicable_products: Json | null
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          min_order_amount: number
          type: Database["public"]["Enums"]["coupon_type"]
          updated_at: string
          usage_limit: number | null
          used_count: number
          valid_from: string
          valid_until: string | null
          value: number
        }
        Insert: {
          applicable_categories?: Json | null
          applicable_products?: Json | null
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order_amount?: number
          type?: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          valid_from?: string
          valid_until?: string | null
          value: number
        }
        Update: {
          applicable_categories?: Json | null
          applicable_products?: Json | null
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order_amount?: number
          type?: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          valid_from?: string
          valid_until?: string | null
          value?: number
        }
        Relationships: []
      }
      courier_shipments: {
        Row: {
          actual_cod_charge: number
          actual_delivery_charge: number
          actual_return_charge: number
          booked_at: string | null
          cod_amount_expected: number
          cod_amount_received: number
          cod_settlement_batch_id: string | null
          cod_settlement_date: string | null
          consignment_id: string | null
          created_at: string
          delivered_at: string | null
          delivery_zone: Database["public"]["Enums"]["delivery_zone"]
          id: string
          items_breakdown: Json
          notes: string | null
          order_id: string
          provider: Database["public"]["Enums"]["courier_provider"]
          status: Database["public"]["Enums"]["shipment_status"]
          tracking_id: string | null
          updated_at: string
        }
        Insert: {
          actual_cod_charge?: number
          actual_delivery_charge?: number
          actual_return_charge?: number
          booked_at?: string | null
          cod_amount_expected?: number
          cod_amount_received?: number
          cod_settlement_batch_id?: string | null
          cod_settlement_date?: string | null
          consignment_id?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_zone?: Database["public"]["Enums"]["delivery_zone"]
          id?: string
          items_breakdown?: Json
          notes?: string | null
          order_id: string
          provider?: Database["public"]["Enums"]["courier_provider"]
          status?: Database["public"]["Enums"]["shipment_status"]
          tracking_id?: string | null
          updated_at?: string
        }
        Update: {
          actual_cod_charge?: number
          actual_delivery_charge?: number
          actual_return_charge?: number
          booked_at?: string | null
          cod_amount_expected?: number
          cod_amount_received?: number
          cod_settlement_batch_id?: string | null
          cod_settlement_date?: string | null
          consignment_id?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_zone?: Database["public"]["Enums"]["delivery_zone"]
          id?: string
          items_breakdown?: Json
          notes?: string | null
          order_id?: string
          provider?: Database["public"]["Enums"]["courier_provider"]
          status?: Database["public"]["Enums"]["shipment_status"]
          tracking_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courier_shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      damaged_inventory: {
        Row: {
          cost_value: number
          created_at: string
          disposal_date: string | null
          disposal_value: number
          disposed: boolean
          id: string
          logged_at: string
          logged_by: string
          notes: string | null
          product_id: string
          quantity: number
          reason: string | null
          source: Database["public"]["Enums"]["damage_source"]
        }
        Insert: {
          cost_value?: number
          created_at?: string
          disposal_date?: string | null
          disposal_value?: number
          disposed?: boolean
          id?: string
          logged_at?: string
          logged_by: string
          notes?: string | null
          product_id: string
          quantity: number
          reason?: string | null
          source: Database["public"]["Enums"]["damage_source"]
        }
        Update: {
          cost_value?: number
          created_at?: string
          disposal_date?: string | null
          disposal_value?: number
          disposed?: boolean
          id?: string
          logged_at?: string
          logged_by?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          reason?: string | null
          source?: Database["public"]["Enums"]["damage_source"]
        }
        Relationships: [
          {
            foreignKeyName: "damaged_inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          created_by: string
          description: string | null
          expense_date: string
          id: string
          payment_method: string | null
          receipt_url: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          created_by: string
          description?: string | null
          expense_date?: string
          id?: string
          payment_method?: string | null
          receipt_url?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          expense_date?: string
          id?: string
          payment_method?: string | null
          receipt_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_audit_log: {
        Row: {
          action: string
          id: string
          new_values: Json | null
          old_values: Json | null
          performed_at: string
          performed_by: string
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          performed_at?: string
          performed_by: string
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          performed_at?: string
          performed_by?: string
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      homepage_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          label: string | null
          sections: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          sections: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          sections?: Json
        }
        Relationships: []
      }
      order_financials: {
        Row: {
          ads_cost_attributed: number
          cod_amount_received: number
          cod_charge: number
          created_at: string
          delivery_charge: number
          finalization_status: Database["public"]["Enums"]["order_finalization_status"]
          finalized_at: string | null
          gross_profit: number | null
          id: string
          is_backfilled: boolean
          net_profit: number | null
          notes: string | null
          order_id: string
          other_costs: number
          packaging_cost: number
          product_cost: number
          profit_margin_pct: number | null
          return_charge: number
          revenue: number
          total_costs: number | null
          updated_at: string
        }
        Insert: {
          ads_cost_attributed?: number
          cod_amount_received?: number
          cod_charge?: number
          created_at?: string
          delivery_charge?: number
          finalization_status?: Database["public"]["Enums"]["order_finalization_status"]
          finalized_at?: string | null
          gross_profit?: number | null
          id?: string
          is_backfilled?: boolean
          net_profit?: number | null
          notes?: string | null
          order_id: string
          other_costs?: number
          packaging_cost?: number
          product_cost?: number
          profit_margin_pct?: number | null
          return_charge?: number
          revenue?: number
          total_costs?: number | null
          updated_at?: string
        }
        Update: {
          ads_cost_attributed?: number
          cod_amount_received?: number
          cod_charge?: number
          created_at?: string
          delivery_charge?: number
          finalization_status?: Database["public"]["Enums"]["order_finalization_status"]
          finalized_at?: string | null
          gross_profit?: number | null
          id?: string
          is_backfilled?: boolean
          net_profit?: number | null
          notes?: string | null
          order_id?: string
          other_costs?: number
          packaging_cost?: number
          product_cost?: number
          profit_margin_pct?: number | null
          return_charge?: number
          revenue?: number
          total_costs?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_financials_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          image: string | null
          name: string
          order_id: string
          price: number
          product_id: string
          quantity: number
          user_id: string
          variant_id: string | null
          variant_label: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image?: string | null
          name: string
          order_id: string
          price: number
          product_id: string
          quantity?: number
          user_id: string
          variant_id?: string | null
          variant_label?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image?: string | null
          name?: string
          order_id?: string
          price?: number
          product_id?: string
          quantity?: number
          user_id?: string
          variant_id?: string | null
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_code: string | null
          created_at: string
          discount_amount: number
          id: string
          notes: string | null
          order_financial_id: string | null
          payment_method: string | null
          shipment_id: string | null
          shipping_address: string | null
          shipping_city: string | null
          shipping_district: string | null
          shipping_fee: number
          shipping_name: string | null
          shipping_phone: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          discount_amount?: number
          id?: string
          notes?: string | null
          order_financial_id?: string | null
          payment_method?: string | null
          shipment_id?: string | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_district?: string | null
          shipping_fee?: number
          shipping_name?: string | null
          shipping_phone?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          discount_amount?: number
          id?: string
          notes?: string | null
          order_financial_id?: string | null
          payment_method?: string | null
          shipment_id?: string | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_district?: string | null
          shipping_fee?: number
          shipping_name?: string | null
          shipping_phone?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_order_financial_id_fkey"
            columns: ["order_financial_id"]
            isOneToOne: false
            referencedRelation: "order_financials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "courier_shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      product_option_types: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
          product_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          product_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_option_types_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_option_values: {
        Row: {
          created_at: string
          display_order: number
          id: string
          option_type_id: string
          swatch_hex: string | null
          value: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          option_type_id: string
          swatch_hex?: string | null
          value: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          option_type_id?: string
          swatch_hex?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_option_values_option_type_id_fkey"
            columns: ["option_type_id"]
            isOneToOne: false
            referencedRelation: "product_option_types"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variant_values: {
        Row: {
          option_value_id: string
          variant_id: string
        }
        Insert: {
          option_value_id: string
          variant_id: string
        }
        Update: {
          option_value_id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variant_values_option_value_id_fkey"
            columns: ["option_value_id"]
            isOneToOne: false
            referencedRelation: "product_option_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variant_values_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image: string | null
          is_active: boolean
          price_override: number | null
          product_id: string
          sku: string | null
          stock: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image?: string | null
          is_active?: boolean
          price_override?: number | null
          product_id: string
          sku?: string | null
          stock?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image?: string | null
          is_active?: boolean
          price_override?: number | null
          product_id?: string
          sku?: string | null
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          avg_cost: number
          benefits: Json
          category_id: string | null
          created_at: string
          description: string
          display_order: number
          gallery: Json
          id: string
          image: string
          is_active: boolean
          is_featured: boolean
          is_new_arrival: boolean
          old_price: number | null
          price: number
          rating: number
          reviews: number
          slug: string
          specs: Json
          stock: number
          title: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          avg_cost?: number
          benefits?: Json
          category_id?: string | null
          created_at?: string
          description?: string
          display_order?: number
          gallery?: Json
          id?: string
          image: string
          is_active?: boolean
          is_featured?: boolean
          is_new_arrival?: boolean
          old_price?: number | null
          price: number
          rating?: number
          reviews?: number
          slug: string
          specs?: Json
          stock?: number
          title: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          avg_cost?: number
          benefits?: Json
          category_id?: string | null
          created_at?: string
          description?: string
          display_order?: number
          gallery?: Json
          id?: string
          image?: string
          is_active?: boolean
          is_featured?: boolean
          is_new_arrival?: boolean
          old_price?: number | null
          price?: number
          rating?: number
          reviews?: number
          slug?: string
          specs?: Json
          stock?: number
          title?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          admin_notes: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      returns_exchanges: {
        Row: {
          created_at: string
          damage_logged_qty: number
          exchange_issued_qty: number
          financial_impact: number
          id: string
          items: Json
          notes: string | null
          order_id: string
          processed_at: string
          processed_by: string
          reason: string | null
          shipment_id: string | null
          stock_restored_qty: number
          type: Database["public"]["Enums"]["return_type"]
        }
        Insert: {
          created_at?: string
          damage_logged_qty?: number
          exchange_issued_qty?: number
          financial_impact?: number
          id?: string
          items?: Json
          notes?: string | null
          order_id: string
          processed_at?: string
          processed_by: string
          reason?: string | null
          shipment_id?: string | null
          stock_restored_qty?: number
          type: Database["public"]["Enums"]["return_type"]
        }
        Update: {
          created_at?: string
          damage_logged_qty?: number
          exchange_issued_qty?: number
          financial_impact?: number
          id?: string
          items?: Json
          notes?: string | null
          order_id?: string
          processed_at?: string
          processed_by?: string
          reason?: string | null
          shipment_id?: string | null
          stock_restored_qty?: number
          type?: Database["public"]["Enums"]["return_type"]
        }
        Relationships: [
          {
            foreignKeyName: "returns_exchanges_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_exchanges_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "courier_shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          admin_note: string | null
          comment: string | null
          created_at: string
          id: string
          is_approved: boolean
          order_id: string | null
          product_id: string
          rating: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          order_id?: string | null
          product_id: string
          rating: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          order_id?: string | null
          product_id?: string
          rating?: number
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          delta: number
          id: string
          note: string | null
          product_id: string
          reason: string
          stock_after: number
          stock_before: number
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          note?: string | null
          product_id: string
          reason?: string
          stock_after: number
          stock_before: number
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          note?: string | null
          product_id?: string
          reason?: string
          stock_after?: number
          stock_before?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category: Database["public"]["Enums"]["transaction_category"]
          created_at: string
          created_by: string
          description: string | null
          direction: Database["public"]["Enums"]["transaction_direction"]
          id: string
          reference_id: string | null
          reference_type: Database["public"]["Enums"]["transaction_reference_type"]
          reversed_at: string | null
          reversed_by: string | null
          transaction_date: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          account_id: string
          amount: number
          category?: Database["public"]["Enums"]["transaction_category"]
          created_at?: string
          created_by: string
          description?: string | null
          direction: Database["public"]["Enums"]["transaction_direction"]
          id?: string
          reference_id?: string | null
          reference_type?: Database["public"]["Enums"]["transaction_reference_type"]
          reversed_at?: string | null
          reversed_by?: string | null
          transaction_date?: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          account_id?: string
          amount?: number
          category?: Database["public"]["Enums"]["transaction_category"]
          created_at?: string
          created_by?: string
          description?: string | null
          direction?: Database["public"]["Enums"]["transaction_direction"]
          id?: string
          reference_id?: string | null
          reference_type?: Database["public"]["Enums"]["transaction_reference_type"]
          reversed_at?: string | null
          reversed_by?: string | null
          transaction_date?: string
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "transactions"
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      recalc_product_rating: {
        Args: { _product_id: string }
        Returns: undefined
      }
    }
    Enums: {
      ad_attribution_method:
        | "per_product"
        | "per_category"
        | "all_orders_in_period"
      ad_platform:
        | "meta"
        | "facebook"
        | "instagram"
        | "google"
        | "tiktok"
        | "other"
      ad_status: "active" | "paused" | "ended"
      app_role: "admin" | "moderator" | "customer"
      cash_account_type:
        | "cash"
        | "bkash"
        | "nagad"
        | "rocket"
        | "bank"
        | "pathao_pending"
        | "meta_ads_wallet"
        | "other"
      coupon_type: "percentage" | "fixed"
      courier_provider: "pathao" | "steadfast" | "redx" | "manual"
      damage_source:
        | "return"
        | "warehouse"
        | "shipment_damage"
        | "customer_damage"
      delivery_zone: "inside_dhaka" | "outside_dhaka" | "sub_city" | "other"
      order_finalization_status:
        | "pending"
        | "delivered"
        | "partial_delivered"
        | "returned"
        | "exchanged"
        | "damaged"
        | "settled"
      order_status:
        | "pending"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
      return_type:
        | "full_return"
        | "partial_return"
        | "exchange_return"
        | "exchange_out"
        | "damage_return"
      shipment_status:
        | "booked"
        | "pickup_pending"
        | "in_transit"
        | "delivered"
        | "partial_delivered"
        | "returned"
        | "exchanged"
        | "damaged"
        | "lost"
        | "cancelled"
      transaction_category:
        | "product_sale"
        | "product_purchase"
        | "meta_ads"
        | "google_ads"
        | "tiktok_ads"
        | "courier_delivery_charge"
        | "courier_cod_charge"
        | "courier_return_charge"
        | "packaging"
        | "salary"
        | "rent"
        | "utilities"
        | "return_loss"
        | "damage_loss"
        | "owner_drawing"
        | "owner_investment"
        | "bank_charge"
        | "other"
      transaction_direction: "in" | "out"
      transaction_reference_type:
        | "order"
        | "shipment"
        | "ad_campaign"
        | "purchase_order"
        | "return"
        | "manual"
        | "settlement"
      transaction_type:
        | "income"
        | "expense"
        | "transfer_in"
        | "transfer_out"
        | "cod_collection"
        | "cod_settlement"
        | "ads_spend"
        | "refund"
        | "adjustment"
        | "reversal"
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
    Enums: {
      ad_attribution_method: [
        "per_product",
        "per_category",
        "all_orders_in_period",
      ],
      ad_platform: [
        "meta",
        "facebook",
        "instagram",
        "google",
        "tiktok",
        "other",
      ],
      ad_status: ["active", "paused", "ended"],
      app_role: ["admin", "moderator", "customer"],
      cash_account_type: [
        "cash",
        "bkash",
        "nagad",
        "rocket",
        "bank",
        "pathao_pending",
        "meta_ads_wallet",
        "other",
      ],
      coupon_type: ["percentage", "fixed"],
      courier_provider: ["pathao", "steadfast", "redx", "manual"],
      damage_source: [
        "return",
        "warehouse",
        "shipment_damage",
        "customer_damage",
      ],
      delivery_zone: ["inside_dhaka", "outside_dhaka", "sub_city", "other"],
      order_finalization_status: [
        "pending",
        "delivered",
        "partial_delivered",
        "returned",
        "exchanged",
        "damaged",
        "settled",
      ],
      order_status: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      return_type: [
        "full_return",
        "partial_return",
        "exchange_return",
        "exchange_out",
        "damage_return",
      ],
      shipment_status: [
        "booked",
        "pickup_pending",
        "in_transit",
        "delivered",
        "partial_delivered",
        "returned",
        "exchanged",
        "damaged",
        "lost",
        "cancelled",
      ],
      transaction_category: [
        "product_sale",
        "product_purchase",
        "meta_ads",
        "google_ads",
        "tiktok_ads",
        "courier_delivery_charge",
        "courier_cod_charge",
        "courier_return_charge",
        "packaging",
        "salary",
        "rent",
        "utilities",
        "return_loss",
        "damage_loss",
        "owner_drawing",
        "owner_investment",
        "bank_charge",
        "other",
      ],
      transaction_direction: ["in", "out"],
      transaction_reference_type: [
        "order",
        "shipment",
        "ad_campaign",
        "purchase_order",
        "return",
        "manual",
        "settlement",
      ],
      transaction_type: [
        "income",
        "expense",
        "transfer_in",
        "transfer_out",
        "cod_collection",
        "cod_settlement",
        "ads_spend",
        "refund",
        "adjustment",
        "reversal",
      ],
    },
  },
} as const
