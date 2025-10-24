import express from 'express';
import dotenv from 'dotenv';
import countryRoutes from './routes/countryRoutes';
import { getStatus } from './controllers/CountryController';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Global error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Mount the country routes
app.use('/countries', countryRoutes);

// Status route at root level (as required by task)
app.get('/status', getStatus);

// Basic root route
app.get('/', (req, res) => {
  res.send('Country Currency & Exchange API is running!');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
