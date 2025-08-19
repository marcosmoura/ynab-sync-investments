export default {
  '*.{js,ts,json,css,md,yaml}': ['prettier --write', 'oxlint --fix', 'eslint --fix'],
};
