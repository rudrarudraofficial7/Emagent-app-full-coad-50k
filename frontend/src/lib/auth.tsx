import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

import { storage } from "@/src/utils/storage";
import { api, setAuthToken } from "@/src/lib/api";

type User = {
  user_id: string;
  email: string;
  name?: string;
  picture?: string;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

const TOKEN_KEY = "freezy_session_token";

const getRedirectUrl = () => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location.origin + "/";
  }
  return Linking.createURL("auth");
};

const parseSessionId = (url: string | null): string | null => {
  if (!url) return null;
  // Hash fragment
  const hashIdx = url.indexOf("#");
  if (hashIdx >= 0) {
    const frag = url.slice(hashIdx + 1);
    const params = new URLSearchParams(frag);
    const sid = params.get("session_id");
    if (sid) return sid;
  }
  // Query string
  const qIdx = url.indexOf("?");
  if (qIdx >= 0) {
    const params = new URLSearchParams(url.slice(qIdx + 1));
    const sid = params.get("session_id");
    if (sid) return sid;
  }
  return null;
};

const persistToken = async (token: string | null) => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } else if (token) {
    await storage.secureSet(TOKEN_KEY, token);
  } else {
    await storage.secureRemove(TOKEN_KEY);
  }
};

const readToken = async (): Promise<string | null> => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.localStorage.getItem(TOKEN_KEY);
  }
  return (await storage.secureGet(TOKEN_KEY, "")) || null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const exchangeSessionId = useCallback(async (sessionId: string) => {
    const res = await api.authSession(sessionId);
    await persistToken(res.session_token);
    setAuthToken(res.session_token);
    setUser(res.user);
  }, []);

  const checkExistingSession = useCallback(async () => {
    const token = await readToken();
    if (!token) {
      setLoading(false);
      return;
    }
    setAuthToken(token);
    try {
      const me = await api.authMe();
      setUser(me.user);
    } catch {
      await persistToken(null);
      setAuthToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle web URL fragment on mount + check existing
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1. Web: detect session_id in URL first
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const sid = parseSessionId(window.location.href);
        if (sid) {
          try {
            await exchangeSessionId(sid);
            window.history.replaceState(null, "", window.location.pathname);
          } catch (e) {
            console.warn("Session exchange failed:", e);
          } finally {
            if (!cancelled) setLoading(false);
          }
          return;
        }
      }

      // 2. Mobile: cold-start URL
      if (Platform.OS !== "web") {
        const initial = await Linking.getInitialURL();
        const sid = parseSessionId(initial);
        if (sid) {
          try { await exchangeSessionId(sid); } catch (e) { console.warn(e); }
          if (!cancelled) setLoading(false);
          return;
        }
      }

      // 3. Check stored session
      await checkExistingSession();
    })();

    // Hot link listener (mobile)
    const sub = Linking.addEventListener("url", async (event) => {
      const sid = parseSessionId(event.url);
      if (sid) {
        try { await exchangeSessionId(sid); } catch (e) { console.warn(e); }
      }
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [exchangeSessionId, checkExistingSession]);

  const signInWithGoogle = useCallback(async () => {
    const redirectUrl = getRedirectUrl();
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.href = authUrl;
      return;
    }
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
    if (result.type === "success" && result.url) {
      const sid = parseSessionId(result.url);
      if (sid) {
        try { await exchangeSessionId(sid); } catch (e) { console.warn(e); }
      }
    }
  }, [exchangeSessionId]);

  const signOut = useCallback(async () => {
    try { await api.authLogout(); } catch { /* ignore */ }
    await persistToken(null);
    setAuthToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
