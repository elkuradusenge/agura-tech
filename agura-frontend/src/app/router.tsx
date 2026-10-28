/** Route table with guards for farmers and administrators. */

import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthLoading } from "../features/auth/screens";
import { useAuth } from "../features/auth/AuthProvider";
import { AdminLayout, FarmerLayout } from "../components/layout";
import { SignUpScreen, SignInScreen, ResetPasswordScreen, AdminSignInScreen } from "../features/auth/screens";
import { LandingPage } from "../features/landing/LandingPage";
import { ProductDetailScreen, ProductsScreen } from "../features/products/ProductsScreen";
import { PlantScreen } from "../features/products/PlantScreen";
import { PlantingDetailScreen, PlantingsScreen } from "../features/plantings/PlantingsScreen";
import { TodayScreen } from "../features/tasks/TodayScreen";
import { NotificationsScreen } from "../features/notifications/NotificationsScreen";
import { HelpScreen } from "../features/help/HelpScreen";
import { FundingScreen } from "../features/funding/FundingScreen";
import { SettingsScreen } from "../features/settings/SettingsScreen";


// The console is a separate, heavier bundle: farmers never download it.
const DashboardScreen = lazy(async () => ({ default: (await import("../features/admin/DashboardScreen")).DashboardScreen }));
const SurveyDataScreen = lazy(async () => ({ default: (await import("../features/admin/SurveyDataScreen")).SurveyDataScreen }));
const PlantsScreen = lazy(async () => ({ default: (await import("../features/admin/PlantsScreen")).PlantsScreen }));
const SuggestionsScreen = lazy(async () => ({ default: (await import("../features/admin/SuggestionsScreen")).SuggestionsScreen }));
const AdminProductsScreen = lazy(async () => ({ default: (await import("../features/admin/ProductsScreen")).AdminProductsScreen }));
const AdminUsersScreen = lazy(async () => ({ default: (await import("../features/admin/UsersScreen")).AdminUsersScreen }));
const MonitoringScreen = lazy(async () => ({ default: (await import("../features/admin/MonitoringScreen")).MonitoringScreen }));
const SpecialistRequestsScreen = lazy(async () => ({ default: (await import("../features/admin/SupportScreens")).SpecialistRequestsScreen }));
const FundingInterestScreen = lazy(async () => ({ default: (await import("../features/admin/SupportScreens")).FundingInterestScreen }));
const TemplatesScreen = lazy(async () => ({ default: (await import("../features/admin/TemplatesScreen")).TemplatesScreen }));
const AuditScreen = lazy(async () => ({ default: (await import("../features/admin/AuditScreen")).AuditScreen }));
const AdminSettingsScreen = lazy(async () => ({ default: (await import("../features/admin/SettingsScreen")).AdminSettingsScreen }));
const StyleGuide = lazy(async () => ({ default: (await import("../features/styleguide/StyleGuide")).StyleGuide }));

function RequireUser({ children }: { children: React.ReactNode }) {
  const { kind, loading } = useAuth();
  const location = useLocation();
  if (loading) return <AuthLoading />;
  if (kind !== "user") return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { kind, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (kind !== "admin") return <Navigate to="/admin/sign-in" replace />;
  return <>{children}</>;
}

export function AppRouter() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/sign-up" element={<SignUpScreen />} />
      <Route path="/sign-in" element={<SignInScreen />} />
      <Route path="/reset-password" element={<ResetPasswordScreen />} />
      <Route path="/admin/sign-in" element={<AdminSignInScreen />} />
      <Route path="/style-guide" element={<StyleGuide />} />

      <Route
        path="/app"
        element={
          <RequireUser>
            <FarmerLayout>
              <ProductsScreen />
            </FarmerLayout>
          </RequireUser>
        }
      />
      <Route
        path="/app/products"
        element={
          <RequireUser>
            <FarmerLayout>
              <ProductsScreen />
            </FarmerLayout>
          </RequireUser>
        }
      />
      <Route
        path="/app/products/:id"
        element={
          <RequireUser>
            <FarmerLayout>
              <ProductDetailScreen />
            </FarmerLayout>
          </RequireUser>
        }
      />
      <Route
        path="/app/products/:id/plant"
        element={
          <RequireUser>
            <FarmerLayout>
              <PlantScreen />
            </FarmerLayout>
          </RequireUser>
        }
      />
      <Route
        path="/app/plantings"
        element={
          <RequireUser>
            <FarmerLayout>
              <PlantingsScreen />
            </FarmerLayout>
          </RequireUser>
        }
      />
      <Route
        path="/app/plantings/:id"
        element={
          <RequireUser>
            <FarmerLayout>
              <PlantingDetailScreen />
            </FarmerLayout>
          </RequireUser>
        }
      />
      <Route
        path="/app/today"
        element={
          <RequireUser>
            <FarmerLayout>
              <TodayScreen />
            </FarmerLayout>
          </RequireUser>
        }
      />
      <Route
        path="/app/notifications"
        element={
          <RequireUser>
            <FarmerLayout>
              <NotificationsScreen />
            </FarmerLayout>
          </RequireUser>
        }
      />
      <Route
        path="/app/help"
        element={
          <RequireUser>
            <FarmerLayout>
              <HelpScreen />
            </FarmerLayout>
          </RequireUser>
        }
      />
      <Route
        path="/app/funding"
        element={
          <RequireUser>
            <FarmerLayout>
              <FundingScreen />
            </FarmerLayout>
          </RequireUser>
        }
      />
      <Route
        path="/app/settings"
        element={
          <RequireUser>
            <FarmerLayout>
              <SettingsScreen />
            </FarmerLayout>
          </RequireUser>
        }
      />

      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminLayout>
              <DashboardScreen />
            </AdminLayout>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/surveys"
        element={
          <RequireAdmin>
            <AdminLayout>
              <SurveyDataScreen />
            </AdminLayout>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/plants"
        element={
          <RequireAdmin>
            <AdminLayout>
              <PlantsScreen />
            </AdminLayout>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/suggestions"
        element={
          <RequireAdmin>
            <AdminLayout>
              <SuggestionsScreen />
            </AdminLayout>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/products"
        element={
          <RequireAdmin>
            <AdminLayout>
              <AdminProductsScreen />
            </AdminLayout>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/users"
        element={
          <RequireAdmin>
            <AdminLayout>
              <AdminUsersScreen />
            </AdminLayout>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/monitoring"
        element={
          <RequireAdmin>
            <AdminLayout>
              <MonitoringScreen />
            </AdminLayout>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/requests"
        element={
          <RequireAdmin>
            <AdminLayout>
              <SpecialistRequestsScreen />
            </AdminLayout>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/funding"
        element={
          <RequireAdmin>
            <AdminLayout>
              <FundingInterestScreen />
            </AdminLayout>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/templates"
        element={
          <RequireAdmin>
            <AdminLayout>
              <TemplatesScreen />
            </AdminLayout>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/audit"
        element={
          <RequireAdmin>
            <AdminLayout>
              <AuditScreen />
            </AdminLayout>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <RequireAdmin>
            <AdminLayout>
              <AdminSettingsScreen />
            </AdminLayout>
          </RequireAdmin>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
