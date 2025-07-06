import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

interface LoginProps {
  onLogin: (userData: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'student'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const userData = await api.login(formData.email, formData.password);
      
      // Check if user role matches selected role
      if (userData.user.role !== formData.role) {
        setError(`Invalid credentials for ${formData.role} role`);
        return;
      }

      onLogin(userData.user);
      // Redirect based on role using navigate
      if (userData.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/student');
      }
    } catch (err: any) {
      setError(err.error || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <h2>Welcome to GDG Connect</h2>
        <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '1.5rem' }}>
          Sign in to access your dashboard
        </p>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
          />
          
          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required
          />
          
          <div className="auth-role">
            <label>
              <input
                type="radio"
                name="role"
                value="student"
                checked={formData.role === 'student'}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
              />
              Student
            </label>
            <label>
              <input
                type="radio"
                name="role"
                value="admin"
                checked={formData.role === 'admin'}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
              />
              Admin
            </label>
          </div>
          
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <p style={{ textAlign: 'center', marginTop: '1rem' }}>
          Don't have an account?{' '}
          <Link to="/register" className="auth-link">
            Register here
          </Link>
        </p>
        
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem', fontSize: '0.9rem' }}>
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>Demo Credentials:</p>
          <p style={{ margin: '0.25rem 0', fontSize: '0.8rem' }}>
            <strong>Admin:</strong> admin@gdgconnect.com / admin123
          </p>
          <p style={{ margin: '0.25rem 0', fontSize: '0.8rem' }}>
            <strong>Student:</strong> Register a new account
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login; 