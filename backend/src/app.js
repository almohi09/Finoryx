const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const cors = require('cors');
const authRouter = require('./routes/auth.routes');
const financeRouter = require("./routes/finance.routes");
const errorMiddleware = require('./middlewares/error.middleware');
const investmentRouter = require('./routes/investment.routes');
const dashboardRouter = require('./routes/dashboard.routes');
const habitRouter = require('./routes/habit.routes');
const goalRouter = require('./routes/goal.routes');
const adminRouter = require('./routes/admin.routes');
const feedbackRouter = require("./routes/feedback.routes");

const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin:(origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials:true
}));


app.use('/api/auth',authRouter);
app.use("/api/finance",financeRouter);
app.use("/api/investments",investmentRouter);
app.use('/api/dashboard',dashboardRouter);
app.use('/api/habits',habitRouter);
app.use('/api/goals',goalRouter);
app.use('/api/admin',adminRouter);
app.use("/api/feedback", feedbackRouter);
app.use(errorMiddleware)

const path = require('path');

// Serve static files from the frontend build directory
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// Catch-all route to serve the frontend's index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../../frontend/dist', 'index.html'));
});

module.exports = app;
