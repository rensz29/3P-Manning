let ioInstance = null;

function initSocket(io) {
  ioInstance = io;
}

function getIo() {
  return ioInstance;
}

function roomForDate(date) {
  return `assignments:${date}`;
}

module.exports = { initSocket, getIo, roomForDate };

