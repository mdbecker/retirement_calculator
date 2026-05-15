function updateFanChart(fan) {
      if (!fan || !fan.ages || !fan.ages.length) return;
      const ages = fan.ages;
      const p50 = fan.p50.map(v => v / 1000.0);
      const p5  = fan.p5.map(v => v / 1000.0);
      const p25 = fan.p25.map(v => v / 1000.0);
      const p75 = fan.p75.map(v => v / 1000.0);
      const p95 = fan.p95.map(v => v / 1000.0);
      const ctx = document.getElementById('fanChart').getContext('2d');
      if (!fanChart) {
        fanChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: ages,
            datasets: [
              {
                label: 'Median',
                data: p50,
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56,189,248,0.2)',
                borderWidth: 2.4,
                pointRadius: 0,
                tension: 0.22,
                fill: true
              },
              {
                label: '5–95%',
                data: p95,
                borderWidth: 0,
                backgroundColor: 'rgba(56,189,248,0.14)',
                pointRadius: 0,
                tension: 0.22,
                fill: '-1'
              },
              {
                label: '25–75%',
                data: p75,
                borderWidth: 0,
                backgroundColor: 'rgba(56,189,248,0.26)',
                pointRadius: 0,
                tension: 0.22,
                fill: '-1'
              },
              {
                label: '5th',
                data: p5,
                borderWidth: 0,
                pointRadius: 0,
                tension: 0.22,
                fill: false
              },
              {
                label: '25th',
                data: p25,
                borderWidth: 0,
                pointRadius: 0,
                tension: 0.22,
                fill: false
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                  label: ctx => {
                    const label = ctx.dataset.label || '';
                    const val = ctx.parsed.y * 1000;
                    return `${label}: $${formatMoney(val)}`;
                  }
                }
              }
            },
            interaction: { mode: 'index', intersect: false },
            scales: {
              x: {
                title: { display: true, text: 'Age' },
                grid: { color: 'rgba(30,64,175,0.25)' }
              },
              y: {
                title: { display: true, text: 'Thousands of 2025 dollars' },
                grid: { color: 'rgba(30,64,175,0.3)' },
                ticks: { callback: v => v.toLocaleString('en-US') }
              }
            }
          }
        });
      } else {
        fanChart.data.labels = ages;
        fanChart.data.datasets[0].data = p50;
        fanChart.data.datasets[1].data = p95;
        fanChart.data.datasets[2].data = p75;
        fanChart.data.datasets[3].data = p5;
        fanChart.data.datasets[4].data = p25;
        fanChart.update();
      }
    }

function updateSuccessChart(curve, bestAge, bestProb) {
      const ages = curve.ages || [];
      const probs = curve.probs || [];
      const ctx = document.getElementById('successChart').getContext('2d');
      const cfg = getConfigFromUI();
      if (!successChart) {
        successChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: ages,
            datasets: [
              {
                label: 'Success probability',
                data: probs.map(p => p * 100),
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56,189,248,0.2)',
                pointRadius: 3,
                tension: 0.22,
                fill: true
              },
              {
                label: 'Target',
                data: ages.map(() => cfg.targetSuccess * 100),
                borderColor: 'rgba(248,250,252,0.4)',
                borderDash: [4,4],
                pointRadius: 0,
                fill: false
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: ctx => `Success: ${ctx.parsed.y.toFixed(1)}%`
                }
              }
            },
            scales: {
              x: {
                title: { display: true, text: 'Retirement age' },
                grid: { color: 'rgba(30,64,175,0.24)' }
              },
              y: {
                title: { display: true, text: 'Success probability (%)' },
                min: 0,
                max: 100,
                grid: { color: 'rgba(30,64,175,0.28)' }
              }
            }
          }
        });
      } else {
        successChart.data.labels = ages;
        successChart.data.datasets[0].data = probs.map(p => p * 100);
        successChart.data.datasets[1].data = ages.map(() => cfg.targetSuccess * 100);
        successChart.update();
      }
    }

function updateDistributions(retireStats, finalStats, failureStats) {
      const rBins = retireStats.histBins || [];
      const rCounts = retireStats.histCounts || [];
      const fBins = finalStats.histBins || [];
      const fCounts = finalStats.histCounts || [];
      const fbins = failureStats && failureStats.histBins ? failureStats.histBins : [];
      const fcounts = failureStats && failureStats.histCounts ? failureStats.histCounts : [];

      const ctxR = document.getElementById('retWealthChart').getContext('2d');
      if (!retWealthChart) {
        retWealthChart = new Chart(ctxR, {
          type: 'bar',
          data: {
            labels: rBins.map(v => Math.round(v / 1000.0)),
            datasets: [{
              label: 'Retirement wealth',
              data: rCounts,
              backgroundColor: 'rgba(56,189,248,0.6)'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  title: ctx => {
                    if (!ctx.length) return '';
                    const v = ctx[0].label * 1000;
                    return 'Wealth ≈ $' + formatMoney(v);
                  }
                }
              }
            },
            scales: {
              x: {
                title: { display: true, text: 'Wealth at retirement (thousands of 2025 $)' },
                grid: { color: 'rgba(30,64,175,0.24)' }
              },
              y: {
                title: { display: true, text: 'Number of simulations' },
                grid: { color: 'rgba(30,64,175,0.28)' }
              }
            }
          }
        });
      } else {
        retWealthChart.data.labels = rBins.map(v => Math.round(v / 1000.0));
        retWealthChart.data.datasets[0].data = rCounts;
        retWealthChart.update();
      }

      const ctxF = document.getElementById('finalWealthChart').getContext('2d');
      if (!finalWealthHistChart) {
        finalWealthHistChart = new Chart(ctxF, {
          type: 'bar',
          data: {
            labels: fBins.map(v => Math.round(v / 1000.0)),
            datasets: [{
              label: 'Final wealth',
              data: fCounts,
              backgroundColor: 'rgba(248,113,113,0.7)'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  title: ctx => {
                    if (!ctx.length) return '';
                    const v = ctx[0].label * 1000;
                    return 'Wealth ≈ $' + formatMoney(v);
                  }
                }
              }
            },
            scales: {
              x: {
                title: { display: true, text: 'Wealth at horizon (thousands of 2025 $)' },
                grid: { color: 'rgba(30,64,175,0.24)' }
              },
              y: {
                title: { display: true, text: 'Number of simulations' },
                grid: { color: 'rgba(30,64,175,0.28)' }
              }
            }
          }
        });
      } else {
        finalWealthHistChart.data.labels = fBins.map(v => Math.round(v / 1000.0));
        finalWealthHistChart.data.datasets[0].data = fCounts;
        finalWealthHistChart.update();
      }

      const ctxFail = document.getElementById('failureAgeChart').getContext('2d');
      if (!failureAgeChart) {
        failureAgeChart = new Chart(ctxFail, {
          type: 'bar',
          data: {
            labels: fbins.map(v => Math.round(v)),
            datasets: [{
              label: 'Failure ages',
              data: fcounts,
              backgroundColor: 'rgba(248,113,113,0.8)'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  title: ctx => {
                    if (!ctx.length) return '';
                    const v = ctx[0].label;
                    return 'Failure age ≈ ' + v;
                  }
                }
              }
            },
            scales: {
              x: {
                title: { display: true, text: 'Age at first portfolio depletion' },
                grid: { color: 'rgba(30,64,175,0.24)' }
              },
              y: {
                title: { display: true, text: 'Number of failing simulations' },
                grid: { color: 'rgba(30,64,175,0.28)' }
              }
            }
          }
        });
      } else {
        failureAgeChart.data.labels = fbins.map(v => Math.round(v));
        failureAgeChart.data.datasets[0].data = fcounts;
        failureAgeChart.update();
      }
    }
