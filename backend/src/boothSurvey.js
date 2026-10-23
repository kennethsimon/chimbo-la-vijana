export const PURPOSES = ["question", "service", "issue_resolved"];

export const PURPOSE_LABELS = {
  question: "Ameuliza swali",
  service: "Amepata huduma",
  issue_resolved: "Ametatua changamoto"
};

export const TRAINING_CENTRE_NAME = "Training Centre";

export const TRAINING_INSTITUTIONS = [
  "Wizara ya Vijana",
  "TIRA",
  "HESLB",
  "TRA",
  "Immigration",
  "Traffic Police",
  "TCRA",
  "RITA",
  "NSSF",
  "NHIF",
  "TISEZA",
  "PPRA",
  "NIDA",
  "UTT AMIS",
  "Halmashauri"
];

export const BOOTH_SERVICES = {
  "Wizara ya Vijana": [
    "Taarifa za sera na mipango ya maendeleo ya vijana",
    "Fursa za ajira na ujuzi kwa vijana",
    "Mifuko/mipango maalum ya vijana",
    "Mashauriano ya maendeleo binafsi/kikazi",
    "Maelezo tu"
  ],
  TIRA: [
    "Taarifa za bima za jumla",
    "Haki za mteja wa bima",
    "Fursa za bima (magari/afya/biashara)",
    "Maelezo tu"
  ],
  HESLB: [
    "Uombaji wa mkopo",
    "Ufuatiliaji wa marejesho",
    "Masharti ya ustahiki",
    "Marekebisho ya taarifa",
    "Maelezo tu"
  ],
  TRA: [
    "Usajili wa TIN",
    "Taarifa za kodi kwa biashara ndogo",
    "Misamaha/vivutio kwa vijana",
    "Malalamiko ya kodi",
    "Maelezo tu"
  ],
  Immigration: [
    "Taarifa za pasipoti",
    "Vibali vya kazi/ukaazi",
    "Taratibu za usafiri nje ya nchi",
    "Maelezo tu"
  ],
  "Traffic Police": [
    "Taarifa za leseni ya udereva",
    "Sheria za usalama barabarani",
    "Taarifa za ajali/malalamiko",
    "Maelezo tu"
  ],
  TCRA: [
    "Leseni za mawasiliano/utangazaji",
    "Malalamiko ya huduma za simu/intaneti",
    "Fursa kwa wabunifu wa kidijitali",
    "Maelezo tu"
  ],
  RITA: [
    "Usajili wa vizazi/vifo",
    "Usajili wa ndoa",
    "Usajili wa mashirika/asasi",
    "Maelezo tu"
  ],
  NSSF: [
    "Taarifa za uanachama",
    "Mahesabu ya michango/mafao",
    "Usajili wa mwanachama mpya",
    "Mikopo ya nyumba",
    "Maelezo tu"
  ],
  NHIF: [
    "Taarifa za uanachama",
    "Usajili wa mwanachama mpya",
    "Vifurushi vya bima kwa vijana/wajasiriamali",
    "Malalamiko ya huduma",
    "Maelezo tu"
  ],
  TISEZA: [
    "Vivutio vya uwekezaji",
    "Usajili wa mradi wa uwekezaji (Certificate of Incentives)",
    "Taarifa za Special Economic Zones (SEZ)",
    "Huduma za One Stop Center kwa wawekezaji",
    "Maelezo tu"
  ],
  PPRA: [
    "Fursa za zabuni za umma",
    "Masharti ya kujisajili kama msambazaji/mkandarasi",
    "Jinsi vijana wanavyoshiriki manunuzi ya umma",
    "Maelezo tu"
  ],
  NIDA: [
    "Usajili wa namba ya NIDA",
    "Hali ya maombi ya kitambulisho",
    "Masharti ya kupata kitambulisho cha taifa",
    "Maelezo tu"
  ],
  "UTT AMIS": [
    "Taarifa za uwekezaji/akiba",
    "Fursa za vipande vya uwekezaji kwa vijana",
    "Mipango ya akiba ya muda mrefu",
    "Maelezo tu"
  ],
  Halmashauri: [
    "Leseni za biashara ndogo",
    "Huduma za kijamii (afya/elimu/maji)",
    "Ardhi na mipango miji",
    "Mfuko wa 10% kwa vijana",
    "Maelezo tu"
  ]
};

const BOOTH_ALIASES = {
  "wizara ya vijana": "Wizara ya Vijana",
  tira: "TIRA",
  heslb: "HESLB",
  "heslb (bodi ya mikopo ya elimu ya juu)": "HESLB",
  "bodi ya mikopo": "HESLB",
  tra: "TRA",
  immigration: "Immigration",
  "traffic police": "Traffic Police",
  "traffic police (polisi wa usalama barabarani)": "Traffic Police",
  tcra: "TCRA",
  rita: "RITA",
  nssf: "NSSF",
  nhif: "NHIF",
  tiseza: "TISEZA",
  "tiseza (tanzania investment and special economic zones authority)": "TISEZA",
  ppra: "PPRA",
  nida: "NIDA",
  "nida (mamlaka ya vitambulisho vya taifa)": "NIDA",
  "utt amis": "UTT AMIS",
  halmashauri: "Halmashauri",
  "training centre": TRAINING_CENTRE_NAME
};

export function canonicalBoothName(name = "") {
  return BOOTH_ALIASES[String(name).trim().toLowerCase()] || String(name).trim();
}

export function servicesForBooth(name) {
  return BOOTH_SERVICES[canonicalBoothName(name)] || [];
}

export function isTrainingCentre(name) {
  return canonicalBoothName(name) === TRAINING_CENTRE_NAME;
}

export function buildVisitSurveyAnswers({ purpose, service, satisfaction, question, newInfo, trainingInstitution, surveyStatus }) {
  return [
    { id: "surveyStatus", question: "Hali ya tathmini", answer: surveyStatus === "skipped" ? "Imerukwa" : "Imekamilika" },
    purpose ? { id: "purpose", question: "Alichokuja kufanya", answer: PURPOSE_LABELS[purpose] || purpose } : null,
    service ? { id: "service", question: "Huduma maalum aliyopata", answer: service } : null,
    trainingInstitution ? { id: "trainingInstitution", question: "Taasisi iliyotoa mafunzo", answer: trainingInstitution } : null,
    satisfaction ? { id: "satisfaction", question: "Kuridhika", answer: String(satisfaction) } : null,
    question ? { id: "question", question: "Aliuliza swali gani?", answer: question } : null,
    newInfo ? { id: "newInfo", question: "Taarifa mpya aliyopata", answer: newInfo } : null
  ].filter(Boolean);
}
