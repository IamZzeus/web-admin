import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function Clientes() {
    // --- ESTADOS DE CARGA Y UI ---
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // --- DATOS ---
    const [clientes, setClientes] = useState([]);
    const [colaboradores, setColaboradores] = useState([]); // Para el menú desplegable de "Atendido por"
    const [user, setUser] = useState(null);
    const [clients, setClients] = useState([]);
    const [filteredClientes, setFilteredClientes] = useState([]);
    const [search, setSearch] = useState('');
    
    // --- FORMULARIO ---
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        contact_person: '',
        email: '',
        status: 'activo',
        assigned_to: '' // Aquí guardaremos el ID del técnico
    });

    useEffect(() => {
        const currentUser = JSON.parse(localStorage.getItem('user'));
        setUser(currentUser);
        fetchData(currentUser);
        fetchClientes();
    }, []);

    const fetchData = async (currentUser) => {
        // 1. Traer Colaboradores de forma independiente
        try {
            if (currentUser?.role !== 'colaborador') {
                const colabsRes = await api.get('/collaborators');
                setColaboradores(colabsRes.data);
            }
        } catch (error) {
            console.error("❌ Error al cargar colaboradores:", error);
        }

        // 2. Traer Clientes de forma independiente
        try {
            const clientesRes = await api.get('/clients');
            setClientes(clientesRes.data);
        } catch (error) {
            console.error("❌ Error al cargar clientes:", error);
            alert("Error en el servidor al cargar clientes. Presiona F12 y revisa la consola.");
        } finally {
            setIsLoading(false); 
        }
    };

    const fetchClientes = async () => {
    try {
        const response = await api.get('/clients'); // O tu ruta
        
        // 1. Guardamos la lista original (la que no se toca)
        setClientes(response.data);
        
        // 2. 👇 ¡ESTA ES LA LÍNEA QUE FALTA! 👇
        // También llenamos la lista filtrada con todos los datos al inicio
        setFilteredClientes(response.data); 

    } catch (error) {
        console.error("Error al cargar clientes:", error);
    }
};

    const handleSearch = (e) => {
        const text = e.target.value;
        setSearch(text);

        if (text) {
            const newData = clientes.filter(cliente => {
                // Buscamos por nombre (puedes agregar cliente.email si quieres buscar por correo también)
                const itemData = cliente.name ? cliente.name.toUpperCase() : '';
                const textData = text.toUpperCase();
                return itemData.includes(textData);
            });
            setFilteredClientes(newData);
        } else {
            setFilteredClientes(clientes); // Regresa a la lista completa
        }
    };

    // --- FUNCIONES DEL CRUD ---
    const openCreateModal = () => {
        setFormData({ name: '', address: '', phone: '', contact_person: '', email: '', status: 'activo', assigned_to: '' });
        setEditingId(null);
        setIsModalOpen(true);
    };

    const handleEdit = (cliente) => {
        setFormData({ ...cliente, assigned_to: cliente.assigned_to || '' });
        setEditingId(cliente.id);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer.')) return;
        
        try {
            await api.delete(`/clients/${id}`);
            setClientes(clientes.filter(c => c.id !== id));
            // Opcional: mostrar un toast o alerta pequeña aquí
        } catch (error) {
            console.error(error);
            alert('Error al eliminar el cliente.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true); 

        try {
            if (editingId) {
                await api.put(`/clients/${editingId}`, formData);
            } else {
                await api.post('/clients', formData);
            }
            
            setIsModalOpen(false);
            fetchData(user); // Recargamos para ver los cambios
        } catch (error) {
            console.error(error);
            alert("Error al guardar los datos del cliente.");
        } finally {
            setIsSaving(false); 
        }
    };

    // --- PANTALLA DE CARGA (Nivel Pro) ---
    if (isLoading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <span style={{ fontSize: '50px', marginBottom: '15px' }}>🏢</span>
                <h3 style={{ color: '#2c3e50', margin: 0 }}>Cargando Cartera de Clientes...</h3>
                <p style={{ color: '#7f8c8d' }}>Sincronizando el CRM con el servidor</p>
            </div>
        );
    }

    return (
        <div style={styles.pageContainer}>
            {/* ENCABEZADO */}
            <div style={styles.header}>
                <div>
                    <h2 style={{ margin: 0, color: '#2c3e50' }}>🏢 Gestión de Clientes</h2>
                    <p style={{ margin: '5px 0 0', color: '#7f8c8d' }}>Administra tu cartera y asigna responsables.</p>
                </div>
                <button onClick={openCreateModal} style={styles.btnAction}>
                    ➕ Nuevo Cliente
                </button>
            </div>

            {/* BARRA DE BÚSQUEDA */}
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-start' }}>
                <input 
                    type="text" 
                    placeholder="🔍 Buscar cliente por nombre..." 
                    value={search}
                    onChange={handleSearch}
                    style={{
                        padding: '10px 15px',
                        width: '300px',
                        borderRadius: '8px',
                        border: '1px solid #ccc',
                        fontSize: '14px',
                        outline: 'none'
                    }}
                />
            </div>

            {/* TABLA DE CLIENTES */}
            <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead>
                        <tr style={styles.thRow}>
                            <th style={styles.th}>Cliente</th>
                            <th style={styles.th}>Dirección</th>
                            <th style={styles.th}>Teléfono</th>
                            <th style={styles.th}>Responsable</th>
                            <th style={styles.th}>Email</th>
                            <th style={styles.th}>Última visita</th>
                            <th style={styles.th}>Estatus</th>
                            <th style={styles.th}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* 👇 AQUÍ CAMBIAMOS clientes POR filteredClientes 👇 */}
                        {filteredClientes.length === 0 ? (
                            <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No se encontraron clientes.</td></tr>
                        ) : (
                            filteredClientes.map(cliente => (
                                <tr key={cliente.id} style={styles.tdRow}>
                                    <td style={styles.td}><strong>{cliente.name}</strong></td>
                                    <td style={styles.td}>{cliente.address || '-'}</td>
                                    <td style={styles.td}>{cliente.phone || '-'}</td>
                                    <td style={styles.td}>{cliente.contact_person || '-'}</td>
                                    <td style={styles.td}>{cliente.email || '-'}</td>
                                    <td style={styles.td}>{cliente.last_visit || 'Sin visitas'}</td>
                                    <td style={styles.td}>
                                        <span style={{ 
                                            padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                                            backgroundColor: cliente.status === 'activo' ? '#d4edda' : '#f8d7da',
                                            color: cliente.status === 'activo' ? '#155724' : '#721c24'
                                        }}>
                                            {cliente.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={styles.td}>
                                        <button onClick={() => handleEdit(cliente)} style={styles.btnEdit} title="Editar">✏️</button>
                                        <button onClick={() => handleDelete(cliente.id)} style={styles.btnDelete} title="Eliminar">🗑️</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL DE CREACIÓN/EDICIÓN */}
            {isModalOpen && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h3 style={{ marginTop: 0, color: '#2c3e50', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                            {editingId ? '✏️ Editar Cliente' : '🏢 Registrar Nuevo Cliente'}
                        </h3>
                        
                        <form onSubmit={handleSubmit} style={styles.form}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Nombre de la Empresa / Cliente *</label>
                                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={styles.input} required />
                            </div>

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ ...styles.inputGroup, flex: 1 }}>
                                    <label style={styles.label}>Persona Responsable (Contacto)</label>
                                    <input type="text" value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} style={styles.input} />
                                </div>
                                <div style={{ ...styles.inputGroup, flex: 1 }}>
                                    <label style={styles.label}>Teléfono</label>
                                    <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={styles.input} />
                                </div>
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Correo Electrónico</label>
                                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={styles.input} />
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Dirección Física</label>
                                <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={styles.input} />
                            </div>

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ ...styles.inputGroup, flex: 1 }}>
                                    <label style={styles.label}>Estatus</label>
                                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} style={styles.input}>
                                        <option value="activo">Activo</option>
                                        <option value="inactivo">Inactivo</option>
                                    </select>
                                </div>

                                {/* MAGIA: Solo mostramos "Atendido por" si NO es un colaborador */}
                                {user?.role !== 'colaborador' && (
                                    <div style={{ ...styles.inputGroup, flex: 1 }}>
                                        <label style={styles.label}>Atendido por (Técnico)</label>
                                        <select value={formData.assigned_to} onChange={e => setFormData({...formData, assigned_to: e.target.value})} style={styles.input}>
                                            <option value="">A mi cargo (Por defecto)</option>
                                            {colaboradores.map(colab => (
                                                <option key={colab.id} value={colab.id}>{colab.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div style={styles.modalActions}>
                                <button type="submit" disabled={isSaving} style={{ ...styles.btnPrimary, opacity: isSaving ? 0.7 : 1 }}>
                                    {isSaving ? 'Guardando...' : 'Guardar Cliente'}
                                </button>
                                <button type="button" onClick={() => setIsModalOpen(false)} style={styles.btnSecondary}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- ESTILOS EN LÍNEA ---
const styles = {
    pageContainer: { padding: '20px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    btnAction: { padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
    tableContainer: { backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
    thRow: { borderBottom: '2px solid #e9ecef', backgroundColor: '#f8f9fa' },
    th: { padding: '15px', color: '#495057', fontSize: '14px' },
    tdRow: { borderBottom: '1px solid #e9ecef' },
    td: { padding: '15px', color: '#333', fontSize: '14px', whiteSpace: 'nowrap' },
    btnEdit: { marginRight: '8px', background: '#ffc107', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' },
    btnDelete: { background: '#dc3545', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', color: 'white' },
    
    // Estilos del Modal
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '600px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
    label: { fontSize: '13px', fontWeight: 'bold', color: '#555' },
    input: { padding: '10px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none' },
    modalActions: { display: 'flex', gap: '10px', marginTop: '20px' },
    btnPrimary: { flex: 1, padding: '12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
    btnSecondary: { flex: 1, padding: '12px', backgroundColor: '#e9ecef', color: '#333', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }
};