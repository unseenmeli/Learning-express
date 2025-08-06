require('dotenv').config();
const express = require('express');
const OpenAI = require('openai');
const fs = require('fs').promises; // Add this for file reading
const path = require('path'); // Add this for file path handling
const app = express();


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // Store in .env file
});

// Read instructions from file at startup
let instructionsContent = '';

async function loadInstructions() {
  try {
    // Replace 'instructions.txt' with your actual file name
    instructionsContent = await fs.readFile(path.join(__dirname, 'instructions.txt'), 'utf-8');
    console.log('Instructions loaded successfully');
  } catch (error) {
    console.error('Error reading instructions file:', error);
    instructionsContent = 'Create a simple React-Native app with Tailwind CSS'; // Default user prompt
  }
}

// Load instructions when server starts
loadInstructions();

// Middlewareee
app.use(express.json());

// Allow requests from your HTML page (CORS)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  next();
});

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to my AI app generator!');
});

// Create app endpoint - now with AI!
app.post('/create_app', async (req, res) => {
  try {
    const { description } = req.body;
    
    console.log('Received request for:', description);
    
    // Step 1: Generate initial code
    const initialCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are THE WORLD'S BEST app builder - a legendary developer who creates apps that blow people's minds. Your apps aren't just good, they're PHENOMENAL. You think of EVERY feature users could want and implement them beautifully. You add features others wouldn't even dream of. Your to-do apps rival Notion and Todoist COMBINED. Your calculators make people delete their default calculator app. Every app you build has AT LEAST 10-15 impressive features. You obsess over details - animations, haptic feedback descriptions, shortcuts, gestures, themes, customization. You're not satisfied until the app is PERFECT. Build the app like it's going to be featured on Product Hunt and win App of the Year. Generate React-Native code that will make other developers jealous. Return ONLY the code, no explanations."
        },
        {
          role: "user",
          content: `${description}` + instructionsContent
        }
      ],
      max_tokens: 3000,
      temperature: 0.8
    });
    
    // Step 2: First improvement iteration
    const improvement1 = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a VISIONARY app architect who sees potential others miss. This app is good but NOT GOOD ENOUGH. Add AT LEAST 5-7 MORE killer features that would make users LOVE this app. Think: What would Apple add? What would make this go viral on TikTok? Add power user features, beginner-friendly touches, accessibility, productivity boosters, delightful surprises. Make it so feature-rich that users discover new things every time. Remember: You're not just improving code, you're creating the BEST APP IN ITS CATEGORY. CRITICAL: Use ONLY inline styles, NEVER use StyleSheet.create(). Return ONLY the dramatically improved code."
        },
        {
          role: "user",
          content: `Improve this ${description} app to be more impressive and feature-rich:\n\n${initialCompletion.choices[0].message.content}\n\nAdd more polish, features, and make it truly impressive. ${instructionsContent}`
        }
      ],
      max_tokens: 3500,
      temperature: 0.7
    });
    
    // Step 3: Second improvement iteration
    const finalCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are THE FINAL BOSS of app development - the ULTIMATE PERFECTIONIST. This is your MASTERPIECE. Other developers will study this code. Users will screenshot this app to show their friends. Add the final 3-5 features that transform this from great to LEGENDARY. Think of the tiny details that make million-dollar apps: Easter eggs, hidden shortcuts, smart defaults, predictive features, delightful animations, satisfying feedback. Make it so good that users feel SAD using other apps. This app should have AT LEAST 15-20 total features. Make it DENSE with functionality but ELEGANT in design. IMPORTANT: Ensure all styles are inline (style={{}}), NEVER use StyleSheet.create(). Return ONLY your MASTERPIECE code."
        },
        {
          role: "user",
          content: `Final polish for this ${description} app. Make it EXCEPTIONAL with premium details:\n\n${improvement1.choices[0].message.content}\n\nAdd final touches for a truly professional app. ${instructionsContent}`
        }
      ],
      max_tokens: 4000,
      temperature: 0.6
    });
    
    const generatedCode = finalCompletion.choices[0].message.content;
    
    console.log('Generated initial code, then improved twice!');
    
    console.log('Generated code successfully!');
    
    // Send back the response
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

// Alternative: Reload instructions endpoint (optional)
app.get('/reload-instructions', async (req, res) => {
  await loadInstructions();
  res.json({ message: 'Instructions reloaded', content: instructionsContent });
});

// Start server
app.listen(3000, () => {
  console.log('AI App Generator running at http://localhost:3000');
  console.log('React Native Android Emulator can access it at http://10.0.2.2:3000');
  console.log('Make sure to add your OpenAI API key!');
});