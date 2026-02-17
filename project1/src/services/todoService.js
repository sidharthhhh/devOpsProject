const { v4: uuidv4 } = require('uuid');

// In-memory storage
let todos = [];

class TodoService {
    getAll() {
        return todos;
    }

    getById(id) {
        return todos.find(t => t.id === id);
    }

    create(data) {
        const newTodo = {
            id: uuidv4(),
            title: data.title,
            description: data.description || '',
            status: data.status || 'pending', // pending, completed
            priority: data.priority || 'medium', // low, medium, high
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        todos.push(newTodo);
        return newTodo;
    }

    update(id, data) {
        const index = todos.findIndex(t => t.id === id);
        if (index === -1) return null;

        todos[index] = {
            ...todos[index],
            ...data,
            updatedAt: new Date().toISOString()
        };
        return todos[index];
    }

    delete(id) {
        const index = todos.findIndex(t => t.id === id);
        if (index === -1) return false;

        todos.splice(index, 1);
        return true;
    }

    count() {
        return todos.length;
    }

    // For seeding/resetting
    reset() {
        todos = [];
    }
}

module.exports = new TodoService();
