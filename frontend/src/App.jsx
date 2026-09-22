import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { ChatProvider } from './context/ChatContext'
import Layout from './components/Layout'
import { ToastProvider } from './components/Toast'
import Login from './pages/Login'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const StudentsPage = lazy(() => import('./pages/StudentsPage'))
const GuestsPage = lazy(() => import('./pages/GuestsPage'))
const CleaningPage = lazy(() => import('./pages/CleaningPage'))
const CleaningDashboardPage = lazy(() => import('./pages/CleaningDashboardPage'))
const IncidentsPage = lazy(() => import('./pages/IncidentsPage'))
const SchedulesPage = lazy(() => import('./pages/SchedulesPage'))
const ScheduleViewPage = lazy(() => import('./pages/ScheduleViewPage'))
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'))
const RoomsPage = lazy(() => import('./pages/RoomsPage'))
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'))
const UsersPage = lazy(() => import('./pages/UsersPage'))
const AdminChecklistPage = lazy(() => import('./pages/AdminChecklistPage'))
const InventoryPage = lazy(() => import('./pages/InventoryPage'))
const ConfigurationPage = lazy(() => import('./pages/ConfigurationPage'))
const MenuPage = lazy(() => import('./pages/MenuPage'))
const MenuViewPage = lazy(() => import('./pages/MenuViewPage'))
const OrdersPage = lazy(() => import('./pages/OrdersPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))

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
          <Suspense fallback={<div className="flex justify-center p-10">Cargando...</div>}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/alumnos" element={<ProtectedRoute roles={['direccion', 'administracion']}><StudentsPage /></ProtectedRoute>} />
              <Route path="/huespedes" element={<ProtectedRoute roles={['direccion', 'administracion']}><GuestsPage /></ProtectedRoute>} />
              <Route path="/limpieza" element={<ProtectedRoute roles={['direccion', 'administracion', 'limpieza']}><CleaningPage /></ProtectedRoute>} />
              <Route path="/limpieza-dashboard" element={<ProtectedRoute roles={['direccion', 'administracion']}><CleaningDashboardPage /></ProtectedRoute>} />
              <Route path="/incidencias" element={<ProtectedRoute><IncidentsPage /></ProtectedRoute>} />
              <Route path="/horarios" element={<ProtectedRoute roles={['direccion', 'administracion']}><SchedulesPage /></ProtectedRoute>} />
              <Route path="/horario" element={<ProtectedRoute><ScheduleViewPage /></ProtectedRoute>} />
              <Route path="/pagos" element={<ProtectedRoute roles={['direccion', 'administracion', 'estudiante']}><PaymentsPage /></ProtectedRoute>} />
              <Route path="/habitaciones" element={<ProtectedRoute roles={['direccion', 'administracion']}><RoomsPage /></ProtectedRoute>} />
              <Route path="/documentos" element={<ProtectedRoute roles={['direccion', 'administracion', 'estudiante']}><DocumentsPage /></ProtectedRoute>} />
              <Route path="/inventario" element={<ProtectedRoute roles={['direccion', 'administracion', 'limpieza']}><InventoryPage /></ProtectedRoute>} />
              <Route path="/usuarios" element={<ProtectedRoute roles={['direccion']}><UsersPage /></ProtectedRoute>} />
              <Route path="/configuracion" element={<ProtectedRoute roles={['direccion']}><ConfigurationPage /></ProtectedRoute>} />
              <Route path="/checklist-alta" element={<ProtectedRoute roles={['direccion', 'administracion']}><AdminChecklistPage /></ProtectedRoute>} />
              <Route path="/menu" element={<ProtectedRoute roles={['direccion', 'administracion', 'cocina']}><MenuPage /></ProtectedRoute>} />
              <Route path="/menu-view" element={<ProtectedRoute><MenuViewPage /></ProtectedRoute>} />
              <Route path="/pedidos" element={<ProtectedRoute roles={['estudiante', 'invitado', 'cocina', 'direccion']}><OrdersPage /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute roles={['estudiante', 'invitado', 'staff', 'cocina', 'limpieza', 'direccion', 'administracion']}><ChatPage /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </ChatProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
