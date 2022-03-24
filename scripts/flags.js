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

/**
 * @function
 * @name FlagArgParser#args
 * @returns {number} The number of arguments to expect
 */

/**
 * @function
 * @name FlagArgParser#initialValue
 * @param {?string} value An initial value to parse if non-null
 * @return {any} The initial value to use for a flag of this type
 */

/**
 * @function
 * @name FlagArgParser#accumulate
 * @param {any} current The current accumulated value
 * @param {...string} args The arguments to accumulate
 * @return {any} The result of accumulating the args
 */

/**
 * @function
 * @name FlagArgParser#argsString
 * @return {string}
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
	 * @param {?Parser} parser The parser
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
     * @param {function()} fn An action callback which takes no arguments
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
	 * @param {object} data The parsed flags data
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
			return this._parser.initialValue(this.defaultValue)
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
		return null
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
		return parseInt(args[0])
	}

	/**
	 * @param {?string} val
	 * @returns {any}
	 */
	initialValue(val) {
		return null
	}

	/**
	 * @returns {string}
	 */
	argsString() {
		return "<number>"
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
		this.description = null
		this.name = (name == null) ? ns.getScriptName() : name
		this.flags = [
			new Flag("help").shortOpt("h").action(() => this.printHelp()).forceExit(true)
		]
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

    printHelp() {
		// TODO: add positional arguments to Usage statement
		let msg = "\nUsage: run " + this.name + " [OPTIONS]\n"
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
		}
		this.ns.tprint(msg)
    }

	parse(args) {
		try {
			return this.parseRaw(args)
		}catch(ex) {
			this.ns.tprint(ex)
			this.printHelp()
		}
	}

	/**
	 * Parse the given arguments, throwing errors on issues
	 * 
	 * @param {string[]} args
	 */
	parseRaw(args) {
		// Initialize data
		let flagValues = {}
		let positional = []
		let sflags = {}
		let lflags = {}
		for(let f of this.flags) {
			flagValues[f._long] = f.initialValue()
			if(f.sFlag != null) {
				sflags[f._short] = f
			}
			lflags[f._long] = f
		}


        let i = 0
        while(i < args.length) {
			const arg = args[i]
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
                    let fArgs = []
                    if(extra > 0) {
                        fArgs.push(data)
                    }
                    for(let j = 0; j < nargs-extra; j++) {
                        fArgs.push(args[i+1+j])
                    }
                    flag.accumulate(flagValues, ...fArgs)
                    // Move our index to the last arg
                    i += (nargs - extra)
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
						throw new Error("unknown short option '-" + flagChar + "'")
					}
					const flag = sflags[flagChar]
					const nargs = flag.args()
					if(nargs > 0) {
						let extra = (j + 1 < arg.length) ? 1 : 0
						if(i + 1 + nargs - extra > args.length) {
							throw new Error("too few arguments to flag --" + name)
						}

						let fArgs = []
						if(j + 1 < arg.length) {
							fArgs.push(arg.substring(j+1))
							// Make sure we don't treat the remainder as flags, set j to end of flag
							j = arg.length
							extra = 1
						}
						// Gather extra flag arguments as needed
						for(let k = 0; k < nargs-extra; k++) {
							fArgs.push(args[i+1+k])
						}
						flag.accumulate(flagValues, ...fArgs)
						i += (nargs-extra)
					}
					flag.doAction()
					if(flag._forceExit) {
						return {
							'exit': true,
							'data': {},
							'args': [],
						}
					}
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