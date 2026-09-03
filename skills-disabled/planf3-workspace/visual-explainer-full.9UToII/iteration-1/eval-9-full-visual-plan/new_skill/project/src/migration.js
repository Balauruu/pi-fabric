const stages = ['add-nullable-columns', 'backfill-batches', 'enforce-constraints'];
const batchSize = 500;

module.exports = { stages, batchSize };
