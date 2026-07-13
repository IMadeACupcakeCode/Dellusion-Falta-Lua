// Syntax validation test
try {
  require('./utils/prefix.js');
  require('./utils/tempo.js');
  require('./utils/lembretesStore.js');
  require('./commands/lembrete.js');
  console.log('SYNTAX_OK');
} catch (e) {
  if (e instanceof SyntaxError) {
    console.error('SYNTAX_ERROR:', e.message);
    process.exit(1);
  } else {
    console.error('RUNTIME_ERROR:', e.message);
    process.exit(0);
  }
}