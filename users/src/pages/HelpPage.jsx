import React from 'react';
import { useSettings } from '../context/SettingsContext.jsx';

const HelpPage = ({ onBack }) => {
  const { getSetting } = useSettings();
  
  const siteName = getSetting('site_name', 'BantayDalan');
  const siteDescription = getSetting('site_description', 'Community Road Alert System');
  const contactEmail = getSetting('contact_email', '');
  const contactPhone = getSetting('contact_phone', '');

  return (
    <div style={{
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '8px'
          }}
        >
          ←
        </button>
        <h1 style={{ margin: 0, fontSize: '24px' }}>Help & Support</h1>
      </div>

      {/* About Section */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px',
          marginBottom: '16px'
        }}>
          <span style={{ fontSize: '48px' }}>🚧</span>
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '20px' }}>{siteName}</h2>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>{siteDescription}</p>
          </div>
        </div>
        <p style={{ color: '#4b5563', lineHeight: 1.6 }}>
          {siteName} is a community-driven road hazard reporting platform designed to help keep 
          our roads safer. Report potholes, flooding, accidents, and other road hazards to alert 
          fellow commuters and help local authorities respond faster.
        </p>
      </div>

      {/* Contact Section */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>📞 Contact Us</h3>
        
        {contactEmail && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            marginBottom: '12px'
          }}>
            <span style={{ fontSize: '24px' }}>📧</span>
            <div>
              <div style={{ fontWeight: '500', marginBottom: '2px' }}>Email</div>
              <a 
                href={`mailto:${contactEmail}`}
                style={{ color: '#3b82f6', textDecoration: 'none' }}
              >
                {contactEmail}
              </a>
            </div>
          </div>
        )}
        
        {contactPhone && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            backgroundColor: '#f3f4f6',
            borderRadius: '8px'
          }}>
            <span style={{ fontSize: '24px' }}>📱</span>
            <div>
              <div style={{ fontWeight: '500', marginBottom: '2px' }}>Phone</div>
              <a 
                href={`tel:${contactPhone}`}
                style={{ color: '#3b82f6', textDecoration: 'none' }}
              >
                {contactPhone}
              </a>
            </div>
          </div>
        )}
        
        {!contactEmail && !contactPhone && (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
            Contact information not available at this time.
          </p>
        )}
      </div>

      {/* How to Use Section */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>📖 How to Use</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '600',
              flexShrink: 0
            }}>1</div>
            <div>
              <div style={{ fontWeight: '500', marginBottom: '4px' }}>Report a Hazard</div>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                Tap the + button to create a new report. Take a photo and enable location detection.
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '600',
              flexShrink: 0
            }}>2</div>
            <div>
              <div style={{ fontWeight: '500', marginBottom: '4px' }}>Add Details</div>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                Select the type of hazard and provide location details (province, city, barangay).
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '600',
              flexShrink: 0
            }}>3</div>
            <div>
              <div style={{ fontWeight: '500', marginBottom: '4px' }}>Submit & Track</div>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                Submit your report and track its status in "My Reports". You'll receive notifications on updates.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>❓ FAQ</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ fontWeight: '500', marginBottom: '4px' }}>How many reports can I submit per day?</div>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
              You can submit up to {getSetting('max_reports_per_day', 10)} reports per day. This resets at midnight.
            </p>
          </div>
          
          <div>
            <div style={{ fontWeight: '500', marginBottom: '4px' }}>Is my personal information visible?</div>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
              Your reports are associated with your username. Our AI automatically blurs faces and license plates in photos for privacy.
            </p>
          </div>
          
          <div>
            <div style={{ fontWeight: '500', marginBottom: '4px' }}>How are reports verified?</div>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
              Reports are reviewed by administrators for accuracy and relevance before being verified and shown to other users.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
