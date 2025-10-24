-- Country Currency & Exchange API Database Schema
-- Run this script to create the required tables

-- Create database (run this separately)
CREATE DATABASE IF NOT EXISTS country_currency_db;
USE country_currency_db;

-- Countries table
CREATE TABLE countries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    capital VARCHAR(255),
    region VARCHAR(255),
    population INT NOT NULL,
    currency_code VARCHAR(3),
    exchange_rate DECIMAL(15, 6),
    estimated_gdp DECIMAL(20, 2),
    flag_url VARCHAR(255),
    last_refreshed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_region (region),
    INDEX idx_currency_code (currency_code),
    INDEX idx_estimated_gdp (estimated_gdp)
);

-- Global settings table for storing global timestamps
CREATE TABLE global_settings (
    setting_key VARCHAR(255) PRIMARY KEY,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default global settings
INSERT INTO global_settings (setting_key, setting_value, updated_at)
VALUES ('last_refreshed_at', NULL, NOW());
