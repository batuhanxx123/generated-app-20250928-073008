export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
// Simplified User type for client-side session management
export interface User {
  id: string; // username
  username: string;
}
// Represents a single note document
export interface Note {
  id: string;
  title: string;
  content: string;
  userId: string; // The username of the owner
  createdAt: string;
  updatedAt: string;
}