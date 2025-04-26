const API_BASE_URL = 'http://localhost:3005/api';

// Utility function to handle API responses
const handleResponse = async (response) => {
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Something went wrong');
    }
    return response.json();
};

// User API functions
export const userAPI = {
    login: async (credentials) => {
        const response = await fetch(`${API_BASE_URL}/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
            credentials: 'include'
        });
        return handleResponse(response);
    },

    signup: async (userData) => {
        const response = await fetch(`${API_BASE_URL}/users/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
            credentials: 'include'
        });
        return handleResponse(response);
    }
};

// Product API functions
export const productAPI = {
    getProducts: async () => {
        const response = await fetch(`${API_BASE_URL}/products`, {
            credentials: 'include'
        });
        return handleResponse(response);
    },

    createProduct: async (productData) => {
        const response = await fetch(`${API_BASE_URL}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(productData),
            credentials: 'include'
        });
        return handleResponse(response);
    }
};

// Order API functions
export const orderAPI = {
    createOrder: async (orderData) => {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData),
            credentials: 'include'
        });
        return handleResponse(response);
    },

    getOrder: async (orderId) => {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            credentials: 'include'
        });
        return handleResponse(response);
    },

    trackOrder: async (orderId) => {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/track`, {
            credentials: 'include'
        });
        return handleResponse(response);
    }
}; 