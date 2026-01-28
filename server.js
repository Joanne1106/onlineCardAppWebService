// include the required packages
const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config();
const port = 3000;

//database config info
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 100,
    queueLimit: 0,
};

//initialize Express app
const app = express();
//helps app to read JSON
app.use(express.json());

const DEMO_USER = { id: 1, username: "admin", password: "admin123" };

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.headers.authorization; // "Bearer <token>"
  if (!header) return res.status(401).json({ error: "Missing Authorization header" });

  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) {
    return res.status(401).json({ error: "Invalid Authorization format" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; 
    next();
  } catch {
    return res.status(401).json({ error: "Invalid/Expired token" });
  }
}

//start the server
app.listen(port, () => {
    console.log(`Server started on port`, port);
});

const cors = require("cors");

const allowedOrigins = [
    "http://localhost:3000",
    "https://card-app-smoky.vercel.app",
    // "https://YOUR-frontend.onrender.com"
];

app.use(
    cors({
        origin: function (origin, callback) {
            // allow requests with no origin (Postman/server-to-server)
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error("Not allowed by CORS"));
        },
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: false,
    })
);

// Route: User Login
app.post("/login", (req, res) => {
    const { username, password } = req.body;
        
    if (username !== DEMO_USER.username || password !== DEMO_USER.password) {
        return res.status(401).json({ error: "Invalid credentials" });
    }
        
    const token = jwt.sign(
        { 
            userId: DEMO_USER.id, 
            username: DEMO_USER.username },
            JWT_SECRET,
        { 
            expiresIn: "1h" 
        }
    );
    res.json({ token });
});

//Example Route: Get all cards
app.get('/allcards', requireAuth, async (req, res) => {
    try {
        let connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM defaultdb.cards');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({message: 'Server error for allcards'});
    }
});

//Example Route: Create a new card
app.post('/addcard', async (req, res) => {
    const { card_name, card_pic } = req.body;
    try {
        let connection = await mysql.createConnection(dbConfig);
        await connection.execute('INSERT INTO defaultdb.cards (card_name, card_pic) VALUES (?, ?)', [card_name, card_pic]);
        res.status(201).json({message: 'Card ' +card_name + ' added successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({message: 'Server error - could not add card ' +card_name });
    }
});

// Route: Update a card
app.put('/editcard/:id', async (req, res) => {
    const { id } = req.params;
    const { card_name, card_pic } = req.body;

    if (card_name === undefined && card_pic === undefined) {
        return res.status(400).json({ message: 'Nothing to update' });
    }

    try {
        let connection = await mysql.createConnection(dbConfig);

        const [result] = await connection.execute(
            'UPDATE defaultdb.cards SET card_name = ?, card_pic = ? WHERE id = ?',
            [card_name, card_pic, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Card not found' });
        }

        res.json({ message: 'Card id ' + id + ' updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: 'Server error - could not update card id ' + id
        });
    }
});

// Route: Delete a card
app.delete('/deletecard/:id', async (req, res) => {
    const { id } = req.params;

    try {
        let connection = await mysql.createConnection(dbConfig);

        const [result] = await connection.execute(
            'DELETE FROM defaultdb.cards WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Card not found' });
        }

        res.json({ message: 'Card id ' + id + ' deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: 'Server error - could not delete card id ' + id
        });
    }
});


