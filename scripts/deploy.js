// @ts-check

// These need to be converted to absolute paths within Bitburner
import * as flags from "scripts/flags.js"
import * as net from "scripts/net-walk.js"

/**
 * The list of all available hacking programs
 */
const AllPrograms = [
    "BruteSSH.exe", "FTPCrack.exe", "relaySMTP.exe", "HTTPWorm.exe", "SQLInject.exe",
]

/**
 * Get the set of hacking programs available.
 * 
 * @param {NS} ns 
 * @returns {string[]} The list of available hacking programs
 */
function availablePrograms(ns) {
    return AllPrograms.filter((prog) => ns.fileExists(prog, "home"))
}

/**
 * @param {NS} ns
 * @param {Server} server
 * @param {string[]} available
 * @returns {boolean} If scripts can be run on the server
 */
function openServer(ns, server, available) {
	// If it's already open, return true
	if(server.hasAdminRights) {
		return true
	}
	// If we don't have the required level, return false
	if(server.requiredHackingSkill > ns.getHackingLevel()) {
		return false
	}
	// If we can't open enough ports, return false
	if(available.length < server.numOpenPortsRequired) {
		return false
	}
	// Open _all_ available ports
	for(let prog of available) {
		switch(prog) {
		case "BruteSSH.exe":
			ns.brutessh(server.hostname)
			break
		case "FTPCrack.exe":
			ns.ftpcrack(server.hostname)
			break
		case "relaySMTP.exe":
			ns.relaysmtp(server.hostname)
			break
		case "HTTPWorm.exe":
			ns.httpworm(server.hostname)
			break
		case "SQLInject.exe":
			ns.sqlinject(server.hostname)
			break
		}
	}
	// At this point, the server should be nukable, so nuke it and return true
	ns.nuke(server.hostname)
	return true
}

/**
 * @param {NS} ns
 * @param {string} hostname
 * @param {string} script
 * @param {string[]} args
 * @param {string[]} availProgs
 * @param {boolean} redeploy
 * @param {number} maxThreads
 */
async function deploy(ns, hostname, script, args, availProgs, skipPersonal=false, skipExternal=false, redeploy=false, maxThreads=-1) {
	const scriptMem = ns.getScriptRam(script)
	let server = ns.getServer(hostname)

	// If the server isn't open, or can't be opened, skip
	if(!openServer(ns, server, availProgs)) {
		return
	}

	// Skip external or purchased based on flags
	if(server.purchasedByPlayer && skipPersonal) {
		ns.tprintf("INFO Skipping %s - purchased by player", server.hostname)
		return
	}
	if(!server.purchasedByPlayer && skipExternal) {
		ns.tprintf("INFO Skipping %s - not purchased by player", server.hostname)
		return
	}

	if(redeploy) {
		ns.killall(hostname)
		server = ns.getServer(hostname)
	}

	// Get server free memory
    const sMaxMem = server.maxRam
    const sUsedMem = server.ramUsed
	const sMem = sMaxMem - sUsedMem
	// Get threads to run with
	let threads = Math.floor(sMem / scriptMem)
	if(maxThreads > 0) {
		// If max-threads is set above 0, cap to that
		threads = Math.min(threads, maxThreads)
	}
    if(threads > 0) {
        ns.tprintf("INFO Running %s on %s with %v threads", script, hostname, threads)
        // Copy the script to the given host
        await ns.scp(script, hostname)
        // Run the script on the host with any extra args
        ns.exec(script, hostname, threads, ...args)
    }else {
        ns.tprintf("ERROR Can't run %s on %s - insufficient memory available; using %v/%v GB", script, hostname, sUsedMem, sMaxMem)
    }
}

/**
 * @param {NS} ns
 */
export async function main(ns) {
	let p = new flags.Parser(ns)
	p.description = "Deploy a given script with the given arguments"
	p.flag("redeploy").shortOpt('r')
	p.number("max-threads").shortOpt('T').default("-1")
	p.flag("skip-external").shortOpt('E')
	p.flag("skip-purchased").shortOpt('P')

	let prog = p.parse(ns.args)
	if(prog.exit) {
		return
	}

	if(prog.args.length < 1) {
		p.printHelp("Not enough arguments; require script name")
		return
	}

    const available = availablePrograms(ns)

    const script = String(prog.args.shift())
	const maxThreads = Number(prog.flags['max-threads'])
	const redeploy = Boolean(prog.flags['redeploy'])
	const skipPurchased = Boolean(prog.flags['skip-purchased'])
	const skipExternal = Boolean(prog.flags['skip-external'])
	
    ns.tprintf("INFO Deploying %s with args %s", script, JSON.stringify(prog.args))
	/**
	 * @param {string} hostname
	 */
	let walkfn = async function(hostname) {
		await deploy(ns, hostname, script, prog.args, available, skipPurchased, skipExternal, redeploy, maxThreads)
	}
	await net.walk(ns, walkfn)
}