// Import required modules
const express = require('express');
const path = require('path');
const propertiesReader = require("properties-reader");
const { MongoClient, ServerApiVersion } = require("mongodb");
const fs = require('fs');
const cors = require('cors');

// Initialize the Express application
const app = express();

// Enable CORS
app.use(cors());

/* ------------------------------- MongoDB Setup ------------------------------- */
// Load configuration from properties file
const propertiesPath = path.resolve(__dirname, "conf/db.properties");
const properties = propertiesReader(propertiesPath);

// Retrieve database credentials from properties file
const dbPrefix = properties.get("db.prefix");
const dbUsername = encodeURIComponent(properties.get("db.user"));
const dbPwd = encodeURIComponent(properties.get("db.pwd"));
const dbName = properties.get("db.dbName");
const dbUrl = properties.get("db.dbUrl");
const dbParams = properties.get("db.params");

// Create the MongoDB connection URI
const uri = `${dbPrefix}${dbUsername}:${dbPwd}${dbUrl}${dbParams}`;

// Setup MongoDB client with connection options
const client = new MongoClient(uri, {
    serverApi: ServerApiVersion.v1,
    ssl: true,
    tls: true,
    retryWrites: true
});

// Connect to MongoDB and handle connection success/failure
client.connect()
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('Failed to connect to MongoDB', err));

// Access the database
let db = client.db(dbName);

/* ----------------------------- Middleware Setup ----------------------------- */

// Middleware to parse JSON data from incoming requests
app.use(express.json());

// Logger middleware to log request details (timestamp, method, URL)
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
});

/* ------------------------------- REST API Routes ------------------------------- */

// Route: Fetch all courses from MongoDB
app.get('/getCourses', async (req, res) => {
    try {
        const collection = db.collection("Courses");
        const results = await collection.find({}).toArray(); // Retrieve all courses
        res.json(results); // Send courses as JSON response
    } catch (err) {
        console.error("Error fetching courses:", err);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

// Route: Save an order to the database
app.post('/saveOrder', async (req, res) => {
    try {
        const { firstName, lastName, address, phoneNumber, email, lessons } = req.body;

        // Validate the data
        if (!firstName || !lastName || !address || !phoneNumber || !email || !lessons || lessons.length === 0) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Prepare and insert the order object
        const newOrder = {
            firstName,
            lastName,
            address,
            phoneNumber,
            email,
            lessons,
            createdAt: new Date() // Timestamp for order creation
        };

        const collection = db.collection('Orders');
        const result = await collection.insertOne(newOrder);

        // Respond with the order ID and success message
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

// Route: Update attributes of a course in the database
app.put('/updateCourse/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body; // Fields to update

        const collection = db.collection('Courses');
        const result = await collection.updateOne(
            { id: parseInt(id) }, // Find by course ID
            { $set: updates } // Apply updates
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

// Route: Serve course image based on its ID
app.get('/getCourseImage/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const collection = db.collection('Courses');

        // Find the course and retrieve its image path
        const course = await collection.findOne({ id: parseInt(id) });

        if (!course || !course.image) {
            return res.status(404).json({ error: 'Course or image not found' });
        }

        const imagePath = path.join(__dirname, 'public', course.image);

        // Check if the image file exists
        if (!fs.existsSync(imagePath)) {
            return res.status(404).json({ error: 'Image file does not exist' });
        }

        res.sendFile(imagePath); // Send the image file as the response
    } catch (err) {
        console.error('Error fetching course image:', err);
        res.status(500).json({ error: 'Failed to fetch course image' });
    }
});

// Route: Search courses by query
app.get('/search', async (req, res) => {
    const { query } = req.query;

    if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
    }

    try {
        const collection = db.collection("Courses");

        // Define search conditions
        const searchConditions = [
            { topic: { $regex: query, $options: 'i' } },
            { location: { $regex: query, $options: 'i' } }
        ];

        // Check if query is numeric and include numeric fields in the search
        const numericQuery = parseInt(query);
        if (!isNaN(numericQuery)) {
            searchConditions.push(
                { price: numericQuery },
                { spaces: numericQuery },
                { id: numericQuery }
            );
        }

        // Perform the search
        const searchResults = await collection.find({
            $or: searchConditions
        }).toArray();

        res.json(searchResults); // Return search results
    } catch (err) {
        console.error('Error performing search:', err);
        res.status(500).json({ error: 'Failed to perform search' });
    }
});

/* ------------------------------- Static Assets ------------------------------- */

// Serve static files from the "public" directory
app.use('/Assets', express.static(path.join(__dirname, 'public/Assets')));

/* ------------------------------- Start Server ------------------------------- */

// Define the port and start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});