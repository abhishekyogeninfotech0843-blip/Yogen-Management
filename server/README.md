# MongoDB setup

1. Create a database user in MongoDB Atlas and copy the connection string from **Connect > Drivers**.
2. Add your current IP address under **Network Access** in Atlas.
3. Copy `.env.example` to `.env` and replace every placeholder in `MONGO_URI`.
4. URL-encode reserved characters in the database user's password (for example, `@` becomes `%40`).
5. From the project root, run `npm run dev:server` and `npm run dev` in separate terminals.

The API only starts after MongoDB connects. The frontend keeps a local browser copy and syncs module data to MongoDB when the API is available.
