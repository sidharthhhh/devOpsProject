# GraphQL Todo API - Postman Testing Guide

This document describes the workflow for managing and testing the Todo GraphQL API using Postman. It includes all required payloads (queries, mutations, and variables) for the API endpoints.

## Postman Setup & Workflow

1. **Start the API Server**: 
   Ensure your backend is running by executing `npm run dev` or `npm start` in the terminal. The default API URL is `http://localhost:4000/graphql`.
2. **Setup Request in Postman**:
   - HTTP Method: **POST**
   - URL: `http://localhost:4000/graphql`
   - Body configuration: Select **GraphQL** from the raw body types (this will reveal two panels: one for the `QUERY` and one for `GRAPHQL VARIABLES`).
3. **Workflow Management / Authentication**:
   - Execute the **Register** or **Login** mutation to obtain a JWT `token`.
   - Copy the value of the `token`.
   - For all **Protected** requests, navigate to the **Authorization** tab in Postman, select **Bearer Token** from the dropdown, and paste your JWT token. Postman will automatically inject the `Authorization: Bearer <token>` header for you.

---

## Postman Request Library

### 1. Register User (Public)
Creates a new user and returns an authentication token.

**Query (GraphQL panel):**
```graphql
mutation RegisterUser($name: String!, $email: String!, $password: String!) {
  register(name: $name, email: $email, password: $password) {
    token
    user {
      id
      name
      email
      created_at
    }
  }
}
```

**Variables (GraphQL Variables panel):**
```json
{
  "name": "Jane Doe",
  "email": "jane.doe@example.com",
  "password": "securepassword123"
}
```

---

### 2. Login User (Public)
Authenticates a user and generates a JWT token.

**Query:**
```graphql
mutation LoginUser($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    token
    user {
      id
      email
    }
  }
}
```

**Variables:**
```json
{
  "email": "jane.doe@example.com",
  "password": "securepassword123"
}
```

---

### 3. Create Todo (Protected)
*Requires Bearer Token in the Authorization tab.*

**Query:**
```graphql
mutation CreateNewTodo($title: String!, $description: String) {
  createTodo(title: $title, description: $description) {
    id
    title
    description
    completed
    created_at
  }
}
```

**Variables:**
```json
{
  "title": "Set up CI/CD pipeline",
  "description": "Configure GitHub actions for automated testing and deployment."
}
```

---

### 4. Fetch My Todos (Protected)
*Requires Bearer Token in the Authorization tab.* Fetches only the todos that belong to the authenticated user.

**Query:**
```graphql
query GetMyTodos {
  myTodos {
    id
    title
    description
    completed
    created_at
  }
}
```

**Variables:** *Leave empty*

---

### 5. Fetch Specific Todo (Public / Protected context)
Retrieves a single todo item by its ID.

**Query:**
```graphql
query GetTodoById($id: ID!) {
  todo(id: $id) {
    id
    title
    description
    completed
    user_id
    created_at
  }
}
```

**Variables:**
```json
{
  "id": "1"
}
```

---

### 6. Fetch All Todos (Public)
Fetches every todo in the system.

**Query:**
```graphql
query GetAllTodos {
  todos {
    id
    title
    completed
    user_id
  }
}
```

**Variables:** *Leave empty*

---

### 7. Update Todo (Protected)
*Requires Bearer Token in the Authorization tab.* Updates your existing todo item. You can omit `title`, `description`, or `completed` if you do not want to update all fields.

**Query:**
```graphql
mutation UpdateExistingTodo($id: ID!, $title: String, $description: String, $completed: Boolean) {
  updateTodo(id: $id, title: $title, description: $description, completed: $completed) {
    id
    title
    description
    completed
  }
}
```

**Variables:**
```json
{
  "id": "1",
  "title": "Set up CI/CD pipeline and Webhooks",
  "completed": true
}
```

---

### 8. Delete Todo (Protected)
*Requires Bearer Token in the Authorization tab.* Permanently deletes a todo.

**Query:**
```graphql
mutation DeleteTargetTodo($id: ID!) {
  deleteTodo(id: $id) {
    id
    title
  }
}
```

**Variables:**
```json
{
  "id": "1"
}
```
