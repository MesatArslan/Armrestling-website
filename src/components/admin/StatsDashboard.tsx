import React from 'react'
import type { SuperAdminStats } from '../../types/auth'

interface StatsDashboardProps {
  stats: SuperAdminStats | null
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ stats }) => {
  if (!stats) return null

  const statCards = [
    {
      title: 'Toplam Kurum',
      value: stats.totalInstitutions,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
        </svg>
      ),
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: 'Toplam Kullanıcı',
      value: stats.totalUsers,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.21 0-4 1.79-4 4v6h8v-6c0-2.21-1.79-4-4-4z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600'
    },
    {
      title: 'Kurum Kullanıcıları',
      value: stats.institutionUsers,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-3-3h-2M9 20H4v-2a3 3 0 013-3h2m6 5v-2a4 4 0 00-4-4H9m6 6a4 4 0 00-4-4H9" />
        </svg>
      ),
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600'
    },
    {
      title: 'Kurum Dışı Kullanıcılar',
      value: stats.nonInstitutionUsers,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422A12.083 12.083 0 0112 20.055 12.083 12.083 0 015.84 10.578L12 14z" />
        </svg>
      ),
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600'
    },
    {
      title: 'Aktif Kurum',
      value: stats.activeInstitutions,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      bgColor: 'bg-emerald-600/10',
      textColor: 'text-emerald-700'
    },
    {
      title: 'Süresi Dolmuş',
      value: stats.expiredInstitutions,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bgColor: 'bg-rose-600/10',
      textColor: 'text-rose-700'
    }
  ]

  return (
    <div className="mb-8 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pb-2">
      <div className="flex flex-nowrap gap-4 justify-start min-w-max pr-4">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white/90 backdrop-blur rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow min-w-[240px] flex-shrink-0">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-10 h-10 ${card.bgColor} ${card.textColor} rounded-md flex items-center justify-center`}>
                    {card.icon}
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs uppercase tracking-wide text-gray-500">{card.title}</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{card.value.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
