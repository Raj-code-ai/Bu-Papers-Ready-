import api from './api';

export const publicApi = {
  siteConfig: () => api.get('/public/site-config'),
  stats: () => api.get('/public/stats'),
  taxonomy: () => api.get('/public/taxonomy'),
  latest: (limit = 8) => api.get('/public/papers/latest', { params: { limit } }),
  popular: (limit = 8) => api.get('/public/papers/popular', { params: { limit } }),
  papers: (params) => api.get('/public/papers', { params }),
  paper: (id) => api.get(`/public/papers/${id}`),
  view: (id) => api.get(`/public/papers/${id}/view`),
  download: (id) => api.get(`/public/papers/${id}/download`),
};

export const authApi = {
  login: (payload) => api.post('/auth/login', payload),
  me: () => api.get('/auth/me'),
  logout: (payload) => api.post('/auth/logout', payload),
  setup2fa: () => api.post('/auth/2fa/setup'),
  verify2fa: (payload) => api.post('/auth/2fa/verify', payload),
};

export const adminApi = {
  dashboard: () => api.get('/admin/dashboard'),
  papers: (params) => api.get('/admin/papers', { params }),
  upload: (formData) =>
    api.post('/admin/papers/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  publish: (id) => api.post(`/admin/papers/${id}/publish`),
  unpublish: (id) => api.post(`/admin/papers/${id}/unpublish`),
  softDelete: (id) => api.delete(`/admin/papers/${id}`),
  recycleBin: (params) => api.get('/admin/recycle-bin', { params }),
  restore: (id) => api.post(`/admin/recycle-bin/${id}/restore`),
  permanentDelete: (id) => api.delete(`/admin/recycle-bin/${id}`),
  uploadHistory: (params) => api.get('/admin/uploads/history', { params }),
  storage: () => api.get('/admin/storage'),
  analytics: () => api.get('/admin/analytics'),
};

export const superAdminApi = {
  dashboard: () => api.get('/superadmin/dashboard'),
  systemHealth: () => api.get('/superadmin/system-health'),
  reportsOverview: () => api.get('/superadmin/reports/overview'),
  getWebsite: () => api.get('/superadmin/website'),
  updateWebsite: (payload) => api.put('/superadmin/website', payload),
  listDevelopers: () => api.get('/superadmin/developers'),
  createDeveloper: (payload) => api.post('/superadmin/developers', payload),
  updateDeveloper: (id, payload) => api.patch(`/superadmin/developers/${id}`, payload),
  deleteDeveloper: (id) => api.delete(`/superadmin/developers/${id}`),
  uploadDeveloperPhoto: (id, formData) =>
    api.post(`/superadmin/developers/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadWebsiteLogo: (formData) =>
    api.post('/superadmin/website/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadWebsiteFavicon: (formData) =>
    api.post('/superadmin/website/favicon', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  listAdmins: (params) => api.get('/superadmin/admins', { params }),
  createAdmin: (payload) => api.post('/superadmin/admins', payload),
  resetAdminPassword: (id, payload) => api.post(`/superadmin/admins/${id}/reset-password`, payload),
  enableAdmin: (id) => api.post(`/superadmin/admins/${id}/enable`),
  disableAdmin: (id) => api.post(`/superadmin/admins/${id}/disable`),
  storageDashboard: () => api.get('/superadmin/storage-dashboard'),
  cloudHealth: () => api.get('/superadmin/cloud-health'),
  getSystemConfig: () => api.get('/superadmin/system-config'),
  updateSystemConfig: (payload) => api.put('/superadmin/system-config', payload),
  getStoragePolicy: () => api.get('/superadmin/storage-policy'),
  updateStoragePolicy: (payload) => api.put('/superadmin/storage-policy', payload),
  getSecurityPolicy: () => api.get('/superadmin/security-policy'),
  updateSecurityPolicy: (payload) => api.put('/superadmin/security-policy', payload),
  getFeatures: () => api.get('/superadmin/features'),
  updateFeature: (key, enabled) => api.put(`/superadmin/features/${key}`, { enabled }),
  auditLogs: (params) => api.get('/superadmin/audit-logs', { params }),
  loginHistory: (params) => api.get('/superadmin/login-history', { params }),
  listBackups: (params) => api.get('/superadmin/backups', { params }),
  createBackup: (payload) => api.post('/superadmin/backups', payload),
  verifyBackup: (id) => api.post(`/superadmin/backups/${id}/verify`),
  restoreBackup: (id) => api.post(`/superadmin/backups/${id}/restore`),
  downloadBackup: (id) =>
    api.get(`/superadmin/backups/${id}/download`, { responseType: 'blob' }),
  listTaxonomy: (resource, params) => api.get(`/superadmin/${resource}`, { params }),
  createTaxonomy: (resource, payload) => api.post(`/superadmin/${resource}`, payload),
  updateTaxonomy: (resource, id, payload) =>
    api.patch(`/superadmin/${resource}/${id}`, payload),
  deleteTaxonomy: (resource, id) => api.delete(`/superadmin/${resource}/${id}`),
  reorderTaxonomy: (resource, orderedIds) =>
    api.post(`/superadmin/${resource}/reorder`, { orderedIds }),
};
