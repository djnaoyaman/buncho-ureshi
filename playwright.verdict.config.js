import production from './playwright.config.js';
// Change evidence capture only; same projects, fixtures, defaults and selected test identities.
export default {...production,use:{...production.use,trace:'off',screenshot:'off',video:'off'}};
