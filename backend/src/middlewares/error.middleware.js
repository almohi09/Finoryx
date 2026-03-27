const errorMiddleware = (err,req,res,next)=>{
    console.error(err);
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal server error";

    // invalid mongoDB ObjectId

    if(err.name === "CastError"){
        statusCode = 400;
        message = "Invalid ID format";
    }

    // duplicate key error (eg email already exists)

    if(err.code === 11000){
        statusCode = 400;
        message = "duplicate field value";
    }

    // mongoose validation error

    if(err.name === "ValidationError"){
        statusCode = 400;
        message = Object.values(err.errors).map(val=>val.message)
        .join(", ");
    }

    res.status(statusCode).json({
        success:false,
        message
    })
}

module.exports = errorMiddleware;