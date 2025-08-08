require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs').promises;
const path = require('path');
const systemPrompts = require('./instructions');
const { init } = require('@instantdb/admin');
const app = express();

const db = init({
  appId: '737da44f-e060-46c5-a28b-c1e2803a4590',
  adminToken: process.env.INSTANT_ADMIN_TOKEN,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

let instructionsContent = '';

async function loadInstructions() {
  try {
    instructionsContent = await fs.readFile(path.join(__dirname, 'instructions.txt'), 'utf-8');
    console.log('Instructions loaded successfully');
  } catch (error) {
    console.error('Error reading instructions file:', error);
    instructionsContent = '';
  }
}

loadInstructions();

app.use(express.json());

app.use((_, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  next();
});

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('Auth header received:', authHeader);
    
    const token = authHeader?.replace('Bearer ', '');
    console.log('Token extracted:', token);
    
    if (!token) {
      return res.status(401).json({ error: 'No auth token provided' });
    }

    // Try to verify the token with InstantDB
    try {
      const user = await db.auth.verifyToken(token);
      console.log('Verify token result:', user);
      
      if (user) {
        req.user = user;
        req.userEmail = user.email;
        next();
        return;
      }
    } catch (verifyError) {
      console.log('Token verification failed:', verifyError.message);
    }

    // If token verification fails, try using it as a refresh token to look up the user
    // This is a workaround since client refresh tokens aren't directly verifiable
    try {
      const { data } = await db.query({
        $users: {
          $: {
            where: {
              refresh_token: token
            }
          }
        }
      });
      
      console.log('User lookup result:', data);
      
      if (data.$users && data.$users.length > 0) {
        req.user = data.$users[0];
        req.userEmail = data.$users[0].email;
        next();
        return;
      }
    } catch (queryError) {
      console.log('User query failed:', queryError.message);
    }
    
    return res.status(401).json({ error: 'Invalid token' });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

app.get('/', (_, res) => {
  res.send('Welcome to my AI app generator!');
});

app.post('/test-connection', authenticateUser, (req, res) => {
  res.json({ 
    message: 'Connected successfully!',
    user: req.userEmail 
  });
});

app.post('/create_app', authenticateUser, async (req, res) => {
  try {
    const { description } = req.body;
    
    console.log('Received request from:', req.userEmail);
    console.log('Description:', description);
    
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4000,
      temperature: 0.7,
      system: systemPrompts.final,
      messages: [
        {
          role: "user",
          content: `${description}${instructionsContent ? '\n\nAdditional instructions: ' + instructionsContent : ''}`
        }
      ]
    });
    
    const generatedCode = message.content[0].text;
    
    console.log('Generated code successfully!');
    
    res.json({
      message: 'App generated successfully!',
      description: description,
      code: generatedCode
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Failed to generate app',
      details: error.message
    });
  }
});

app.get('/reload-instructions', async (_, res) => {
  await loadInstructions();
  res.json({ message: 'Instructions reloaded', content: instructionsContent });
});

const PORT = process.env.PORT || 8080;

 app.listen(process.env.PORT || 8080, '0.0.0.0', () => {
    console.log(`Server running on port ${process.env.PORT || 8080}`);
  });