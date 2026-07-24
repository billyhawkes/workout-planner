import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { Dumbbell } from "lucide-react";

import { AppBrand } from "@/components/ui/app-brand";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { SidebarLayout, type NavGroup } from "@/components/ui/sidebar-layout";
import { TooltipProvider } from "@/components/ui/tooltip";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Training Ledger" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const groups: NavGroup[] = [
    {
      items: [
        {
          label: () => m.workouts(),
          href: "/workouts",
          icon: Dumbbell,
        },
      ],
    },
  ];

  return (
    <html lang={getLocale()}>
      <head>
        <HeadContent />
      </head>
      <body>
        <TooltipProvider>
          <SidebarLayout
            groups={groups}
            sidebarHeader={
              <AppBrand
                label={m.app_title()}
                subtitle={m.workouts()}
                icon={Dumbbell}
                variant="sidebar"
                to="/workouts"
              />
            }
            headerActions={<LocaleSwitcher />}
          >
            {children}
          </SidebarLayout>
        </TooltipProvider>
        <Scripts />
      </body>
    </html>
  );
}
