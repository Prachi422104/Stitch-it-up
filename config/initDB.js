const pool = require('./db');

async function initializeDatabase() {
    try {
        // Create users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Create orders table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_number VARCHAR(50) NOT NULL UNIQUE,
                user_id INT,
                category VARCHAR(100) NOT NULL,
                subcategory VARCHAR(100) NOT NULL,
                fabric VARCHAR(100) NOT NULL,
                preferred_color VARCHAR(20) NOT NULL,
                additional TEXT,
                measurements JSON,
                status ENUM('Pending', 'Processing', 'In Production', 'Ready for Delivery', 'Delivered', 'Cancelled', 'Denied') DEFAULT 'Pending',
                payment_status ENUM('Pending', 'Paid', 'Refunded') DEFAULT 'Pending',
                estimated_delivery_date DATE,
                actual_delivery_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        console.log('Database tables created successfully');
    } catch (error) {
        console.error('Error creating database tables:', error);
    }
}

initializeDatabase(); 