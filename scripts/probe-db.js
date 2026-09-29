// Exit 0, если postgres принимает TCP-соединения, иначе 1.
// Адрес повторяет захардкоженные значения src/tests/app.testingModule.ts.
const net = require("net");

const socket = net.connect(5432, "localhost");

const fail = () => {
  socket.destroy();
  process.exit(1);
};

socket.setTimeout(1500, fail);
socket.on("error", fail);
socket.on("connect", () => {
  socket.destroy();
  process.exit(0);
});
