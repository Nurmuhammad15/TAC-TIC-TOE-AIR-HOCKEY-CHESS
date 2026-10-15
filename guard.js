// the game is reachable only through the menu; direct open or reload goes back to it
let fromMenu = false;
try {
    fromMenu = sessionStorage.getItem('fromMenu') === '1';
    sessionStorage.removeItem('fromMenu');
} catch (e) {}
if (!fromMenu) location.replace('index.html');
