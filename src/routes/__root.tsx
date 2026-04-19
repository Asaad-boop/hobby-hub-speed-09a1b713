import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import MobileBottomNav from "@/components/MobileBottomNav";
import WhatsAppButton from "@/components/WhatsAppButton";
import NotFound from "@/components/NotFound";
import { CartProvider } from "@/lib/cart";
import { WishlistProvider } from "@/lib/wishlist";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "HobbyShop — Unique Gadgets & Gifts at Unbeatable Prices" },
      { name: "description", content: "Shop trending gadgets, DIY kits, home decor and gifts. Cash on delivery, fast shipping across Bangladesh." },
      { name: "author", content: "HobbyShop" },
      { property: "og:title", content: "HobbyShop — Unique Gadgets & Gifts at Unbeatable Prices" },
      { property: "og:description", content: "Shop trending gadgets, DIY kits, home decor and gifts. Cash on delivery, fast shipping across Bangladesh." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "HobbyShop — Unique Gadgets & Gifts at Unbeatable Prices" },
      { name: "twitter:description", content: "Shop trending gadgets, DIY kits, home decor and gifts. Cash on delivery, fast shipping across Bangladesh." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/0e703ae1-ccad-42b5-8441-24b5fd4f0c49/id-preview-c3c60a59--2c26f5f9-694d-40ad-b719-1afc69bb0a15.lovable.app-1776579424457.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/0e703ae1-ccad-42b5-8441-24b5fd4f0c49/id-preview-c3c60a59--2c26f5f9-694d-40ad-b719-1afc69bb0a15.lovable.app-1776579424457.png" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <WishlistProvider>
      <CartProvider>
        <div className="flex min-h-screen flex-col pb-16 lg:pb-0">
          <Header />
          <main className="flex-1">
            <Outlet />
          </main>
          <Footer />
          <CartDrawer />
          <WhatsAppButton />
          <MobileBottomNav />
        </div>
      </CartProvider>
    </WishlistProvider>
  );
}
