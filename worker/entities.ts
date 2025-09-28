import { IndexedEntity } from "./core-utils";
import type { User, Note } from "@shared/types";
// The state stored in the Durable Object for a user.
export interface UserRecord extends User {
  passwordHash: string;
  noteIds: string[];
}
export class UserEntity extends IndexedEntity<UserRecord> {
  static readonly entityName = "user";
  static readonly indexName = "users";
  static readonly initialState: UserRecord = { id: "", username: "", passwordHash: "", noteIds: [] };
  // NOTE: The incompatible `keyOf` override has been removed to fix the TS2417 type error.
  // The base class implementation `(state) => state.id` is now used.
  // The user's ID is set to their lowercase username upon creation in the route handler.
  async getPasswordHash(): Promise<string> {
    await this.ensureState();
    return this._state.passwordHash;
  }
  async updatePasswordHash(newHash: string): Promise<void> {
    await this.mutate(s => ({
      ...s,
      passwordHash: newHash,
    }));
  }
  async addNoteId(noteId: string): Promise<void> {
    await this.mutate(s => ({
      ...s,
      // Defensive check to prevent "not iterable" error if noteIds is missing.
      noteIds: [...new Set([...(s.noteIds || []), noteId])]
    }));
  }
  async removeNoteId(noteId: string): Promise<void> {
    await this.mutate(s => ({
      ...s,
      // Defensive check to prevent calling .filter on a non-array.
      noteIds: (s.noteIds || []).filter(id => id !== noteId)
    }));
  }
}
// Represents a single note entity in Durable Objects.
export class NoteEntity extends IndexedEntity<Note> {
    static readonly entityName = "note";
    static readonly indexName = "notes";
    static readonly initialState: Note = {
        id: "",
        title: "Yeni Not",
        content: "",
        userId: "",
        createdAt: "",
        updatedAt: ""
    };
}