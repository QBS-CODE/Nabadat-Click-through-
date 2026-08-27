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
import SurveysLibraryPage from "./pages/SurveysLibraryPage"
import SurveyBuilderPage from "./pages/SurveyBuilderPage"
import UseTemplatePage from "./pages/UseTemplatePage"
import TemplateBuilderPage from "./pages/TemplateBuilderPage"
import TemplatePickerPage from "./pages/TemplatePickerPage"
import AiSurveyPage from "./pages/AiSurveyPage"
import SurveyTranslationsPage from "./pages/SurveyTranslationsPage"
import SurveyFunnelPage from "./pages/SurveyFunnelPage"
import SurveyStatsPage from "./pages/SurveyStatsPage"
import PostExpiryStorePage from "./pages/PostExpiryStorePage"
import SurveyWizardPage from "./pages/SurveyWizardPage"
import PlaceholderPage from "./pages/PlaceholderPage"
import JourneysPage from "./pages/JourneysPage"
import JourneyBuilderPage from "./pages/JourneyBuilderPage"
import JourneyStatsPage from "./pages/JourneyStatsPage"
import KpiManagementPage from "./pages/KpiManagementPage"
import KpiConfigPage from "./pages/KpiConfigPage"
import SettingsPage from "./pages/SettingsPage"
import SettingsOrganizationPage from "./pages/SettingsOrganizationPage"
import SettingsCustomerJourneyPage from "./pages/SettingsCustomerJourneyPage"
// Action Management (M-15)
import AllActionsPage from "./features/actions/pages/AllActionsPage"
import ActionFormPage from "./features/actions/pages/ActionFormPage"
import ActionDetailsPage from "./features/actions/pages/ActionDetailsPage"
// Customer Profile (M-03)
import CustomersListPage from "./features/customer-profile/pages/CustomersListPage"
import CustomerProfilePage from "./features/customer-profile/pages/CustomerProfilePage"
import ImportCustomersPage from "./features/customer-profile/pages/ImportCustomersPage"
import ProfileSetupPage from "./features/customer-profile/pages/ProfileSetupPage"
// Integration Hub (M-13)
import AllIntegrationsPage from "./features/integration-hub/pages/AllIntegrationsPage"
import IntegrationWizardPage from "./features/integration-hub/pages/IntegrationWizardPage"
import RequestLogsPage from "./features/integration-hub/pages/RequestLogsPage"
import AllServiceChannelsPage from "./features/integration-hub/pages/AllServiceChannelsPage"
import ServiceChannelFormPage from "./features/integration-hub/pages/ServiceChannelFormPage"
import AllParametersPage from "./features/integration-hub/pages/AllParametersPage"
import ParameterMappingsPage from "./features/integration-hub/pages/ParameterMappingsPage"
import { SettingsProvider } from "./contexts/settings-context"
import { TenantSwitcher } from "./components/dev/TenantSwitcher"
import { Toaster } from "./components/ui/sonner"

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

// Ported feature pages (Action Management, Integration Hub) were authored against a layout
// that provided the 32px page gutter itself. The clickthrough layout doesn't, so this adds the
// standard `px-8` gutter around them — same as every native page carries on its own root.
function ModulePage({ children }: { children: React.ReactNode }) {
  return <div className="px-8">{children}</div>
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
      {/* Survey Builder module (M-01) */}
      <Route path="/surveys" element={<LayoutRoute><SurveysLibraryPage /></LayoutRoute>} />
      <Route path="/surveys/new" element={<LayoutRoute><SurveyWizardPage /></LayoutRoute>} />
      <Route path="/surveys/post-expiry" element={<LayoutRoute><PostExpiryStorePage /></LayoutRoute>} />
      <Route path="/surveys/new/builder" element={<LayoutRoute><SurveyBuilderPage /></LayoutRoute>} />
      <Route path="/surveys/new/from-template/:templateId" element={<LayoutRoute><UseTemplatePage /></LayoutRoute>} />
      <Route path="/surveys/new/ai" element={<LayoutRoute><AiSurveyPage /></LayoutRoute>} />
      <Route path="/surveys/templates/pick" element={<LayoutRoute><TemplatePickerPage /></LayoutRoute>} />
      <Route path="/surveys/templates/new" element={<LayoutRoute><TemplateBuilderPage /></LayoutRoute>} />
      <Route path="/surveys/templates/:id/edit" element={<LayoutRoute><TemplateBuilderPage /></LayoutRoute>} />
      <Route path="/surveys/:id/edit" element={<LayoutRoute><SurveyBuilderPage /></LayoutRoute>} />
      <Route path="/surveys/:id/preview" element={<LayoutRoute><SurveyBuilderPage initialStep={2} previewFull /></LayoutRoute>} />
      <Route path="/surveys/new/translations" element={<LayoutRoute><SurveyTranslationsPage /></LayoutRoute>} />
      <Route path="/surveys/:id/translations" element={<LayoutRoute><SurveyTranslationsPage /></LayoutRoute>} />
      <Route path="/surveys/:id/funnel" element={<LayoutRoute><SurveyFunnelPage /></LayoutRoute>} />
      <Route path="/surveys/:id/stats" element={<LayoutRoute><SurveyStatsPage /></LayoutRoute>} />
      <Route path="/distribution" element={<LayoutRoute><PlaceholderPage titleKey="cx.navDistribution" /></LayoutRoute>} />
      <Route path="/sending-rules" element={<LayoutRoute><PlaceholderPage titleKey="cx.navSendingRules" /></LayoutRoute>} />
      <Route path="/analytics" element={<LayoutRoute><PlaceholderPage titleKey="cx.navAnalyticsReports" /></LayoutRoute>} />
      <Route path="/closed-loop" element={<LayoutRoute><PlaceholderPage titleKey="cx.navClosedLoop" /></LayoutRoute>} />
      {/* Action Management (M-15). Ported pages assume the layout supplies the 32px page
          gutter (as the source app-layout did via px-8); the clickthrough layout has none, so
          each module page is wrapped in ModulePage to add it — matching every native page's px-8. */}
      <Route path="/actions" element={<LayoutRoute><ModulePage><AllActionsPage /></ModulePage></LayoutRoute>} />
      <Route path="/actions/new" element={<LayoutRoute><ModulePage><ActionFormPage /></ModulePage></LayoutRoute>} />
      <Route path="/actions/:id/edit" element={<LayoutRoute><ModulePage><ActionFormPage /></ModulePage></LayoutRoute>} />
      <Route path="/actions/:id" element={<LayoutRoute><ModulePage><ActionDetailsPage /></ModulePage></LayoutRoute>} />
      {/* Customer Profile (M-03) — static /import outranks /:id */}
      <Route path="/customers" element={<LayoutRoute><ModulePage><CustomersListPage /></ModulePage></LayoutRoute>} />
      <Route path="/customers/import" element={<LayoutRoute><ModulePage><ImportCustomersPage /></ModulePage></LayoutRoute>} />
      <Route path="/customers/:id" element={<LayoutRoute><ModulePage><CustomerProfilePage /></ModulePage></LayoutRoute>} />
      <Route path="/profile-setup" element={<LayoutRoute><ModulePage><ProfileSetupPage /></ModulePage></LayoutRoute>} />
      {/* Integration Hub (M-13) */}
      <Route path="/integration-hub/integrations" element={<LayoutRoute><ModulePage><AllIntegrationsPage /></ModulePage></LayoutRoute>} />
      <Route path="/integration-hub/integrations/new" element={<LayoutRoute><ModulePage><IntegrationWizardPage /></ModulePage></LayoutRoute>} />
      <Route path="/integration-hub/integrations/:id" element={<LayoutRoute><ModulePage><IntegrationWizardPage /></ModulePage></LayoutRoute>} />
      <Route path="/integration-hub/logs" element={<LayoutRoute><ModulePage><RequestLogsPage /></ModulePage></LayoutRoute>} />
      <Route path="/integration-hub/service-channels" element={<LayoutRoute><ModulePage><AllServiceChannelsPage /></ModulePage></LayoutRoute>} />
      <Route path="/integration-hub/service-channels/new" element={<LayoutRoute><ModulePage><ServiceChannelFormPage /></ModulePage></LayoutRoute>} />
      <Route path="/integration-hub/service-channels/:id" element={<LayoutRoute><ModulePage><ServiceChannelFormPage /></ModulePage></LayoutRoute>} />
      <Route path="/integration-hub/parameters" element={<LayoutRoute><ModulePage><AllParametersPage /></ModulePage></LayoutRoute>} />
      <Route path="/integration-hub/mappings" element={<LayoutRoute><ModulePage><ParameterMappingsPage /></ModulePage></LayoutRoute>} />
      <Route path="/journeys" element={<LayoutRoute><JourneysPage /></LayoutRoute>} />
      <Route path="/journeys/:id" element={<LayoutRoute><JourneyBuilderPage /></LayoutRoute>} />
      <Route path="/journeys/:id/stats" element={<LayoutRoute><JourneyStatsPage /></LayoutRoute>} />
      <Route path="/kpi-management" element={<LayoutRoute><KpiManagementPage /></LayoutRoute>} />
      <Route path="/kpi-management/new" element={<LayoutRoute><KpiConfigPage /></LayoutRoute>} />
      <Route path="/kpi-management/:id" element={<LayoutRoute><KpiConfigPage /></LayoutRoute>} />
      <Route path="/settings" element={<LayoutRoute><SettingsPage /></LayoutRoute>} />
      <Route path="/settings/organization" element={<LayoutRoute><SettingsOrganizationPage /></LayoutRoute>} />
      <Route path="/settings/customer-journey" element={<LayoutRoute><SettingsCustomerJourneyPage /></LayoutRoute>} />
      <Route path="/guide" element={<ComponentGuide />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PersonaProvider>
          <SettingsProvider>
            <AppRoutes />
            <Toaster position="bottom-right" richColors closeButton />
            {import.meta.env.DEV && <TenantSwitcher />}
          </SettingsProvider>
        </PersonaProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
