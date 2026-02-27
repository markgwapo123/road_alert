const { JSONFileSync } = require('lowdb/node')
const { LowSync } = require('lowdb')
const { v4: uuidv4 } = require('uuid')
const path = require('path')

// Create database file
const dbPath = path.join(__dirname, '../data/db.json')
const adapter = new JSONFileSync(dbPath)
const db = new LowSync(adapter, {})

// Initialize database with default data
const initializeDB = () => {
  db.read()
  
  // Set defaults if file doesn't exist
  db.data ||= {
    reports: [],
    admins: [],
    stats: {
      totalReports: 0,
      pendingReports: 0,
      verifiedReports: 0,
      rejectedReports: 0
    }
  }

  // Add default admin if none exists
  if (!db.data.admins.length) {
    db.data.admins.push({
      id: uuidv4(),
      username: 'admin',
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: 'admin123'
      email: 'admin@roadalert.com',
      role: 'admin',
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: null
    })
  }

  // Add some sample reports if none exist
  if (!db.data.reports.length) {
    const sampleReports = [
      {
        id: uuidv4(),
        type: 'pothole',
        description: 'Large pothole causing traffic disruption',
        location: {
          address: 'EDSA, Quezon City',
          coordinates: {
            latitude: 14.6507,
            longitude: 121.0280
          }
        },
        severity: 'high',
        status: 'pending',
        reportedBy: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+639123456789'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: uuidv4(),
        type: 'debris',
        description: 'Construction debris blocking lane',
        location: {
          address: 'C5 Road, Makati',
          coordinates: {
            latitude: 14.5547,
            longitude: 121.0244
          }
        },
        severity: 'medium',
        status: 'verified',
        reportedBy: {
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '+639987654321'
        },
        createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        updatedAt: new Date().toISOString(),
        verifiedAt: new Date().toISOString()
      },
      {
        id: uuidv4(),
        type: 'flooding',
        description: 'Road flooding after heavy rain',
        location: {
          address: 'Roxas Boulevard, Manila',
          coordinates: {
            latitude: 14.5764,
            longitude: 120.9822
          }
        },
        severity: 'high',
        status: 'verified',
        reportedBy: {
          name: 'Mike Johnson',
          email: 'mike@example.com',
          phone: '+639555123456'
        },
        createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        updatedAt: new Date().toISOString(),
        verifiedAt: new Date().toISOString()
      }
    ]

    db.data.reports = sampleReports
    updateStats()
  }

  db.write()
  console.log('📄 JSON Database initialized')
}

// Update statistics
const updateStats = () => {
  const reports = db.data.reports
  db.data.stats = {
    totalReports: reports.length,
    pendingReports: reports.filter(r => r.status === 'pending').length,
    verifiedReports: reports.filter(r => r.status === 'verified').length,
    rejectedReports: reports.filter(r => r.status === 'rejected').length,
    resolvedReports: reports.filter(r => r.status === 'resolved').length
  }
  db.write()
}

module.exports = {
  db,
  initializeDB,
  updateStats
}
