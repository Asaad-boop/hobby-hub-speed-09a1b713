import { Link } from "@tanstack/react-router";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-muted/40">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-10 md:flex-row md:items-center">
        <div>
          <div className="text-lg font-extrabold">
            <span>Hobby</span>
            <span className="text-primary">Shop</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Unique gadgets & gifts at unbeatable prices.</p>
        </div>
        <nav className="flex gap-6 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">About</Link>
          <Link to="/" className="hover:text-foreground">Contact</Link>
          <Link to="/" className="hover:text-foreground">Privacy</Link>
        </nav>
        <div className="flex gap-3 text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground">Facebook</a>
          <a href="#" className="hover:text-foreground">Instagram</a>
          <a href="#" className="hover:text-foreground">YouTube</a>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} HobbyShop. All rights reserved.
      </div>
    </footer>
  );
}
