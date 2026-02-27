const todoService = require('../services/todoService');

exports.createTodo = async (req, res, next) => {
    try {
        const { title, description, priority } = req.body;
        if (!title) {
            res.locals.errorMessage = "Title is required";
            return res.status(400).json({ error: "Title is required" });
        }

        const todo = todoService.create({ title, description, priority });
        res.status(201).json(todo);
    } catch (error) {
        next(error);
    }
};

exports.getAllTodos = async (req, res, next) => {
    try {
        const todos = todoService.getAll();
        res.json(todos);
    } catch (error) {
        next(error);
    }
};

exports.getTodoById = async (req, res, next) => {
    try {
        const todo = todoService.getById(req.params.id);
        if (!todo) {
            res.locals.errorMessage = "Todo not found";
            return res.status(404).json({ error: "Todo not found" });
        }
        res.json(todo);
    } catch (error) {
        next(error);
    }
};

exports.updateTodo = async (req, res, next) => {
    try {
        const todo = todoService.update(req.params.id, req.body);
        if (!todo) {
            res.locals.errorMessage = "Todo not found";
            return res.status(404).json({ error: "Todo not found" });
        }
        res.json(todo);
    } catch (error) {
        next(error);
    }
};

exports.deleteTodo = async (req, res, next) => {
    try {
        const success = todoService.delete(req.params.id);
        if (!success) {
            res.locals.errorMessage = "Todo not found";
            return res.status(404).json({ error: "Todo not found" });
        }
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

exports.generateError = async (req, res, next) => {
    try {
        const errorMsg = "This is a custom internally generated 500 error for APM testing!";
        const err = new Error(errorMsg);

        // Manually capture the error with APM to avoid noisy Express stack traces
        const apm = require('elastic-apm-node');
        if (apm.isStarted && apm.isStarted()) {
            apm.captureError(err);
        }

        // Just send the response directly
        res.status(500).json({ error: "Internal Server Error", message: errorMsg });
    } catch (error) {
        next(error);
    }
};
