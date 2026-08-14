import { useState, useEffect} from "react";
import { Link } from "react-router-dom";
import api from "../api/axios"; 

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  useEffect(() => {
    document.title = "Olvide mi Contraseña - Gigafiber";
  }, []);
  const [message, setMessage] = useState(""); // Para mostrar mensaje de éxito
  const [error, setError] = useState("");     // Para mostrar errores
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      // Enviamos el correo a Laravel para que procese el token de recuperación
      const response = await api.post("/forgot-password", { email });
      
      // Si Laravel responde con éxito
      setMessage("¡Enlace enviado! Revisa tu bandeja de entrada para restablecer tu contraseña.");
      setEmail(""); // Limpiamos el input
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || 
        "No pudimos procesar tu solicitud. Verifica que el correo sea correcto."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginCard}>
        <div style={styles.header}>
          <div style={styles.logoWrapper}>📩</div>
          <h2 style={styles.title}>Recuperar Contraseña</h2>
          <p style={styles.subtitle}>
            Introduce tu correo electrónico y te enviaremos un enlace para restablecer tu acceso.
          </p>
        </div>

        {/* Mensajes de feedback dinámicos */}
        {error && <div style={styles.errorBox}>⚠️ {error}</div>}
        {message && <div style={styles.successBox}>✅ {message}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="tu-correo@empresa.com"
              required
              disabled={isLoading}
            />
          </div>

          <button 
            type="submit" 
            style={{
              ...styles.submitButton,
              backgroundColor: isLoading ? "#a0aec0" : "#0984e3",
              cursor: isLoading ? "not-allowed" : "pointer"
            }}
            disabled={isLoading}
          >
            {isLoading ? "Enviando enlace..." : "Enviar Enlace de Recuperación"}
          </button>

          {/* Enlace de retorno seguro */}
          <div style={{ textAlign: "center", marginTop: "20px" }}>
            <Link to="/login" style={styles.backLink}>
              ⬅️ Volver al Inicio de Sesión
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

// Opciones de Estilos en línea para mantener tu diseño idéntico
const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    backgroundColor: "#f4f6f9",
    fontFamily: "sans-serif",
  },
  loginCard: {
    backgroundColor: "#fff",
    padding: "40px",
    borderRadius: "12px",
    width: "100%",
    maxWidth: "400px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
  },
  header: {
    textAlign: "center",
    marginBottom: "25px",
  },
  logoWrapper: {
    fontSize: "40px",
    marginBottom: "10px",
  },
  title: {
    margin: "0 0 8px 0",
    color: "#2d3748",
    fontSize: "22px",
    fontWeight: "bold",
  },
  subtitle: {
    margin: 0,
    color: "#718096",
    fontSize: "14px",
    lineHeight: "1.4",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    color: "#4a5568",
    fontSize: "13px",
    fontWeight: "600",
  },
  input: {
    padding: "12px",
    border: "1px solid #cbd5e0",
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    width: "100%",
  },
  submitButton: {
    padding: "12px",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "15px",
    fontWeight: "bold",
    transition: "background-color 0.2s",
  },
  backLink: {
    color: "#718096",
    fontSize: "13px",
    textDecoration: "none",
    fontWeight: "500",
  },
  errorBox: {
    backgroundColor: "#fff5f5",
    color: "#c53030",
    padding: "10px",
    borderRadius: "6px",
    fontSize: "13px",
    marginBottom: "15px",
    border: "1px solid #fed7d7",
  },
  successBox: {
    backgroundColor: "#f0fff4",
    color: "#2f855a",
    padding: "10px",
    borderRadius: "6px",
    fontSize: "13px",
    marginBottom: "15px",
    border: "1px solid #c6f6d5",
    lineHeight: "1.4"
  },
};