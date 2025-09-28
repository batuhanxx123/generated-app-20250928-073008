import React, { useState, useEffect, useMemo } from 'react';
import { create } from 'zustand';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Loader2, LogOut, Save, User, Lock, ShieldCheck, UserPlus, PlusCircle, Trash2, FileText, KeyRound, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Note } from '@shared/types';
// --- State Management with Zustand ---
interface AppState {
  isAuthenticated: boolean;
  username: string | null;
  password: string | null;
  notes: Note[];
  activeNoteId: string | null;
  isLoading: boolean; // For auth process
  isNotesLoading: boolean; // For initial notes load in dashboard
  isSaving: boolean;
  actions: {
    login: (username: string, password: string, notes: Note[], isMobile: boolean) => void;
    logout: () => void;
    setActiveNoteId: (noteId: string | null) => void;
    addNote: (note: Note) => void;
    updateNote: (noteId: string, title: string, content: string) => void;
    deleteNote: (noteId: string) => void;
    setLoading: (loading: boolean) => void;
    setSaving: (saving: boolean) => void;
    finishNotesLoading: () => void;
    updatePassword: (newPassword: string) => void;
  };
}
const useAppStore = create<AppState>((set, get) => ({
  isAuthenticated: false,
  username: null,
  password: null,
  notes: [],
  activeNoteId: null,
  isLoading: false,
  isNotesLoading: true,
  isSaving: false,
  actions: {
    login: (username, password, notes, isMobile) => {
      const sortedNotes = [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      set({ 
        isAuthenticated: true, 
        username, 
        password, 
        notes: sortedNotes, 
        activeNoteId: isMobile ? null : (sortedNotes[0]?.id || null), 
        isLoading: false, 
        isNotesLoading: true 
      });
    },
    logout: () => set({ isAuthenticated: false, username: null, password: null, notes: [], activeNoteId: null }),
    setActiveNoteId: (noteId) => set({ activeNoteId: noteId }),
    addNote: (note) => set((state) => ({ notes: [note, ...state.notes], activeNoteId: note.id })),
    updateNote: (noteId, title, content) => set((state) => {
      const noteToUpdate = state.notes.find(n => n.id === noteId);
      if (!noteToUpdate) return {};
      const updatedNote = { ...noteToUpdate, title, content, updatedAt: new Date().toISOString() };
      const otherNotes = state.notes.filter(n => n.id !== noteId);
      return { notes: [updatedNote, ...otherNotes] };
    }),
    deleteNote: (noteId) => {
      const remainingNotes = get().notes.filter(n => n.id !== noteId);
      const newActiveId = get().activeNoteId === noteId ? (remainingNotes[0]?.id || null) : get().activeNoteId;
      set({ notes: remainingNotes, activeNoteId: newActiveId });
    },
    setLoading: (loading) => set({ isLoading: loading }),
    setSaving: (saving) => set({ isSaving: saving }),
    finishNotesLoading: () => set({ isNotesLoading: false }),
    updatePassword: (newPassword) => set({ password: newPassword }),
  },
}));
// --- UI Components ---
const AuthForm = ({ isRegister = false }: { isRegister?: boolean }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, setLoading } = useAppStore((s) => s.actions);
  const isLoading = useAppStore((s) => s.isLoading);
  const isMobile = useIsMobile();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || isLoading) return;
    setLoading(true);
    try {
      if (isRegister) {
        await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) });
        toast.success('Kayıt Başarılı', { description: 'Şimdi giriş yapabilirsiniz.' });
        setUsername('');
        setPassword('');
      } else {
        const data = await api<{ username: string; notes: Note[] }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
        const notes = Array.isArray(data.notes) ? data.notes : [];
        login(data.username, password, notes, isMobile);
        toast.success('Giriş Başarılı', { description: 'Notlarınız başarıyla yüklendi.' });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.';
      toast.error(isRegister ? 'Kayıt Başarısız' : 'Giriş Başarısız', { description: errorMessage });
    } finally {
      setLoading(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="relative">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input id={isRegister ? 'reg-username' : 'login-username'} type="text" placeholder="Kullanıcı Adı" value={username} onChange={(e) => setUsername(e.target.value)} required className="pl-10 h-12 text-base" disabled={isLoading} />
      </div>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input id={isRegister ? 'reg-password' : 'login-password'} type="password" placeholder="Şifre" value={password} onChange={(e) => setPassword(e.target.value)} required className="pl-10 h-12 text-base" disabled={isLoading} />
      </div>
      <Button type="submit" className="w-full h-12 text-base font-semibold transition-all duration-200 ease-in-out hover:shadow-md active:scale-95" disabled={isLoading}>
        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (isRegister ? 'Kayıt Ol' : 'Giriş Yap')}
      </Button>
    </form>
  );
};
const AuthView = () => (
  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="w-full max-w-sm">
    <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-lg">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4"><div className="p-3 bg-blue-500/10 rounded-full border border-blue-500/20"><ShieldCheck className="w-8 h-8 text-blue-500" /></div></div>
        <CardTitle className="text-3xl font-display">VaultNote</CardTitle>
        <CardDescription>Güvenli not defterinize erişin veya yeni bir hesap oluşturun.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="login"><Lock className="w-4 h-4 mr-2" />Giriş Yap</TabsTrigger><TabsTrigger value="register"><UserPlus className="w-4 h-4 mr-2" />Kayıt Ol</TabsTrigger></TabsList>
          <TabsContent value="login" className="pt-6"><AuthForm /></TabsContent>
          <TabsContent value="register" className="pt-6"><AuthForm isRegister /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  </motion.div>
);
const NoteListSkeleton = () => (
  <div className="p-4 space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center space-x-4">
        <div className="space-y-2 flex-grow">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);
const ChangePasswordDialog = () => {
  const username = useAppStore(s => s.username);
  const currentPassword = useAppStore(s => s.password);
  const { updatePassword } = useAppStore(s => s.actions);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Şifreler eşleşmiyor.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (!username || !currentPassword) return;
    setIsChanging(true);
    try {
      await api('/api/user/password', {
        method: 'PUT',
        body: JSON.stringify({ username, password: currentPassword, newPassword }),
      });
      updatePassword(newPassword);
      toast.success('Şifre başarıyla değiştirildi.');
      setIsOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.';
      toast.error('Şifre değiştirilemedi.', { description: errorMessage });
    } finally {
      setIsChanging(false);
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><KeyRound className="mr-2 h-4 w-4" />Şifre Değiştir</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Şifreyi Değiştir</DialogTitle>
          <DialogDescription>Güvenliğiniz için yeni bir şifre belirleyin. Bu işlemden sonra mevcut şifreniz geçersiz olacaktır.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handlePasswordChange} className="grid gap-4 py-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="new-password" type="password" placeholder="Yeni ��ifre" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="pl-10" />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="confirm-password" type="password" placeholder="Yeni Şifreyi Onayla" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="pl-10" />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary">İptal</Button></DialogClose>
            <Button type="submit" disabled={isChanging}>
              {isChanging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Değiştir
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
const DashboardView = () => {
  const username = useAppStore(s => s.username);
  const password = useAppStore(s => s.password);
  const notes = useAppStore(s => s.notes);
  const activeNoteId = useAppStore(s => s.activeNoteId);
  const isSaving = useAppStore(s => s.isSaving);
  const isNotesLoading = useAppStore(s => s.isNotesLoading);
  const { logout, setActiveNoteId, addNote, updateNote, deleteNote, setSaving, finishNotesLoading } = useAppStore(s => s.actions);
  const activeNote = useMemo(() => notes.find(n => n.id === activeNoteId), [notes, activeNoteId]);
  const [currentTitle, setCurrentTitle] = useState(activeNote?.title || '');
  const [currentContent, setCurrentContent] = useState(activeNote?.content || '');
  const isMobile = useIsMobile();
  const hasUnsavedChanges = useMemo(() => {
    if (!activeNote) return false;
    return currentTitle !== activeNote.title || currentContent !== activeNote.content;
  }, [currentTitle, currentContent, activeNote]);
  useEffect(() => {
    setCurrentTitle(activeNote?.title || '');
    setCurrentContent(activeNote?.content || '');
  }, [activeNote]);
  useEffect(() => {
    const timer = setTimeout(() => { finishNotesLoading(); }, 500);
    return () => clearTimeout(timer);
  }, [finishNotesLoading]);
  const handleCreateNote = async () => {
    if (!username || !password) return;
    toast.promise(
      api<Note>('/api/notes', { method: 'POST', body: JSON.stringify({ username, password }) }),
      {
        loading: 'Yeni not oluşturuluyor...',
        success: (newNote) => { addNote(newNote); return 'Not başarıyla oluşturuldu.'; },
        error: 'Not oluşturulamadı.',
      }
    );
  };
  const handleUpdateNote = async () => {
    if (!username || !password || !activeNoteId || isSaving || !hasUnsavedChanges) return;
    setSaving(true);
    try {
      const updatedNote = await api<Note>(`/api/notes/${activeNoteId}`, {
        method: 'PUT',
        body: JSON.stringify({ username, password, title: currentTitle, content: currentContent }),
      });
      updateNote(updatedNote.id, updatedNote.title, updatedNote.content);
      toast.success('Not Kaydedildi');
    } catch (error) {
      toast.error('Not kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };
  const handleDeleteNote = async (noteId: string) => {
    if (!username || !password) return;
    toast.promise(
      api(`/api/notes/${noteId}`, { method: 'DELETE', body: JSON.stringify({ username, password }) }),
      {
        loading: 'Not siliniyor...',
        success: () => { deleteNote(noteId); return 'Not başarıyla silindi.'; },
        error: 'Not silinemedi.',
      }
    );
  };
  const NoteListComponent = () => (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold">Notlarım</h2>
        <Button size="sm" onClick={handleCreateNote}><PlusCircle className="mr-2 h-4 w-4" />Yeni</Button>
      </div>
      <ScrollArea className="flex-grow">
        {isNotesLoading ? <NoteListSkeleton /> : notes.map(note => (
          <div key={note.id} onClick={() => setActiveNoteId(note.id)} className={cn("p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors", activeNoteId === note.id && "bg-muted")}>
            <div className="flex items-start justify-between">
              <div className="truncate flex-grow">
                <p className="font-semibold truncate">{note.title}</p>
                <p className="text-sm text-muted-foreground truncate mt-1">{note.content || 'İçerik yok'}</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8 ml-2" onClick={e => e.stopPropagation()}><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Notu Silmek İstediğinizden Emin misiniz?</AlertDialogTitle><AlertDialogDescription>Bu işlem geri alınamaz. Not kalıcı olarak silinecektir.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteNote(note.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sil</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true, locale: tr })}</p>
          </div>
        ))}
      </ScrollArea>
    </div>
  );
  const EditorComponent = () => (
    activeNote ? (
      <div className="flex flex-col h-full bg-background">
        <div className="p-4 border-b flex items-center justify-between gap-4">
          {isMobile && <Button variant="ghost" size="icon" onClick={() => setActiveNoteId(null)}><ArrowLeft className="h-5 w-5" /></Button>}
          <div className="flex items-center flex-grow min-w-0">
            <Input value={currentTitle} onChange={e => setCurrentTitle(e.target.value)} className="text-lg font-semibold border-0 focus-visible:ring-0 focus-visible:ring-offset-0 flex-grow" placeholder="Not Başlığı" />
            <AnimatePresence>
              {hasUnsavedChanges && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="w-2.5 h-2.5 bg-blue-500 rounded-full ml-2 flex-shrink-0" title="Kaydedilmemiş değişiklikler"></motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button onClick={handleUpdateNote} disabled={isSaving || !hasUnsavedChanges}><Save className="mr-2 h-4 w-4" />{isSaving ? 'Kaydediliyor...' : 'Kaydet'}</Button>
        </div>
        <Textarea value={currentContent} onChange={e => setCurrentContent(e.target.value)} placeholder="Notunuzu buraya yazın..." className="flex-grow resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-4 text-base" />
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-background">
        <FileText className="w-16 h-16 mb-4" />
        <h3 className="text-xl font-semibold">Not Seçilmedi</h3>
        <p>Görüntülemek için bir not seçin veya yeni bir tane oluşturun.</p>
      </div>
    )
  );
  const DesktopLayout = () => (
    <ResizablePanelGroup direction="horizontal" className="flex-grow rounded-lg border my-4">
      <ResizablePanel defaultSize={25} minSize={20} maxSize={40}><NoteListComponent /></ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={75}><EditorComponent /></ResizablePanel>
    </ResizablePanelGroup>
  );
  const MobileLayout = () => (
    <div className="w-full h-full pt-4 relative overflow-hidden">
      <AnimatePresence initial={false}>
        {activeNoteId ? (
          <motion.div key="editor" className="absolute inset-0" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }}>
            <EditorComponent />
          </motion.div>
        ) : (
          <motion.div key="list" className="absolute inset-0" initial={{ x: 0 }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }}>
            <NoteListComponent />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="w-full h-screen max-w-7xl mx-auto flex flex-col p-0 sm:p-4">
      <header className="flex items-center justify-between p-4 sm:p-0 sm:pb-4 border-b gap-4">
        <h1 className="text-xl font-semibold truncate">Hoşgeldin, <span className="font-bold text-blue-500">{username}</span></h1>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ChangePasswordDialog />
          <Button variant="outline" onClick={logout}><LogOut className="mr-2 h-4 w-4" />Çıkış Yap</Button>
        </div>
      </header>
      {isMobile ? <MobileLayout /> : <DesktopLayout />}
      <footer className="text-center text-xs text-muted-foreground py-2 hidden sm:block">
        Built with ❤️ at Cloudflare
      </footer>
    </motion.div>
  );
};
// --- Main App Component ---
export function HomePage() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  return (
    <>
      <main className="min-h-screen w-full bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
        <div className="absolute inset-0 h-full w-full bg-white dark:bg-black bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#374151_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="relative min-h-screen w-full flex items-center justify-center p-0">
          <AnimatePresence mode="wait">
            {isAuthenticated ? <DashboardView key="dashboard" /> : <AuthView key="auth" />}
          </AnimatePresence>
        </div>
      </main>
      <Toaster richColors position="top-right" />
    </>
  );
}