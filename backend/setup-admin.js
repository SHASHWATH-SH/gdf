const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

// Try to load .env file if it exists
try {
  require('dotenv').config();
} catch (error) {
  console.log('No .env file found, using default values');
}

// MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gdg_connect',
});

async function setupAdmin() {
  try {
    // Hash the admin password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    console.log('Generated hash:', hashedPassword);
    
    // Update the admin user with the correct hashed password
    db.query(
      'UPDATE users SET password = ? WHERE email = ? AND role = ?',
      [hashedPassword, 'admin@gdgconnect.com', 'admin'],
      (err, results) => {
        if (err) {
          console.error('Error updating admin password:', err);
          return;
        }
        
        if (results.affectedRows > 0) {
          console.log('✅ Admin password updated successfully!');
          console.log('Email: admin@gdgconnect.com');
          console.log('Password: admin123');
        } else {
          console.log('❌ Admin user not found. Please check if the user exists in the database.');
        }
        
        db.end();
      }
    );
  } catch (error) {
    console.error('Error hashing password:', error);
    db.end();
  }
}

// Connect to database and run setup
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    process.exit(1);
  }
  console.log('Connected to MySQL database');
  setupAdmin();
}); 