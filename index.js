const express = require('express');
const path = require('path');
const propertiesReader = require("properties-reader");
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();

// Load configuration from properties file
let propertiesPath = path.resolve(__dirname, "conf/db.properties");
let properties = propertiesReader(propertiesPath);

// Retrieve database credentials from properties file
const dbPrefix = properties.get("db.prefix");
const dbUsername = encodeURIComponent(properties.get("db.user"));
const dbPwd = encodeURIComponent(properties.get("db.pwd"));
const dbName = properties.get("db.dbName");
const dbUrl = properties.get("db.dbUrl");
const dbParams = properties.get("db.params");

// Create the MongoDB connection URI
const uri = `${dbPrefix}${dbUsername}:${dbPwd}${dbUrl}${dbParams}`;

// MongoDB client setup with connection options
const client = new MongoClient(uri, {
    serverApi: ServerApiVersion.v1,
    ssl: true,
    tls: true,
    retryWrites: true
});

// Connect to the database
client.connect()
    .then(() => {
        console.log('MongoDB connected successfully');
    })
    .catch(err => {
        console.error('Failed to connect to MongoDB', err);
    });

// Access the database after successful connection
let db = client.db(dbName);

// Middleware to parse JSON data from incoming requests
app.use(express.json());

// Logger middleware to log request details (timestamp, method, URL)
const logger = (req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
};

// Apply the logger middleware globally
app.use(logger);

// Route to fetch all courses from the MongoDB database
app.get('/getCourses', async (req, res) => {
    try {
        const collection = db.collection("Courses");
        const results = await collection.find({}).toArray();  // Retrieve all courses
        res.json(results);  // Send courses as JSON response
    } catch (err) {
        console.error("Error fetching courses:", err);
        res.status(500).json({ error: 'Failed to fetch courses' });  // Send error response if fetching fails
    }
});

// Route to save an order
app.post('/saveOrder', (req, res) => {
    res.send('Order created');
});

// Start the server on a specified port
const PORT = process.env.PORT || 3000;  // Use environment port or default to 3000
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});