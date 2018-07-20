const log4js = require('log4js');
const log_file_name = 'logs/domian_proxy_log.log';

log4js.configure({
    appenders: {
        prog_log: {
            type: 'file',
            filename: log_file_name,
            maxLogSize: 10 * 1000000, // 10 mb
            backups: 1000
        },
        console_log: {
            type: 'console',
        }
    },
    categories: {
        default: {
            appenders: ['prog_log', 'console_log'],
            level: 'debug'
        }
    }
});


module.exports = log4js.getLogger();