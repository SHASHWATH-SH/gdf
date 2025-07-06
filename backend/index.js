const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
// Try to load .env file if it exists
try {
  require('dotenv').config();
} catch (error) {
  console.log('No .env file found, using default values');
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for file uploads

const upload = multer({ limits: { fileSize: 200 * 1024 * 1024 } }); // 200MB limit

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// MySQL connection with fallback values
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gdg_connect',
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    console.log('Please make sure MySQL is running and the database "gdg_connect" exists');
    console.log('You can create the database by running: CREATE DATABASE gdg_connect;');
    // Don't exit immediately, let the server start and show the error
  } else {
    console.log('Connected to MySQL database');
  }
});

// Authentication endpoints

// Login endpoint
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = results[0];
    //console.log('Login attempt:', { email, password, userPassword: user.password, role: user.role });
    const match = await bcrypt.compare(password, user.password);
    //console.log('Password match result:', match);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    res.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  });
});

// Register endpoint (for students only)
app.post('/api/register', async (req, res) => {
  const { email, password, name, department, usn } = req.body;
  
  try {
    const hash = await bcrypt.hash(password, 10);
    
    db.query(
      'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
      [email, hash, 'student'],
      (err, results) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email already exists' });
          }
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true, message: 'Registration successful' });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Events API Endpoints

// Get all events
app.get('/api/events', (req, res) => {
  db.query(
    `SELECT e.*, 
     COUNT(s.id) as registeredStudentsCount
     FROM events e 
     LEFT JOIN student_registrations s ON e.id = s.event_id 
     GROUP BY e.id 
     ORDER BY e.date DESC`,
    (err, results) => {
      if (err) {
        console.error('Database error in /api/events:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      res.json(results);
    }
  );
});

// Create new event
app.post('/api/events', (req, res) => {
  const { title, description, date, location } = req.body;
  
  db.query(
    'INSERT INTO events (title, description, date, location) VALUES (?, ?, ?, ?)',
    [title, description, date, location],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ id: results.insertId, success: true });
    }
  );
});

// Update event
app.put('/api/events/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, date, location, slides, slides_data, slides_type, recording, recording_data, recording_type } = req.body;
  
  console.log('Update event request:', { 
    id, 
    slides, 
    slides_data: slides_data ? `present (${slides_data.length} chars)` : 'missing', 
    recording, 
    recording_data: recording_data ? `present (${recording_data.length} chars)` : 'missing',
    requestBodyKeys: Object.keys(req.body)
  });
  
  db.query(
    'UPDATE events SET title = ?, description = ?, date = ?, location = ?, slides = ?, slides_data = ?, slides_type = ?, recording = ?, recording_data = ?, recording_type = ? WHERE id = ?',
    [title, description, date, location, slides, slides_data, slides_type, recording, recording_data, recording_type, id],
    (err, results) => {
      if (err) {
        console.error('Database error in update event:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      console.log('Event updated successfully');
      res.json({ success: true });
    }
  );
});

// Delete event
app.delete('/api/events/:id', (req, res) => {
  const { id } = req.params;
  
  // First delete all registrations for this event
  db.query('DELETE FROM student_registrations WHERE event_id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    
    // Then delete the event
    db.query('DELETE FROM events WHERE id = ?', [id], (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ success: true });
    });
  });
});

// Student Registrations API Endpoints

// Get registrations for an event
app.get('/api/events/:id/registrations', (req, res) => {
  const { id } = req.params;
  
  db.query(
    'SELECT * FROM student_registrations WHERE event_id = ? ORDER BY registered_date DESC',
    [id],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(results);
    }
  );
});

// Register student for an event
app.post('/api/events/:id/register', (req, res) => {
  const { id } = req.params;
  const { name, department, usn, email } = req.body;
  
  console.log('Registration request:', { id, name, department, usn, email });
  
  // Check if student is already registered
  db.query(
    'SELECT id FROM student_registrations WHERE event_id = ? AND email = ?',
    [id, email],
    (err, results) => {
      if (err) {
        console.error('Database error in registration check:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (results.length > 0) {
        console.log('Student already registered:', email);
        return res.status(400).json({ error: 'Student already registered for this event' });
      }
      
      // Register the student
      db.query(
        'INSERT INTO student_registrations (event_id, name, department, usn, email, registered_date) VALUES (?, ?, ?, ?, ?, CURDATE())',
        [id, name, department, usn, email],
        (err, results) => {
          if (err) {
            console.error('Database error in registration insert:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
          }
          console.log('Student registered successfully:', { id: results.insertId, email });
          res.json({ id: results.insertId, success: true });
        }
      );
    }
  );
});

// Unregister student from an event
app.delete('/api/events/:id/unregister', (req, res) => {
  const { id } = req.params;
  const { email } = req.body;
  
  db.query(
    'DELETE FROM student_registrations WHERE event_id = ? AND email = ?',
    [id, email],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ success: true });
    }
  );
});

// Check if student is registered for an event
app.get('/api/events/:id/check-registration', (req, res) => {
  const { id } = req.params;
  const { email } = req.query;
  
  db.query(
    'SELECT id FROM student_registrations WHERE event_id = ? AND email = ?',
    [id, email],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ isRegistered: results.length > 0 });
    }
  );
});

// Get all registrations for a specific student
app.get('/api/student/:email/registrations', (req, res) => {
  const { email } = req.params;
  
  db.query(
    'SELECT event_id FROM student_registrations WHERE email = ?',
    [email],
    (err, results) => {
      if (err) {
        console.error('Database error in get student registrations:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(results.map(r => r.event_id));
    }
  );
});

// Test endpoint to check file data
app.get('/api/events/:id/files', (req, res) => {
  const { id } = req.params;
  
  db.query(
    'SELECT id, title, slides, slides_data, recording, recording_data FROM events WHERE id = ?',
    [id],
    (err, results) => {
      if (err) {
        console.error('Database error in get event files:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      const event = results[0];
      res.json({
        id: event.id,
        title: event.title,
        slides: event.slides,
        slides_data_present: !!event.slides_data,
        slides_data_length: event.slides_data ? event.slides_data.length : 0,
        recording: event.recording,
        recording_data_present: !!event.recording_data,
        recording_data_length: event.recording_data ? event.recording_data.length : 0
      });
    }
  );
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

// Video upload endpoint
app.post('/api/events/:id/upload-recording', upload.single('recording'), (req, res) => {
  const { id } = req.params;
  const file = req.file;
  const eventId = Number(id);
  console.log('Upload endpoint hit:', { id, eventIdType: typeof eventId, filePresent: !!file, fileName: file?.originalname, fileType: file?.mimetype });
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  // Check if event exists
  db.query('SELECT id FROM events WHERE id = ?', [eventId], (err, results) => {
    if (err) {
      console.log('DB select error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (results.length === 0) {
      console.log('Event not found for upload:', eventId);
      return res.status(404).json({ error: 'Event not found' });
    }

    // Save file to uploads directory
    const filePath = path.join(uploadDir, file.originalname);
    fs.writeFileSync(filePath, file.buffer);

    // Update event with filename and mimetype
    db.query(
      'UPDATE events SET recording = ?, recording_type = ? WHERE id = ?',
      [file.originalname, file.mimetype, eventId],
      (err, result) => {
        console.log('DB update result:', { err, result, eventId });
        if (err) return res.status(500).json({ error: 'Database error' });
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Event not found for update' });
        }
        res.json({ success: true });
      }
    );
  });
});

// Serve video file for event
app.get('/api/events/:id/recording', (req, res) => {
  const { id } = req.params;
  db.query('SELECT recording, recording_type FROM events WHERE id = ?', [id], (err, results) => {
    if (err || results.length === 0) return res.status(404).json({ error: 'Recording not found' });
    const { recording, recording_type } = results[0];
    const filePath = path.join(uploadDir, recording);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    res.setHeader('Content-Type', recording_type);
    fs.createReadStream(filePath).pipe(res);
  });
});