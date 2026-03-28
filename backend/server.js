const dns = require('dns');
dns.setServers(['1.1.1.1']);

const dotEnv = require('dotenv');
dotEnv.config();

const app = require('./src/app.js');
const connectDb = require('./src/config/db');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectDb();
    console.log("DB connected");

    app.listen(PORT, () => {
      console.log(`server is running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Failed to connect DB:", error);
    process.exit(1);
  }
}

startServer();