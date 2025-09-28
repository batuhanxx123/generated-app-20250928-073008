import { Hono, Next } from "hono";
import { Context } from "hono";
import type { Env } from './core-utils';
import { UserEntity, NoteEntity } from "./entities";
import { ok, bad, notFound, isStr } from './core-utils';
import type { Note } from "@shared/types";
// Define types for our Hono app context for type safety
type HonoContext = {
  Bindings: Env,
  Variables: {
    userEntity: UserEntity,
    userId: string,
    body: Record<string, unknown>
  }
}
// Helper to create a SHA-256 hash of a string.
async function createHash(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
// Middleware for authenticating a user based on username and password.
// It now parses the body once and stores it in the context.
const authenticateUser = async (c: Context<HonoContext>, next: Next) => {
    const body = await c.req.json();
    const { username, password } = body;
    if (!isStr(username) || !isStr(password)) {
        return bad(c, 'Kimlik bilgileri gereklidir.');
    }
    const userId = username.toLowerCase();
    const user = new UserEntity(c.env, userId);
    if (!(await user.exists())) {
        return notFound(c, 'Kullanıcı bulunamadı veya şifre yanlış.');
    }
    const storedHash = await user.getPasswordHash();
    const providedHash = await createHash(password);
    if (storedHash !== providedHash) {
        return bad(c, 'Kullanıcı bulunamadı veya şifre yanlış.');
    }
    c.set('userEntity', user);
    c.set('userId', userId);
    c.set('body', body); // Store the parsed body in context
    await next();
};
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // --- User Registration ---
  app.post('/api/auth/register', async (c) => {
    const { username, password } = await c.req.json<{ username?: string; password?: string }>();
    if (!isStr(username) || !isStr(password)) return bad(c, 'Kullanıcı adı ve şifre gereklidir.');
    if (username.length < 3) return bad(c, 'Kullanıcı adı en az 3 karakter olmalıdır.');
    if (password.length < 6) return bad(c, 'Şifre en az 6 karakter olmalıdır.');
    const userId = username.toLowerCase();
    const user = new UserEntity(c.env, userId);
    if (await user.exists()) return bad(c, 'Bu kullanıcı adı zaten alınmış.');
    const passwordHash = await createHash(password);
    await UserEntity.create(c.env, {
      id: userId,
      username: username,
      passwordHash: passwordHash,
      noteIds: []
    });
    return ok(c, { success: true });
  });
  // --- User Login ---
  app.post('/api/auth/login', async (c) => {
    const { username, password } = await c.req.json<{ username?: string; password?: string }>();
    if (!isStr(username) || !isStr(password)) return bad(c, 'Kullanıcı adı ve şifre gereklidir.');
    const userId = username.toLowerCase();
    const user = new UserEntity(c.env, userId);
    if (!(await user.exists())) return notFound(c, 'Kullanıcı bulunamadı veya şifre yanlış.');
    const storedHash = await user.getPasswordHash();
    const providedHash = await createHash(password);
    if (storedHash !== providedHash) return bad(c, 'Kullanıcı bulunamadı veya şifre yanlış.');
    const userState = await user.getState();
    // Defensive check to ensure noteIds is an array
    const notePromises = (userState.noteIds || []).map(noteId => new NoteEntity(c.env, noteId).getState());
    const notes = await Promise.all(notePromises);
    return ok(c, { username: userState.username, notes: notes.filter(Boolean) });
  });
  // --- Authenticated Note Routes ---
  const noteRoutes = new Hono<HonoContext>();
  noteRoutes.use('*', authenticateUser);
  // --- Create Note ---
  noteRoutes.post('/', async (c) => {
    const user = c.get('userEntity');
    const userId = c.get('userId');
    const noteId = crypto.randomUUID();
    const now = new Date().toISOString();
    const newNote: Note = {
      id: noteId,
      title: "İsimsiz Not",
      content: "Yeni notunuzu buraya yazın...",
      userId: userId,
      createdAt: now,
      updatedAt: now,
    };
    await NoteEntity.create(c.env, newNote);
    await user.addNoteId(noteId);
    return ok(c, newNote);
  });
  // --- Update Note ---
  noteRoutes.put('/:noteId', async (c) => {
    const userId = c.get('userId');
    const noteId = c.req.param('noteId');
    const { title, content } = c.get('body'); // Read from context instead of parsing body again
    const note = new NoteEntity(c.env, noteId);
    if (!(await note.exists())) return notFound(c, 'Not bulunamadı.');
    const noteState = await note.getState();
    if (noteState.userId !== userId) return c.json({ success: false, error: 'Yetkisiz işlem.' }, 403);
    await note.patch({
        ...(typeof title === 'string' && { title }),
        ...(typeof content === 'string' && { content }),
        updatedAt: new Date().toISOString(),
    });
    return ok(c, await note.getState());
  });
  // --- Delete Note ---
  noteRoutes.delete('/:noteId', async (c) => {
    const user = c.get('userEntity');
    const userId = c.get('userId');
    const noteId = c.req.param('noteId');
    const note = new NoteEntity(c.env, noteId);
    if (!(await note.exists())) return notFound(c, 'Not bulunamadı.');
    const noteState = await note.getState();
    if (noteState.userId !== userId) return c.json({ success: false, error: 'Yetkisiz işlem.' }, 403);
    await NoteEntity.delete(c.env, noteId);
    await user.removeNoteId(noteId);
    return ok(c, { success: true });
  });
  app.route('/api/notes', noteRoutes);
  // --- Authenticated User Management Routes ---
  const userManagementRoutes = new Hono<HonoContext>();
  userManagementRoutes.use('*', authenticateUser);
  // --- Change Password ---
  userManagementRoutes.put('/password', async (c) => {
    const user = c.get('userEntity');
    const { newPassword } = c.get('body');
    if (!isStr(newPassword) || newPassword.length < 6) {
      return bad(c, 'Yeni şifre en az 6 karakter olmalıdır.');
    }
    const newPasswordHash = await createHash(newPassword);
    await user.updatePasswordHash(newPasswordHash);
    return ok(c, { success: true });
  });
  app.route('/api/user', userManagementRoutes);
}