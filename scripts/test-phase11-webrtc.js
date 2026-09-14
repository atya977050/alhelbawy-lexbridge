const { io } = require('socket.io-client');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const BASE = 'http://127.0.0.1:3458';

function request(path, options = {}) {
    const args = [
        '-sS',
        '-X', options.method || 'GET'
    ];

    for (const header of options.headers || []) {
        args.push('-H', header);
    }

    if (options.body) {
        args.push(
            '-H', 'Content-Type: application/json',
            '-d', JSON.stringify(options.body)
        );
    }

    args.push(`${BASE}${path}`);

    const output = execFileSync('curl', args, {
        encoding: 'utf8'
    });

    return JSON.parse(output);
}

function register(username, displayName) {
    return request('/api/accounts/register', {
        method: 'POST',
        body: {
            username,
            displayName,
            password: 'Phase11Password!'
        }
    });
}

function login(username) {
    return request('/api/auth/login', {
        method: 'POST',
        body: {
            username,
            password: 'Phase11Password!'
        }
    });
}

function connect(token) {
    return new Promise((resolve, reject) => {
        const socket = io(BASE, {
            auth: { token },
            transports: ['websocket']
        });

        const timer = setTimeout(() => {
            socket.disconnect();
            reject(new Error('SOCKET_TIMEOUT'));
        }, 5000);

        socket.once('connect', () => {
            clearTimeout(timer);
            resolve(socket);
        });

        socket.once('connect_error', error => {
            clearTimeout(timer);
            reject(error);
        });
    });
}

function emitAck(socket, event, payload) {
    return new Promise(resolve => {
        socket.emit(event, payload, response => {
            resolve(response);
        });
    });
}

function waitForEvent(socket, event) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`${event}_NOT_RECEIVED`));
        }, 5000);

        socket.once(event, data => {
            clearTimeout(timer);
            resolve(data);
        });
    });
}

async function main() {
    const suffix = crypto.randomBytes(4).toString('hex');

    const hostUsername = `p11host_${suffix}`;
    const viewerUsername = `p11viewer_${suffix}`;

    if (!register(hostUsername, 'Phase 11 Host').ok) {
        throw new Error('REGISTER_HOST_FAILED');
    }

    if (!register(viewerUsername, 'Phase 11 Viewer').ok) {
        throw new Error('REGISTER_VIEWER_FAILED');
    }

    console.log('REGISTER_OK');

    const hostLogin = login(hostUsername);
    const viewerLogin = login(viewerUsername);

    if (!hostLogin.ok || !viewerLogin.ok) {
        throw new Error('LOGIN_FAILED');
    }

    console.log('LOGIN_OK');

    const roomResponse = request('/api/rooms/me', {
        headers: [
            `Authorization: Bearer ${hostLogin.session.token}`
        ]
    });

    const roomId = roomResponse?.room?.room_id;

    if (!roomId) {
        throw new Error('ROOM_NOT_FOUND');
    }

    console.log(`ROOM_OK: ${roomId}`);

    const start = request('/api/room-engine/start', {
        method: 'POST',
        headers: [
            `Authorization: Bearer ${hostLogin.session.token}`
        ]
    });

    if (!start.ok) {
        throw new Error('ROOM_START_FAILED');
    }

    console.log('ROOM_START_OK');

    const host = await connect(hostLogin.session.token);
    const viewer = await connect(viewerLogin.session.token);

    console.log('SOCKETS_CONNECTED');

    const hostJoin = await emitAck(host, 'room:join', { roomId });
    const viewerJoin = await emitAck(viewer, 'room:join', { roomId });

    if (!hostJoin?.ok || !viewerJoin?.ok) {
        throw new Error('ROOM_JOIN_FAILED');
    }

    console.log('ROOM_JOIN_OK');

    const offerPayload = {
        type: 'offer',
        sdp: 'phase11-test-offer'
    };

    const offerWait = waitForEvent(viewer, 'webrtc:offer');

    const offerAck = await emitAck(host, 'webrtc:offer', {
        roomId,
        targetSocketId: viewer.id,
        payload: offerPayload
    });

    if (!offerAck?.ok) {
        throw new Error(`OFFER_SEND_FAILED:${offerAck?.error}`);
    }

    const offer = await offerWait;

    if (
        offer.roomId !== roomId ||
        offer.fromSocketId !== host.id ||
        offer.payload?.sdp !== offerPayload.sdp
    ) {
        throw new Error('OFFER_DATA_INVALID');
    }

    console.log('WEBRTC_OFFER_OK');

    const answerPayload = {
        type: 'answer',
        sdp: 'phase11-test-answer'
    };

    const answerWait = waitForEvent(host, 'webrtc:answer');

    const answerAck = await emitAck(viewer, 'webrtc:answer', {
        roomId,
        targetSocketId: host.id,
        payload: answerPayload
    });

    if (!answerAck?.ok) {
        throw new Error(`ANSWER_SEND_FAILED:${answerAck?.error}`);
    }

    const answer = await answerWait;

    if (
        answer.roomId !== roomId ||
        answer.fromSocketId !== viewer.id ||
        answer.payload?.sdp !== answerPayload.sdp
    ) {
        throw new Error('ANSWER_DATA_INVALID');
    }

    console.log('WEBRTC_ANSWER_OK');

    const icePayload = {
        candidate: 'phase11-test-candidate',
        sdpMid: '0',
        sdpMLineIndex: 0
    };

    const iceWait = waitForEvent(
        viewer,
        'webrtc:ice-candidate'
    );

    const iceAck = await emitAck(
        host,
        'webrtc:ice-candidate',
        {
            roomId,
            targetSocketId: viewer.id,
            payload: icePayload
        }
    );

    if (!iceAck?.ok) {
        throw new Error(`ICE_SEND_FAILED:${iceAck?.error}`);
    }

    const ice = await iceWait;

    if (
        ice.roomId !== roomId ||
        ice.fromSocketId !== host.id ||
        ice.payload?.candidate !== icePayload.candidate
    ) {
        throw new Error('ICE_DATA_INVALID');
    }

    console.log('WEBRTC_ICE_OK');

    host.disconnect();
    viewer.disconnect();

    const stop = request('/api/room-engine/stop', {
        method: 'POST',
        headers: [
            `Authorization: Bearer ${hostLogin.session.token}`
        ]
    });

    if (!stop.ok) {
        throw new Error('ROOM_STOP_FAILED');
    }

    console.log('ROOM_STOP_OK');

    console.log('========================================');
    console.log('PHASE 11 SIGNALING SUCCESS');
    console.log('========================================');
}

main().catch(error => {
    console.error('PHASE11_FAILED');
    console.error(error.message);
    process.exit(1);
});
