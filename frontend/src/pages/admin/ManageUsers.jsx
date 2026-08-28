import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Users, Edit2, Trash2, UserCheck } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useLanguage } from '../../context/LanguageContext';

export const ManageUsers = () => {
  const { lang, t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState(2);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data);
    } catch (err) {
      console.error("Error loading users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEdit = (u) => {
    setError('');
    setEditingUser(u);
    setFullName(u.full_name);
    setEmail(u.email);
    setRoleId(u.role_id);
    setIsActive(u.is_active);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.put(`/admin/users/${editingUser.id}`, {
        full_name: fullName,
        email: email,
        role_id: parseInt(roleId),
        is_active: isActive
      });
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user account permanently?")) return;
    try {
      await api.delete(`/admin/users/${id}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to delete user.");
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Header Workstation Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-md p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-extrabold text-xs border border-slate-300 dark:border-slate-700">
              {lang === 'tl' ? 'DIREKTORYO NG MGA GUMAGAMIT' : 'SYSTEM USER DIRECTORY'}
            </span>
          </div>
          <h1 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 tracking-tight">
            <Users className="w-5 h-5 text-slate-900 dark:text-slate-100" />
            {t('userDirectory')}
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
            {t('realtimeMonitoring')}
          </p>
        </div>
      </div>

      <Card title={t('userDirectory')} subtitle={`Total Accounts Enrolled: ${users.length}`}>
        {loading ? (
          <LoadingSpinner label={t('analyzingImage')} />
        ) : users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-950/80 border-b border-slate-300 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 font-sans">
                  <th className="py-2.5 px-3">{t('fullNameLabel')}</th>
                  <th className="py-2.5 px-3">{t('emailLabel')}</th>
                  <th className="py-2.5 px-3">{t('roleLabel')}</th>
                  <th className="py-2.5 px-3">{t('status')}</th>
                  <th className="py-2.5 px-3 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 dark:divide-slate-800 text-xs font-sans">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">{u.full_name}</td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-mono font-medium">{u.email}</td>
                    <td className="py-2.5 px-3">
                      <Badge variant={u.role?.name === 'admin' ? 'danger' : 'info'} className="text-xs">
                        {u.role?.name === 'admin' ? t('userRoleAdmin') : t('userRoleFarmer')}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant={u.is_active ? 'success' : 'neutral'} className="text-xs">
                        {u.is_active ? t('activeTarget') : t('inactive')}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(u)}
                          aria-label={`Edit user ${u.full_name}`}
                          className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                          title="Edit User"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          aria-label={`Delete user ${u.full_name}`}
                          className="p-1.5 text-slate-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-slate-500 dark:text-slate-400 py-6 text-xs">{t('noUsers')}</p>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`${t('edit')}: ${editingUser?.full_name}`}
      >
        {error && <Alert type="danger" className="mb-3">{error}</Alert>}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">{t('fullNameLabel')} *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100 font-bold min-h-[38px]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">{t('emailLabel')} *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100 font-bold min-h-[38px]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">{t('roleLabel')}</label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100 font-bold min-h-[38px]"
            >
              <option value={1}>{t('userRoleAdmin')}</option>
              <option value={2}>{t('userRoleFarmer')}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">{t('status')}</label>
            <select
              value={isActive ? 'active' : 'inactive'}
              onChange={(e) => setIsActive(e.target.value === 'active')}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100 font-bold min-h-[38px]"
            >
              <option value="active">{t('activeTarget')}</option>
              <option value="inactive">{t('inactive')}</option>
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-300 dark:border-slate-800">
            <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>{t('cancel')}</Button>
            <Button type="submit" variant="primary" size="sm" disabled={submitting}>
              {submitting ? 'Saving...' : t('save')}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

