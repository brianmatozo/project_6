import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: RootComponent,
  notFoundComponent: notFoundComponent,
});

function RootComponent() {
  return (
    <>
      <ThemeProvider storageKey="vite-ui-theme" defaultTheme="dark">
        <SidebarProvider>
          <AppSidebar />
          <SidebarTrigger />
          <main className="mx-auto w-full p-5">
            <Outlet />
          </main>
        </SidebarProvider>
        <TanStackRouterDevtools />
      </ThemeProvider>
    </>
  );
}

function notFoundComponent() {
  return (
    <div className="p-2">
      <h3>Not Found</h3>
    </div>
  );
}
