"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

export async function enableHosting() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/host");
  await db.user.update({ where: { id: user.id }, data: { isHost: true, lastRole: "HOST" } });
  revalidatePath("/host");
}
