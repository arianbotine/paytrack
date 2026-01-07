import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, isAuthenticated } from './lib/stores/authStore';
import { useServerKeepAlive } from './lib/hooks/useServerKeepAlive';
import { MainLayout } from './shared/components/Layout/MainLayout';
import { AdminLayout } from './shared/components/Layout/AdminLayout';
import { GlobalNotification } from './shared/components/GlobalNotification';
import { LoadingOverlay } from './shared/components';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import { ServerWakeupDialog } from './shared/components/ServerWakeupDialog';

// Lazy load pages for code splitting
const LoginPage = lazy(() =>
  import('./features/auth/pages/LoginPage').then(m => ({
    default: m.LoginPage,
  }))
);
const SelectOrganizationPage = lazy(() =>
  import('./features/auth/pages/SelectOrganizationPage').then(m => ({
    default: m.SelectOrganizationPage,
  }))
);
const ChangePasswordPage = lazy(() =>
  import('./features/auth/pages/ChangePasswordPage').then(m => ({
    default: m.ChangePasswordPage,
  }))
);
const DashboardPage = lazy(() =>
  import('./features/dashboard/pages/DashboardPage').then(m => ({
    default: m.DashboardPage,
  }))
);
const AdminDashboardPage = lazy(() =>
  import('./features/admin/pages/AdminDashboardPage').then(m => ({
    default: m.AdminDashboardPage,
  }))
);
const AdminOrganizationsPage = lazy(() =>
  import('./features/admin/pages/AdminOrganizationsPage').then(m => ({
    default: m.AdminOrganizationsPage,
  }))
);
const AdminUsersPage = lazy(() =>
  import('./features/admin/pages/AdminUsersPage').then(m => ({
    default: m.AdminUsersPage,
  }))
);
const CustomersPage = lazy(() =>
  import('./features/customers/pages/CustomersPage').then(m => ({
    default: m.CustomersPage,
  }))
);
const VendorsPage = lazy(() =>
  import('./features/vendors/pages/VendorsPage').then(m => ({
    default: m.VendorsPage,
  }))
);
const CategoriesPage = lazy(() =>
  import('./features/categories/pages/CategoriesPage').then(m => ({
    default: m.CategoriesPage,
  }))
);
const TagsPage = lazy(() =>
  import('./features/tags/pages/TagsPage').then(m => ({
    default: m.TagsPage,
  }))
);
const PayablesPage = lazy(() =>
  import('./features/payables/pages/PayablesPage').then(m => ({
    default: m.PayablesPage,
  }))
);
const ReceivablesPage = lazy(() =>
  import('./features/receivables/pages/ReceivablesPage').then(m => ({
    default: m.ReceivablesPage,
  }))
);
const PaymentsPage = lazy(() =>
  import('./features/payments/pages/PaymentsPage').then(m => ({
    default: m.PaymentsPage,
  }))
);
const UsersPage = lazy(() =>
  import('./features/users/pages/UsersPage').then(m => ({
    default: m.UsersPage,
  }))
);

function PrivateRoute({ children }: Readonly<{ children: React.ReactNode }>) {
  const authenticated = useAuthStore(isAuthenticated);
  return authenticated ? <>{children}</> : <Navigate to="/login" />;
}

function AdminRoute({ children }: Readonly<{ children: React.ReactNode }>) {
  const authenticated = useAuthStore(isAuthenticated);
  const user = useAuthStore(state => state.user);

  if (!authenticated) {
    return <Navigate to="/login" />;
  }

  if (!user?.isSystemAdmin) {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
}

function App() {
  // Hook global para manter servidor ativo (ping a cada 5 minutos)
  useServerKeepAlive();

  return (
    <ErrorBoundary>
      <GlobalNotification />
      <ServerWakeupDialog />
      <Suspense fallback={<LoadingOverlay open />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/select-organization"
            element={<SelectOrganizationPage />}
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="organizations" element={<AdminOrganizationsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
          </Route>
          <Route
            path="/"
            element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="change-password" element={<ChangePasswordPage />} />
            <Route path="payables" element={<PayablesPage />} />
            <Route path="receivables" element={<ReceivablesPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="vendors" element={<VendorsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="tags" element={<TagsPage />} />
            <Route path="users" element={<UsersPage />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
