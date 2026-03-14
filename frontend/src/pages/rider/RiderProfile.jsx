import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { userAPI } from '../../services/api';

export default function RiderProfile() {
  const { user: authUser } = useSelector(s => s.auth);
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phoneNumber: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      // Use /me endpoint which returns role too
      const res = await userAPI.getMe();
      const p = res.data.data;
      setProfile(p);
      setForm({ name: p.name || '', phoneNumber: p.phoneNumber || '' });
    } catch (e) {
      // Fallback to /profile
      try {
        const res = await userAPI.getProfile();
        const p = res.data.data;
        setProfile(p);
        setForm({ name: p.name || '', phoneNumber: p.phoneNumber || '' });
      } catch {
        setMsg('Failed to load profile');
      }
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await userAPI.updateProfile(form);
      setProfile(res.data.data);
      setEditing(false);
      setMsg('Profile updated!');
      setTimeout(() => setMsg(''), 3000);
    } catch { setMsg('Failed to update'); }
    finally { setSaving(false); }
  };

  // Use authUser as fallback while profile loads
  const displayName = profile?.name || authUser?.name || '?';
  const displayEmail = profile?.email || authUser?.email || '';
  const displayRole = profile?.role || authUser?.role || 'RIDER';

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">My Profile</h1>

      {msg && (
        <div className={`p-3 rounded-lg text-sm font-medium ${msg.includes('Failed') ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
          {msg}
        </div>
      )}

      {/* Avatar + Role card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-3xl font-bold text-white">
          {displayName[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{displayName}</h2>
          <p className="text-gray-400 text-sm">{displayEmail}</p>
          <span className="inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
            🧑 {displayRole}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
          <div className="text-3xl font-bold text-white">{profile?.totalRides ?? 0}</div>
          <div className="text-gray-400 text-sm mt-1">Total Rides</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
          <div className="text-3xl font-bold text-white">
            {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
          </div>
          <div className="text-gray-400 text-sm mt-1">Member Since</div>
        </div>
      </div>

      {/* Editable Details */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-semibold">Personal Details</h3>
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-sm text-orange-400 hover:text-orange-300 transition-colors">
              ✏️ Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Full Name</label>
              <input
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Phone Number</label>
              <input
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500"
                value={form.phoneNumber}
                onChange={e => setForm(p => ({ ...p, phoneNumber: e.target.value.replace(/\D/g, '') }))}
                placeholder="10-digit phone"
                maxLength={10}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => { setEditing(false); setForm({ name: profile?.name || '', phoneNumber: profile?.phoneNumber || '' }) }}
                className="flex-1 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold py-3 rounded-xl transition-colors">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {[
              { label: 'Name', value: profile?.name },
              { label: 'Email', value: profile?.email },
              { label: 'Phone', value: profile?.phoneNumber || 'Not set' },
              { label: 'Role', value: displayRole },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                <span className="text-gray-400 text-sm">{label}</span>
                <span className="text-white text-sm font-medium">{value || '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
