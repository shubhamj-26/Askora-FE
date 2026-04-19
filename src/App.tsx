import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/common/ProtectedRoute'

// Auth
import SignupPage from './pages/auth/SignupPage'
import LoginPage from './pages/auth/LoginPage'

// Dashboard
import DashboardLayout from './pages/dashboard/DashboardLayout'
import DashboardHome from './pages/dashboard/DashboardHome'
import QuestionsPage from './pages/dashboard/QuestionsPage'
import UsersPage from './pages/dashboard/UsersPage'
import AnalyticsPage from './pages/dashboard/AnalyticsPage'
import ResponsesPage from './pages/dashboard/ResponsesPage'
import ChatPage from './pages/dashboard/ChatPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Protected */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardHome />} />
            <Route path="questions" element={<QuestionsPage />} />
            <Route path="responses" element={<ResponsesPage />} />
            <Route path="chat" element={<ChatPage />} />

            <Route path="users"
              element={<ProtectedRoute adminOnly><UsersPage /></ProtectedRoute>}
            />
            <Route path="analytics"
              element={<ProtectedRoute adminOnly><AnalyticsPage /></ProtectedRoute>}
            />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1c2028',
            color: '#f0f2f7',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '10px',
            fontSize: '14px',
            fontFamily: "'DM Sans', sans-serif",
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </AuthProvider>
  )
}