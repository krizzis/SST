export function createLogger(namespace, { debugEnabled = false } = {}) {
    let isDebugEnabled = debugEnabled;

    function write(level, event, details = {}) {
        const payload = {
            namespace,
            level,
            event,
            ...details,
        };

        if (level === 'ERROR') {
            console.error(payload);
            return;
        }

        if (level === 'WARN') {
            console.warn(payload);
            return;
        }

        console.log(payload);
    }

    return {
        setDebugEnabled(nextValue) {
            isDebugEnabled = Boolean(nextValue);
        },

        info(event, details) {
            write('INFO', event, details);
        },

        warn(event, details) {
            write('WARN', event, details);
        },

        error(event, details) {
            write('ERROR', event, details);
        },

        debug(event, details) {
            if (!isDebugEnabled) {
                return;
            }

            write('DEBUG', event, details);
        },
    };
}
