import { useState, useEffect, useMemo } from 'react'
import { 
  ChartBarIcon, 
  MapPinIcon, 
  DocumentChartBarIcon, 
  UsersIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import { reportsAPI } from '../services/api'
import api from '../services/api'

const Analytics = () => {
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [error, setError] = useState(null)
  
  // Filter states
  const [dateRange, setDateRange] = useState('30') // days
  const [selectedProvince, setSelectedProvince] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [timePeriod, setTimePeriod] = useState('daily') // daily, weekly, monthly

  useEffect(() => {
    fetchAnalyticsData()
  }, [dateRange, selectedProvince, selectedType])

  const fetchAnalyticsData = async () => {
    setLoading(true)
    try {
      // Fetch comprehensive analytics
      const [statsRes, reportsRes, usersRes] = await Promise.all([
        reportsAPI.getReportsStats(),
        reportsAPI.getAllReports({ limit: 1000 }),
        api.get('/users').catch(() => ({ data: { data: [] } }))
      ])

      const reports = reportsRes.data.data || []
      const users = usersRes.data?.data || usersRes.data?.users || []
      
      // Process analytics data
      const processedData = processAnalyticsData(reports, users, statsRes.data)
      setAnalyticsData(processedData)
      setError(null)
    } catch (err) {
      console.error('Analytics fetch error:', err)
      setError('Failed to load analytics data')
      // Use mock data for demo
      setAnalyticsData(getMockAnalyticsData())
    } finally {
      setLoading(false)
    }
  }

  const processAnalyticsData = (reports, users, stats) => {
    const now = new Date()
    const daysAgo = parseInt(dateRange)
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
    
    // Filter reports by date range
    const filteredReports = reports.filter(r => {
      const reportDate = new Date(r.createdAt)
      const matchesDate = reportDate >= startDate
      const matchesProvince = selectedProvince === 'all' || r.province === selectedProvince
      const matchesType = selectedType === 'all' || r.type === selectedType
      return matchesDate && matchesProvince && matchesType
    })

    // Reports over time
    const reportsOverTime = getReportsOverTime(filteredReports, timePeriod, daysAgo)
    
    // Reports by location
    const reportsByLocation = getReportsByLocation(filteredReports)
    
    // Reports by type
    const reportsByType = getReportsByType(filteredReports)
    
    // User activity metrics
    const userMetrics = getUserMetrics(users, filteredReports)
    
    // Get unique provinces for filter
    const provinces = [...new Set(reports.map(r => r.province).filter(Boolean))]
    const types = [...new Set(reports.map(r => r.type).filter(Boolean))]

    return {
      overview: {
        totalReports: stats.totalReports || reports.length,
        pending: stats.pending || 0,
        verified: stats.verified || 0,
        rejected: stats.rejected || 0,
        resolved: stats.resolved || 0,
        filteredCount: filteredReports.length
      },
      reportsOverTime,
      reportsByLocation,
      reportsByType,
      userMetrics,
      filters: { provinces, types }
    }
  }

  const getReportsOverTime = (reports, period, days) => {
    const data = {}
    const now = new Date()
    
    // Initialize all periods
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      let key
      
      if (period === 'daily') {
        key = date.toISOString().split('T')[0]
      } else if (period === 'weekly') {
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      } else {
        key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      }
      
      if (!data[key]) {
        data[key] = { date: key, count: 0, verified: 0, pending: 0, rejected: 0 }
      }
    }
    
    // Count reports
    reports.forEach(report => {
      const date = new Date(report.createdAt)
      let key
      
      if (period === 'daily') {
        key = date.toISOString().split('T')[0]
      } else if (period === 'weekly') {
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      } else {
        key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      }
      
      if (data[key]) {
        data[key].count++
        if (report.status === 'verified') data[key].verified++
        else if (report.status === 'pending') data[key].pending++
        else if (report.status === 'rejected') data[key].rejected++
      }
    })
    
    return Object.values(data).slice(-Math.min(Object.keys(data).length, period === 'daily' ? 14 : 8))
  }

  const getReportsByLocation = (reports) => {
    const locationCounts = {}
    
    reports.forEach(report => {
      const location = report.city || report.province || 'Unknown'
      locationCounts[location] = (locationCounts[location] || 0) + 1
    })
    
    return Object.entries(locationCounts)
      .map(([location, count]) => ({ location, count, percentage: 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((item, _, arr) => ({
        ...item,
        percentage: Math.round((item.count / reports.length) * 100) || 0
      }))
  }

  const getReportsByType = (reports) => {
    const typeCounts = {}
    const typeLabels = {
      pothole: 'Pothole',
      debris: 'Road Debris',
      flooding: 'Flooding',
      construction: 'Construction',
      accident: 'Accident',
      emergency: 'Emergency',
      caution: 'Caution',
      info: 'Information',
      safe: 'Safe Route',
      other: 'Other'
    }
    
    reports.forEach(report => {
      const type = report.type || 'other'
      typeCounts[type] = (typeCounts[type] || 0) + 1
    })
    
    const total = reports.length || 1
    return Object.entries(typeCounts)
      .map(([type, count]) => ({
        type,
        label: typeLabels[type] || type,
        count,
        percentage: Math.round((count / total) * 100)
      }))
      .sort((a, b) => b.count - a.count)
  }

  const getUserMetrics = (users, reports) => {
    const activeUsers = users.filter(u => !u.isFrozen && u.isActive !== false).length
    const totalUsers = users.length
    
    // Reports per user
    const reportsByUser = {}
    reports.forEach(report => {
      const userId = report.reportedBy?.id || report.reportedBy?._id || 'anonymous'
      reportsByUser[userId] = (reportsByUser[userId] || 0) + 1
    })
    
    const topReporters = Object.entries(reportsByUser)
      .map(([userId, count]) => {
        const user = users.find(u => u._id === userId || u.id === userId)
        return {
          userId,
          username: user?.username || user?.name || 'Anonymous',
          count
        }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
    
    const avgReportsPerUser = totalUsers > 0 ? (reports.length / totalUsers).toFixed(1) : 0
    
    return {
      totalUsers,
      activeUsers,
      avgReportsPerUser,
      topReporters,
      engagementRate: totalUsers > 0 ? Math.round((Object.keys(reportsByUser).length / totalUsers) * 100) : 0
    }
  }

  const getMockAnalyticsData = () => ({
    overview: {
      totalReports: 156,
      pending: 23,
      verified: 112,
      rejected: 15,
      resolved: 6,
      filteredCount: 156
    },
    reportsOverTime: [
      { date: '2026-01-01', count: 12, verified: 8, pending: 3, rejected: 1 },
      { date: '2026-01-02', count: 8, verified: 5, pending: 2, rejected: 1 },
      { date: '2026-01-03', count: 15, verified: 10, pending: 4, rejected: 1 },
      { date: '2026-01-04', count: 10, verified: 7, pending: 2, rejected: 1 },
      { date: '2026-01-05', count: 18, verified: 12, pending: 5, rejected: 1 },
      { date: '2026-01-06', count: 14, verified: 9, pending: 4, rejected: 1 },
      { date: '2026-01-07', count: 20, verified: 14, pending: 5, rejected: 1 }
    ],
    reportsByLocation: [
      { location: 'Kabankalan City', count: 45, percentage: 29 },
      { location: 'Bacolod City', count: 32, percentage: 21 },
      { location: 'Himamaylan City', count: 24, percentage: 15 },
      { location: 'Sipalay City', count: 18, percentage: 12 },
      { location: 'Hinigaran', count: 12, percentage: 8 }
    ],
    reportsByType: [
      { type: 'pothole', label: 'Pothole', count: 45, percentage: 29 },
      { type: 'flooding', label: 'Flooding', count: 32, percentage: 21 },
      { type: 'debris', label: 'Road Debris', count: 28, percentage: 18 },
      { type: 'construction', label: 'Construction', count: 22, percentage: 14 },
      { type: 'accident', label: 'Accident', count: 18, percentage: 12 },
      { type: 'other', label: 'Other', count: 11, percentage: 7 }
    ],
    userMetrics: {
      totalUsers: 89,
      activeUsers: 76,
      avgReportsPerUser: '1.8',
      topReporters: [
        { userId: '1', username: 'john_doe', count: 12 },
        { userId: '2', username: 'jane_smith', count: 9 },
        { userId: '3', username: 'mike_j', count: 7 },
        { userId: '4', username: 'sarah_k', count: 6 },
        { userId: '5', username: 'alex_m', count: 5 }
      ],
      engagementRate: 42
    },
    filters: {
      provinces: ['negros-occidental', 'negros-oriental'],
      types: ['pothole', 'flooding', 'debris', 'construction', 'accident', 'other']
    }
  })

  // Calculate trend (comparing to previous period)
  const calculateTrend = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  const getTypeColor = (type) => {
    const colors = {
      pothole: 'bg-red-500',
      flooding: 'bg-blue-500',
      debris: 'bg-yellow-500',
      construction: 'bg-orange-500',
      accident: 'bg-purple-500',
      emergency: 'bg-red-600',
      caution: 'bg-amber-500',
      info: 'bg-cyan-500',
      safe: 'bg-green-500',
      other: 'bg-gray-500'
    }
    return colors[type] || 'bg-gray-400'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <ChartBarIcon className="h-8 w-8 text-blue-600" />
          Analytics Dashboard
        </h1>
        <p className="text-gray-600 mt-2">Comprehensive insights and metrics for Road Alert reports</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-500" />
            <span className="font-medium text-gray-700">Filters:</span>
          </div>
          
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last Year</option>
          </select>

          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>

          <select
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Locations</option>
            {analyticsData?.filters?.provinces?.map(p => (
              <option key={p} value={p}>{p.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Report Types</option>
            {analyticsData?.filters?.types?.map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Reports</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData?.overview?.totalReports || 0}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <DocumentChartBarIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Filtered: {analyticsData?.overview?.filteredCount || 0}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{analyticsData?.overview?.pending || 0}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <CalendarDaysIcon className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Verified</p>
              <p className="text-2xl font-bold text-green-600">{analyticsData?.overview?.verified || 0}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <ArrowTrendingUpIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{analyticsData?.overview?.rejected || 0}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <ArrowTrendingDownIcon className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Resolved</p>
              <p className="text-2xl font-bold text-blue-600">{analyticsData?.overview?.resolved || 0}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* Reports Over Time Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5 text-blue-600" />
            Reports Over Time
          </h2>
          <div className="space-y-3">
            {analyticsData?.reportsOverTime?.map((item, idx) => {
              const maxCount = Math.max(...analyticsData.reportsOverTime.map(i => i.count)) || 1
              const width = (item.count / maxCount) * 100
              return (
                <div key={idx} className="group">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{item.date}</span>
                    <span className="font-medium text-gray-900">{item.count} reports</span>
                  </div>
                  <div className="h-8 bg-gray-100 rounded-lg overflow-hidden flex">
                    <div 
                      className="bg-green-500 transition-all duration-300 group-hover:bg-green-600"
                      style={{ width: `${(item.verified / (item.count || 1)) * width}%` }}
                      title={`Verified: ${item.verified}`}
                    />
                    <div 
                      className="bg-yellow-500 transition-all duration-300 group-hover:bg-yellow-600"
                      style={{ width: `${(item.pending / (item.count || 1)) * width}%` }}
                      title={`Pending: ${item.pending}`}
                    />
                    <div 
                      className="bg-red-500 transition-all duration-300 group-hover:bg-red-600"
                      style={{ width: `${(item.rejected / (item.count || 1)) * width}%` }}
                      title={`Rejected: ${item.rejected}`}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Verified</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>Pending</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Rejected</span>
            </div>
          </div>
        </div>

        {/* Reports by Type - Pie Chart Style */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DocumentChartBarIcon className="h-5 w-5 text-purple-600" />
            Reports by Type Distribution
          </h2>
          <div className="flex gap-6">
            {/* Visual Chart */}
            <div className="relative w-40 h-40 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                {(() => {
                  let cumulativePercent = 0
                  return analyticsData?.reportsByType?.map((item, idx) => {
                    const percent = item.percentage || 0
                    const strokeDasharray = `${percent} ${100 - percent}`
                    const strokeDashoffset = -cumulativePercent
                    cumulativePercent += percent
                    return (
                      <circle
                        key={idx}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke={getTypeColor(item.type).replace('bg-', '').includes('red') ? '#ef4444' : 
                                getTypeColor(item.type).replace('bg-', '').includes('blue') ? '#3b82f6' :
                                getTypeColor(item.type).replace('bg-', '').includes('yellow') ? '#eab308' :
                                getTypeColor(item.type).replace('bg-', '').includes('orange') ? '#f97316' :
                                getTypeColor(item.type).replace('bg-', '').includes('purple') ? '#a855f7' :
                                getTypeColor(item.type).replace('bg-', '').includes('green') ? '#22c55e' :
                                getTypeColor(item.type).replace('bg-', '').includes('cyan') ? '#06b6d4' :
                                getTypeColor(item.type).replace('bg-', '').includes('amber') ? '#f59e0b' : '#6b7280'}
                        strokeWidth="20"
                        strokeDasharray={`${percent * 2.51} ${251 - percent * 2.51}`}
                        strokeDashoffset={-cumulativePercent * 2.51 + percent * 2.51}
                        className="transition-all duration-500"
                      />
                    )
                  })
                })()}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {analyticsData?.reportsByType?.reduce((sum, t) => sum + t.count, 0) || 0}
                  </p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
              </div>
            </div>
            
            {/* Legend */}
            <div className="flex-1 space-y-2">
              {analyticsData?.reportsByType?.slice(0, 6).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded ${getTypeColor(item.type)}`}></div>
                    <span className="text-sm text-gray-700">{item.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">{item.count}</span>
                    <span className="text-xs text-gray-500 ml-1">({item.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* Reports by Location */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPinIcon className="h-5 w-5 text-green-600" />
            Top Locations by Reports
          </h2>
          <div className="space-y-3">
            {analyticsData?.reportsByLocation?.map((item, idx) => (
              <div key={idx} className="group">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 font-medium flex items-center gap-1">
                    <span className="text-gray-400">#{idx + 1}</span>
                    {item.location}
                  </span>
                  <span className="text-gray-600">{item.count} ({item.percentage}%)</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500 group-hover:from-green-500 group-hover:to-green-700"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
            {(!analyticsData?.reportsByLocation || analyticsData.reportsByLocation.length === 0) && (
              <p className="text-gray-500 text-center py-4">No location data available</p>
            )}
          </div>
        </div>

        {/* User Activity Metrics */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-indigo-600" />
            User Activity Metrics
          </h2>
          
          {/* User Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-indigo-50 rounded-lg p-4">
              <p className="text-sm text-indigo-600">Total Users</p>
              <p className="text-2xl font-bold text-indigo-900">{analyticsData?.userMetrics?.totalUsers || 0}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600">Active Users</p>
              <p className="text-2xl font-bold text-green-900">{analyticsData?.userMetrics?.activeUsers || 0}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600">Avg Reports/User</p>
              <p className="text-2xl font-bold text-blue-900">{analyticsData?.userMetrics?.avgReportsPerUser || 0}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-purple-600">Engagement Rate</p>
              <p className="text-2xl font-bold text-purple-900">{analyticsData?.userMetrics?.engagementRate || 0}%</p>
            </div>
          </div>

          {/* Top Reporters */}
          <h3 className="text-sm font-medium text-gray-700 mb-3">🏆 Top Contributors</h3>
          <div className="space-y-2">
            {analyticsData?.userMetrics?.topReporters?.map((user, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                    idx === 1 ? 'bg-gray-300 text-gray-700' :
                    idx === 2 ? 'bg-orange-400 text-orange-900' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="font-medium text-gray-800">{user.username}</span>
                </div>
                <span className="text-sm text-gray-600">{user.count} reports</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
        <h2 className="text-xl font-bold mb-4">📊 Quick Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-blue-100 text-sm">Most Reported Issue</p>
            <p className="text-xl font-bold mt-1">
              {analyticsData?.reportsByType?.[0]?.label || 'N/A'}
            </p>
            <p className="text-blue-200 text-sm">
              {analyticsData?.reportsByType?.[0]?.percentage || 0}% of all reports
            </p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">Busiest Location</p>
            <p className="text-xl font-bold mt-1">
              {analyticsData?.reportsByLocation?.[0]?.location || 'N/A'}
            </p>
            <p className="text-blue-200 text-sm">
              {analyticsData?.reportsByLocation?.[0]?.count || 0} reports
            </p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">Verification Rate</p>
            <p className="text-xl font-bold mt-1">
              {analyticsData?.overview?.totalReports > 0 
                ? Math.round((analyticsData.overview.verified / analyticsData.overview.totalReports) * 100)
                : 0}%
            </p>
            <p className="text-blue-200 text-sm">
              {analyticsData?.overview?.verified || 0} verified of {analyticsData?.overview?.totalReports || 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics
