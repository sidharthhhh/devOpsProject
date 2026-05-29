const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    created_at: String!
  }

  type Todo {
    id: ID!
    title: String!
    description: String
    completed: Boolean!
    user_id: ID!
    created_at: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    todos: [Todo!]!
    todo(id: ID!): Todo
    myTodos: [Todo!]!
  }

  type Mutation {
    register(name: String!, email: String!, password: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    createTodo(title: String!, description: String): Todo!
    updateTodo(id: ID!, title: String, description: String, completed: Boolean): Todo!
    deleteTodo(id: ID!): Todo!
  }
`;

module.exports = typeDefs;
