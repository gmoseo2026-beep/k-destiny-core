import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Custom mock implementation for local development without Supabase credentials
const mockSupabase = {
  auth: {
    getSession: async () => {
      if (typeof window !== "undefined") {
        const mockUserStr = localStorage.getItem("mock_supabase_user");
        if (mockUserStr) {
          try {
            const user = JSON.parse(mockUserStr);
            const session = {
              access_token: "mock-access-token",
              token_type: "bearer",
              expires_in: 86400,
              refresh_token: "mock-refresh-token",
              user
            };
            return { data: { session }, error: null };
          } catch (e) {
            return { data: { session: null }, error: null };
          }
        }
      }
      return { data: { session: null }, error: null };
    },
    getUser: async () => {
      if (typeof window !== "undefined") {
        const mockUserStr = localStorage.getItem("mock_supabase_user");
        if (mockUserStr) {
          try {
            const user = JSON.parse(mockUserStr);
            return { data: { user }, error: null };
          } catch (e) {
            return { data: { user: null }, error: null };
          }
        }
      }
      return { data: { user: null }, error: null };
    },
    onAuthStateChange: (callback: any) => {
      const handleStorageChange = () => {
        const mockUserStr = localStorage.getItem("mock_supabase_user");
        if (mockUserStr) {
          try {
            const user = JSON.parse(mockUserStr);
            const session = {
              access_token: "mock-access-token",
              token_type: "bearer",
              expires_in: 86400,
              refresh_token: "mock-refresh-token",
              user
            };
            callback("SIGNED_IN", session);
          } catch (e) {
            callback("SIGNED_OUT", null);
          }
        } else {
          callback("SIGNED_OUT", null);
        }
      };

      if (typeof window !== "undefined") {
        window.addEventListener("storage", handleStorageChange);
      }

      // Invoke callback immediately in a macro-task to let component mount first
      setTimeout(() => {
        const mockUserStr = typeof window !== "undefined" ? localStorage.getItem("mock_supabase_user") : null;
        if (mockUserStr) {
          try {
            const user = JSON.parse(mockUserStr);
            const session = {
              access_token: "mock-access-token",
              token_type: "bearer",
              expires_in: 86400,
              refresh_token: "mock-refresh-token",
              user
            };
            callback("SIGNED_IN", session);
          } catch (e) {
            callback("SIGNED_OUT", null);
          }
        } else {
          callback("SIGNED_OUT", null);
        }
      }, 0);

      return {
        data: {
          subscription: {
            unsubscribe: () => {
              if (typeof window !== "undefined") {
                window.removeEventListener("storage", handleStorageChange);
              }
            }
          }
        }
      };
    },
    signInWithOAuth: async ({ provider, options }: any) => {
      if (typeof window !== "undefined") {
        const mockUser = {
          id: "mock-user-12345",
          email: "cosmic.traveler@example.com",
          user_metadata: { full_name: "Cosmic Traveler" },
          app_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString()
        };
        localStorage.setItem("mock_supabase_user", JSON.stringify(mockUser));
        
        // Dispatch event for other listeners on same page
        window.dispatchEvent(new Event("storage"));
        
        const redirectUrl = options?.redirectTo || "/dashboard";
        window.location.href = redirectUrl;
      }
      return { data: {}, error: null };
    },
    signInWithPassword: async ({ email, password }: any) => {
      if (typeof window !== "undefined") {
        const mockUser = {
          id: "mock-user-12345",
          email: email || "cosmic.traveler@example.com",
          user_metadata: { full_name: email ? email.split("@")[0] : "Cosmic Traveler" },
          app_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString()
        };
        localStorage.setItem("mock_supabase_user", JSON.stringify(mockUser));
        window.dispatchEvent(new Event("storage"));
      }
      return { data: {}, error: null };
    },
    signUp: async ({ email, password }: any) => {
      if (typeof window !== "undefined") {
        const mockUser = {
          id: "mock-user-12345",
          email: email || "cosmic.traveler@example.com",
          user_metadata: { full_name: email ? email.split("@")[0] : "Cosmic Traveler" },
          app_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString()
        };
        localStorage.setItem("mock_supabase_user", JSON.stringify(mockUser));
        window.dispatchEvent(new Event("storage"));
      }
      return { data: { user: {}, session: {} }, error: null };
    },
    signOut: async () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("mock_supabase_user");
        window.dispatchEvent(new Event("storage"));
      }
      return { error: null };
    }
  },
  from: (table: string) => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      gt: () => chain,
      order: () => chain,
      single: async () => {
        if (table === "users") {
          return {
            data: { karma_tokens: 5 },
            error: null
          };
        }
        return { data: null, error: null };
      },
      insert: (data: any) => {
        console.log(`[Mock DB] Inserted into ${table}:`, data);
        return chain;
      },
      update: (data: any) => {
        console.log(`[Mock DB] Updated in ${table}:`, data);
        return chain;
      },
      then: (resolve: any) => {
        // Fallback resolving empty array for lists like reports
        resolve({ data: [], error: null });
        return chain;
      }
    };
    return chain as any;
  }
};

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: 'supabase-auth-token',
        cookieOptions: {
          maxAge: 86400,
          name: "sb-auth-token",
          domain: "",
          path: "/",
          sameSite: "lax"
        }
      } as any
    })
  : (mockSupabase as any);
