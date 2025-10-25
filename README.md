# Country Currency & Exchange API

This project is a RESTful API that fetches country data, currency exchange rates, calculates estimated GDP, and stores this information in a MySQL database.

## Features

-   **Data Fetching**: Retrieves country data from `restcountries.com` and exchange rates from `open.er-api.com`.
-   **Data Processing**: Calculates estimated GDP based on population, exchange rates, and a random multiplier.
-   **Database Persistence**: Stores and updates country data in a MySQL database.
-   **API Endpoints**:
    -   `POST /countries/refresh`: Fetches and caches country data and exchange rates.
    -   `GET /countries`: Retrieves all countries from the database with support for filtering (by region, currency) and sorting (by GDP, name).
    -   `GET /countries/:name`: Retrieves a single country by name.
    -   `DELETE /countries/:name`: Deletes a country record by name.
    -   `GET /status`: Shows the total number of countries and the last refresh timestamp.
    -   `GET /countries/image`: Serves a summary image of total countries and top 5 by GDP.
-   **Error Handling**: Implements consistent JSON responses for validation errors, not found, and server errors.
-   **Image Generation**: Creates a summary image of processed data.

## Setup

1.  **Clone the repository**:
    ```bash
    git clone <your-repo-url>
    cd current-exchange-api
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Variables**:
    Create a `.env` file in the root directory and populate it with your database credentials and other configurations:
    ```env
    DB_HOST=localhost
    DB_PORT=3306
    DB_USER=root
    DB_PASSWORD=your_db_password
    DB_NAME=country_currency_db
    PORT=3000
    ```
    *Note: Ensure you have a MySQL server running and a database named `country_currency_db` created.*

4.  **Database Setup**:
    - Create a MySQL database named `country_currency_db`
    - Run the provided `database-schema.sql` script to create the required tables:
    ```bash
    mysql -u root -p < database-schema.sql
    ```
    - Or run the SQL commands manually in your MySQL client

## Running the Application

1.  **Build the TypeScript code**:
    ```bash
    npm run build
    ```

2.  **Start the server**:
    ```bash
    npm start
    ```
    Or for development with hot-reloading:
    ```bash
    npm run dev
    ```

## Testing Endpoints

You can use tools like Postman or `curl` to test the API endpoints.

**Example `curl` commands:**

-   **Refresh Data**:
    ```bash
    curl -X POST http://localhost:3000/countries/refresh
    ```

-   **Get All Countries (sorted by GDP descending)**:
    ```bash
    curl "http://localhost:3000/countries?sort=gdp_desc"
    ```

-   **Get Countries in Africa**:
    ```bash
    curl "http://localhost:3000/countries?region=Africa"
    ```

-   **Get Country by Name (e.g., Nigeria)**:
    ```bash
    curl http://localhost:3000/countries/Nigeria
    ```

-   **Delete Country by Name (e.g., Ghana)**:
    ```bash
    curl -X DELETE http://localhost:3000/countries/Ghana
    ```

-   **Get Status**:
    ```bash
    curl http://localhost:3000/status
    ```

-   **Get Summary Image**:
    ```bash
    curl http://localhost:3000/countries/image -o summary.png
    ```
    *(This will save the image as `summary.png` in your current directory)*

## Dependencies

-   Node.js
-   npm
-   MySQL Server
-   TypeScript
-   Express
-   Axios
-   MySQL2
-   Dotenv
-   Sharp (for image generation)

## Deployment

### Railway (Recommended)

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and Initialize:**
   ```bash
   railway login
   railway init
   ```

3. **Add MySQL Database:**
   ```bash
   railway add mysql
   ```

4. **Set Environment Variables:**
   In Railway dashboard, go to Variables tab and add:
   ```env
   DB_HOST = [your MYSQLHOST value]
   DB_PORT = [your MYSQLPORT value]
   DB_USER = [your MYSQLUSER value]
   DB_PASSWORD = [your MYSQLPASSWORD value]
   DB_NAME = [your MYSQLDATABASE value]
   PORT = 3000
   ```

5. **Run Database Migration:**
   ```bash
   npm run db:migrate
   ```
   Or manually in Railway dashboard:
   - Go to your MySQL service → "Data" tab → "Import/Export" → "Import SQL"
   - Copy and paste the contents of `migrations/001_initial_schema.sql`
   - Click "Import"

6. **Deploy:**
   ```bash
   railway up
   ```

Your API will be live at: `https://your-project-name.railway.app`

## Submission

Follow the submission instructions provided in the task description. Ensure your API is hosted and the GitHub repository link is included with this README.

**For Submission:**
- **API Base URL:** `https://your-project-name.railway.app`
- **GitHub Repository:** Your repository URL
- **Full Name:** Your name
- **Email:** Your email
