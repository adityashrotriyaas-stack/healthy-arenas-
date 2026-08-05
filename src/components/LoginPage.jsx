import { useState } from "react";
import { C } from "../lib/colors";
import { Icon } from "../lib/icons";
import { useAuth, useToast } from "../lib/contexts";
import { supabase } from "../lib/supabase";
import { authApi } from "../api/client";

const field = {
    width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
    padding: "14px", fontFamily: "'Inter',sans-serif", fontSize: 16, color: C.cream,
    outline: "none", boxSizing: "border-box",
};

function LoginPage({ onClose }) {
    const { refreshUser } = useAuth();
    const { toast } = useToast();
    const [step, setStep] = useState("phone");
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const normalized = phone.replace(/\D/g, "").slice(0, 10);

    const sendOtp = async (e) => {
        e?.preventDefault();
        if (normalized.length < 10) { toast("Enter a valid 10-digit mobile number", "info"); return; }
        setLoading(true);
        setError("");
        try {
            const { error } = await supabase.auth.signInWithOtp({ phone: `+91${normalized}` });
            if (error) throw error;
            setStep("otp");
            toast("OTP sent!", "success");
        } catch (err) {
            setError(err.message);
            toast(err.message, "info");
        }
        setLoading(false);
    };

    const verifyOtp = async (e) => {
        e.preventDefault();
        if (otp.replace(/\D/g, "").length < 4) { toast("Enter the OTP", "info"); return; }
        setLoading(true);
        setError("");
        try {
            const { error } = await supabase.auth.verifyOtp({
                phone: `+91${normalized}`,
                token: otp.replace(/\D/g, ""),
                type: "sms",
            });
            if (error) throw error;
            const { data: { user: sbUser } } = await supabase.auth.getUser();
            if (sbUser) await authApi.phoneAuth(sbUser.id, sbUser.phone, "User");
            await refreshUser();
            toast("Welcome!", "success");
            onClose();
        } catch (err) {
            setError(err.message);
            toast(err.message, "info");
        }
        setLoading(false);
    };

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", padding: 12 }}>
            <div style={{
                background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 24,
                width: "min(100%, 400px)", padding: "clamp(28px, 6vw, 40px) clamp(20px, 6vw, 36px)",
                maxHeight: "calc(100dvh - 24px)", overflowY: "auto", position: "relative",
                boxSizing: "border-box",
            }}>
                <button type="button" onClick={onClose} style={{ position: "absolute", top: 16, right: 20, background: "none", border: "none", cursor: "pointer", color: C.creamDim, display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}><Icon name="close" /></button>

                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 12, color: "#fff" }}>HA</div>
                    <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 16, color: C.cream }}>Healthy <span style={{ color: C.orange }}>Arena's</span></span>
                </div>

                {step === "phone" ? (
                    <form onSubmit={sendOtp}>
                        <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 24, color: C.cream, margin: "0 0 6px" }}>Sign in</h2>
                        <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.creamDim, marginBottom: 24 }}>Enter your mobile number — we'll send a one-time password.</p>

                        {error && (
                            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.red, marginBottom: 16, padding: "8px 12px", background: "rgba(221,51,51,0.1)", borderRadius: 8, border: "1px solid rgba(221,51,51,0.2)" }}>{error}</div>
                        )}

                        <label style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.creamDim, display: "block", marginBottom: 6 }}>Mobile number</label>
                        <div className="input-focus" style={{ display: "flex", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
                            <span style={{ display: "flex", alignItems: "center", padding: "0 14px", fontFamily: "'Inter',sans-serif", fontSize: 16, color: C.creamDim, borderRight: `1px solid ${C.border}` }}>+91</span>
                            <input
                                type="tel" inputMode="numeric" autoFocus
                                value={normalized}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="98765 43210"
                                style={{ ...field, border: "none" }}
                            />
                        </div>

                        <button type="submit" disabled={loading}
                            style={{
                                width: "100%", background: loading || normalized.length < 10 ? "rgba(232,89,12,0.5)" : C.orange,
                                border: "none", cursor: loading ? "default" : "pointer",
                                fontFamily: "'Inter',sans-serif", fontSize: 16, fontWeight: 700,
                                color: "#fff", padding: "14px", borderRadius: 12, marginTop: 20, minHeight: 48,
                            }}
                        >{loading ? "Sending..." : "Send OTP"}</button>
                    </form>
                ) : (
                    <form onSubmit={verifyOtp}>
                        <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 24, color: C.cream, margin: "0 0 6px" }}>Verify OTP</h2>
                        <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.creamDim, marginBottom: 24 }}>
                            Code sent to <span style={{ color: C.orange }}>+91 {normalized}</span>
                        </p>

                        {error && (
                            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.red, marginBottom: 16, padding: "8px 12px", background: "rgba(221,51,51,0.1)", borderRadius: 8, border: "1px solid rgba(221,51,51,0.2)" }}>{error}</div>
                        )}

                        <label style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.creamDim, display: "block", marginBottom: 6 }}>One-time password</label>
                        <input
                            type="tel" inputMode="numeric" autoFocus
                            value={otp.replace(/\D/g, "")}
                            onChange={e => setOtp(e.target.value)}
                            placeholder="••••••"
                            maxLength={6}
                            style={{ ...field, letterSpacing: 10, textAlign: "center", fontWeight: 700 }}
                        />

                        <button type="submit" disabled={loading}
                            style={{
                                width: "100%", background: loading ? "rgba(232,89,12,0.5)" : C.orange,
                                border: "none", cursor: loading ? "default" : "pointer",
                                fontFamily: "'Inter',sans-serif", fontSize: 16, fontWeight: 700,
                                color: "#fff", padding: "14px", borderRadius: 12, marginTop: 20, minHeight: 48,
                            }}
                        >{loading ? "Verifying..." : "Verify & Sign In"}</button>

                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, fontFamily: "'Inter',sans-serif", fontSize: 13 }}>
                            <button type="button" onClick={() => { setStep("phone"); setError(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.creamDim }}>← Change number</button>
                            <button type="button" onClick={sendOtp} disabled={loading} style={{ background: "none", border: "none", cursor: loading ? "default" : "pointer", color: C.orange }}>Resend OTP</button>
                        </div>
                    </form>
                )}

                <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}`, fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.creamDim, textAlign: "center", lineHeight: 1.5 }}>
                    By continuing you agree to receive OTPs on your mobile. We'll never call or spam you.
                </div>
            </div>
        </div>
    );
}

export { LoginPage };
