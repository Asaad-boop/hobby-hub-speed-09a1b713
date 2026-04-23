// DB-backed products data layer.
// Products are now stored in Supabase (`products` + `categories` tables).
// Use the React Query hooks below — there are no hardcoded products anymore.
import { useQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Product = {
  id: string;
  title: string;
  price: number;
  oldPrice: number;
  image: string;
  gallery: string[];
  rating: number;
  reviews: number;
  stock: number;
  category: string;
  categorySlug?: string;
  benefits: string[];
  description: string;
  isNewArrival?: boolean;
  isFeatured?: boolean;
};

type ProductRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number | string;
  old_price: number | string | null;
  image: string;
  gallery: unknown;
  benefits: unknown;
  rating: number | string;
  reviews: number;
  stock: number;
  is_new_arrival: boolean;
  is_featured: boolean;
  is_active: boolean;
  display_order: number;
  category_id: string | null;
  categories?: { name: string; slug: string } | null;
};

const FALLBACK_IMAGE =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='20' fill='%2394a3b8' text-anchor='middle' dominant-baseline='middle'%3ENo image%3C/text%3E%3C/svg%3E";

const toProduct = (r: ProductRow): Product => {
  const gallery = Array.isArray(r.gallery)
    ? (r.gallery as unknown[]).filter((g): g is string => typeof g === "string")
    : [];
  const benefits = Array.isArray(r.benefits)
    ? (r.benefits as unknown[]).filter((b): b is string => typeof b === "string")
    : [];
  const image = r.image && r.image.trim() ? r.image : FALLBACK_IMAGE;
  return {
    id: r.id, // canonical: use UUID
    title: r.title,
    price: Number(r.price) || 0,
    oldPrice: r.old_price != null ? Number(r.old_price) : Number(r.price) || 0,
    image,
    gallery: gallery.length ? gallery : [image],
    rating: Number(r.rating) || 0,
    reviews: r.reviews ?? 0,
    stock: r.stock ?? 0,
    category: r.categories?.name ?? "Other",
    categorySlug: r.categories?.slug,
    benefits,
    description: r.description ?? "",
    isNewArrival: r.is_new_arrival,
    isFeatured: r.is_featured,
  };
};

const SELECT_COLS =
  "id,slug,title,description,price,old_price,image,gallery,benefits,rating,reviews,stock,is_new_arrival,is_featured,is_active,display_order,category_id,categories(name,slug)";

async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(SELECT_COLS)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as ProductRow[]).map(toProduct);
}

export const productsQueryOptions = () =>
  queryOptions({
    queryKey: ["products", "all"],
    queryFn: fetchProducts,
    // Treat list as fresh for 5 min — avoids re-fetch waterfalls on nav.
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

export function useProducts() {
  return useQuery({
    ...productsQueryOptions(),
    // Render instantly with empty list while real data streams in.
    placeholderData: [] as Product[],
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["products", "one", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("products")
        .select(SELECT_COLS)
        .eq("is_active", true)
        .or(`id.eq.${id},slug.eq.${id}`)
        .maybeSingle();
      if (error) throw error;
      return data ? toProduct(data as unknown as ProductRow) : null;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

// Server-friendly fetch (used in route loaders / sitemap)
export async function fetchAllProducts(): Promise<Product[]> {
  return fetchProducts();
}

export async function fetchProductByIdOrSlug(idOrSlug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select(SELECT_COLS)
    .eq("is_active", true)
    .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
    .maybeSingle();
  if (error) throw error;
  return data ? toProduct(data as unknown as ProductRow) : null;
}

// Hardcoded testimonials — match products by slug fragments (best effort).
// We resolve testimonials at render time using the loaded product list.
export type Testimonial = {
  productSlug: string;
  name: string;
  location: string;
  rating: number;
  text: string;
};

export const testimonials: Testimonial[] = [
  { productSlug: "crystal-lamp", name: "Sumaiya Akter", location: "Chattogram", rating: 5, text: "Crystal lamp ta amar room er look totally change kore diyeche. Light ta khub soft and romantic. Packaging o neat cilo." },
  { productSlug: "crystal-lamp", name: "Nusrat Jahan", location: "Dhaka", rating: 5, text: "Gift hisebe diyechilam, recipient onek khushi hoyeche. Battery backup o impressive. Highly recommended!" },
  { productSlug: "magsafe-charger", name: "Tanvir Ahmed", location: "Sylhet", rating: 5, text: "iPhone 14 te perfect fit. Charging speed bhalo, magnet ta strong. Daam onujayi quality top notch." },
  { productSlug: "magsafe-charger", name: "Rifat Hossain", location: "Khulna", rating: 4, text: "Cable included thakay extra kichu kinte hoyni. Anti-slip base ta really useful. Overall satisfied." },
  { productSlug: "mini-speaker", name: "Mahmuda Rahman", location: "Rajshahi", rating: 5, text: "Sound quality outstanding! Bass ta clear, party te use korlam, sobai impressed. Battery o long lasting." },
  { productSlug: "diy-kit", name: "Sakib Khan", location: "Dhaka", rating: 5, text: "Bachchara onek enjoy korche. Educational and fun dujoi. Quality of materials premium." },
  { productSlug: "aroma-diffuser", name: "Farhana Islam", location: "Cumilla", rating: 5, text: "Ghorer environment ta totally peaceful hoye geche. LED light ta bonus. Worth every taka." },
  { productSlug: "smart-watch", name: "Imran Hossain", location: "Barishal", rating: 5, text: "Fitness tracking accurate, battery 5 din easily jay. Display sharp. Best smartwatch in this price range." },
  { productSlug: "mini-projector", name: "Tasnim Akhter", location: "Mymensingh", rating: 4, text: "Movie night er jonno perfect. Setup easy, picture quality dark room e khub bhalo. Recommended!" },
  { productSlug: "ceramic-planter", name: "Rakibul Hasan", location: "Dhaka", rating: 5, text: "Plant include thakay extra koste hoyni. Ceramic quality premium, design minimalist and elegant." },
];

// Resolve a testimonial's product by slug from the loaded product list.
export function findTestimonialProduct(t: Testimonial, all: Product[]) {
  return all.find((p) => p.id === t.productSlug || p.title.toLowerCase().includes(t.productSlug.replace(/-/g, " ")));
}
