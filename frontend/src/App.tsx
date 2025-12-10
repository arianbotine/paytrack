import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './lib/stores/authStore';
import { MainLayout } from './shared/components/Layout/MainLayout';
import { GlobalNotification } from './shared/components/GlobalNotification';
import { LoadingOverlay } from './shared/components';

// Lazy load pages for code splitting
const LoginPage = lazy(() =>
  import('./features/auth/pages/LoginPage').then(m => ({
    default: m.LoginPage,
  }))
);
const DashboardPage = lazy(() =>
  import('./features/dashboard/pages/DashboardPage').then(m => ({
    default: m.DashboardPage,
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

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <>
      <GlobalNotification />
      <Suspense fallback={<LoadingOverlay open />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
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
    </>
  );
}

export default App;
