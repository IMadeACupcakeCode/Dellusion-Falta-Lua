try {
  require('./commands/cartasecreta.js');
  console.log('cartasecreta OK');
} catch (e) {
  console.error('ERRO:', e.message);