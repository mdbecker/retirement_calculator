function createSimulationWorker() {
  const blob = new Blob([SIM_WORKER_SOURCE], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  URL.revokeObjectURL(url);
  return worker;
}

const simWorker = createSimulationWorker();

simWorker.onmessage = function(e) {
  const data = e.data;
  if (!data || data.type !== 'simulationResult') return;
  setStatusReady();
  updateSummary(data);
  updateFanChart(data.fan);
  updateSuccessChart(data.successCurve, data.bestRetAge, data.bestRetSuccess);
  updateDistributions(data.retireStats, data.finalStats, data.failureStats);
  updateTable(data.bestRetAge, data.fan, data.baseSpend);
};

function runSimulation() {
      if (!HIST_STOCK.length || !HIST_BOND.length) {
        alert("No historical market data found in the embedded market-data JSON.");
        return;
      }
      const config = getConfigFromUI();
      setStatusRunning();
      simWorker.postMessage({
        type: 'runSimulation',
        config,
        histStock: HIST_STOCK,
        histBond: HIST_BOND
      });
    }
runBtn.addEventListener('click', runSimulation);

if (HIST_STOCK.length && HIST_BOND.length) {
  setTimeout(runSimulation, 300);
}
