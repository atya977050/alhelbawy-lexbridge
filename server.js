const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { registerRoomSocket } = require('./server/socket/room-socket');
const { execFileSync } = require('child_process');
const authRouter = require('./server/routes/auth');
const profileRouter = require('./server/routes/profile');
const roomsRouter = require('./server/routes/rooms');
const roomCenterRouter = require('./server/routes/room-center');
const roomEngineRouter = require('./server/routes/room-engine');
const meRouter = require('./server/routes/me');
const socialRouter = require('./server/routes/social');
const accountsRouter = require('./server/routes/accounts');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

registerRoomSocket(io);

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DB_PATH = path.join(
    ROOT,
    'data',
    'lexbridge.sqlite'
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/accounts', accountsRouter);
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/room-center', roomCenterRouter);
app.use('/api/room-engine', roomEngineRouter);
app.use('/api/me', meRouter);
app.use('/api/social', socialRouter);

app.use(
    express.static(
        path.join(ROOT, 'public')
    )
);

function dbQuery(sql) {
    const output = execFileSync(
        'sqlite3',
        ['-json', DB_PATH, sql],
        { encoding: 'utf8' }
    ).trim();

    return output ? JSON.parse(output) : [];
}

app.get('/api/health', (req, res) => {
    try {
        dbQuery('SELECT 1 AS ok;');

        res.json({
            ok: true,
            app: 'الهلباوى lexbridge',
            database: 'ok',
            time: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            ok: false,
            database: 'error',
            error: error.message
        });
    }
});

app.get('/api/status', (req, res) => {
    try {
        const users =
            dbQuery(
                'SELECT COUNT(*) AS count FROM users;'
            )[0].count;

        const rooms =
            dbQuery(
                'SELECT COUNT(*) AS count FROM rooms;'
            )[0].count;

        const wallets =
            dbQuery(
                'SELECT COUNT(*) AS count FROM wallets;'
            )[0].count;

        res.json({
            ok: true,
            users,
            rooms,
            wallets
        });
    } catch (error) {
        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

app.get('*', (req, res) => {
    res.sendFile(
        path.join(
            ROOT,
            'public',
            'index.html'
        )
    );
});

io.on('connection', (socket) => {
    console.log(
        'SOCKET_CONNECTED',
        socket.id
    );

    socket.on('disconnect', () => {
        console.log(
            'SOCKET_DISCONNECTED',
            socket.id
        );
    });
});

server.listen(PORT, () => {
    console.log('');
    console.log(
        '========================================'
    );
    console.log(
        '  الهلباوى lexbridge'
    );
    console.log(
        '  SERVER READY'
    );
    console.log(
        `  http://127.0.0.1:${PORT}`
    );
    console.log(
        '========================================'
    );
});
