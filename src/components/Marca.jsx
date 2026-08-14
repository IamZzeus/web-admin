import { useState, useEffect, useRef } from "react";
import api from "../api/axios";

export default function Marca() {
  const [marcas, setMarcas] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // NUEVO: Separamos la carga de la página y la carga del botón
  const [isLoading, setIsLoading] = useState(true); // Empieza en true para ocultar la pantalla vacía
  const [isSaving, setIsSaving] = useState(false); // Empieza en false porque aún no guardamos nada

  // NUEVO: Estado para saber si estamos editando (guarda el ID) o creando (null)
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    color: "#aa3bff",
    max_collaborators: 5,
    subscription_start: "",
    next_billing_date: "",
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const fileInputRef = useRef(null);

  const fetchMarcas = async () => {
    try {
      const response = await api.get("/admin/marcas");
      setMarcas(response.data);
    } catch (error) {
      console.error("Error al traer las marcas:", error);
    } finally {
      // NUEVO: Apagamos la pantalla de carga sin importar si hubo error o éxito
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMarcas();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Función para ABRIR modal en modo CREAR
  const openModal = () => {
    setEditingId(null); // Nos aseguramos de que no esté en modo edición
    setFormData({
      name: "",
      email: "",
      password: "",
      color: "#aa3bff",
      max_collaborators: 5,
      subscription_start: new Date().toISOString().split("T")[0],
      next_billing_date: "",
    });
    setLogoFile(null);
    setLogoPreview(null);
    setIsModalOpen(true);
  };

  // NUEVO: Función para ABRIR modal en modo EDITAR
  const openEditModal = (marca) => {
    setEditingId(marca.id); // Guardamos el ID que estamos editando
    setFormData({
      name: marca.name,
      email: marca.email,
      password: "", // Se deja vacío por seguridad (Laravel solo lo cambia si escribes algo)
      color: marca.primary_color || "#aa3bff",
      max_collaborators: marca.max_collaborators || 5,
      subscription_start: marca.subscription_start || "",
      next_billing_date: marca.next_billing_date || "",
    });
    setLogoFile(null);
    // Si tiene logo, mostramos la previsualización del servidor
    setLogoPreview(
      marca.logo_path
        ? `https://api.gigafiber.mx/storage/${marca.logo_path}`
        : null,
    );
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const data = new FormData();
    data.append("name", formData.name);
    data.append("email", formData.email);
    if (formData.password) data.append("password", formData.password); // Solo si escribieron contraseña
    data.append("primary_color", formData.color);
    data.append("role", "marca");
    data.append("max_collaborators", formData.max_collaborators);
    data.append("subscription_start", formData.subscription_start);
    data.append("next_billing_date", formData.next_billing_date);
    if (logoFile) data.append("logo", logoFile);

    try {
      if (editingId) {
        // 1. Mandamos la actualización al servidor
        const response = await api.post(`/admin/marcas/${editingId}`, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        // 2. ACTUALIZACIÓN AUTOMÁTICA (Optimistic Update)
        const marcaActualizada = response.data.user;
        setMarcas(
          marcas.map((m) => (m.id === editingId ? marcaActualizada : m)),
        );

        alert("Empresa actualizada con éxito.");
      } else {
        // 1. Mandamos la creación al servidor
        const response = await api.post("/register", data, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        // 2. ACTUALIZACIÓN AUTOMÁTICA
        const nuevaMarca = response.data.user;
        setMarcas([...marcas, nuevaMarca]);

        alert("Empresa creada exitosamente.");
      }

      setIsModalOpen(false); // Cerramos el modal
    } catch (error) {
      console.error(error);

      //Manejo de errores específicos según el código de estado HTTP que devuelva Laravel

      // 1. Error 409: Conflicto por reducción de plan (Downgrade)
      if (error.response && error.response.status === 409) {
        // Mostramos exactamente el mensaje que programamos en Laravel
        alert(error.response.data.message);
      }
      // 2. Error 422: Fallas de validación (ej. correo duplicado)
      else if (error.response && error.response.status === 422) {
        alert("Revisa los datos. Es posible que el correo ya esté registrado.");
      }
      // 3. Error 403: No tiene permisos / Límite de creación
      else if (error.response && error.response.status === 403) {
        alert(error.response.data.message);
      }
      // 4. Cualquier otro error general (500, servidor caído, etc.)
      else {
        alert("Error al guardar la empresa. Revisa la conexión.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    // 1. Doble confirmación nativa de JavaScript (crucial para acciones destructivas)
    const confirmacion = window.confirm(
      "⚠️ ADVERTENCIA EXTREMA ⚠️\n\n¿Estás completamente seguro de eliminar este registro?\nEsta acción es irreversible y borrará a todos los colaboradores, clientes y tareas asociadas.",
    );

    if (!confirmacion) return; // Si el usuario cancela, detenemos la ejecución

    try {
      // 2. Disparamos la petición a la ruta que acabamos de crear
      await api.delete(`/users/${id}`);

      alert("Registro y dependencias eliminados con éxito.");
      setIsModalOpen(false); // Cerramos tu modal

      // 3. Recargamos la vista para que el usuario borrado desaparezca de la tabla
      window.location.reload();

      // (Opcional: Si tienes una función como fetchUsers(), es mejor llamarla
      // en lugar de reload() para no parpadear la pantalla).
    } catch (error) {
      console.error("Error al eliminar:", error);

      // Manejamos el error 403 (Cuando intentan borrar al Super Admin)
      if (error.response?.status === 403) {
        alert("🛡️ " + error.response.data.message);
      } else {
        alert("Ocurrió un error al intentar eliminar el registro.");
      }
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "80vh",
        }}
      >
        <span style={{ fontSize: "40px", marginBottom: "10px" }}>⏳</span>
        <h3 style={{ color: "#2c3e50", margin: 0 }}>Sincronizando datos...</h3>
        <p style={{ color: "#7f8c8d" }}>Conectando con el servidor</p>
      </div>
    );
  }
  return (
    <div style={styles.pageContainer}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>👑 Ecosistema SaaS</h1>
          <p style={styles.pageSubtitle}>
            Gestiona a tus clientes, sus límites y fechas de facturación.
          </p>
        </div>
        <button onClick={openModal} style={styles.btnPrimary}>
          ➕ Activar Nueva Empresa
        </button>
      </div>

      <div style={styles.gridDashboard}>
        {marcas.length === 0 && (
          <p style={{ color: "#666" }}>No hay empresas registradas aún.</p>
        )}

        {marcas.map((marca) => (
          <div
            key={marca.id}
            style={{
              ...styles.brandCard,
              borderTop: `5px solid ${marca.primary_color}`,
            }}
          >
            <div style={styles.cardHeader}>
              {marca.logo_path ? (
                <img
                  src={`https://api.gigafiber.mx/storage/${marca.logo_path}`}
                  alt="Logo"
                  style={styles.brandLogo}
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
              ) : null}
              <div
                style={{
                  ...styles.brandAvatar,
                  backgroundColor: marca.primary_color,
                  display: marca.logo_path ? "none" : "flex",
                }}
              >
                {marca.name.charAt(0).toUpperCase()}
              </div>
              <div
                style={{ flex: 1, marginLeft: marca.logo_path ? "0" : "15px" }}
              >
                <h3 style={styles.brandName}>{marca.name}</h3>
                <small style={{ color: "#666" }}>{marca.email}</small>
              </div>
            </div>

            <div style={styles.statsContainer}>
              <div style={styles.statBox}>
                <span style={styles.statLabel}>Límite Usuarios</span>
                <strong style={styles.statValue}>
                  {marca.max_collaborators}
                </strong>
              </div>
              <div style={styles.statBox}>
                <span style={styles.statLabel}>Próximo Pago</span>
                <strong style={{ ...styles.statValue, color: "#dc3545" }}>
                  {marca.next_billing_date || "No definida"}
                </strong>
              </div>
            </div>

            {/* NUEVO: El botón ahora abre el modal de edición pasándole la marca actual */}
            <button
              style={styles.btnSecondary}
              onClick={() => openEditModal(marca)}
            >
              ⚙️ Administrar Empresa
            </button>
          </div>
        ))}
      </div>

      {/* MODAL UNIFICADO (Crear / Editar) */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            {/* El título cambia según el modo */}
            <h2 style={{ color: "#333", marginTop: 0 }}>
              {editingId
                ? "✏️ Editar Empresa"
                : "➕ Configurar Nuevo Inquilino"}
            </h2>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.uploadSection}>
                <div style={styles.previewContainer}>
                  {logoPreview ? (
                    <img src={logoPreview} style={styles.previewImage} />
                  ) : (
                    <span>📁</span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.labelDark}>Logo Corporativo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    style={{ display: "none" }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current.click()}
                    style={styles.btnUpload}
                  >
                    Seleccionar Archivo
                  </button>
                </div>
              </div>

              <div style={styles.formGrid}>
                <div>
                  <label style={styles.labelDark}>Nombre de la Empresa</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    style={styles.inputDark}
                  />
                </div>
                <div>
                  <label style={styles.labelDark}>Color (Theme)</label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    style={styles.colorPicker}
                  />
                </div>
                <div>
                  <label style={styles.labelDark}>Correo (Admin)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    style={styles.inputDark}
                  />
                </div>
                <div>
                  <label style={styles.labelDark}>
                    Contraseña {editingId && "(Opcional)"}
                  </label>
                  {/* Si estamos editando, la contraseña no es obligatoria */}
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required={!editingId}
                    style={styles.inputDark}
                    placeholder={
                      editingId ? "Dejar en blanco para no cambiar" : ""
                    }
                  />
                </div>
              </div>

              <div
                style={{
                  padding: "15px",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "8px",
                  border: "1px solid #e9ecef",
                  marginTop: "10px",
                }}
              >
                <h4 style={{ margin: "0 0 10px 0", color: "#495057" }}>
                  💳 Datos del Plan (SaaS)
                </h4>
                <div style={styles.formGrid}>
                  <div>
                    <label style={styles.labelDark}>
                      Límite de Colaboradores
                    </label>
                    <input
                      type="number"
                      value={formData.max_collaborators}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          max_collaborators: parseInt(e.target.value),
                        })
                      }
                      min="1"
                      required
                      style={styles.inputDark}
                    />
                  </div>
                  <div></div>
                  <div>
                    <label style={styles.labelDark}>Fecha de Inicio</label>
                    <input
                      type="date"
                      value={formData.subscription_start}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          subscription_start: e.target.value,
                        })
                      }
                      required
                      style={styles.inputDark}
                    />
                  </div>
                  <div>
                    <label style={styles.labelDark}>Próximo Pago</label>
                    <input
                      type="date"
                      value={formData.next_billing_date}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          next_billing_date: e.target.value,
                        })
                      }
                      required
                      style={styles.inputDark}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                <button
                  type="submit"
                  style={styles.btnPrimary}
                  disabled={isSaving}
                >
                  {isSaving ? "Guardando..." : "Guardar Empresa"}
                </button>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={styles.btnSecondary}
                >
                  Cancelar
                </button>

                {/* 👇 EL FIX: Usamos editingId en lugar de formData.id */}
                {editingId && editingId !== 1 && (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingId)}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#dc3545",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    🗑️ Eliminar Definitivamente
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Estilos
const styles = {
  pageContainer: { padding: "20px" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
  },
  pageTitle: {
    margin: 0,
    fontSize: "28px",
    color: "#2c3e50",
    fontWeight: "bold",
  },
  pageSubtitle: { margin: "5px 0 0", color: "#6c757d" },
  btnPrimary: {
    padding: "12px 20px",
    backgroundColor: "#aa3bff",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  gridDashboard: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "20px",
  },
  brandCard: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  cardHeader: { display: "flex", alignItems: "center", gap: "15px" },
  brandLogo: {
    width: "50px",
    height: "50px",
    borderRadius: "8px",
    objectFit: "cover",
  },
  brandAvatar: {
    width: "50px",
    height: "50px",
    borderRadius: "8px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "white",
    fontSize: "24px",
    fontWeight: "bold",
  },
  brandName: { margin: 0, fontSize: "18px", color: "#333" },
  statsContainer: {
    display: "flex",
    gap: "15px",
    backgroundColor: "#f8f9fa",
    padding: "10px",
    borderRadius: "8px",
  },
  statBox: { flex: 1 },
  statLabel: {
    display: "block",
    fontSize: "11px",
    color: "#6c757d",
    textTransform: "uppercase",
    fontWeight: "bold",
  },
  statValue: { fontSize: "16px", color: "#212529" },
  btnSecondary: {
    width: "100%",
    padding: "10px",
    backgroundColor: "transparent",
    color: "#495057",
    border: "1px solid #ced4da",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "white",
    padding: "30px",
    borderRadius: "12px",
    width: "90%",
    maxWidth: "600px",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    marginTop: "20px",
  },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" },
  labelDark: {
    display: "block",
    marginBottom: "5px",
    fontWeight: "bold",
    fontSize: "13px",
    color: "#333",
  },
  inputDark: {
    width: "100%",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    boxSizing: "border-box",
    backgroundColor: "#fff",
    color: "#000",
  },
  colorPicker: {
    border: "none",
    width: "100%",
    height: "40px",
    padding: "0",
    cursor: "pointer",
    borderRadius: "6px",
  },
  uploadSection: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    padding: "15px",
    border: "1px dashed #ccc",
    borderRadius: "8px",
    backgroundColor: "#fafafa",
  },
  previewContainer: {
    width: "60px",
    height: "60px",
    borderRadius: "8px",
    overflow: "hidden",
    backgroundColor: "#eee",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "24px",
  },
  previewImage: { width: "100%", height: "100%", objectFit: "cover" },
  btnUpload: {
    padding: "8px 15px",
    backgroundColor: "#e9ecef",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
    color: "#333",
    fontWeight: "bold",
  },
};
