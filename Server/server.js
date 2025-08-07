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
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No auth token provided' });
    }

    const { user } = await db.auth.verifyToken(token);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    req.userEmail = user.email;
    next();
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

app.listen(3000, () => {
  console.log('AI App Generator running at http://localhost:3000');
});