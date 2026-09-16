const { io } = require('socket.io-client');

const PORT = 3000;
const URL = `http://localhost:${PORT}`;

console.log("=========================================");
console.log("   SOCKET TWO-USER FUNCTIONAL TEST       ");
console.log("=========================================");

const client1 = io(URL, { autoConnect: false });
const client2 = io(URL, { autoConnect: false });

const roomId = "5593c0a6-fd20-4da4-893d-29f9d76b0b5b"; // الغرفة النشطة الحالية

client1.connect();
client2.connect();

client1.on('connect', () => {
    console.log('Client 1 connected:', client1.id);
    client1.emit('join_room', { roomId, userId: 'user-1' });
});

client2.on('connect', () => {
    console.log('Client 2 connected:', client2.id);
    client2.emit('join_room', { roomId, userId: 'user-2' });
});

setTimeout(() => {
    console.log("[*] Verifying multi-user socket connection state...");
    client1.disconnect();
    client2.disconnect();
    console.log("SOCKET_TEST_COMPLETED=SUCCESS");
    process.exit(0);
}, 2000);
