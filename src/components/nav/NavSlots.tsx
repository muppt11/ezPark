import { getCurrentUser } from "@/lib/current-user";
import { BottomNav } from "./BottomNav";
import { DesktopNav } from "./DesktopNav";
import type { NavUser } from "./types";

// These read the session, so the layout renders them inside <Suspense>.

async function navUser(): Promise<NavUser> {
  const user = await getCurrentUser();
  return user ? { firstName: user.name.split(" ")[0] } : null;
}

export async function DesktopNavSlot() {
  return <DesktopNav user={await navUser()} />;
}

export async function BottomNavSlot() {
  return <BottomNav user={await navUser()} />;
}
