import { Request, Response, NextFunction } from 'express';

export interface ValidationError {
  field: string;
  message: string;
}

export const validateCountryData = (req: Request, res: Response, next: NextFunction) => {
  const errors: ValidationError[] = [];

  // Check if request body exists
  if (!req.body) {
    return res.status(400).json({
      error: 'Validation failed',
      details: {
        body: 'Request body is required'
      }
    });
  }

  // Validate required fields
  if (!req.body.name || typeof req.body.name !== 'string' || req.body.name.trim() === '') {
    errors.push({
      field: 'name',
      message: 'is required'
    });
  }

  if (req.body.population === undefined || req.body.population === null) {
    errors.push({
      field: 'population',
      message: 'is required'
    });
  } else if (typeof req.body.population !== 'number' || req.body.population <= 0) {
    errors.push({
      field: 'population',
      message: 'must be a positive number'
    });
  }

  if (!req.body.currency_code || typeof req.body.currency_code !== 'string' || req.body.currency_code.trim() === '') {
    errors.push({
      field: 'currency_code',
      message: 'is required'
    });
  }

  // If there are validation errors, return 400 Bad Request
  if (errors.length > 0) {
    const errorDetails: Record<string, string> = {};
    errors.forEach(error => {
      errorDetails[error.field] = error.message;
    });

    return res.status(400).json({
      error: 'Validation failed',
      details: errorDetails
    });
  }

  // Validation passed, continue to next middleware
  next();
};
