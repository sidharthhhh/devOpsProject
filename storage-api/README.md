# Storage API

Production-grade file storage service API built with Node.js, TypeScript, and clean architecture.

## Features

- **File Upload**: Upload files with metadata storage
- **File Retrieval**: Get file metadata and download files
- **File Listing**: List all files with pagination and sorting
- **File Deletion**: Delete files from storage and database
- **Multiple Storage Providers**: Local storage with easy migration to S3/R2
- **Clean Architecture**: Modular, scalable, and maintainable code structure
- **Production Ready**: Error handling, logging, validation, and more

## Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MySQL
- **Validation**: Zod
- **Logging**: Pino
- **File Upload**: Multer

## Project Structure

```
storage-api/
├── schema.sql                  # Database schema
├── src/
│   ├── config/
│   │   ├── index.ts           # Environment configuration
│   │   └── logger.ts          # Logger setup
│   ├── database/
│   │   └── mysql.ts           # MySQL connection pool
│   ├── middlewares/
│   │   ├── auth.middleware.ts       # Authentication middleware
│   │   ├── error.middleware.ts      # Global error handling
│   │   └── request-logger.middleware.ts
│   ├── modules/
│   │   └── file/
│   │       ├── dto/
│   │       │   └── file.dto.ts      # Zod DTOs
│   │       ├── file.controller.ts   # HTTP handlers
│   │       ├── file.repository.ts    # Database operations
│   │       ├── file.routes.ts        # Route definitions
│   │       └── file.service.ts       # Business logic
│   ├── storage/
│   │   ├── index.ts            # Storage factory
│   │   ├── local.storage.ts    # Local storage provider
│   │   ├── s3.storage.ts       # S3 storage provider
│   │   └── storage.interface.ts # Storage provider interface
│   ├── types/
│   │   ├── errors.ts           # Global error classes
│   │   └── README.md           # Error handling documentation
│   ├── utils/
│   │   ├── file.utils.ts       # File utilities
│   │   └── response.ts         # API response format
│   ├── app.ts                  # Express app setup
│   └── server.ts               # Server entry point
├── .env.example
├── .eslintrc.js
├── .gitignore
├── .prettierrc
├── package.json
├── README.md
└── tsconfig.json
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MySQL (v8 or higher)
- npm or yarn

### Installation

1. **Clone and install dependencies**:
   ```bash
   cd storage-api
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Set up the database**:
   ```bash
   # Create database and tables using MySQL client
   mysql -u root -p < schema.sql
   
   # Or manually create the database
   mysql -u root -p
   CREATE DATABASE storage_api;
   USE storage_api;
   SOURCE schema.sql;
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |
| `npm run format` | Format code with Prettier |

## API Endpoints

### Upload File
```bash
POST /api/files/upload
Content-Type: multipart/form-data

# With curl
curl -X POST http://localhost:3000/api/files/upload \
  -F "file=@path/to/file.jpg"
```

### List Files
```bash
GET /api/files?page=1&limit=20&sortBy=createdAt&sortOrder=desc

# With curl
curl http://localhost:3000/api/files
```

### Get File Metadata
```bash
GET /api/files/:id

# With curl
curl http://localhost:3000/api/files/550e8400-e29b-41d4-a716-446655440000
```

### Download File
```bash
GET /api/files/:id/download

# With curl
curl -O http://localhost:3000/api/files/550e8400-e29b-41d4-a716-446655440000/download
```

### Delete File
```bash
DELETE /api/files/:id

# With curl
curl -X DELETE http://localhost:3000/api/files/550e8400-e29b-41d4-a716-446655440000
```

## API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

### Error Response
```json
{
  "success": false,
  "data": null,
  "error": "Error message"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "files": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  },
  "error": null
}
```

## Storage Provider Configuration

### Local Storage (Default)
```env
STORAGE_PROVIDER=local
UPLOAD_PATH=./uploads
```

### Amazon S3
```env
STORAGE_PROVIDER=s3
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key
S3_BUCKET=your_bucket_name
S3_REGION=us-east-1
```

### Cloudflare R2 (Future Support)
```env
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY=your_access_key
R2_SECRET_KEY=your_secret_key
R2_BUCKET=your_bucket_name
```

## Database Schema

```sql
CREATE TABLE files (
  id VARCHAR(36) PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size BIGINT UNSIGNED NOT NULL,
  storage_key VARCHAR(500) NOT NULL,
  storage_provider VARCHAR(50) NOT NULL DEFAULT 'local',
  url VARCHAR(1000) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_storage_provider (storage_provider),
  INDEX idx_created_at (created_at),
  INDEX idx_storage_key (storage_key)
);
```

## Error Handling

The API uses a comprehensive global error handling system:

### Error Response Format

**Simple Error:**
```json
{
  "success": false,
  "data": null,
  "error": "File not found: 123e4567-e89b-12d3-a456-426614174000"
}
```

**Error with Details:**
```json
{
  "success": false,
  "data": null,
  "error": {
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "code": "invalid_string"
      }
    ]
  }
}
```

### HTTP Status Codes

The API uses standard HTTP status codes:
- `200` - Success
- `201` - Created
- `204` - No Content (successful deletion)
- `400` - Bad Request (invalid input, file type not allowed)
- `401` - Unauthorized
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

### Custom Error Classes

The API provides custom error classes for different scenarios:
- `BadRequestError` - Invalid input or request
- `UnauthorizedError` - Authentication required
- `ForbiddenError` - Access denied
- `NotFoundError` - Resource not found
- `FileNotFoundError` - Specific file not found
- `ValidationError` - Input validation failed
- `DatabaseError` - Database operation failed
- `StorageError` - File storage operation failed

See `src/types/README.md` for detailed error handling documentation.

## Logging

Logs are output to console with the following levels:
- `info` - General information
- `warn` - Warnings
- `error` - Errors

In development, logs are formatted for readability. In production, JSON format is used.

## Validation

All API inputs are validated using Zod:
- File IDs must be valid UUIDs
- Pagination parameters have sensible defaults and limits
- File uploads are validated for type and size

## Security Considerations

1. **File Type Validation**: Only allowed MIME types are accepted
2. **File Size Limits**: Configurable maximum file size
3. **Filename Sanitization**: Filenames are sanitized before storage
4. **CORS Configuration**: Configurable allowed origins
5. **Error Messages**: Generic error messages in production

## Future Enhancements

- [ ] Chunked file uploads
- [ ] Signed URLs for secure file access
- [ ] File access control and permissions
- [ ] CDN integration
- [ ] Background processing for large files
- [ ] Webhook notifications
- [ ] Rate limiting
- [ ] File compression

## License

MIT
