import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";

/** Verifies the request comes from an authenticated ADMIN user.
 *  Returns { session } on success, or { error: NextResponse } on failure.
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      error: NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 }),
      session: null,
    };
  }

  if (session.user.role !== "ADMIN") {
    return {
      error: NextResponse.json({ error: "Brak uprawnień administratora" }, { status: 403 }),
      session: null,
    };
  }

  return { error: null, session };
}
