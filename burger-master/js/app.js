/* Arranque de la aplicación */
(function (BM) {
  document.addEventListener('DOMContentLoaded', () => {
    BM.Store.load();
    BM.UI.go('menu');
  });
}(window.BM));
