import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getRiderPayments, getDriverPayments } from '../../store/slices/paymentSlice'

export default function PaymentsPage() {
  const dispatch = useDispatch()
  const { payments, loading, error } = useSelector(s => s.payment)
  const role = localStorage.getItem('role')

  useEffect(() => {
    if (role === 'RIDER') dispatch(getRiderPayments())
    else if (role === 'DRIVER') dispatch(getDriverPayments())
  }, [dispatch, role])

  const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.totalAmount || 0), 0)
  const totalEarnings = payments.reduce((sum, p) => sum + parseFloat(p.driverEarnings || 0), 0)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">
        {role === 'DRIVER' ? '💰 Earnings' : '💳 Payments'}
      </h1>
      <p className="text-gray-400 mb-6">Your complete payment history</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card text-center">
          <div className="text-3xl font-bold text-primary-500">{payments.length}</div>
          <div className="text-gray-400 text-sm mt-1">Total Transactions</div>
        </div>
        {role === 'DRIVER' ? (
          <>
            <div className="card text-center">
              <div className="text-3xl font-bold text-green-400">₹{totalEarnings.toFixed(2)}</div>
              <div className="text-gray-400 text-sm mt-1">Total Earned</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-orange-400">₹{(payments.length * 2).toFixed(2)}</div>
              <div className="text-gray-400 text-sm mt-1">Platform Commission</div>
            </div>
          </>
        ) : (
          <>
            <div className="card text-center">
              <div className="text-3xl font-bold text-green-400">₹{totalAmount.toFixed(2)}</div>
              <div className="text-gray-400 text-sm mt-1">Total Spent</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-blue-400">
                {payments.length > 0 ? `₹${(totalAmount / payments.length).toFixed(0)}` : '₹0'}
              </div>
              <div className="text-gray-400 text-sm mt-1">Avg per Ride</div>
            </div>
          </>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="card border border-red-500/30 text-red-400 text-center py-6">{error}</div>
      )}

      {!loading && !error && payments.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-5xl mb-3">💳</div>
          <p className="text-gray-400">No payment history yet</p>
        </div>
      )}

      <div className="space-y-3">
        {payments.map((payment) => (
          <div key={payment.id} className="card flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center text-xl flex-shrink-0">
                {payment.paymentMethod === 'CASH' ? '💵' : '💳'}
              </div>
              <div>
                <div className="text-white font-medium">Ride #{payment.rideId}</div>
                <div className="text-gray-400 text-sm">{payment.transactionId} · {payment.paymentMethod}</div>
                <div className="text-gray-500 text-xs mt-0.5">
                  {payment.paidAt ? new Date(payment.paidAt).toLocaleString('en-IN') : 'N/A'}
                </div>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-white font-bold text-lg">
                ₹{parseFloat(role === 'DRIVER' ? payment.driverEarnings : payment.totalAmount).toFixed(2)}
              </div>
              {role === 'DRIVER' && (
                <div className="text-xs text-gray-500">
                  Fare: ₹{parseFloat(payment.totalAmount).toFixed(2)} − ₹2 commission
                </div>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                payment.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
              }`}>{payment.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
