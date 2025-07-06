import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

interface StudentDashboardProps {
  events: Event[];
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  registerStudent: (eventId: number, studentData: { name: string; department: string; usn: string; email: string }) => Promise<void>;
  unregisterStudent: (eventId: number, email: string) => Promise<void>;
  getStudentRegistrations: (email: string) => Promise<number[]>;
  onLogout: () => void;
  user: any;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ 
  events, 
  setEvents, 
  registerStudent, 
  unregisterStudent,
  getStudentRegistrations,
  onLogout,
  user
}) => {
  const [registeredEvents, setRegisteredEvents] = useState<number[]>([]);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(true);
  const [registrationForm, setRegistrationForm] = useState({
    name: "",
    department: "",
    usn: "",
    email: ""
  });

  const navigate = useNavigate();

  // Load user's registrations on component mount
  useEffect(() => {
    const loadRegistrations = async () => {
      try {
        const userEmail = user?.email || registrationForm.email;
        if (userEmail) {
          const registrations = await getStudentRegistrations(userEmail);
          setRegisteredEvents(registrations);
        }
      } catch (error) {
        console.error('Failed to load registrations:', error);
      } finally {
        setIsLoadingRegistrations(false);
      }
    };

    loadRegistrations();
  }, [user, getStudentRegistrations]);

  const handleLogout = () => {
    onLogout();
    navigate("/login");
  };

  const handleRegister = async (eventId: number) => {
    if (registeredEvents.includes(eventId)) {
      // Unregister
      try {
        await unregisterStudent(eventId, user?.email || registrationForm.email);
        setRegisteredEvents(prev => prev.filter(id => id !== eventId));
        
        // Update the events state to reflect the unregistration
        setEvents(events.map(event => 
          event.id === eventId 
            ? { ...event, registeredStudents: Math.max((event.registeredStudents || 0) - 1, 0) }
            : event
        ));
        
        alert('Successfully unregistered from the event!');
      } catch (error) {
        alert('Failed to unregister. Please try again.');
      }
    } else {
      // Show registration form with user's email pre-filled
      setSelectedEventId(eventId);
      setRegistrationForm({
        name: "",
        department: "",
        usn: "",
        email: user?.email || ""
      });
      setShowRegistrationForm(true);
    }
  };

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEventId) return;

    // Validate all required fields
    if (!registrationForm.name || !registrationForm.department || !registrationForm.usn || !registrationForm.email) {
      alert('Please fill in all required fields.');
      return;
    }

    console.log('Submitting registration:', { eventId: selectedEventId, ...registrationForm });

    try {
      console.log('Calling registerStudent with:', { selectedEventId, registrationForm });
      const result = await registerStudent(selectedEventId, registrationForm);
      console.log('Registration result:', result);

      // Add event to registered events
      setRegisteredEvents(prev => {
        const newRegisteredEvents = [...prev, selectedEventId];
        console.log('Updated registered events:', newRegisteredEvents);
        return newRegisteredEvents;
      });

      // Update the events state to reflect the new registration
      setEvents(events.map(event => 
        event.id === selectedEventId 
          ? { ...event, registeredStudents: (event.registeredStudents || 0) + 1 }
          : event
      ));

      // Reset form and close modal
      setRegistrationForm({ name: "", department: "", usn: "", email: user?.email || "" });
      setShowRegistrationForm(false);
      setSelectedEventId(null);

      alert(`✅ Successfully registered for the event!\nName: ${registrationForm.name}\nUSN: ${registrationForm.usn}`);
    } catch (error: any) {
      console.error('Registration error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      if (error.error) {
        alert(`Registration failed: ${error.error}`);
      } else if (error.message) {
        alert(`Registration failed: ${error.message}`);
      } else {
        alert('Failed to register. Please try again.');
      }
    }
  };

  const handleDownloadMaterial = (fileName: string, type: 'slide' | 'recording') => {
    console.log('Download request:', { fileName, type });
    console.log('Available events:', events.map(e => ({ id: e.id, slides: e.slides, recording: e.recording })));
    
    // Find the event that contains this material
    const event = events.find(e => 
      (type === 'slide' && e.slides === fileName) || 
      (type === 'recording' && e.recording === fileName)
    );
    
    console.log('Found event:', event);
    
    if (!event) {
      alert('❌ File not found!');
      return;
    }
    
    // Get the actual file data
    const fileData = type === 'slide' ? event.slides_data : event.recording_data;
    const fileType = type === 'slide' ? event.slides_type : event.recording_type;

    console.log('File details:', {
      fileName,
      fileData: fileData ? `Data present (${fileData.length} chars)` : 'No data',
      fileType,
      eventId: event.id,
      type
    });
    
    if (!fileData) {
      alert('❌ File data not available!');
      return;
    }
    
    // Convert base64 to blob
    const base64Response = fetch(fileData);
    base64Response.then(res => res.blob()).then(blob => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      
      // Add file size information
      const fileSize = (blob.size / 1024).toFixed(1);
      console.log(`Downloading ${type} file: ${fileName} (${fileSize} KB)`);
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      // Show success message with file size
      alert(`✅ Downloaded ${type}: ${fileName}\nFile size: ${fileSize} KB`);
    }).catch(error => {
      console.error('Download error:', error);
      alert('❌ Error downloading file!');
    });
  };

  const isRegistered = (eventId: number) => {
    // Check if the current user is registered for this event
    const registered = registeredEvents.includes(eventId);
    console.log(`Event ${eventId} registered:`, registered, 'Registered events:', registeredEvents);
    return registered;
  };

  if (isLoadingRegistrations) {
    return (
      <div className="dashboard">
        <header className="dashboard-header">
          <h1>GDG Connect - Student Dashboard</h1>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </header>
        <div className="dashboard-content" style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '50vh',
          fontSize: '1.2rem',
          color: '#64748b'
        }}>
          Loading your registrations...
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>GDG Connect - Student Dashboard</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </header>

      <div className="dashboard-content">
        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>Total Events</h3>
            <p>{events.length}</p>
          </div>
          <div className="stat-card">
            <h3>Registered Events</h3>
            <p>{registeredEvents.length}</p>
          </div>
          <div className="stat-card">
            <h3>Available Materials</h3>
            <p>{events.filter(event => event.slides || event.recording).length}</p>
          </div>
        </div>

        {/* Registration Form Modal */}
        {showRegistrationForm && selectedEventId && (
          <div className="modal-overlay">
            <div className="modal">
              <h2>Register for Event</h2>
              <p className="registration-info">
                Event: <strong>{events.find(e => e.id === selectedEventId)?.title}</strong>
              </p>
              <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>
                Please fill in your details to register for this event.
              </p>
              <form onSubmit={handleRegistrationSubmit}>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={registrationForm.name}
                  onChange={(e) => setRegistrationForm({...registrationForm, name: e.target.value})}
                  required
                />
                <input
                  type="text"
                  placeholder="Department"
                  value={registrationForm.department}
                  onChange={(e) => setRegistrationForm({...registrationForm, department: e.target.value})}
                  required
                />
                <input
                  type="text"
                  placeholder="USN (University Serial Number)"
                  value={registrationForm.usn}
                  onChange={(e) => setRegistrationForm({...registrationForm, usn: e.target.value})}
                  required
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={registrationForm.email}
                  onChange={(e) => setRegistrationForm({...registrationForm, email: e.target.value})}
                  required
                />
                <div className="modal-actions">
                  <button type="submit">Register</button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowRegistrationForm(false);
                      setSelectedEventId(null);
                      setRegistrationForm({ name: "", department: "", usn: "", email: "" });
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="events-section">
          <h2>Available Events</h2>
          <div className="events-grid">
            {events.map(event => (
              <div key={event.id} className={`event-card ${isRegistered(event.id) ? 'registered' : ''}`}>
                <div className="event-header">
                  <h3>{event.title}</h3>
                  {isRegistered(event.id) && (
                    <span className="registered-badge">Registered</span>
                  )}
                </div>
                <p>{event.description}</p>
                <div className="event-details">
                  <span>📅 {event.date}</span>
                  <span>📍 {event.location}</span>
                </div>
                
                {/* Event Materials */}
                <div className="event-materials">
                  {event.slides && (
                    <div className="material-item">
                      <span className="material-badge slides">📄 Slides Available</span>
                      <button 
                        onClick={() => handleDownloadMaterial(event.slides!, 'slide')}
                        className="material-download-btn"
                      >
                        Download
                      </button>
                    </div>
                  )}
                  {event.recording && (
                    <div className="material-item">
                      <span className="material-badge recording">🎥 Recording Available</span>
                      <button 
                        onClick={() => handleDownloadMaterial(event.recording!, 'recording')}
                        className="material-download-btn"
                      >
                        Download
                      </button>
                      {/* Video player for viewing the recording */}
                      <video controls width="320" style={{ marginTop: '0.5rem' }}>
                        <source src={`/api/events/${event.id}/recording`} type={event.recording_type || 'video/mp4'} />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  )}
                </div>

                <div className="event-actions">
                  <button 
                    onClick={() => handleRegister(event.id)}
                    className={isRegistered(event.id) ? 'unregister-btn' : 'register-btn'}
                  >
                    {isRegistered(event.id) ? '❌ Unregister' : '✅ Register'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {events.length === 0 && (
          <div className="no-events">
            <p>No events available at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard; 