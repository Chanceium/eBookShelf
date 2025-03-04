# eBookShelf 📚 – Personal eBook Hosting Platform  
A self-hosted platform for organizing, hosting, and sharing your personal eBook collection. Built with **React, TypeScript, and PocketBase**, it offers a clean UI, secure authentication, and an intuitive reading experience.  

## Features  
✅ **Browse by Category** – Navigate books easily with a responsive UI  
✅ **In-Browser PDF Reader** – Read PDFs directly without downloads  
✅ **Admin Dashboard** – Manage books, categories, and users  
✅ **Upload Support** – Add PDFs and cover images seamlessly  
✅ **Secure Authentication** – Admin-only access for management  

## Tech Stack  
🖥 **Frontend:** React, TypeScript, Tailwind CSS, Vite  
⚙ **Backend:** Express server with PocketBase  
📂 **Database:** PocketBase (embedded database + backend)  
📖 **PDF Viewer:** `react-pdf`  
🚀 **Routing:** React Router  
🎨 **Icons:** Lucide React  

## Deployment  
eBookShelf is lightweight and easy to deploy using **Docker**.  

```yaml
services:
  pocketbase:
    image: elestio/pocketbase:v0.25.7
    container_name: pocketbase
    restart: unless-stopped
    user: 0:0
    ports:
      - "8090:8090"
    volumes:
      - ebookshelf:/pb_data

  ebookshelf:
    image: chanceium/ebookshelf:latest
    container_name: ebookshelf
    restart: unless-stopped
    ports:
      - "8091:3001"
    environment:
      - NODE_ENV=production

volumes:
  ebookshelf:
```

## Access  
- **Admin Panel:** [`http://localhost:8090/_/`](http://localhost:8090/_/)  
- **eBookShelf UI:** [`http://localhost:8091`](http://localhost:8091)  

## Contributing  
Contributions and feature suggestions are welcome! Open an issue or PR on [GitHub](https://github.com/chanceium/ebookshelf).  
