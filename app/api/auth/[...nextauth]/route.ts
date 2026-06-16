import { handlers } from "@/lib/server/nextauth";

// Credentials verification uses bcrypt — keep this on the Node runtime.
export const runtime = "nodejs";

export const { GET, POST } = handlers;
