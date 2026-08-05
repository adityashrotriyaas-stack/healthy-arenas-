import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { authApi } from "../api/client";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                await fetchProfile(session.user.id);
            } else {
                setUser(null);
                setLoading(false);
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    async function fetchProfile(userId) {
        try {
            const res = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "get", userId }),
            });
            const data = await res.json();
            if (data.user?.name) {
                setUser({
                    id: data.user.id,
                    name: data.user.name,
                    phone: data.user.phone,
                    avatar: data.user.name[0].toUpperCase(),
                    isAdmin: data.user.isAdmin,
                });
                return;
            }
        } catch (e) {}

        const { data: { user: sbUser } } = await supabase.auth.getUser();
        if (sbUser) {
            setUser({
                id: sbUser.id,
                name: sbUser.user_metadata?.name || "",
                phone: sbUser.phone || "",
                avatar: (sbUser.user_metadata?.name || sbUser.phone?.[0] || "U").toUpperCase(),
                isAdmin: false,
            });
        }
        setLoading(false);
    }

    const refreshUser = useCallback(async () => {
        const { data: { user: sbUser } } = await supabase.auth.getUser();
        if (sbUser) await fetchProfile(sbUser.id);
    }, []);

    const logout = useCallback(async () => {
        await supabase.auth.signOut();
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, refreshUser, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
