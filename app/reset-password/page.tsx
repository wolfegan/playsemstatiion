import { ResetPasswordForm } from "./reset-password-form";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Playsemstation — nova senha",
};

export default function ResetPasswordPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
        <div
          className="pixel-frame"
          style={{
            maxWidth: 480,
            width: "100%",
            padding: "clamp(1.5rem,4vw,3rem)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.5rem",
            textAlign: "center",
          }}
        >
          <div className="marquee" style={{ fontSize: "clamp(20px,4vw,30px)" }}>
            PLAY<span className="marquee-accent">SEM</span>STATION
          </div>
          <ResetPasswordForm />
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
