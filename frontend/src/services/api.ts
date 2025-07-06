const API_BASE_URL = 'http://localhost:5000/api';

// API service for authentication, events and registrations
export const api = {
  // Authentication
  login: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  register: async (email: string, password: string, name: string, department: string, usn: string) => {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name, department, usn }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }
    return response.json();
  },

  // Events
  getEvents: async () => {
    const response = await fetch(`${API_BASE_URL}/events`);
    if (!response.ok) throw new Error('Failed to fetch events');
    return response.json();
  },

  createEvent: async (eventData: { title: string; description: string; date: string; location: string }) => {
    const response = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });
    if (!response.ok) throw new Error('Failed to create event');
    return response.json();
  },

  updateEvent: async (id: number, eventData: any) => {
    console.log('API: Updating event', id, 'with data:', eventData);
    
    const response = await fetch(`${API_BASE_URL}/events/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });
    
    console.log('API: Update response status:', response.status);
    
    if (!response.ok) {
      const error = await response.json();
      console.error('API: Update failed:', error);
      throw new Error('Failed to update event');
    }
    
    const result = await response.json();
    console.log('API: Update successful:', result);
    return result;
  },

  deleteEvent: async (id: number) => {
    const response = await fetch(`${API_BASE_URL}/events/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete event');
    return response.json();
  },

  // Registrations
  getRegistrations: async (eventId: number) => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/registrations`);
    if (!response.ok) throw new Error('Failed to fetch registrations');
    return response.json();
  },

  registerStudent: async (eventId: number, studentData: { name: string; department: string; usn: string; email: string }) => {
    console.log('API: Making registration request to:', `${API_BASE_URL}/events/${eventId}/register`);
    console.log('API: Request body:', studentData);
    
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(studentData),
    });
    
    console.log('API: Response status:', response.status);
    console.log('API: Response ok:', response.ok);
    
    if (!response.ok) {
      const error = await response.json();
      console.error('API: Registration failed:', error);
      throw error;
    }
    
    const result = await response.json();
    console.log('API: Registration successful:', result);
    return result;
  },

  unregisterStudent: async (eventId: number, email: string) => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/unregister`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) throw new Error('Failed to unregister student');
    return response.json();
  },

  checkRegistration: async (eventId: number, email: string) => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/check-registration?email=${encodeURIComponent(email)}`);
    if (!response.ok) throw new Error('Failed to check registration');
    return response.json();
  },

  getStudentRegistrations: async (email: string) => {
    const response = await fetch(`${API_BASE_URL}/student/${encodeURIComponent(email)}/registrations`);
    if (!response.ok) throw new Error('Failed to get student registrations');
    return response.json();
  },
}; 