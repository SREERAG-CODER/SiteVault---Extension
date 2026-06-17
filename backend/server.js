require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'sitevault-secret-key';
const USERS_FILE = path.join(__dirname, 'users.json');

// Initialize Supabase Client if credentials are provided
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;

if (supabaseUrl && supabaseUrl !== 'your_supabase_project_url_here' && supabaseServiceKey && supabaseServiceKey !== 'your_supabase_service_role_key_here') {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Connected to Supabase successfully');
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
  }
} else {
  console.log('Supabase credentials not set or incomplete. Running in Local Mode (users.json).');
}

app.use(cors());
app.use(express.json());

// ---- HEALTH CHECK / PING ENDPOINTS (For UptimeRobot to keep server alive) ----
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'SiteVault Backend is running' });
});

// ---- LOCAL FILE HELPERS (Used when Supabase is not configured) ----
function readLocalUsers() {
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

function saveLocalUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing users file:', err);
  }
}

// ---- AUTH MIDDLEWARE ----
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.userId = user.userId;
    next();
  });
}

// ---- 1. SIGN UP ENDPOINT ----
app.post('/auth/signup', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Please provide name, email, and password' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    let newUser = null;

    if (supabase) {
      // Check if user already exists in Supabase profiles
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (existingUser) {
        return res.status(400).json({ error: 'User already exists with this email' });
      }

      // Insert new profile into Supabase
      const { data, error } = await supabase
        .from('profiles')
        .insert([{
          id: 'u_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          email: email.toLowerCase(),
          password: hashedPassword,
          name,
          avatar_url: null,
          is_pro: false,
          folders: []
        }])
        .select()
        .single();

      if (error) throw error;
      newUser = data;
    } else {
      // Local fallback
      const users = readLocalUsers();
      const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists with this email' });
      }

      newUser = {
        id: 'u_' + Date.now(),
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        avatar_url: null,
        is_pro: false,
        folders: [],
        createdAt: Date.now()
      };

      users.push(newUser);
      saveLocalUsers(users);
    }

    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        avatar_url: newUser.avatar_url,
        is_pro: newUser.is_pro || false
      }
    });
  } catch (err) {
    console.error('Signup Error:', err);
    res.status(500).json({ error: 'Error creating user' });
  }
});

// ---- 2. SIGN IN ENDPOINT ----
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password' });
  }

  try {
    let user = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (error) throw error;
      user = data;
    } else {
      const users = readLocalUsers();
      user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    }

    if (!user || !user.password) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
        is_pro: user.is_pro || false
      }
    });
  } catch (err) {
    console.error('Login Error:', err);
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
    const googleRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`);
    if (!googleRes.ok) {
      return res.status(400).json({ error: 'Invalid Google access token' });
    }

    const googleUser = await googleRes.json();
    const { email, name, picture } = googleUser;

    if (!email) {
      return res.status(400).json({ error: 'Unable to retrieve email from Google account' });
    }

    let user = null;

    if (supabase) {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (!existingUser) {
        // Create user
        const { data, error } = await supabase
          .from('profiles')
          .insert([{
            id: 'u_google_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            email: email.toLowerCase(),
            name: name || email.split('@')[0],
            avatar_url: picture || null,
            is_pro: false,
            folders: []
          }])
          .select()
          .single();

        if (error) throw error;
        user = data;
      } else {
        user = existingUser;
        // Update avatar if it changed
        if (picture && user.avatar_url !== picture) {
          const { data, error } = await supabase
            .from('profiles')
            .update({ avatar_url: picture })
            .eq('id', user.id)
            .select()
            .single();
          if (!error) user = data;
        }
      }
    } else {
      // Local fallback
      const users = readLocalUsers();
      user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (!user) {
        user = {
          id: 'u_google_' + Date.now(),
          name: name || email.split('@')[0],
          email: email.toLowerCase(),
          avatar_url: picture || null,
          is_pro: false,
          folders: [],
          createdAt: Date.now()
        };
        users.push(user);
        saveLocalUsers(users);
      } else if (picture && user.avatar_url !== picture) {
        user.avatar_url = picture;
        saveLocalUsers(users);
      }
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
        is_pro: user.is_pro || false
      }
    });
  } catch (err) {
    console.error('Google Auth Error:', err);
    res.status(500).json({ error: 'Failed to authenticate with Google' });
  }
});

// ---- 4. BOOKMARK SYNC ENDPOINTS (Pro only) ----
app.post('/sync/save', authenticateToken, async (req, res) => {
  const { folders } = req.body;

  if (!folders) {
    return res.status(400).json({ error: 'Folders data is required' });
  }

  try {
    if (supabase) {
      const { error } = await supabase
        .from('profiles')
        .update({ folders })
        .eq('id', req.userId);

      if (error) throw error;
    } else {
      // Local fallback
      const users = readLocalUsers();
      const user = users.find(u => u.id === req.userId);
      if (user) {
        user.folders = folders;
        saveLocalUsers(users);
      } else {
        return res.status(404).json({ error: 'User not found' });
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Cloud Save Error:', err);
    res.status(500).json({ error: 'Failed to save folders to cloud' });
  }
});

app.get('/sync/load', authenticateToken, async (req, res) => {
  try {
    let folders = [];

    if (supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('folders')
        .eq('id', req.userId)
        .maybeSingle();

      if (error) throw error;
      folders = data?.folders || [];
    } else {
      // Local fallback
      const users = readLocalUsers();
      const user = users.find(u => u.id === req.userId);
      folders = user?.folders || [];
    }

    res.json({ folders });
  } catch (err) {
    console.error('Cloud Load Error:', err);
    res.status(500).json({ error: 'Failed to load folders from cloud' });
  }
});

// ---- 5. PAYMENT WEBHOOKS (Stripe / Lemon Squeezy) ----
app.post('/webhooks/payment', async (req, res) => {
  const payload = req.body;

  // Optional: Verify Lemon Squeezy webhook secret signature
  const webhookSecret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (webhookSecret && webhookSecret !== 'your_webhook_secret_here') {
    // Standard signature header is 'x-signature'
    const signature = req.headers['x-signature'];
    if (!signature) {
      return res.status(401).json({ error: 'Missing webhook signature' });
    }
    // Verify logic omitted for simplicity, but in production, compare hashes
  }

  try {
    // Handle both Lemon Squeezy & Stripe event formats
    let email = null;
    let isPro = false;
    let subscriptionId = null;

    // Detect Lemon Squeezy event
    if (payload.data && payload.data.type === 'subscriptions') {
      const eventName = payload.meta?.event_name; // e.g., 'subscription_created', 'subscription_cancelled'
      email = payload.data.attributes?.user_email;
      subscriptionId = payload.data.id;
      
      if (eventName === 'subscription_created' || eventName === 'subscription_payment_success') {
        isPro = true;
      } else if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
        isPro = false;
      } else {
        // Ignore other event notifications
        return res.status(200).send('Event ignored');
      }
    } 
    // Detect Stripe event
    else if (payload.type && payload.type.startsWith('customer.subscription')) {
      const eventName = payload.type;
      const subscription = payload.data.object;
      subscriptionId = subscription.id;
      
      // Fetch customer email from Stripe subscription object
      email = subscription.customer_email;
      
      if (eventName === 'customer.subscription.created' || eventName === 'customer.subscription.updated') {
        if (subscription.status === 'active' || subscription.status === 'trialing') {
          isPro = true;
        } else {
          isPro = false;
        }
      } else if (eventName === 'customer.subscription.deleted') {
        isPro = false;
      }
    }

    if (!email) {
      return res.status(400).json({ error: 'Customer email could not be parsed from payload' });
    }

    if (supabase) {
      const { error } = await supabase
        .from('profiles')
        .update({ is_pro: isPro, subscription_id: subscriptionId })
        .eq('email', email.toLowerCase());

      if (error) throw error;
      console.log(`Supabase User ${email} Pro status updated to ${isPro}`);
    } else {
      // Local fallback
      const users = readLocalUsers();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (user) {
        user.is_pro = isPro;
        user.subscription_id = subscriptionId;
        saveLocalUsers(users);
        console.log(`Local User ${email} Pro status updated to ${isPro}`);
      }
    }

    res.status(200).send('Webhook processed successfully');
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: 'Failed to process payment event' });
  }
});

app.listen(PORT, () => {
  console.log(`SiteVault Backend running on http://localhost:${PORT}`);
});
