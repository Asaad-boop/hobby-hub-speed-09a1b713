import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User as UserIcon, Eye, EyeOff, Star, Quote, TrendingUp, Heart, Zap } from "lucide-react";
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

          <div className="mt-10 grid gap-4">
            {[
              { icon: Truck, title: "Free delivery", desc: "On orders over ৳1,500" },
              { icon: ShieldCheck, title: "100% Authentic", desc: "Verified quality products" },
              { icon: Sparkles, title: "Cash on Delivery", desc: "Pay only when you receive" },
            ].map((f) => (
              <div key={f.title} className="flex items-center gap-4 rounded-2xl border border-border/60 bg-background/60 p-4 backdrop-blur">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-foreground">{f.title}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
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
