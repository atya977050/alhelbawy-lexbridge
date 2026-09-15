
const { io } = require('socket.io-client');
const http = require('http');

const user = {
    username: 'phase8_room_user',
    password: 'Phase8_Test_123!'
};

function request(path, method, body, token) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : '';

        const req = http.request({
            hostname: '127.0.0.1',
            port: 3000,
            path,
            method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
        }, res => {
            let out = '';

            res.on('data', chunk => out += chunk);

            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        body: JSON.parse(out)
                    });
                } catch {
                    reject(new Error(`HTTP ${res.statusCode}: ${out}`));
                }
            });
        });

        req.on('error', reject);
        req.end(data);
    });
}

(async () => {
    console.log('========================================');
    console.log(' PHASE 9 SOCKET.IO TEST');
    console.log('========================================');

    const login = await request(
        '/api/auth/login',
        'POST',
        user
    );

    if (!login.body.ok) {
        throw new Error('LOGIN_FAILED');
    }

    const token = login.body.session.token;
    console.log('LOGIN_OK');

    const roomResponse = await request(
        '/api/rooms/me',
        'GET',
        null,
        token
    );

    const roomId = roomResponse.body.room.room_id;
    console.log(`ROOM_OK: ${roomId}`);

    const start = await request(
        '/api/room-engine/start',
        'POST',
        null,
        token
    );

    if (!start.body.ok) {
        throw new Error('ENGINE_START_FAILED');
    }

    console.log('ENGINE_START_OK');

    const socket = io('http://127.0.0.1:3000', {
        auth: { token },
        transports: ['websocket']
    });

    socket.on('connect_error', error => {
        console.error('SOCKET_CONNECT_ERROR:', error.message);
        process.exit(1);
    });

    socket.on('connect', () => {
        console.log('SOCKET_CONNECTED');

        socket.emit(
            'room:join',
            { roomId },
            result => {
                if (!result || !result.ok) {
                    console.error('ROOM_JOIN_FAILED:', result);
                    process.exit(1);
                }

                console.log('SOCKET_ROOM_JOIN_OK');

                socket.emit(
                    'room:state',
                    { roomId },
                    state => {
                        if (!state || !state.ok) {
                            console.error('ROOM_STATE_FAILED:', state);
                            process.exit(1);
                        }

                        console.log('SOCKET_ROOM_STATE_OK');

                        socket.emit(
                            'room:leave',
                            { roomId },
                            leave => {
                                if (
                                    !leave ||
                                    leave.ok ||
                                    leave.error !== 'HOST_MUST_STOP_ROOM'
                                ) {
                                    console.error(
                                        'HOST_LEAVE_PROTECTION_FAILED:',
                                        leave
                                    );
                                    process.exit(1);
                                }

                                console.log(
                                    'SOCKET_HOST_LEAVE_PROTECTION_OK'
                                );

                                socket.close();

                                request(
                                    '/api/room-engine/stop',
                                    'POST',
                                    null,
                                    token
                                ).then(stop => {
                                    if (!stop.body.ok) {
                                        throw new Error(
                                            'ENGINE_STOP_FAILED'
                                        );
                                    }

                                    console.log('ENGINE_STOP_OK');

                                    console.log(
                                        '========================================'
                                    );
                                    console.log(
                                        ' PHASE 9 SUCCESS'
                                    );
                                    console.log(
                                        '========================================'
                                    );

                                    process.exit(0);
                                }).catch(error => {
                                    console.error(error.message);
                                    process.exit(1);
                                });
                            }
                        );
                    }
                );
            }
        );
    });
})();
