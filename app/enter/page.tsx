import { EnterForm } from "./enter-form";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Playsemstation — insert coin",
};

export default function EnterPage() {
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
          <p style={{ fontSize: 12, color: "var(--ink-dim)", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
            joga sem estação. só sua coleção.
          </p>
          <EnterForm />
          <p style={{ fontSize: 10, color: "var(--ink-dim)", letterSpacing: "0.05em", margin: 0 }}>
            Modo visitante — dá pra ver e jogar, não dá pra mudar nada
          </p>
          <p style={{ fontSize: 11, color: "var(--ink-dim)", letterSpacing: "0.05em", margin: 0 }}>
            É o dono?{" "}
            <a href="/login" style={{ color: "var(--blue)" }}>
              Entrar como admin
            </a>
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
