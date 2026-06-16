import { redirect } from "next/navigation";
import { auth } from "@/lib/server/nextauth";
import { Dashboard } from "@/components/Dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Page() {
  // Middleware already gates this, but guard server-side too (defense in depth).
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <Dashboard />;
}
