const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get all orders
router.get('/', async (req, res) => {
    try {
        const [orders] = await pool.query(`
            SELECT o.*, u.username 
            FROM orders o
            JOIN users u ON o.user_id = u.id
        `);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get single order with items
router.get('/:id', async (req, res) => {
    try {
        const [order] = await pool.query(`
            SELECT o.*, u.username 
            FROM orders o
            JOIN users u ON o.user_id = u.id
            WHERE o.id = ?
        `, [req.params.id]);

        if (order.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const [items] = await pool.query(`
            SELECT oi.*, p.name as product_name
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [req.params.id]);

        res.json({
            ...order[0],
            items
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create order
router.post('/', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { user_id, items } = req.body;
        
        // Calculate total amount
        let totalAmount = 0;
        for (const item of items) {
            const [product] = await connection.query(
                'SELECT price FROM products WHERE id = ?',
                [item.product_id]
            );
            totalAmount += product[0].price * item.quantity;
        }

        // Create order
        const [orderResult] = await connection.query(
            'INSERT INTO orders (user_id, total_amount) VALUES (?, ?)',
            [user_id, totalAmount]
        );

        const orderId = orderResult.insertId;

        // Create order items
        for (const item of items) {
            await connection.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [orderId, item.product_id, item.quantity, item.price]
            );
        }

        await connection.commit();
        res.status(201).json({ 
            message: 'Order created successfully',
            orderId 
        });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
});

// Update order status
router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        await pool.query(
            'UPDATE orders SET status = ? WHERE id = ?',
            [status, req.params.id]
        );
        res.json({ message: 'Order status updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router; 
