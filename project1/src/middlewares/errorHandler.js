const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.locals.errorMessage = err.message;
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
};

module.exports = errorHandler;
