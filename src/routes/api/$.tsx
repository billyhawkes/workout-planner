import { createFileRoute } from "@tanstack/react-router";
import { Context } from "effect";

import { apiHandler } from "@/lib/api-handler";

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: ({ request }) => apiHandler(request, Context.empty()),
      POST: ({ request }) => apiHandler(request, Context.empty()),
      PUT: ({ request }) => apiHandler(request, Context.empty()),
      PATCH: ({ request }) => apiHandler(request, Context.empty()),
      DELETE: ({ request }) => apiHandler(request, Context.empty()),
      OPTIONS: ({ request }) => apiHandler(request, Context.empty()),
    },
  },
});
