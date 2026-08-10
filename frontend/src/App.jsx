import { Navigate, Route, Routes } from 'react-router-dom';
import StudentLayout from './components/layout/StudentLayout';
import AdminLayout from './components/layout/AdminLayout';
import SuperAdminLayout from './components/layout/SuperAdminLayout';
import HomePage from './pages/student/HomePage';
import BrowsePage from './pages/student/BrowsePage';
import PaperDetailPage from './pages/student/PaperDetailPage';
import AboutPage from './pages/public/AboutPage';
import DevelopersPage from './pages/public/DevelopersPage';
import ContactPage from './pages/public/ContactPage';
import LoginPage from './pages/auth/LoginPage';
import Setup2FAPage from './pages/auth/Setup2FAPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUploadPage from './pages/admin/AdminUploadPage';
import AdminPapersPage from './pages/admin/AdminPapersPage';
import AdminRecycleBinPage from './pages/admin/AdminRecycleBinPage';
import AdminStoragePage from './pages/admin/AdminStoragePage';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import SuperAdminInstitutionPage from './pages/superadmin/SuperAdminInstitutionPage';
import SuperAdminAdminsPage from './pages/superadmin/SuperAdminAdminsPage';
import SuperAdminSystemPage from './pages/superadmin/SuperAdminSystemPage';
import SuperAdminDevelopersPage from './pages/superadmin/SuperAdminDevelopersPage';
import SuperAdminAcademicPage from './pages/superadmin/SuperAdminAcademicPage';
import SuperAdminAuditPage from './pages/superadmin/SuperAdminAuditPage';
import SuperAdminLoginHistoryPage from './pages/superadmin/SuperAdminLoginHistoryPage';
import SuperAdminStoragePolicyPage from './pages/superadmin/SuperAdminStoragePolicyPage';
import SuperAdminSecurityPage from './pages/superadmin/SuperAdminSecurityPage';
import SuperAdminFeaturesPage from './pages/superadmin/SuperAdminFeaturesPage';
import SuperAdminBackupsPage from './pages/superadmin/SuperAdminBackupsPage';
import SuperAdminHealthPage from './pages/superadmin/SuperAdminHealthPage';
import NotFoundPage from './pages/NotFoundPage';
import ForbiddenPage from './pages/ForbiddenPage';
import ServerErrorPage from './pages/ServerErrorPage';
import ProtectedRoute from './routes/ProtectedRoute';

function DraftsPage() {
  return <AdminPapersPage statusFilter="draft" title="Drafts" />;
}

function PublishedPage() {
  return <AdminPapersPage statusFilter="published" title="Published papers" />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<StudentLayout />}>
        <Route index element={<HomePage />} />
        <Route path="papers" element={<BrowsePage />} />
        <Route path="browse" element={<Navigate to="/papers" replace />} />
        <Route path="papers/:id" element={<PaperDetailPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="developers" element={<DevelopersPage />} />
        <Route path="contact" element={<ContactPage />} />
      </Route>

      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/setup-2fa"
        element={
          <ProtectedRoute roles={['superadmin']} allowTwoFactorSetup>
            <Setup2FAPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['admin', 'superadmin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="upload" element={<AdminUploadPage />} />
        <Route path="papers" element={<AdminPapersPage />} />
        <Route path="drafts" element={<DraftsPage />} />
        <Route path="published" element={<PublishedPage />} />
        <Route path="recycle-bin" element={<AdminRecycleBinPage />} />
        <Route path="storage" element={<AdminStoragePage />} />
      </Route>

      <Route
        path="/superadmin"
        element={
          <ProtectedRoute roles={['superadmin']}>
            <SuperAdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<SuperAdminDashboard />} />
        <Route path="academic" element={<SuperAdminAcademicPage />} />
        <Route path="institution" element={<SuperAdminInstitutionPage />} />
        <Route path="developers" element={<SuperAdminDevelopersPage />} />
        <Route path="admins" element={<SuperAdminAdminsPage />} />
        <Route path="storage-policy" element={<SuperAdminStoragePolicyPage />} />
        <Route path="security" element={<SuperAdminSecurityPage />} />
        <Route path="features" element={<SuperAdminFeaturesPage />} />
        <Route path="audit-logs" element={<SuperAdminAuditPage />} />
        <Route path="login-history" element={<SuperAdminLoginHistoryPage />} />
        <Route path="backups" element={<SuperAdminBackupsPage />} />
        <Route path="health" element={<SuperAdminHealthPage />} />
        <Route path="system" element={<SuperAdminSystemPage />} />
      </Route>

      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="/500" element={<ServerErrorPage />} />
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
