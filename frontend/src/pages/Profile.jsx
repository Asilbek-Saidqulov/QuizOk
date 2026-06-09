import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import Topbar from '../components/layout/Topbar'
import Sidebar from '../components/layout/Sidebar'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import Card from '../components/common/Card'
import './Profile.css'

function Profile() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: '',
  })

  const handleSave = () => {
    // TODO: Implement save logic
    setEditing(false)
  }

  return (
    <div className="profile-page">
      <Topbar />
      <div className="profile-layout">
        <Sidebar />
        <main className="profile-main">
          <div className="profile-content">
            <div className="profile-header">
              <h1 className="profile-title">Profile</h1>
              <Button variant="primary" onClick={() => setEditing(!editing)}>
                {editing ? 'Cancel' : 'Edit Profile'}
              </Button>
            </div>

            <Card className="profile-card">
              <div className="profile-avatar-section">
                <div className="profile-avatar">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="profile-avatar-info">
                  <h2 className="profile-name">{user?.name || 'User'}</h2>
                  <p className="profile-email">{user?.email || ''}</p>
                  <div className="profile-level">Level {user?.level || 1}</div>
                </div>
              </div>

              {editing ? (
                <div className="profile-form">
                  <Input
                    label="Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <Input
                    label="Email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled
                  />
                  <Input
                    label="Bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Tell us about yourself"
                  />
                  <Button variant="primary" onClick={handleSave}>
                    Save Changes
                  </Button>
                </div>
              ) : (
                <div className="profile-info">
                  <div className="profile-info-item">
                    <span className="profile-info-label">Name</span>
                    <span className="profile-info-value">{user?.name || 'User'}</span>
                  </div>
                  <div className="profile-info-item">
                    <span className="profile-info-label">Email</span>
                    <span className="profile-info-value">{user?.email || ''}</span>
                  </div>
                  <div className="profile-info-item">
                    <span className="profile-info-label">Level</span>
                    <span className="profile-info-value">{user?.level || 1}</span>
                  </div>
                  <div className="profile-info-item">
                    <span className="profile-info-label">XP</span>
                    <span className="profile-info-value">{user?.xp || 0}</span>
                  </div>
                </div>
              )}
            </Card>

            <Card className="profile-settings-card">
              <h2 className="profile-section-title">Settings</h2>
              <div className="profile-settings">
                <div className="profile-setting">
                  <span>Email Notifications</span>
                  <Button variant="ghost" size="small">Configure</Button>
                </div>
                <div className="profile-setting">
                  <span>Privacy Settings</span>
                  <Button variant="ghost" size="small">Configure</Button>
                </div>
                <div className="profile-setting">
                  <span>Change Password</span>
                  <Button variant="ghost" size="small">Change</Button>
                </div>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Profile
