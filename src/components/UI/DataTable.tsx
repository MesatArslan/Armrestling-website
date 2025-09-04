import React, { useState, useMemo } from 'react'

export interface Column<T> {
  key: string
  header: string
  width?: string
  align?: 'left' | 'center' | 'right'
  render: (item: T, index: number) => React.ReactNode
  sortable?: boolean
}

export interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  searchPlaceholder?: string
  searchKeys?: (keyof T)[]
  onRowClick?: (item: T) => void
  showSearch?: boolean
  showPagination?: boolean
  maxHeight?: string
  emptyMessage?: string
  noResultsMessage?: string
  itemsPerPageOptions?: number[]
  defaultItemsPerPage?: number
  filters?: React.ReactNode
  headerContent?: React.ReactNode
  className?: string
}

export function DataTable<T extends { id?: string | number }>({
  data,
  columns,
  searchPlaceholder = "Ara...",
  searchKeys = [],
  onRowClick,
  showSearch = true,
  showPagination = true,
  maxHeight = "calc(100vh - 350px)",
  emptyMessage = "Veri bulunamadı",
  noResultsMessage = "Aramanıza uygun sonuç bulunamadı",
  itemsPerPageOptions = [10, 20, 50, 100],
  defaultItemsPerPage = 20,
  filters,
  headerContent,
  className = ""
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage)

  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (q.length === 0) return data
    
    return data.filter(item => {
      return searchKeys.some(key => {
        const value = item[key]
        if (value === null || value === undefined) return false
        return String(value).toLowerCase().includes(q)
      })
    })
  }, [data, searchQuery, searchKeys])

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = filteredData.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll to top of table
    const tableElement = document.querySelector('.data-table')
    if (tableElement) {
      tableElement.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // Reset to first page when changing items per page
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {/* Header with search and filters */}
      {(showSearch || filters || headerContent) && (
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4 flex-1">
              {headerContent && (
                <div className="flex items-center gap-4">
                  {headerContent}
                </div>
              )}
              {showSearch && (
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white text-gray-900 placeholder-gray-400"
                  />
                  <span className="absolute left-3 top-2.5 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l3.817 3.817a1 1 0 01-1.414 1.414l-3.817-3.817A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  </span>
                </div>
              )}
            </div>
            {filters && (
              <div className="flex items-center gap-2">
                {filters}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Table */}
      <div className="overflow-x-auto data-table overflow-y-auto border-b border-gray-100" style={{ maxHeight }}>
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column.key}
                  className={`px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${
                    column.width || ''
                  } ${
                    index < columns.length - 1 ? 'border-r border-gray-200' : ''
                  } ${
                    column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {currentData.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-6 py-10 text-center text-sm text-gray-500">
                  {filteredData.length === 0 ? noResultsMessage : emptyMessage}
                </td>
              </tr>
            )}
            {currentData.map((item, index) => (
              <tr
                key={item.id || index}
                className={`odd:bg-gray-50/50 hover:bg-gray-50 transition-colors ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column, colIndex) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3 whitespace-nowrap text-sm ${
                      colIndex < columns.length - 1 ? 'border-r border-gray-200' : ''
                    } ${
                      column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {column.render(item, startIndex + index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-700">
                <span className="font-medium">{startIndex + 1}</span>
                {' - '}
                <span className="font-medium">{Math.min(endIndex, filteredData.length)}</span>
                {' / '}
                <span className="font-medium">{filteredData.length}</span>
                {' kayıt'}
              </div>
              
              {/* Items per page selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Sayfa başına:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  {itemsPerPageOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Önceki
                </button>
                
                {/* Page numbers */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sonraki
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
