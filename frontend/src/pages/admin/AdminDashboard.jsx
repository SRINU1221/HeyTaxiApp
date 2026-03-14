import { useEffect, useState } from 'react'
import api from '../../services/api'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [drivers, setDrivers] = useState([])
  const [users, setUsers] = useState([])
  const [fareRules, setFareRules] = useState([])
  const [paymentStats, setPaymentStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [editingFare, setEditingFare] = useState(null)
  const [fareForm, setFareForm] = useState({})
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const results = await Promise.allSettled([
        api.get('/rides/admin/stats'),
        api.get('/drivers/admin/all'),
        api.get('/users/admin/all'),
        api.get('/fares/rules'),
        api.get('/payments/admin/stats'),
      ])
      if (results[0].status === 'fulfilled') setStats(results[0].value.data.data)
      if (results[1].status === 'fulfilled') setDrivers(results[1].value.data.data || [])
      if (results[2].status === 'fulfilled') setUsers(results[2].value.data.data || [])
      if (results[3].status === 'fulfilled') setFareRules(results[3].value.data.data || [])
      if (results[4].status === 'fulfilled') setPaymentStats(results[4].value.data.data)
    } catch (err) {
      showToast('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const verifyDriver = async (driverId) => {
    try {
      await api.patch(`/drivers/admin/${driverId}/verify`)
      showToast('Driver verified! ✅')
      loadData()
    } catch {
      showToast('Failed to verify driver', 'error')
    }
  }

  const saveFareRule = async (id) => {
    try {
      await api.put(`/fares/rules/${id}`, fareForm)
      showToast('Fare rule updated ✅')
      setEditingFare(null)
      loadData()
    } catch {
      showToast('Failed to update fare rule', 'error')
    }
  }

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'drivers', label: '🏍️ Drivers' },
    { id: 'users', label: '👥 Users' },
    { id: 'fares', label: '💰 Fare Rules' },
    { id: 'payments', label: '💳 Payments' },
  ]

  const statCards = [
    { label: 'Total Rides', value: stats?.totalRides ?? '—', color: 'text-blue-400', icon: '🚖' },
    { label: 'Completed', value: stats?.completedRides ?? '—', color: 'text-green-400', icon: '✅' },
    { label: 'Cancelled', value: stats?.cancelledRides ?? '—', color: 'text-red-400', icon: '❌' },
    { label: 'Total Revenue', value: stats ? `₹${parseFloat(stats.totalRevenue || 0).toFixed(0)}` : '—', color: 'text-yellow-400', icon: '💵' },
    { label: 'Commission', value: stats ? `₹${parseFloat(stats.totalCommission || 0).toFixed(0)}` : '—', color: 'text-primary-500', icon: '🏦' },
    { label: 'Active Drivers', value: drivers.filter(d => d.status === 'ONLINE').length, color: 'text-emerald-400', icon: '🟢' },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-full py-20">
      <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium
          ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">🛡️ Admin Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">HeyTaxi Platform Management</p>
        </div>
        <button onClick={loadData} className="btn-primary text-sm px-4 py-2">
          🔄 Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {statCards.map(s => (
          <div key={s.label} className="card text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-gray-400 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
              ${activeTab === t.id
                ? 'bg-primary-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-white font-semibold mb-4">📈 Revenue Summary</h3>
            <div className="space-y-3">
              {[
                { label: 'Total Revenue', value: `₹${parseFloat(stats?.totalRevenue || 0).toFixed(2)}`, color: 'text-yellow-400' },
                { label: 'Platform Commission (₹2/ride)', value: `₹${parseFloat(stats?.totalCommission || 0).toFixed(2)}`, color: 'text-primary-500' },
                { label: 'Driver Earnings', value: `₹${parseFloat((stats?.totalRevenue || 0) - (stats?.totalCommission || 0)).toFixed(2)}`, color: 'text-green-400' },
                { label: 'Avg Fare per Ride', value: stats?.averageFare ? `₹${parseFloat(stats.averageFare).toFixed(2)}` : '—', color: 'text-blue-400' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center border-b border-gray-700 pb-2 last:border-0">
                  <span className="text-gray-400 text-sm">{item.label}</span>
                  <span className={`font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="text-white font-semibold mb-4">🚗 Fleet Summary</h3>
            <div className="space-y-3">
              {[
                { label: 'Total Drivers', value: drivers.length },
                { label: 'Verified Drivers', value: drivers.filter(d => d.isVerified).length },
                { label: 'Pending Verification', value: drivers.filter(d => !d.isVerified).length },
                { label: 'Currently Online', value: drivers.filter(d => d.status === 'ONLINE').length },
                { label: 'Total Users', value: users.length },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center border-b border-gray-700 pb-2 last:border-0">
                  <span className="text-gray-400 text-sm">{item.label}</span>
                  <span className="font-bold text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Drivers Tab */}
      {activeTab === 'drivers' && (
        <div className="space-y-3">
          <p className="text-gray-400 text-sm">{drivers.length} total drivers</p>
          {drivers.map(driver => (
            <div key={driver.id} className="card flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center text-xl flex-shrink-0">
                  {driver.vehicleType === 'BIKE' ? '🏍️' : driver.vehicleType === 'AUTO' ? '🛺' : '🚗'}
                </div>
                <div>
                  <div className="text-white font-medium">{driver.vehicleName || 'Vehicle'}</div>
                  <div className="text-gray-400 text-sm">{driver.vehicleNumber} · {driver.vehicleType}</div>
                  <div className="text-gray-500 text-xs">User ID: {driver.userId} · Rides: {driver.totalRides}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  driver.status === 'ONLINE' ? 'bg-green-500/20 text-green-400' :
                  driver.status === 'ON_RIDE' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-gray-700 text-gray-400'
                }`}>{driver.status}</span>
                {driver.isVerified ? (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">✓ Verified</span>
                ) : (
                  <button
                    onClick={() => verifyDriver(driver.id)}
                    className="text-xs px-3 py-1 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                  >
                    Verify
                  </button>
                )}
              </div>
            </div>
          ))}
          {drivers.length === 0 && (
            <div className="card text-center py-8 text-gray-400">No drivers registered yet</div>
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-3">
          <p className="text-gray-400 text-sm">{users.length} total users</p>
          {users.map(user => (
            <div key={user.id} className="card flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-lg flex-shrink-0">
                  👤
                </div>
                <div>
                  <div className="text-white font-medium">{user.name}</div>
                  <div className="text-gray-400 text-sm">{user.email}</div>
                  <div className="text-gray-500 text-xs">{user.phoneNumber} · {user.totalRides} rides</div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">RIDER</span>
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <div className="card text-center py-8 text-gray-400">No users found</div>
          )}
        </div>
      )}

      {/* Fare Rules Tab */}
      {activeTab === 'fares' && (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">Manage fare rules. Changes take effect immediately for new ride requests.</p>
          {fareRules.map(rule => (
            <div key={rule.id} className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {rule.vehicleType === 'BIKE' ? '🏍️' : rule.vehicleType === 'AUTO' ? '🛺' : '🚗'}
                  </span>
                  <div>
                    <div className="text-white font-bold">{rule.vehicleType}</div>
                    <div className="text-green-400 text-sm">
                      ₹{rule.baseFare} base + ₹{rule.perKmRate}/km · Min ₹{rule.minimumFare}
                    </div>
                  </div>
                </div>
                {editingFare === rule.id ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveFareRule(rule.id)}
                      className="text-sm px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                    >Save</button>
                    <button
                      onClick={() => setEditingFare(null)}
                      className="text-sm px-3 py-1 bg-gray-700 text-gray-300 rounded-lg"
                    >Cancel</button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingFare(rule.id)
                      setFareForm({
                        baseFare: rule.baseFare,
                        perKmRate: rule.perKmRate,
                        minimumFare: rule.minimumFare,
                        surgeMultiplier: rule.surgeMultiplier,
                      })
                    }}
                    className="text-sm px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white rounded-lg"
                  >✏️ Edit</button>
                )}
              </div>

              {editingFare === rule.id ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: 'baseFare', label: 'Base Fare (₹)' },
                    { key: 'perKmRate', label: 'Per KM Rate (₹)' },
                    { key: 'minimumFare', label: 'Minimum Fare (₹)' },
                    { key: 'surgeMultiplier', label: 'Surge Multiplier' },
                  ].map(field => (
                    <div key={field.key}>
                      <label className="text-gray-400 text-xs block mb-1">{field.label}</label>
                      <input
                        type="number"
                        step="0.5"
                        value={fareForm[field.key] || ''}
                        onChange={e => setFareForm(f => ({ ...f, [field.key]: e.target.value }))}
                        className="input-field w-full text-sm"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  {[
                    { label: 'Base Fare', value: `₹${rule.baseFare}` },
                    { label: 'Per KM', value: `₹${rule.perKmRate}` },
                    { label: 'Minimum', value: `₹${rule.minimumFare}` },
                    { label: 'Surge', value: `${rule.surgeMultiplier}x` },
                  ].map(item => (
                    <div key={item.label} className="bg-gray-700/50 rounded-lg p-3">
                      <div className="text-gray-400 text-xs">{item.label}</div>
                      <div className="text-white font-semibold mt-1">{item.value}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-500">
                Platform commission: ₹{rule.platformCommission} per ride (fixed)
              </div>
            </div>
          ))}
          {fareRules.length === 0 && (
            <div className="card text-center py-8 text-gray-400">Fare rules loading...</div>
          )}
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          {paymentStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              {[
                { label: 'Total Transactions', value: paymentStats.totalTransactions, color: 'text-blue-400' },
                { label: 'Total Revenue', value: `₹${parseFloat(paymentStats.totalRevenue || 0).toFixed(2)}`, color: 'text-yellow-400' },
                { label: 'Commission Earned', value: `₹${parseFloat(paymentStats.totalCommission || 0).toFixed(2)}`, color: 'text-primary-500' },
                { label: 'Driver Payouts', value: `₹${parseFloat(paymentStats.totalDriverEarnings || 0).toFixed(2)}`, color: 'text-green-400' },
              ].map(item => (
                <div key={item.label} className="card text-center">
                  <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
                  <div className="text-gray-400 text-xs mt-1">{item.label}</div>
                </div>
              ))}
            </div>
          )}
          <div className="card">
            <h3 className="text-white font-semibold mb-3">💡 Commission Model</h3>
            <div className="text-gray-400 text-sm space-y-2">
              <p>• HeyTaxi charges a flat <span className="text-primary-500 font-bold">₹2 commission</span> per completed ride</p>
              <p>• Driver earns: <span className="text-green-400 font-medium">Actual Fare − ₹2</span></p>
              <p>• All payments are cash-based and auto-recorded on ride completion</p>
              <p>• Transaction ID format: <span className="text-blue-400 font-mono">HT-XXXXXXXX</span></p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
