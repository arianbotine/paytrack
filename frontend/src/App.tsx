import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./lib/stores/authStore";
import { MainLayout } from "./shared/components/Layout/MainLayout";
import { GlobalNotification } from "./shared/components/GlobalNotification";
import { LoginPage } from "./features/auth/pages/LoginPage";
import { DashboardPage } from "./features/dashboard/pages/DashboardPage";
import { CustomersPage } from "./features/customers/pages/CustomersPage";
import { VendorsPage } from "./features/vendors/pages/VendorsPage";
import { CategoriesPage } from "./features/categories/pages/CategoriesPage";
import { TagsPage } from "./features/tags/pages/TagsPage";
import { PayablesPage } from "./features/payables/pages/PayablesPage";
import { ReceivablesPage } from "./features/receivables/pages/ReceivablesPage";
import { PaymentsPage } from "./features/payments/pages/PaymentsPage";
import { UsersPage } from "./features/users/pages/UsersPage";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <>
      <GlobalNotification />
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
    </>
  );
}

export default App;
