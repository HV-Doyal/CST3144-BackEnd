const express = require('express');
const app = express();
const path = require('path');  // Add this line
let propertiesReader = require("properties-reader");

let propertiesPath = path.resolve(__dirname, "conf/db.properties"); // Use path to resolve the properties file path
let properties = propertiesReader(propertiesPath);

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const dbPrefix = properties.get("db.prefix");
const dbUsername = encodeURIComponent(properties.get("db.user"));
const dbPwd = encodeURIComponent(properties.get("db.pwd"));
const dbName = properties.get("db.dbName");
const dbUrl = properties.get("db.dbUrl");
const dbParams = properties.get("db.params");

// Create the connection URI
const uri = `${dbPrefix}${dbUsername}:${dbPwd}${dbUrl}${dbParams}`;

//Trying to connect to DB
const client = new MongoClient(uri, {
    serverApi: ServerApiVersion.v1,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    ssl: true, // Ensure SSL is enabled
    retryWrites: true
});

client.connect()
    .then(() => {
        console.log('MongoDB connected successfully');
    })
    .catch(err => {
        console.error('Failed to connect to MongoDB', err);
    });
let db = client.db(dbName);

// Middleware for parsing JSON data
app.use(express.json());

// Logger middleware function
const logger = (req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
};

// Apply the logger middleware globally
app.use(logger);

// Routes

//Route to get courses from DB
app.get('/getCourses', async (req, res) => {
    try {
        const collection = db.collection("Courses");
        const results = await collection.find({}).toArray();
        res.json(results); // Send the results as a JSON response
    } catch (err) {
        console.error("Error fetching courses:", err);
        res.status(500).json({ error: 'Failed to fetch courses' }); // Send error response with status code
    }
});


//Route to save order to DB
app.post('/saveOrder', (req, res) => {
    res.send('Order created');
});


// Start the server
const PORT = process.env.PORT || 3000;  // Use the port from Render or default to 3000 locally
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});