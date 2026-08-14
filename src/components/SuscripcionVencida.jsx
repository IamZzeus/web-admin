import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function SuscripcionVencida() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Suscripción Vencida - Gigafiber";
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.iconWrapper}>
            {/* Icono SVG de Advertencia / Candado */}
            <svg
              width="60"
              height="60"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#e6a23c"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h2 style={styles.title}>Suscripción Vencida</h2>
          <p style={styles.subtitle}>
            El acceso a tu espacio de trabajo ha sido suspendido temporalmente.
          </p>
        </div>

        <div style={styles.warningBox}>
          Tu plan actual ha finalizado. Para recuperar el acceso al sistema y
          permitir que tu equipo continúe operando, es necesario realizar la
          renovación del servicio.
        </div>

        <div style={styles.instructions}>
          <p>
            <b>¿Qué debo hacer?</b>
          </p>
          <p>1. Realiza el pago correspondiente a tu plan.</p>
          <p>
            2. Envía tu comprobante a <b>soporte@gigafiber.mx</b>.
          </p>
          <p>3. Tu cuenta será reactivada inmediatamente.</p>
        </div>

        <button onClick={() => navigate("/login")} style={styles.button}>
          Volver al Inicio de Sesión
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f6f9",
    fontFamily: "'Segoe UI', Roboto, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "450px",
    backgroundColor: "#ffffff",
    padding: "40px",
    borderRadius: "16px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
    boxSizing: "border-box",
  },
  header: { textAlign: "center", marginBottom: "25px" },
  iconWrapper: { marginBottom: "15px" },
  title: {
    margin: "0 0 10px 0",
    fontSize: "24px",
    color: "#2c3e50",
    fontWeight: "bold",
  },
  subtitle: {
    margin: 0,
    color: "#7f8c8d",
    fontSize: "15px",
    lineHeight: "1.5",
  },
  warningBox: {
    backgroundColor: "#fdf6ec",
    color: "#e6a23c",
    padding: "15px",
    borderRadius: "8px",
    fontSize: "14px",
    lineHeight: "1.6",
    marginBottom: "20px",
    border: "1px solid #faecd8",
    textAlign: "center",
  },
  instructions: {
    backgroundColor: "#f8fafc",
    padding: "20px",
    borderRadius: "8px",
    fontSize: "14px",
    color: "#4a5568",
    lineHeight: "1.8",
    marginBottom: "25px",
    border: "1px solid #e2e8f0",
  },
  button: {
    width: "100%",
    padding: "14px",
    color: "#4a5568",
    backgroundColor: "#e2e8f0",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "background-color 0.3s",
  },
};
