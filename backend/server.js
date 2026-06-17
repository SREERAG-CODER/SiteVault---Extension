const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;
const JWT_SECRET = 'sitevault-secret-key';
const USERS_FILE = path.join(__dirname, 'users.json');

app.use(cors());
app.use(express.json());

// ---- HEALTH CHECK / PING ENDPOINTS (For UptimeRobot to keep server alive) ----
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'SiteVault Backend is running' });
});

// Helper to load users from users.json
function readUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading users file:', err);
    return [];
  }
}

// Helper to save users to users.json
function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing users file:', err);
  }
}

// ---- 1. SIGN UP ENDPOINT ----
app.post('/auth/signup', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Please provide name, email, and password' });
  }

  const users = readUsers();
  const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ error: 'User already exists with this email' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: 'u_' + Date.now(),
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      avatar_url: null,
      createdAt: Date.now()
    };

    users.push(newUser);
    saveUsers(users);

    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });

    // Don't return password
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({ token, user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ error: 'Error creating user' });
  }
});

// ---- 2. SIGN IN ENDPOINT ----
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password' });
  }

  const users = readUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !user.password) {
    return res.status(400).json({ error: 'Invalid email or password' });
  }

  try {
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ error: 'Error logging in' });
  }
});

// ---- 3. GOOGLE OAUTH ENDPOINT ----
app.post('/auth/google', async (req, res) => {
  const { access_token } = req.body;

  if (!access_token) {
    return res.status(400).json({ error: 'Access token is required' });
  }

  try {
    // Verify token with Google's API
    const googleRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`);
    if (!googleRes.ok) {
      return res.status(400).json({ error: 'Invalid Google access token' });
    }

    const googleUser = await googleRes.json();
    const { email, name, picture } = googleUser;

    if (!email) {
      return res.status(400).json({ error: 'Unable to retrieve email from Google account' });
    }

    const users = readUsers();
    let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      // Create a new user if they don't exist
      user = {
        id: 'u_google_' + Date.now(),
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        avatar_url: picture || null,
        createdAt: Date.now()
      };
      users.push(user);
      saveUsers(users);
    } else if (picture && user.avatar_url !== picture) {
      // Update avatar if changed
      user.avatar_url = picture;
      saveUsers(users);
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (err) {
    console.error('Google Auth Error:', err);
    res.status(500).json({ error: 'Failed to authenticate with Google' });
  }
});

app.listen(PORT, () => {
  console.log(`SiteVault Backend running on http://localhost:${PORT}`);
});
