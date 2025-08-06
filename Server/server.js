require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs').promises;
const path = require('path');
const systemPrompts = require('./instructions');
const app = express();


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

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  next();
});

// Authentication middleware
const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authentication token provided' });
  }
  
  const userEmail = authHeader.substring(7);
  
  if (!userEmail || !userEmail.includes('@')) {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
  
  req.userEmail = userEmail;
  next();
};

app.get('/', (req, res) => {
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

app.get('/reload-instructions', async (req, res) => {
  await loadInstructions();
  res.json({ message: 'Instructions reloaded', content: instructionsContent });
});

app.listen(3000, () => {
  console.log('AI App Generator running at http://localhost:3000');
  console.log('React Native Android Emulator can access it at http://10.0.2.2:3000');
  console.log('Using Claude AI (Anthropic) for code generation');
  console.log('Make sure to add your ANTHROPIC_API_KEY or CLAUDE_API_KEY in .env file!');
});