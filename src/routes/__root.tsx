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
    links: [{ rel: "stylesheet", href: appCss }],
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
        // Meta (Facebook) Pixel base code — initializes fbq and fires the
        // initial PageView. Subsequent SPA navigations fire PageView from
        // the router subscription in RootComponent (see below).
        children: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`,
      },
      {
        // Google Analytics 4 (GA4) — gtag.js loader.
        src: "https://www.googletagmanager.com/gtag/js?id=G-Q17CKC2FG1",
        async: true,
      },
      {
        // GA4 init + initial page_view.
        children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','G-Q17CKC2FG1',{send_page_view:true});`,
      },
      {
        // Microsoft Clarity — session recordings & heatmaps. Tiny defer so
        // it never blocks LCP, but small enough that short visits are still
        // captured. Clarity itself is async after this point.
        children: `setTimeout(function(){(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","wh5255b06h");},200);`,
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
