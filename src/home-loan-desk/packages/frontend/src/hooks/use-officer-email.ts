import { useAuth } from '@/hooks/auth.context';

/**
 * The signed-in officer's email. The entity access rules compare records to
 * this same `email` claim, so every record the app creates is stamped with it.
 * Returns `null` when the session carries no email.
 */
export function useOfficerEmail(): string | null {
  const { session } = useAuth();
  const email = session?.user?.email;
  return typeof email === 'string' && email.length > 0 ? email : null;
}
