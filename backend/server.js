const dns = require('dns');
dns.setServers(['1.1.1.1']);

const dotEnv = require('dotenv');
dotEnv.config();

const app = require('./src/app.js');
const connectDb = require('./src/config/db');
const PORT = process.env.PORT || 3000;

connectDb();

app.listen(PORT,()=>{
    console.log(`server is running on port ${PORT}`);
});






