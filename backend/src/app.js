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

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin:"http://localhost:5173",
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

module.exports = app;
