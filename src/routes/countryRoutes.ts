import { Router } from 'express';
import {
  refreshCountries,
  getAllCountries,
  getCountryByName,
  deleteCountryByName,
  getSummaryImage,
} from '../controllers/CountryController';

const router = Router();

// POST /countries/refresh
router.post('/refresh', refreshCountries);

// GET /countries
router.get('/', getAllCountries);

// GET /countries/image (must come before /:name to avoid conflicts)
router.get('/image', getSummaryImage);

// GET /countries/:name
router.get('/:name', getCountryByName);

// DELETE /countries/:name
router.delete('/:name', deleteCountryByName);

export default router;
