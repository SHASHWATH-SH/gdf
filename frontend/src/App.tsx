import { useEffect, useState } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import './App.css';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import { api } from './services/api';

interface Student {
  id: number;
  name: string;
  department: string;
  usn: string;
  email: string;
  registered_date: string;
}

interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
  registeredStudents: number;
  slides?: string;
  slides_data?: string;
  slides_type?: string;
  recording?: string;
  recording_data?: string;
  recording_type?: string;
}

function App() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load events from database on component mount
  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const eventsData = await api.getEvents();
      
      console.log('App.tsx: Loaded events data:', eventsData);
      
      // Transform the data to match our interface
      const transformedEvents = eventsData.map((event: any) => ({
        ...event,
        registeredStudents: event.registeredStudentsCount || 0
      }));
      
      console.log('App.tsx: Transformed events:', transformedEvents.map((e: any) => ({ 
        id: e.id, 
        title: e.title, 
        slides: e.slides, 
        slides_data: e.slides_data ? 'present' : 'missing',
        recording: e.recording,
        recording_data: e.recording_data ? 'present' : 'missing'
      })));
      
      setEvents(transformedEvents);
      setError(null);
    } catch (err) {
      console.error('Failed to load events:', err);
      setError('Failed to load events. Please check if the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const addEvent = async (eventData: { title: string; description: string; date: string; location: string }) => {
    try {
      const result = await api.createEvent(eventData);
      await loadEvents(); // Reload events to get the updated list
      return result;
    } catch (err) {
      console.error('Failed to create event:', err);
      throw err;
    }
  };

  const updateEvent = async (id: number, eventData: any) => {
    try {
      console.log('App.tsx: Updating event', id, 'with data:', eventData);
      const result = await api.updateEvent(id, eventData);
      console.log('App.tsx: Update result:', result);
      await loadEvents(); // Reload events to get the updated list
    } catch (err) {
      console.error('Failed to update event:', err);
      throw err;
    }
  };

  const deleteEvent = async (id: number) => {
    try {
      await api.deleteEvent(id);
      await loadEvents(); // Reload events to get the updated list
    } catch (err) {
      console.error('Failed to delete event:', err);
      throw err;
    }
  };

  const getEventRegistrations = async (eventId: number) => {
    try {
      const registrations = await api.getRegistrations(eventId);
      return registrations;
    } catch (err) {
      console.error('Failed to get registrations:', err);
      throw err;
    }
  };

  const registerStudent = async (eventId: number, studentData: { name: string; department: string; usn: string; email: string }) => {
    try {
      console.log('App.tsx: Registering student for event', eventId, 'with data:', studentData);
      const result = await api.registerStudent(eventId, studentData);
      console.log('App.tsx: Registration successful:', result);
      
      // Update the events state immediately for better UX
      setEvents(events.map(event => 
        event.id === eventId 
          ? { ...event, registeredStudents: (event.registeredStudents || 0) + 1 }
          : event
      ));
    } catch (err) {
      console.error('Failed to register student:', err);
      throw err;
    }
  };

  const unregisterStudent = async (eventId: number, email: string) => {
    try {
      await api.unregisterStudent(eventId, email);
      // Update the events state immediately for better UX
      setEvents(events.map(event => 
        event.id === eventId 
          ? { ...event, registeredStudents: Math.max((event.registeredStudents || 0) - 1, 0) }
          : event
      ));
    } catch (err) {
      console.error('Failed to unregister student:', err);
      throw err;
    }
  };

  const getStudentRegistrations = async (email: string) => {
    try {
      const registrations = await api.getStudentRegistrations(email);
      return registrations;
    } catch (err) {
      console.error('Failed to get student registrations:', err);
      return [];
    }
  };

  // Simple role-based routing (you can enhance this with proper auth)
  const handleLogin = (userData: any) => {
    setUserRole(userData.role);
    setUser(userData);
  };

  const handleLogout = () => {
    setUserRole(null);
    setUser(null);
    setEvents([]);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.2rem',
        color: '#64748b'
      }}>
        Loading events...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{ color: '#ef4444', fontSize: '1.2rem' }}>⚠️ {error}</div>
        <button 
          onClick={loadEvents}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/register" element={<Register />} />
        <Route 
          path="/admin" 
          element={
            userRole === 'admin' 
              ? <AdminDashboard 
                  events={events} 
                  setEvents={setEvents}
                  addEvent={addEvent}
                  updateEvent={updateEvent}
                  deleteEvent={deleteEvent}
                  getEventRegistrations={getEventRegistrations}
                  onLogout={handleLogout}
                /> 
              : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/student" 
          element={
            userRole === 'student' 
              ? <StudentDashboard 
                  events={events} 
                  setEvents={setEvents}
                  registerStudent={registerStudent}
                  unregisterStudent={unregisterStudent}
                  getStudentRegistrations={getStudentRegistrations}
                  onLogout={handleLogout}
                  user={user}
                /> 
              : <Navigate to="/login" />
          } 
        />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App; 