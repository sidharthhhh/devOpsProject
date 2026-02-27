const errorHandler = (err, req, res, next) => {
    // Only log the message so the console isn't flooded with stack traces during our tests
    console.error(`[Error] ${err.message}`);

    res.locals.errorMessage = err.message;
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
};

module.exports = errorHandler;
