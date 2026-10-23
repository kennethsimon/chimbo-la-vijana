export const PURPOSE_OPTIONS = [
  { value: "question", label: "Ameuliza swali" },
  { value: "service", label: "Amepata huduma" },
  { value: "issue_resolved", label: "Ametatua changamoto" }
];

export const SATISFACTION_OPTIONS = [
  { value: "1", label: "1 - Hajaridhika" },
  { value: "2", label: "2 - Wastani" },
  { value: "3", label: "3 - Ameridhika" }
];

export const TRAINING_CENTRE_NAME = "Training Centre";

export const TRAINING_INSTITUTIONS = [
  "Wizara ya Vijana", "TIRA", "HESLB", "TRA", "Immigration", "Traffic Police", "TCRA", "RITA",
  "NSSF", "NHIF", "TISEZA", "PPRA", "NIDA", "UTT AMIS", "Halmashauri"
];

export const BOOTH_SERVICES = {
  "Wizara ya Vijana": ["Taarifa za sera na mipango ya maendeleo ya vijana", "Fursa za ajira na ujuzi kwa vijana", "Mifuko/mipango maalum ya vijana", "Mashauriano ya maendeleo binafsi/kikazi", "Maelezo tu"],
  TIRA: ["Taarifa za bima za jumla", "Haki za mteja wa bima", "Fursa za bima (magari/afya/biashara)", "Maelezo tu"],
  HESLB: ["Uombaji wa mkopo", "Ufuatiliaji wa marejesho", "Masharti ya ustahiki", "Marekebisho ya taarifa", "Maelezo tu"],
  TRA: ["Usajili wa TIN", "Taarifa za kodi kwa biashara ndogo", "Misamaha/vivutio kwa vijana", "Malalamiko ya kodi", "Maelezo tu"],
  Immigration: ["Taarifa za pasipoti", "Vibali vya kazi/ukaazi", "Taratibu za usafiri nje ya nchi", "Maelezo tu"],
  "Traffic Police": ["Taarifa za leseni ya udereva", "Sheria za usalama barabarani", "Taarifa za ajali/malalamiko", "Maelezo tu"],
  TCRA: ["Leseni za mawasiliano/utangazaji", "Malalamiko ya huduma za simu/intaneti", "Fursa kwa wabunifu wa kidijitali", "Maelezo tu"],
  RITA: ["Usajili wa vizazi/vifo", "Usajili wa ndoa", "Usajili wa mashirika/asasi", "Maelezo tu"],
  NSSF: ["Taarifa za uanachama", "Mahesabu ya michango/mafao", "Usajili wa mwanachama mpya", "Mikopo ya nyumba", "Maelezo tu"],
  NHIF: ["Taarifa za uanachama", "Usajili wa mwanachama mpya", "Vifurushi vya bima kwa vijana/wajasiriamali", "Malalamiko ya huduma", "Maelezo tu"],
  TISEZA: ["Vivutio vya uwekezaji", "Usajili wa mradi wa uwekezaji (Certificate of Incentives)", "Taarifa za Special Economic Zones (SEZ)", "Huduma za One Stop Center kwa wawekezaji", "Maelezo tu"],
  PPRA: ["Fursa za zabuni za umma", "Masharti ya kujisajili kama msambazaji/mkandarasi", "Jinsi vijana wanavyoshiriki manunuzi ya umma", "Maelezo tu"],
  NIDA: ["Usajili wa namba ya NIDA", "Hali ya maombi ya kitambulisho", "Masharti ya kupata kitambulisho cha taifa", "Maelezo tu"],
  "UTT AMIS": ["Taarifa za uwekezaji/akiba", "Fursa za vipande vya uwekezaji kwa vijana", "Mipango ya akiba ya muda mrefu", "Maelezo tu"],
  Halmashauri: ["Leseni za biashara ndogo", "Huduma za kijamii (afya/elimu/maji)", "Ardhi na mipango miji", "Mfuko wa 10% kwa vijana", "Maelezo tu"]
};

const ALIASES = {
  "bodi ya mikopo": "HESLB",
  "heslb (bodi ya mikopo ya elimu ya juu)": "HESLB",
  "tiseza (tanzania investment and special economic zones authority)": "TISEZA",
  "nida (mamlaka ya vitambulisho vya taifa)": "NIDA",
  "traffic police (polisi wa usalama barabarani)": "Traffic Police"
};

export function canonicalBoothName(name = "") {
  const clean = String(name).trim();
  return ALIASES[clean.toLowerCase()] || Object.keys(BOOTH_SERVICES).find((key) => key.toLowerCase() === clean.toLowerCase()) || (clean.toLowerCase() === "training centre" ? TRAINING_CENTRE_NAME : clean);
}

export function servicesForBooth(name) {
  return BOOTH_SERVICES[canonicalBoothName(name)] || [];
}

export function isTrainingCentre(name) {
  return canonicalBoothName(name) === TRAINING_CENTRE_NAME;
}
