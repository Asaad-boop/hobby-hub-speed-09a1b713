import { Outlet, createRootRouteWithContext, HeadContent, Scripts, useRouterState } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import appCss from "../styles.css?url";
import "@/lib/i18n";
import { captureSessionOnFirstVisit } from "@/lib/session-tracking";
import { usePresenceHeartbeat } from "@/hooks/use-presence";
import { usePageViewTracking } from "@/hooks/use-page-view-tracking";
import { META_PIXEL_ID, fbTrack } from "@/lib/meta-pixel";
import { clarityTag, clarityEvent } from "@/lib/clarity";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import MobileBottomNav from "@/components/MobileBottomNav";
import WhatsAppButton from "@/components/WhatsAppButton";
import NotFound from "@/components/NotFound";
import { CartProvider } from "@/lib/cart";
import { WishlistProvider } from "@/lib/wishlist";
import { installServerFnAuth } from "@/lib/server-fn-auth";

if (typeof window !== "undefined") {
  installServerFnAuth();
}

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
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
    links: [
      { rel: "stylesheet", href: appCss },
      // Preconnect to image CDN + Supabase origin so the LCP image starts
      // downloading in parallel with the HTML/JS — saves ~150-300ms on mobile.
      { rel: "preconnect", href: "https://wsrv.nl", crossOrigin: "" },
      { rel: "dns-prefetch", href: "https://wsrv.nl" },
      { rel: "preconnect", href: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev", crossOrigin: "" },
      { rel: "dns-prefetch", href: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev" },
      // Defer 3rd-party origins until after first paint.
      { rel: "dns-prefetch", href: "https://connect.facebook.net" },
      { rel: "dns-prefetch", href: "https://www.googletagmanager.com" },
      { rel: "dns-prefetch", href: "https://www.clarity.ms" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "HobbyShop",
          url: "https://hobby-hub-speed.lovable.app",
          logo: "https://hobby-hub-speed.lovable.app/favicon.ico",
          description: "Curated gadgets, decor & gifts shipped fast across Bangladesh. Cash on Delivery nationwide.",
          areaServed: "BD",
          sameAs: [],
        }),
      },
      {
        // All 3rd-party trackers (Meta Pixel, GA4, Clarity) are deferred until
        // after `load` + an idle window, so they never block LCP/TBT on mobile.
        // Stubs are installed immediately so app code can safely call fbq/gtag
        // before the real scripts arrive — calls are queued and replayed.
        children: `(function(){
          // ---- stubs (queue early calls) ----
          window.dataLayer=window.dataLayer||[];
          window.gtag=function(){dataLayer.push(arguments);};
          window.fbq=window.fbq||function(){(window.fbq.q=window.fbq.q||[]).push(arguments);};
          window.fbq.loaded=true;window.fbq.version='2.0';window.fbq.queue=window.fbq.queue||[];
          window.gtag('js',new Date());
          window.gtag('config','G-Q17CKC2FG1',{send_page_view:true});
          window.fbq('init','${META_PIXEL_ID}');
          window.fbq('track','PageView');

          // ---- defer real loaders until idle ----
          var loaded=false;
          function load(){
            if(loaded)return;loaded=true;
            // Meta Pixel
            var p=document.createElement('script');p.async=true;
            p.src='https://connect.facebook.net/en_US/fbevents.js';
            document.head.appendChild(p);
            // GA4
            var g=document.createElement('script');g.async=true;
            g.src='https://www.googletagmanager.com/gtag/js?id=G-Q17CKC2FG1';
            document.head.appendChild(g);
            // Clarity
            (function(c,l,a,r,i){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              var t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;
              var y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window,document,'clarity','script','wh5255b06h');
          }
          function schedule(){
            if('requestIdleCallback' in window){requestIdleCallback(load,{timeout:3500});}
            else{setTimeout(load,2500);}
          }
          // Also load on first user interaction (covers very short visits)
          ['pointerdown','keydown','scroll','touchstart'].forEach(function(ev){
            window.addEventListener(ev,load,{once:true,passive:true});
          });
          if(document.readyState==='complete')schedule();
          else window.addEventListener('load',schedule,{once:true});
        })();`,
      },
    ],
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
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = pathname.startsWith("/admin");
  const isLanding = pathname.startsWith("/lp/");

  // Capture marketing attribution on the first page of the visit.
  useEffect(() => {
    captureSessionOnFirstVisit();
  }, []);

  // Heartbeat for live visitors dashboard.
  usePresenceHeartbeat();
  // Log page views for analytics funnel.
  usePageViewTracking();

  // Fire Meta Pixel PageView on SPA route changes. The first PageView is
  // already sent by the base snippet during initial HTML load, so skip the
  // first effect run to avoid a duplicate event.
  const firstPathRef = useRef(true);
  useEffect(() => {
    // Tag the Clarity session with the current route + a coarse page-type
    // bucket. Lets us filter recordings/heatmaps by funnel stage in the
    // Clarity dashboard ("show only checkout sessions", "only LP visitors").
    const pageType = pathname.startsWith("/admin")
      ? "admin"
      : pathname.startsWith("/checkout")
        ? "checkout"
        : pathname.startsWith("/order-success")
          ? "order-success"
          : pathname.startsWith("/product/")
            ? "product"
            : pathname.startsWith("/lp/")
              ? "landing-page"
              : pathname.startsWith("/category/")
                ? "category"
                : pathname === "/"
                  ? "home"
                  : "other";
    clarityTag("page_type", pageType);
    clarityTag("route", pathname);

    if (firstPathRef.current) {
      firstPathRef.current = false;
      return;
    }
    fbTrack("PageView");
    clarityEvent("spa_navigation");
    // GA4 SPA page_view
    if (typeof window !== "undefined" && typeof (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag === "function") {
      (window as unknown as { gtag: (...args: unknown[]) => void }).gtag("event", "page_view", {
        page_path: pathname,
        page_location: window.location.href,
        page_title: document.title,
      });
    }
  }, [pathname]);

  return (
    <QueryClientProvider client={queryClient}>
      <WishlistProvider>
        <CartProvider>
          {isAdmin ? (
            <Outlet />
          ) : isLanding ? (
            <div className="min-h-screen">
              <Outlet />
              <CartDrawer />
            </div>
          ) : (
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
          )}
        </CartProvider>
      </WishlistProvider>
    </QueryClientProvider>
  );
}
