const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#10141f';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = '#5b7cff';
ctx.font = '16px sans-serif';
ctx.fillText('loading…', 20, 30);
