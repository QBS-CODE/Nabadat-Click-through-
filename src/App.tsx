import { BrowserRouter, Routes, Route, Navigate } from "react-router"
import { AuthProvider, useAuth } from "./contexts/auth-context"
import { PersonaProvider } from "./contexts/persona-context"
import { AppLayout } from "./components/layout/app-layout"
import LoginPage from "./pages/LoginPage"
import CxDashboard from "./pages/CxDashboard"
import VocDashboard from "./pages/VocDashboard"
import ComponentGuide from "./pages/ComponentGuide"
import KpiDetailPage from "./pages/KpiDetailPage"
import FeedbackPage from "./pages/FeedbackPage"
import SurveysPage from "./pages/SurveysPage"
import PlaceholderPage from "./pages/PlaceholderPage"
import JourneysPage from "./pages/JourneysPage"
import JourneyBuilderPage from "./pages/JourneyBuilderPage"
import JourneyStatsPage from "./pages/JourneyStatsPage"
import KpiManagementPage from "./pages/KpiManagementPage"
import KpiConfigPage from "./pages/KpiConfigPage"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth()
  if (!isLoggedIn) return <Navigate to="/login" replace />
  return <>{children}</>
}

function LayoutRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  )
}

function AppRoutes() {
  const { isLoggedIn } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={isLoggedIn ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route path="/" element={<LayoutRoute><CxDashboard /></LayoutRoute>} />
      <Route path="/dashboard" element={<LayoutRoute><CxDashboard /></LayoutRoute>} />
      <Route path="/kpi/:id" element={<LayoutRoute><KpiDetailPage /></LayoutRoute>} />
      <Route path="/voc" element={<LayoutRoute><VocDashboard /></LayoutRoute>} />
      <Route path="/feedback" element={<LayoutRoute><FeedbackPage /></LayoutRoute>} />
      <Route path="/surveys" element={<LayoutRoute><SurveysPage /></LayoutRoute>} />
      <Route path="/distribution" element={<LayoutRoute><PlaceholderPage titleKey="cx.navDistribution" /></LayoutRoute>} />
      <Route path="/sending-rules" element={<LayoutRoute><PlaceholderPage titleKey="cx.navSendingRules" /></LayoutRoute>} />
      <Route path="/analytics" element={<LayoutRoute><PlaceholderPage titleKey="cx.navAnalyticsReports" /></LayoutRoute>} />
      <Route path="/closed-loop" element={<LayoutRoute><PlaceholderPage titleKey="cx.navClosedLoop" /></LayoutRoute>} />
      <Route path="/actions" element={<LayoutRoute><PlaceholderPage titleKey="cx.navActions" /></LayoutRoute>} />
      <Route path="/journeys" element={<LayoutRoute><JourneysPage /></LayoutRoute>} />
      <Route path="/journeys/:id" element={<LayoutRoute><JourneyBuilderPage /></LayoutRoute>} />
      <Route path="/journeys/:id/stats" element={<LayoutRoute><JourneyStatsPage /></LayoutRoute>} />
      <Route path="/kpi-management" element={<LayoutRoute><KpiManagementPage /></LayoutRoute>} />
      <Route path="/kpi-management/new" element={<LayoutRoute><KpiConfigPage /></LayoutRoute>} />
      <Route path="/kpi-management/:id" element={<LayoutRoute><KpiConfigPage /></LayoutRoute>} />
      <Route path="/guide" element={<ComponentGuide />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PersonaProvider>
          <AppRoutes />
        </PersonaProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
