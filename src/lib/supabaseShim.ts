type SessionResponse = { data: { session: null }; error: Error | null };

type SupabaseClient = {
  auth: {
    getSession: () => Promise<SessionResponse>;
  };
};

export function createClient(url: string, anonKey: string): SupabaseClient {
  return {
    auth: {
      async getSession() {
        try {
          const response = await fetch(`${url}/auth/v1/user`, {
            method: "GET",
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${anonKey}`,
            },
          });

          if (response.ok || response.status === 401) {
            return { data: { session: null }, error: null };
          }

          return {
            data: { session: null },
            error: new Error(`Supabase auth endpoint returned ${response.status}`),
          };
        } catch (error) {
          return {
            data: { session: null },
            error: error instanceof Error ? error : new Error("Unable to reach Supabase auth endpoint"),
          };
        }
      },
    },
  };
}
