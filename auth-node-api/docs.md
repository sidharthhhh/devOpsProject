# Auth Service API Documentation

## Base URL

```
http://localhost:3000/api/auth
```

## Authentication Method

All protected APIs require a **JWT Bearer Token**.

Example header:

```
Authorization: Bearer <JWT_TOKEN>
```

---

# Roles Supported

The system supports the following roles:

```
admin
sales
architect
distributor
electrician
```

---

# 1. Register User

Create a new user with a selected role.

### Endpoint

```
POST /api/auth/register
```

### Access

Public

### Request Body

```json
{
  "email": "sales@test.com",
  "password": "123456",
  "role": "sales"
}
```

### Backend Flow

```
1 Validate role
2 Generate member ID
3 Hash password
4 Store user in database
```

### Example Response

```json
{
  "memberId": "SAL-0001"
}
```

### Database Example

```
id | member_id | email            | role_id
1  | SAL-0001  | sales@test.com   | 2
```

---

# 2. Login

Authenticate a user and generate a JWT token.

### Endpoint

```
POST /api/auth/login
```

### Access

Public

### Request Body

```json
{
  "email": "sales@test.com",
  "password": "123456"
}
```

### Backend Flow

```
1 Find user by email
2 Compare password using bcrypt
3 Generate JWT token
4 Return token
```

### Example Response

```json
{
  "token": "JWT_TOKEN"
}
```

### Example Decoded JWT

```json
{
  "userId": 1,
  "role": "sales",
  "iat": 1710000000,
  "exp": 1710086400
}
```

---

# 3. Get Current User

Returns the authenticated user's information.

### Endpoint

```
GET /api/auth/me
```

### Access

Authenticated users

### Allowed Roles

```
admin
sales
architect
distributor
electrician
```

### Headers

```
Authorization: Bearer <JWT_TOKEN>
```

### Example Response

```json
{
  "userId": 1,
  "role": "sales"
}
```

### Purpose

```
Verify login session
Return user role
Used for dashboards
```

---

# 4. Change Password

Allows authenticated users to change their password.

### Endpoint

```
PATCH /api/auth/change-password
```

### Access

Authenticated users

### Allowed Roles

```
admin
sales
architect
distributor
electrician
```

### Headers

```
Authorization: Bearer <JWT_TOKEN>
```

### Request Body

```json
{
  "currentPassword": "123456",
  "newPassword": "newPassword123"
}
```

### Backend Flow

```
1 Extract userId from JWT
2 Fetch stored password
3 Compare currentPassword
4 Hash newPassword
5 Update database
```

### Success Response

```json
{
  "message": "Password updated successfully"
}
```

### Error Response

```json
{
  "message": "Current password is incorrect"
}
```

---

# 5. Logout

Logs out the user.

### Endpoint

```
POST /api/auth/logout
```

### Access

Authenticated users

### Allowed Roles

```
admin
sales
architect
distributor
electrician
```

### Headers

```
Authorization: Bearer <JWT_TOKEN>
```

### Example Response

```json
{
  "message": "Logout successful"
}
```

### Note

```
JWT logout is client-side.
The client deletes the stored token.
```

---

# 6. Admin Test Route (RBAC Example)

Example route used to verify role-based access control.

### Endpoint

```
GET /api/auth/admin/test
```

### Access

Admin only

### Allowed Roles

```
admin
```

### Headers

```
Authorization: Bearer <JWT_TOKEN>
```

### Success Response

```json
{
  "message": "Admin route"
}
```

### Forbidden Response

```json
{
  "message": "Forbidden"
}
```

### HTTP Status

```
403 Forbidden
```

---

# Role Access Matrix

| Endpoint         | Admin | Sales | Architect | Distributor | Electrician |
| ---------------- | ----- | ----- | --------- | ----------- | ----------- |
| Register         | Yes   | Yes   | Yes       | Yes         | Yes         |
| Login            | Yes   | Yes   | Yes       | Yes         | Yes         |
| Get Current User | Yes   | Yes   | Yes       | Yes         | Yes         |
| Change Password  | Yes   | Yes   | Yes       | Yes         | Yes         |
| Logout           | Yes   | Yes   | Yes       | Yes         | Yes         |
| Admin Test       | Yes   | No    | No        | No          | No          |

---

# Authentication Flow

```
User registers with role
      ↓
User logs in
      ↓
Server generates JWT
      ↓
Client stores token
      ↓
Client sends token in Authorization header
      ↓
Middleware verifies token
      ↓
Role middleware validates access
      ↓
Controller executes
```

---

# Example Authorization Header

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

# System Features Implemented

```
User registration with role
Member ID generation
Secure password hashing
JWT authentication
Role based access control
Protected routes
Password change
Logout
```

---

# Future APIs (Recommended)

These APIs will extend your RBAC system:

```
GET  /admin/users
PATCH /admin/change-role
GET  /roles
GET  /users/:id
DELETE /admin/user
```

These endpoints will help manage users and roles in your **ERP / IoT platform**.
