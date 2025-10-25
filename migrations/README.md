# Database Migrations

This directory contains SQL migration files for setting up the Country Currency & Exchange API database.

## Migration Files

### 001_initial_schema.sql
Creates the initial database schema including:
- `countries` table with all required fields
- `global_settings` table for storing global timestamps
- Performance indexes for optimal query speed
- Default global settings

## How to Run Migrations

### Using NPM Scripts (Recommended)

```bash
# Run all pending migrations
npm run db:migrate

# Or directly
npm run migrate

# Or using npx
npx db migrate
```

### Manual Migration

#### For Railway MySQL Database:

1. **Go to your Railway project dashboard**
2. **Click on your MySQL service**
3. **Click on the "Data" tab**
4. **Click "Import/Export"**
5. **Click "Import SQL"**
6. **Copy and paste the contents of `001_initial_schema.sql`**
7. **Click "Import"**

#### Using Railway CLI:

```bash
# Connect to your Railway MySQL database
railway connect mysql

# Run the migration
mysql -u [username] -p [database_name] < migrations/001_initial_schema.sql
```

#### For Local MySQL Database:

```bash
mysql -u root -p country_currency_db < migrations/001_initial_schema.sql
```

## Migration Contents

The migration creates:

1. **Countries Table:**
   - id (Primary Key, Auto Increment)
   - name (Required)
   - capital (Optional)
   - region (Optional)
   - population (Required)
   - currency_code (Optional)
   - exchange_rate (Optional)
   - estimated_gdp (Optional)
   - flag_url (Optional)
   - last_refreshed_at (Timestamp)

2. **Global Settings Table:**
   - setting_key (Primary Key)
   - setting_value (Text)
   - updated_at (Timestamp)

3. **Indexes for Performance:**
   - Index on name
   - Index on region
   - Index on currency_code
   - Index on estimated_gdp

4. **Default Data:**
   - Initial global_settings record for last_refreshed_at

## After Running Migration

Your database will be ready for the API with:
- ✅ All required tables created
- ✅ Proper indexes for performance
- ✅ Default settings configured
- ✅ Ready for country data insertion
