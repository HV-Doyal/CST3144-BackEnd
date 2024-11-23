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
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
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

// Middleware dynamically extracts collection name from URL
app.param('collectionName', function(req, res, next, collectionName) {
    req.collection = db.collection(collectionName);
    return next();
});

// Logger middleware function
const logger = (req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
};

// Apply the logger middleware globally
app.use(logger);

// Routes
app.get('/Courses', (req, res) => {
    res.send('List of courses');
});

app.post('/Orders', (req, res) => {
    res.send('Order created');
});

app.get('/collections/:collectionName', async function(req, res, next) {
    const collectionName = req.params.collectionName; // Get the collection name from URL parameters
    try {
        const collection = db.collection(collectionName); // Access the correct collection using the dynamic name
        const results = await collection.find({}).toArray(); // Perform the find operation and await the result
        res.json(results); // Send the results as a JSON response
    } catch (err) {
        next(err); // In case of an error, pass it to the next middleware (error handler)
    }
});


// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});