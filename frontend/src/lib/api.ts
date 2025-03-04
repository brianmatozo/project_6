import type { App } from "@server/index";
import { treaty } from "@elysiajs/eden";

const client = treaty<App>("localhost:3000");

export const api = client.api;
