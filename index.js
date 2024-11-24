const express = require('express');
const path = require('path');
const propertiesReader = require("properties-reader");
const { MongoClient, ServerApiVersion } = require("mongodb");
const fs = require('fs');
const cors = require('cors');

const app = express();

// Enable CORS
app.use(cors());

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
app.post('/saveOrder', async (req, res) => {
    try {
        // Extract the order data from the request body
        const { firstName, lastName, address, phoneNumber, email, lessons } = req.body;

        // Validate the data
        if (!firstName || !lastName || !address || !phoneNumber || !email || !lessons || lessons.length === 0) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Prepare the order object to insert
        const newOrder = {
            firstName,
            lastName,
            address,
            phoneNumber,
            email,
            lessons,
            createdAt: new Date()  // Add a timestamp when the order is created
        };

        // Insert the order into the "order" collection
        const collection = db.collection('Orders');
        const result = await collection.insertOne(newOrder);

        // Respond with the inserted order data and success message
        res.status(201).json({
            message: 'Order created successfully',
            orderId: result.insertedId,
            order: newOrder
        });
    } catch (err) {
        console.error("Error saving order:", err);
        res.status(500).json({ error: 'Failed to save order' });
    }
});

// Route to update attributes of a course in the "Courses" collection
app.put('/updateCourse/:id', async (req, res) => {
    try {
        const { id } = req.params; // Extract id from the URL parameters
        const updates = req.body; // Get the fields to update from the request body

        // Find the course by id and update its attributes
        const collection = db.collection('Courses');
        const result = await collection.updateOne(
            { id: parseInt(id) },
            { $set: updates } // Apply the updates
        );

        // Check if the course was found and updated
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }

        res.json({
            message: 'Course updated successfully',
            updatedCourse: { id: parseInt(id), ...updates }
        });
    } catch (err) {
        console.error("Error updating course:", err);
        res.status(500).json({ error: 'Failed to update course' });
    }
});

// Serve static files from the "public" directory
app.use('/Assets', express.static(path.join(__dirname, 'public/Assets')));

// Route to fetch an image path from the database for a course
app.get('/getCourseImage/:id', async (req, res) => {
    try {
        const { id } = req.params; // Get the course ID from the URL
        const collection = db.collection('Courses');

        // Find the course by ID and get its image path
        const course = await collection.findOne({ id: parseInt(id) });

        if (!course || !course.image) {
            return res.status(404).json({ error: 'Course or image not found' });
        }

        const imagePath = path.join(__dirname, 'public', course.image);

        // Check if the image file exists
        if (!fs.existsSync(imagePath)) {
            return res.status(404).json({ error: 'Image file does not exist' });
        }

        // Send the image file as the response
        res.sendFile(imagePath);
    } catch (err) {
        console.error('Error fetching course image:', err);
        res.status(500).json({ error: 'Failed to fetch course image' });
    }
});

// Start the server on a specified port
const PORT = process.env.PORT || 3000;  // Use environment port or default to 3000
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});