const express = require('express');
const app = express();

// Logger middleware function
const logger = (req, res, next) => {
    // Get the current timestamp
    const timestamp = new Date().toISOString();

    // Log the HTTP method, URL, and timestamp
    console.log(`[${timestamp}] ${req.method} ${req.url}`);

    // Move to the next middleware or route handler
    next();
};

// Apply the logger middleware globally
app.use(logger);

// Example routes
app.get('/getCourses', (req, res) => {
    res.send('List of courses');
});

app.post('/saveOrder', (req, res) => {
    res.send('Order created');
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});