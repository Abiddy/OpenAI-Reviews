const express = require('express');
const axios = require('axios');
const app = express();
const OpenAI = require('openai');
const port = 8000;
require('dotenv').config();
const path = require('path');

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, });

const { getJson } = require("serpapi");


// get restaurant places
app.get('/places', (req, res) => {
    const apiUrl = 'https://api.yelp.com/v3/businesses/search';
    const searchTerm = 'food';
    let location;

  // Check if the user provided a specific city
if (req.query.city) {
location = req.query.city;
} else {
// Check if the user wants to use their current location
if (req.query.useCurrentLocation === 'true') {
    // If the useCurrentLocation parameter is true, attempt to get the user's location
    if (req.query.latitude && req.query.longitude) {
    // If latitude and longitude are provided, use them
    location = `${req.query.latitude},${req.query.longitude}`;
    } else {
    // Otherwise, default to Gardena
    location = 'Gardena';
    }
} else {
    // Default to Gardena if no city or location is provided
    location = 'Gardena';
}
}

axios.get(apiUrl, {
    headers: {
    Authorization: `Bearer ${process.env.YELP_API}`,
    },
    params: {
    term: searchTerm,
    location: location,
    },
    })
    .then(response => {
    if (response.data && response.data.businesses && response.data.businesses.length > 0) {
        const mappedData = response.data.businesses.map((business) => {
        const { alias, coordinates } = business;
        return { alias, coordinates };
        });

        res.json(mappedData);
        
    } else {
        console.log('No businesses found in the Yelp API response.');
        res.status(404).json({ error: 'No businesses found' });
    }
    })
    .catch(error => {
      // Handle errors
    console.error('Error making Yelp API request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
    });
});

app.get('/summaries', async (req, res) => {
try {

    // serpAPI integration

    let place_id

    if (req.query.place_id) {
        place_id = req.query.place_id;
    }
    const yelpResponse = await getJson({
    engine: 'yelp_reviews',
    place_id: place_id,
    api_key: process.env.SERP_API_KEY, 
    });

    // Extract comments from reviews
    const comments = yelpResponse.reviews.map((review) => review.comment.text);

    // Format query for ChatGPT
    const chatGptQuery = `Give a summary of the reviews below in a few sentence in the format: Most people liked the (fill here). Some people disliked (fill blank here) : \n\n${comments.join('\n\n')}`;
    

    // openAI API integration
    const openaiResponse = await openai.chat.completions.create({
    messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: chatGptQuery },
    ],
    model: "gpt-3.5-turbo",
    });

    // Send ChatGPT response
    console.log(openaiResponse)
    res.json(openaiResponse.choices[0].message.content);
} catch (error) {
    console.error('Error:', error.message);
    res.status(500).send('Internal Server Error');
}
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
