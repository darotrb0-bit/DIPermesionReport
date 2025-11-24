// ==========================================
// 1. GLOBAL VARIABLES & STATE
// ==========================================
let GOOGLE_API_KEY = "AIzaSyDX3DGMjYiuPlaiCDlk0KCm-0JQVcCwUJY";
let allData = { info: [], leave: [], home: [], combined: [] };
let profileData = {};
let currentTab = "info";
let currentPage = 1;
let cardsPerPage = 24;
let filterDate = null;
let touchStartX = 0;
let touchEndX = 0;

// --- SPEED OPTIMIZATION CONFIG (ការកំណត់ល្បឿន) ---
const CACHE_DURATION = 1000 * 60 * 5; // រក្សាទុកទិន្នន័យ 5 នាទី
const ENABLE_CACHING = true; // បើកការចងចាំទិន្នន័យ

// State for Modals
let notReturnedType = "info";
let summaryType = "leave";

// ==========================================
// 2. DOM ELEMENTS
// ==========================================
const apiKeySection = document.getElementById("apiKeySection");
const apiKeyInput = document.getElementById("apiKeyInput");
const saveApiKeyButton = document.getElementById("saveApiKeyButton");
const mainContent = document.getElementById("mainContent");
const loader = document.getElementById("loader");
const errorMessage = document.getElementById("errorMessage");
const errorText = document.getElementById("errorText");
const dataContainer = document.getElementById("data-container");
const searchInput = document.getElementById("searchInput");
const summaryText = document.getElementById("summaryText");
const activeFilterBadge = document.getElementById("activeFilterBadge");
const filterBadgeText = document.getElementById("filterBadgeText");
const resetFilterButton = document.getElementById("resetFilterButton");
const dataView = document.getElementById("data-view");
const settingsPage = document.getElementById("settings-page");
const tabInfo = document.getElementById("tab-info");
const tabLeave = document.getElementById("tab-leave");
const tabHome = document.getElementById("tab-home");
const tabCombined = document.getElementById("tab-combined");
const tabSettings = document.getElementById("tab-settings");
const navBtnInfo = document.getElementById("nav-btn-info");
const navBtnLeave = document.getElementById("nav-btn-leave");
const navBtnHome = document.getElementById("nav-btn-home");
const navBtnCombined = document.getElementById("nav-btn-combined");
const navBtnSettings = document.getElementById("nav-btn-settings");
const monthFilter = document.getElementById("monthFilter");
const yearFilter = document.getElementById("yearFilter");
const startDateFilter = document.getElementById("startDateFilter");
const endDateFilter = document.getElementById("endDateFilter");
const applyFilterButton = document.getElementById("applyFilterButton");
const modalContainer = document.getElementById("modal-container");
const modalContent = document.getElementById("modal-content");

// UPDATED: Refresh button is now the one inside search bar
const refreshButton = document.getElementById("searchRefreshBtn");

const summaryButton = document.getElementById("summaryButton");
const notReturnedButton = document.getElementById("notReturnedButton");
const notReturnedBadge = document.getElementById("notReturnedBadge");
const todayButton = document.getElementById("todayButton");
const changeApiKeyButton = document.getElementById("changeApiKeyButton");

// ==========================================
// 3. HELPER FUNCTIONS
// ==========================================

function hideModal() {
  modalContainer.classList.add("hidden");
  modalContainer.classList.remove("flex");
}
window.hideModal = hideModal;

function hideError() {
  errorMessage.classList.add("hidden");
}

function showError(message) {
  let displayMessage = message;
  let showChangeKeyButton = false;
  if (message.includes("API key not valid")) {
    displayMessage =
      "API Key មិនត្រឹមត្រូវទេ។ សូមពិនិត្យ API Key របស់អ្នក រួចព្យាយាមម្តងទៀត។";
    showChangeKeyButton = true;
  } else if (message.includes("not found")) {
    displayMessage =
      "រកមិនឃើញ Sheet ដែលបានកំណត់ទេ។ សូមពិនិត្យឈ្មោះ Sheet ឡើងវិញ។";
  }
  errorText.textContent = displayMessage;
  errorMessage.classList.remove("hidden");
  loader.classList.add("hidden");
  changeApiKeyButton.classList.toggle("hidden", !showChangeKeyButton);

  // បើមាន Error ត្រូវបិទ Splash Screen ដើម្បីឱ្យឃើញសារ Error
  const splashScreen = document.getElementById("app-splash-screen");
  if (splashScreen) splashScreen.classList.add("hidden");
}

const KHMER_MONTHS = [
  "មករា",
  "កុម្ភៈ",
  "មីនា",
  "មេសា",
  "ឧសភា",
  "មិថុនា",
  "កក្កដា",
  "សីហា",
  "កញ្ញា",
  "តុលា",
  "វិច្ឆិកា",
  "ធ្នូ",
];

function formatDateToKhmer(dateStr) {
  if (!dateStr) return "N/A";
  let dateObj = new Date(dateStr);
  if (isNaN(dateObj.getTime())) {
    const englishDateStr = toEnglishNumber(dateStr);
    dateObj = new Date(englishDateStr);
    if (isNaN(dateObj.getTime())) {
      const parts = englishDateStr.split(/[-/]/);
      if (parts.length === 3) {
        dateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    }
  }
  if (isNaN(dateObj.getTime())) return dateStr;
  const day = toKhmerNumber(dateObj.getDate().toString().padStart(2, "0"));
  const month = KHMER_MONTHS[dateObj.getMonth()];
  const year = toKhmerNumber(dateObj.getFullYear());
  return `${day}-${month}-${year}`;
}

function setTheme(themeName) {
  const theme = themes[themeName] || themes.blue;
  const root = document.documentElement;
  Object.keys(theme).forEach((key) => {
    if (key !== "color")
      root.style.setProperty(`--color-primary-${key}`, theme[key]);
  });
  localStorage.setItem("appTheme", themeName);
  renderThemeSelector(themeName);
}

function renderThemeSelector(activeTheme) {
  const container = document.getElementById("theme-selector");
  if (!container) return;
  container.innerHTML = Object.keys(themes)
    .map(
      (name) => `
      <button onclick="setTheme('${name}')" class="theme-btn w-12 h-12 rounded-full shadow-sm hover:scale-110 transition-all duration-200 ${
        activeTheme === name
          ? "active ring-2 ring-offset-2 ring-primary-600"
          : ""
      }" style="background-color: ${themes[name].color};"></button>
  `
    )
    .join("");
}

function loadExportLibraries() {
  if (!document.querySelector('script[src*="xlsx.full.min.js"]')) {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    document.head.appendChild(script);
  }
}

function getExportData() {
  const exportType = document.getElementById("exportTypeSelector")
    ? document.getElementById("exportTypeSelector").value
    : "all";
  const startStr = startDateFilter.value;
  const endStr = endDateFilter.value;

  let start = null,
    end = null;
  if (startStr) {
    start = new Date(startStr);
    start.setHours(0, 0, 0, 0);
  }
  if (endStr) {
    end = new Date(endStr);
    end.setHours(23, 59, 59, 999);
  }

  let data = allData.combined.filter((item) => {
    const itemDateStr = item.dateOut || item.date;
    if (!itemDateStr) return false;
    const itemDate = parseDateForSort(itemDateStr);
    itemDate.setHours(12, 0, 0, 0);

    let dateMatch = true;
    if (start && end) {
      dateMatch = itemDate >= start && itemDate <= end;
    } else {
      dateMatch =
        itemDate.getFullYear() == yearFilter.value &&
        itemDate.getMonth() + 1 == monthFilter.value;
    }

    let typeMatch = true;
    if (exportType !== "all") {
      typeMatch = item.type === exportType;
    }

    const isNumericId = /^\d+$/.test(item.id.trim());
    if ((item.type === "leave" || item.type === "home") && !isNumericId) {
      return false;
    }

    return dateMatch && typeMatch;
  });

  data.sort((a, b) => {
    const nameA = a.name || "";
    const nameB = b.name || "";
    const nameCompare = nameA.localeCompare(nameB, "km");
    if (nameCompare !== 0) return nameCompare;
    return b.sortDate - a.sortDate;
  });

  return data;
}

function exportData(type) {
  const data = getExportData();
  if (data.length === 0) {
    alert("គ្មានទិន្នន័យសម្រាប់ទាញយកទេ សូមពិនិត្យមើលការកំណត់ថ្ងៃខែឡើងវិញ");
    return;
  }

  if (type === "excel") {
    if (typeof XLSX === "undefined") {
      alert("កំពុងដំណើរការកម្មវិធី... សូមរង់ចាំបន្តិចរួចសាកល្បងម្តងទៀត។");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(
      data.map((item) => ({
        អត្តលេខ: item.id,
        ឈ្មោះ: item.name,
        ប្រភេទ:
          item.type === "info"
            ? "ចេញក្រៅ"
            : item.type === "leave"
            ? "ឈប់សម្រាក"
            : "ទៅផ្ទះ",
        កាលបរិច្ឆេទ: formatDateToKhmer(item.date || item.dateOut),
        រយៈពេល: toKhmerNumber(item.duration) || "-",
        មូលហេតុ: item.reason || "-",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `Report_${new Date().toISOString().split("T")[0]}.xlsx`);
  } else if (type === "pdf") {
    const printWindow = window.open("", "", "height=800,width=1200");
    if (!printWindow) {
      alert("សូមអនុញ្ញាត Pop-ups ដើម្បីទាញយក PDF");
      return;
    }

    let tableRows = "";
    let currentName = "";

    data.forEach((item, index) => {
      const typeKhmer =
        item.type === "info"
          ? "ចេញក្រៅ"
          : item.type === "leave"
          ? "ឈប់សម្រាក"
          : "ទៅផ្ទះ";
      let typeClass = item.type;
      let rowStyle = "";
      if (currentName !== "" && currentName !== item.name) {
        rowStyle = "border-top: 2px solid #cbd5e1;";
      }
      currentName = item.name;

      tableRows += `
                <tr style="${rowStyle}">
                    <td>${toKhmerNumber(index + 1)}</td>
                    <td>${toKhmerNumber(item.id)}</td>
                    <td style="font-weight:bold; color:#1e293b;">${
                      item.name
                    }</td>
                    <td><span class="badge ${typeClass}">${typeKhmer}</span></td>
                    <td>${formatDateToKhmer(item.date || item.dateOut)}</td>
                    <td>${toKhmerNumber(item.duration) || "-"}</td>
                    <td>${item.reason || "-"}</td>
                </tr>
            `;
    });

    const htmlContent = `
            <!DOCTYPE html>
            <html lang="km">
            <head>
                <title>របាយការណ៍ - Digital Industry</title>
                <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;500;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Kantumruy Pro', sans-serif; padding: 20px; }
                    h1 { text-align: center; color: #1e3a8a; margin-bottom: 5px; }
                    .subtitle { text-align: center; font-size: 14px; color: #64748b; margin-bottom: 20px; }
                    .date-info { text-align: right; font-size: 12px; color: #64748b; margin-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; width: 100%; font-size: 12px; }
                    th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; vertical-align: middle; }
                    th { background-color: #f1f1f9; color: #334155; font-weight: bold; border-bottom: 2px solid #cbd5e1; }
                    tr:nth-child(even) { background-color: #f8fafc; }
                    .badge { padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; color: white; display: inline-block; min-width: 60px; text-align: center; }
                    .badge.info { background-color: #3b82f6; } 
                    .badge.leave { background-color: #22c55e; } 
                    .badge.home { background-color: #a855f7; } 
                </style>
            </head>
            <body>
                <h1>របាយការណ៍បុគ្គលិក (Digital Industry)</h1>
                <div class="subtitle">ទិន្នន័យច្បាប់ និងវត្តមាន</div>
                <div class="date-info">កាលបរិច្ឆេទបង្កើត: ${formatDateToKhmer(
                  new Date()
                )}</div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 40px;">ល.រ</th>
                            <th>អត្តលេខ</th>
                            <th>ឈ្មោះ</th>
                            <th>ប្រភេទ</th>
                            <th>កាលបរិច្ឆេទ</th>
                            <th>រយៈពេល</th>
                            <th>មូលហេតុ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}
window.exportData = exportData;

// ==========================================
// 4. MAIN APP LOGIC (OPTIMIZED)
// ==========================================

async function fetchSheetData(
  spreadsheetId,
  range,
  valueRenderOption = "FORMATTED_VALUE",
  forceRefresh = false
) {
  if (!GOOGLE_API_KEY) {
    showError("សូមបញ្ចូល API Key ជាមុនសិន។");
    return null;
  }

  // --- CACHING LOGIC ---
  const cacheKey = `sheet_data_${spreadsheetId}_${range}`;
  if (ENABLE_CACHING && !forceRefresh) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { timestamp, data } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          console.log(`Loaded from cache: ${range}`);
          return data;
        }
      } catch (e) {
        console.warn("Cache parsing error, fetching fresh data.");
      }
    }
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueRenderOption=${valueRenderOption}&key=${GOOGLE_API_KEY}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(response.statusText);
    const data = await response.json();

    // Save to Cache
    if (ENABLE_CACHING && data.values) {
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          timestamp: Date.now(),
          data: data.values,
        })
      );
    }

    return data.values || [];
  } catch (error) {
    console.error("Fetch error:", error);
    showError(`មិនអាចទាញទិន្នន័យបានទេ: ${error.message}`);
    return null;
  }
}

function checkApiKey() {
  populateDateFilters();
  const savedKey = localStorage.getItem("googleApiKey");
  if (savedKey) GOOGLE_API_KEY = savedKey;

  if (GOOGLE_API_KEY) {
    apiKeySection.classList.add("hidden");
    mainContent.classList.remove("hidden");
    init();
  } else {
    // បិទ Splash Screen ភ្លាមៗបើមិនទាន់មាន API Key
    const splashScreen = document.getElementById("app-splash-screen");
    if (splashScreen) splashScreen.classList.add("hidden");

    apiKeySection.classList.remove("hidden");
    mainContent.classList.add("hidden");
  }
}

async function init(forceRefresh = false) {
  const splashScreen = document.getElementById("app-splash-screen");
  // Only show splash screen on initial load
  if (splashScreen && !forceRefresh) splashScreen.classList.remove("hidden");

  loader.classList.add("hidden");
  hideError();
  loadExportLibraries();
  updateSettingsIcon();

  if (forceRefresh) {
    dataContainer.innerHTML = ""; // Clear only on forced refresh
  }

  try {
    const [infoRows, leaveRows, homeRows, profileRows] = await Promise.all([
      fetchSheetData(
        MAIN_SHEET_ID,
        RANGES.info,
        "FORMATTED_VALUE",
        forceRefresh
      ),
      fetchSheetData(
        MAIN_SHEET_ID,
        RANGES.leave,
        "FORMATTED_VALUE",
        forceRefresh
      ),
      fetchSheetData(
        HOME_SHEET_ID,
        RANGES.home,
        "FORMATTED_VALUE",
        forceRefresh
      ),
      fetchSheetData(
        PROFILE_SHEET_ID,
        RANGES.profiles,
        "FORMULA",
        forceRefresh
      ),
    ]);

    if (profileRows) profileData = parseProfileData(profileRows);
    if (infoRows) allData.info = parseInfoData(infoRows);
    if (leaveRows) allData.leave = parseLeaveData(leaveRows);
    if (homeRows) allData.home = parseHomeData(homeRows);

    combineAndSortData();

    const savedTheme = localStorage.getItem("appTheme");
    if (savedTheme) setTheme(savedTheme);
    else renderThemeSelector("blue");

    if (currentTab === "settings") render();
    else switchTab(currentTab);

    // Close Splash Screen with Animation
    if (splashScreen) {
      splashScreen.style.opacity = "0";
      splashScreen.style.pointerEvents = "none";
      setTimeout(() => {
        splashScreen.classList.add("hidden");
      }, 700);
    }
  } catch (error) {
    console.error("Error during init:", error);
    showError("មានបញ្ហាក្នុងការទាញទិន្នន័យ សូមព្យាយាមម្តងទៀត។");
    if (splashScreen) splashScreen.classList.add("hidden");
  }
}

function combineAndSortData() {
  const combined = [...allData.info, ...allData.leave, ...allData.home];
  allData.combined = combined.sort((a, b) => b.sortDate - a.sortDate);
  checkNotReturnedStatus();
}

function checkNotReturnedStatus() {
  const now = new Date();
  const notReturnedInfo = allData.info.filter((item) => {
    if (item.timeIn && item.timeIn.trim() !== "") return false;
    const itemDate = parseDateForSort(item.dateOut);
    return (
      itemDate.getFullYear() == now.getFullYear() &&
      itemDate.getMonth() + 1 == now.getMonth() + 1
    );
  });
  const notReturnedHome = allData.home.filter((item) => {
    if (item.timeIn && item.timeIn.trim() !== "") return false;
    const itemDate = parseDateForSort(item.dateOut);
    return (
      itemDate.getFullYear() == now.getFullYear() &&
      itemDate.getMonth() + 1 == now.getMonth() + 1
    );
  });
  const hasNotReturned =
    notReturnedInfo.length > 0 || notReturnedHome.length > 0;
  notReturnedBadge.classList.toggle("hidden", !hasNotReturned);
}

function getFilteredData() {
  let sourceTab = currentTab;
  if (sourceTab === "settings") sourceTab = "combined";

  const dataToFilter = allData[sourceTab] || [];
  const searchTerm = searchInput.value.toLowerCase();
  const selectedYear = yearFilter.value;
  const selectedMonth = monthFilter.value;
  const start = startDateFilter.value ? new Date(startDateFilter.value) : null;
  const end = endDateFilter.value ? new Date(endDateFilter.value) : null;
  if (start) start.setHours(0, 0, 0, 0);
  if (end) end.setHours(23, 59, 59, 999);

  return dataToFilter.filter((item) => {
    const searchMatch =
      item.id.toLowerCase().includes(searchTerm) ||
      item.name.toLowerCase().includes(searchTerm);
    const itemDateStr = item.dateOut || item.date;
    if (!itemDateStr) return false;
    const itemDate = parseDateForSort(itemDateStr);
    itemDate.setHours(12, 0, 0, 0);

    let dateMatch = true;
    if (filterDate) {
      const filterD = new Date(filterDate);
      filterD.setHours(12, 0, 0, 0);
      dateMatch = itemDate.getTime() === filterD.getTime();
    } else if (start && end) {
      dateMatch = itemDate >= start && itemDate <= end;
    } else {
      dateMatch =
        itemDate.getFullYear() == selectedYear &&
        itemDate.getMonth() + 1 == selectedMonth;
    }

    const isNumericId = /^\d+$/.test(item.id.trim());
    if ((item.type === "leave" || item.type === "home") && !isNumericId) {
      return false;
    }

    return searchMatch && dateMatch;
  });
}

function resetFilters() {
  const now = new Date();
  filterDate = null;
  searchInput.value = "";
  startDateFilter.value = "";
  endDateFilter.value = "";
  yearFilter.value = now.getFullYear();
  monthFilter.value = now.getMonth() + 1;
  currentPage = 1;
  render();
}

// ==========================================
// 5. RENDERING FUNCTIONS
// ==========================================

function updateSettingsIcon() {
  const desktopIcon = tabSettings.querySelector("svg");
  if (desktopIcon) {
    const img = document.createElement("img");
    img.src = "https://cdn-icons-png.flaticon.com/512/2040/2040504.png";
    img.className = "w-4 h-4";
    desktopIcon.replaceWith(img);
  }
  const mobileIcon = navBtnSettings.querySelector("svg");
  if (mobileIcon) {
    const img = document.createElement("img");
    img.src = "https://cdn-icons-png.flaticon.com/512/2040/2040504.png";
    img.className = "w-6 h-6 mb-1";
    mobileIcon.replaceWith(img);
  }
}

function renderSettingsPage() {
  const settingsContainer = settingsPage.querySelector(".space-y-5.flex-grow");
  if (settingsContainer && !document.getElementById("export-section")) {
    const exportHTML = `<div id="export-section" class="border-t border-dashed border-slate-200 pt-4 mt-2"><label class="block text-xs font-bold text-slate-400 uppercase mb-3 ml-1">ទាញយករបាយការណ៍</label><div class="mb-3"><select id="exportTypeSelector" class="block w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"><option value="all">បង្ហាញទាំងអស់ (All)</option><option value="info">ច្បាប់ចេញក្រៅ (Out)</option><option value="leave">ច្បាប់ឈប់សម្រាក (Leave)</option><option value="home">ច្បាប់ទៅផ្ទះ (Home)</option></select></div><div class="grid grid-cols-2 gap-3"><button onclick="exportData('excel')" class="flex items-center justify-center gap-2 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 font-medium py-2.5 px-4 rounded-xl transition">Excel</button><button onclick="exportData('pdf')" class="flex items-center justify-center gap-2 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 font-medium py-2.5 px-4 rounded-xl transition">PDF (បោះពុម្ព)</button></div></div>`;
    settingsContainer.insertAdjacentHTML("beforeend", exportHTML);
  }

  const settingsNotReturnedBtn = document.getElementById("notReturnedButton");
  if (settingsNotReturnedBtn)
    settingsNotReturnedBtn.onclick = () => {
      switchNotReturnedTab("info");
    };
  const settingsSummaryBtn = document.getElementById("summaryButton");
  if (settingsSummaryBtn)
    settingsSummaryBtn.onclick = () => showSummaryModal(null);
}

function render() {
  hideError();
  if (currentTab === "settings") {
    dataView.classList.add("hidden");
    settingsPage.classList.remove("hidden");
    renderSettingsPage();
  } else {
    settingsPage.classList.add("hidden");
    dataView.classList.remove("hidden");
    dataContainer.innerHTML = "";
    const filteredData = getFilteredData();
    const isFiltering =
      searchInput.value !== "" ||
      filterDate !== null ||
      (startDateFilter.value !== "" && endDateFilter.value !== "");
    activeFilterBadge.classList.toggle("hidden", !isFiltering);

    if (filterDate) filterBadgeText.textContent = "តម្រង: ថ្ងៃនេះ";
    else if (startDateFilter.value && endDateFilter.value)
      filterBadgeText.textContent = "តម្រង: ចន្លោះថ្ងៃ";
    else filterBadgeText.textContent = "កំពុងប្រើតម្រង";

    if (currentTab === "combined") renderCombinedView(filteredData);
    else renderStandardView(filteredData);
  }
  updateMobileNavState(currentTab);
  updateDesktopTabsState(currentTab);
}

function renderStandardView(filteredData) {
  const startIndex = (currentPage - 1) * cardsPerPage;
  const endIndex = startIndex + cardsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);
  
  // លុបអក្សរ Summary ចោលសម្រាប់ Page ធម្មតា
  summaryText.textContent = "";

  // ពិនិត្យមើលទំហំអេក្រង់
  const isDesktop = window.innerWidth >= 1024;

  if (filteredData.length === 0) {
    dataContainer.innerHTML = `<div class="col-span-full text-center p-10 bg-white rounded-2xl shadow-sm border border-dashed border-slate-200"><p class="text-slate-500 font-medium">រកមិនឃើញទិន្នន័យទេ។</p></div>`;
  } else {
    paginatedData.forEach((item, index) => {
      const profile = profileData[item.id.trim()] || {
        photo: "",
        department: "",
      };
      const placeholderImg = `https://placehold.co/80x80/e2e8f0/64748b?text=${(
        item.name || "?"
      ).charAt(0)}`;
      const card = document.createElement("div");

      // កំណត់ variables រួម
      const isInfo = item.type === "info";
      const borderColor = isInfo ? "border-blue-100" : "border-green-100";
      const nameColor = isInfo ? "text-blue-700" : "text-green-700";
      const badgeBg = isInfo
        ? "bg-blue-50 text-blue-700 border-blue-100"
        : "bg-green-50 text-green-700 border-green-100";
      const imageBorder = isInfo ? "border-blue-200" : "border-green-200";
      
      const startDate = item.type === "home" ? item.dateOut : item.date;
      const endDate = item.type === "home" ? item.dateIn : item.dateEnd;
      const singleDayKeywords = ["មួយព្រឹក", "មួយរសៀល", "ពេលយប់", "មួយថ្ងៃ"];
      const isSingleDay = !item.duration || singleDayKeywords.some((k) => (item.duration || "").includes(k));
      
      let dateDisplay = "";
      if(isSingleDay || !endDate) {
          dateDisplay = `<span>កាលបរិច្ឆេទ: ${formatDateToKhmer(startDate)}</span>`;
      } else {
          dateDisplay = `<span>${formatDateToKhmer(startDate)} - ${formatDateToKhmer(endDate)}</span>`;
      }

      let durationDisplay = toKhmerNumber(item.duration);
      if (item.type === "home" && item.duration) {
        durationDisplay += " ថ្ងៃ";
      }

      let contentHTML = "";

      // --- DESKTOP LAYOUT (Compact) ---
      if (isDesktop) {
        // ចំណាំ៖ ខ្ញុំបានដក 'cursor-pointer' ចេញ ដើម្បីកុំឱ្យគេច្រឡំថាចុចបាន
        card.className = `card bg-white p-3 rounded-xl shadow-sm border ${borderColor} flex flex-col gap-3 hover:shadow-md transition-all duration-200 h-full relative overflow-hidden group`;
        
        contentHTML = `
            <div class="flex items-start gap-3 relative">
                <div class="flex-shrink-0">
                    <img src="${profile.photo || placeholderImg}" onerror="this.onerror=null;this.src='${placeholderImg}';" class="w-10 h-10 rounded-full object-cover border ${imageBorder} shadow-sm">
                </div>
                <div class="flex-grow min-w-0 pt-0.5">
                    <div class="flex justify-between items-start">
                         <div class="min-w-0 pr-1">
                            <h3 class="font-bold text-sm ${nameColor} truncate leading-tight mb-0.5" title="${item.name}">${item.name || "គ្មានឈ្មោះ"}</h3>
                            <p class="text-[10px] text-slate-400 font-mono">${toKhmerNumber(item.id)}</p>
                         </div>
                         <span class="text-[9px] font-bold ${badgeBg} px-1.5 py-0.5 rounded border flex-shrink-0 whitespace-nowrap">${durationDisplay}</span>
                    </div>
                    <p class="text-[10px] text-slate-500 truncate mt-1 font-medium">${profile.department || item.class || "គ្មានផ្នែក"}</p>
                </div>
            </div>
            <div class="border-t border-dashed border-slate-100 w-full"></div>
            <div class="space-y-1.5">
                <p class="text-[11px] text-slate-600 truncate"><span class="text-slate-400 text-[10px]">មូលហេតុ:</span> ${item.reason || "N/A"}</p>
                 <div class="flex justify-between items-center text-[10px] text-slate-500 font-medium bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                    ${isInfo ? `<span class="truncate">ចេញ: ${formatDateToKhmer(item.dateOut)}</span><span class="text-blue-600 font-bold bg-white px-1 rounded shadow-sm border border-slate-100">${toKhmerNumber(item.timeOut)}</span>` : dateDisplay}
                </div>
            </div>
        `;
      } 
      // --- MOBILE/TABLET LAYOUT (Standard) ---
      else {
        // ចំណាំ៖ ខ្ញុំបានដក 'cursor-pointer' ចេញ
        card.className = `card bg-white p-4 rounded-2xl shadow-sm border ${borderColor} flex flex-row gap-4 hover:shadow-md transition-all duration-200 h-full items-start`;
        
        contentHTML = `
            <div class="flex-shrink-0">
                <img src="${profile.photo || placeholderImg}" onerror="this.onerror=null;this.src='${placeholderImg}';" class="w-14 h-14 rounded-full object-cover border-2 ${imageBorder} shadow-sm">
            </div>
            <div class="flex-grow min-w-0">
                <div class="flex justify-between items-start mb-1">
                    <div>
                        <h3 class="font-bold text-base ${nameColor} truncate leading-tight">${item.name || "គ្មានឈ្មោះ"}</h3>
                        <p class="text-xs text-slate-400 font-mono mt-0.5">${toKhmerNumber(item.id)}</p>
                    </div>
                    <span class="text-[10px] font-bold ${badgeBg} px-2.5 py-1 rounded-lg flex-shrink-0 whitespace-nowrap border border-opacity-20 border-current">${durationDisplay}</span>
                </div>
                <p class="text-xs text-slate-500 mb-2 truncate font-medium">${profile.department || item.class || "គ្មានផ្នែក"}</p>
                <div class="text-xs text-slate-600 border-t border-dashed border-slate-200 pt-2 mt-2">
                    <p class="mb-1 truncate"><span class="text-slate-400">មូលហេតុ:</span> ${item.reason || "N/A"}</p>
                    <div class="flex justify-between text-xs text-slate-500 font-medium">
                        ${isInfo ? `<span>ចេញ: ${formatDateToKhmer(item.dateOut)} <span class="text-blue-600">${toKhmerNumber(item.timeOut)}</span></span>` : dateDisplay}
                    </div>
                </div>
            </div>
        `;
      }

      card.style.animationDelay = `${index * 0.02}s`;
      card.innerHTML = contentHTML;
      
      // +++ កែប្រែសំខាន់នៅត្រង់នេះ +++
      // ខ្ញុំបានលុបបន្ទាត់ card.onclick ចោល
      // card.onclick = () => showModal(item, profile); 
      // +++++++++++++++++++++++++++++

      dataContainer.appendChild(card);
    });
  }
  renderPagination(filteredData.length);
}

function renderCombinedView(filteredData) {
  const employeeSummary = filteredData.reduce((acc, item) => {
    if (!acc[item.id]) {
      acc[item.id] = {
        id: item.id,
        name: item.name,
        profile: profileData[item.id.trim()] || { photo: "", department: "" },
        infoCount: 0,
        leaveCount: 0,
        homeCount: 0,
      };
    }
    if (item.type === "info") acc[item.id].infoCount++;
    else if (item.type === "leave") acc[item.id].leaveCount++;
    else if (item.type === "home") acc[item.id].homeCount++;
    return acc;
  }, {});
  const summaryArray = Object.values(employeeSummary);
  summaryText.textContent = `បង្ហាញ ${toKhmerNumber(summaryArray.length)} នាក់`;
  const startIndex = (currentPage - 1) * cardsPerPage;
  const endIndex = startIndex + cardsPerPage;
  const paginatedData = summaryArray.slice(startIndex, endIndex);

  if (summaryArray.length === 0) {
    dataContainer.innerHTML = `<div class="col-span-full text-center p-10 bg-white rounded-2xl shadow-sm border border-dashed border-slate-200"><p class="text-slate-500 font-medium">រកមិនឃើញទិន្នន័យសម្រាប់ខែនេះទេ។</p></div>`;
  } else {
    paginatedData.forEach((summary, index) => {
      const placeholderImg = `https://placehold.co/80x80/e2e8f0/64748b?text=${(
        summary.name || "?"
      ).charAt(0)}`;
      const card = document.createElement("div");
      card.className =
        "card bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1";
      card.style.animationDelay = `${index * 0.03}s`;
      const originalItem = filteredData.find((i) => i.id === summary.id);
      card.onclick = () => showModal(originalItem, summary.profile);
      const isNumericId = /^\d+$/.test(summary.id.trim());

      // Icons
      const iconLeave = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>`;
      const iconOut = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>`;
      const iconHome = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>`;

      // Build Stats HTML (Leave -> Out -> Home)
      let statsHTML = `<div class="flex items-center gap-3">`;
      if (isNumericId)
        statsHTML += `<div class="flex items-center gap-1 text-green-600" title="ឈប់សម្រាក">${iconLeave} <span class="font-bold text-xs">${toKhmerNumber(
          summary.leaveCount
        )}</span></div>`;
      statsHTML += `<div class="flex items-center gap-1 text-blue-600" title="ចេញក្រៅ">${iconOut} <span class="font-bold text-xs">${toKhmerNumber(
        summary.infoCount
      )}</span></div>`;
      if (isNumericId)
        statsHTML += `<div class="flex items-center gap-1 text-purple-600" title="ទៅផ្ទះ">${iconHome} <span class="font-bold text-xs">${toKhmerNumber(
          summary.homeCount
        )}</span></div>`;
      statsHTML += `</div>`;

      card.innerHTML = `
            <img src="${
              summary.profile.photo || placeholderImg
            }" onerror="this.onerror=null;this.src='${placeholderImg}';" class="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-sm flex-shrink-0">
            <div class="flex-grow min-w-0">
                <div class="flex justify-between items-center mb-0.5">
                    <h3 class="font-bold text-sm text-slate-800 truncate pr-2">${
                      summary.name || "គ្មានឈ្មោះ"
                    }</h3>
                    ${statsHTML}
                </div>
                <div class="flex justify-between items-center text-xs text-slate-500">
                    <span class="truncate font-medium max-w-[60%]">${
                      summary.profile.department || "គ្មានផ្នែក"
                    }</span>
                    <span class="font-mono bg-slate-50 px-1.5 rounded text-[10px] border border-slate-100">${toKhmerNumber(
                      summary.id
                    )}</span>
                </div>
            </div>
        `;
      dataContainer.appendChild(card);
    });
  }
  renderPagination(summaryArray.length);
}

function renderPagination(totalItems) {
  const paginationContainer = document.getElementById("pagination-container");
  paginationContainer.innerHTML = "";
  const totalPages = Math.ceil(totalItems / cardsPerPage);
  if (totalPages <= 1) return;
  let paginationHTML = `<button class="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm text-slate-500 hover:bg-slate-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition" onclick="changePage(${
    currentPage - 1
  })" ${
    currentPage === 1 ? "disabled" : ""
  }><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/></svg></button>`;
  paginationHTML += `<span class="mx-4 text-sm font-bold text-slate-600">ទំព័រ ${toKhmerNumber(
    currentPage
  )} / ${toKhmerNumber(totalPages)}</span>`;
  paginationHTML += `<button class="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm text-slate-500 hover:bg-slate-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition" onclick="changePage(${
    currentPage + 1
  })" ${
    currentPage === totalPages ? "disabled" : ""
  }><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/></svg></button>`;
  paginationContainer.innerHTML = `<div class="flex items-center select-none">${paginationHTML}</div>`;
}

// ==========================================
// 6. MODALS (SHOW MODAL INCLUDED HERE)
// ==========================================

function showModal(item, profile) {
  const personId = item.id;
  const selectedYear = yearFilter.value;
  const selectedMonth = monthFilter.value;
  const start = startDateFilter.value ? new Date(startDateFilter.value) : null;
  const end = endDateFilter.value ? new Date(endDateFilter.value) : null;
  if (start) start.setHours(0, 0, 0, 0);
  if (end) end.setHours(23, 59, 59, 999);

  const allRecords = allData.combined.filter((record) => {
    if (record.id !== personId) return false;
    const itemDateStr = record.dateOut || record.date;
    const itemDate = parseDateForSort(itemDateStr);
    itemDate.setHours(12, 0, 0, 0);
    if (start && end) return itemDate >= start && itemDate <= end;
    else if (filterDate) {
      const filterD = new Date(filterDate);
      filterD.setHours(12, 0, 0, 0);
      return itemDate.getTime() === filterD.getTime();
    } else
      return (
        itemDate.getFullYear() == selectedYear &&
        itemDate.getMonth() + 1 == selectedMonth
      );
  });

  const leaveRecords = allRecords.filter((r) => r.type === "leave");
  const infoRecords = allRecords.filter((r) => r.type === "info");
  const homeRecords = allData.home.filter(
    (r) =>
      r.id === personId &&
      (start && end
        ? parseDateForSort(r.dateOut) >= start &&
          parseDateForSort(r.dateOut) <= end
        : filterDate
        ? parseDateForSort(r.dateOut).getTime() ===
          new Date(filterDate).getTime()
        : parseDateForSort(r.dateOut).getFullYear() == selectedYear &&
          parseDateForSort(r.dateOut).getMonth() + 1 == selectedMonth)
  );

  let totalDays = 0;
  leaveRecords.forEach((record) => {
    const durationStr = record.duration || "";
    if (
      durationStr.includes("ព្រឹក") ||
      durationStr.includes("រសៀល") ||
      durationStr.includes("យប់")
    )
      totalDays += 0.5;
    else {
      const days = parseFloat(durationStr);
      totalDays += isNaN(days) ? 1 : days;
    }
  });

  const placeholderImg = `https://placehold.co/120x120/e2e8f0/64748b?text=${(
    item.name || "?"
  ).charAt(0)}`;
  const isNumericId = /^\d+$/.test(item.id.trim());
  const gridCols = isNumericId ? "grid-cols-3" : "grid-cols-1";

  let modalHTML = `
            <div class="relative"><div class="h-28 bg-gradient-to-r from-primary-600 to-primary-500 rounded-t-2xl"></div><button class="modal-close-btn absolute top-3 right-3 text-white/80 hover:text-white hover:bg-white/20 rounded-full p-1.5 transition">&times;</button><div class="absolute top-14 left-1/2 transform -translate-x-1/2"><img src="${
              profile.photo || placeholderImg
            }" onerror="this.onerror=null;this.src='${placeholderImg}';" class="w-24 h-24 rounded-full object-cover border-[4px] border-white shadow-lg bg-white"></div></div>
            <div class="pt-14 pb-6 px-6 text-center"><h2 class="text-xl font-bold text-slate-800 flex justify-center items-center gap-2">${
              item.name
            }${
    profile.telegram
      ? `<a href="${profile.telegram}" target="_blank" class="text-blue-500 hover:text-blue-600 transition-transform hover:scale-110"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.23-5.46 3.62-.51.35-.98.52-1.4.51-.46-.01-1.35-.26-2.01-.48-.81-.27-1.1-.42-1.06-.88.02-.24.36-.48.99-.74 3.88-1.69 6.48-2.81 7.77-3.34 3.68-1.54 4.45-1.8 4.95-1.81.11 0 .35.03.51.16.13.1.17.25.19.42-.01.05 0 .15 0 .17z"/></svg></a>`
      : ""
  }</h2><p class="text-slate-500 text-sm font-medium">${
    profile.department || item.class
  }</p><p class="text-slate-400 text-xs mt-0.5">ក្រុម: ${
    profile.group || "N/A"
  }</p><p class="text-xs text-slate-400 font-mono mt-0.5">ID: ${toKhmerNumber(
    item.id
  )}</p></div>
            <div class="px-6 mb-6"><div class="grid ${gridCols} gap-2 text-center">
                    ${
                      isNumericId
                        ? `<div class="bg-green-50 p-2 rounded-xl border border-green-100"><p class="font-bold text-lg text-green-600">${toKhmerNumber(
                            leaveRecords.length
                          )}</p><p class="text-[10px] font-bold text-green-800 uppercase tracking-wide mt-0.5">ឈប់សម្រាក</p><span class="text-[9px] bg-white text-green-700 px-1.5 py-0.5 rounded-md mt-1 inline-block border border-green-100 font-semibold shadow-sm">${toKhmerNumber(
                            totalDays
                          )} ថ្ងៃ</span></div>`
                        : ""
                    }
                    <div class="bg-blue-50 p-2 rounded-xl border border-blue-100 flex flex-col justify-center"><p class="font-bold text-lg text-blue-600">${toKhmerNumber(
                      infoRecords.length
                    )}</p><p class="text-[10px] font-bold text-blue-800 uppercase tracking-wide mt-0.5">ចេញក្រៅ</p></div>
                    ${
                      isNumericId
                        ? `<div class="bg-purple-50 p-2 rounded-xl border border-purple-100 flex flex-col justify-center"><p class="font-bold text-lg text-purple-600">${toKhmerNumber(
                            homeRecords.length
                          )}</p><p class="text-[10px] font-bold text-purple-800 uppercase tracking-wide mt-0.5">ទៅផ្ទះ</p></div>`
                        : ""
                    }
                </div></div><div class="px-6 pb-6 max-h-[40vh] overflow-y-auto space-y-4">`;

  if (leaveRecords.length > 0 && isNumericId) {
    modalHTML += `<div><h3 class="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2 uppercase tracking-wide"><span class="w-1.5 h-4 bg-green-500 rounded-full"></span>ប្រវត្តិការឈប់សម្រាក</h3><div class="space-y-2.5">`;
    leaveRecords.forEach((record) => {
      modalHTML += `<div class="bg-slate-50 p-3 rounded-xl text-sm border border-slate-100"><p class="font-semibold text-slate-800 flex justify-between">${formatDateToKhmer(
        record.date
      )} <span class="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">${toKhmerNumber(
        record.duration
      )}</span></p><div class="flex justify-between items-center mt-1.5 pt-1.5 border-t border-slate-200/60"><p class="text-xs text-slate-500 truncate flex-grow"><span class="font-bold text-slate-600 mr-1">មូលហេតុ:</span> ${
        record.reason || "N/A"
      }</p></div></div>`;
    });
    modalHTML += `</div></div>`;
  }

  if (infoRecords.length > 0) {
    modalHTML += `<div><h3 class="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2 uppercase tracking-wide"><span class="w-1.5 h-4 bg-blue-500 rounded-full"></span>ប្រវត្តិការចេញក្រៅ</h3><div class="space-y-2.5">`;
    infoRecords.forEach((record) => {
      modalHTML += `<div class="bg-slate-50 p-3 rounded-xl text-sm border border-slate-100"><div class="flex justify-between items-start mb-2"><div><p class="font-semibold text-slate-800 text-base">${formatDateToKhmer(
        record.dateOut
      )}</p><div class="flex items-center gap-1.5 text-xs text-slate-600 mt-1"><span class="bg-white px-1.5 py-0.5 rounded border text-blue-600 font-medium">${toKhmerNumber(
        record.timeOut
      )}</span> &rarr; <span class="bg-white px-1.5 py-0.5 rounded border text-blue-600 font-medium">${toKhmerNumber(
        record.timeIn
      )}</span></div></div><div class="flex flex-col items-end"><span class="text-[10px] text-slate-400 mb-0.5">រយៈពេល</span><span class="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">${
        toKhmerNumber(record.duration) || "N/A"
      }</span></div></div><p class="text-xs text-slate-500 pt-1.5 border-t border-slate-200/60 truncate"><span class="font-bold text-slate-600 mr-1">មូលហេតុ:</span> ${
        record.reason || "N/A"
      }</p></div>`;
    });
    modalHTML += `</div></div>`;
  }

  if (homeRecords.length > 0 && isNumericId) {
    modalHTML += `<div><h3 class="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2 uppercase tracking-wide"><span class="w-1.5 h-4 bg-purple-500 rounded-full"></span>ប្រវត្តិការទៅផ្ទះ</h3><div class="space-y-2.5">`;
    homeRecords.forEach((record) => {
      const durationText = record.duration
        ? `${toKhmerNumber(record.duration)} ថ្ងៃ`
        : "N/A";
      modalHTML += `<div class="bg-slate-50 p-3 rounded-xl text-sm border border-slate-100"><div class="flex justify-between items-start mb-2"><div class="space-y-1.5"><div class="flex flex-wrap items-center gap-2"><span class="text-slate-500 text-xs min-w-[25px]">ចេញ:</span><span class="font-semibold text-slate-800">${formatDateToKhmer(
        record.dateOut
      )}</span><span class="bg-white px-1.5 py-0.5 rounded border border-purple-200 text-purple-600 font-bold text-xs shadow-sm">${toKhmerNumber(
        record.timeOut
      )}</span></div><div class="flex flex-wrap items-center gap-2"><span class="text-slate-500 text-xs min-w-[25px]">ចូល:</span><span class="font-semibold text-slate-800">${formatDateToKhmer(
        record.dateIn
      )}</span><span class="bg-white px-1.5 py-0.5 rounded border border-purple-200 text-purple-600 font-bold text-xs shadow-sm">${toKhmerNumber(
        record.timeIn
      )}</span></div></div><div class="flex flex-col items-end pl-2"><span class="text-[10px] text-slate-400 mb-0.5">រយៈពេល</span><span class="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded-lg whitespace-nowrap">${durationText}</span></div></div><p class="text-xs text-slate-500 pt-2 border-t border-slate-200/60 mt-2 truncate"><span class="font-bold text-slate-600 mr-1">មូលហេតុ:</span> ${
        record.reason || "N/A"
      }</p></div>`;
    });
    modalHTML += `</div></div>`;
  }

  if (
    (leaveRecords.length === 0 || !isNumericId) &&
    infoRecords.length === 0 &&
    (homeRecords.length === 0 || !isNumericId)
  ) {
    modalHTML += `<div class="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200"><p class="text-slate-400 text-sm">គ្មានកំណត់ត្រាលម្អិតសម្រាប់ខែនេះ</p></div>`;
  }
  modalHTML += `</div>`;
  modalContent.innerHTML = modalHTML;
  modalContainer.classList.remove("hidden");
  modalContainer.classList.add("flex");
}

function showSummaryModal(summaryArray) {
  // --- Updated Summary Logic with Tabs ---
  let summaryList = summaryArray || [];
  if (!summaryArray) {
    let data = [];
    // Filter data based on summaryType (leave or info)
    if (summaryType === "leave") {
      data = allData.leave.filter((item) => {
        const itemDate = parseDateForSort(item.date);
        return (
          itemDate.getFullYear() == yearFilter.value &&
          itemDate.getMonth() + 1 == monthFilter.value
        );
      });
    } else {
      data = allData.info.filter((item) => {
        const itemDate = parseDateForSort(item.dateOut);
        return (
          itemDate.getFullYear() == yearFilter.value &&
          itemDate.getMonth() + 1 == monthFilter.value
        );
      });
    }

    const summary = data.reduce((acc, item) => {
      if (!acc[item.id])
        acc[item.id] = { count: 0, days: 0, name: item.name, id: item.id };
      acc[item.id].count++;
      if (summaryType === "leave") {
        const durationStr = item.duration || "";
        if (
          durationStr.includes("ព្រឹក") ||
          durationStr.includes("រសៀល") ||
          durationStr.includes("យប់")
        )
          acc[item.id].days += 0.5;
        else {
          const days = parseFloat(durationStr);
          acc[item.id].days += isNaN(days) ? 1 : days;
        }
      }
      return acc;
    }, {});
    summaryList = Object.values(summary).sort((a, b) => b.count - a.count); // Sort by Count
  }

  // Tabs Style
  const tabClassActive =
    "bg-green-100 text-green-700 border-green-200 font-bold shadow-sm";
  const tabClassInactive =
    "bg-white text-slate-500 border-slate-200 hover:bg-slate-50";

  const leaveTabClass =
    summaryType === "leave" ? tabClassActive : tabClassInactive;
  const infoTabClass =
    summaryType === "info"
      ? tabClassActive.replace(/green/g, "blue")
      : tabClassInactive;

  let modalHTML = `
        <div class="bg-green-50 p-5 border-b border-green-100 rounded-t-2xl">
            <div class="flex justify-between items-center mb-4">
                <h2 class="font-bold text-lg text-green-800">សរុបរបាយការណ៍ប្រចាំខែ</h2>
                <button class="modal-close-btn text-green-400 hover:text-green-600 bg-white rounded-full p-1.5 transition shadow-sm">&times;</button>
            </div>
            <div class="flex gap-2 p-1 bg-white/50 rounded-xl border border-green-100">
                 <button onclick="switchSummaryTab('leave')" class="flex-1 py-2 px-2 rounded-lg border text-xs transition ${leaveTabClass}">ច្បាប់ឈប់សម្រាក</button>
                 <button onclick="switchSummaryTab('info')" class="flex-1 py-2 px-2 rounded-lg border text-xs transition ${infoTabClass}">ច្បាប់ចេញក្រៅ</button>
            </div>
        </div>
        <div class="p-0 max-h-[70vh] overflow-y-auto">
            <table class="w-full text-sm text-left text-slate-600">
                <thead class="text-xs text-slate-500 uppercase bg-green-50/50 sticky top-0 shadow-sm z-10">
                    <tr>
                        <th scope="col" class="px-5 py-3.5">បុគ្គលិក</th>
                        <th scope="col" class="px-5 py-3.5 text-center">ដង</th>
                        ${
                          summaryType === "leave"
                            ? `<th scope="col" class="px-5 py-3.5 text-center">ថ្ងៃ</th>`
                            : ""
                        }
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">`;

  if (summaryList.length === 0)
    modalHTML += `<tr><td colspan="3" class="text-center py-12 text-slate-400">គ្មានទិន្នន័យក្នុងខែនេះទេ។</td></tr>`;
  else {
    summaryList.forEach((emp) => {
      const profile = profileData[emp.id.trim()] || { photo: "" };
      const placeholderImg = `https://placehold.co/60x60/e2e8f0/64748b?text=${(
        emp.name || "?"
      ).charAt(0)}`;

      // Color logic for stats
      const countColor =
        summaryType === "leave" ? "text-slate-600" : "text-blue-600 font-bold";

      modalHTML += `
                <tr class="bg-white hover:bg-slate-50 transition-colors">
                    <td class="px-5 py-3 font-medium text-slate-900">
                        <div class="flex items-center gap-3">
                            <img src="${
                              profile.photo || placeholderImg
                            }" onerror="this.onerror=null;this.src='${placeholderImg}';" class="w-10 h-10 rounded-full object-cover border border-slate-100 shadow-sm">
                            <div class="flex flex-col">
                                <span class="text-sm font-bold text-slate-700">${
                                  emp.name
                                }</span>
                                <span class="text-[10px] text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded-md w-fit mt-0.5 border border-slate-100">${toKhmerNumber(
                                  emp.id
                                )}</span>
                            </div>
                        </div>
                    </td>
                    <td class="px-5 py-3 text-center font-medium ${countColor}">${toKhmerNumber(
        emp.count
      )}</td>
                    ${
                      summaryType === "leave"
                        ? `<td class="px-5 py-3 text-center font-bold text-green-600 bg-green-50/30">${toKhmerNumber(
                            emp.days
                          )}</td>`
                        : ""
                    }
                </tr>`;
    });
  }
  modalHTML += "</tbody></table></div>";
  modalContent.innerHTML = modalHTML;
  modalContainer.classList.remove("hidden");
  modalContainer.classList.add("flex");
}

function switchSummaryTab(type) {
  summaryType = type;
  showSummaryModal(null);
}
window.switchSummaryTab = switchSummaryTab;

function showNotReturnedModal() {
  const selectedYear = yearFilter.value;
  const selectedMonth = monthFilter.value;
  let notReturnedList = [];
  let notReturnedHomeList = [];

  // Get Data for both tabs to show counts
  const infoList = allData.info.filter((item) => {
    if (item.timeIn && item.timeIn.trim() !== "") return false;
    const itemDate = parseDateForSort(item.dateOut);
    return (
      itemDate.getFullYear() == selectedYear &&
      itemDate.getMonth() + 1 == selectedMonth
    );
  });

  const homeList = allData.home.filter((item) => {
    if (item.timeIn && item.timeIn.trim() !== "") return false;
    const itemDate = parseDateForSort(item.dateOut);
    return (
      itemDate.getFullYear() == selectedYear &&
      itemDate.getMonth() + 1 == selectedMonth
    );
  });

  // Determine which list to show based on active tab
  if (notReturnedType === "info") {
    notReturnedList = infoList;
  } else {
    notReturnedList = homeList;
  }

  const tabClassActive =
    "bg-orange-100 text-orange-700 border-orange-200 shadow-sm font-bold";
  const tabClassInactive =
    "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700";
  const infoTabClass =
    notReturnedType === "info" ? tabClassActive : tabClassInactive;
  const homeTabClass =
    notReturnedType === "home" ? tabClassActive : tabClassInactive;

  let modalHTML = `
    <div class="bg-orange-50 p-5 border-b border-orange-100 rounded-t-2xl">
        <div class="flex justify-between items-center mb-4">
             <h2 class="font-bold text-lg text-orange-800">អ្នកមិនទាន់ចូលមកវិញ</h2>
             <button class="modal-close-btn text-orange-400 hover:text-orange-600 bg-white rounded-full p-1.5 transition shadow-sm">&times;</button>
        </div>
        <div class="flex gap-2 p-1 bg-white/50 rounded-xl border border-orange-100">
            <button onclick="switchNotReturnedTab('info')" class="flex-1 py-2 px-2 rounded-lg border text-xs transition relative ${infoTabClass}">
                ច្បាប់ចេញក្រៅ
                <span class="ml-1 bg-white text-orange-600 px-1.5 py-0.5 rounded-full text-[9px] border border-orange-100 shadow-sm">${toKhmerNumber(
                  infoList.length
                )}</span>
            </button>
            <button onclick="switchNotReturnedTab('home')" class="flex-1 py-2 px-2 rounded-lg border text-xs transition relative ${homeTabClass}">
                ច្បាប់ទៅផ្ទះ
                <span class="ml-1 bg-white text-orange-600 px-1.5 py-0.5 rounded-full text-[9px] border border-orange-100 shadow-sm">${toKhmerNumber(
                  homeList.length
                )}</span>
            </button>
        </div>
    </div>
    <div class="p-4 max-h-[70vh] overflow-y-auto space-y-3 bg-slate-50/50">
  `;

  if (notReturnedList.length === 0) {
    modalHTML += `<div class="text-center py-12"><div class="text-orange-200 mb-2"><svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div><p class="text-slate-500 font-medium">ល្អណាស់! គ្មានបុគ្គលិកដែលមិនទាន់ចូលមកវិញទេ។</p></div>`;
  } else {
    notReturnedList.forEach((item) => {
      const profile = profileData[item.id.trim()] || {
        photo: "",
        department: "",
      };
      const placeholderImg = `https://placehold.co/60x60/e2e8f0/64748b?text=${(
        item.name || "?"
      ).charAt(0)}`;
      const dateOutStr = formatDateToKhmer(item.dateOut);
      const duration = item.duration
        ? `រយៈពេល: <span class="font-bold text-orange-600">${toKhmerNumber(
            item.duration
          )}${notReturnedType === "home" ? " ថ្ងៃ" : ""}</span>`
        : "";
      const reason = item.reason
        ? `<p class="text-xs text-slate-500 truncate mt-1 border-t border-dashed border-orange-100 pt-1">មូលហេតុ: ${item.reason}</p>`
        : "";

      modalHTML += `
        <div class="bg-white border border-orange-100 p-3.5 rounded-xl shadow-sm flex items-start gap-3.5 hover:shadow-md transition-shadow">
            <img src="${
              profile.photo || placeholderImg
            }" onerror="this.onerror=null;this.src='${placeholderImg}';" class="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-orange-100 shadow-sm">
            <div class="flex-grow min-w-0">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="font-bold text-slate-800 text-sm">${
                          item.name
                        }</p>
                        <p class="text-[10px] text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded w-fit mt-0.5">${toKhmerNumber(
                          item.id
                        )}</p>
                    </div>
                    <div class="text-[10px] bg-orange-50 text-orange-700 px-2 py-1 rounded-lg border border-orange-100">
                       ${toKhmerNumber(item.timeOut)}
                    </div>
                </div>
                
                <div class="text-xs text-slate-600 mt-2 space-y-1">
                    <div class="flex items-center gap-2">
                        <span class="w-1.5 h-1.5 bg-orange-400 rounded-full"></span>
                        <span>ចេញ: ${dateOutStr}</span>
                    </div>
                    ${
                      duration
                        ? `<div class="flex items-center gap-2"><span class="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>${duration}</div>`
                        : ""
                    }
                </div>
                ${reason}
            </div>
        </div>`;
    });
  }
  modalHTML += "</div>";
  modalContent.innerHTML = modalHTML;
  modalContainer.classList.remove("hidden");
  modalContainer.classList.add("flex");
}

function switchNotReturnedTab(type) {
  notReturnedType = type;
  showNotReturnedModal();
}
window.switchNotReturnedTab = switchNotReturnedTab;

// ==========================================
// 7. EVENT LISTENERS & INITIALIZATION
// ==========================================

function changePage(page) {
  currentPage = page;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function populateDateFilters() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  yearFilter.innerHTML = "";
  for (let y = currentYear + 1; y >= 2020; y--) {
    const option = document.createElement("option");
    option.value = y;
    option.textContent = `ឆ្នាំ ${toKhmerNumber(y)}`;
    yearFilter.appendChild(option);
  }
  yearFilter.value = currentYear;
  monthFilter.innerHTML = "";
  for (let m = 1; m <= 12; m++) {
    const option = document.createElement("option");
    option.value = m;
    option.textContent = `ខែ ${KHMER_MONTHS[m - 1]}`;
    monthFilter.appendChild(option);
  }
  monthFilter.value = currentMonth;
}

function switchTab(tabName) {
  currentTab = tabName;
  currentPage = 1;
  if (searchInput) searchInput.value = "";
  render();
}

function updateDesktopTabsState(tabName) {
  const tabs = [
    { el: tabInfo, name: "info" },
    { el: tabLeave, name: "leave" },
    { el: tabHome, name: "home" },
    { el: tabCombined, name: "combined" },
    { el: tabSettings, name: "settings" },
  ];
  tabs.forEach((tab) => {
    if (tab.name === tabName) {
      tab.el.classList.add("bg-primary-50", "text-primary-600");
      tab.el.classList.remove("text-slate-500");
    } else {
      tab.el.classList.remove("bg-primary-50", "text-primary-600");
      tab.el.classList.add("text-slate-500");
    }
  });
}

function updateMobileNavState(tabName) {
  const navButtons = [
    { btn: navBtnInfo, name: "info" },
    { btn: navBtnLeave, name: "leave" },
    { btn: navBtnHome, name: "home" },
    { btn: navBtnCombined, name: "combined" },
    { btn: navBtnSettings, name: "settings" },
  ];
  navButtons.forEach((item) => {
    const isActive = item.name === tabName;
    const svg = item.btn.querySelector("svg") || item.btn.querySelector("img");
    const text = item.btn.querySelector("span");
    if (isActive) {
      item.btn.classList.add("nav-item-active");
      if (svg.tagName === "svg") {
        svg.classList.remove("text-slate-400");
        svg.classList.add("text-primary-600");
      }
      text.classList.remove("text-slate-500");
      text.classList.add("text-primary-600");
    } else {
      item.btn.classList.remove("nav-item-active");
      if (svg.tagName === "svg") {
        svg.classList.add("text-slate-400");
        svg.classList.remove("text-primary-600");
      }
      text.classList.add("text-slate-500");
      text.classList.remove("text-primary-600");
    }
  });
}

function updateCardsPerPage() {
  const width = window.innerWidth;
  if (width >= 1280) {
    cardsPerPage = 50; // Desktop
  } else if (width >= 768) {
    cardsPerPage = 30; // Tablet
  } else {
    cardsPerPage = 24; // Mobile
  }
}

function handleSwipeGesture() {
  if (currentTab === "settings") return;
  const swipeThreshold = 50;
  const filteredData = getFilteredData();
  const totalPages = Math.ceil(filteredData.length / cardsPerPage);
  if (touchEndX < touchStartX - swipeThreshold) {
    if (currentPage < totalPages) changePage(currentPage + 1);
  }
  if (touchEndX > touchStartX + swipeThreshold) {
    if (currentPage > 1) changePage(currentPage - 1);
  }
}

// Bind Events
searchInput.addEventListener("input", () => {
  currentPage = 1;
  render();
});
modalContainer.addEventListener("click", (e) => {
  if (e.target === modalContainer || e.target.closest(".modal-close-btn"))
    hideModal();
});
saveApiKeyButton.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (key) {
    localStorage.setItem("googleApiKey", key);
    GOOGLE_API_KEY = key;
    apiKeySection.classList.add("hidden");
    mainContent.classList.remove("hidden");
    init();
  } else alert("សូមបញ្ចូល API Key ដែលត្រឹមត្រូវ");
});
changeApiKeyButton.addEventListener("click", () => {
  localStorage.removeItem("googleApiKey");
  GOOGLE_API_KEY = "";
  mainContent.classList.add("hidden");
  errorMessage.classList.add("hidden");
  apiKeySection.classList.remove("hidden");
  apiKeyInput.value = "";
});

// REFRESH BUTTON: Forces new data
if (refreshButton) {
  refreshButton.addEventListener("click", async () => {
    const icon = refreshButton.querySelector("svg");
    if (icon) icon.classList.add("spinning");
    refreshButton.disabled = true;
    await init(true); // Pass true to force refresh
    setTimeout(() => {
      if (icon) icon.classList.remove("spinning");
      refreshButton.disabled = false;
    }, 500);
  });
}

todayButton.addEventListener("click", () => {
  const now = new Date();
  filterDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(now.getDate()).padStart(2, "0")}`;
  startDateFilter.value = "";
  endDateFilter.value = "";
  searchInput.value = "";
  switchTab("info");
});
resetFilterButton.addEventListener("click", resetFilters);
applyFilterButton.addEventListener("click", () => {
  filterDate = null;
  switchTab("info");
});
notReturnedButton.addEventListener("click", () => {
  switchNotReturnedTab("info");
});
summaryButton.addEventListener("click", () => showSummaryModal(null));
tabInfo.addEventListener("click", () => switchTab("info"));
tabLeave.addEventListener("click", () => switchTab("leave"));
tabHome.addEventListener("click", () => switchTab("home"));
tabCombined.addEventListener("click", () => switchTab("combined"));
tabSettings.addEventListener("click", () => switchTab("settings"));
navBtnInfo.addEventListener("click", () => switchTab("info"));
navBtnLeave.addEventListener("click", () => switchTab("leave"));
navBtnHome.addEventListener("click", () => switchTab("home"));
navBtnCombined.addEventListener("click", () => switchTab("combined"));
navBtnSettings.addEventListener("click", () => switchTab("settings"));

document.addEventListener("DOMContentLoaded", () => {
  checkApiKey();
  updateCardsPerPage();
});
window.addEventListener("resize", () => {
  updateCardsPerPage();
  render();
});
dataContainer.addEventListener(
  "touchstart",
  (e) => {
    touchStartX = e.changedTouches[0].screenX;
  },
  { passive: true }
);
dataContainer.addEventListener("touchend", (e) => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipeGesture();
});
