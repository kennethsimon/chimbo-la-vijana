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
    registerEyebrow: "Usajili",
    registerTitle: "Pata QR Code yako",
    registerDescription: "Jaza taarifa sahihi. Tutakutumia tiketi yako kwenye email.",
    fullName: "Jina kamili",
    phone: "Namba ya simu",
    email: "Email",
    birthDate: "Tarehe ya kuzaliwa",
    gender: "Jinsia",
    activity: "Shughuli ya sasa",
    region: "Mkoa",
    district: "Wilaya",
    selectGender: "Chagua jinsia",
    selectActivity: "Chagua shughuli",
    selectRegion: "Chagua mkoa",
    selectDistrict: "Chagua wilaya",
    registerSubmit: "Sajili na nitumie QR",
    registering: "Inasajili...",
    heroTitle: "Jiunge na Chimbo La Vijana Brunch",
    heroText: "Jisajili mapema upate QR Code yako kwa email. Utaitumia kuingia, kupokea huduma kwenye mabanda, na kuthibitisha chakula siku ya tukio.",
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
    registerEyebrow: "Registration",
    registerTitle: "Get your QR Code",
    registerDescription: "Fill in accurate details. We will send your ticket by email.",
    fullName: "Full name",
    phone: "Phone number",
    email: "Email",
    birthDate: "Date of birth",
    gender: "Gender",
    activity: "Current activity",
    region: "Region",
    district: "District",
    selectGender: "Select gender",
    selectActivity: "Select activity",
    selectRegion: "Select region",
    selectDistrict: "Select district",
    registerSubmit: "Register and send my QR",
    registering: "Registering...",
    heroTitle: "Join Chimbo La Vijana Brunch",
    heroText: "Register early and receive your QR Code by email. Use it for entry, booth services, and food confirmation on event day.",
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
