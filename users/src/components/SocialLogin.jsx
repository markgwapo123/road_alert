import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import FacebookLogin from 'react-facebook-login';
import './SocialLogin.css';

const SocialLogin = ({ onSocialLogin, loading }) => {
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      // Decode the JWT token to get user info
      const token = credentialResponse.credential;
      
      // Send token to backend for verification and user creation/login
      await onSocialLogin({
        provider: 'google',
        token: token
      });
    } catch (error) {
      console.error('Google login error:', error);
    }
  };

  const handleGoogleError = () => {
    console.error('Google login failed');
  };

  const handleFacebookResponse = async (response) => {
    if (response.accessToken) {
      try {
        await onSocialLogin({
          provider: 'facebook',
          token: response.accessToken,
          userData: {
            id: response.id,
            name: response.name,
            email: response.email,
            picture: response.picture?.data?.url
          }
        });
      } catch (error) {
        console.error('Facebook login error:', error);
      }
    }
  };

  return (
    <div className="social-login-container">
      <div className="social-divider">
        <span className="social-divider-text">Or continue with</span>
      </div>
      
      <div className="social-buttons">
        <div className="google-login-wrapper">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="outline"
            size="large"
            text="signin_with"
            shape="rectangular"
            width="280"
            disabled={loading}
          />
        </div>

        <div className="facebook-login-wrapper">
          <FacebookLogin
            appId={import.meta.env.VITE_FACEBOOK_APP_ID || "YOUR_FACEBOOK_APP_ID"}
            autoLoad={false}
            fields="name,email,picture"
            callback={handleFacebookResponse}
            textButton="Continue with Facebook"
            cssClass="facebook-login-button"
            icon="fa-facebook"
            disabled={loading}
          />
        </div>
      </div>
    </div>
  );
};

export default SocialLogin;