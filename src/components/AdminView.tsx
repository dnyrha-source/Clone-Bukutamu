import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
  Users, Building, Globe, GraduationCap, Calendar, BarChart2, MessageSquare,
  Search, Filter, Edit3, Trash2, Download, Printer, UserCheck, Shield,
  LogOut, Settings, RefreshCw, Eye, X, Plus, Info, Check, CheckSquare
} from 'lucide-react';
import { Visitor, User, SystemSettings } from '../types';
import { MOCK_USERS, VISIT_CATEGORIES, COUNTRIES } from '../data/mockData';
import { isFirebaseConnected, auth } from '../lib/firebase';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

interface AdminViewProps {
  visitors: Visitor[];
  onUpdateVisitors: (updated: Visitor[]) => void;
  settings: SystemSettings;
  onUpdateSettings: (updated: SystemSettings) => void;
  onCloseAdmin: () => void;
}

export default function AdminView({
  visitors,
  onUpdateVisitors,
  settings,
  onUpdateSettings,
  onCloseAdmin
}: AdminViewProps) {
  // Authentication & Session
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('guestbook_admin_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Tab State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'visitors' | 'reporting' | 'settings'>('dashboard');

  // Search & Filter state for Visitors list
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCountry, setFilterCountry] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Editing state
  const [editingVisitor, setEditingVisitor] = useState<Visitor | null>(null);
  const [viewingVisitor, setViewingVisitor] = useState<Visitor | null>(null);

  // Settings Configuration state
  const [ttsEnabled, setTtsEnabled] = useState(settings.tts_enabled);
  const [ttsVolume, setTtsVolume] = useState(settings.tts_volume);
  const [ttsRate, setTtsRate] = useState(settings.tts_rate);
  const [libName, setLibName] = useState(settings.library_name || '');
  const [libLogo, setLibLogo] = useState(settings.library_logo || '');
  const [librarianName, setLibrarianName] = useState(settings.head_librarian_name || '');
  const [librarianNip, setLibrarianNip] = useState(settings.head_librarian_nip || '');
  const [mottoId, setMottoId] = useState(settings.library_motto_id || '');
  const [mottoEn, setMottoEn] = useState(settings.library_motto_en || '');

  // Keep state synchronized with settings (e.g. after async load from Firebase)
  useEffect(() => {
    setTtsEnabled(settings.tts_enabled);
    setTtsVolume(settings.tts_volume);
    setTtsRate(settings.tts_rate);
    setLibName(settings.library_name || '');
    setLibLogo(settings.library_logo || '');
    setLibrarianName(settings.head_librarian_name || '');
    setLibrarianNip(settings.head_librarian_nip || '');
    setMottoId(settings.library_motto_id || '');
    setMottoEn(settings.library_motto_en || '');
  }, [settings]);

  // InsForge connection state
  const [insforgeUrlInput, setInsforgeUrlInput] = useState(() => 
    localStorage.getItem('insforge_project_url') || 'https://vvqw7yb5.ap-southeast.insforge.app/'
  );
  const [insforgeAnonKeyInput, setInsforgeAnonKeyInput] = useState(() => 
    localStorage.getItem('insforge_anon_key') || ''
  );

  // Custom User Management
  const [usersList, setUsersList] = useState<User[]>(() => {
    const saved = localStorage.getItem('guestbook_users');
    return saved ? JSON.parse(saved) : MOCK_USERS;
  });
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'petugas'>('petugas');

  // Edit mode user state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserUsername, setEditUserUsername] = useState('');
  const [editUserRole, setEditUserRole] = useState<'admin' | 'petugas'>('petugas');
  const [editUserPassword, setEditUserPassword] = useState('');

  // Delete modal/confirmation and custom alert state
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userAlertMessage, setUserAlertMessage] = useState<string | null>(null);

  // Reporting configuration
  const [reportType, setReportType] = useState<'harian' | 'bulanan' | 'tahunan' | 'banding' | 'akreditasi'>('akreditasi');
  const [reportDownloadSuccess, setReportDownloadSuccess] = useState(false);

  // 1. Authentication handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setLoginError('Username dan password wajib diisi');
      return;
    }

    // Try Cloud Login first if Firebase is configured
    if (isFirebaseConnected && auth) {
      try {
        const emailToAuth = username.includes('@') ? username.trim() : `${username.trim()}@labschooldb.com`;
        const userCredential = await signInWithEmailAndPassword(auth, emailToAuth, password.trim());
        const user = userCredential.user;

        if (user) {
          const loggedUser: User = {
            id: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'Admin Perpustakaan',
            username: user.email || 'admin',
            role: 'admin',
            last_login: new Date().toISOString()
          };
          setCurrentUser(loggedUser);
          localStorage.setItem('guestbook_admin_user', JSON.stringify(loggedUser));
          setLoginError('');
          return;
        }
      } catch (err: any) {
        console.warn('Firebase authentication failed, trying local fallback:', err);
        // If the user entered an email address explicitly, we show the actual cloud login error
        if (username.includes('@')) {
          setLoginError(`Gagal Masuk Firebase Cloud: ${(err as Error).message}`);
          return;
        }
      }
    }

    const found = usersList.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );

    if (found) {
      // Check user-defined custom password, default fallback is admin123 / petugas123
      const correctPassword = found.password || (found.role === 'admin' ? 'admin123' : 'petugas123');
      const isMatch = password === correctPassword;

      if (isMatch) {
        const loggedUser = {
          ...found,
          last_login: new Date().toISOString(),
        };
        setCurrentUser(loggedUser);
        localStorage.setItem('guestbook_admin_user', JSON.stringify(loggedUser));
        setLoginError('');
      } else {
        setLoginError('Password salah. Silakan coba lagi atau hubungi administrator.');
      }
    } else {
      setLoginError('Pengguna tidak ditemukan. Username default: admin / petugas');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('guestbook_admin_user');
  };

  const handleGoogleLogin = async () => {
    if (!isFirebaseConnected || !auth) return;
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      if (user) {
        // Keamanan Kuat: Hanya email supervisor/administrator terdaftar yang diizinkan masuk
        const adminEmail = 'dnyrha@gmail.com';
        if (user.email !== adminEmail) {
          await auth.signOut();
          setLoginError(`Akses Ditolak: Akun Google (${user.email}) tidak terdaftar sebagai Administrator sistem ini.`);
          return;
        }

        const loggedUser: User = {
          id: user.uid,
          name: user.displayName || 'Google User',
          username: user.email || 'google_user',
          role: 'admin',
          last_login: new Date().toISOString()
        };
        setCurrentUser(loggedUser);
        localStorage.setItem('guestbook_admin_user', JSON.stringify(loggedUser));
        setLoginError('');
      }
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setLoginError(`Gagal Google Sign-In: ${(err as Error).message}`);
    }
  };

  const handleQuickLogin = (role: 'admin' | 'petugas') => {
    const userObj = usersList.find((u) => u.role === role) || usersList[0];
    const loggedUser = {
      ...userObj,
      last_login: new Date().toISOString(),
    };
    setCurrentUser(loggedUser);
    localStorage.setItem('guestbook_admin_user', JSON.stringify(loggedUser));
  };


  // 2. Metrics Calculation (Based on PRD Section 10 KPI Cards)
  const metrics = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const thisMonthPrefix = now.toISOString().substring(0, 7); // YYYY-MM
    const thisYearPrefix = now.getFullYear().toString(); // YYYY

    let todayCount = 0;
    let monthCount = 0;
    let yearCount = 0;
    const uniqueInstitutions = new Set<string>();
    const uniqueCountries = new Set<string>();
    let internationalCount = 0;
    let studyExchangeCount = 0;

    visitors.forEach((v) => {
      // Date metrics
      const visitDate = v.visit_date || '';
      if (visitDate === todayStr) {
        todayCount += v.visitor_count;
      }
      if (visitDate.startsWith(thisMonthPrefix)) {
        monthCount += v.visitor_count;
      }
      if (visitDate.startsWith(thisYearPrefix)) {
        yearCount += v.visitor_count;
      }

      // Origin context
      if (v.institution) {
        uniqueInstitutions.add(v.institution.trim().toLowerCase());
      }
      if (v.country_name) {
        uniqueCountries.add(v.country_name.trim());
      }

      // International
      if (v.country_code && v.country_code !== 'ID') {
        internationalCount += v.visitor_count;
      }

      // Category filter for study banding
      if (v.visit_category === 'Studi Banding') {
        studyExchangeCount += v.visitor_count;
      }
    });

    return {
      today: todayCount,
      month: monthCount,
      year: yearCount,
      institutions: uniqueInstitutions.size,
      countries: uniqueCountries.size,
      international: internationalCount,
      studyExchange: studyExchangeCount,
    };
  }, [visitors]);


  // 3. Chart Data Generation (Based on PRD Section 10 Charts requirement)
  const chartData = useMemo(() => {
    // A. Daily (Kunjungan Harian)
    const dailyMap: Record<string, number> = {};
    // B. Monthly (Kunjungan Bulanan)
    const monthlyMap: Record<string, number> = {};
    // C. Yearly (Kunjungan Tahunan)
    const yearlyMap: Record<string, number> = {};
    // D. Category (Kategori Kunjungan)
    const categoryMap: Record<string, number> = {};
    // E. Countries (Negara Asal Pengunjung)
    const countryMap: Record<string, number> = {};
    // F. Top Institutions (Instansi Terbanyak)
    const institutionMap: Record<string, number> = {};

    visitors.forEach((v) => {
      const date = v.visit_date;
      const count = v.visitor_count;
      
      // Daily
      dailyMap[date] = (dailyMap[date] || 0) + count;

      // Monthly
      const monthLabel = date.substring(5, 7); // MM
      let monthNameStr = 'Lainnya';
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const monthIdx = parseInt(monthLabel) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        monthNameStr = months[monthIdx];
      }
      monthlyMap[monthNameStr] = (monthlyMap[monthNameStr] || 0) + count;

      // Yearly
      const year = date.substring(0, 4);
      yearlyMap[year] = (yearlyMap[year] || 0) + count;

      // Category
      const cat = v.visit_category || 'Lainnya';
      categoryMap[cat] = (categoryMap[cat] || 0) + count;

      // Countries
      const country = v.country_name || 'Indonesia';
      countryMap[country] = (countryMap[country] || 0) + count;

      // Institutions
      const inst = v.institution || 'Masyarakat Umum';
      institutionMap[inst] = (institutionMap[inst] || 0) + count;
    });

    // Formats
    const dailyData = Object.keys(dailyMap).sort().map(k => ({ date: k, Pengunjung: dailyMap[k] }));
    const monthlyData = Object.keys(monthlyMap).map(k => ({ month: k, Pengunjung: monthlyMap[k] }));
    const yearlyData = Object.keys(yearlyMap).sort().map(k => ({ year: k, Pengunjung: yearlyMap[k] }));
    const categoryData = Object.keys(categoryMap).map(k => ({ name: k, value: categoryMap[k] }));
    const countryData = Object.keys(countryMap).map(k => ({ name: k, count: countryMap[k] }));
    const institutionData = Object.keys(institutionMap)
      .map(k => ({ name: k, Kunjungan: institutionMap[k] }))
      .sort((a,b) => b.Kunjungan - a.Kunjungan)
      .slice(0, 5);

    return {
      daily: dailyData.length ? dailyData : [{ date: 'No Data', Pengunjung: 0 }],
      monthly: monthlyData.length ? monthlyData : [{ month: 'No Data', Pengunjung: 0 }],
      yearly: yearlyData.length ? yearlyData : [{ year: 'No Data', Pengunjung: 0 }],
      category: categoryData.length ? categoryData : [{ name: 'Empty', value: 0 }],
      country: countryData.length ? countryData : [{ name: 'Empty', count: 0 }],
      institution: institutionData.length ? institutionData : [{ name: 'Empty', Kunjungan: 0 }],
    };
  }, [visitors]);

  // Colors for charts
  const CHART_COLORS = ['#0284c7', '#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6', '#64748b'];


  // 4. Filters & Searches on Visitors State (Section 11)
  const filteredVisitors = useMemo(() => {
    return visitors.filter((v) => {
      // Text search
      const q = searchQuery.toLowerCase().trim();
      const matchText = !q ||
        v.name.toLowerCase().includes(q) ||
        v.institution.toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q) ||
        v.visit_purpose.toLowerCase().includes(q) ||
        v.visit_category.toLowerCase().includes(q);

      // Country filter
      const matchCountry = filterCountry === 'ALL' || v.country_code === filterCountry;

      // Category filter
      const matchCategory = filterCategory === 'ALL' || v.visit_category === filterCategory;

      // Date range filter
      let matchDate = true;
      if (filterStartDate) {
        matchDate = matchDate && (v.visit_date >= filterStartDate);
      }
      if (filterEndDate) {
        matchDate = matchDate && (v.visit_date <= filterEndDate);
      }

      return matchText && matchCountry && matchCategory && matchDate;
    });
  }, [visitors, searchQuery, filterCountry, filterCategory, filterStartDate, filterEndDate]);


  // 5. Visitor Record CRUD actions (Section 11 edit / delete)
  const handleUpdateVisitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVisitor) return;

    const newList = visitors.map((item) =>
      item.id === editingVisitor.id ? { ...editingVisitor, updated_at: new Date().toISOString() } : item
    );

    onUpdateVisitors(newList);
    setEditingVisitor(null);
  };

  const handleDeleteVisitor = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus data kunjungan ini dari sistem perpustakaan?')) {
      const newList = visitors.filter((item) => item.id !== id);
      onUpdateVisitors(newList);
    }
  };


  // 6. Settings Configuration Actions
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      tts_enabled: ttsEnabled,
      tts_volume: ttsVolume,
      tts_rate: ttsRate,
    });
    alert('Konfigurasi Text-to-Speech berhasil diperbarui!');
  };

  const handleSaveIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      library_name: libName,
      library_logo: libLogo,
      head_librarian_name: librarianName,
      head_librarian_nip: librarianNip,
      library_motto_id: mottoId,
      library_motto_en: mottoEn,
    });
    alert('Pengaturan identitas (Nama, Logo, Pimpinan & Motto) berhasil diperbarui!');
  };

  const handleSaveInsforgeConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('insforge_project_url', insforgeUrlInput.trim());
    localStorage.setItem('insforge_anon_key', insforgeAnonKeyInput.trim());
    alert('Koneksi database/auth InsForge berhasil diperbarui! Aplikasi akan memuat ulang untuk terhubung.');
    window.location.reload();
  };

  const handleAddNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserUsername.trim()) {
      alert('Nama dan Username wajib diisi');
      return;
    }

    const exists = usersList.some(u => u.username.toLowerCase() === newUserUsername.toLowerCase());
    if (exists) {
      alert('Username sudah terdaftar');
      return;
    }

    const defaultPass = newUserRole === 'admin' ? 'admin123' : 'petugas123';
    const passwordToSave = newUserPassword.trim() || defaultPass;

    const newUserObj: User = {
      id: `u-${Date.now()}`,
      name: newUserName,
      username: newUserUsername.toLowerCase().trim(),
      password: passwordToSave,
      role: newUserRole,
      last_login: null
    };

    const updated = [...usersList, newUserObj];
    setUsersList(updated);
    localStorage.setItem('guestbook_users', JSON.stringify(updated));

    setNewUserName('');
    setNewUserUsername('');
    setNewUserPassword('');
    alert(`Pengguna "${newUserName}" dengan hak akses ${newUserRole} dan password login "${passwordToSave}" berhasil terdaftar.`);
  };

  const requestDeleteUser = (user: User) => {
    if (usersList.length <= 1) {
      setUserAlertMessage('Minimal harus ada 1 pengguna di sistem untuk keamanan login.');
      return;
    }
    if (user.id === currentUser?.id) {
      setUserAlertMessage('Anda tidak bisa menghapus akun Anda sendiri yang sedang aktif.');
      return;
    }
    setUserToDelete(user);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      const updated = usersList.filter(u => u.id !== userToDelete.id);
      setUsersList(updated);
      localStorage.setItem('guestbook_users', JSON.stringify(updated));
      setUserToDelete(null);
    }
  };

  const handleStartEdit = (user: User) => {
    setEditingUserId(user.id);
    setEditUserName(user.name);
    setEditUserUsername(user.username);
    setEditUserRole(user.role);
    setEditUserPassword(user.password || (user.role === 'admin' ? 'admin123' : 'petugas123'));
  };

  const handleSaveEditUser = (id: string) => {
    if (!editUserName.trim() || !editUserUsername.trim()) {
      setUserAlertMessage('Nama Lengkap dan Username tidak boleh kosong!');
      return;
    }

    const exists = usersList.some(
      u => u.id !== id && u.username.toLowerCase() === editUserUsername.toLowerCase().trim()
    );
    if (exists) {
      setUserAlertMessage('Username sudah digunakan oleh pengguna lain!');
      return;
    }

    const updated = usersList.map(u => {
      if (u.id === id) {
        return {
          ...u,
          name: editUserName.trim(),
          username: editUserUsername.toLowerCase().trim(),
          role: editUserRole,
          password: editUserPassword.trim()
        };
      }
      return u;
    });

    setUsersList(updated);
    localStorage.setItem('guestbook_users', JSON.stringify(updated));
    setEditingUserId(null);

    // Sync active session if the edited user is the current active administrator
    if (currentUser && currentUser.id === id) {
      const updatedCurrentUser = {
        ...currentUser,
        name: editUserName.trim(),
        username: editUserUsername.toLowerCase().trim(),
        role: editUserRole,
        password: editUserPassword.trim()
      };
      setCurrentUser(updatedCurrentUser);
      localStorage.setItem('guestbook_admin_user', JSON.stringify(updatedCurrentUser));
    }
  };


  // 7. Report Center (CSV Excel Export & Direct Print)
  const triggerExportCSV = () => {
    // Generate simple compliant CSV matching visitor fields
    let headers = 'ID,Visit Number,Date,Name,Institution,Position,Phone,Email,Country,City,Visitor Count,Category,Purpose,Created At\n';
    
    let rows = filteredVisitors.map((v) => {
      const escape = (text: string) => `"${text.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      return [
        v.id,
        v.visit_number,
        v.visit_date,
        escape(v.name),
        escape(v.institution),
        escape(v.position || ''),
        `'${v.phone}`, // force string in excel
        v.email ? escape(v.email) : '',
        v.country_name,
        escape(v.city),
        v.visitor_count,
        v.visit_category,
        escape(v.visit_purpose),
        v.created_at,
      ].join(',');
    }).join('\n');

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(headers + rows);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `Laporan_Buku_Tamu_${reportType.toUpperCase()}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setReportDownloadSuccess(true);
    setTimeout(() => setReportDownloadSuccess(false), 3000);
  };

  const printReport = () => {
    window.print();
  };

  // Pre-calculated counts for Reporting Summary View
  const reportSummary = useMemo(() => {
    const totalVisitsCount = filteredVisitors.reduce((acc, current) => acc + current.visitor_count, 0);
    return {
      totalRecords: filteredVisitors.length,
      totalPeople: totalVisitsCount,
    };
  }, [filteredVisitors]);


  // If NOT Logged in: Render Login Form
  if (!currentUser) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 select-none bg-slate-50">
        <div className="w-full max-w-md bg-white border border-slate-200 shadow-xl rounded-3xl overflow-hidden">
          <div className="bg-slate-900 text-white p-6 text-center">
            <h1 className="text-xl font-display font-extrabold tracking-tight">
              Aplikasi Buku Tamu Digital
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Masuk ke Console Petugas & Administrator Perpustakaan
            </p>
          </div>

          <form onSubmit={handleLogin} className="p-6 space-y-4">
            {loginError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-medium">
                {loginError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="cth: admin / petugas"
                className="w-full px-4 py-2 text-sm border border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Isi password (cth: admin123)"
                className="w-full px-4 py-2 text-sm border border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 font-semibold rounded-xl text-xs cursor-pointer transition-all shadow"
            >
              Sign In
            </button>

            {isFirebaseConnected && (
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full py-2.5 bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 font-semibold rounded-xl text-xs cursor-pointer transition-all shadow flex items-center justify-center gap-2 mt-2 font-sans"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Masuk dengan Google (Akun Cloud)
              </button>
            )}

            <div className="text-center pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onCloseAdmin}
                className="text-xs text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer"
              >
                Kembali ke Halaman Registrasi Kiosk
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Active Admin View layout
  return (
    <div className="w-full min-h-screen bg-slate-50">
      {/* Top navbar */}
      <header className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <Building className="w-5 h-5 text-sky-400" />
            <div>
              <h1 className="text-base font-display font-bold leading-tight">
                Dashboard Buku Tamu Perpustakaan
              </h1>
              <p className="text-[10px] text-slate-400 font-mono">
                Log Masuk: <span className="text-sky-300 font-bold uppercase">{currentUser.name} ({currentUser.role})</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onCloseAdmin}
              className="bg-sky-650 hover:bg-sky-500 hover:bg-opacity-80 text-white border border-sky-450 hover:border-sky-500 font-medium py-1.5 px-3.5 rounded-full text-xs shadow-sm transition-all cursor-pointer"
            >
              🖥️ Mode Kiosk (Registrasi Tamu)
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
              title="Keluar / Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Side Tabs navigation bar */}
          <aside className="w-full lg:w-56 shrink-0 flex flex-col gap-1.5">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl text-left cursor-pointer transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              Statistik & Dashboard
            </button>

            <button
              onClick={() => setActiveTab('visitors')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl text-left cursor-pointer transition-all ${
                activeTab === 'visitors'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              Kelola Pengunjung ({visitors.length})
            </button>

            <button
              onClick={() => setActiveTab('reporting')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl text-left cursor-pointer transition-all ${
                activeTab === 'reporting'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Printer className="w-4 h-4" />
              Pusat Pelaporan (PDF/Excel)
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl text-left cursor-pointer transition-all ${
                activeTab === 'settings'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Settings className="w-4 h-4" />
              Sistem Config & User
            </button>
          </aside>


          {/* TAB 1: DASHBOARD ANALYTICS PANEL */}
          {activeTab === 'dashboard' && (
            <main className="flex-1 space-y-6">
              
              {/* KPIs (Section 10 KPI Cards) */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Hari ini */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">Tamu Hari Ini</span>
                    <strong className="text-xl font-display font-bold text-slate-900">{metrics.today} orang</strong>
                  </div>
                </div>

                {/* Bulan ini */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">Bulan Ini (Juni)</span>
                    <strong className="text-xl font-display font-bold text-slate-900">{metrics.month} orang</strong>
                  </div>
                </div>

                {/* Tahun ini */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">Kunjungan Tahun Ini</span>
                    <strong className="text-xl font-display font-bold text-slate-900">{metrics.year} orang</strong>
                  </div>
                </div>

                {/* Total Instansi */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">Total Instansi Unik</span>
                    <strong className="text-xl font-display font-bold text-slate-900">{metrics.institutions} instansi</strong>
                  </div>
                </div>

                {/* Total Negara */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">Asal Negara Terdaftar</span>
                    <strong className="text-xl font-display font-bold text-slate-900">{metrics.countries} negara</strong>
                  </div>
                </div>

                {/* Internasional */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">Tamu Internasional</span>
                    <strong className="text-xl font-display font-bold text-slate-900">{metrics.international} orang</strong>
                  </div>
                </div>

                {/* Studi Banding */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3 col-span-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">Registrasi Studi Banding</span>
                    <strong className="text-xl font-display font-bold text-slate-900">{metrics.studyExchange} orang</strong>
                  </div>
                </div>
              </div>


              {/* CHARTS GRID (Section 10 Charts) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* A. Daily Visits */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col h-72">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Kunjungan Harian</h3>
                  <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData.daily}>
                        <defs>
                          <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0284c7" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                        <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                        <Area type="monotone" dataKey="Pengunjung" stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#colorDaily)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* B. Monthly Visits */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col h-72">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Kunjungan Bulanan (Rekap)</h3>
                  <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.monthly}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                        <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                        <Bar dataKey="Pengunjung" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* C. Kategori Kunjungan */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col h-72">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Kategori Kunjungan</h3>
                  <div className="flex-1 w-full min-h-0 md:flex sm:items-center">
                    <div className="w-full h-full md:w-1/2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData.category}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {chartData.category.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Compact Custom Legend */}
                    <div className="hidden md:block w-1/2 overflow-y-auto max-h-52 text-[10px] space-y-1 pl-4">
                      {chartData.category.map((entry, index) => (
                        <div key={entry.name} className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                          <span className="font-medium text-slate-800 truncate">{entry.name}:</span>
                          <span className="text-slate-500 font-bold ml-auto">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* D. Negara Asal Pengunjung */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col h-72">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Negara Asal Pengunjung</h3>
                  <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.country} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} stroke="#94a3b8" width={80} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* E. Top Institutions */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:col-span-2 h-72">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Instansi Terbanyak Muncul</h3>
                  <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.institution}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                        <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8"/>
                        <Tooltip />
                        <Bar dataKey="Kunjungan" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>


              {/* TESTIMONIAL WALL (Section 10 Testimonial Wall) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-display font-bold text-slate-900">
                    Dinding Kesan & Saran (Testimonial Wall)
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visitors.filter(v => v.impression || v.suggestion).slice(0, 6).map((item) => (
                    <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div>
                        {item.impression && (
                          <p className="text-xs text-slate-700 italic font-medium mb-3 relative pl-4">
                            <span className="absolute left-0 top-0 text-indigo-400 font-serif text-xl leading-none">“</span>
                            {item.impression}
                          </p>
                        )}
                        {item.suggestion && (
                          <div className="mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] text-slate-600">
                            <strong>Saran:</strong> {item.suggestion}
                          </div>
                        )}
                      </div>
                      <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between text-[10px] text-slate-400">
                        <div>
                          <strong className="text-slate-700 font-semibold block">{item.name}</strong>
                          <span className="text-indigo-600">{item.institution}</span>
                        </div>
                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded shrink-0">{item.visit_date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </main>
          )}


          {/* TAB 2: VISITORS DATA DIRECT MANAGEMENT (Section 11) */}
          {activeTab === 'visitors' && (
            <main className="flex-1 space-y-4">
              
              {/* Filter Tools */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex flex-col md:flex-row gap-3">
                  
                  {/* Search text input */}
                  <div className="flex-1 relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari nama, instansi, kota, atau tujuan..."
                      className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-100 focus:outline-none"
                    />
                  </div>

                  {/* Country Filter */}
                  <div className="w-full md:w-44">
                    <select
                      value={filterCountry}
                      onChange={(e) => setFilterCountry(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-100 focus:outline-none bg-white cursor-pointer"
                    >
                      <option value="ALL">Semua Negara</option>
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Category Filter */}
                  <div className="w-full md:w-44">
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-100 focus:outline-none bg-white cursor-pointer"
                    >
                      <option value="ALL">Semua Kategori</option>
                      {VISIT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Advanced Date range selection */}
                <div className="flex flex-wrap items-center gap-3 pt-2.5 border-t border-slate-100 text-xs text-slate-600">
                  <span className="font-medium flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" /> Rentang Tanggal:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="px-2.5 py-1 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-650"
                    />
                    <span>s/d</span>
                    <input
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="px-2.5 py-1 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-650"
                    />
                  </div>

                  {/* Reset Filters shortcut */}
                  {(searchQuery || filterCountry !== 'ALL' || filterCategory !== 'ALL' || filterStartDate || filterEndDate) && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setFilterCountry('ALL');
                        setFilterCategory('ALL');
                        setFilterStartDate('');
                        setFilterEndDate('');
                      }}
                      className="bg-slate-100 py-1 px-2.5 rounded-lg text-[11px] text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer ml-auto"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
              </div>


              {/* Visitor Table List */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-150">
                      <tr>
                        <th className="px-4 py-3">No. Urut & Tanggal</th>
                        <th className="px-4 py-3">Nama Lengkap</th>
                        <th className="px-4 py-3">Instansi & Jabatan</th>
                        <th className="px-4 py-3 text-center">Jumlah Tamu</th>
                        <th className="px-4 py-3">Kategori</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {filteredVisitors.map((v, idx) => (
                        <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 font-mono">
                            <span className="font-semibold text-slate-800 block">{v.visit_number}</span>
                            <span className="text-[10px] text-slate-400">{v.visit_date}</span>
                          </td>
                          <td className="px-4 py-3">
                            <strong className="text-slate-900 block font-semibold">{v.name}</strong>
                            <span className="text-[11px] text-slate-400 font-mono block">{v.phone}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-slate-800 block font-medium">{v.institution}</span>
                            <span className="text-[11px] text-slate-500 italic block">{v.position || '-'}</span>
                          </td>
                          <td className="px-4 py-3 text-center font-bold font-mono text-slate-900">
                            {v.visitor_count}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-100 inline-block">
                              {v.visit_category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                            <button
                              onClick={() => setViewingVisitor(v)}
                              className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-all inline-flex items-center gap-1 cursor-pointer font-medium"
                              title="Lihat Detail Foto & Tanda Tangan"
                            >
                              <Eye className="w-3.5 h-3.5" /> Detail
                            </button>
                            <button
                              onClick={() => setEditingVisitor(v)}
                              className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all inline-block cursor-pointer"
                              title="Sunting Data"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {/* Deleting access is reserved for admins in typical systems, we handle gracefully */}
                            <button
                              onClick={() => handleDeleteVisitor(v.id)}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-all inline-block cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {filteredVisitors.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">
                            Tidak ada data tamu yang cocok dengan pencarian / penyaringan saat ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </main>
          )}


          {/* TAB 3: REPORTING & ACCREDITATION COMPLIENCE (Section 12) */}
          {activeTab === 'reporting' && (
            <main className="flex-1 space-y-6">
              
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-display font-bold text-slate-800">
                      Sistem Pelaporan Otomatis Perpustakaan
                    </h3>
                    <p className="text-xs text-slate-500">
                      Ekspor data buku tamu secara real-time untuk akreditasi sekolah berstandar nasional.
                    </p>
                  </div>
                  <button
                    onClick={printReport}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4" /> Cetak (PDF)
                  </button>
                </div>

                {/* Formats Selection (Based on PRD Section 12) */}
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl">
                  <span className="text-xs font-bold text-slate-500 uppercase block mb-2">PILIH FORMAT & JENIS REKAP LAPORAN:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <button
                      onClick={() => setReportType('akreditasi')}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        reportType === 'akreditasi'
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-900 ring-4 ring-indigo-50'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <strong className="text-xs block">📕 Laporan Akreditasi</strong>
                      <span className="text-[10px] text-slate-500 block">Statistik kunjungan, rekap instansi, negara, testimoni, dokumentasi</span>
                    </button>

                    <button
                      onClick={() => setReportType('harian')}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        reportType === 'harian'
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-900 ring-4 ring-indigo-50'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <strong className="text-xs block">📅 Lap. Kunjungan Harian</strong>
                      <span className="text-[10px] text-slate-500 block">Daftar lengkap tamu yang hadir hari ini</span>
                    </button>

                    <button
                      onClick={() => setReportType('bulanan')}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        reportType === 'bulanan'
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-900 ring-4 ring-indigo-50'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <strong className="text-xs block">📊 Lap. Bulanan (Rekap)</strong>
                      <span className="text-[10px] text-slate-500 block">Jumlah kumulatif bulanan & statistik instansi</span>
                    </button>

                    <button
                      onClick={() => setReportType('tahunan')}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        reportType === 'tahunan'
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-900 ring-4 ring-indigo-50'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <strong className="text-xs block">🏛️ Lap. Rekap Tahunan</strong>
                      <span className="text-[10px] text-slate-500 block">Statistik tahunan perpustakaan sekolah</span>
                    </button>

                    <button
                      onClick={() => setReportType('banding')}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        reportType === 'banding'
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-900 ring-4 ring-indigo-50'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <strong className="text-xs block">🎓 Rekap Studi Banding</strong>
                      <span className="text-[10px] text-slate-500 block">Daftar tamu berniat studi banding, benchmarking & observasi</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={triggerExportCSV}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" /> Unduh Laporan format Excel / CSV
                  </button>

                  {reportDownloadSuccess && (
                    <span className="text-xs font-semibold text-emerald-600 animate-pulse">
                      ✓ File CSV Excel terunduh sukses!
                    </span>
                  )}
                </div>
              </div>


              {/* THE REPORT LIVE PREVIEW PANEL (Printable styled element) */}
              <div id="printable-report-section" className="bg-white p-8 rounded-2xl border border-slate-200 shadow-md space-y-6 printable-area">
                {/* School Letterhead Simulation */}
                <div className="flex items-center justify-center gap-6 border-b-4 border-double border-slate-800 pb-4">
                  {settings.library_logo && (
                    <img
                      src={settings.library_logo}
                      alt="Logo KOP"
                      className="w-16 h-16 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="text-center space-y-1">
                    <h2 className="text-[10px] font-mono font-black tracking-widest text-slate-500 uppercase">
                      PEMERINTAH KOTA ADMINISTRASI PERPUSTAKAAN
                    </h2>
                    <h1 className="text-xl font-display font-black text-slate-900 tracking-tight uppercase">
                      {settings.library_name || "DINAS PENDIDIKAN PERPUSTAKAAN SEKOLAH MENENGAH"}
                    </h1>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Sistem Dokumentasi Tamu Eksternal Digital - Versi 1.0 Terakreditasi Nasional
                    </p>
                  </div>
                </div>

                {/* Report specifics */}
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">
                  <div>
                    <span className="text-slate-500 block">JENIS DOKUMEN:</span>
                    <strong className="text-indigo-800 font-bold uppercase text-sm">
                      Laporan Kunjungan Eksternal ({reportType})
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block">TANGGAL CETAK:</span>
                    <strong className="font-mono">{new Date().toISOString().substring(0, 10)}</strong>
                  </div>
                </div>

                {/* Report stats summary cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 text-center">
                    <span className="text-[10px] text-slate-500 uppercase block">Total Baris Registrasi</span>
                    <strong className="text-lg font-mono font-bold text-slate-800">{reportSummary.totalRecords}</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 text-center">
                    <span className="text-[10px] text-slate-500 uppercase block">Akumulasi Jumlah Tamu</span>
                    <strong className="text-lg font-mono font-bold text-slate-800">{reportSummary.totalPeople} orang</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 text-center">
                    <span className="text-[10px] text-slate-500 uppercase block">Sertifikasi Legalitas</span>
                    <strong className="text-xs block text-emerald-700 font-bold">100% TERVERIFIKASI</strong>
                  </div>
                </div>

                {/* Visitor Lists customized based on report type */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    REKAP DATA TAMU EKSTERNAL (YANG DISARING)
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-[11px] text-slate-700">
                      <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-150">
                        <tr>
                          <th className="p-2">Kode Buku</th>
                          <th className="p-2">Nama Pengunjung</th>
                          <th className="p-2">Instansi & Asal Kota</th>
                          <th className="p-2">Tujuan Kunjungan Utama</th>
                          <th className="p-2 text-center">Tamu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {filteredVisitors.map((v) => (
                          <tr key={v.id}>
                            <td className="p-2 font-mono font-bold text-slate-900">{v.visit_number}</td>
                            <td className="p-2 font-semibold">{v.name}</td>
                            <td className="p-2">
                              {v.institution} ({v.city})
                            </td>
                            <td className="p-2 max-w-sm font-sans line-clamp-2 md:line-clamp-none text-slate-500">
                              {v.visit_purpose}
                            </td>
                            <td className="p-2 text-center font-bold text-slate-900 font-mono">
                              {v.visitor_count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sign-off signatures simulator for professional accrediations */}
                <div className="pt-12 flex justify-between text-xs">
                  <div className="text-center w-48">
                    <span className="block mb-12 text-slate-500">Petugas Sirkulasi,</span>
                    <strong className="border-b border-slate-800 pb-0.5 block">{currentUser.name}</strong>
                    <span className="text-[10px] text-slate-400">NIP. MOCK-PERPUS-STAFF</span>
                  </div>
                  <div className="text-center w-48">
                    <span className="block mb-12 text-slate-500">Kepala Perpustakaan Sekolah,</span>
                    <strong className="border-b border-slate-800 pb-0.5 block">{settings.head_librarian_name || "Dra. Hj. Suparni, M.Psi"}</strong>
                    <span className="text-[10px] text-slate-400">NIP. {settings.head_librarian_nip || "197412232001122003"}</span>
                  </div>
                </div>

                <p className="text-[9px] text-slate-400 italic text-center pt-8">
                  Dokumen ini sah dicetak dan digenerasikan secara otonom oleh Aplikasi Buku Tamu Digital Perpustakaan Sekolah 2026.
                </p>
              </div>

            </main>
          )}


          {/* TAB 4: SYSTEM CONFIGURATION & SETTINGS */}
          {activeTab === 'settings' && (
            <main className="flex-1 space-y-6">

              {/* Firebase Cloud Connection Status & Setup */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-indigo-600 animate-pulse" />
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-display">
                      Integrasi Cloud Database (Firebase Firestore)
                    </h3>
                  </div>
                  {isFirebaseConnected ? (
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 leading-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Aktif & Terlindungi
                    </span>
                  ) : (
                    <span className="bg-amber-50 text-amber-700 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border border-amber-200 leading-none">
                      Mode Lokal (Offline)
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Aplikasi Buku Tamu Digital ini terhubung secara aman dan real-time ke penyimpanan nirkabel cloud berbasis **Google Firebase Firestore & Authentication**. 
                    Setiap registrasi kunjungan baru di Kiosk, perubahan data, audit, serta modifikasi teks salam tts akan tersinkronisasi otomatis tanpa batas limitasi atau kendala waktu loading.
                  </p>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 font-display flex items-center gap-1.5">
                      <span>🔒</span> Status Kredensial Firebase Cloud
                    </h4>
                    <div className="text-xs space-y-2 font-display text-slate-600">
                      <div>
                        <span className="font-semibold block">Project ID Cloud Run / Firebase:</span>
                        <code className="text-[10px] font-mono bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded">phonic-drake-t4wsx</code>
                      </div>
                      <div>
                        <span className="font-semibold block">Keamanan & Peraturan:</span>
                        <span className="text-[11px] text-emerald-700 font-medium">Aktif dengan Atribut Aturan Berbasis Peran (ABAC)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Identity & Header Settings Form */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Building className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-display">
                    Pengaturan Identitas Header Kiosk (Nama & Logo)
                  </h3>
                </div>

                <form onSubmit={handleSaveIdentity} className="space-y-4">
                  {/* Nama Perpustakaan */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Nama Perpustakaan</label>
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-100 focus:outline-none"
                      value={libName}
                      onChange={(e) => setLibName(e.target.value)}
                      placeholder="Contoh: Perpustakaan SMA Negeri 1 Mandiri"
                    />
                  </div>

                  {/* Kepala Perpustakaan & NIP */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 block">Nama Kepala Perpustakaan</label>
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-100 focus:outline-none"
                        value={librarianName}
                        onChange={(e) => setLibrarianName(e.target.value)}
                        placeholder="Contoh: Dra. Hj. Suparni, M.Psi"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 block">NIP Kepala Perpustakaan</label>
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-100 focus:outline-none"
                        value={librarianNip}
                        onChange={(e) => setLibrarianNip(e.target.value)}
                        placeholder="Contoh: 197412232001122003"
                      />
                    </div>
                  </div>

                  {/* Upload Logo */}
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-slate-700 block">Logo Perpustakaan (Upload logo berkas)</label>
                    <div className="flex items-center gap-4">
                      {libLogo ? (
                        <div className="relative w-16 h-16 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center p-1.5 select-none shrink-0 group">
                          <img
                            src={libLogo}
                            alt="Preview Logo"
                            className="max-w-full max-h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => setLibLogo('')}
                            className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white p-0.5 rounded-full shadow cursor-pointer transition-all"
                            title="Hapus Logo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-300 shrink-0 select-none">
                          <Building className="w-6 h-6" />
                        </div>
                      )}
                      
                      <div className="flex-1 space-y-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 2 * 1024 * 1024) {
                                alert('Ukuran foto logo melebihi 2MB!');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                if (typeof reader.result === 'string') {
                                  setLibLogo(reader.result);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                        />
                        <p className="text-[10px] text-slate-400">
                          Format yang didukung: PNG, JPG, WEBP, SVG. Maksimal 2MB.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Motto Perpustakaan (Indonesia & Inggris) */}
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Motto Perpustakaan
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600 block">Motto (Bahasa Indonesia)</label>
                        <textarea
                          rows={2}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-100 focus:outline-none"
                          value={mottoId}
                          onChange={(e) => setMottoId(e.target.value)}
                          placeholder='Contoh: "Jendela dunia terbuka lebar..."'
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600 block">Motto (English)</label>
                        <textarea
                          rows={2}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-100 focus:outline-none"
                          value={mottoEn}
                          onChange={(e) => setMottoEn(e.target.value)}
                          placeholder='Contoh: "The window of the world..."'
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer shadow transition-all"
                  >
                    Simpan Identitas & Motto Kiosk
                  </button>
                </form>
              </div>
              
              {/* Voice TTS Settings form */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Settings className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-display">
                    Pengaturan Audio Buku Tamu (Text-to-Speech)
                  </h3>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-4">
                  {/* Enable Switch */}
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="text-xs text-slate-800 block">Sistem Pembaca Terima Kasih Otomatis (TTS)</strong>
                      <span className="text-[11px] text-slate-500 block">
                        Ucapkan ucapan terima kasih bilingual secara lisan kepada pengunjung setelah submit.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ttsEnabled}
                        onChange={(e) => setTtsEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:width-5 after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
                    </label>
                  </div>

                  {/* Volume Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700">Volume Suara</span>
                      <span className="font-mono">{Math.round(ttsVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      disabled={!ttsEnabled}
                      value={ttsVolume}
                      onChange={(e) => setTtsVolume(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Rate / Speed Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700">Kecepatan Bicara (Speech Rate)</span>
                      <span className="font-mono">{ttsRate}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      disabled={!ttsEnabled}
                      value={ttsRate}
                      onChange={(e) => setTtsRate(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer shadow"
                  >
                    Simpan Konfigurasi Audio
                  </button>
                </form>
              </div>


              {/* User management system (Admins vs Staff) (Section 13) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <UserCheck className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-display">
                    Manajemen Pengguna & Peran Akses Pustaka
                  </h3>
                </div>

                {/* Users List Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <div className="hidden sm:grid grid-cols-5 bg-slate-50 font-bold p-2.5 border-b border-slate-200 text-slate-600 text-[10px] uppercase gap-2">
                    <span>Nama Pengguna</span>
                    <span>Username</span>
                    <span>Hak Akses / Peran</span>
                    <span>Password Login</span>
                    <span className="text-right">Aksi</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {usersList.map((user) => {
                      const isEditing = editingUserId === user.id;
                      return (
                        <div key={user.id} className="grid grid-cols-1 sm:grid-cols-5 p-3 sm:p-2.5 items-center gap-2">
                          {isEditing ? (
                            <>
                              {/* Edit: Full Name */}
                              <div className="flex justify-between items-center sm:block">
                                <span className="font-bold sm:hidden text-slate-500 text-[10px] uppercase">Nama</span>
                                <input
                                  type="text"
                                  value={editUserName}
                                  onChange={(e) => setEditUserName(e.target.value)}
                                  className="bg-white border border-indigo-200 rounded px-2.5 py-1 text-xs w-full focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 focus:outline-none font-semibold text-slate-800"
                                  placeholder="Nama Lengkap"
                                />
                              </div>

                              {/* Edit: Username */}
                              <div className="flex justify-between items-center sm:block">
                                <span className="font-bold sm:hidden text-slate-500 text-[10px] uppercase">Username</span>
                                <input
                                  type="text"
                                  value={editUserUsername}
                                  onChange={(e) => setEditUserUsername(e.target.value)}
                                  className="bg-white border border-indigo-200 rounded px-2.5 py-1 text-xs font-mono w-full focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 focus:outline-none"
                                  placeholder="Username"
                                />
                              </div>

                              {/* Edit: Role */}
                              <div className="flex justify-between items-center sm:block">
                                <span className="font-bold sm:hidden text-slate-500 text-[10px] uppercase">Akses</span>
                                <select
                                  value={editUserRole}
                                  onChange={(e) => setEditUserRole(e.target.value as 'admin' | 'petugas')}
                                  className="bg-white border border-indigo-200 rounded px-2.5 py-1 text-xs w-full focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 focus:outline-none cursor-pointer"
                                >
                                  <option value="petugas">Petugas</option>
                                  <option value="admin">Admin</option>
                                </select>
                              </div>

                              {/* Edit: Password */}
                              <div className="flex justify-between items-center sm:block">
                                <span className="font-bold sm:hidden text-slate-500 text-[10px] uppercase">Password</span>
                                <input
                                  type="text"
                                  value={editUserPassword}
                                  onChange={(e) => setEditUserPassword(e.target.value)}
                                  className="bg-white border border-indigo-200 rounded px-2.5 py-1 text-xs font-mono font-bold text-indigo-700 w-full focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 focus:outline-none"
                                  placeholder="Password"
                                />
                              </div>

                              {/* Edit: Action Buttons */}
                              <div className="flex justify-between items-center sm:justify-end sm:block text-right">
                                <span className="font-bold sm:hidden text-slate-500 text-[10px] uppercase">Aksi</span>
                                <div className="flex items-center gap-2 sm:justify-end">
                                  <button
                                    onClick={() => handleSaveEditUser(user.id)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] shadow-xs cursor-pointer"
                                  >
                                    Simpan
                                  </button>
                                  <button
                                    onClick={() => setEditingUserId(null)}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-semibold text-[10px] cursor-pointer"
                                  >
                                    Batal
                                  </button>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              {/* Read Only: name */}
                              <div className="flex justify-between items-center sm:block">
                                <span className="font-bold sm:hidden text-slate-500 text-[10px] uppercase">Nama</span>
                                <span className="font-semibold text-slate-850">{user.name}</span>
                              </div>

                              {/* Read Only: username */}
                              <div className="flex justify-between items-center sm:block">
                                <span className="font-bold sm:hidden text-slate-500 text-[10px] uppercase">Username</span>
                                <span className="font-mono text-slate-400">{user.username}</span>
                              </div>

                              {/* Read Only: role */}
                              <div className="flex justify-between items-center sm:block">
                                <span className="font-bold sm:hidden text-slate-500 text-[10px] uppercase">Akses</span>
                                <span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    user.role === 'admin' ? 'bg-indigo-50 text-indigo-700' : 'bg-sky-50 text-sky-700'
                                  }`}>
                                    {user.role === 'admin' ? 'Administrator' : 'Petugas Selesai'}
                                  </span>
                                </span>
                              </div>

                              {/* Read Only: password */}
                              <div className="flex justify-between items-center sm:block">
                                <span className="font-bold sm:hidden text-slate-500 text-[10px] uppercase">Password</span>
                                <span className="font-mono text-slate-500 select-all bg-slate-50 px-2 py-0.5 rounded border border-slate-100 font-medium">
                                  {user.password || (user.role === 'admin' ? 'admin123' : 'petugas123')}
                                </span>
                              </div>

                              {/* Read Only: Action Buttons */}
                              <div className="flex justify-between items-center sm:justify-end sm:block text-right">
                                <span className="font-bold sm:hidden text-slate-500 text-[10px] uppercase">Aksi</span>
                                <div className="flex items-center gap-2 sm:justify-end">
                                  <button
                                    onClick={() => handleStartEdit(user)}
                                    className="text-[10px] text-indigo-600 hover:text-indigo-850 hover:underline font-semibold cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <span className="text-slate-300">|</span>
                                  <button
                                    onClick={() => requestDeleteUser(user)}
                                    className="text-[10px] text-rose-500 hover:text-rose-700 hover:underline font-semibold cursor-pointer"
                                  >
                                    Hapus
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Add new user form (Section 13) */}
                <form onSubmit={handleAddNewUser} className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-3">
                  <span className="text-xs font-bold text-slate-700 block">Tambah Pengguna Baru</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 block">Nama Lengkap</label>
                      <input
                        type="text"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="Contoh: Hermawan Wijaya"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 block">Username Login</label>
                      <input
                        type="text"
                        value={newUserUsername}
                        onChange={(e) => setNewUserUsername(e.target.value)}
                        placeholder="Contoh: hermawan"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 block">Password Login</label>
                      <input
                        type="text"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="Default: petugas123 / admin123"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 block">Peran Hak Akses</label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'petugas')}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none cursor-pointer"
                      >
                        <option value="petugas">Petugas Perpustakaan</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-650 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs shadow transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Registrasikan Pengguna
                  </button>
                </form>
              </div>

            </main>
          )}

        </div>
      </div>


      {/* VIEW DETAILS VISITOR ABSOLUT SCREEN DIALOG (Section 11 View) */}
      {viewingVisitor && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden border border-slate-200 shadow-2xl flex flex-col">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs text-sky-400 block tracking-widest uppercase">
                  DOKUMENTASI DIGITAL TAMU EKSTERNAL
                </span>
                <strong className="text-base font-display font-bold">
                  {viewingVisitor.visit_number} - {viewingVisitor.name}
                </strong>
              </div>
              <button
                onClick={() => setViewingVisitor(null)}
                className="p-1 px-2.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 md:p-8 space-y-6 overflow-y-auto max-h-[75vh]">
              
              {/* Personal Details */}
              <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                <div>
                  <span className="text-slate-400 block mb-0.5">Asal Instansi</span>
                  <strong className="text-slate-800 text-sm block font-bold">{viewingVisitor.institution}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Jabatan</span>
                  <strong className="text-slate-800 font-medium block">{viewingVisitor.position || '-'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Nomor Telepon</span>
                  <strong className="text-slate-800 font-mono block">{viewingVisitor.phone}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Alamat Email</span>
                  <strong className="text-slate-800 block truncate">{viewingVisitor.email || '-'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Negara & Kota</span>
                  <strong className="text-slate-800 block font-semibold">
                    {viewingVisitor.country_name} - {viewingVisitor.city}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Provinsi</span>
                  <strong className="text-slate-800 block">{viewingVisitor.province || '-'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Kategori</span>
                  <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-800 text-[10px] font-bold rounded-full">
                    {viewingVisitor.visit_category}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Jumlah Orang</span>
                  <strong className="text-slate-850 font-bold">{viewingVisitor.visitor_count} orang</strong>
                </div>
              </div>

              {/* Visit Purpose */}
              <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl text-xs space-y-1">
                <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px]">Tujuan Kunjungan</span>
                <p className="text-slate-800 leading-relaxed font-sans">{viewingVisitor.visit_purpose}</p>
              </div>

              {/* Impressions and feedback */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                {viewingVisitor.impression && (
                  <div className="border border-slate-200 p-3 rounded-2xl bg-indigo-50/20">
                    <span className="text-slate-400 block mb-1">Kesan</span>
                    <p className="text-slate-700 italic">“{viewingVisitor.impression}”</p>
                  </div>
                )}
                {viewingVisitor.suggestion && (
                  <div className="border border-slate-200 p-3 rounded-2xl bg-slate-50">
                    <span className="text-slate-400 block mb-1">Saran / Masukan</span>
                    <p className="text-slate-700">{viewingVisitor.suggestion}</p>
                  </div>
                )}
              </div>

              {/* Visual Media outputs (Signature + photo webcam) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-150">
                {/* Digital Signature (Only render if present) */}
                {viewingVisitor.signature_file ? (
                  <div className="text-center p-3 border border-slate-200 rounded-2xl bg-white shadow-inner">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Dokumen Tanda Tangan</span>
                    <div className="h-28 bg-slate-50 rounded-lg flex items-center justify-center p-2 border border-dashed border-slate-200">
                      <img
                        src={viewingVisitor.signature_file}
                        alt="Signature file"
                        className="max-h-full max-w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                ) : null}

                {/* Webcam Image */}
                <div className={`text-center p-3 border border-slate-200 rounded-2xl bg-white shadow-inner ${!viewingVisitor.signature_file ? 'sm:col-span-2 max-w-md mx-auto w-full' : ''}`}>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Foto Kunjungan (Kamera)</span>
                  {viewingVisitor.visitor_photo ? (
                    <div className="h-28 bg-slate-50 rounded-lg overflow-hidden flex items-center justify-center border border-dashed border-slate-200">
                      <img
                        src={viewingVisitor.visitor_photo}
                        alt="Visitor capture file"
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="h-28 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 text-xs gap-1">
                      <Info className="w-4 h-4 text-slate-300 shrink-0" />
                      Tidak mengambil foto
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[10px] text-slate-400 font-mono">
                Registrasi Masuk: {viewingVisitor.created_at} | Bahasa Kiosk: {viewingVisitor.language === 'id' ? 'Bahasa Indonesia' : 'English'}
              </div>

            </div>

            <div className="bg-slate-50 px-6 py-4 text-right">
              <button
                onClick={() => setViewingVisitor(null)}
                className="px-6 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}


      {/* EDIT MODAL DIALOG (Section 11 and 13 Edit details) */}
      {editingVisitor && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden border border-slate-200 shadow-2xl flex flex-col">
            <div className="bg-indigo-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs text-sky-400 block">MODUL EDITOR TAMU DIGITAL</span>
                <strong className="text-base font-display font-semibold">
                  Mengepit Data: {editingVisitor.visit_number}
                </strong>
              </div>
              <button
                onClick={() => setEditingVisitor(null)}
                className="p-1 hover:bg-white/10 rounded-lg text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateVisitor} className="p-6 md:p-8 space-y-4 overflow-y-auto max-h-[75vh]">
              
              <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                {/* Name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Nama Lengkap</label>
                  <input
                    type="text"
                    value={editingVisitor.name}
                    onChange={(e) => setEditingVisitor({ ...editingVisitor, name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>

                {/* Institution */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Asal Instansi</label>
                  <input
                    type="text"
                    value={editingVisitor.institution}
                    onChange={(e) => setEditingVisitor({ ...editingVisitor, institution: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>

                {/* Position */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Jabatan</label>
                  <input
                    type="text"
                    value={editingVisitor.position || ''}
                    onChange={(e) => setEditingVisitor({ ...editingVisitor, position: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Nomor Telepon</label>
                  <input
                    type="text"
                    value={editingVisitor.phone}
                    onChange={(e) => setEditingVisitor({ ...editingVisitor, phone: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Alamat Email</label>
                  <input
                    type="email"
                    value={editingVisitor.email || ''}
                    onChange={(e) => setEditingVisitor({ ...editingVisitor, email: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                {/* City */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Kota / Kabupaten</label>
                  <input
                    type="text"
                    value={editingVisitor.city}
                    onChange={(e) => setEditingVisitor({ ...editingVisitor, city: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>

                {/* Category selection */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Kategori Kunjungan</label>
                  <select
                    value={editingVisitor.visit_category}
                    onChange={(e) => setEditingVisitor({ ...editingVisitor, visit_category: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white cursor-pointer"
                  >
                    {VISIT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Visitor count */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Jumlah Orang</label>
                  <input
                    type="number"
                    min="1"
                    value={editingVisitor.visitor_count}
                    onChange={(e) => setEditingVisitor({ ...editingVisitor, visitor_count: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>
              </div>

              {/* Purpose textarea */}
              <div className="space-y-1 text-xs">
                <label className="font-bold text-slate-700">Tujuan Kunjungan Utama</label>
                <textarea
                  value={editingVisitor.visit_purpose}
                  onChange={(e) => setEditingVisitor({ ...editingVisitor, visit_purpose: e.target.value })}
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  required
                />
              </div>

              {/* Impressions textareas */}
              <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Kesan</label>
                  <textarea
                    value={editingVisitor.impression || ''}
                    onChange={(e) => setEditingVisitor({ ...editingVisitor, impression: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Saran & Masukan</label>
                  <textarea
                    value={editingVisitor.suggestion || ''}
                    onChange={(e) => setEditingVisitor({ ...editingVisitor, suggestion: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingVisitor(null)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow"
                >
                  Simpan Pembaruan Buku Tamu
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Dialog for User Deletion */}
      {userToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-all select-none animate-fade-in text-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center gap-3 text-rose-650">
              <div className="p-3 bg-rose-50 rounded-2xl shrink-0">
                <Trash2 className="w-6 h-6 animate-bounce text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider font-display">
                  Konfirmasi Hapus Pengguna
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold font-mono">
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed font-sans font-medium">
              Apakah Anda yakin ingin menghapus akun petugas bernama <span className="font-bold text-slate-900 font-mono">"{userToDelete.name}"</span> (Username: <span className="font-bold text-indigo-700 font-mono">@{userToDelete.username}</span>) dari sistem database tamu digital perpustakaan?
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer text-slate-500 transition-all font-sans"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-750 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md transition-all font-sans"
              >
                Ya, Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Message Dialog */}
      {userAlertMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-all select-none animate-fade-in text-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center gap-3 text-indigo-650">
              <div className="p-3 bg-indigo-50 rounded-2xl shrink-0">
                <Info className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="font-bold text-slate-850 text-sm uppercase tracking-wider font-display">
                Notifikasi Sistem
              </h3>
            </div>
            
            <p className="text-xs text-slate-650 leading-relaxed font-sans font-semibold">
              {userAlertMessage}
            </p>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setUserAlertMessage(null)}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-750 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md transition-all font-sans"
              >
                Oke, Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
