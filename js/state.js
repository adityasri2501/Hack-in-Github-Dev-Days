// js/state.js — Global State Management
const State = (() => {
  const STORAGE_KEY = 'mediroute_state';
  
  const defaults = {
    language: 'en',
    currency: 'USD',
    profile: {
      name: '',
      nationality: '',
      dob: '',
      gender: '',
      passport: '',
      homeCountry: '',
      destination: 'India',
      photo: null,
      bloodGroup: '',
      height: '',
      weight: '',
      bloodPressure: '',
      allergies: [],
      conditions: [],
      medications: [],
      preferences: {
        vegetarianCapsules: false,
        halalGelatin: false,
        noAnimalIngredients: false,
        liquidForm: false,
        genericPreferred: false,
        additionalSensitivities: ''
      },
      insurance: {
        policyNumber: '',
        insurer: '',
        coverageCountries: '',
        emergencyHotline: '',
        preAuthNumber: '',
        maxClaim: '',
        deductible: ''
      },
      emergencyContacts: []
    },
    visits: [],
    savedDoctors: [],
    triageResult: null,
    lastLocation: null,
    chatHistory: []
  };

  let _state = { ...defaults };

  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        _state = deepMerge(defaults, parsed);
      }
    } catch (e) {
      console.warn('State load failed:', e);
    }
    return _state;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
    } catch (e) {
      console.warn('State save failed:', e);
    }
  }

  function get(path) {
    if (!path) return _state;
    return path.split('.').reduce((obj, key) => obj?.[key], _state);
  }

  function set(path, value) {
    const keys = path.split('.');
    let obj = _state;
    for (let i = 0; i < keys.length - 1; i++) {
      if (obj[keys[i]] === undefined) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    save();
  }

  function update(path, updater) {
    set(path, updater(get(path)));
  }

  function deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  function reset() {
    _state = { ...defaults };
    save();
  }

  // Profile shortcuts
  const profile = {
    get: () => get('profile'),
    set: (profile) => set('profile', profile),
    update: (updates) => set('profile', { ...get('profile'), ...updates }),
    addAllergy: (allergy) => update('profile.allergies', arr => [...(arr || []), allergy]),
    removeAllergy: (index) => update('profile.allergies', arr => arr.filter((_, i) => i !== index)),
    addMedication: (med) => update('profile.medications', arr => [...(arr || []), med]),
    removeMedication: (index) => update('profile.medications', arr => arr.filter((_, i) => i !== index)),
    addCondition: (cond) => update('profile.conditions', arr => [...(arr || []), cond]),
    addVisit: (visit) => update('visits', arr => [visit, ...(arr || [])]),
    addContact: (contact) => update('profile.emergencyContacts', arr => [...(arr || []), contact]),
    removeContact: (index) => update('profile.emergencyContacts', arr => arr.filter((_, i) => i !== index))
  };

  load();

  return { get, set, update, save, reset, profile, load };
})();

export default State;
