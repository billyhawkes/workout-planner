import { Layer } from "effect";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AppApi } from "@/api";
import { mcpLayer } from "@/lib/mcp-handler";
import { workoutsHandler } from "@/services/workouts/api.builder";
import { WorkoutsLive } from "@/services/workouts";
import { DB } from "@/services/database";

const workoutsLayer = WorkoutsLive.pipe(Layer.provide(DB.layer));

const apiLayer = HttpApiBuilder.layer(AppApi, {
  openapiPath: "/api/openapi.json",
}).pipe(Layer.provide(workoutsHandler), Layer.provideMerge(workoutsLayer));

const routes = Layer.mergeAll(apiLayer, mcpLayer).pipe(
  Layer.provide(HttpServer.layerServices),
);

export const { handler: apiHandler } = HttpRouter.toWebHandler(routes, {
  disableLogger: true,
});
