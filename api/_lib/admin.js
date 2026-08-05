import { supabase } from "./supabase.js";

export async function isAdmin(userId) {
    if (!userId) return false;
    const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
    return data?.role === "admin";
}
