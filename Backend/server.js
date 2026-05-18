// Loading environment variables from .env file
require('dotenv').config();

// Importing the necessary modules
const { MongoClient, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Initialising the Express app
const app = express();
const PORT = 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'supersecretkey';
const ACCESS_TOKEN_EXPIRE_MINUTES = Number(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || 30);

//Seting up the middleware
app.use(cors());
app.use(express.json());
app.get('/favicon.ico', (req, res) => res.sendStatus(204));
app.use(express.static(path.join(__dirname, '../Frontend')));

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, SECRET_KEY, { algorithms: ['HS256'] });
    req.user = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

//Registering a new user
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  try {
    const existing = await db.collection('users').findOne({ username });
    if (existing) {
      return res.status(409).json({ error: 'Username already exists.' });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    await db.collection('users').insertOne({ username, password: hashedPassword });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Server error during registration.' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const user = await db.collection('users').findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign({ sub: username }, SECRET_KEY, {
      algorithm: 'HS256',
      expiresIn: `${ACCESS_TOKEN_EXPIRE_MINUTES}m`,
    });

    return res.json({ token, user: username });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error during login.' });
  }
});

app.use('/groups', requireAuth);
app.use('/flashcards', requireAuth);
app.use('/history', requireAuth);
app.use('/account', requireAuth);

//Setting up MongoDB connection
const client = new MongoClient(process.env.MONGO_URI);
let db;

async function ensureDefaultUsers() {
  const usersCollection = db.collection('users');
  const defaultUsers = [
    { username: 'admin@example.com', password: 'admin' },
    { username: 'testuser@example.com', password: 'testuser' },
  ];

  for (const user of defaultUsers) {
    const existing = await usersCollection.findOne({ username: user.username });
    if (!existing) {
      const hashedPassword = await bcrypt.hash(user.password, 12);
      await usersCollection.insertOne({ username: user.username, password: hashedPassword });
    }
  }
}

async function connectDB() {
  try {
    await client.connect();
    db = client.db('flashcardsDB');
    await ensureDefaultUsers();
    console.log('Connected to MongoDB Atlas');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

//Creating a group 
app.post('/groups', async (req, res) => {
  try {
    const { name } = req.body;
    await db.collection('groups').insertOne({ name, user_id: req.user });
    res.send({ success: true });
  } catch (err) {
    res.status(500).send('Error adding group');
  }
});

//Getting all the groups 
app.get('/groups', async (req, res) => {
  try {
    const groups = await db.collection('groups').find({ user_id: req.user }).toArray();
    res.send(groups);
  } catch (err) {
    res.status(500).send('Error fetching groups');
  }
});

//Deleting a group and its associated flashcards
app.delete('/groups/:name', async (req, res) => {
  try {
    const groupName = req.params.name;

    await db.collection('groups').deleteOne({ name: groupName, user_id: req.user });
    await db.collection('flashcards').deleteMany({ group: groupName, user_id: req.user });

    res.send({ success: true });
  } catch (err) {
    res.status(500).send('Error deleting group');
  }
});

//Creating a flashcard
app.post('/flashcards', async (req, res) => {
  try {
    await db.collection('flashcards').insertOne({ ...req.body, user_id: req.user });
    res.send({ success: true });
  } catch (err) {
    res.status(500).send('Error adding flashcard');
  }
});

//Getting all flashcards
app.get('/flashcards', async (req, res) => {
  try {
    const cards = await db.collection('flashcards').find({ user_id: req.user }).toArray();
    res.send(cards);
  } catch (err) {
    res.status(500).send('Error fetching flashcards');
  }
});

//Edding a flashcard
app.put('/flashcards/:id', async (req, res) => {
  try {
    await db.collection('flashcards').updateOne(
      { _id: new ObjectId(req.params.id), user_id: req.user },
      { $set: req.body }
    );
    res.send({ success: true });
  } catch (err) {
    res.status(500).send('Error editing flashcard');
  }
});

//Deleting a flashcard
app.delete('/flashcards/:id', async (req, res) => {
  try {
    await db.collection('flashcards').deleteOne({ _id: new ObjectId(req.params.id), user_id: req.user });
    res.send({ success: true });
  } catch (err) {
    res.status(500).send('Error deleting flashcard');
  }
});

//Admin only: get all users learning history
app.get('/history/all', async (req, res) => {
  if (req.user !== 'admin@example.com') {
    return res.status(403).json({ error: 'Forbidden: admin only' });
  }
  try {
    const history = await db.collection('history').find().sort({ timestamp: -1 }).toArray();
    res.send(history);
  } catch (err) {
    res.status(500).send('Error fetching history');
  }
});

//Recording a study attempt (correct or incorrect)
app.post('/history', async (req, res) => {
  try {
    const { question, answer, correct } = req.body;
    await db.collection('history').insertOne({
      user_id: req.user,
      question,
      answer,
      correct,
      timestamp: new Date()
    });
    res.send({ success: true });
  } catch (err) {
    res.status(500).send('Error recording history');
  }
});

//Change password for the logged-in user
app.put('/account/password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both passwords are required.' });
  }
  try {
    const user = await db.collection('users').findOne({ username: req.user });
    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await db.collection('users').updateOne({ username: req.user }, { $set: { password: hashed } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error changing password.' });
  }
});

//Delete the logged-in user's account and all their data
app.delete('/account', async (req, res) => {
  try {
    await db.collection('users').deleteOne({ username: req.user });
    await db.collection('groups').deleteMany({ user_id: req.user });
    await db.collection('flashcards').deleteMany({ user_id: req.user });
    await db.collection('history').deleteMany({ user_id: req.user });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting account.' });
  }
});

//Starting the server
async function startServer() {
  await connectDB();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}: http://localhost:${PORT}`));
}

startServer();