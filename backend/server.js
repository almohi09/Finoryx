const dns = require('dns');
dns.setServers(['1.1.1.1']);

const app = require('./src/app.js');
const connectDb = require('./src/config/db');
const dotEnv = require('dotenv');

dotEnv.config();
connectDb();

app.listen(3000,()=>{
    console.log("server is running on port 3000");
});






