import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { HomePage } from "./routes/index";
import { EditPage } from "./routes/edit";
import { HostPage } from "./routes/host";
import { DisplayPage } from "./routes/display";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const editRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/quiz/$quizId/edit",
  component: EditPage,
});

const hostRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/quiz/$quizId/host",
  component: HostPage,
});

const displayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/quiz/$quizId/display",
  component: DisplayPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  editRoute,
  hostRoute,
  displayRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
