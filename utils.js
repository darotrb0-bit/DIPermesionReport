// --- CONFIGURATION & CONSTANTS ---
const MAIN_SHEET_ID = "1sfpHSLhcojV8QyFjO3x5PPgfPLhaNckwRF0rOv9DDIk";
const HOME_SHEET_ID = "1qaPPrvbU7TW5OPeb_U3kxWffE26Ob7vK4Z9tkc8HlZ8";
const PROFILE_SHEET_ID = "1_Kgl8UQXRsVATt_BOHYQjVWYKkRIBA12R-qnsBoSUzc";

const RANGES = {
  info: "'INFO'!A8:O",
  leave: "'ច្បាប់សម្រាក'!A2:K",
  home: "'ច្បាប់ទៅផ្ទះ'!B564:Q",
  profiles: "'បញ្ជឺឈ្មោះរួម'!E9:W",
};

// Shared Variable for Home Verification Logic
let homeVerificationMap = {};

// --- THEME CONFIG ---
const themes = {
  blue: {
    50: "239 246 255",
    100: "219 234 254",
    200: "191 219 254",
    300: "147 197 253",
    400: "96 165 250",
    500: "59 130 246",
    600: "37 99 235",
    700: "29 78 216",
    800: "30 64 175",
    900: "30 58 138",
    color: "#2563eb",
  },
  purple: {
    50: "245 243 255",
    100: "237 233 254",
    200: "221 214 254",
    300: "196 181 253",
    400: "167 139 250",
    500: "139 92 246",
    600: "124 58 237",
    700: "109 40 217",
    800: "91 33 182",
    900: "76 29 149",
    color: "#7c3aed",
  },
  teal: {
    50: "240 253 250",
    100: "204 251 241",
    200: "153 246 228",
    300: "94 234 212",
    400: "45 212 191",
    500: "20 184 166",
    600: "13 148 136",
    700: "15 118 110",
    800: "17 94 89",
    900: "19 78 74",
    color: "#0d9488",
  },
  rose: {
    50: "255 241 242",
    100: "255 228 230",
    200: "254 205 211",
    300: "253 164 175",
    400: "251 113 133",
    500: "244 63 94",
    600: "225 29 72",
    700: "190 18 60",
    800: "159 18 57",
    900: "136 19 55",
    color: "#e11d48",
  },
  orange: {
    50: "255 247 237",
    100: "255 237 213",
    200: "254 215 170",
    300: "253 186 116",
    400: "251 146 60",
    500: "249 115 22",
    600: "234 88 12",
    700: "194 65 12",
    800: "154 52 18",
    900: "124 45 18",
    color: "#ea580c",
  },
  green: {
    50: "240 253 244",
    100: "220 252 231",
    200: "187 247 208",
    300: "134 239 172",
    400: "74 222 128",
    500: "34 197 94",
    600: "22 163 74",
    700: "21 128 61",
    800: "22 101 52",
    900: "20 83 45",
    color: "#16a34a",
  },
  slate: {
    50: "248 250 252",
    100: "241 245 249",
    200: "226 232 240",
    300: "203 213 225",
    400: "148 163 184",
    500: "100 116 139",
    600: "71 85 105",
    700: "51 65 85",
    800: "30 41 59",
    900: "15 23 42",
    color: "#475569",
  },
  fuchsia: {
    50: "253 244 255",
    100: "250 232 255",
    200: "245 208 254",
    300: "240 171 252",
    400: "232 121 249",
    500: "217 70 239",
    600: "192 38 211",
    700: "162 27 182",
    800: "134 25 143",
    900: "112 26 117",
    color: "#c026d3",
  },
};

// --- HELPER FUNCTIONS ---
const toKhmerNumber = (num) => {
  if (num === null || num === undefined || num === "") return "N/A";
  const khmerDigits = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];
  return String(num).replace(/[0-9]/g, (digit) => khmerDigits[parseInt(digit)]);
};

const toEnglishNumber = (numStr) => {
  if (numStr === null || numStr === undefined) return "";
  const khmerDigits = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];
  let result = String(numStr);
  khmerDigits.forEach((digit, index) => {
    result = result.replace(new RegExp(digit, "g"), index);
  });
  return result;
};

const parseDateForSort = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") return new Date(0);
  const englishDateStr = toEnglishNumber(dateStr);
  const parsed = new Date(englishDateStr);
  if (!isNaN(parsed.getTime())) return parsed;
  const parts = englishDateStr.split("/");
  if (parts.length === 3) {
    const date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    if (!isNaN(date.getTime())) return date;
  }
  return new Date(0);
};

// --- DATA PARSERS ---
function parseInfoData(rows) {
  return rows
    .slice()
    .reverse()
    .map((row) => ({
      type: "info",
      id: String(row[3] || ""),
      name: row[4] || "",
      gender: row[5] || "",
      class: row[7] || "",
      dateOut: row[0] || "",
      timeOut: row[12] || "",
      dateIn: row[14] || "",
      timeIn: row[13] || "",
      reason: row[9] || "",
      duration: row[10] || "",
      sortDate: parseDateForSort(row[0]),
    }))
    .filter((item) => item.name);
}

function parseLeaveData(rows) {
  return rows
    .slice()
    .reverse()
    .map((row) => ({
      type: "leave",
      id: String(row[1] || ""),
      name: row[2] || "",
      gender: row[3] || "",
      class: row[5] || "",
      date: row[0] || "",
      reason: row[6] || "",
      duration: row[7] || "",
      dateEnd: row[10] || "",
      sortDate: parseDateForSort(row[0]),
    }))
    .filter((item) => item.name);
}

function parseHomeData(rows) {
  return rows
    .slice()
    .reverse()
    .map((row) => {
      const homeId = String(row[6] || "").trim();
      if (!homeId || homeId === "មិនមាន") return null;
      const verification = homeVerificationMap[homeId];
      if (!verification) return null;
      if (verification.status === "NO") return null;
      const finalId = verification.mainId;

      return {
        type: "home",
        id: finalId,
        name: row[0] || "",
        reason: row[8] || "",
        duration: row[9] || "",
        dateOut: row[10] || "",
        timeOut: row[13] || "",
        dateIn: row[14] || "",
        timeIn: row[15] || "",
        sortDate: parseDateForSort(row[10]),
      };
    })
    .filter((item) => item && item.name);
}

function parseProfileData(rows) {
  const profileMap = {};
  homeVerificationMap = {}; // Reset shared map
  const imageUrlRegex = /=IMAGE\("([^"]+)"/;

  rows.forEach((row) => {
    if (row && row[0] !== null && row[0] !== undefined && row[0] !== "") {
      const id = String(row[0]).trim();
      const status = String(row[1] || "")
        .trim()
        .toUpperCase();
      const verificationId = String(row[5] || "").trim();

      if (verificationId) {
        homeVerificationMap[verificationId] = {
          status: status,
          mainId: id,
        };
      }

      let photoUrl = row[11] || "";
      const match = photoUrl.match(imageUrlRegex);
      if (match && match[1]) photoUrl = match[1];

      let telegramUrl = row[18] || "";
      if (telegramUrl && !telegramUrl.startsWith("http")) {
        telegramUrl = "https://" + telegramUrl;
      }

      profileMap[id] = {
        photo: photoUrl,
        department: row[14] || "",
        group: row[6] || "",
        telegram: telegramUrl,
      };
      profileMap[id].group = row[2] || "";
    }
  });
  return profileMap;
}
