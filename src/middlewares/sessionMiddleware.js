import RedisSession from 'telegraf-session-redis-upd';
import config from 'config';

const session = new RedisSession({
  store: {
    host: process.env.TELEGRAM_SESSION_HOST || '127.0.0.1',
    port: process.env.TELEGRAM_SESSION_PORT || 6379,
    password: config.get('REDIS_PASSWORD') || '',
  },
});

export default session;
