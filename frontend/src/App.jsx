import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import { ToastProvider } from './components/Toast'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import StudentsPage from './pages/StudentsPage'
import CleaningPage from './pages/CleaningPage'
import IncidentsPage from './pages/IncidentsPage'
import SchedulesPage from './pages/SchedulesPage'
import PaymentsPage from './pages/PaymentsPage'
import RoomsPage from './pages/RoomsPage'
import DocumentsPage from './pages/DocumentsPage'
import UsersPage from './pages/UsersPage'
import AdminChecklistPage from './pages/AdminChecklistPage'
import InventoryPage from './pages/InventoryPage'
import ConfigurationPage from './pages/ConfigurationPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex justify-center p-10">Cargando...</div>
  if (!user) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/alumnos" element={<ProtectedRoute><StudentsPage /></ProtectedRoute>} />
          <Route path="/limpieza" element={<ProtectedRoute><CleaningPage /></ProtectedRoute>} />
          <Route path="/incidencias" element={<ProtectedRoute><IncidentsPage /></ProtectedRoute>} />
          <Route path="/horarios" element={<ProtectedRoute><SchedulesPage /></ProtectedRoute>} />
          <Route path="/pagos" element={<ProtectedRoute><PaymentsPage /></ProtectedRoute>} />
          <Route path="/habitaciones" element={<ProtectedRoute><RoomsPage /></ProtectedRoute>} />
          <Route path="/documentos" element={<ProtectedRoute><DocumentsPage /></ProtectedRoute>} />
          <Route path="/inventario" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
          <Route path="/usuarios" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
          <Route path="/configuracion" element={<ProtectedRoute><ConfigurationPage /></ProtectedRoute>} />
          <Route path="/checklist-alta" element={<ProtectedRoute><AdminChecklistPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}
