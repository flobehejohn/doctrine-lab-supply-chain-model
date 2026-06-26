async function loadDashboard() {
  const response = await fetch("./data/executive-dashboard.json");
  const data = await response.json();

  document.getElementById("dashboard-title").textContent = data.title;
  document.getElementById("headline").textContent = data.executiveSummary.twoMinuteMessage;
  document.getElementById("overall-status").textContent = data.status.overall;

  document.getElementById("risk-score").textContent = data.scores.riskScore;
  document.getElementById("blast-radius-score").textContent = data.scores.blastRadiusScore;
  document.getElementById("compliance-score").textContent = data.scores.complianceScore;
  document.getElementById("remediation-readiness").textContent = data.scores.remediationReadiness;
  document.getElementById("audit-pack-readiness").textContent = data.scores.auditPackReadiness;

  document.getElementById("executive-summary").innerHTML = [
    ["Situation", data.executiveSummary.situation],
    ["Business risk", data.executiveSummary.businessRisk],
    ["Decision needed", data.executiveSummary.decisionNeeded],
    ["2-minute message", data.executiveSummary.twoMinuteMessage]
  ].map(([title, value]) => `<p><strong>${title}</strong><br>${value}</p>`).join("");

  document.getElementById("compliance-list").innerHTML = data.complianceStatus.map(item => `
    <div class="item">
      <strong>${item.framework}</strong> <span class="pill">${item.status}</span><br>
      Score: ${item.score}<br>
      Gap: ${item.gap}<br>
      Evidence: <code>${item.evidenceRef}</code>
    </div>
  `).join("");

  document.getElementById("remediation-list").innerHTML = data.remediationReadiness.map(item => `
    <div class="item">
      <strong>${item.findingId}</strong> <span class="pill">${item.readiness}</span><br>
      Next action: ${item.nextAction}<br>
      Verification: ${item.verification}
    </div>
  `).join("");

  document.getElementById("findings-table").innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Severity</th>
          <th>Finding</th>
          <th>Business impact</th>
          <th>Evidence</th>
          <th>Patch path</th>
        </tr>
      </thead>
      <tbody>
        ${data.topFindings.map(finding => `
          <tr>
            <td class="severity-${finding.severity}">${finding.severity}</td>
            <td><strong>${finding.title}</strong><br><code>${finding.id}</code></td>
            <td>${finding.businessImpact}</td>
            <td><code>${finding.evidenceRef}</code></td>
            <td>${finding.patchRef}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  document.getElementById("audit-pack").innerHTML = `
    <div class="item"><strong>Status</strong><br>${data.auditPackStatus.status}</div>
    <div class="item"><strong>Manifest</strong><br><code>${data.auditPackStatus.manifest}</code></div>
    <div class="item"><strong>Auditor path</strong><br>${data.auditPackStatus.auditorPath}</div>
    <div class="item"><strong>Evidence packs</strong><br>${data.auditPackStatus.evidencePacks.map(path => `<code>${path}</code>`).join("<br>")}</div>
  `;
}

loadDashboard().catch(error => {
  document.body.innerHTML = `<pre>Dashboard load failed: ${error.message}</pre>`;
});
