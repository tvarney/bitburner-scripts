// @ts-check

/**
 * @module logging
 */

/**
 * LogLevel is an enum which contains the allowed logging levels.
 */
export class LogLevel {
    /**
     * None indicates an invalid log level which is skipped.
     */
    static None = new LogLevel("", "")
    static Debug = new LogLevel("debug", "INFO<DEBUG> ")
    static Info = new LogLevel("info", "INFO ")
    static Warn = new LogLevel("warn", "WARN ")
    static Error = new LogLevel("error", "ERROR ")

    /**
     * Create a new LogLevel with the given name and prefix
     * 
     * @param {string} name 
     * @param {string} prefix 
     */
    constructor(name, prefix) {
        this.name = name
        this.prefix = prefix
    }
}

/**
 * ToastStyle is an enum which contains the allowed styles for a Toast
 */
export class ToastStyle {
    static None = new ToastStyle("")
    static Success = new ToastStyle("success")
    static Info = new ToastStyle("info")
    static Warning = new ToastStyle("warning")
    static Error = new ToastStyle("error")

    /**
     * Create a new ToastStyle value
     * 
     * @param {string} name 
     */
    constructor(name) {
        this.name = name
    }
}

/**
 * Logger is a class which manages logging to the terminal and process log,
 * as well as 
 */
export class Logger {
    /**
     * Create a new Logger with the given NS instance
     * 
     * @param {?NS} ns The NS instance to use for this logger
     */
    constructor(ns) {
        /** @type {?NS} */
        this._ns = ns
        /** @type {number} */
        this._termVerbosity = 1
        /** @type {number} */
        this._logVerbosity = 1
        /** @type {number} */
        this._toastVerbosity = 1
        /** @type {Object.<string, boolean>} */
        this._termFlags = {}
        this._termFlags[LogLevel.Debug.name] = false
        this._termFlags[LogLevel.Info.name] = true
        this._termFlags[LogLevel.Warn.name] = true
        this._termFlags[LogLevel.Error.name] = true
        /** @type {Object.<string, boolean>} */
        this._logFlags = {}
        this._logFlags[LogLevel.Debug.name] = false
        this._logFlags[LogLevel.Info.name] = true
        this._logFlags[LogLevel.Warn.name] = true
        this._logFlags[LogLevel.Error.name] = true

        /** @type {boolean} */
        this._tieTermToLog = true
        /** @type {boolean} */
        this._tieLogToTerm = false
    }

    /**
     * Set and return the terminal verbosity for this logger
     * 
     * If the value given is less than 0, this function will not update the
     * verbosity of the logger.
     * 
     * @param {number} [value=-1] The verbosity level to set, or -1 to just return current value
     * @returns {number} The terminal verbosity of this logger
     */
    termVerbosity(value = -1) {
        if(value >= 0) {
            this._ns?.tprintf("Verbosity: %v", value)
            this._termVerbosity = value
        }
        return this._termVerbosity
    }

    /**
     * Set and return the log verbosity for this logger
     * 
     * If the value given is less than 0, this function will not update the
     * verbosity of the logger.
     * 
     * @param {number} [value=-1] The verbosity level to set, or -1 to just return current value
     * @returns {number} The log verbosity of this logger
     */
    logVerbosity(value = -1) {
        if(value >= 0) {
            this._logVerbosity = value
        }
        return this._logVerbosity
    }

    /**
     * Set and return the toast verbosity for this logger
     * 
     * If the value given is less than 0, this function will not update the
     * verbosity of the logger.
     * 
     * @param {number} [value=-1] The verbosity level to set, or -1 to just return current value
     * @returns {number} The toast verbosity of this logger
     */
    toastVerbosity(value = -1) {
        if(value >= 0) {
            this._toastVerbosity = value
        }
        return this._toastVerbosity
    }

    /**
     * Turn on or off terminal to log tying
     * 
     * This feature is turned on by default.
     * 
     * If this feature is turned on, all messages written to the the terminal
     * will also be redirected to the log. Note: the conditions for writing to
     * the log are evaluated separately than the terminal. If a term logging
     * statement would have been skipped it may still be written to the log,
     * and vice-versa with this option.
     * 
     * E.g. if this option is on, and `termDebug(true)` and `logDebug(false)`
     * were set, then a call to `tdebug("...")` would be written to the log
     * and vice-versa.
     * 
     * @param {boolean} on If the terminal output should be tied to the process log
     */
    tieTermToLog(on) {
        this._tieTermToLog = on
    }

    /**
     * Turn on or off log to terminal tying
     * 
     * This feature is turned off by default.
     * 
     * If this feature is turned on, all messages written to the process log
     * will also be redirected to the terminal. Note: the conditions for
     * writing to the terminal are evaluated separately than the log. If a log
     * message would have been skipped it may still be written to the terminal,
     * and vice-versa with this option.
     * 
     * @param {boolean} on If the log output should be tied to the terminal
     */
    tieLogToTerm(on) {
        this._tieLogToTerm = on
    }

    /**
     * Enable or disable terminal debug output
     * 
     * @param {boolean} on If debug output is enabled
     */
    termDebug(on) {
        this._termFlags[LogLevel.Debug.name] = on
    }

    /**
     * Enable or disable terminal info output
     * 
     * @param {boolean} on 
     */
    termInfo(on) {
        this._termFlags[LogLevel.Info.name] = on
    }

    /**
     * Enable or disable terminal warning output
     * 
     * @param {boolean} on 
     */
    termWarn(on) {
        this._termFlags[LogLevel.Warn.name] = on
    }

    /**
     * Enable or disable terminal error output
     * 
     * @param {boolean} on 
     */
    termError(on) {
        this._termFlags[LogLevel.Error.name] = on
    }

    /**
     * Enable or disable process log debug output
     * 
     * @param {boolean} on 
     */
    logDebug(on) {
        this._logFlags[LogLevel.Debug.name] = on
    }

    /**
     * Enable or disable process log info output
     * 
     * @param {boolean} on 
     */
    logInfo(on) {
        this._logFlags[LogLevel.Info.name] = on
    }

    /**
     * Enable or disable process log warning output
     * 
     * @param {boolean} on 
     */
    logWarn(on) {
        this._logFlags[LogLevel.Warn.name] = on
    }

    /**
     * Enable or disable process log error output
     * 
     * @param {boolean} on 
     */
    logError(on) {
        this._logFlags[LogLevel.Error.name] = on
    }

    /**
     * Enable or disable terminal output for the given level
     * 
     * @param {LogLevel} level 
     * @param {boolean} on 
     */
    enableTermLevel(level, on) {
        if(!(level.name in this._termFlags)) {
            throw new Error("unknown log level " + JSON.stringify(level.name))
        }
        this._termFlags[level.name] = on
    }

    /**
     * 
     * @param {LogLevel} level 
     * @param {boolean} on 
     */
    enableLogLevel(level, on) {
        if(!(level.name in this._termFlags)) {
            throw new Error("unknown log level " + JSON.stringify(level.name))
        }
        this._logFlags[level.name] = on
    }

    /**
     * 
     * @param {number} vLogger 
     * @param {number} vMessage 
     * @param {LogLevel} level 
     * @param {Object.<string, boolean>} flags 
     * @returns 
     */
    _shouldOutput(vLogger, vMessage, level, flags) {
        if(level.name == "") {
            return false
        }
        if(!(level.name in flags)) {
            throw new Error("unknown log level " + JSON.stringify(level.name))
        }
        return (vLogger >= vMessage && flags[level.name])
    }

    /**
     * Write a debug message to the terminal
     * 
     * @param {string} fmt 
     * @param {...any} args 
     */
    tDebug(fmt, ...args) {
        this.tLog(1, LogLevel.Debug, fmt, ...args)
    }

    /**
     * Write a debug message of the given verbosity to the terminal
     * 
     * @param {number} verbosity
     * @param {string} fmt 
     * @param {...any} args 
     */
    tDebugV(verbosity, fmt, ...args) {
        this.tLog(verbosity, LogLevel.Debug, fmt, ...args)
    }

    /**
     * Write an info message to the terminal
     * 
     * @param {string} fmt 
     * @param {...any} args 
     */
    tInfo(fmt, ...args) {
        this.tLog(1, LogLevel.Info, fmt, ...args)
    }

    /**
     * Write an info message of the given verbosity to the terminal
     * 
     * @param {number} verbosity 
     * @param {string} fmt 
     * @param {...any} args 
     */
    tInfoV(verbosity, fmt, ...args) {
        this.tLog(verbosity, LogLevel.Info, fmt, ...args)
    }

    /**
     * Write a warning message to the terminal
     * 
     * @param {string} fmt 
     * @param {...any} args 
     */
    tWarn(fmt, ...args) {
        this.tLog(1, LogLevel.Warn, fmt, ...args)
    }

    /**
     * Write a warning message of the given verbosity to the terminal
     * 
     * @param {number} verbosity 
     * @param {string} fmt 
     * @param {...any} args 
     */
    tWarnV(verbosity, fmt, ...args) {
        this.tLog(verbosity, LogLevel.Warn, fmt, ...args)
    }

    /**
     * Write an error message to the terminal
     * 
     * @param {string} fmt 
     * @param {...any} args 
     */
    tError(fmt, ...args) {
        this.tLog(1, LogLevel.Error, fmt, ...args)
    }

    /**
     * Write an error message of the given verbosity to the terminal
     * 
     * @param {number} verbosity 
     * @param {string} fmt 
     * @param {...any} args 
     */
    tErrorV(verbosity, fmt, ...args) {
        this.tLog(verbosity, LogLevel.Error, fmt, ...args)
    }

    /**
     * Write a log message to the terminal
     * 
     * If the given verbosity is higher than the logger verbosity or the
     * logger has the given level disabled, this function will not write to
     * the terminal.
     * 
     * If `tieTerminalToLog(true)` has been called, then this may write to
     * the process log depending on the settings for that.
     * 
     * @param {number} verbosity 
     * @param {LogLevel} level 
     * @param {string} fmt 
     * @param {...any} args 
     */
    tLog(verbosity, level, fmt, ...args) {
        this.tLogRaw(verbosity, level, fmt, ...args)
        if(this._tieTermToLog) {
            this.lLogRaw(verbosity, level, fmt, ...args)
        }
    }

    /**
     * Write a log message to the terminal without tying it to the process log.
     * 
     * This allows for writing to the terminal bypassing the terminal-to-log
     * tying that may be done by `tLog`. This is useful for instances where you
     * want to manually write to both without relying on that setting.
     * 
     * @param {number} verbosity 
     * @param {LogLevel} level 
     * @param {string} fmt 
     * @param {...any} args 
     */
    tLogRaw(verbosity, level, fmt, ...args) {
        if(this._ns && this._shouldOutput(this._termVerbosity, verbosity, level, this._termFlags)) {
            this._ns.tprintf(level.prefix + fmt, ...args)
        }
    }

    /**
     * Write a log message to the process log
     * 
     * If the given verbosity is higher than the logger verbosity or the
     * logger has the given level disabled, this function will not write to
     * the process log.
     * 
     * If `tieLogToTerminal(true)` has been called, then this may write to
     * the process log depending on the settings for that.
     * 
     * @param {number} verbosity 
     * @param {LogLevel} level 
     * @param {string} fmt 
     * @param {...any} args 
     */
    lLog(verbosity, level, fmt, ...args) {
        this.lLogRaw(verbosity, level, fmt, ...args)
        if(this._tieLogToTerm) {
            this.tLogRaw(verbosity, level, fmt, ...args)
        }
    }

    /**
     * Write a log message to the process log without tying it to the terminal.
     * 
     * This allows for writing to the process log bypassing the log-to-terminal
     * tying that may be done by `lLog()`. This is useful for instances where
     * you want to manually write to both without relying on that setting.
     * 
     * @param {number} verbosity 
     * @param {LogLevel} level 
     * @param {string} fmt 
     * @param {...any} args 
     */
    lLogRaw(verbosity, level, fmt, ...args) {
        if(this._ns && this._shouldOutput(this._logVerbosity, verbosity, level, this._logFlags)) {
            this._ns.printf(level.prefix + fmt, ...args)
        }
    }
}

var global = new Logger(null)

/**
 * Initialize the global logger instance
 * 
 * This should be called immediately from the scripts `main` method with the
 * NS instance passed to it.
 * 
 * Calling this with `null` as the argument effectively disables logging.
 * 
 * Previously held references to the global should still be valid after this
 * call.
 * 
 * @param {?NS} ns 
 */
export function InitGlobal(ns) {
    // Set the NS handle inside our global
    global._ns = ns
    ns?.tprint("Set NS instance on global logger")
}

/**
 * Get the global logger
 * 
 * @returns {Logger} The global logger instance
 */
export function GlobalLogger() {
    return global
}
