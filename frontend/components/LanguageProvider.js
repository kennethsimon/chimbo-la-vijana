"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const LanguageContext = createContext({
  lang: "sw",
  setLang: () => {},
  t: (key) => key
});

const dictionary = {
  sw: {
    analytics: "Takwimu",
    attendees: "Washiriki",
    users: "Watumiaji",
    scanHistory: "Historia ya scan",
    scanQr: "Scan QR",
    logout: "Toka",
    dashboard: "Dashibodi",
    apps: "Programu",
    search: "Tafuta...",
    eventReady: "Tayari kwa tukio",
    eventReadyText: "Scan, simamia na fuatilia tukio.",
    adminRole: "Msimamizi",
    exhibitorRole: "Banda",
    foodRole: "Chakula",
    checkinRole: "Kiingilio",
    registerEyebrow: "Usajili",
    registerTitle: "Pata QR Code yako",
    registerDescription: "Jaza taarifa sahihi. Tutakutumia namba ya tiketi kwa SMS, na QR kwa email ukiweka email.",
    fullName: "Jina kamili",
    phone: "Namba ya simu",
    email: "Email",
    emailOptional: "Email (si lazima)",
    registrationSuccessEmail: "Tiketi {ticketCode} imetumwa kwa SMS na email.",
    registrationSuccessSms: "Tiketi {ticketCode} imetumwa kwa SMS.",
    registrationSmsFailed: "Umesajiliwa. SMS haikutumwa; hifadhi namba ya tiketi {ticketCode}.",
    registrationSmsFailedInline: "SMS haikutumwa. Hifadhi namba hii ya tiketi.",
    checkEmail: "Angalia SMS na email",
    checkSms: "Angalia SMS kwenye simu yako.",
    birthDate: "Tarehe ya kuzaliwa",
    gender: "Jinsia",
    activity: "Shughuli ya sasa",
    attendanceDays: "Siku utakazohudhuria",
    selectAttendanceDays: "Chagua siku",
    attendDayOne: "24 October pekee",
    attendDayTwo: "25 October pekee",
    attendBothDays: "24 & 25 October",
    region: "Mkoa",
    district: "Wilaya",
    selectGender: "Chagua jinsia",
    selectActivity: "Chagua shughuli",
    selectRegion: "Chagua mkoa",
    selectDistrict: "Chagua wilaya",
    registerSubmit: "Sajili na nitumie QR",
    registering: "Inasajili...",
    registrationClosedTitle: "Usajili umefungwa",
    registrationClosedDescription: "Tukio la Chimbo La Vijana Brunch limekamilika, hivyo hatupokei usajili mpya. Asante kwa kuwa sehemu ya tukio letu.",
    headerSubtitle: "Usajili wa washiriki",
    heroEyebrow: "Good food · Great people · Good vibes",
    heroTitle: "CHIMBO LA VIJANA BRUNCH",
    heroTagline: "GOOD FOOD. GREAT PEOPLE. GOOD VIBES. BIG ENERGY.",
    heroSubtitle: "Two days. One vibe. Endless memories.",
    heroParagraph: "Jiandae kwa BBQ tamu, watu poa na vibes zisizo na break! Ni muda wa kutoka na mabeshte, kufurahia good food, ku-connect na watu wapya, kudaka fursa na michongo na kutengeneza memories za maana.",
    eventDateLabel: "Tarehe",
    eventDateValue: "24 & 25 October",
    eventTimeLabel: "Muda",
    eventTimeValue: "12:00 PM - 12:00 AM",
    eventLocationLabel: "Mahali",
    eventLocationValue: "Gymkhana Grounds, Posta",
    heroPullUp: "Usibaki kusimuliwa, pull up and be part of the vibe!",
    heroCoupon: "Jisajili sasa upate Coupon ambayo utaitumia kuingia venue na kupata nyama choma.",
    heroQuestion: "The vibes are calling. Wewe utakuwa wapi?",
    registerNow: "Jisajili sasa / Register now",
    countdownTitle: "Countdown ya tukio",
    countdownDays: "Siku",
    countdownHours: "Saa",
    countdownMinutes: "Dakika",
    countdownSeconds: "Sekunde",
    countdownStarted: "Tukio limeanza",
    dashboardTitle: "Dashboard ya tukio",
    dashboardSubtitle: "Muhtasari wa usajili, scans, chakula na mabanda.",
    addUser: "Ongeza mtumiaji",
    createUser: "Tengeneza mtumiaji",
    userList: "Orodha ya watumiaji",
    noUsers: "Hakuna watumiaji bado"
  },
  en: {
    analytics: "Analytics",
    attendees: "Attendees",
    users: "Users",
    scanHistory: "Scan history",
    scanQr: "Scan QR",
    logout: "Logout",
    dashboard: "Dashboard",
    apps: "Apps",
    search: "Search...",
    eventReady: "Event Ready",
    eventReadyText: "Scan, manage and monitor the event.",
    adminRole: "Admin",
    exhibitorRole: "Exhibitor",
    foodRole: "Food",
    checkinRole: "Entrance",
    registerEyebrow: "Registration",
    registerTitle: "Get your QR Code",
    registerDescription: "Fill in accurate details. We will send your ticket number by SMS and the QR by email if provided.",
    fullName: "Full name",
    phone: "Phone number",
    email: "Email",
    emailOptional: "Email (optional)",
    registrationSuccessEmail: "Ticket {ticketCode} was sent by SMS and email.",
    registrationSuccessSms: "Ticket {ticketCode} was sent by SMS.",
    registrationSmsFailed: "Registration succeeded, but SMS was not sent. Keep ticket number {ticketCode}.",
    registrationSmsFailedInline: "SMS was not sent. Keep this ticket number.",
    checkEmail: "Check your SMS and email",
    checkSms: "Check the SMS on your phone.",
    birthDate: "Date of birth",
    gender: "Gender",
    activity: "Current activity",
    attendanceDays: "Days attending",
    selectAttendanceDays: "Select days",
    attendDayOne: "24 October only",
    attendDayTwo: "25 October only",
    attendBothDays: "24 & 25 October",
    region: "Region",
    district: "District",
    selectGender: "Select gender",
    selectActivity: "Select activity",
    selectRegion: "Select region",
    selectDistrict: "Select district",
    registerSubmit: "Register and send my QR",
    registering: "Registering...",
    registrationClosedTitle: "Registration is closed",
    registrationClosedDescription: "Chimbo La Vijana Brunch has ended, so we are no longer accepting new registrations. Thank you for being part of our event.",
    headerSubtitle: "Attendee registration",
    heroEyebrow: "Good food · Great people · Good vibes",
    heroTitle: "CHIMBO LA VIJANA BRUNCH",
    heroTagline: "GOOD FOOD. GREAT PEOPLE. GOOD VIBES. BIG ENERGY.",
    heroSubtitle: "Two days. One vibe. Endless memories.",
    heroParagraph: "Get ready for tasty BBQ, cool people, and nonstop vibes. It is time to step out with friends, enjoy good food, connect with new people, catch opportunities, and create memories that matter.",
    eventDateLabel: "Date",
    eventDateValue: "24 & 25 October",
    eventTimeLabel: "Time",
    eventTimeValue: "12:00 PM - 12:00 AM",
    eventLocationLabel: "Location",
    eventLocationValue: "Gymkhana Grounds, Posta",
    heroPullUp: "Do not wait to hear stories later. Pull up and be part of the vibe!",
    heroCoupon: "Register now to receive a coupon you will use to enter the venue and get nyama choma.",
    heroQuestion: "The vibes are calling. Where will you be?",
    registerNow: "Register now",
    countdownTitle: "Event countdown",
    countdownDays: "Days",
    countdownHours: "Hours",
    countdownMinutes: "Minutes",
    countdownSeconds: "Seconds",
    countdownStarted: "The event has started",
    dashboardTitle: "Event dashboard",
    dashboardSubtitle: "Overview of registrations, scans, food claims, and booths.",
    addUser: "Add user",
    createUser: "Create user",
    userList: "User list",
    noUsers: "No users yet"
  }
};

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState("sw");

  useEffect(() => {
    const saved = window.localStorage.getItem("chimbo_lang");
    if (saved === "en" || saved === "sw") setLangState(saved);
  }, []);

  function setLang(nextLang) {
    setLangState(nextLang);
    window.localStorage.setItem("chimbo_lang", nextLang);
  }

  const value = useMemo(() => ({
    lang,
    setLang,
    t: (key) => dictionary[lang]?.[key] || dictionary.sw[key] || key
  }), [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageSwitcher({ compact = false }) {
  const { lang, setLang } = useLanguage();
  return (
    <div className="inline-flex rounded-md border bg-card p-1 shadow-sm">
      {["sw", "en"].map((option) => (
        <button
          className={lang === option ? "rounded bg-foreground px-2 py-1 text-xs font-semibold uppercase text-background" : "rounded px-2 py-1 text-xs font-semibold uppercase text-muted-foreground hover:bg-secondary"}
          key={option}
          onClick={() => setLang(option)}
          type="button"
        >
          {compact ? option : option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
