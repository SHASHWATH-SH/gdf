import { useState } from 'react';
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

interface AdminDashboardProps {
  events: Event[];
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  addEvent: (eventData: { title: string; description: string; date: string; location: string }) => Promise<any>;
  updateEvent: (id: number, eventData: any) => Promise<void>;
  deleteEvent: (id: number) => Promise<void>;
  getEventRegistrations: (eventId: number) => Promise<Student[]>;
  onLogout: () => void;
  theme: 'light' | 'dark';
  setTheme: React.Dispatch<React.SetStateAction<'light' | 'dark'>>;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  events, 
  setEvents, 
  addEvent, 
  updateEvent, 
  deleteEvent, 
  getEventRegistrations,
  onLogout,
  theme,
  setTheme
}) => {
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showRegistrations, setShowRegistrations] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<'slide'>('slide');
  const [registeredStudents, setRegisteredStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    location: ''
  });

  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate("/login");
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await addEvent(newEvent);
      setNewEvent({ title: '', description: '', date: '', location: '' });
      setShowAddEvent(false);
    } catch (error) {
      alert('Failed to add event. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveEvent = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await deleteEvent(id);
      } catch (error) {
        alert('Failed to delete event. Please try again.');
      }
    }
  };

  const handleUploadMaterial = (event: Event, type: 'slide') => {
    setSelectedEvent(event);
    setUploadType(type);
    setShowUploadModal(true);
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !selectedEvent) return;

    // Check file size (limit to 500MB for large video files)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (uploadFile.size > maxSize) {
      alert(`File too large! Maximum size is 500MB. Your file is ${(uploadFile.size / 1024 / 1024).toFixed(1)}MB`);
      return;
    }

    console.log('File size check:', {
      fileName: uploadFile.name,
      fileSize: uploadFile.size,
      maxSize: maxSize,
      isTooLarge: uploadFile.size > maxSize
    });

    // Read the actual file content and store it
    const reader = new FileReader();
    reader.onload = async (event) => {
      const fileContent = event.target?.result as string; // This will be base64
      
      try {
        console.log('Admin: Uploading file:', {
          fileName: uploadFile.name,
          fileSize: uploadFile.size,
          fileType: uploadFile.type,
          uploadType: uploadType,
          fileContentLength: fileContent.length,
          fileContentPreview: fileContent.substring(0, 100) + '...'
        });
        
        const formData = new FormData();
        formData.append('slides', uploadFile);
        
        console.log('Admin: Update data keys:', Array.from(formData.keys()));
        console.log('Admin: File data field:', 'slides');
        console.log('Admin: File data present:', !!formData.get('slides'));
        
        await fetch(`/api/events/${selectedEvent.id}/upload-slides`, {
          method: 'POST',
          body: formData,
        });

        setUploadFile(null);
        setShowUploadModal(false);
        alert(`Slides uploaded successfully!\nFile: ${uploadFile.name}\nSize: ${(uploadFile.size / 1024).toFixed(1)} KB`);
      } catch (error: any) {
        console.error('Admin: Upload failed:', error);
        alert(`Failed to upload file: ${error.message || 'Unknown error'}`);
      }
    };
    
    reader.readAsDataURL(uploadFile); // This converts file to base64
  };

  const handleViewRegistrations = async (event: Event) => {
    setSelectedEvent(event);
    try {
      const registrations = await getEventRegistrations(event.id);
      setRegisteredStudents(registrations);
      setShowRegistrations(true);
    } catch (error) {
      console.error('Failed to load registrations:', error);
      alert('Failed to load registrations. Please try again.');
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>GDG Connect - Admin Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: theme === 'light' ? '#222' : '#f3f4f6',
              color: theme === 'light' ? '#fff' : '#222',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>Total Events</h3>
            <p>{events.length}</p>
          </div>
          <div className="stat-card">
            <h3>Total Registrations</h3>
            <p>{events.reduce((sum, event) => sum + (event.registeredStudents || 0), 0)}</p>
          </div>
          <div className="stat-card">
            <h3>Active Events</h3>
            <p>{events.filter(event => new Date(event.date) >= new Date()).length}</p>
          </div>
        </div>

        <div className="dashboard-actions">
          <button 
            onClick={() => setShowAddEvent(true)} 
            className="add-event-btn"
          >
            + Add New Event
          </button>
        </div>

        {/* Add Event Modal */}
        {showAddEvent && (
          <div className="modal-overlay">
            <div className="modal">
              <h2>Add New Event</h2>
              <form onSubmit={handleAddEvent}>
                <input
                  type="text"
                  placeholder="Event Title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                  required
                />
                <textarea
                  placeholder="Event Description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                  required
                />
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                  required
                />
                <input
                  type="text"
                  placeholder="Location"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                  required
                />
                <div className="modal-actions">
                  <button type="submit" disabled={isLoading}>
                    {isLoading ? "Adding..." : "Add Event"}
                  </button>
                  <button type="button" onClick={() => setShowAddEvent(false)} disabled={isLoading}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* File Upload Modal */}
        {showUploadModal && selectedEvent && (
          <div className="modal-overlay">
            <div className="modal">
              <h2>Upload Slides</h2>
              <p className="upload-info">
                Uploading for: <strong>{selectedEvent.title}</strong>
              </p>
              <form onSubmit={handleFileUpload}>
                <div className="file-upload">
                  <input
                    type="file"
                    accept=".pdf,.ppt,.pptx,.txt"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    required
                  />
                  <p className="file-hint">
                    Accepted formats: PDF, PPT, PPTX, TXT (for testing)
                  </p>
                </div>
                <div className="modal-actions">
                  <button type="submit">Upload</button>
                  <button type="button" onClick={() => setShowUploadModal(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Student Registrations Modal */}
        {showRegistrations && selectedEvent && (
          <div className="modal-overlay">
            <div className="modal registrations-modal">
              <h2>Registered Students</h2>
              <p className="event-info">
                Event: <strong>{selectedEvent.title}</strong> 
                ({(selectedEvent.registeredStudents || 0)} students)
              </p>
              <div className="students-table">
                {registeredStudents && registeredStudents.length > 0 ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Department</th>
                        <th>USN</th>
                        <th>Email</th>
                        <th>Registered Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registeredStudents.map(student => (
                        <tr key={student.id}>
                          <td>{student.name}</td>
                          <td>{student.department}</td>
                          <td>{student.usn}</td>
                          <td>{student.email}</td>
                          <td>{student.registered_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="no-registrations">
                    <p>No students have registered for this event yet.</p>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowRegistrations(false)}>Close</button>
              </div>
            </div>
          </div>
        )}

        <div className="events-section">
          <h2>Events Management</h2>
          <div className="events-grid">
            {events.map(event => (
              <div key={event.id} className="event-card">
                <div className="event-header">
                  <h3>{event.title}</h3>
                  <button 
                    onClick={() => handleRemoveEvent(event.id)}
                    className="remove-btn"
                  >
                    ×
                  </button>
                </div>
                <p>{event.description}</p>
                <div className="event-details">
                  <span>📅 {event.date}</span>
                  <span>📍 {event.location}</span>
                  <span>👥 {event.registeredStudents || 0} students</span>
                </div>
                <div className="event-materials">
                  {event.slides && (
                    <span className="material-badge slides">📄 Slides Available</span>
                  )}
                </div>
                <div className="event-actions">
                  <button onClick={() => handleUploadMaterial(event, 'slide')}>
                    📄 Upload Slides
                  </button>
                  <button onClick={() => handleViewRegistrations(event)}>
                    👥 View Registrations ({(event.registeredStudents || 0)})
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {events.length === 0 && (
          <div className="no-events">
            <p>No events available. Create your first event to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard; 