// Read-only service diagnostics. Credentials remain inside firebase-tools.
const { getProjectDefaultAccount } = require('../.firebase-deploy-temp/node_modules/firebase-tools/lib/auth');
const { requireAuth } = require('../.firebase-deploy-temp/node_modules/firebase-tools/lib/requireAuth');
const { Client } = require('../.firebase-deploy-temp/node_modules/firebase-tools/lib/apiv2');

(async () => {
  const account = getProjectDefaultAccount(process.cwd());
  await requireAuth({ project: 'mirjaswork', ...account });
  const checks = [
    ['billing', 'https://cloudbilling.googleapis.com', '/projects/mirjaswork/billingInfo', {}],
    ['database', 'https://firestore.googleapis.com', '/projects/mirjaswork/databases/(default)', {}],
    ...['document/read_ops_count', 'document/write_ops_count', 'document/read_count', 'document/write_count', 'network/sent_bytes_count'].map(metric => [metric, 'https://monitoring.googleapis.com', '/projects/mirjaswork/timeSeries', {
      filter: `metric.type="firestore.googleapis.com/${metric}"`,
      'interval.startTime': new Date(Date.now() - 24 * 3600000).toISOString(),
      'interval.endTime': new Date().toISOString(),
      'aggregation.alignmentPeriod': '3600s', 'aggregation.perSeriesAligner': 'ALIGN_SUM', pageSize: 1000
    }])
  ];
  for (const [label, urlPrefix, path, queryParams] of checks) {
    try {
      const result = await new Client({ urlPrefix, apiVersion: label.endsWith('_count') ? 'v3' : 'v1' }).get(path, { queryParams });
      const body = result.body;
      console.log(JSON.stringify({ check: label, result: label === 'billing' ? { billingEnabled: body.billingEnabled } : label === 'database' ? { locationId: body.locationId, type: body.type, freeTier: body.freeTier } : (body.timeSeries || []).map(series => ({ labels: series.metric.labels, total24h: series.points.reduce((sum, point) => sum + Number(point.value.int64Value || point.value.doubleValue || 0), 0), recent: series.points.slice(0, 7) })) }));
    } catch (error) { console.log(JSON.stringify({ check: label, error: error.message })); }
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
