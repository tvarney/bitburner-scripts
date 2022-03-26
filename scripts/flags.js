// @ts-check

/**
 * A better flag parsing library than `NS.flags`
 * 
 * It is important to note that due to all scripts being forced through
 * the `run` command which itself defines flags, short flags are not handled
 * properly without a leading `--` after the script name. E.g.
 * 
 *   `$ run /scripts/myscript.js -t 2 -- --long-opt -vvv -- unparsed`
 * 
 * Or, using the shorthand notation:
 * 
 *   `$ ./scripts/myscript.js -t 2 --tail -- --long-opt -vvv -- unparsed
 * 
 * Technically, this means you can do something like:
 * 
 *   `$ ./scripts/myscript.js -h -t 2`
 * 
 * without defining a `-t` flag, as the `run` command will parse it out.
 * Forgetting to use a leading `--` and using short options will result in
 * weird errors, such as:
 * 
 *   `$ ./scripts/myscript -p1010`
 * 
 * Running with the arguments: `["-p", "-1", "-0", "-1", "-0"]`.
 * 
 * This behavior sucks, and could be made significantly better by using a
 * smarter interface for threading, but for now it is what it is.
 * 
 * A (sort of) workaround would be to define aliases for common scripts which
 * generally won't need a thread count; e.g.
 * 
 *   `$ alias deploy='run /scripts/deploy.js --'`
 */

/**
 * Interface for classes which parse args
 * 
 * @interface FlagArgParser
 */
class FlagArgParser {
    /**
     * @returns {number} The number of arguments to expect
     */
    args() { throw new Error("not implemented") }

    /**
     * @param {?string} value An initial value to parse if non-null
     * @return {any} The initial value to use for a flag of this type
     */
    initialValue(value) { throw new Error("not implemented") }

    /**
     * @param {any} current The current accumulated value
     * @param {...string} args The arguments to accumulate
     * @return {any} The result of accumulating the args
     */
    accumulate(current, ...args) { throw new Error("not implemented") }

    /**
     * @return {string}
     */
    argsString() { throw new Error("not implemented") }
}

/**
 * @callback FlagAction
 */

/**
 * Flag class which allows arbitrary parsing of values
 * 
 * @member {?string} _short The short flag name
 * @member {string} _long The long flag name
 * @member {?Parser} _parser The parser to use for arguments
 * @member {any} _default The default value to use for this flag
 * @member {boolean} _forceExit
 * @member {function} _action
 */
 export class Flag {
    /**
     * @param {string} name The name of the flag
     * @param {?FlagArgParser} parser The parser
     */
    constructor(name, parser = null) {
        this._short = null
        this._long = name
        this._help = null
        this._parser = parser
        this._default = null
        this._forceExit = false
        this._action = null
    }

    /**
     * Set the short option flag name
     * 
     * @param {string} ch The short flag to use
     * @returns {Flag}
     */
    shortOpt(ch) {
        this._short = (ch.length == 0) ? null : ch[0]
        return this
    }

    /**
     * Set the default value
     * 
     * @param {?string} val The default value as a string to be parsed
     * @returns {Flag}
     */
    default(val) {
        this._default = val
        return this
    }

    /**
     * Set the argument parser for this flag
     * 
     * @param {?FlagArgParser} parser 
     * @returns {Flag}
     */
    parser(parser) {
        this._parser = parser
        return this
    }

    /**
     * Set the action to take on the flag being called
     * 
     * @param {FlagAction} fn An action callback which takes no arguments
     * @returns {Flag}
     */
    action(fn) {
        this._action = fn
        return this
    }

    /**
     * Set the force-exit behavior of this flag
     * 
     * @param {boolean} on 
     * @returns {Flag}
     */
    forceExit(on = true) {
        this._forceExit = on
        return this
    }

    /**
     * Set or unset the help message for a flag
     * 
     * @param {?string} msg The message to use, or null to unset
     * @returns {Flag}
     */
    help(msg = null) {
        this._help = msg
        return this
    }

    /**
     * Call the action callback if one was specified
     */
    doAction() {
        if(this._action != null) {
            this._action()
        }
    }

    /**
     * Return the expected number of args for the flag
     * 
     * This indicates how many values past the flag are consumed
     * by this flag. That is, for a value of zero, no args are
     * parsed, while for a value of 1 an extra 1 arg is parsed.
     * 
     * This should return 1 for values which may be specified
     * multiple times, with the parser accumulating the values.
     * 
     * Negative values have no special meaning and are treated as
     * if zero was returned.
     * 
     * @return {number}
     */
    args() {
        return this._parser == null ? 0 : this._parser.args()
    }

    /**
     * Add the given arguments to the data field
     * 
     * @param {Object<string, any>} data The parsed flags data
     * @param {...string} args The args to accumulate
     */
    accumulate(data, ...args) {
        // If a parser is specified, let it accumulate the value
        if (this._parser != null) {
            let existing = null
            // Get the existing value (should exist already)
            if (this._long in data) {
                existing = data[this._long]
            }
            // Update the data field with the result of accumulating the args
            data[this._long] = this._parser.accumulate(existing, ...args)
            return
        }

        // Otherwise, assume no args and handle as a 'flag' (bool-val)
        data[this._long] = true
    }

    /**
     * Get the initial value for an argument of this type
     * 
     * @return {any} The initial value to use for this argument type
     */
    initialValue() {
        if(this._parser != null) {
            return this._parser.initialValue(this._default)
        }
        return false
    }

    /**
     * Get the flag arguments string
     * 
     * @returns {string}
     */
    argsString() {
        if(this._parser != null) {
            return this._parser.argsString()
        }
        return ""
    }
}

/**
 * A parser for string arguments
 * 
 * @implements FlagArgParser
 */
export class StringParser {
    /**
     * @return {number} The number of args to consume
     */
    args() {
        return 1
    }

    /**
     * @param {any} current The current value in the data object
     * @param {string[]} args The args to be accumulated
     * 
     * @return {any} The new value of the flag
     */
    accumulate(current, ...args) {
        return args[0]
    }

    /**
     * @param {?string} val
     * @returns {any}
     */
    initialValue(val = null) {
        return val
    }

    /**
     * @returns {string}
     */
    argsString() {
        return "<string> "
    }
}

/**
 * A parser for number arguments
 * 
 * @implements FlagArgParser
 */
export class NumberParser {
    /**
     * @return {number} The number of args to consume
     */
    args() {
        return 1
    }

    /**
     * @param {any} current The current value in the data object
     * @param {string[]} args The args to be accumulated
     * 
     * @return {any} The new value of the flag
     */
    accumulate(current, ...args) {
        const arg = args[0]
        if(!arg) {
            throw new Error("missing accumulate value")
        }
        return parseFloat(arg)
    }

    /**
     * @param {?string} val
     * @returns {any}
     */
    initialValue(val) {
        if(val == null) {
            return null
        }
        try {
            return parseFloat(val)
        }catch(ex) {
            return null
        }
    }

    /**
     * @returns {string}
     */
    argsString() {
        return "<number>"
    }
}

/**
 * A parser for integer arguments
 * 
 * @implements FlagArgParser
 */
export class IntegerParser {
    /**
     * @return {number} The number of args to consume
     */
    args() {
        return 1
    }

    /**
     * @param {any} current The current value in the data object
     * @param {string[]} args The args to be accumulated
     * 
     * @return {any} The new value of the flag
     */
    accumulate(current, ...args) {
        const arg = args[0]
        if(!arg) {
            throw new Error("missing accumulate value")
        }
        return parseInt(arg)
    }

    /**
     * @param {?string} val
     * @returns {any}
     */
    initialValue(val) {
        if(!val) {
            return null
        }
        try {
            return parseInt(val)
        }catch(ex) {
            return null
        }
    }

    /**
     * @returns {string}
     */
    argsString() {
        return "<integer>"
    }
}

/**
 * A parser for integer arguments
 * 
 * @implements FlagArgParser
 */
class CounterParser {
    /**
     * 
     * @returns {number} The number of args
     */
    args() {
        return 0
    }

    /**
     * Get the initial value for the counter
     * 
     * @param {?string} val 
     */
    initialValue(val) {
        if(!val) {
            return 0
        }
        try {
            return parseInt(val)
        }catch(ex) {
            return 0
        }
    }

    /**
     * Add values to the current counter
     * 
     * @param {any} current
     * @param {...string} args
     * @return {any}
     */
    accumulate(current, ...args) {
        return Number(current) + 1
    }

    /**
     * Get the string representation of any arguments this flag accepts
     * 
     * @returns {string}
     */
    argsString() {
        return ""
    }
}

/**
 * Command line argument parser class
 * 
 * @member {NS} ns The bitburner namespace object to use
 * @member {Flag[]} flags The list of flags for this parser
 */
export class Parser {
    /**
     * @param {NS} ns
     * @param {?string} name The name of the program
     */
    constructor(ns, name = null) {
        this.ns = ns
        this.description = ""
        this.name = (name == null) ? ns.getScriptName() : name
        this.flags = [
            new Flag("help").shortOpt("h").action(() => this.printHelp()).forceExit(true).help("Print this message and exit")
        ]
        this.argsString = ""
        this.exit = true
    }

    /**
     * Create and return a new basic flag
     * 
     * @param {string} name The name of the flag
     * @return {Flag} A flag which takes no arguments
     */
    flag(name) {
        let f = new Flag(name, null)
        this.flags.push(f)
        return f
    }

    /**
     * Create and return a new flag which takes a single string
     * 
     * @param {string} name The name of the flag
     * @return {Flag} A flag which parses a string argument
     */
    string(name) {
        let f = new Flag(name, new StringParser())
        this.flags.push(f)
        return f
    }

    /**
     * Create and return a new flag which takes a single number
     * 
     * @param {string} name The name of the flag
     * @return {Flag} A flag which parses a number argument
     */
    number(name) {
        let f = new Flag(name, new NumberParser())
        this.flags.push(f)
        return f
    }

    /**
     * Create and return a new flag which takes a single integer
     * 
     * @param {string} name The name of the flag
     * @returns {Flag} A flag which parses an integer argument
     */
    integer(name) {
        let f = new Flag(name, new IntegerParser())
        this.flags.push(f)
        return f
    }

    /**
     * Create and return a new flag which counts how often it was specified.
     * 
     * @param {string} name 
     * @returns {Flag} A flag which counts how often it appeared
     */
    counter(name) {
        let f = new Flag(name, new CounterParser())
        this.flags.push(f)
        return f
    }

    /**
     * Print help message
     * 
     * @param {?string} reason An extra message to write before the help output
     */
    printHelp(reason = null) {
        let msg = "\n"
        if(reason) {
            msg += reason + "\n\n"
        }
        // TODO: add positional arguments to Usage statement
        msg += "Usage: run " + this.name + " [OPTIONS]"
        if(this.argsString) {
            msg += " " + this.argsString
        }
        msg += "\n"
        if(this.description) {
            msg += "\n" + this.description + "\n"
        }
        // TODO: Description
        msg += "\nFlags:\n"

        // Ensure the flags are ordered alphabetically, with long-option only
        // flags at the bottom.
        this.flags.sort((a,b) => {
            if(a._short) {
                if(b._short) {
                    return a._short.localeCompare(b._short)
                }
                return -1
            }
            if(b._short) {
                return 1
            }
            return a._long.localeCompare(b._long)
        })

        for (let f of this.flags) {
            if(f._short) {
                msg += "  -" + f._short + " | --" + f._long
            }else {
                msg += "     | --" + f._long
            }
            let argsString = f.argsString()
            if(argsString) {
                msg += " " + argsString
            }
            msg += "\n"
            if(f._help) {
                msg += "      " + f._help + "\n"
            }
        }
        this.ns.tprint(msg)
    }

    /**
     * 
     * @param {(string|number|boolean)[]} args 
     * @returns {{exit: boolean, flags: Object<string,any>, args: string[]}}
     */
    parse(args) {
        try {
            let data = this.parseRaw(args)
            // Exit if the parser flag for it is set and the returned data
            // indicates we should
            if(data.exit && this.exit) {
                this.ns.exit()
            }
            // Otherwise return the data
            return data
        }catch(ex) {
            this.printHelp("" + ex)
            if(this.exit) {
                // Force an exit
                this.ns.exit()
            }
            return {
                "exit": true,
                "flags": {},
                "args": [],
            }
        }
    }

    /**
     * Parse the given arguments, throwing errors on issues
     * 
     * @param {(string|number|boolean)[]} args
     * @returns {{exit: boolean, flags: Object<string, number>, args: any[]}}
     */
    parseRaw(args) {
        // Initialize data
        /** @type {Object<string, any>} */
        let flagValues = {}
        /** @type {(string|number|boolean)[]} */
        let positional = []
        /** @type {Object<string, Flag>} */
        let sflags = {}
        /** @type {Object<string, Flag>} */
        let lflags = {}
        for(let f of this.flags) {
            flagValues[f._long] = f.initialValue()
            if(f._short != null) {
                sflags[f._short] = f
            }
            lflags[f._long] = f
        }


        let i = 0
        while(i < args.length) {
            // Work around for the fact that the argument may be a number or
            // a boolean. Would really prefer that the Bitburner command line
            // wouldn't pre-parse things for us.
            const arg = args[i].toString()

            // Handle special argument '--'
            if(arg == "--") {
                for(let j = i + 1; j < args.length; ++j) {
                    positional.push(args[j])
                }
                break
            }

            // Check if it's a long-opt, short-opt, or positional
            if(arg.startsWith("--")) {
                // Long opts may have an '=' to specify an attached argument
                let lastEquals = arg.lastIndexOf("=")
                let dataStart = lastEquals + 1
                if(lastEquals < 0) {
                    // Not found
                    lastEquals = arg.length
                    dataStart = -1
                }

                // Split the flag up and strip off the leading --
                const name = arg.substring(2, lastEquals)
                const data = (dataStart < 0) ? null : arg.substring(dataStart)
                const extra = (data == null) ? 0 : 1

                // Check for the flag - error if not found
                if(!(name in lflags)) {
                    throw new Error("unknown long option '--" + name + "'")
                }

                // Get the flag from our long-opt cache
                const flag = lflags[name]

                // Check the arguments required
                const nargs = flag.args()
                if(nargs > 0) {
                    // If we don't have enough, throw an error indicating such
                    if(i + 1 + nargs - extra > args.length) {
                        throw new Error("too few arguments to flag --" + name)
                    }
                    // Otherwise, let the flag 'accumulate' the values
                    /** @type {string[]} */
                    let fArgs = []
                    if(data != null) {
                        fArgs.push(data)
                    }
                    for(let j = 0; j < nargs-extra; j++) {
                        // Use toString() to coerce to string
                        fArgs.push(args[i+1+j].toString())
                    }
                    flag.accumulate(flagValues, ...fArgs)
                    // Move our index to the last arg
                    i += (nargs - extra)
                }else {
                    flag.accumulate(flagValues)
                }
                // Let the flag perform an action if necessary
                flag.doAction()
                if(flag._forceExit) {
                    return {
                        'exit': true,
                        'flags': {},
                        'args': [],
                    }
                }
                i += 1
            } else if(arg.startsWith("-")) {
                let j = 1
                while(j < arg.length) {
                    const flagChar = arg[j]
                    if(!(flagChar in sflags)) {
                        throw new Error("unknown short option '-" + flagChar + "' - available" + JSON.stringify(sflags))
                    }
                    const flag = sflags[flagChar]
                    const nargs = flag.args()
                    if(nargs > 0) {
                        let extra = (j + 1 < arg.length) ? 1 : 0
                        if(i + 1 + nargs - extra > args.length) {
                            throw new Error("too few arguments to flag --" + flag._long)
                        }

                        /** @type {string[]} */
                        let fArgs = []
                        if(j + 1 < arg.length) {
                            fArgs.push(arg.substring(j+1))
                            // Make sure we don't treat the remainder as flags, set j to end of flag
                            j = arg.length
                            extra = 1
                        }
                        // Gather extra flag arguments as needed
                        for(let k = 0; k < nargs-extra; k++) {
                            fArgs.push(args[i+1+k].toString())
                        }
                        flag.accumulate(flagValues, ...fArgs)
                        i += (nargs-extra)
                    }else {
                        flag.accumulate(flagValues)
                    }
                    flag.doAction()
                    if(flag._forceExit) {
                        return {
                            'exit': true,
                            'flags': {},
                            'args': [],
                        }
                    }
                    j++
                }
                i++
            }else {
                // Argument - TODO: specify these, handle missing/extra args
                positional.push(arg)
                i++
            }
        }

        return {
            'exit': false,
            'flags': flagValues,
            'args': positional,
        }
    }
}