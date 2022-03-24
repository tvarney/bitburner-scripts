import * as flags from "/scripts/flags.js"
import * as net from "/scripts/net-walk.js"

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
 * @param {string} hostname
 * @param {string[]} available
 * @returns {boolean} If scripts can be run on the server
 */
function openServer(ns, hostname, available) {
	// If it's already open, return true
	if(ns.hasRootAccess(hostname)) {
		return true
	}
	// If we don't have the required level, return false
	if(ns.getServerRequiredHackingLevel(hostname) > ns.getHackingLevel()) {
		return false
	}
	// If we can't open enough ports, return false
	const nports = ns.getServerNumPortsRequired(hostname)
	if(available.length < nports) {
		return false
	}
	// Open _all_ available ports
	for(let prog of available) {
		switch(prog) {
		case "BruteSSH.exe":
			ns.brutessh(hostname)
		case "FTPCrack.exe":
			ns.ftpcrack(hostname)
		case "relaySMTP.exe":
			ns.relaysmtp(hostname)
		case "HTTPWorm.exe":
			ns.httpworm(hostname)
		case "SQLInject.exe":
			ns.sqlinject(hostname)
		}
	}
	// At this point, the server should be nukable, so nuke it and return true
	ns.nuke(hostname)
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
async function deploy(ns, hostname, script, args, availProgs, redeploy=false, maxThreads=-1) {
	const scriptMem = ns.getScriptRam(script)

	// If the server isn't open, or can't be opened, skip
	if(!openServer(ns, hostname, availProgs)) {
		return
	}
	if(redeploy) {
		ns.killall(hostname)
	}
	// Get server free memory
    const sMaxMem = ns.getServerMaxRam(hostname)
    const sUsedMem = ns.getServerUsedRam(hostname)
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

	let prog = p.parse(ns.args)
	if(prog.exit) {
		return
	}

	if(prog.args.length < 1) {
		p.printHelp("Not enough arguments; require script name")
		return
	}

    const available = availablePrograms(ns)

    const script = prog.args.shift()
	const maxThreads = prog.flags['max-threads']
	const redeploy = prog.flags['redeploy']
	
    ns.tprintf("INFO Deploying %s with args %s", script, JSON.stringify(prog.args))
	await net.walk(ns, async function(hostname) {
		await deploy(ns, hostname, script, prog.args, available, redeploy, maxThreads)
	})
}