export default function Home() {
  return (
    <main style={{ maxWidth: 980, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 40, margin: "0 0 12px" }}>MatchPay</h1>
      <p style={{ fontSize: 18, opacity: 0.9, lineHeight: 1.4 }}>
        Convierte “quiero vender” + “quiero que me vendan” en matches confiables, medibles y pagables.
      </p>
      <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
        <a href="/ofertas" style={btn()}>Explorar ofertas</a>
        <a href="/api/health" style={btnGhost()}>Health</a>
      </div>
      <section style={{ marginTop: 24, borderTop: "1px solid #eee", paddingTop: 18 }}>
        <h2 style={{ margin: "0 0 8px" }}>Regla madre</h2>
        <ul style={{ lineHeight: 1.7 }}>
          <li>Menos fricción: auto-join + link instantáneo.</li>
          <li>Más trazabilidad: eventos idempotentes + auditoría.</li>
          <li>Pagable: wallet + payout manual registrado.</li>
        </ul>
      </section>
    </main>
  );
}
function btn(): React.CSSProperties {
  return { display:"inline-block", padding:"12px 14px", borderRadius:12, border:"1px solid #111", textDecoration:"none", color:"#111", fontWeight:800 };
}
function btnGhost(): React.CSSProperties {
  return { display:"inline-block", padding:"12px 14px", borderRadius:12, border:"1px solid #ddd", textDecoration:"none", color:"#111" };
}
