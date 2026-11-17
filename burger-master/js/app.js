/* Arranque de la aplicación */
(function (BM) {
  function start() {
    BM.Store.load();
    BM.UI.go('menu');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}(window.BM));
