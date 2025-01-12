const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const equipRouter = require('./routes/equipments');
const authRouter = require('./routes/auth');
const { connectToDB } = require('./utils/db');
const { authenticate, authorizeRole, extractToken } = require('./utils/auth');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(async (req, res, next) => {
    const token = extractToken(req);
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
            const db = await connectToDB();
            const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.userId) });

            if (user) {
                res.locals.user = { userId: user._id, role: user.role, name: user.name };
            }
            await db.client.close();
        } catch (err) {
            console.error(err);
        }
    }
    next();
});

// Mount routers
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api/users', authenticate, usersRouter);
app.use('/api/equipments', equipRouter);
app.use('/api', authRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  const createError = require('http-errors');
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

process.env.TOKEN_SECRET = 'secret';

module.exports = app;