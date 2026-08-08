const views = Array.from(document.querySelectorAll(".view"));
const routeControls = Array.from(document.querySelectorAll("[data-route]"));
const stepLinks = Array.from(document.querySelectorAll(".step-link"));
let clinicMap;
let clinicMarkers = [];

const dosmReferenceData = {
  male: {
    sexLabel: "men",
    share: 24.8,
    rank: "number one",
    source:
      "Department of Statistics Malaysia (DOSM), Statistics on Causes of Death Malaysia 2023, project reference extract for medically certified deaths aged 41 to 59.",
  },
  female: {
    sexLabel: "women",
    share: 15.1,
    rank: "a leading",
    source:
      "Department of Statistics Malaysia (DOSM), Statistics on Causes of Death Malaysia 2023, project reference extract for medically certified deaths aged 41 to 59.",
  },
};

const riskFieldRules = {
  age: { min: 41, max: 59, label: "Age" },
  systolic_bp: { min: 80, max: 240, label: "Systolic blood pressure" },
  total_cholesterol: { min: 2, max: 12, label: "Total cholesterol" },
  hdl_cholesterol: { min: 0.3, max: 4, label: "HDL cholesterol" },
};

const defaultDietTips = [
  {
    id: "diet_default_01",
    icon: "salad",
    title: "Add vegetables to two meals daily",
    meta: "Use fibre-rich meals to support cholesterol control.",
    priority: 40,
    source: "Malaysian Dietary Guidelines",
  },
  {
    id: "diet_default_02",
    icon: "cup-soda",
    title: "Choose unsweetened drinks",
    meta: "Replace sweet drinks with water, kosong, or less-sugar options.",
    priority: 50,
    source: "Malaysian Dietary Guidelines",
  },
  {
    id: "diet_default_03",
    icon: "wheat",
    title: "Choose steamed or grilled meals",
    meta: "Keep fried meals as occasional choices rather than daily defaults.",
    priority: 60,
    source: "WHO healthy diet guidance",
  },
];

const dietTipRules = [
  {
    id: "diet_cholesterol",
    icon: "wheat",
    title: "Reduce saturated fat and fried food",
    meta: "If cholesterol is high, choose steamed, grilled, soup-based, or higher-fibre meals more often.",
    priority: 1,
    source: "WHO healthy diet guidance",
    match: ({ input }) => input.total_cholesterol >= 5.2,
  },
  {
    id: "diet_salt_bp",
    icon: "utensils",
    title: "Lower salt in everyday meals",
    meta: "Ask for less gravy, limit salty sauces, and compare lower-sodium options when blood pressure is elevated.",
    priority: 2,
    source: "WHO sodium guideline",
    match: ({ input }) => input.systolic_bp >= 140,
  },
  {
    id: "diet_sugar_diabetes",
    icon: "cup-soda",
    title: "Make sweet drinks less frequent",
    meta: "Switch one teh tarik, canned drink, or dessert drink to water or unsweetened tea this week.",
    priority: 3,
    source: "Malaysian Dietary Guidelines",
    match: ({ input }) => input.diabetes,
  },
];

const defaultLifestyleTips = [
  {
    id: "life_default_01",
    icon: "footprints",
    title: "Walk 20 minutes after dinner",
    meta: "Start with a small repeatable routine rather than a large exercise target.",
    priority: 40,
    source: "WHO physical activity guidance",
  },
  {
    id: "life_default_02",
    icon: "heart-pulse",
    title: "Check blood pressure again",
    meta: "Repeat the reading and bring it to a Klinik Kesihatan if it stays high.",
    priority: 50,
    source: "MOH primary care prevention guidance",
  },
  {
    id: "life_default_03",
    icon: "moon",
    title: "Protect a consistent sleep window",
    meta: "Pick one bedtime routine that helps reduce late-night snacking and missed morning activity.",
    priority: 60,
    source: "WHO healthy lifestyle guidance",
  },
];

const lifestyleTipRules = [
  {
    id: "life_smoking",
    icon: "cigarette",
    title: "Plan one smoking-reduction step",
    meta: "If you currently smoke, set one quit-support conversation or reduction target this week.",
    priority: 1,
    source: "WHO tobacco cessation guidance",
    match: ({ input }) => input.smoking,
  },
  {
    id: "life_activity",
    icon: "footprints",
    title: "Keep movement regular",
    meta: "Aim for a short walk on most days, especially after meals or during a work break.",
    priority: 2,
    source: "WHO physical activity guidance",
    match: ({ level }) => level !== "Low",
  },
  {
    id: "life_salt",
    icon: "utensils",
    title: "Choose a lower-salt day",
    meta: "Pick one meal to make less salty, especially if blood pressure is elevated.",
    priority: 3,
    source: "WHO sodium guideline",
    match: ({ input }) => input.systolic_bp >= 140,
  },
  {
    id: "life_bp_followup",
    icon: "heart-pulse",
    title: "Book a blood-pressure review",
    meta: "If blood pressure is elevated or treated, review your readings with a clinician.",
    priority: 4,
    source: "MOH primary care prevention guidance",
    match: ({ input }) => input.systolic_bp >= 140 || input.bp_treated,
  },
];

const clinicClusters = [
  { count: 142, lat: 6.44, lng: 100.19, facilityIndex: 0 },
  { count: 146, lat: 5.98, lng: 100.44, facilityIndex: 1 },
  { count: 167, lat: 5.36, lng: 100.3, facilityIndex: 2 },
  { count: 23, lat: 5.35, lng: 101.1, facilityIndex: 3 },
  { count: 70, lat: 6.12, lng: 102.24, facilityIndex: 0 },
  { count: 216, lat: 5.85, lng: 102.74, facilityIndex: 1 },
  { count: 44, lat: 4.6, lng: 101.08, facilityIndex: 2 },
  { count: 76, lat: 4.03, lng: 101.02, facilityIndex: 3 },
  { count: 131, lat: 4.15, lng: 101.23, facilityIndex: 0 },
  { count: 254, lat: 3.14, lng: 101.69, facilityIndex: 1 },
  { count: 201, lat: 2.73, lng: 101.94, facilityIndex: 2 },
  { count: 126, lat: 2.2, lng: 102.25, facilityIndex: 3 },
  { count: 172, lat: 1.85, lng: 103.08, facilityIndex: 0 },
  { count: 92, lat: 1.45, lng: 103.76, facilityIndex: 1 },
  { count: 110, lat: 3.68, lng: 102.3, facilityIndex: 2 },
  { count: 79, lat: 3.8, lng: 103.33, facilityIndex: 3 },
  { count: 64, lat: 4.47, lng: 103.42, facilityIndex: 0 },
  { count: 18, lat: 5.33, lng: 103.14, facilityIndex: 1 },
];

const facilities = [
  {
    icon: "map-pin",
    title: "Klinik Kesihatan Tanglin",
    type: "Klinik Kesihatan",
    state: "Kuala Lumpur",
    district: "Kuala Lumpur",
    meta: "Primary care consultation, blood pressure review, and referral advice.",
    distance: "2.4 km",
    address: "Jalan Cenderasari, Kuala Lumpur",
    phone: "+603 2698 2017",
  },
  {
    icon: "building-2",
    title: "Hospital Kuala Lumpur",
    type: "Hospital",
    state: "Kuala Lumpur",
    district: "Titiwangsa",
    meta: "Further cardiovascular checkup if a doctor recommends escalation.",
    distance: "4.8 km",
    address: "Jalan Pahang, Kuala Lumpur",
    phone: "+603 2615 5555",
  },
  {
    icon: "stethoscope",
    title: "Klinik Kesihatan Cheras",
    type: "Klinik Kesihatan",
    state: "Kuala Lumpur",
    district: "Cheras",
    meta: "Public clinic option for follow-up and routine health checks.",
    distance: "6.1 km",
    address: "Jalan Yaacob Latif, Cheras",
    phone: "+603 9131 0090",
  },
  {
    icon: "heart-pulse",
    title: "Klinik Kesihatan Setapak",
    type: "Klinik Kesihatan",
    state: "Kuala Lumpur",
    district: "Setapak",
    meta: "Bring cholesterol, blood pressure, diabetes, and medication details.",
    distance: "7.3 km",
    address: "Setapak, Kuala Lumpur",
    phone: "+603 4023 1140",
  },
  {
    icon: "activity",
    title: "Klinik Komuniti Seri Petaling",
    type: "Community Clinic",
    state: "Kuala Lumpur",
    district: "Seri Petaling",
    meta: "Basic consultation route for routine follow-up and referral advice.",
    distance: "8.5 km",
    address: "Seri Petaling, Kuala Lumpur",
    phone: "+603 9058 1180",
  },
  {
    icon: "building-2",
    title: "Klinik Kesihatan Shah Alam",
    type: "Klinik Kesihatan",
    state: "Selangor",
    district: "Shah Alam",
    meta: "Public clinic option for blood pressure and lifestyle follow-up.",
    distance: "24.2 km",
    address: "Seksyen 7, Shah Alam",
    phone: "+603 5519 2521",
  },
  {
    icon: "stethoscope",
    title: "Klinik Kesihatan Bayan Baru",
    type: "Klinik Kesihatan",
    state: "Penang",
    district: "Bayan Baru",
    meta: "Routine health check and doctor consultation option.",
    distance: "358 km",
    address: "Bayan Baru, Pulau Pinang",
    phone: "+604 643 2100",
  },
  {
    icon: "heart-pulse",
    title: "Hospital Sultanah Aminah",
    type: "Hospital",
    state: "Johor",
    district: "Johor Bahru",
    meta: "Hospital referral option for further cardiovascular assessment.",
    distance: "331 km",
    address: "Jalan Persiaran Abu Bakar Sultan, Johor Bahru",
    phone: "+607 225 7000",
  },
];

const state = {
  profile: {
    age: 53,
    sex: "male",
  },
  riskInputs: {
    age: 53,
    sex: "male",
    systolic_bp: 145,
    total_cholesterol: 5.5,
    hdl_cholesterol: 1.2,
    smoking: true,
    diabetes: false,
    bp_treated: true,
  },
  analysed: false,
  selectedFacility: 0,
  clinicFilters: {
    search: "",
    state: "all",
    type: "all",
  },
};

function setError(id, message) {
  const element = document.getElementById(id);
  if (element) element.textContent = message || "";
}

function validateMidlifeAge(age) {
  if (!Number.isFinite(age)) return "Enter your age as a number.";
  if (age < 41 || age > 59) {
    return "FutureWell is built for the 41-59 midlife band, so this assessment cannot run for that age.";
  }
  return "";
}

function validateRiskInputs(input) {
  const ageError = validateMidlifeAge(input.age);
  if (ageError) return ageError;
  for (const [name, rule] of Object.entries(riskFieldRules)) {
    const value = input[name];
    if (!Number.isFinite(value)) return `${rule.label} needs a valid number.`;
    if (value < rule.min || value > rule.max) {
      return `${rule.label} should be between ${rule.min} and ${rule.max} for this assessment.`;
    }
  }
  if (!input.sex) return "Select biological sex before analysing risk.";
  return "";
}

function selectedDosmData() {
  return dosmReferenceData[state.profile.sex] || dosmReferenceData.male;
}

function renderIcons() {
  if (window.lucide) window.lucide.createIcons();
}

function navigate(route) {
  const target = document.getElementById(route);
  if (!target) return;
  stepLinks.forEach((link) => link.classList.toggle("is-active", link.dataset.route === route));
  window.history.replaceState(null, "", `#${route}`);
  const offset = window.matchMedia("(max-width: 760px)").matches ? 140 : 178;
  window.scrollTo({ top: Math.max(0, target.offsetTop - offset), left: 0, behavior: "smooth" });
}

function updateActiveStep() {
  const current = views.reduce((active, view) => {
    const distance = Math.abs(view.getBoundingClientRect().top - 96);
    if (!active || distance < active.distance) return { id: view.id, distance };
    return active;
  }, null);
  stepLinks.forEach((link) => link.classList.toggle("is-active", link.dataset.route === current?.id));
}

function syncRiskFormFromProfile() {
  const riskForm = document.getElementById("riskProfileForm");
  riskForm.elements.age.value = state.profile.age;
  riskForm.elements.sex.value = state.profile.sex;
  state.riskInputs.age = state.profile.age;
  state.riskInputs.sex = state.profile.sex;
  renderCarriedProfile();
}

function renderCarriedProfile() {
  const age = document.getElementById("carriedAge");
  const sex = document.getElementById("carriedSex");
  if (age) age.textContent = `Age ${state.profile.age}`;
  if (sex) sex.textContent = state.profile.sex === "female" ? "Female" : "Male";
}

function renderAwarenessPictograph() {
  const total = 100;
  const data = selectedDosmData();
  const highlight = Math.max(1, Math.round(data.share));
  const iconPath =
    "M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 1.8c-5.1 0-9 2.6-9 6.2V22h18v-2c0-3.6-3.9-6.2-9-6.2Z";
  const grid = document.getElementById("pictoGrid");
  const ratio = document.getElementById("ratioText");
  const callout = document.getElementById("awarenessCallout");
  const source = document.querySelector(".picto-source");
  const referenceRows = document.getElementById("awarenessReferenceRows");
  if (!grid || !ratio || !callout) return;

  grid.innerHTML = Array.from({ length: total }, (_, index) => {
    const className = index < highlight ? "mark-heart" : "mark-other";
    return `<svg class="${className}" viewBox="0 0 24 24" fill="currentColor"><path d="${iconPath}"></path></svg>`;
  }).join("");

  ratio.textContent = `About 1 in ${Math.round(total / highlight)} deaths`;
  callout.innerHTML = `
    You're <strong>${state.profile.age}</strong>. For Malaysian ${data.sexLabel} aged 41 to 59,
    ischaemic heart disease is <strong>${data.rank}</strong> cause of death, at ${data.share}%.
  `;
  if (source) source.textContent = data.source;
  if (referenceRows) {
    referenceRows.innerHTML = Object.values(dosmReferenceData)
      .map(
        (row) => `
          <tr>
            <td>Malaysian ${row.sexLabel}, 41-59</td>
            <td>${row.share}%</td>
            <td>About 1 in ${Math.round(total / row.share)} medically certified deaths</td>
          </tr>
        `,
      )
      .join("");
  }
}

function calculateRisk() {
  const input = state.riskInputs;
  let score = 8;
  score += Math.max(0, input.age - 40) * 0.8;
  score += input.sex === "male" ? 5 : 2;
  score += Math.max(0, input.systolic_bp - 120) * 0.45;
  score += Math.max(0, input.total_cholesterol - 4.5) * 5.2;
  score += Math.max(0, 1.3 - input.hdl_cholesterol) * 8;
  score += input.smoking ? 12 : 0;
  score += input.diabetes ? 11 : 0;
  score += input.bp_treated ? 4 : 0;
  return Math.max(5, Math.min(85, Math.round(score)));
}

function riskLevel(score) {
  if (score >= 55) return "High";
  if (score >= 30) return "Medium";
  return "Low";
}

function pickTips(rules, defaults, context) {
  const matched = rules
    .filter((rule) => rule.match(context))
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  const selected = [...matched];
  defaults.forEach((tip) => {
    if (selected.length < 3 && !selected.some((item) => item.id === tip.id)) selected.push(tip);
  });
  return selected.slice(0, 3);
}

function renderGuidanceSummary(dietItems, lifestyleItems, level) {
  const summary = document.getElementById("guidanceSummary");
  if (!summary) return;
  if (!state.analysed) {
    summary.textContent =
      "Complete the risk profile to receive a short AI-personalised summary based only on your selected tips.";
    return;
  }
  const firstDiet = dietItems[0]?.title.toLowerCase() || "food choices";
  const firstHabit = lifestyleItems[0]?.title.toLowerCase() || "daily habits";
  summary.textContent = `AI-personalised summary: your result is ${level}. Start with ${firstDiet} and ${firstHabit}; these are grounded in the selected tips only and written for a Malaysian daily routine.`;
}

function renderRecommendations(score) {
  const analysed = state.analysed;
  const level = riskLevel(score);
  const context = { input: state.riskInputs, profile: state.profile, level, score };
  const dietItems = pickTips(dietTipRules, defaultDietTips, context);
  const lifestyleItems = pickTips(lifestyleTipRules, defaultLifestyleTips, context);

  document.getElementById("dietList").innerHTML = analysed
    ? dietItems.map((item) => recommendationMarkup(item)).join("")
    : emptyRecommendation("Complete the 8-input risk profile first.");
  document.getElementById("lifestyleList").innerHTML = analysed
    ? lifestyleItems.map((item) => recommendationMarkup(item)).join("")
    : emptyRecommendation("Recommendations appear after risk analysis.");
  renderGuidanceSummary(dietItems, lifestyleItems, level);

  renderFacilities();
}

function recommendationMarkup(item) {
  return `
    <article>
      <i data-lucide="${item.icon}"></i>
      <strong>${item.title}<span>${item.meta}</span><small>${item.source}</small></strong>
    </article>
  `;
}

function emptyRecommendation(message) {
  return `
    <article>
      <i data-lucide="clipboard-list"></i>
      <strong>Waiting for analysis<span>${message}</span></strong>
    </article>
  `;
}

function defaultRiskInputs() {
  return {
    age: state.profile.age || 53,
    sex: state.profile.sex || "male",
    systolic_bp: 145,
    total_cholesterol: 5.5,
    hdl_cholesterol: 1.2,
    smoking: true,
    diabetes: false,
    bp_treated: true,
  };
}

function applyRiskInputsToForm() {
  const riskForm = document.getElementById("riskProfileForm");
  Object.entries(state.riskInputs).forEach(([name, value]) => {
    if (typeof value === "boolean") {
      riskForm.querySelectorAll(`[name="${name}"]`).forEach((input) => {
        input.checked = input.value === String(value);
      });
      return;
    }
    if (name === "sex") {
      riskForm.elements.sex.value = value;
      return;
    }
    if (riskForm.elements[name]) riskForm.elements[name].value = value;
  });
  renderCarriedProfile();
}

function filteredFacilities() {
  const query = state.clinicFilters.search.trim().toLowerCase();
  return facilities.filter((facility) => {
    const matchesQuery =
      !query ||
      [facility.title, facility.type, facility.state, facility.district, facility.address]
        .join(" ")
        .toLowerCase()
        .includes(query);
    const matchesState =
      state.clinicFilters.state === "all" || facility.state === state.clinicFilters.state;
    const matchesType =
      state.clinicFilters.type === "all" || facility.type === state.clinicFilters.type;
    return matchesQuery && matchesState && matchesType;
  });
}

function renderFacilities() {
  const count = document.getElementById("clinicResultCount");
  const rows = filteredFacilities();
  const visibleIndexes = rows.map((facility) => facilities.indexOf(facility));
  const hasActiveFilter =
    state.clinicFilters.search.trim() ||
    state.clinicFilters.state !== "all" ||
    state.clinicFilters.type !== "all";
  if (count) {
    count.textContent = hasActiveFilter
      ? `${rows.length} clinic${rows.length === 1 ? "" : "s"} shown`
      : "2,915 clinics shown";
  }

  const typeList = document.getElementById("clinicTypeList");
  const facilityList = document.getElementById("facilityList");
  const title = document.getElementById("clinicPanelTitle");
  const text = document.getElementById("clinicPanelText");
  const selected = Number.isInteger(state.selectedFacility) ? facilities[state.selectedFacility] : null;

  if (!title || !text || !typeList || !facilityList) return;

  if (!rows.length) {
    title.textContent = "No clinics match your search.";
    text.textContent = "Try a different state, clinic type, or search term.";
    typeList.hidden = true;
    facilityList.innerHTML = `<p class="clinic-empty">No clinics match the current filters.</p>`;
    updateClinicMarkers(visibleIndexes);
    return;
  }

  if (!selected || !visibleIndexes.includes(state.selectedFacility)) {
    state.selectedFacility = null;
    title.textContent = "Choose a marker to inspect it.";
    text.textContent = "Locations come from the MoH public-facility registry dated 31 December 2025.";
    typeList.hidden = false;
    facilityList.innerHTML = "";
    updateClinicMarkers(visibleIndexes);
    return;
  }

  title.textContent = selected.title;
  text.textContent = "Selected public facility from the prototype registry.";
  typeList.hidden = true;
  facilityList.innerHTML = `
    <article class="facility-card">
      <i data-lucide="${selected.icon}"></i>
      <div>
        <strong>${selected.title}</strong>
        <span>${selected.distance} away - ${selected.address}</span>
        <span>${selected.phone}</span>
        <em>${selected.meta}</em>
      </div>
    </article>
  `;
  updateClinicMarkers(visibleIndexes);
  renderIcons();
}

function clusterIcon(count, selected) {
  return window.L.divIcon({
    className: "",
    html: `<span class="clinic-cluster${selected ? " is-selected" : ""}">${count}</span>`,
    iconSize: [58, 58],
    iconAnchor: [29, 29],
  });
}

function updateClinicMarkers(visibleIndexes = filteredFacilities().map((facility) => facilities.indexOf(facility))) {
  if (!clinicMarkers.length || !window.L || !clinicMap) return;
  clinicMarkers.forEach(({ marker, cluster }) => {
    const isVisible = visibleIndexes.includes(cluster.facilityIndex);
    if (isVisible && !clinicMap.hasLayer(marker)) marker.addTo(clinicMap);
    if (!isVisible && clinicMap.hasLayer(marker)) marker.remove();
    marker.setIcon(clusterIcon(cluster.count, cluster.facilityIndex === state.selectedFacility));
  });
}

function initClinicMap() {
  const mapElement = document.getElementById("clinicMap");
  if (!mapElement || clinicMap || !window.L) return;

  clinicMap = window.L.map(mapElement, {
    zoomControl: true,
    scrollWheelZoom: false,
  }).setView([4.15, 102.25], 7);

  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18,
  }).addTo(clinicMap);

  clinicMarkers = clinicClusters.map((cluster) => {
    const marker = window.L.marker([cluster.lat, cluster.lng], {
      icon: clusterIcon(cluster.count, cluster.facilityIndex === state.selectedFacility),
      keyboard: true,
      title: `${cluster.count} public clinics`,
    }).addTo(clinicMap);
    marker.on("click", () => {
      state.selectedFacility = cluster.facilityIndex;
      renderFacilities();
    });
    return { marker, cluster };
  });
}

function renderResult() {
  const score = state.analysed ? calculateRisk() : 0;
  const level = state.analysed ? riskLevel(score) : "Waiting";
  const data = selectedDosmData();
  const reason = state.analysed
    ? `Based on age, sex, blood pressure, cholesterol, smoking, diabetes, and blood-pressure treatment inputs.`
    : "Complete the risk profile to generate a recommendation.";

  document.getElementById("riskScore").textContent = level;
  document.getElementById("riskPercent").textContent = state.analysed ? `${score}%` : "--";
  document.getElementById("riskMeter").style.width = `${score}%`;
  document.getElementById("riskReason").textContent = reason;
  const context = document.getElementById("riskContext");
  const note = document.getElementById("modelNote");
  const sampleNote = document.getElementById("sampleRiskNote");
  const disclaimer = document.getElementById("riskDisclaimer");
  const careAction = document.getElementById("findCareAction");
  if (context) {
    context.hidden = !state.analysed;
    context.innerHTML = state.analysed
      ? `<strong>Your risk in context</strong><span>Your personal estimate is shown beside the ${data.share}% DOSM population baseline for Malaysian ${data.sexLabel} aged 41 to 59. Focus first on the changeable inputs: blood pressure, cholesterol, smoking, diabetes control, and daily habits.</span>`
      : "";
  }
  if (sampleNote) sampleNote.hidden = !state.analysed;
  if (note) note.hidden = !state.analysed;
  if (disclaimer) disclaimer.hidden = !state.analysed;
  if (careAction) careAction.hidden = !state.analysed;
  renderRecommendations(score);
  renderIcons();
}

function renderProfile() {
  renderAwarenessPictograph();
}

routeControls.forEach((control) => {
  control.addEventListener("click", (event) => {
    const route = control.dataset.route;
    if (!route) return;
    event.preventDefault();
    navigate(route);
  });
});

document.getElementById("basicProfileForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const age = Number(formData.get("age"));
  const ageError = validateMidlifeAge(age);
  if (ageError) {
    setError("profileError", ageError);
    event.currentTarget.elements.age.focus();
    return;
  }
  setError("profileError", "");
  state.profile.age = age;
  state.profile.sex = String(formData.get("sex") || "male");
  renderProfile();
  syncRiskFormFromProfile();
  applyRiskInputsToForm();
  navigate("awareness");
});

document.getElementById("riskProfileForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const nextInputs = {
    age: Number(formData.get("age")),
    sex: String(formData.get("sex") || "male"),
    systolic_bp: Number(formData.get("systolic_bp")),
    total_cholesterol: Number(formData.get("total_cholesterol")),
    hdl_cholesterol: Number(formData.get("hdl_cholesterol")),
    smoking: formData.get("smoking") === "true",
    diabetes: formData.get("diabetes") === "true",
    bp_treated: formData.get("bp_treated") === "true",
  };
  const riskError = validateRiskInputs(nextInputs);
  if (riskError) {
    setError("riskError", riskError);
    state.analysed = false;
    renderResult();
    return;
  }
  setError("riskError", "");
  state.riskInputs = nextInputs;
  try {
    state.analysed = true;
    renderResult();
    navigate("recommendation");
  } catch (error) {
    state.analysed = false;
    setError("riskError", "We could not complete the risk estimate. Please check the inputs and try again.");
    renderResult();
  }
});

document.getElementById("riskReset").addEventListener("click", () => {
  state.riskInputs = defaultRiskInputs();
  state.analysed = false;
  setError("riskError", "");
  applyRiskInputsToForm();
  renderResult();
});

document.getElementById("findCareAction").addEventListener("click", () => {
  state.clinicFilters.state = "Kuala Lumpur";
  state.selectedFacility = 0;
  document.getElementById("clinicStateFilter").value = state.clinicFilters.state;
  renderFacilities();
  const panel = document.getElementById("facilityPanel");
  if (panel) {
    const offset = window.matchMedia("(max-width: 760px)").matches ? 140 : 178;
    window.scrollTo({ top: Math.max(0, panel.offsetTop - offset), left: 0, behavior: "smooth" });
  }
});

document.getElementById("clinicSearch").addEventListener("input", (event) => {
  state.clinicFilters.search = event.currentTarget.value;
  renderFacilities();
});

document.getElementById("clinicStateFilter").addEventListener("change", (event) => {
  state.clinicFilters.state = event.currentTarget.value;
  renderFacilities();
});

document.getElementById("clinicTypeFilter").addEventListener("change", (event) => {
  state.clinicFilters.type = event.currentTarget.value;
  renderFacilities();
});

document.getElementById("clinicReset").addEventListener("click", () => {
  state.clinicFilters = { search: "", state: "all", type: "all" };
  state.selectedFacility = null;
  document.getElementById("clinicSearch").value = "";
  document.getElementById("clinicStateFilter").value = "all";
  document.getElementById("clinicTypeFilter").value = "all";
  renderFacilities();
});

const initialRoute = window.location.hash.replace("#", "");
if (views.some((view) => view.id === initialRoute)) {
  window.setTimeout(() => navigate(initialRoute), 50);
}

window.addEventListener("scroll", updateActiveStep, { passive: true });

renderProfile();
syncRiskFormFromProfile();
applyRiskInputsToForm();
renderResult();
initClinicMap();
renderIcons();
updateActiveStep();
