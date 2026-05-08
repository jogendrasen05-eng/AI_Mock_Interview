import { Outlet, Link, createRootRoute, HeadContent, Scripts, useRouterState } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider, useAuth } from "@/components/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { Sparkles } from "lucide-react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center nebula-bg px-4">
      <div className="max-w-md text-center glass rounded-3xl p-10">
        <h1 className="text-7xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">This page slipped into another nebula.</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "InterviewSarthi — Your Personal AI Interview Coach" },
      { name: "description", content: "Practice technical and behavioral interviews with a voice-driven AI coach. Get instant scoring, feedback, and improvement insights." },
      { property: "og:title", content: "InterviewSarthi — Your Personal AI Interview Coach" },
      { property: "og:description", content: "Practice technical and behavioral interviews with a voice-driven AI coach. Get instant scoring, feedback, and improvement insights." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "InterviewSarthi — Your Personal AI Interview Coach" },
      { name: "twitter:description", content: "Practice technical and behavioral interviews with a voice-driven AI coach. Get instant scoring, feedback, and improvement insights." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/6ebcf7b0-37fa-4050-a518-7a0f293383c2/id-preview-99cafa8f--15d46b8c-4165-42dc-b186-e852335dd997.lovable.app-1777773650680.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/6ebcf7b0-37fa-4050-a518-7a0f293383c2/id-preview-99cafa8f--15d46b8c-4165-42dc-b186-e852335dd997.lovable.app-1777773650680.png" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen nebula-bg">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function TopNav() {
  const { user, signOut } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });
  if (path.startsWith("/app")) return null;
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/40 border-b border-border/50">
      <div className="container mx-auto flex items-center justify-between h-16 px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </span>
          <span className="text-gradient text-lg">InterviewSarthi</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <Link to="/app" className="px-4 py-2 rounded-lg hover:bg-muted/50">Dashboard</Link>
              <button onClick={signOut} className="px-4 py-2 rounded-lg hover:bg-muted/50">Sign out</button>
            </>
          ) : (
            <>
              <Link to="/auth" className="px-4 py-2 rounded-lg hover:bg-muted/50">Sign in</Link>
              <Link to="/auth" className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90">
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <TopNav />
      <Outlet />
      <Toaster />
    </AuthProvider>
  );
}
