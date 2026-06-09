import { useState, useEffect } from 'react';
import { Maximize2, Minimize2, Sparkles, BookOpen } from 'lucide-react';
import KioskView from './components/KioskView';
import AdminView from './components/AdminView';
import { Visitor, SystemSettings, User } from './types';
import { generateMockVisitors, MOCK_USERS } from './data/mockData';
import { db, isFirebaseConnected, handleFirestoreError, OperationType, auth } from './lib/firebase';
import { collection, doc, getDoc, setDoc, getDocs, orderBy, query, deleteDoc } from 'firebase/firestore';

export default function App() {
  // 1. Core Persistent Visitor Record state
  const [visitors, setVisitors] = useState<Visitor[]>(() => {
    const saved = localStorage.getItem('school_library_visitors');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.warn('Error reading visitors local storage, load fallback mocks', err);
      }
    }
    const initialMocks = generateMockVisitors();
    localStorage.setItem('school_library_visitors', JSON.stringify(initialMocks));
    return initialMocks;
  });

  // 2. Audio Settings state (Text-to-Speech config)
  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('school_library_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.warn('Error reading settings local storage', err);
      }
    }
    return {
      tts_enabled: true,
      tts_volume: 0.8,
      tts_rate: 1.0,
      library_name: 'Perpustakaan Labschool Jakarta',
      library_logo: '',
      head_librarian_name: 'Dra. Hj. Suparni, M.Psi',
      head_librarian_nip: '197412232001122003',
      library_motto_id: '"Jendela dunia terbuka lebar bagi mereka yang gemar membaca dan mencari ilmu."',
      library_motto_en: '"The window of the world is wide open for those who love to read and seek knowledge."',
    };
  });

  // 3. User lists state (Manajemen Pengguna)
  const [usersList, setUsersList] = useState<User[]>(() => {
    const saved = localStorage.getItem('guestbook_users');
    return saved ? JSON.parse(saved) : MOCK_USERS;
  });

  // Track whether we have loaded settings/users successfully from Firebase
  // to avoid overwriting database values with default values on startup (race condition)
  const [isLoadedFromFirebase, setIsLoadedFromFirebase] = useState(false);

  // 4. Current active view: 'kiosk' (Visitor screen) or 'admin' (Library Office)
  const [viewMode, setViewMode] = useState<'kiosk' | 'admin'>('kiosk');
  
  // 5. Kiosk fullscreen trigger state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync state to local storage and Firebase
  useEffect(() => {
    localStorage.setItem('school_library_visitors', JSON.stringify(visitors));
  }, [visitors]);

  useEffect(() => {
    localStorage.setItem('school_library_settings', JSON.stringify(settings));
    
    // Save settings to Firebase if connected and remote state has loaded
    async function saveSettingsToFirebase() {
      if (isFirebaseConnected && db && isLoadedFromFirebase) {
        try {
          const settingsRef = doc(db, 'system_settings', 'default');
          await setDoc(settingsRef, {
            id: 'default',
            tts_enabled: settings.tts_enabled,
            tts_volume: settings.tts_volume,
            tts_rate: settings.tts_rate,
            library_name: settings.library_name || 'Perpustakaan Labschool Jakarta',
            library_logo: settings.library_logo || '',
            head_librarian_name: settings.head_librarian_name || 'Dra. Hj. Suparni, M.Psi',
            head_librarian_nip: settings.head_librarian_nip || '197412232001122003',
            library_motto_id: settings.library_motto_id || '"Jendela dunia terbuka lebar bagi mereka yang gemar membaca dan mencari ilmu."',
            library_motto_en: settings.library_motto_en || '"The window of the world is wide open for those who love to read and seek knowledge."',
            updated_at: new Date().toISOString()
          }).catch((err) => {
            handleFirestoreError(err, OperationType.UPDATE, 'system_settings/default');
            throw err;
          });
        } catch (err) {
          console.error('Failed to sync settings with Firebase:', err);
        }
      }
    }
    saveSettingsToFirebase();
  }, [settings, isLoadedFromFirebase]);

  // Synchronize usersList to local storage and Firestore
  useEffect(() => {
    localStorage.setItem('guestbook_users', JSON.stringify(usersList));

    async function saveUsersToFirebase() {
      if (isFirebaseConnected && db && isLoadedFromFirebase) {
        try {
          // Write every user to the 'library_users' collection in Firestore
          for (const user of usersList) {
            const userRef = doc(db, 'library_users', user.username.toLowerCase());
            await setDoc(userRef, {
              id: user.id,
              name: user.name,
              username: user.username,
              password: user.password || (user.role === 'admin' ? 'admin123' : 'petugas123'),
              role: user.role,
              last_login: user.last_login
            }).catch((err) => {
              handleFirestoreError(err, OperationType.UPDATE, `library_users/${user.username}`);
              throw err;
            });
          }
        } catch (err) {
          console.error('Failed to sync users with Firebase:', err);
        }
      }
    }
    saveUsersToFirebase();
  }, [usersList, isLoadedFromFirebase]);

  const handleUpdateUsers = async (updatedList: User[]) => {
    // 1. Find if any user was deleted, and delete them from Firestore
    if (isFirebaseConnected && db && isLoadedFromFirebase) {
      try {
        const deletedUsers = usersList.filter(u => !updatedList.some(ul => ul.id === u.id));
        for (const du of deletedUsers) {
          const docRef = doc(db, 'library_users', du.username.toLowerCase());
          await deleteDoc(docRef).catch((err) => {
            handleFirestoreError(err, OperationType.DELETE, `library_users/${du.username}`);
            throw err;
          });
        }
      } catch (err) {
        console.error('Failed to delete user from Firebase:', err);
      }
    }
    
    // 2. Set memory state
    setUsersList(updatedList);
  };

  // Load from Firebase at startup if connected
  useEffect(() => {
    async function syncWithFirebase() {
      if (!isFirebaseConnected || !db) {
        setIsLoadedFromFirebase(true);
        return;
      }
      
      try {
        // Fetch visitors
        const visitorsRef = collection(db, 'visitors');
        const q = query(visitorsRef, orderBy('created_at', 'desc'));
        const querySnapshot = await getDocs(q).catch((err) => {
          handleFirestoreError(err, OperationType.LIST, 'visitors');
          throw err;
        });
        
        const dbVisitors: Visitor[] = [];
        querySnapshot.forEach((doc) => {
          dbVisitors.push(doc.data() as Visitor);
        });
          
        if (dbVisitors.length > 0) {
          setVisitors(dbVisitors);
        }

        // Fetch settings
        const settingsRef = doc(db, 'system_settings', 'default');
        const settingsSnap = await getDoc(settingsRef).catch((err) => {
          handleFirestoreError(err, OperationType.GET, 'system_settings/default');
          throw err;
        });

        if (settingsSnap.exists()) {
          const dbSettings = settingsSnap.data();
          setSettings({
            tts_enabled: dbSettings.tts_enabled,
            tts_volume: dbSettings.tts_volume,
            tts_rate: dbSettings.tts_rate,
            library_name: dbSettings.library_name,
            library_logo: dbSettings.library_logo || '',
            head_librarian_name: dbSettings.head_librarian_name || 'Dra. Hj. Suparni, M.Psi',
            head_librarian_nip: dbSettings.head_librarian_nip || '197412232001122003',
            library_motto_id: dbSettings.library_motto_id || '"Jendela dunia terbuka lebar bagi mereka yang gemar membaca dan mencari ilmu."',
            library_motto_en: dbSettings.library_motto_en || '"The window of the world is wide open for those who love to read and seek knowledge."',
          });
        }

        // Fetch library users
        const usersRef = collection(db, 'library_users');
        const usersSnapshot = await getDocs(usersRef).catch((err) => {
          handleFirestoreError(err, OperationType.LIST, 'library_users');
          throw err;
        });

        const dbUsers: User[] = [];
        usersSnapshot.forEach((doc) => {
          const ud = doc.data();
          dbUsers.push({
            id: ud.id,
            name: ud.name,
            username: ud.username,
            password: ud.password || '',
            role: ud.role as 'admin' | 'petugas',
            last_login: ud.last_login || null
          });
        });

        if (dbUsers.length > 0) {
          setUsersList(dbUsers);
        } else {
          // If Firestore is completely empty, initialize it with current local users
          const currentLocalUsers = JSON.parse(localStorage.getItem('guestbook_users') || 'null') || MOCK_USERS;
          for (const user of currentLocalUsers) {
            const userRef = doc(db, 'library_users', user.username.toLowerCase());
            await setDoc(userRef, {
              id: user.id,
              name: user.name,
              username: user.username,
              password: user.password || (user.role === 'admin' ? 'admin123' : 'petugas123'),
              role: user.role,
              last_login: user.last_login
            });
          }
        }
      } catch (err) {
        console.error('Unified Firebase sync error:', err);
      } finally {
        setIsLoadedFromFirebase(true);
      }
    }

    syncWithFirebase();
  }, []);

  // Handle addition of new visit from Kiosk
  const handleAddNewVisit = async (newVisit: Omit<Visitor, 'id' | 'visit_number' | 'created_at' | 'updated_at'>) => {
    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0].replace(/-/g, ''); // YYYYMMDD
    
    // Calculate sequential number for today
    const startOfToday = timestamp.split('T')[0];
    const todayVisits = visitors.filter(v => v.visit_date === startOfToday);
    const sequenceNum = String(todayVisits.length + 1).padStart(3, '0');
    
    const visitRecord: Visitor = {
      ...newVisit,
      id: `v-${Date.now()}`,
      visit_number: `V-${dateStr}-${sequenceNum}`,
      created_at: timestamp,
      updated_at: timestamp,
    };

    setVisitors(prev => [visitRecord, ...prev]);

    // Push to Firebase in background
    if (isFirebaseConnected && db) {
      try {
        const visitRef = doc(db, 'visitors', visitRecord.id);
        await setDoc(visitRef, visitRecord).catch((err) => {
          handleFirestoreError(err, OperationType.CREATE, `visitors/${visitRecord.id}`);
          throw err;
        });
      } catch (err) {
        console.error('Network error during Firebase push:', err);
      }
    }
  };

  // Sync edits or deletes from AdminView to Firebase
  const handleUpdateAndSyncVisitors = async (updatedList: Visitor[]) => {
    setVisitors(updatedList);

    if (isFirebaseConnected && db) {
      try {
        const updatedIds = new Set(updatedList.map(v => v.id));
        const deletedIds = visitors.filter(v => !updatedIds.has(v.id)).map(v => v.id);

        // Process deletes
        for (const deleteId of deletedIds) {
          const visitRef = doc(db, 'visitors', deleteId);
          await deleteDoc(visitRef).catch((err) => {
            handleFirestoreError(err, OperationType.DELETE, `visitors/${deleteId}`);
            throw err;
          });
        }

        // Process upserts for modified or newly added items
        const oldMap = new Map<string, Visitor>(visitors.map(v => [v.id, v]));
        for (const item of updatedList) {
          const oldItem = oldMap.get(item.id);
          if (!oldItem || oldItem.updated_at !== item.updated_at || JSON.stringify(oldItem) !== JSON.stringify(item)) {
            const visitRef = doc(db, 'visitors', item.id);
            await setDoc(visitRef, item).catch((err) => {
              handleFirestoreError(err, OperationType.WRITE, `visitors/${item.id}`);
              throw err;
            });
          }
        }
      } catch (err) {
        console.error('Failed to sync visitor updates to Firebase:', err);
      }
    }
  };


  // Fullscreen mode handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.warn(`Fullscreen activation failed: ${err.message}`);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col justify-between">
      
      {/* Top tiny toolbar for kiosk operators (Absolute positioned, unobtrusive, clean) */}
      <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full animate-pulse ${isFirebaseConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span className="font-medium text-slate-600 font-display">
            Sistem Buku Tamu Perpustakaan {isFirebaseConnected ? '(Cloud/Online)' : '(Internal/Lokal)'}
          </span>
          {isFirebaseConnected ? (
            <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-100 hidden sm:inline leading-none">
              Terkoneksi ke Firebase Cloud Firestore (database aktif)
            </span>
          ) : (
            <span className="text-[9px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded border border-amber-100 hidden sm:inline leading-none">
              Mode Offline (Local Storage aktif)
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* View mode toggle button */}
          <button
            onClick={() => setViewMode(viewMode === 'kiosk' ? 'admin' : 'kiosk')}
            className="text-[11px] font-bold text-slate-700 hover:text-indigo-700 font-display transition-colors py-0.5 px-2 rounded hover:bg-slate-200 cursor-pointer"
          >
            {viewMode === 'kiosk' ? '🖥️ Buka Portal Admin & Staff' : '🏠 Kembali ke Kiosk Tamu'}
          </button>

          {/* Fullscreen switch */}
          <button
            onClick={toggleFullscreen}
            className="text-slate-500 hover:text-slate-800 transition-colors p-0.5 rounded cursor-pointer"
            title={isFullscreen ? 'Keluar Fullscreen' : 'Mode Layar Penuh'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Primary Display Workspace */}
      <div className="flex-1 flex flex-col">
        {viewMode === 'kiosk' ? (
          <KioskView
            onNewVisit={handleAddNewVisit}
            settings={settings}
            onOpenAdmin={() => setViewMode('admin')}
            visitors={visitors}
          />
        ) : (
          <AdminView
            visitors={visitors}
            onUpdateVisitors={handleUpdateAndSyncVisitors}
            settings={settings}
            onUpdateSettings={setSettings}
            onCloseAdmin={() => setViewMode('kiosk')}
            usersList={usersList}
            onUpdateUsers={handleUpdateUsers}
          />
        )}
      </div>

      {/* Human, Humble, Professional Footer (Design Philosophy compliant, no telemetry status lines) */}
      <footer className="py-5 border-t border-slate-200 bg-white text-center text-xs text-slate-400 select-none">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 font-display font-medium">
            <BookOpen className="w-4 h-4 text-sky-600" />
            <span>Perpustakaan Kiosk Mandiri © 2026</span>
          </div>
          <p className="text-[11px]">
            Merujuk Standar Instrumen Akreditasi Perpustakaan Sekolah Terintegrasi.
          </p>
        </div>
      </footer>

    </div>
  );
}
