import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
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

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex justify-center p-10">Cargando...</div>
  if (!user) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <BrowserRouter>
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
        <Route path="/usuarios" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
