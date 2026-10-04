import { createClient } from "@/lib/supabase/server";
import { User } from "@supabase/supabase-js";

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Derives authenticated user identity strictly on the server using Supabase's verified token check.
 * Returns null if the user is unauthenticated or the session token is invalid.
 */
export async function getAuthenticatedUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

/**
 * Enforces authenticated identity on the server.
 * Throws UnauthorizedError if no valid authenticated user is found.
 */
export async function requireUser(): Promise<User> {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new UnauthorizedError("You must be signed in to perform this action");
  }
  return user;
}
