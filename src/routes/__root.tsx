import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { AppShell } from "~/components/app-shell";
import { SageSessionProvider } from "~/lib/session-store";
import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Sage: Know the gap. Close it." },
      {
        name: "description",
        content:
          "Sage reasons about the real distance between your experience and a target role, then shows the recurring skills you're missing and a direction to build.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <SageSessionProvider>
        <AppShell>
          <Outlet />
        </AppShell>
      </SageSessionProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
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
