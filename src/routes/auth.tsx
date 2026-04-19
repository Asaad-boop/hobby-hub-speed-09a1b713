import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User as UserIcon, Eye, EyeOff, Star, MapPin, Truck, Package } from "lucide-react";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In or Create Account — HobbyShop" },
      { name: "description", content: "Sign in to your HobbyShop account or create a new one to track orders and save favorites." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/account" });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Welcome back!");
      navigate({ to: "/account" });
    } else {
      if (password.length < 6) {
        setLoading(false);
        return toast.error("Password must be at least 6 characters");
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/account`,
          data: { display_name: name },
        },
      });
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Account created! Check your email to confirm.");
      navigate({ to: "/account" });
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-br from-background via-background to-muted/40">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,oklch(0.585_0.245_27.5/0.08)_1px,transparent_0)] [background-size:24px_24px]" />
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-12 px-4 py-10 lg:grid-cols-2 lg:py-16">
        {/* Left brand panel */}
        <div className="hidden flex-col justify-center lg:flex">
          <Link to="/" className="mb-8 inline-flex w-fit items-center gap-3">
            <img src={logo} alt="HobbyShop" className="h-14 w-auto" />
          </Link>
          <h1 className="text-4xl font-bold leading-tight text-foreground xl:text-5xl">
            Touch your <span className="text-primary">dream</span>.
            <br />
            Shop the trend.
          </h1>
          <p className="mt-4 max-w-md text-base text-muted-foreground">
            Join thousands of happy customers shopping curated gadgets, decor, and unique gifts — delivered across Bangladesh.
          </p>

          {/* Bangladesh delivery map showcase */}
          <div className="relative mt-10 overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-background/80 via-primary/5 to-background p-6 backdrop-blur">
            <div className="pointer-events-none absolute -top-20 left-1/2 h-60 w-60 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />

            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Truck className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-bold text-foreground">Delivering nationwide</p>
                  <p className="text-[11px] text-muted-foreground">64 districts • 7 days a week</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                LIVE
              </span>
            </div>

            <div className="relative mx-auto aspect-[4/5] w-full max-w-[280px]">
              <svg viewBox="0 0 400 500" className="h-full w-full" aria-label="Bangladesh map">
                <defs>
                  <linearGradient id="bdFill" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="oklch(0.585 0.245 27.5)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="oklch(0.585 0.245 27.5)" stopOpacity="0.08" />
                  </linearGradient>
                </defs>
                <path
                  d="M155 30 L185 25 L215 35 L240 30 L260 50 L285 55 L295 80 L285 105 L300 125 L320 130 L340 155 L335 185 L355 210 L345 245 L360 275 L340 300 L355 330 L335 355 L345 385 L320 405 L325 435 L300 455 L275 445 L255 465 L230 470 L210 455 L185 465 L165 450 L145 460 L130 440 L140 415 L120 395 L130 370 L110 350 L120 320 L100 295 L115 270 L95 245 L110 215 L95 185 L115 160 L100 135 L120 115 L110 90 L130 65 L140 45 Z"
                  fill="url(#bdFill)"
                  stroke="oklch(0.585 0.245 27.5)"
                  strokeWidth="2"
                  strokeOpacity="0.5"
                />
                <g stroke="oklch(0.585 0.245 27.5)" strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.4" fill="none">
                  <line x1="225" y1="240" x2="125" y2="180">
                    <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1.5s" repeatCount="indefinite" />
                  </line>
                  <line x1="225" y1="240" x2="310" y2="370">
                    <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1.8s" repeatCount="indefinite" />
                  </line>
                  <line x1="225" y1="240" x2="180" y2="430">
                    <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="2s" repeatCount="indefinite" />
                  </line>
                  <line x1="225" y1="240" x2="290" y2="120">
                    <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1.6s" repeatCount="indefinite" />
                  </line>
                </g>
                {[
                  { x: 225, y: 240, name: "Dhaka", main: true },
                  { x: 125, y: 180, name: "Rajshahi" },
                  { x: 310, y: 370, name: "Chattogram" },
                  { x: 180, y: 430, name: "Khulna" },
                  { x: 290, y: 120, name: "Sylhet" },
                ].map((c) => (
                  <g key={c.name}>
                    {c.main && (
                      <circle cx={c.x} cy={c.y} r="14" fill="oklch(0.585 0.245 27.5)" opacity="0.2">
                        <animate attributeName="r" from="8" to="22" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}
                    <circle cx={c.x} cy={c.y} r={c.main ? 6 : 4} fill="oklch(0.585 0.245 27.5)" />
                    <circle cx={c.x} cy={c.y} r={c.main ? 2.5 : 1.5} fill="white" />
                    <text x={c.x + 12} y={c.y + 4} className="fill-foreground" fontSize="13" fontWeight={c.main ? "700" : "500"}>
                      {c.name}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { icon: MapPin, value: "64", label: "Districts" },
                { icon: Package, value: "10K+", label: "Delivered" },
                { icon: Star, value: "4.9", label: "Rated" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-border/40 bg-background/60 p-2.5 text-center">
                  <s.icon className="mx-auto mb-1 h-3.5 w-3.5 text-primary" />
                  <p className="text-sm font-extrabold text-foreground">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right form panel */}
        <div className="mx-auto w-full max-w-md">
          {/* Mobile logo */}
          <Link to="/" className="mb-6 flex items-center justify-center lg:hidden">
            <img src={logo} alt="HobbyShop" className="h-12 w-auto" />
          </Link>

          <div className="rounded-3xl border border-border/60 bg-background/80 p-6 shadow-[0_24px_60px_-24px_oklch(0.585_0.245_27.5/0.25)] backdrop-blur-xl sm:p-8">
            {/* Mode toggle — pill style, equal width */}
            <div className="relative mb-7 grid grid-cols-2 rounded-full bg-muted p-1">
              <span
                aria-hidden
                className={`absolute inset-y-1 w-[calc(50%-4px)] rounded-full bg-background shadow-[0_4px_14px_-4px_oklch(0.585_0.245_27.5/0.4)] ring-1 ring-border/50 transition-transform duration-300 ease-out ${
                  mode === "signup" ? "translate-x-[calc(100%+4px)]" : "translate-x-1"
                }`}
              />
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`relative z-10 rounded-full py-2.5 text-sm font-semibold transition-colors ${
                  mode === "signin" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`relative z-10 rounded-full py-2.5 text-sm font-semibold transition-colors ${
                  mode === "signup" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign Up
              </button>
            </div>

            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-foreground">
                {mode === "signin" ? "Welcome back 👋" : "Create your account ✨"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === "signin" ? "Sign in to continue shopping" : "Join HobbyShop in seconds"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full name</Label>
                  <div className="relative">
                    <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      required
                      maxLength={80}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="h-12 rounded-xl pl-10"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-12 rounded-xl pl-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!email) return toast.error("Enter your email first");
                        const { error } = await supabase.auth.resetPasswordForEmail(email, {
                          redirectTo: `${window.location.origin}/reset-password`,
                        });
                        if (error) return toast.error(error.message);
                        toast.success("Reset link sent! Check your email.");
                      }}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 rounded-xl px-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {mode === "signup" && <p className="text-xs text-muted-foreground">At least 6 characters</p>}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl text-sm font-bold shadow-[0_10px_30px_-10px_oklch(0.585_0.245_27.5/0.6)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Sign In" : "Create Account"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "signin" ? "New to HobbyShop?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="font-semibold text-primary hover:underline"
              >
                {mode === "signin" ? "Create an account" : "Sign in"}
              </button>
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-primary">← Back to shop</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
