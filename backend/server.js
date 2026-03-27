const dns = require('dns');
dns.setServers(['1.1.1.1']);

const app = require('./src/app.js');
const connectDb = require('./src/config/db');
const dotEnv = require('dotenv');
const PORT = process.env.PORT || 3000;

dotEnv.config();
connectDb();

app.listen(PORT,()=>{
    console.log(`server is running on port ${PORT}`);
});






