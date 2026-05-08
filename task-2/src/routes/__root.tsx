import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { PromotionListener } from "@/components/promotion-listener";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-display font-semibold text-foreground">404</h1>
        <p className="mt-4 text-muted-foreground">This page doesn't exist.</p>
        <Link to="/" className="mt-6 inline-block underline">Back home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-display">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          className="mt-6 rounded-md bg-primary px-4 py-2 text-primary-foreground"
          onClick={() => { router.invalidate(); reset(); }}
        >Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Gather — host community events" },
      { name: "description", content: "A simple way to host events, share a page, manage RSVPs and check in attendees." },
      { property: "og:title", content: "Gather — host community events" },
      { name: "twitter:title", content: "Gather — host community events" },
      { property: "og:description", content: "A simple way to host events, share a page, manage RSVPs and check in attendees." },
      { name: "twitter:description", content: "A simple way to host events, share a page, manage RSVPs and check in attendees." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b2e727fa-3645-459a-a77e-af64d97b2b71/id-preview-ccbd9c88--b2ffc8b2-5eae-4390-a502-6713d9d4c83b.lovable.app-1778102237532.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b2e727fa-3645-459a-a77e-af64d97b2b71/id-preview-ccbd9c88--b2ffc8b2-5eae-4390-a502-6713d9d4c83b.lovable.app-1778102237532.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function Header() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const handleSignOut = async () => {
    close();
    await signOut();
    router.navigate({ to: "/" });
  };
  const linkCls = "px-3 py-2 hover:text-primary transition-colors";
  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" onClick={close} className="font-display text-2xl font-semibold tracking-tight">
          Gather<span className="text-primary">.</span>
        </Link>
        <nav className="hidden md:flex items-center gap-2 text-sm">
          <Link to="/events" className={linkCls}>Browse</Link>
          {user ? (
            <>
              <Link to="/my-events" className={linkCls}>My events</Link>
              <Link to="/tickets" className={linkCls}>Tickets</Link>
              <Link to="/check-in" className={linkCls}>Check-in</Link>
              <Link to="/dashboard" className={linkCls}>Dashboard</Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>Sign out</Button>
            </>
          ) : (
            <>
              <Link to="/become-a-host" className={linkCls}>Become a host</Link>
              <Link to="/auth"><Button size="sm">Sign in</Button></Link>
            </>
          )}
        </nav>
        <button
          aria-label={open ? "Close menu" : "Open menu"}
          className="md:hidden p-2 -mr-2 rounded-md hover:bg-accent"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-border/60 bg-background">
          <nav className="px-4 py-3 flex flex-col text-base">
            <Link to="/events" onClick={close} className="py-3">Browse</Link>
            {user ? (
              <>
                <Link to="/my-events" onClick={close} className="py-3">My events</Link>
                <Link to="/tickets" onClick={close} className="py-3">Tickets</Link>
                <Link to="/check-in" onClick={close} className="py-3">Check-in</Link>
                <Link to="/dashboard" onClick={close} className="py-3">Dashboard</Link>
                <button onClick={handleSignOut} className="py-3 text-left">Sign out</button>
              </>
            ) : (
              <>
                <Link to="/become-a-host" onClick={close} className="py-3">Become a host</Link>
                <Link to="/auth" onClick={close} className="py-3"><Button size="sm" className="w-full">Sign in</Button></Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PromotionListener />
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1"><Outlet /></main>
          <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
            <p>Built with care for community organizers.</p>
          </footer>
        </div>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
