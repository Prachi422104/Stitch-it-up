const express = require('express');
const cors = require('cors');
require('dotenv').config();
const mysql = require('mysql2/promise');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

const app = express();

// Middleware
app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'stitch_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test database connection
async function testDatabaseConnection() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Database connection successful');
        return true;
    } catch (error) {
        console.error('Database connection failed:', error);
        return false;
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

// Initialize database tables
async function initializeDatabase() {
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Create users table if it doesn't exist
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                fullName VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                mobile VARCHAR(20) NOT NULL,
                password VARCHAR(255) NOT NULL,
                isAdmin BOOLEAN DEFAULT FALSE,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create orders table if it doesn't exist
        await connection.query(`
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

        console.log('Database tables initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error; // Re-throw to stop server if database setup fails
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

// Initialize database on server start
initializeDatabase().catch(error => {
    console.error('Failed to initialize database:', error);
    process.exit(1); // Exit the process if database initialization fails
});

// Signup endpoint
app.post('/api/signup', async (req, res) => {
    let connection;
    try {
        const { fullName, email, mobile, password, isAdmin } = req.body;

        if (!fullName || !email || !mobile || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        connection = await pool.getConnection();
        
        // Check if email exists
        const [existingUsers] = await connection.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        const [result] = await connection.query(
            'INSERT INTO users (fullName, email, mobile, password, isAdmin) VALUES (?, ?, ?, ?, ?)',
            [fullName, email, mobile, hashedPassword, isAdmin || false]
        );

        // Return user data (excluding password)
        res.status(201).json({
            user: {
                id: result.insertId,
                fullName,
                email,
                mobile,
                isAdmin: isAdmin || false
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    let connection;
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        connection = await pool.getConnection();
        
        // Find user
        const [users] = await connection.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = users[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Return user data (excluding password)
        res.json({
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                mobile: user.mobile,
                isAdmin: user.isAdmin === 1 || user.isAdmin === true
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            message: 'Internal server error',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Debug endpoint to show table structure
app.get('/api/debug/tables', async (req, res) => {
    let connection;
    try {
        console.log('Debug endpoint accessed');
        connection = await pool.getConnection();
        console.log('Database connection established');
        
        // Get orders table structure
        const [ordersColumns] = await connection.query(
            "SHOW COLUMNS FROM orders"
        );
        console.log('Orders table columns:', ordersColumns);
        
        // Get users table structure
        const [usersColumns] = await connection.query(
            "SHOW COLUMNS FROM users"
        );
        console.log('Users table columns:', usersColumns);
        
        res.json({
            orders: ordersColumns,
            users: usersColumns
        });
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({ 
            message: 'Error getting table structure',
            error: error.message,
            stack: error.stack
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Save order endpoint
app.post('/api/orders', async (req, res) => {
    let connection;
    try {
        const { orderNumber, userId, category, subcategory, fabric, preferredColor, additional } = req.body;
        
        console.log('Received order data:', {
            orderNumber,
            userId,
            category,
            subcategory,
            fabric,
            preferredColor,
            additional
        });

        // Validate required fields
        if (!orderNumber || !userId || !category || !subcategory || !fabric || !preferredColor) {
            console.log('Missing required fields:', {
                orderNumber: !!orderNumber,
                userId: !!userId,
                category: !!category,
                subcategory: !!subcategory,
                fabric: !!fabric,
                preferredColor: !!preferredColor
            });
            return res.status(400).json({ 
                message: 'Missing required fields',
                details: { orderNumber, userId, category, subcategory, fabric, preferredColor }
            });
        }

        connection = await pool.getConnection();
        console.log('Database connection established');
        
        // Verify user exists
        console.log('Checking user with ID:', userId);
        const [users] = await connection.query(
            'SELECT id FROM users WHERE id = ?',
            [userId]
        );

        console.log('User check result:', users);

        if (users.length === 0) {
            console.log('User not found with ID:', userId);
            return res.status(400).json({ message: 'Invalid user ID' });
        }

        // Check if order number already exists
        console.log('Checking for existing order number:', orderNumber);
        const [existingOrders] = await connection.query(
            'SELECT id FROM orders WHERE order_number = ?',
            [orderNumber]
        );

        console.log('Existing orders check result:', existingOrders);

        if (existingOrders.length > 0) {
            console.log('Order number already exists:', orderNumber);
            return res.status(400).json({ message: 'Order number already exists' });
        }

        // Insert the order
        console.log('Inserting new order...');
        const [result] = await connection.query(
            `INSERT INTO orders 
            (order_number, user_id, category, subcategory, fabric, preferred_color, additional) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [orderNumber, userId, category, subcategory, fabric, preferredColor, additional]
        );

        console.log('Order inserted successfully:', result);

        res.status(201).json({
            message: 'Order created successfully',
            orderId: result.insertId,
            orderNumber: orderNumber
        });
    } catch (error) {
        console.error('Order creation error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            message: 'Internal server error',
            error: error.message,
            code: error.code,
            sqlMessage: error.sqlMessage
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Update order measurements endpoint
app.put('/api/orders/:orderNumber/measurements', async (req, res) => {
    try {
        const { orderNumber } = req.params;
        const { measurements } = req.body;

        const connection = await pool.getConnection();
        
        await connection.query(
            'UPDATE orders SET measurements = ? WHERE order_number = ?',
            [JSON.stringify(measurements), orderNumber]
        );

        connection.release();

        res.json({ message: 'Measurements updated successfully' });
    } catch (error) {
        console.error('Update measurements error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get order details endpoint
app.get('/api/orders/:orderNumber', async (req, res) => {
    try {
        const { orderNumber } = req.params;

        const connection = await pool.getConnection();
        
        const [orders] = await connection.query(
            'SELECT * FROM orders WHERE order_number = ?',
            [orderNumber]
        );

        connection.release();

        if (orders.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json(orders[0]);
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
    try {
        const userId = req.headers['user-id'];
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const connection = await pool.getConnection();
        const [users] = await connection.query(
            'SELECT isAdmin FROM users WHERE id = ?',
            [userId]
        );

        connection.release();

        if (users.length === 0 || !users[0].isAdmin) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        next();
    } catch (error) {
        console.error('Admin authentication error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get all orders (admin only)
app.get('/api/orders', authenticateAdmin, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        
        const [orders] = await connection.query(`
            SELECT o.*, u.fullName as customer_name 
            FROM orders o 
            LEFT JOIN users u ON o.user_id = u.id 
            ORDER BY o.created_at DESC
        `);

        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Get user details
app.get('/api/users/:userId', async (req, res) => {
    let connection;
    try {
        const { userId } = req.params;
        connection = await pool.getConnection();
        
        // Get user details
        const [users] = await connection.query(
            'SELECT id, fullName, email, mobile, createdAt FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get total orders count
        const [orderCount] = await connection.query(
            'SELECT COUNT(*) as totalOrders FROM orders WHERE user_id = ?',
            [userId]
        );

        res.json({
            ...users[0],
            totalOrders: orderCount[0].totalOrders
        });
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Get user's orders
app.get('/api/orders/user/:userId', async (req, res) => {
    let connection;
    try {
        const { userId } = req.params;
        connection = await pool.getConnection();
        
        const [orders] = await connection.query(
            'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );

        res.json(orders);
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Update order status (admin only)
app.put('/api/orders/:orderNumber', authenticateAdmin, async (req, res) => {
    let connection;
    try {
        const { orderNumber } = req.params;
        const { status, estimated_delivery_date } = req.body;

        connection = await pool.getConnection();
        
        await connection.query(
            `UPDATE orders 
            SET status = ?, 
                estimated_delivery_date = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE order_number = ?`,
            [status, estimated_delivery_date, orderNumber]
        );

        res.json({ message: 'Order updated successfully' });
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Mark order as delivered (admin only)
app.put('/api/orders/:orderNumber/deliver', authenticateAdmin, async (req, res) => {
    let connection;
    try {
        const { orderNumber } = req.params;
        connection = await pool.getConnection();
        
        await connection.query(
            `UPDATE orders 
            SET status = 'Delivered',
                actual_delivery_date = CURRENT_DATE,
                updated_at = CURRENT_TIMESTAMP
            WHERE order_number = ?`,
            [orderNumber]
        );

        res.json({ message: 'Order marked as delivered' });
    } catch (error) {
        console.error('Error marking order as delivered:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Basic route
app.get('/', (req, res) => {
    console.log('Received request for /');
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Import routes
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');

// Use routes
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 8080;
const HOST = '127.0.0.1';

// Add error handling for server startup
app.listen(PORT, HOST, (err) => {
    if (err) {
        console.error('Error starting server:', err);
        process.exit(1);
    }
    console.log(`Server is running on http://${HOST}:${PORT}`);
    console.log(`Try accessing: http://localhost:${PORT}`);
    console.log(`Try accessing: http://127.0.0.1:${PORT}`);
    console.log('Debug endpoint available at: /api/debug/tables');
});     