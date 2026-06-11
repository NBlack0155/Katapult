async function findJobIdByNodeId() {
  const nodeId = prompt("Enter Node ID:");
  if (!nodeId) return;

  try {
    const snap = await FirebaseWorker
      .ref('photoheight/job_permissions/ervin_cable_construction_llc/list')
      .once('value');

    const jobList = snap.val();

    if (!jobList) {
      console.log("No job list found.");
      return null;
    }

    const jobIds = Object.keys(jobList);
    const batchSize = 10;

    console.log(`Scanning ${jobIds.length} jobs (batch size ${batchSize})...`);

    let checked = 0;

    for (let i = 0; i < jobIds.length; i += batchSize) {
      const batch = jobIds.slice(i, i + batchSize);

      const results = await Promise.all(
        batch.map(jobId =>
          FirebaseWorker
            .ref(`photoheight/jobs/${jobId}/nodes/${nodeId}`)
            .once('value')
            .then(snap => ({ jobId, exists: snap.exists() }))
            .catch(() => ({ jobId, exists: false }))
        )
      );

      for (const r of results) {
        checked++;

        if (checked === 1 || checked % 50 === 0) {
          console.log(`Checked ${checked}/${jobIds.length} jobs...`);
        }

        if (r.exists) {
          console.log("MATCH FOUND");
          console.log("jobId:", r.jobId);
          console.log("nodeId:", nodeId);

          alert(`FOUND JOB:\n${r.jobId}`);

          return r.jobId;
        }
      }
    }

    console.log("No match found for nodeId:", nodeId);
    alert("No match found");

    return null;

  } catch (err) {
    console.error("Fatal error:", err);
    return null;
  }
}
