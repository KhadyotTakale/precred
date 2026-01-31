import dotenv from 'dotenv';
dotenv.config();

const TAVILY_API_URL = 'https://api.tavily.com/search';

export const searchCompany = async (query) => {
  if (!process.env.TAVILY_API_KEY) {
    console.warn('Tavily API Key missing. Skipping search.');
    return [];
  }

  try {
    const response = await fetch(TAVILY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: query,
        search_depth: "basic",
        include_answer: false,
        include_images: false,
        include_raw_content: false,
        max_results: 5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Tavily API error: ${response.status} ${response.statusText}`, errorText);
      return [];
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Tavily Search Error:', error);
    return [];
  }
};

export const performSearch = searchCompany;
