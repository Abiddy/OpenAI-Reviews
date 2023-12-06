const express = require('express');
const axios = require('axios');
const app = express();
const OpenAI = require('openai');
const port = 4000;
require('dotenv').config();
const path = require('path');

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Google Places API
app.get('/google_places', async (req, res) => {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const placeId = req.query.place_id;

    const googlePlacesUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${apiKey}`;

    const googlePlacesResponse = await axios.get(googlePlacesUrl);

    if (googlePlacesResponse.data && googlePlacesResponse.data.result) {
      const result = googlePlacesResponse.data.result;
      res.json({
        name: result.name,
        reviews: result.reviews,
      });
    } else {
      console.log('No details found for the given place ID.');
      res.status(404).json({ error: 'No details found' });
    }
  } catch (error) {
    // Handle errors
    console.error('Error getting details from Google Places API:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Summaries API
app.get('/summaries', async (req, res) => {
  try {
    const comments = req.query.comments;
    // Format query for ChatGPT
    const chatGptQuery = `Give a summary of the reviews below in a few sentences in the format: Most people liked the (fill here). Some people disliked (fill blank here): \n\n${comments}`;

    // OpenAI API integration
    const openaiResponse = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: chatGptQuery },
      ],
      model: 'gpt-3.5-turbo',
    });

    // Send ChatGPT response
    const responseData = {
      success: true,
      content: openaiResponse.choices[0].message.content,
    };

    res.json(responseData);
  } catch (error) {
    console.error('Error:', error.message);

    // Update the error response format
    const errorResponse = {
      success: false,
      errors: [error.message],
    };

    res.status(500).json(errorResponse);
  }
});




// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
