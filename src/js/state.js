const annualData = JSON.parse(document.getElementById('market-data').textContent);
const HIST_STOCK = annualData.real_stock || [];
const HIST_BOND  = annualData.real_bond  || [];

const simsInput = document.getElementById('sims');
const simsLabel = document.getElementById('simsLabel');

const advancedToggle = document.getElementById('advancedToggle');
const advancedPanel  = document.getElementById('advancedPanel');
const advancedChevron = document.getElementById('advancedChevron');

const runBtn = document.getElementById('runBtn');
const statusText = document.getElementById('statusText');
const statusDot  = statusText.querySelector('.dot');
const statusMsg  = statusText.querySelector('span:last-child');

const tabs = document.querySelectorAll('.chart-tab');
const panels = {
  fanPanel: document.getElementById('fanPanel'),
  successPanel: document.getElementById('successPanel'),
  distPanel: document.getElementById('distPanel')
};

const pillRetAge      = document.getElementById('pillRetAge');
const retAgeLabel     = document.getElementById('retAgeLabel');
const retAgeDetail    = document.getElementById('retAgeDetail');

const pillRetWealth   = document.getElementById('pillRetWealth');
const retWealthLabel  = document.getElementById('retWealthLabel');
const retWealthDetail = document.getElementById('retWealthDetail');

const pillFinalWealth = document.getElementById('pillFinalWealth');
const finalWealthLabel = document.getElementById('finalWealthLabel');
const finalWealthDetail = document.getElementById('finalWealthDetail');

const pillFailure     = document.getElementById('pillFailure');
const failureLabel    = document.getElementById('failureLabel');
const failureDetail   = document.getElementById('failureDetail');

let fanChart = null;
let successChart = null;
let retWealthChart = null;
let finalWealthHistChart = null;
let failureAgeChart = null;
