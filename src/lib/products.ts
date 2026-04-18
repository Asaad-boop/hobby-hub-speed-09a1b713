import lamp from "@/assets/p-lamp.jpg";
import lamp2 from "@/assets/p-lamp-2.jpg";
import lamp3 from "@/assets/p-lamp-3.jpg";
import lamp4 from "@/assets/p-lamp-4.jpg";
import charger from "@/assets/p-charger.jpg";
import charger2 from "@/assets/p-charger-2.jpg";
import charger3 from "@/assets/p-charger-3.jpg";
import charger4 from "@/assets/p-charger-4.jpg";
import speaker from "@/assets/p-speaker.jpg";
import speaker2 from "@/assets/p-speaker-2.jpg";
import speaker3 from "@/assets/p-speaker-3.jpg";
import speaker4 from "@/assets/p-speaker-4.jpg";
import diy from "@/assets/p-diy.jpg";
import diy2 from "@/assets/p-diy-2.jpg";
import diy3 from "@/assets/p-diy-3.jpg";
import diy4 from "@/assets/p-diy-4.jpg";
import diffuser from "@/assets/p-diffuser.jpg";
import diffuser2 from "@/assets/p-diffuser-2.jpg";
import diffuser3 from "@/assets/p-diffuser-3.jpg";
import diffuser4 from "@/assets/p-diffuser-4.jpg";
import smartwatch from "@/assets/p-smartwatch.jpg";
import smartwatch2 from "@/assets/p-smartwatch-2.jpg";
import smartwatch3 from "@/assets/p-smartwatch-3.jpg";
import smartwatch4 from "@/assets/p-smartwatch-4.jpg";
import projector from "@/assets/p-projector.jpg";
import projector2 from "@/assets/p-projector-2.jpg";
import projector3 from "@/assets/p-projector-3.jpg";
import projector4 from "@/assets/p-projector-4.jpg";
import planter from "@/assets/p-planter.jpg";
import planter2 from "@/assets/p-planter-2.jpg";
import planter3 from "@/assets/p-planter-3.jpg";
import planter4 from "@/assets/p-planter-4.jpg";

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
  benefits: string[];
  description: string;
};

export const products: Product[] = [
  {
    id: "crystal-lamp",
    title: "Sunset Crystal LED Lamp",
    price: 1290,
    oldPrice: 1990,
    image: lamp,
    gallery: [lamp, lamp2, lamp3, lamp4],
    rating: 4.8,
    reviews: 1240,
    stock: 7,
    category: "Home Decor",
    benefits: ["Warm ambient light", "USB-C rechargeable", "Touch control", "8h battery"],
    description:
      "A premium crystal LED lamp that turns any room into a cozy retreat. Perfect for bedrooms, desks and gifting.",
  },
  {
    id: "magsafe-charger",
    title: "Magnetic Wireless Charger 15W",
    price: 890,
    oldPrice: 1490,
    image: charger,
    gallery: [charger, charger2, charger3, charger4],
    rating: 4.7,
    reviews: 832,
    stock: 12,
    category: "Gadgets",
    benefits: ["15W fast charge", "MagSafe compatible", "Anti-slip base", "Cable included"],
    description: "Snap-on magnetic charging for the cleanest desk setup. Works with most modern phones.",
  },
  {
    id: "mini-speaker",
    title: "Boom Mini Bluetooth Speaker",
    price: 1490,
    oldPrice: 2290,
    image: speaker,
    gallery: [speaker, speaker2, speaker3, speaker4],
    rating: 4.6,
    reviews: 510,
    stock: 9,
    category: "Gadgets",
    benefits: ["360° sound", "12h playtime", "IPX5 waterproof", "Built-in mic"],
    description: "Pocket-sized speaker with surprisingly big sound. Bring it anywhere.",
  },
  {
    id: "diy-kit",
    title: "Wooden Mechanical DIY Kit",
    price: 1990,
    oldPrice: 2990,
    image: diy,
    gallery: [diy, diy2, diy3, diy4],
    rating: 4.9,
    reviews: 312,
    stock: 5,
    category: "DIY Kits",
    benefits: ["No glue required", "Step-by-step manual", "200+ pieces", "Great gift"],
    description: "Build a working mechanical model with your own hands. Hours of focused fun.",
  },
];

export const newArrivals: Product[] = [
  {
    id: "aroma-diffuser",
    title: "Smart Aroma Diffuser with Light",
    price: 1190,
    oldPrice: 1790,
    image: diffuser,
    gallery: [diffuser, diffuser2, diffuser3, diffuser4],
    rating: 4.7,
    reviews: 86,
    stock: 15,
    category: "Home Decor",
    benefits: ["7 LED colors", "Ultrasonic mist", "Auto shut-off", "300ml tank"],
    description: "Fill your space with calming aromas and soft ambient light. Perfect for bedroom & living room.",
  },
  {
    id: "smart-watch",
    title: "Pro Vivid Smart Watch",
    price: 2490,
    oldPrice: 3490,
    image: smartwatch,
    gallery: [smartwatch, smartwatch2, smartwatch3, smartwatch4],
    rating: 4.8,
    reviews: 142,
    stock: 10,
    category: "Gadgets",
    benefits: ["AMOLED display", "Heart rate & SpO2", "7-day battery", "IP68 waterproof"],
    description: "A vibrant smartwatch that tracks your fitness, sleep and notifications — all day, every day.",
  },
  {
    id: "mini-projector",
    title: "Portable Cinema Mini Projector",
    price: 4990,
    oldPrice: 6990,
    image: projector,
    gallery: [projector, projector2, projector3, projector4],
    rating: 4.6,
    reviews: 58,
    stock: 6,
    category: "Gadgets",
    benefits: ["1080p support", "HDMI & USB", "Built-in speaker", "Compact & portable"],
    description: "Turn any wall into a cinema. Perfect for movie nights, gaming and presentations.",
  },
  {
    id: "ceramic-planter",
    title: "Minimalist Ceramic Planter",
    price: 590,
    oldPrice: 890,
    image: planter,
    gallery: [planter, planter2, planter3, planter4],
    rating: 4.9,
    reviews: 204,
    stock: 22,
    category: "Home Decor",
    benefits: ["Handcrafted ceramic", "Drainage hole", "Indoor & outdoor", "Plant included"],
    description: "Add a touch of green to any corner. Comes with a small live succulent.",
  },
];

const allProducts = [...products, ...newArrivals];

export const getProduct = (id: string) => allProducts.find((p) => p.id === id);

export type Testimonial = {
  productId: string;
  name: string;
  location: string;
  rating: number;
  text: string;
};

export const testimonials: Testimonial[] = [
  { productId: "crystal-lamp", name: "Sumaiya Akter", location: "Chattogram", rating: 5, text: "Crystal lamp ta amar room er look totally change kore diyeche. Light ta khub soft and romantic. Packaging o neat cilo." },
  { productId: "crystal-lamp", name: "Nusrat Jahan", location: "Dhaka", rating: 5, text: "Gift hisebe diyechilam, recipient onek khushi hoyeche. Battery backup o impressive. Highly recommended!" },
  { productId: "magsafe-charger", name: "Tanvir Ahmed", location: "Sylhet", rating: 5, text: "iPhone 14 te perfect fit. Charging speed bhalo, magnet ta strong. Daam onujayi quality top notch." },
  { productId: "magsafe-charger", name: "Rifat Hossain", location: "Khulna", rating: 4, text: "Cable included thakay extra kichu kinte hoyni. Anti-slip base ta really useful. Overall satisfied." },
  { productId: "bt-speaker", name: "Mahmuda Rahman", location: "Rajshahi", rating: 5, text: "Sound quality outstanding! Bass ta clear, party te use korlam, sobai impressed. Battery o long lasting." },
  { productId: "diy-kit", name: "Sakib Khan", location: "Dhaka", rating: 5, text: "Bachchara onek enjoy korche. Educational and fun dujoi. Quality of materials premium." },
  { productId: "aroma-diffuser", name: "Farhana Islam", location: "Cumilla", rating: 5, text: "Ghorer environment ta totally peaceful hoye geche. LED light ta bonus. Worth every taka." },
  { productId: "smartwatch", name: "Imran Hossain", location: "Barishal", rating: 5, text: "Fitness tracking accurate, battery 5 din easily jay. Display sharp. Best smartwatch in this price range." },
  { productId: "mini-projector", name: "Tasnim Akhter", location: "Mymensingh", rating: 4, text: "Movie night er jonno perfect. Setup easy, picture quality dark room e khub bhalo. Recommended!" },
  { productId: "ceramic-planter", name: "Rakibul Hasan", location: "Dhaka", rating: 5, text: "Plant include thakay extra koste hoyni. Ceramic quality premium, design minimalist and elegant." },
];
