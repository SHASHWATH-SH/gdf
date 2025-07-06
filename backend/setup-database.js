const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

// Try to load .env file if it exists
try {
  require('dotenv').config();
} catch (error) {
  console.log('No .env file found, using default values');
}

// MySQL connection without database (to create database)
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
});

async function setupDatabase() {
  try {
    console.log('Setting up database...');
    
    // Create database
    await db.promise().query('CREATE DATABASE IF NOT EXISTS gdg_connect');
    console.log('✅ Database created/verified');
    
    // Use the database
    await db.promise().query('USE gdg_connect');
    
    // Create users table
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'student') DEFAULT 'student',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created/verified');
    
    // Create events table
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        date DATE NOT NULL,
        location VARCHAR(255),
        slides VARCHAR(255),
        slides_data LONGTEXT,
        slides_type VARCHAR(50),
        recording VARCHAR(255),
        recording_data LONGTEXT,
        recording_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Events table created/verified');
    
    // Create student_registrations table
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS student_registrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        department VARCHAR(255) NOT NULL,
        usn VARCHAR(50) NOT NULL,
        email VARCHAR(255) NOT NULL,
        registered_date DATE DEFAULT CURDATE(),
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Student registrations table created/verified');
    
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await db.promise().query(`
      INSERT INTO users (email, password, role) VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE password = VALUES(password)
    `, ['admin@gdgconnect.com', hashedPassword, 'admin']);
    console.log('✅ Admin user created/updated');
    
    console.log('\n🎉 Database setup completed successfully!');
    console.log('Admin credentials:');
    console.log('Email: admin@gdgconnect.com');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error);
  } finally {
    db.end();
  }
}

// Connect to database and run setup
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    console.log('Please make sure MySQL is running and accessible');
    process.exit(1);
  }
  console.log('Connected to MySQL server');
  setupDatabase();
}); 