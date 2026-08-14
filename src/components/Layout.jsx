import { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import api from "../api/axios";

export default function Layout({ user, onLogout }) {
  // 👇 FIX 1: Arranca pequeñito automáticamente si detecta un celular (< 768px)
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 768);
  const location = useLocation();

  // 👇 NUEVO: Escucha si el usuario voltea el celular o cambia el tamaño
  useEffect(() => {
    const handleResize = () => setIsCollapsed(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // LÓGICA DE MARCA BLANCA (Color dinámico)
  const themeColor = user?.primary_color || "#343a40";

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Estados para el Modal de Configuración
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [brandColor, setBrandColor] = useState(
    user?.primary_color || "#aa3bff",
  );
  const [newLogo, setNewLogo] = useState(null);

  // 👇 FIX 1: Agregamos la función que faltaba para que React no explote
  const handleUpdateBrand = async (e) => {
    e.preventDefault();

    // Creamos el FormData porque incluye un archivo (el logo)
    const data = new FormData();
    data.append("primary_color", brandColor);

    // Solo agregamos el logo si el usuario seleccionó un archivo nuevo
    if (newLogo) {
      data.append("logo", newLogo);
    }

    try {
      // Enviamos la petición por POST a Laravel
      const response = await api.post("/admin/update-brand", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // 👇 EL FIX ESTÁ AQUÍ: Sobrescribimos la memoria del navegador con los datos nuevos
      if (response.data.user) {
        localStorage.setItem("user", JSON.stringify(response.data.user));
      }

      alert("Configuración de marca actualizada con éxito.");
      setIsProfileModalOpen(false);

      // Recargamos la página para que toda la interfaz adopte el nuevo color y logo inmediatamente
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert(
        "Error al actualizar la configuración: " +
          (error.response?.data?.message || "Fallo en el servidor"),
      );
    }
  };

  // Estilos dinámicos para el menú
  const getMenuLinkStyle = (path) => ({
    display: "block",
    padding: "12px 20px",
    color: location.pathname === path ? "#fff" : "rgba(255,255,255,0.7)",
    backgroundColor:
      location.pathname === path ? "rgba(0,0,0,0.2)" : "transparent",
    textDecoration: "none",
    borderRadius: "6px",
    marginBottom: "5px",
    transition: "all 0.3s",
    whiteSpace: "nowrap",
    overflow: "hidden",
    borderLeft:
      location.pathname === path ? "4px solid white" : "4px solid transparent",
  });

  return (
    <div
      style={{
        display: "flex",
        height: "100dvh", /* 👈 FIX 2: '100dvh' respeta la barra de búsqueda de Chrome/Safari en celular */
        backgroundColor: "#f4f6f9",
        fontFamily: "sans-serif",
        overflow: "hidden"
      }}
    >
      {/* --- SIDEBAR DINÁMICO --- */}
      <div
        style={{
          width: isCollapsed ? "60px" : "260px",
          backgroundColor: themeColor,
          color: "white",
          transition: "all 0.4s ease",
          display: "flex",
          flexDirection: "column",
          padding: "20px 10px",
          boxShadow: "2px 0 10px rgba(0,0,0,0.1)",
          overflowY: "auto", /* 👈 FIX 3: Si la pantalla es extremadamente pequeña, permite hacer scroll */
          overflowX: "hidden",
          flexShrink: 0 /* 👈 FIX 4: Evita que el área de contenido aplaste el menú */
        }}
      >
        {/* Botón para colapsar/expandir */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            background: "transparent",
            color: "white",
            border: "none",
            cursor: "pointer",
            textAlign: isCollapsed ? "center" : "right",
            marginBottom: "20px",
            fontSize: "18px",
          }}
        >
          ☰
        </button>

        {/* LOGO DINÁMICO / Nombre del SaaS */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "30px",
            transition: "all 0.3s",
          }}
        >
          {user?.logo_path ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <img
                src={`https://api.gigafiber.mx/storage/${user.logo_path}`}
                alt="Logo"
                style={{
                  width: isCollapsed ? "40px" : "80px",
                  height: isCollapsed ? "40px" : "80px",
                  objectFit: "cover",
                  borderRadius: "12px",
                  backgroundColor: "white",
                  padding: "5px",
                  transition: "all 0.3s",
                }}
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "block";
                }}
              />
              <span
                style={{
                  display: "none",
                  fontSize: isCollapsed ? "20px" : "40px",
                }}
              >
                🛜
              </span>
              {!isCollapsed && (
                <span style={{ fontWeight: "bold", fontSize: "16px" }}>
                  {user.name}
                </span>
              )}
            </div>
          ) : (
            <div
              style={{
                fontWeight: "bold",
                fontSize: isCollapsed ? "12px" : "20px",
              }}
            >
              {isCollapsed ? "🛜" : `🛜 ${user?.name || "Mi SaaS Tareas"}`}
            </div>
          )}
        </div>

        {/* Menú de Navegación */}
        <nav style={{ flex: 1 }}>
          <Link to="/" style={getMenuLinkStyle("/")}>
            📊 {!isCollapsed && " Concentrado"}
          </Link>

          {(user?.role === "admin" || user?.role === "marca" ||  user?.role === "supervisor") && (
            <>
              <Link
                to="/colaboradores"
                style={getMenuLinkStyle("/colaboradores")}
              >
                👥 {!isCollapsed && " Colaboradores"}
              </Link>
              <Link to="/clientes" style={getMenuLinkStyle("/clientes")}>
                🏢 {!isCollapsed && " Clientes"}
              </Link>
            </>
          )}

          {user?.role === "admin" && (
            <Link to="/marca" style={getMenuLinkStyle("/marca")}>
             👑 {!isCollapsed && "Marcas"}
            </Link>
          )}
        </nav>

        {/* 👇 FIX 2: RESTAURAMOS LA ZONA INFERIOR DEL PERFIL Y CERRAR SESIÓN */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.2)",
            paddingTop: "15px",
            textAlign: isCollapsed ? "center" : "left",
          }}
        >
          {/* Botón de Perfil Clicable (Abre el modal) */}
          <div
            onClick={() => setIsProfileModalOpen(true)}
            style={{
              marginBottom: "15px",
              padding: "8px",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: isCollapsed ? "center" : "space-between",
              gap: "10px",
              backgroundColor: "rgba(255,255,255,0.1)",
              transition: "background-color 0.2s",
            }}
            title="Configuración de Marca"
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(255,255,255,0.2)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  fontWeight: "bold",
                  flexShrink: 0,
                }}
              >
                {user?.logo_path ? (
                  <img
                    src={`https://api.gigafiber.mx/storage/${user.logo_path}`}
                    alt="Logo"
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  user?.name?.charAt(0).toUpperCase()
                )}
              </div>
              {!isCollapsed && (
                <span
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user?.name}
                </span>
              )}
            </div>
            {!isCollapsed && (
              <span style={{ fontSize: "14px", opacity: 0.7 }}>⚙️</span>
            )}
          </div>

          <button
            onClick={onLogout}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: "rgba(220, 53, 69, 0.9)",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "8px",
              transition: "0.2s",
              fontWeight: "bold",
            }}
          >
            🚪 {!isCollapsed && " Cerrar Sesión"}
          </button>
        </div>
      </div>

      {/* --- ÁREA DE CONTENIDO --- */}
      <div style={{ flex: 1, overflowY: "auto", padding: "30px" }}>
        <Outlet />
      </div>

      {/* --- MODAL DE CONFIGURACIÓN DE MARCA --- */}
      {isProfileModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "25px",
              borderRadius: "12px",
              width: "90%",
              maxWidth: "400px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            }}
          >
            <h3
              style={{
                marginTop: 0,
                color: "#333",
                borderBottom: "1px solid #eee",
                paddingBottom: "10px",
              }}
            >
              ⚙️ Configuración
            </h3>

            <form onSubmit={handleUpdateBrand}>
              {/* Selector de Foto */}
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    color: "#555",
                    fontWeight: "bold",
                    fontSize: "14px",
                  }}
                >
                  Fotografia o Logo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewLogo(e.target.files[0])}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Solo mostramos el Selector de Color si es Admin o Marca */}
              {(user?.role === "admin" || user?.role === "marca") && (
                <div style={{ marginBottom: "25px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      color: "#555",
                      fontWeight: "bold",
                      fontSize: "14px",
                    }}
                  >
                    Color Principal de la Interfaz
                  </label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      style={{
                        width: "50px",
                        height: "40px",
                        padding: "0",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "14px",
                        color: "#666",
                        fontFamily: "monospace",
                      }}
                    >
                      {brandColor}
                    </span>
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#e2e8f0",
                    color: "#475569",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "8px 16px",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    backgroundColor: brandColor,
                  }}
                >
                  Guardar Cambios
                </button>
              </div>

              {/* Link de ayuda */}
              <div
                style={{
                  marginTop: "20px",
                  textAlign: "center",
                  borderTop: "1px solid #eee",
                  paddingTop: "15px",
                }}
              >
                <a
                  href="mailto:soporte@gigafiber.mx?subject=Ayuda con el sistema"
                  style={{
                    fontSize: "12px",
                    color: "#888",
                    textDecoration: "underline",
                  }}
                >
                  ¿Encontraste un error o necesitas ayuda?
                </a>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
