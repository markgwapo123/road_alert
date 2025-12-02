import { useState, useEffect } from 'react'
import { PlusIcon, NewspaperIcon, EyeIcon, PencilIcon, TrashIcon, MegaphoneIcon } from '@heroicons/react/24/outline'
import axios from 'axios'
import config from '../config/index.js'

const NewsManagement = () => {
  const [newsPosts, setNewsPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPost, setEditingPost] = useState(null)
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    type: 'general',
    priority: 'normal',
    expiryDate: '',
    targetAudience: 'all',
    tags: ''
  })
  const [selectedFiles, setSelectedFiles] = useState([])
  const [filePreviewUrls, setFilePreviewUrls] = useState([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [currentAdmin, setCurrentAdmin] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalPosts: 0
  })

  useEffect(() => {
    fetchCurrentAdmin()
    fetchNewsPosts()
  }, [])

  const fetchCurrentAdmin = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await axios.get(`${config.API_BASE_URL}/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.data.success) {
        setCurrentAdmin(response.data.admin)
      }
    } catch (err) {
      console.error('Error fetching current admin:', err)
    }
  }

  const fetchNewsPosts = async (page = 1) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('adminToken')
      const response = await axios.get(`${config.API_BASE_URL}/news/admin/posts?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNewsPosts(response.data.posts)
      setPagination(response.data.pagination)
    } catch (err) {
      setError('Failed to load news posts')
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePost = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const token = localStorage.getItem('adminToken')
      
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('title', newPost.title)
      formData.append('content', newPost.content)
      formData.append('type', newPost.type)
      formData.append('priority', newPost.priority)
      formData.append('targetAudience', newPost.targetAudience)
      
      if (newPost.expiryDate) {
        formData.append('expiryDate', newPost.expiryDate)
      }
      
      if (newPost.tags) {
        formData.append('tags', newPost.tags)
      }
      
      // Append files
      selectedFiles.forEach(file => {
        formData.append('mediaFiles', file)
      })
      
      const response = await axios.post(`${config.API_BASE_URL}/news/create`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(progress)
        }
      })

      setMessage(`News post created successfully${selectedFiles.length > 0 ? ` with ${selectedFiles.length} file(s)` : ''}`)
      setShowCreateModal(false)
      resetForm()
      fetchNewsPosts()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create news post')
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  const handleUpdatePost = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const token = localStorage.getItem('adminToken')
      const postData = {
        ...newPost,
        tags: newPost.tags ? newPost.tags.split(',').map(tag => tag.trim()) : [],
        expiryDate: newPost.expiryDate || null
      }
      
      const response = await axios.put(`${config.API_BASE_URL}/news/admin/post/${editingPost._id}`, postData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setMessage('News post updated successfully')
      setEditingPost(null)
      resetForm()
      fetchNewsPosts()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update news post')
    } finally {
      setLoading(false)
    }
  }

  const deletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this news post?')) return
    
    try {
      const token = localStorage.getItem('adminToken')
      await axios.delete(`${config.API_BASE_URL}/news/admin/post/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessage('News post deleted successfully')
      fetchNewsPosts()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete news post')
    }
  }

  const resetForm = () => {
    setNewPost({
      title: '',
      content: '',
      type: 'general',
      priority: 'normal',
      expiryDate: '',
      targetAudience: 'all',
      tags: ''
    })
    setSelectedFiles([])
    setFilePreviewUrls([])
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    
    // Validate file types
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm'
    ]
    
    const validFiles = files.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        setError(`${file.name} is not a supported file type`)
        return false
      }
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        setError(`${file.name} is too large. Maximum size is 50MB`)
        return false
      }
      return true
    })
    
    if (validFiles.length > 5) {
      setError('Maximum 5 files allowed')
      return
    }
    
    setSelectedFiles(validFiles)
    
    // Create preview URLs
    const previewUrls = validFiles.map(file => {
      if (file.type.startsWith('image/')) {
        return URL.createObjectURL(file)
      }
      return null
    })
    
    setFilePreviewUrls(previewUrls)
    setError('') // Clear any previous errors
  }

  const removeFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index)
    const newPreviewUrls = filePreviewUrls.filter((_, i) => i !== index)
    
    // Clean up object URL
    if (filePreviewUrls[index]) {
      URL.revokeObjectURL(filePreviewUrls[index])
    }
    
    setSelectedFiles(newFiles)
    setFilePreviewUrls(newPreviewUrls)
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const startEdit = (post) => {
    setEditingPost(post)
    setNewPost({
      title: post.title,
      content: post.content,
      type: post.type,
      priority: post.priority,
      expiryDate: post.expiryDate ? new Date(post.expiryDate).toISOString().split('T')[0] : '',
      targetAudience: post.targetAudience,
      tags: post.tags ? post.tags.join(', ') : ''
    })
    setShowCreateModal(true)
  }

  const getPriorityBadge = (priority) => {
    const badges = {
      low: 'bg-gray-100 text-gray-800',
      normal: 'bg-blue-100 text-blue-800',
      high: 'bg-yellow-100 text-yellow-800',
      urgent: 'bg-red-100 text-red-800'
    }
    return badges[priority] || badges.normal
  }

  const getTypeBadge = (type) => {
    const badges = {
      announcement: 'bg-purple-100 text-purple-800',
      safety_tip: 'bg-green-100 text-green-800',
      road_update: 'bg-orange-100 text-orange-800',
      general: 'bg-gray-100 text-gray-800'
    }
    return badges[type] || badges.general
  }

  // Check if user has permission to create news posts
  if (currentAdmin && !currentAdmin.permissions?.includes('create_news_posts')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <MegaphoneIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-700 mb-2">Access Denied</h2>
          <p className="text-red-600">You don't have permission to manage news posts.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">News Management</h1>
          <p className="text-gray-600 mt-2">Create and manage news posts for users</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setEditingPost(null)
            setShowCreateModal(true)
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Create News Post
        </button>
      </div>

      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          {message}
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* News Posts List */}
      <div className="bg-white shadow-xl rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            News Posts ({pagination.totalPosts})
          </h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading news posts...</p>
          </div>
        ) : newsPosts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <NewspaperIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No news posts found. Create your first news post!</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type & Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stats</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {newsPosts.map((post) => (
                    <tr key={post._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 mb-1 flex items-center">
                            {post.title}
                            {post.attachments && post.attachments.length > 0 && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                                {post.attachments.length} file{post.attachments.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {post.content.substring(0, 100)}...
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            By {post.authorName} • {new Date(post.publishDate).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadge(post.type)}`}>
                          {post.type.replace('_', ' ')}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ml-2 ${getPriorityBadge(post.priority)}`}>
                          {post.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          post.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {post.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {post.expiryDate && (
                          <div className="text-xs text-gray-500 mt-1">
                            Expires: {new Date(post.expiryDate).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <EyeIcon className="w-4 h-4 mr-1" />
                          {post.views} views
                        </div>
                        <div className="text-xs text-gray-400">
                          {post.targetAudience}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(post)}
                            className="inline-flex items-center px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200"
                          >
                            <PencilIcon className="w-4 h-4 mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => deletePost(post._id)}
                            className="inline-flex items-center px-3 py-1 text-xs bg-red-100 text-red-800 rounded-md hover:bg-red-200"
                          >
                            <TrashIcon className="w-4 h-4 mr-1" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => fetchNewsPosts(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrev}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchNewsPosts(pagination.currentPage + 1)}
                    disabled={!pagination.hasNext}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Page <span className="font-medium">{pagination.currentPage}</span> of{' '}
                      <span className="font-medium">{pagination.totalPages}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => fetchNewsPosts(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === pagination.currentPage
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {editingPost ? 'Edit News Post' : 'Create New News Post'}
              </h3>
            </div>
            <form onSubmit={editingPost ? handleUpdatePost : handleCreatePost} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={newPost.title}
                  onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  maxLength={200}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
                <textarea
                  required
                  rows={6}
                  value={newPost.content}
                  onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  maxLength={2000}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {newPost.content.length}/2000 characters
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={newPost.type}
                    onChange={(e) => setNewPost({...newPost, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  >
                    <option value="general">General</option>
                    <option value="announcement">Announcement</option>
                    <option value="safety_tip">Safety Tip</option>
                    <option value="road_update">Road Update</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={newPost.priority}
                    onChange={(e) => setNewPost({...newPost, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                  <select
                    value={newPost.targetAudience}
                    onChange={(e) => setNewPost({...newPost, targetAudience: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  >
                    <option value="all">All Users</option>
                    <option value="active_users">Active Users</option>
                    <option value="new_users">New Users</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={newPost.expiryDate}
                    onChange={(e) => setNewPost({...newPost, expiryDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={newPost.tags}
                  onChange={(e) => setNewPost({...newPost, tags: e.target.value})}
                  placeholder="e.g. traffic, safety, announcement"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-500"
                />
              </div>

              {/* File Upload Section */}
              {!editingPost && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Media Files (Images/Videos)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="media-upload"
                    />
                    <label htmlFor="media-upload" className="cursor-pointer">
                      <div className="space-y-2">
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium text-blue-600 hover:text-blue-500">
                            Click to upload files
                          </span>{' '}
                          or drag and drop
                        </div>
                        <div className="text-xs text-gray-500">
                          Images: JPG, PNG, GIF, WebP | Videos: MP4, AVI, MOV, WMV, WebM
                        </div>
                        <div className="text-xs text-gray-500">
                          Maximum 5 files, 50MB each
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* File Preview */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Selected Files ({selectedFiles.length}/5)
                      </h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <div className="flex items-center space-x-3">
                              {filePreviewUrls[index] ? (
                                <img 
                                  src={filePreviewUrls[index]} 
                                  alt={file.name}
                                  className="h-10 w-10 object-cover rounded"
                                />
                              ) : (
                                <div className="h-10 w-10 bg-gray-300 rounded flex items-center justify-center">
                                  <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 2h10l-1 12H8L7 6z"></path>
                                  </svg>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {file.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatFileSize(file.size)} • {file.type.split('/')[1].toUpperCase()}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upload Progress */}
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setEditingPost(null)
                    resetForm()
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-2 px-4 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingPost ? 'Update Post' : 'Create Post')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default NewsManagement