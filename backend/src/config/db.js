const mongoose = require('mongoose');

async function connectDb(){
    try{
        await mongoose.connect(process.env.MONGO_URI)
        console.log("connected to db");
    }
    catch(err){
        console.log("error connecting to db",err);
    }
}

module.exports = connectDb;