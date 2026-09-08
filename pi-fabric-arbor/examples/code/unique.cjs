// Preserve the first occurrence of each value, in input order.
module.exports = values => values.filter((value, index) => values.indexOf(value) === index);
