const AppError = require("./../utils/appError");
// const mongoose = require('mongoose');

const handleCastErrorDB = (err) => {
  const message = `Campo invalido en ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  // const value = err.message.match(/(["'])(\\?.)*?\1/)[0];
  console.log(err);
  const value = Object.keys(err.keyValue);
  const message = `El campo: ${value} ya existe. Por favor usa otro valor!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);

  const message = `Datos inválidos. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError("Invalid token. Please log in again!", 401);

const handleJWTExpiredError = () =>
  new AppError("Your token has expired! Please log in again.", 401);

const sendErrorDev = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith("/api")) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }
};

const sendErrorProd = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith("/api")) {
    // A) Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    // B) Programming or other unknown error: don't leak error details
    // 1) Log error
    // console.error('ERROR 💥', err);
    // 2) Send generic message
    return res.status(500).json({
      status: "error",
      message: "Something went very wrong!",
    });
  }
};

module.exports = (err, req, res, next) => {
  // console.log(err.stack);
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV.trim() === "development") {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV.trim() === "production") {
    let error = { ...err };
    error.message = err.message;
    // console.log(error.reason?.name)
    console.log(error._message);

    if (error.reason?.name === "AssertionError")
      error = handleCastErrorDB(error);
    if (error.reason?.name === "CastError") error = handleCastErrorDB(error);
    // if (error.reason && error.reason instanceof mongoose.Error.CastError) error = handleCastErrorDB(error)
    if (error.reason?.name === "BSONError") error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (
      error._message === "Validation failed" ||
      error._message === "User validation failed" ||
      error._message === "Chaza validation failed" ||
      error._message === "Publication validation failed" ||
      error._message === "Customer validation failed" ||
      error._message === "Plan validation failed" ||
      error._message === "Review validation failed" ||
      error._message === "Subscription validation failed"
    )
      error = handleValidationErrorDB(error);
    if (error.name === "JsonWebTokenError") error = handleJWTError();
    if (error.name === "TokenExpiredError") error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};
