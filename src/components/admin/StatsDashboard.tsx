import React from 'react'
import type { SuperAdminStats } from '../../types/auth'

interface StatsDashboardProps {
  stats: SuperAdminStats | null
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ stats }) => {
  if (!stats) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-50 text-blue-700 rounded-md flex items-center justify-center">
                <span className="text-sm font-semibold">K</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-xs uppercase tracking-wide text-gray-500">Toplam Kurum</dt>
                <dd className="text-2xl font-semibold text-gray-900">{stats.totalInstitutions}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-md flex items-center justify-center">
                <span className="text-sm font-semibold">U</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-xs uppercase tracking-wide text-gray-500">Toplam Kullanıcı</dt>
                <dd className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-md flex items-center justify-center">
                <span className="text-sm font-semibold">K</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-xs uppercase tracking-wide text-gray-500">Kurum Kullanıcıları</dt>
                <dd className="text-2xl font-semibold text-gray-900">{stats.institutionUsers}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-amber-50 text-amber-700 rounded-md flex items-center justify-center">
                <span className="text-sm font-semibold">N</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-xs uppercase tracking-wide text-gray-500">Kurum Dışı Kullanıcılar</dt>
                <dd className="text-2xl font-semibold text-gray-900">{stats.nonInstitutionUsers}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur rounded-xl shadow-lg hover:shadow-xl transition-shadow">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-emerald-600/10 text-emerald-700 rounded-lg flex items-center justify-center">
                <span className="text-sm font-semibold">A</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-xs uppercase tracking-wide text-gray-500">Aktif Kurum</dt>
                <dd className="text-2xl font-semibold text-gray-900">{stats.activeInstitutions}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur rounded-xl shadow-lg hover:shadow-xl transition-shadow">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-rose-600/10 text-rose-700 rounded-lg flex items-center justify-center">
                <span className="text-sm font-semibold">E</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-xs uppercase tracking-wide text-gray-500">Süresi Dolmuş</dt>
                <dd className="text-2xl font-semibold text-gray-900">{stats.expiredInstitutions}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
