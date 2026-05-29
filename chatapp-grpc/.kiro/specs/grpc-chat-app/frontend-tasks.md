# Frontend Implementation Plan: gRPC Chat App

## Overview

Next.js frontend with grpc-web connecting to the gRPC backend through Envoy proxy. Features: auth (login/register), room management, real-time chat, file upload, notifications.

**Stack:**
- Next.js 14 (App Router)
- TypeScript
- grpc-web + protoc-gen-grpc-web (generated client stubs)
- Tailwind CSS
- Zustand (state management)
- Envoy proxy (grpc-web → gRPC translation)

## Tasks

- [ ] 1. Frontend scaffold
  - [ ] 1.1 Create Next.js app with TypeScript + Tailwind
  - [ ] 1.2 Set up Envoy proxy config for grpc-web
  - [ ] 1.3 Generate grpc-web client stubs from proto
  - [ ] 1.4 Create grpc-web client singleton

- [ ] 2. State management and hooks
  - [ ] 2.1 Create Zustand store (auth, rooms, messages, presence)
  - [ ] 2.2 Create useAuth hook
  - [ ] 2.3 Create useRooms hook
  - [ ] 2.4 Create useChat hook (bidirectional stream)
  - [ ] 2.5 Create useNotifications hook

- [ ] 3. Pages and components
  - [ ] 3.1 Auth page (login/register)
  - [ ] 3.2 Main layout (sidebar + chat area)
  - [ ] 3.3 Sidebar (room list, DMs, create room)
  - [ ] 3.4 Chat window (messages, input, typing)
  - [ ] 3.5 File upload component
  - [ ] 3.6 Notification panel

- [ ] 4. Integration
  - [ ] 4.1 Wire everything together in app layout
  - [ ] 4.2 Add docker-compose with Envoy for local dev
