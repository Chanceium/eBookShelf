# eBookShelf - Personal eBook Hosting Platform

A self-hosted platform for managing and reading your eBook collection, built with React, TypeScript, and PocketBase.

## Features

- Browse books by category with a clean, responsive UI
- Read PDF books directly in the browser
- Admin dashboard for managing books and categories
- Upload PDF files and cover images
- Secure authentication for admin users

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: PocketBase (embedded database and backend)
- **PDF Viewer**: react-pdf
- **Routing**: React Router
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- PocketBase executable (download from [pocketbase.io](https://pocketbase.io/))

### Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Download PocketBase from [pocketbase.io](https://pocketbase.io/docs/) and place the executable in the project root

4. Start PocketBase:
   ```
   ./pocketbase serve
   ```
   This will start PocketBase on http://127.0.0.1:8090

5. Open the PocketBase admin UI at http://127.0.0.1:8090/_/ and create an admin account

6. Import the schema from `pb_schema.json` or create the collections manually:
   - `books` collection with fields: title, author, description, category (relation), coverImage (file), pdfFile (file)
   - `categories` collection with field: name

7. Start the development server:
   ```
   npm run dev
   ```

8. Visit http://localhost:5173 to see the application

## Usage

### User Interface

- Browse books on the home page
- Filter books by category
- Click on a book to read it in the built-in PDF viewer

### Admin Interface

1. Log in at `/login` with your PocketBase admin credentials
2. Access the admin dashboard at `/admin`
3. Add, edit, or delete categories
4. Upload new books with metadata, cover images, and PDF files

## Project Structure

- `/src/components` - Reusable UI components
- `/src/pages` - Page components for different routes
- `/src/lib` - Utility functions and PocketBase client
- `/public` - Static assets

## License

This project is licensed under the MIT License.