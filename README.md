# eBookShelf - Personal eBook Hosting Platform

A self-hosted platform for managing and reading your eBook collection, built with React, TypeScript, and PocketBase.

## Features

- Browse books by category with a clean, responsive UI
- Read PDF books directly in the browser
- Admin dashboard for managing books and categories
- Upload PDF files and cover images
- Secure authentication for admin users

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Express server with PocketBase
- **Database**: PocketBase (embedded database and backend)
- **PDF Viewer**: react-pdf
- **Routing**: React Router
- **Icons**: Lucide React

## Getting Started

### Docker Deployment (Recommended)

1. Clone the repository.
2. Make sure you have Docker and Docker Compose installed.
3. Build and start the containers using Docker Compose.

   This will:
   - Start PocketBase container on port 8090 (external and internal)
   - Build and start the eBookShelf application on port 8091 (external)

4. Check the PocketBase logs and look for the initial admin setup token. Go to the provided link looks something like `http://your-server-ip:8090/_/###################` and use this URL to create your first admin user.
5. After logging in to the PocketBase admin UI, import the schema:
   - Navigate to Settings > Import Collections
   - Select "Load from JSON" and choose the `pb_schema.json` file from the `/pocketbase` directory
   - Check the "Merge collections" option
   - Click "Review" and confirm the import

6. Access your eBookShelf application at `http://your-server-ip:8091`
