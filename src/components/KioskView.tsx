import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Globe, Building2, User as UserIcon, Phone, Mail, Map, FileText, CheckCircle2, Award, Sparkles, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SignaturePad from './SignaturePad';
import WebcamCapture from './WebcamCapture';
import { Visitor, SystemSettings } from '../types';
import { COUNTRIES, VISIT_CATEGORIES } from '../data/mockData';

interface KioskViewProps {
  onNewVisit: (visit: Omit<Visitor, 'id' | 'visit_number' | 'created_at' | 'updated_at'>) => void;
  settings: SystemSettings;
  onOpenAdmin: () => void;
  visitors: Visitor[];
}

export default function KioskView({ onNewVisit, settings, onOpenAdmin, visitors }: KioskViewProps) {
  const [lang, setLang] = useState<'id' | 'en'>('id');
  
  // Real-time dynamic clock for modern Bento header
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const daysID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthsID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const formattedDateID = `${daysID[time.getDay()]}, ${time.getDate()} ${monthsID[time.getMonth()]} ${time.getFullYear()}`;

  const daysEN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthsEN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const formattedDateEN = `${daysEN[time.getDay()]}, ${monthsEN[time.getMonth()]} ${time.getDate()}, ${time.getFullYear()}`;
  const [formData, setFormData] = useState({
    name: '',
    institution: '',
    position: '',
    phone: '',
    email: '',
    country_code: 'ID',
    country_name: 'Indonesia',
    province: '',
    city: '',
    visitor_count: 1,
    visit_category: 'Kunjungan Perpustakaan',
    visit_purpose: '',
    impression: '',
    suggestion: '',
  });

  const [signature, setSignature] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [countrySearch, setCountrySearch] = useState('');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  
  // Thank you page states
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [ttsMuted, setTtsMuted] = useState(!settings.tts_enabled);

  // Filter countries by search query
  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // Dictionary for Bilingual text elements
  const t = {
    id: {
      welcomeTitle: 'Buku Tamu Digital',
      welcomeSubtitle: 'Perpustakaan Sekolah',
      subtext: 'Selamat datang! Silakan isi formulir kunjungan eksternal di bawah ini sebelum memasuki area perpustakaan.',
      langLabel: 'Bahasa / Language',
      personalHeader: 'Informasi Diri & Kontak',
      visitHeader: 'Tentang Kunjungan',
      feedbackHeader: 'Kesan, Saran & Penutup',
      
      name: 'Nama Lengkap',
      institution: 'Instansi / Asal',
      position: 'Jabatan (Opsional)',
      phone: 'Nomor HP / WhatsApp',
      email: 'Alamat Email (Opsional)',
      country: 'Negara Asal',
      province: 'Provinsi / State (Opsional)',
      city: 'Kota / Kabupaten',
      visitor_count: 'Jumlah Pengunjung (Termasuk Anda)',
      category: 'Kategori Kunjungan',
      purpose: 'Tujuan Kunjungan',
      impression: 'Kesan Terhadap Perpustakaan',
      suggestion: 'Saran dan Masukan',
      
      placeholderName: 'Contoh: Ahmad Subardjo, M.Pd.',
      placeholderInstitution: 'Contoh: Universitas Gadjah Mada / SMA 1 Bogor',
      placeholderPosition: 'Contoh: Kepala Sekolah, Pustakawan, Pengawas',
      placeholderPhone: 'Contoh: 0812XXXXXXXX',
      placeholderEmail: 'Contoh: ahmad@gmail.com',
      placeholderCity: 'Contoh: Jakarta Barat, Sleman, Bogor',
      placeholderPurpose: 'Tuliskan rincian tujuan kunjungan Anda (maksimal 500 karakter)...',
      placeholderImpression: 'Tuliskan kesan positif dan kenyamanan perpustakaan kami...',
      placeholderSuggestion: 'Saran perbaikan, tambahan koleksi, atau perbaikan layanan (maksimal 500 karakter)...',
      searchCountry: 'Cari negara...',
      
      btnSubmit: 'Kirim Buku Tamu',
      btnSubmitting: 'Menyimpan Data...',
      errorPhone: 'Nomor HP harus diisi dengan angka minimal 10 karakter',
      errorRequired: 'Bagian ini wajib diisi',
      errorSignature: 'Tanda tangan digital wajib dicantumkan',
      errorEmail: 'Format email tidak valid',
      errorCount: 'Jumlah pengunjung minimal 1 orang',

      thankTitle: 'TERIMA KASIH',
      thankMsg1: `Terima kasih atas kunjungan Anda ke ${settings.library_name || 'Perpustakaan Labschool Jakarta'}.`,
      thankMsg2: 'Masukan yang Anda berikan sangat berarti bagi kami dalam meningkatkan kualitas layanan perpustakaan.',
      thankMsg3: 'Semoga kunjungan Anda menyenangkan dan bermanfaat.',
      thankMsg4: 'Sampai jumpa kembali.',
      countdownLabel: 'Kembali ke halaman utama dalam',
      sec: 'detik',
      loadingTts: 'Membacakan ucapan terima kasih...',
      resetBtn: 'Kirim Baru Sekarang'
    },
    en: {
      welcomeTitle: 'Digital Guest Book',
      welcomeSubtitle: 'School Library',
      subtext: 'Welcome! Please fill in the external guest book form below before entering the library territory.',
      langLabel: 'Language / Bahasa',
      personalHeader: 'Personal Info & Contact',
      visitHeader: 'About the Visit',
      feedbackHeader: 'Feedback & Signature',
      
      name: 'Full Name',
      institution: 'Institution / Origin',
      position: 'Position (Optional)',
      phone: 'Phone / WhatsApp Number',
      email: 'Email Address (Optional)',
      country: 'Country of Origin',
      province: 'Province / State (Optional)',
      city: 'City / Regency',
      visitor_count: 'Number of Visitors (Including Self)',
      category: 'Visit Category',
      purpose: 'Purpose of Visit',
      impression: 'Impressions of the Library',
      suggestion: 'Suggestions & Input',
      
      placeholderName: 'e.g., Prof. Sarah Jenkins',
      placeholderInstitution: 'e.g., University of Sydney / National High School',
      placeholderPosition: 'e.g., Principal, Librarian, Supervisor',
      placeholderPhone: 'e.g., +61412XXXXXX',
      placeholderEmail: 'e.g., sarah.j@school.edu',
      placeholderCity: 'e.g., Sydney, New York, Tokyo',
      placeholderPurpose: 'Write details about your visit purpose (max 500 characters)...',
      placeholderImpression: 'Write your positive thoughts and comfort of our library...',
      placeholderSuggestion: 'Your feedback on improvements, collection size, etc. (max 500 characters)...',
      searchCountry: 'Search country...',
      
      btnSubmit: 'Submit Guest Book',
      btnSubmitting: 'Storing records...',
      errorPhone: 'Phone number must be at least 10 digits/characters',
      errorRequired: 'This field is required',
      errorSignature: 'Digital signature is required to verify your visit',
      errorEmail: 'Invalid email address format',
      errorCount: 'Number of visitors must be at least 1',

      thankTitle: 'THANK YOU',
      thankMsg1: `Thank you for visiting ${settings.library_name || 'Perpustakaan Labschool Jakarta'}.`,
      thankMsg2: 'Your feedback is highly valuable in helping us improve our library services.',
      thankMsg3: 'We hope your visit has been enjoyable and beneficial.',
      thankMsg4: 'We look forward to welcoming you again.',
      countdownLabel: 'Returning to main kiosk screen in',
      sec: 'seconds',
      loadingTts: 'Speaking thank you message...',
      resetBtn: 'Submit Another'
    }
  }[lang];

  // TTS implementation
  const speakThankYou = () => {
    if (ttsMuted) return;
    
    // Stop any existing speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const libVal = settings.library_name || 'Perpustakaan Labschool Jakarta';
      const textToRead = lang === 'id' 
        ? `Terima kasih atas kunjungan Anda ke ${libVal}. Semoga kunjungan Anda menyenangkan dan bermanfaat. Sampai jumpa kembali.`
        : `Thank you for visiting ${libVal}. We hope your visit was enjoyable and valuable. We look forward to welcoming you again.`;

      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.lang = lang === 'id' ? 'id-ID' : 'en-US';
      utterance.volume = settings.tts_volume;
      utterance.rate = settings.tts_rate;

      // Attempt to load proper voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang.startsWith(lang === 'id' ? 'id' : 'en'));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      window.speechSynthesis.speak(utterance);
    }
  };

  // Sync settings mute
  useEffect(() => {
    setTtsMuted(!settings.tts_enabled);
  }, [settings.tts_enabled]);

  // Countdown clock when submitted
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSubmitted) {
      // Trigger TTS reading on enter
      speakThankYou();

      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            resetForm();
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isSubmitted]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = t.errorRequired;
    if (!formData.institution.trim()) newErrors.institution = t.errorRequired;
    
    // Phone validation
    const cleanPhone = formData.phone.trim();
    if (!cleanPhone) {
      newErrors.phone = t.errorRequired;
    } else if (cleanPhone.replace(/[^0-9+]/g, '').length < 10) {
      newErrors.phone = t.errorPhone;
    }

    // Email validation (optional)
    if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t.errorEmail;
    }

    if (!formData.city.trim()) newErrors.city = t.errorRequired;
    if (formData.visitor_count < 1) newErrors.visitor_count = t.errorCount;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'visitor_count' ? parseInt(value) || 1 : value,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const selectCountry = (name: string, code: string) => {
    setFormData((prev) => ({
      ...prev,
      country_code: code,
      country_name: name,
    }));
    setCountrySearch(name);
    setIsCountryDropdownOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onNewVisit({
        ...formData,
        signature_file: signature,
        visitor_photo: photo,
        language: lang,
        visit_date: new Date().toISOString().split('T')[0],
      });
      setIsSubmitted(true);
    } else {
      // Scroll to error
      const firstError = Object.keys(errors)[0];
      if (firstError) {
        document.getElementsByName(firstError)[0]?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      institution: '',
      position: '',
      phone: '',
      email: '',
      country_code: 'ID',
      country_name: 'Indonesia',
      province: '',
      city: '',
      visitor_count: 1,
      visit_category: 'Kunjungan Perpustakaan',
      visit_purpose: '',
      impression: '',
      suggestion: '',
    });
    setSignature('');
    setPhoto(null);
    setErrors({});
    setIsSubmitted(false);
    setCountdown(10);
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(n => n ? n[0] : '')
      .join('')
      .toUpperCase();
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '';
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = visitors
    .filter(v => v.visit_date === todayStr)
    .reduce((sum, v) => sum + (v.visitor_count || 1), 0);
  
  const totalCount = visitors.reduce((sum, v) => sum + (v.visitor_count || 1), 0);

  return (
    <div className="w-full max-w-7xl mx-auto py-6 px-4">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          {settings.library_logo ? (
            <img
              src={settings.library_logo}
              alt="Library Logo"
              className="w-14 h-14 object-contain rounded-xl shadow-xs shrink-0 select-none"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center shrink-0 select-none shadow-xs">
              <BookOpen className="w-7 h-7 text-indigo-600 animate-pulse" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-extrabold text-slate-400 font-mono tracking-widest uppercase">
                {lang === 'id' ? 'Layanan Buku Tamu' : 'Guest Book Office'}
              </span>
            </div>
            <h1 className="text-3xl font-black font-display tracking-tight text-indigo-950 uppercase leading-none">
              {lang === 'id' ? 'BUKU TAMU DIGITAL' : 'DIGITAL GUEST BOOK'}
            </h1>
            <p className="text-slate-500 font-semibold italic text-xs mt-1.5 font-sans">
              {settings.library_name || (lang === 'id' ? 'Perpustakaan Labschool Jakarta' : 'Labschool Jakarta School Library')}
            </p>
          </div>
        </div>

        {/* Center / Action section: Language Switcher and Admin Link */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Admin Button */}
          <button
            onClick={onOpenAdmin}
            className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-705 font-mono text-[10px] uppercase font-bold tracking-wider py-1.5 px-3.5 rounded-full cursor-pointer transition-all flex items-center gap-1.5 shadow-sm active:translate-y-[1px]"
          >
            <span>🖥️</span> {lang === 'id' ? 'Portal Petugas' : 'Staff Portal'}
          </button>

          {/* Bilingual Language Switcher */}
          <div className="bg-slate-100 p-0.5 rounded-full border border-slate-200 flex items-center select-none shadow-sm">
            <button
              type="button"
              onClick={() => setLang('id')}
              className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
                lang === 'id'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🇮🇩 IND
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
                lang === 'en'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🇬🇧 ENG
            </button>
          </div>
        </div>

        {/* Right side: Dynamic Clock & Date */}
        <div className="text-left md:text-right shrink-0">
          <div id="dynamic-digital-clock" className="text-2xl md:text-3xl font-mono font-bold text-slate-800 tracking-tight leading-none select-none">
            {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-1.5 font-mono">
            {lang === 'id' ? formattedDateID : formattedDateEN}
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {!isSubmitted ? (
          <motion.div
            key="kiosk-form-bento"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-12 gap-6"
          >
            {/* Bento Form - Spans 7 columns on desktop */}
            <div className="col-span-12 lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-100 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 font-display">
                      {lang === 'id' ? 'Formulir Registrasi Kunjungan' : 'Visit Registration Form'}
                    </h2>
                    <p className="text-xs text-slate-400 font-medium">
                      {lang === 'id' ? 'Silakan isi rincian kedatangan Anda secara mandiri' : 'Please fill in your arrival details individually'}
                    </p>
                  </div>
                </div>

                {/* Form fields - keep same validation, handlers & IDs */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* SECTION 1: Personal Info */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-1.5 pb-1 select-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                      <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider font-mono">
                        {t.personalHeader}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Nama Lengkap */}
                      <div>
                        <label id="label-name" className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1 select-none">
                          {t.name} <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="name-input"
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder={t.placeholderName}
                          className={`w-full px-4 py-2.5 rounded-xl border ${
                            errors.name ? 'border-rose-400 bg-rose-50/10' : 'border-slate-200 bg-slate-50 focus:border-indigo-500 focus:bg-white'
                          } text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all`}
                        />
                        {errors.name && <p className="text-xs text-rose-500 mt-1 ml-1 font-medium">{errors.name}</p>}
                      </div>

                      {/* Instansi */}
                      <div>
                        <label id="label-institution" className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1 select-none">
                          {t.institution} <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="inst-input"
                          type="text"
                          name="institution"
                          value={formData.institution}
                          onChange={handleInputChange}
                          placeholder={t.placeholderInstitution}
                          className={`w-full px-4 py-2.5 rounded-xl border ${
                            errors.institution ? 'border-rose-400 bg-rose-50/10' : 'border-slate-200 bg-slate-50 focus:border-indigo-500 focus:bg-white'
                          } text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all`}
                        />
                        {errors.institution && <p className="text-xs text-rose-500 mt-1 ml-1 font-medium">{errors.institution}</p>}
                      </div>

                      {/* Jabatan */}
                      <div>
                        <label id="label-position" className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1 select-none">
                          {t.position}
                        </label>
                        <input
                          id="pos-input"
                          type="text"
                          name="position"
                          value={formData.position}
                          onChange={handleInputChange}
                          placeholder={t.placeholderPosition}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:border-indigo-500 focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                        />
                      </div>

                      {/* Nomor HP */}
                      <div>
                        <label id="label-phone" className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1 select-none">
                          {t.phone} <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="phone-input"
                          type="text"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder={t.placeholderPhone}
                          className={`w-full px-4 py-2.5 rounded-xl border ${
                            errors.phone ? 'border-rose-400 bg-rose-50/10' : 'border-slate-200 bg-slate-50 focus:border-indigo-500 focus:bg-white'
                          } text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all`}
                        />
                        {errors.phone && <p className="text-xs text-rose-500 mt-1 ml-1 font-medium">{errors.phone}</p>}
                      </div>

                      {/* Email */}
                      <div>
                        <label id="label-email" className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1 select-none">
                          {t.email}
                        </label>
                        <input
                          id="email-input"
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder={t.placeholderEmail}
                          className={`w-full px-4 py-2.5 rounded-xl border ${
                            errors.email ? 'border-rose-400 bg-rose-50/10' : 'border-slate-200 bg-slate-50 focus:border-indigo-500 focus:bg-white'
                          } text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all`}
                        />
                        {errors.email && <p className="text-xs text-rose-500 mt-1 ml-1 font-medium">{errors.email}</p>}
                      </div>

                      {/* Negara Dropdown */}
                      <div className="relative">
                        <label id="label-country" className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1 select-none">
                          {t.country} <span className="text-rose-500">*</span>
                        </label>
                        <div>
                          <button
                            id="country-selection-btn"
                            type="button"
                            onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm bg-slate-50 hover:bg-slate-105 text-left focus:outline-none transition-all cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <span className="font-mono text-base">
                                {formData.country_code === 'ID' ? '🇮🇩' : '🌍'}
                              </span>
                              {formData.country_name}
                            </span>
                            <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                          </button>

                          {isCountryDropdownOpen && (
                            <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-52 flex flex-col">
                              <div className="bg-slate-50 p-2 border-b border-slate-150">
                                <input
                                  type="text"
                                  value={countrySearch}
                                  onChange={(e) => setCountrySearch(e.target.value)}
                                  placeholder={t.searchCountry}
                                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white"
                                />
                              </div>
                              <div className="overflow-y-auto flex-1">
                                {countrySearch.trim().length > 0 && !COUNTRIES.some(col => col.name.toLowerCase() === countrySearch.toLowerCase().trim()) && (
                                  <button
                                    type="button"
                                    onClick={() => selectCountry(countrySearch.trim(), 'OTHER')}
                                    className="w-full text-left px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-xs text-emerald-800 font-semibold flex items-center gap-2 cursor-pointer border-b border-slate-100 transition-colors"
                                  >
                                    <span className="text-sm">🌍</span>
                                    <span>{lang === 'id' ? `Gunakan "${countrySearch.trim()}"` : `Use "${countrySearch.trim()}"`}</span>
                                  </button>
                                )}
                                {filteredCountries.map((country) => (
                                  <button
                                    key={country.code}
                                    type="button"
                                    onClick={() => selectCountry(country.name, country.code)}
                                    className="w-full text-left px-4 py-2 hover:bg-indigo-50 text-xs text-slate-750 flex items-center gap-2 cursor-pointer transition-colors"
                                  >
                                    <span className="text-sm font-mono">
                                      {country.code === 'ID' ? '🇮🇩' : '🏳️'}
                                    </span>
                                    <span>{country.name}</span>
                                  </button>
                                ))}
                                {filteredCountries.length === 0 && countrySearch.trim().length === 0 && (
                                  <div className="p-3 text-xs text-center text-slate-400">
                                    No countries found
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Provinsi */}
                      <div>
                        <label id="label-province" className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1 select-none">
                          {t.province}
                        </label>
                        <input
                          id="prov-input"
                          type="text"
                          name="province"
                          value={formData.province}
                          onChange={handleInputChange}
                          placeholder="e.g., Jawa Barat / Queensland"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:border-indigo-500 focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                        />
                      </div>

                      {/* Kota */}
                      <div>
                        <label id="label-city" className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1 select-none">
                          {t.city} <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="city-input"
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          placeholder={t.placeholderCity}
                          className={`w-full px-4 py-2.5 rounded-xl border ${
                            errors.city ? 'border-rose-400 bg-rose-50/10' : 'border-slate-200 bg-slate-50 focus:border-indigo-500 focus:bg-white'
                          } text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all`}
                        />
                        {errors.city && <p className="text-xs text-rose-500 mt-1 ml-1 font-medium">{errors.city}</p>}
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: Visit details */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-1.5 pb-1 select-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                      <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider font-mono">
                        {t.visitHeader}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Jumlah Pengunjung */}
                      <div>
                        <label id="label-count" className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1 select-none">
                          {t.visitor_count} <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="count-input"
                          type="number"
                          name="visitor_count"
                          min="1"
                          value={formData.visitor_count}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:border-indigo-500 focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                        />
                        {errors.visitor_count && <p className="text-xs text-rose-500 mt-1 ml-1 font-medium">{errors.visitor_count}</p>}
                      </div>

                      {/* Kategori Kunjungan */}
                      <div>
                        <label id="label-category" className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1 select-none">
                          {t.category} <span className="text-rose-500">*</span>
                        </label>
                        <select
                          id="cat-select"
                          name="visit_category"
                          value={formData.visit_category}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:border-indigo-500 focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white transition-all cursor-pointer"
                        >
                          {VISIT_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Tujuan Kunjungan Text Area */}
                    <div>
                      <label id="label-purpose" className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1 select-none">
                        {t.purpose} <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        id="purpose-textarea"
                        name="visit_purpose"
                        rows={3}
                        maxLength={500}
                        value={formData.visit_purpose}
                        onChange={handleInputChange}
                        placeholder={t.placeholderPurpose}
                        className={`w-full px-4 py-3 rounded-xl border ${
                          errors.visit_purpose ? 'border-rose-400 bg-rose-50/10' : 'border-slate-200 bg-slate-50 focus:border-indigo-500 focus:bg-white'
                        } text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all resize-none`}
                      />
                      <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 px-1 font-medium">
                        <span>{formData.visit_purpose.length} / 500 characters</span>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: Feedback & Signatures */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-1.5 pb-1 select-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                      <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider font-mono">
                        {t.feedbackHeader}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Kesan */}
                      <div>
                        <label id="label-impression" className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1 select-none">
                          {t.impression}
                        </label>
                        <textarea
                          id="impression-textarea"
                          name="impression"
                          rows={3}
                          value={formData.impression}
                          onChange={handleInputChange}
                          placeholder={t.placeholderImpression}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:border-indigo-500 focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
                        />
                      </div>

                      {/* Saran */}
                      <div>
                        <label id="label-suggestion" className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1 select-none">
                          {t.suggestion}
                        </label>
                        <textarea
                          id="suggestion-textarea"
                          name="suggestion"
                          rows={3}
                          maxLength={500}
                          value={formData.suggestion}
                          onChange={handleInputChange}
                          placeholder={t.placeholderSuggestion}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:border-indigo-500 focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
                        />
                        <div className="text-right text-[10px] text-slate-400 mt-1 px-1 font-medium">
                          {formData.suggestion.length} / 500
                        </div>
                      </div>
                    </div>



                    {/* Camera / Camera capture */}
                    <div key={`${lang}-webcam`} className="pt-4 border-t border-slate-100">
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1 select-none font-sans">
                        {lang === 'id' ? 'Foto Pengunjung (Opsional)' : 'Visitor Photo (Optional)'}
                      </label>
                      <WebcamCapture
                        onCapture={(p) => setPhoto(p)}
                        language={lang}
                      />
                    </div>
                  </div>

                  {/* Submission buttons inside form wrapper */}
                  <div className="pt-4 border-t border-slate-100">
                    <button
                      type="submit"
                      id="submit-form-btn"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-display font-bold py-4 rounded-2xl shadow-lg shadow-indigo-100 hover:shadow-indigo-150/80 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      {t.btnSubmit.toUpperCase()}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Bento Sidebar Widgets Area - Spans 5 columns on desktop */}
            <div className="col-span-12 lg:col-span-5 flex flex-col gap-6 lg:self-start">
              
              {/* Statistics Row Grid */}
              <div className="grid grid-cols-2 gap-4">
                
                {/* Statistics Card 1 (Blue Panel) */}
                <div className="bg-indigo-950 rounded-3xl p-6 text-white flex flex-col justify-between overflow-hidden relative shadow-sm hover:shadow-md transition-shadow min-h-[170px] select-none">
                  <div className="relative z-10 flex flex-col justify-between h-full">
                    <div>
                      <p className="text-indigo-300 text-xs font-extrabold uppercase tracking-widest mb-1 font-mono">
                        {lang === 'id' ? 'Hari Ini' : 'Today'}
                      </p>
                      <h3 id="stat-today-count" className="text-5xl font-black font-display tracking-tight text-white mt-1">
                        {todayCount}
                      </h3>
                    </div>
                    <p className="text-xs text-indigo-200 mt-2 font-medium">
                      {lang === 'id' ? 'Pengunjung Eksternal' : 'External Visitors'}
                    </p>
                  </div>
                  <div className="absolute -right-4 -bottom-4 opacity-10 text-white pointer-events-none">
                    <BookOpen className="w-24 h-24" />
                  </div>
                </div>

                {/* Statistics Card 2 (Amber Panel) */}
                <div className="bg-amber-500 rounded-3xl p-6 text-white flex flex-col justify-between overflow-hidden relative shadow-sm hover:shadow-md transition-shadow min-h-[170px] select-none">
                  <div className="relative z-10 flex flex-col justify-between h-full">
                    <div>
                      <p className="text-amber-100 text-xs font-extrabold uppercase tracking-widest mb-1 font-mono">
                        {lang === 'id' ? 'Total Buku Tamu' : 'Total Guest Book'}
                      </p>
                      <h3 id="stat-all-count" className="text-5xl font-black font-display tracking-tight text-white mt-1">
                        {totalCount >= 1000 ? `${(totalCount / 1000).toFixed(1)}k` : totalCount}
                      </h3>
                    </div>
                    <p className="text-xs text-amber-500 bg-amber-50 border border-amber-200/50 py-0.5 px-2 rounded-full self-start font-bold mt-2 text-[10px]">
                      {lang === 'id' ? 'Seluruh Tamu' : 'All Guest Logs'}
                    </p>
                  </div>
                  <div className="absolute -right-4 -bottom-4 opacity-15 text-white pointer-events-none">
                    <Award className="w-24 h-24" />
                  </div>
                </div>
              </div>

              {/* Recent Visitors List Card (Live Data matching Mock aesthetic) */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 overflow-hidden flex flex-col min-h-[360px]">
                <h3 className="text-base font-bold mb-4 flex items-center justify-between text-slate-800 font-display select-none">
                  <span>{lang === 'id' ? 'Kunjungan Terakhir' : 'Recent Visitors'}</span>
                  <span className="text-[10px] px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-mono font-bold uppercase tracking-wider animate-pulse">
                    Real-time
                  </span>
                </h3>

                <div className="space-y-3.5 flex-1 overflow-y-auto pr-1">
                  {visitors.slice(0, 4).map((visitor) => {
                    const initials = getInitials(visitor.name);
                    const timeStr = formatTime(visitor.created_at);
                    return (
                      <div key={visitor.id} className="flex items-center gap-4.5 p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                        <div className="w-10 h-10 rounded-full bg-slate-200/80 border border-slate-300/30 flex items-center justify-center font-bold text-slate-600 italic shrink-0 select-none">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-slate-800 truncate">{visitor.name}</p>
                          <p className="text-xs text-slate-400 font-semibold truncate leading-normal">
                            {visitor.institution} • {timeStr}
                          </p>
                        </div>
                        <div className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-2 py-1 rounded-md shrink-0">
                          {visitor.visit_category.replace('Kunjungan ', '').substring(0, 8)}
                        </div>
                      </div>
                    );
                  })}
                  {visitors.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                      <p className="text-xs font-semibold">{lang === 'id' ? 'Belum ada tamu hari ini' : 'No guest visits today yet'}</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Information / Motto Card - Spans columns, matches layout next to recent visitors list */}
            <div className="col-span-12 bg-slate-950 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 text-white relative overflow-hidden select-none shadow-sm shadow-slate-100">
              <div className="absolute top-0 right-0 w-60 h-60 bg-indigo-650 opacity-[0.06] rounded-full blur-3xl pointer-events-none" />
              <div className="flex-1">
                <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-2 font-mono">
                  {lang === 'id' ? 'Motto Perpustakaan' : 'Library Motto'}
                </p>
                <h4 className="text-white text-xl md:text-2xl font-serif leading-snug italic tracking-wide">
                  {lang === 'id' 
                    ? (settings.library_motto_id || '"Jendela dunia terbuka lebar bagi mereka yang gemar membaca dan mencari ilmu."')
                    : (settings.library_motto_en || '"The window of the world is wide open for those who love to read and seek knowledge."')}
                </h4>
                <div className="mt-4 h-1 w-20 bg-indigo-500 rounded-full" />
              </div>
            </div>

          </motion.div>
        ) : (
          /* THANK YOU STATE */
          <motion.div
            key="thank-you-screen"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 md:p-12 text-center relative overflow-hidden"
          >
            {/* Elegant Confetti BG rings */}
            <div className="absolute -top-12 -left-12 w-64 h-64 rounded-full bg-sky-50 opacity-40 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 w-80 h-80 rounded-full bg-indigo-50 opacity-50 blur-3xl pointer-events-none" />

            {/* Mute toggle for speech */}
            <button
              onClick={() => {
                setTtsMuted(!ttsMuted);
                if (ttsMuted && 'speechSynthesis' in window) {
                  // Re-trigger speech instantly on unmute
                  setTtsMuted(false);
                  setTimeout(() => speakThankYou(), 100);
                } else if ('speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                }
              }}
              className="absolute top-6 right-6 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-medium py-2 px-3 rounded-full border border-slate-200 cursor-pointer transition-all flex items-center gap-2 text-xs z-10 select-none"
            >
              {ttsMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-rose-500" />
                  Unmute Speech
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-600 animate-bounce" />
                  Mute TTS
                </>
              )}
            </button>

            {/* Success icon banner */}
            <div className="mx-auto w-24 h-24 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-6 relative">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
              <motion.div
                initial={{ transform: 'scale(0.8)', opacity: 0 }}
                animate={{ transform: 'scale(1.15)', opacity: [0, 0.4, 0] }}
                transition={{ repeat: Infinity, duration: 2.2 }}
                className="absolute inset-0 rounded-full bg-emerald-400"
              />
            </div>

            {/* Header Badge */}
            <div className="inline-flex items-center gap-1.5 bg-sky-50 text-indigo-800 text-[11px] font-bold tracking-widest uppercase font-mono px-3.5 py-1 rounded-full border border-indigo-100 mb-4 animate-pulse select-none">
              <Award className="w-3.5 h-3.5" />
              {lang === 'id' ? 'PENDAFTARAN BERHASIL' : 'REGISTRATION SUCCESSFUL'}
            </div>

            {/* Message Titles and descriptions (based on PRD Section 8) */}
            <h1 className="text-4xl md:text-5xl font-display font-black tracking-tight text-slate-900 mb-6 uppercase select-none">
              {t.thankTitle}
            </h1>

            <div className="max-w-2xl mx-auto space-y-4 text-slate-700 text-lg md:text-xl font-normal leading-relaxed">
              <p className="font-semibold text-slate-800 text-xl md:text-2xl">
                {t.thankMsg1}
              </p>
              <p className="text-slate-600 font-sans font-light text-base md:text-lg">
                {t.thankMsg2}
              </p>
              <p className="text-slate-600 font-sans font-light text-base md:text-lg">
                {t.thankMsg3}
              </p>
              <p className="font-display font-semibold text-slate-800 mt-4 text-lg">
                {t.thankMsg4}
              </p>
            </div>

            {/* Countdown bar */}
            <div className="mt-12 max-w-sm mx-auto bg-slate-50 border border-slate-200/80 rounded-2xl p-4 shadow-sm select-none">
              <span className="text-xs text-slate-500 font-mono block mb-2.5">
                {t.countdownLabel} <strong className="text-indigo-600 font-extrabold text-sm">{countdown}</strong> {t.sec}...
              </span>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 10, ease: 'linear' }}
                  className="bg-gradient-to-r from-sky-500 to-indigo-600 h-full rounded-full"
                />
              </div>
            </div>

            {/* Immediate Reset Trigger override button */}
            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl text-xs font-semibold cursor-pointer shadow transition-all flex items-center gap-2 select-none"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                {t.resetBtn}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
