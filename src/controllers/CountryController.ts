import { Request, Response } from 'express';
import axios from 'axios';
import pool from '../db';
import { Country, Currency } from '../models/Country';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp'; // Import sharp for image generation

const REST_COUNTRIES_API = 'https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies';
const EXCHANGE_RATES_API = 'https://open.er-api.com/v6/latest/USD';
const CACHE_DIR = path.join(process.cwd(), 'dist/cache');
const IMAGE_PATH = path.join(CACHE_DIR, 'summary.png');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export const refreshCountries = async (req: Request, res: Response) => {
  let countriesData: any[] = [];
  let exchangeRates: Record<string, number> = {}; // Use Record for better type safety
  const lastRefreshTimestamp = new Date();

  try {
    // 1. Fetch countries data with timeout
    console.log('Fetching countries data...');
    const countriesResponse = await axios.get(REST_COUNTRIES_API, {
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent': 'Country-Currency-API/1.0'
      }
    });
    countriesData = countriesResponse.data;
    console.log(`Fetched ${countriesData.length} countries`);

    // 2. Fetch exchange rates with timeout
    console.log('Fetching exchange rates...');
    const ratesResponse = await axios.get(EXCHANGE_RATES_API, {
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent': 'Country-Currency-API/1.0'
      }
    });
    exchangeRates = ratesResponse.data.rates;
    console.log(`Fetched ${Object.keys(exchangeRates).length} exchange rates`);

  } catch (error: any) {
    console.error('Error fetching external data:', error.message);
    return res.status(503).json({
      error: 'External data source unavailable',
      details: `Could not fetch data from ${error.config?.url || 'external API'}`,
    });
  }

  const dbPool = pool;

  try {
    await dbPool.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    await dbPool.query('START TRANSACTION');

    const countriesProcessed: Country[] = [];

    for (const country of countriesData) {
      const currencyInfo = country.currencies?.[0];
      const currency_code = currencyInfo?.code || null;
      const flag_url = country.flag || null;

      let exchange_rate: number | null = null;
      if (currency_code && exchangeRates[currency_code]) {
        exchange_rate = exchangeRates[currency_code];
      }

      let estimated_gdp: number | null = null;
      if (country.population && exchange_rate !== null && exchange_rate > 0) { // Ensure exchange_rate is positive
        const randomMultiplier = Math.random() * (2000 - 1000) + 1000;
        estimated_gdp = (country.population * randomMultiplier) / exchange_rate;
      } else if (country.population && !currency_code) {
        // Handle case where currency_code is null but population exists
        estimated_gdp = 0; // As per requirement: "Set estimated_gdp to 0"
      }

      const countryRecord: Country = {
        name: country.name,
        capital: country.capital ?? null,
        region: country.region ?? null,
        population: country.population ?? null,
        currency_code: currency_code,
        exchange_rate: exchange_rate,
        estimated_gdp: estimated_gdp,
        flag_url: flag_url,
        last_refreshed_at: lastRefreshTimestamp,
      };
      countriesProcessed.push(countryRecord);

      // Check if country exists by name (case-insensitive)
      const [existingCountry]: any[] = await dbPool.execute(
        'SELECT id FROM countries WHERE LOWER(name) = LOWER(?)',
        [country.name]
      );

      if (existingCountry.length > 0) {
        // Update existing country
        const countryId = existingCountry[0].id;
        await dbPool.execute(
          `UPDATE countries SET
            capital = ?, region = ?, population = ?, currency_code = ?,
            exchange_rate = ?, estimated_gdp = ?, flag_url = ?, last_refreshed_at = ?
          WHERE id = ?`,
          [
            countryRecord.capital,
            countryRecord.region,
            countryRecord.population,
            countryRecord.currency_code,
            countryRecord.exchange_rate,
            countryRecord.estimated_gdp,
            countryRecord.flag_url,
            countryRecord.last_refreshed_at,
            countryId,
          ]
        );
      } else {
        // Insert new country
        await dbPool.execute(
          `INSERT INTO countries (name, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url, last_refreshed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            countryRecord.name,
            countryRecord.capital,
            countryRecord.region,
            countryRecord.population,
            countryRecord.currency_code,
            countryRecord.exchange_rate,
            countryRecord.estimated_gdp,
            countryRecord.flag_url,
            countryRecord.last_refreshed_at,
          ]
        );
      }
    }

    // Update global last_refreshed_at timestamp
    await dbPool.execute(
      `INSERT INTO global_settings (setting_key, setting_value, updated_at)
       VALUES ('last_refreshed_at', ?, ?)
       ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = ?`,
      [lastRefreshTimestamp.toISOString(), lastRefreshTimestamp, lastRefreshTimestamp.toISOString(), lastRefreshTimestamp]
    );

    // 3. Generate summary image
    await generateSummaryImage(countriesProcessed.length, countriesProcessed, lastRefreshTimestamp, IMAGE_PATH);

    await dbPool.query('COMMIT');

    res.status(200).json({ message: 'Countries data refreshed successfully', total_countries_processed: countriesProcessed.length });

  } catch (error: any) {
    console.error('Error processing and storing country data:', error.message);
    await dbPool.query('ROLLBACK'); // Rollback transaction on error
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// --- Endpoint Implementations ---

// GET /countries
export const getAllCountries = async (req: Request, res: Response) => {
  const { region, currency, sort } = req.query;
  let query = `SELECT * FROM countries WHERE 1=1`;
  const queryParams: any[] = [];

  if (region) {
    query += ` AND region = ?`;
    queryParams.push(region);
  }
  if (currency) {
    query += ` AND currency_code = ?`;
    queryParams.push(currency);
  }

  let orderBy = '';
  if (sort === 'gdp_desc') {
    orderBy = 'ORDER BY estimated_gdp DESC';
  } else if (sort === 'gdp_asc') {
    orderBy = 'ORDER BY estimated_gdp ASC';
  } else if (sort === 'name_asc') {
    orderBy = 'ORDER BY name ASC';
  } else if (sort === 'name_desc') {
    orderBy = 'ORDER BY name DESC';
  }
  // Add more sorting options if needed

  query += ` ${orderBy}`;

  try {
    const [rows]: any[] = await pool.execute(query, queryParams);
    res.status(200).json(rows);
  } catch (error: any) {
    console.error('Error fetching countries:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// GET /countries/:name
export const getCountryByName = async (req: Request, res: Response) => {
  const { name } = req.params;
  try {
    const [rows]: any[] = await pool.execute('SELECT * FROM countries WHERE LOWER(name) = LOWER(?)', [name]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Country not found' });
    }
    res.status(200).json(rows[0]);
  } catch (error: any) {
    console.error('Error fetching country by name:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// DELETE /countries/:name
export const deleteCountryByName = async (req: Request, res: Response) => {
  const { name } = req.params;
  try {
    const [result]: any[] = await pool.execute('DELETE FROM countries WHERE LOWER(name) = LOWER(?)', [name]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Country not found' });
    }
    res.status(200).json({ message: `Country '${name}' deleted successfully` });
  } catch (error: any) {
    console.error('Error deleting country:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// GET /status
export const getStatus = async (req: Request, res: Response) => {
  try {
    const [countryCountResult]: any[] = await pool.execute('SELECT COUNT(*) as total_countries FROM countries');
    const totalCountries = countryCountResult[0].total_countries;

    // Fetch the global last refreshed timestamp from global_settings table
    const [globalSettingsResult]: any[] = await pool.execute(
      'SELECT setting_value FROM global_settings WHERE setting_key = ?',
      ['last_refreshed_at']
    );
    const lastRefreshedAt = globalSettingsResult.length > 0 ? globalSettingsResult[0].setting_value : null;

    res.status(200).json({
      total_countries: totalCountries,
      last_refreshed_at: lastRefreshedAt,
    });
  } catch (error: any) {
    console.error('Error fetching status:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// GET /countries/image
export const getSummaryImage = async (req: Request, res: Response) => {
  if (!fs.existsSync(IMAGE_PATH)) {
    return res.status(404).json({ error: 'Summary image not found' });
  }
  res.sendFile(IMAGE_PATH);
};


// Function to generate summary image
async function generateSummaryImage(totalCountries: number, countries: Country[], timestamp: Date, outputPath: string) {
  const top5GDP = countries
    .filter(c => c.estimated_gdp !== null && c.estimated_gdp > 0) // Filter out null/zero GDP
    .sort((a, b) => (b.estimated_gdp ?? 0) - (a.estimated_gdp ?? 0)) // Sort descending by GDP
    .slice(0, 5); // Get top 5

  let svgContent = `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <style>
        .title { font: 700 30px sans-serif; fill: #333; }
        .section-title { font: 700 20px sans-serif; fill: #555; margin-top: 20px; }
        .text { font: 16px sans-serif; fill: #333; }
        .country-item { font: 16px sans-serif; fill: #333; margin-bottom: 10px; }
        .timestamp { font: 12px sans-serif; fill: #777; }
      </style>
      <text x="50" y="50" class="title">Country Data Summary</text>
      <text x="50" y="100" class="text">Total Countries Processed: ${totalCountries}</text>
      <text x="50" y="140" class="timestamp">Last Refresh: ${timestamp.toISOString()}</text>

      <text x="50" y="200" class="section-title">Top 5 Countries by Estimated GDP</text>
  `;

  if (top5GDP.length > 0) {
    top5GDP.forEach((country, index) => {
      svgContent += `
        <text x="70" y="${250 + index * 30}" class="country-item">
          ${index + 1}. ${country.name} (GDP: ${country.estimated_gdp?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || 'N/A'})
        </text>
      `;
    });
  } else {
    svgContent += `
      <text x="70" y="250" class="country-item">No countries with positive GDP found.</text>
    `;
  }

  svgContent += `</svg>`;

  try {
    await sharp(Buffer.from(svgContent))
      .png()
      .toFile(outputPath);
    console.log(`Summary image generated successfully at ${outputPath}`);
  } catch (imageError: any) {
    console.error('Error generating summary image:', imageError.message);
    // Continue without image if generation fails
  }
}
