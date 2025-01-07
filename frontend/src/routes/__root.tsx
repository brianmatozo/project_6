import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  Link,
  Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ModeToggle } from "@/components/mode-toggle";

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
        <Card className="w-[85%] mx-auto">
          <CardHeader>
            <CardTitle>
              Card Title <ModeToggle />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Outlet />
          </CardContent>
          <CardFooter>
            <p>Card Footer</p>
          </CardFooter>
        </Card>
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
