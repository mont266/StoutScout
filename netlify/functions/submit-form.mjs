// netlify/functions/submit-form.mjs
import fetch from 'node-fetch';

export const handler = async (event) => {
  // --- CORS Preflight Check ---
  // Netlify handles OPTIONS requests automatically, but this is good practice
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    };
  }

  // --- Only allow POST requests ---
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
      headers: { 'Allow': 'POST' }
    };
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const body = new URLSearchParams(event.body);
    const formName = body.get('form-name');

    if (!formName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing form-name in submission.' }),
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      };
    }
    
    // The URL for the Netlify site where the form is defined.
    // process.env.URL is a built-in Netlify environment variable.
    const siteUrl = process.env.URL;
    if (!siteUrl) {
      throw new Error("Site URL is not available in environment variables.");
    }

    // Forward the submission to Netlify's internal form handler
    const response = await fetch(siteUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      // If Netlify's endpoint fails, forward the error
      const errorText = await response.text();
      console.error(`Netlify form submission failed with status ${response.status}:`, errorText);
      throw new Error(`Internal form submission failed.`);
    }

    // Return a success response to the client (the Capacitor app)
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Form submitted successfully via proxy' }),
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    };

  } catch (error) {
    console.error('Error in submit-form function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An internal server error occurred.' }),
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    };
  }
};
