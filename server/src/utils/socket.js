let ioInstance;
export function setIO(io) { ioInstance = io; }
export function getIO() { return ioInstance; }
export function notifyUser(userId, payload) {
  if (ioInstance) ioInstance.to(`user:${userId}`).emit('notification:new', payload);
}
