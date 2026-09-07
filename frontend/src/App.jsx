import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { ChatProvider } from './context/ChatContext'
import Layout from './components/Layout'
import { ToastProvider } from './components/Toast'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import StudentsPage from './pages/StudentsPage'
import GuestsPage from './pages/GuestsPage'
import CleaningPage from './pages/CleaningPage'
import CleaningDashboardPage from './pages/CleaningDashboardPage'
import IncidentsPage from './pages/IncidentsPage'
import SchedulesPage from './pages/SchedulesPage'
import ScheduleViewPage from './pages/ScheduleViewPage'
import PaymentsPage from './pages/PaymentsPage'
import RoomsPage from './pages/RoomsPage'
import DocumentsPage from './pages/DocumentsPage'
import UsersPage from './pages/UsersPage'
import AdminChecklistPage from './pages/AdminChecklistPage'
import InventoryPage from './pages/InventoryPage'
import ConfigurationPage from './pages/ConfigurationPage'
import MenuPage from './pages/MenuPage'
import MenuViewPage from './pages/MenuViewPage'
import OrdersPage from './pages/OrdersPage'
import ChatPage from './pages/ChatPage'

function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex justify-center p-10">Cargando...</div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.rol)) return <Navigate to="/dashboard" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ChatProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/alumnos" element={<ProtectedRoute><StudentsPage /></ProtectedRoute>} />
            <Route path="/huespedes" element={<ProtectedRoute><GuestsPage /></ProtectedRoute>} />
            <Route path="/limpieza" element={<ProtectedRoute><CleaningPage /></ProtectedRoute>} />
            <Route path="/limpieza-dashboard" element={<ProtectedRoute><CleaningDashboardPage /></ProtectedRoute>} />
            <Route path="/incidencias" element={<ProtectedRoute><IncidentsPage /></ProtectedRoute>} />
            <Route path="/horarios" element={<ProtectedRoute><SchedulesPage /></ProtectedRoute>} />
            <Route path="/horario" element={<ProtectedRoute><ScheduleViewPage /></ProtectedRoute>} />
            <Route path="/pagos" element={<ProtectedRoute><PaymentsPage /></ProtectedRoute>} />
            <Route path="/habitaciones" element={<ProtectedRoute roles={['direccion', 'administracion']}><RoomsPage /></ProtectedRoute>} />
            <Route path="/documentos" element={<ProtectedRoute><DocumentsPage /></ProtectedRoute>} />
            <Route path="/inventario" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
            <Route path="/configuracion" element={<ProtectedRoute><ConfigurationPage /></ProtectedRoute>} />
            <Route path="/checklist-alta" element={<ProtectedRoute><AdminChecklistPage /></ProtectedRoute>} />
            <Route path="/menu" element={<ProtectedRoute><MenuPage /></ProtectedRoute>} />
            <Route path="/menu-view" element={<ProtectedRoute><MenuViewPage /></ProtectedRoute>} />
            <Route path="/pedidos" element={<ProtectedRoute roles={['estudiante', 'cocina', 'direccion']}><OrdersPage /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute roles={['estudiante', 'invitado', 'staff', 'cocina', 'limpieza', 'direccion', 'administracion']}><ChatPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ChatProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
