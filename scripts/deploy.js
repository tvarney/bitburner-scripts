// @ts-check

// These need to be converted to absolute paths within Bitburner
import * as flags from "scripts/flags.js"
import * as net from "scripts/net-walk.js"
import * as logging from "scripts/logging.js"

var tlog = logging.GlobalLogger()

/**
 * The list of all available hacking programs
 */
const AllPrograms = [
    "BruteSSH.exe", "FTPCrack.exe", "relaySMTP.exe", "HTTPWorm.exe", "SQLInject.exe",
]

/**
 * A list of scripts which are considered libraries and should be copied to all
 * targets being deployed to.
 */
const Libraries = [
    "/scripts/flags.js",
    "/scripts/logging.js",
    "/scripts/utils.js"
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
    const host = server.hostname
    if(server.purchasedByPlayer) {
        return true
    }
    // If it's already open, return true
    if(server.hasAdminRights) {
        tlog.tInfoV(3, "Server %s has already been cracked", host)
        return true
    }
    // If we don't have the required level, return false
    if(server.requiredHackingSkill > ns.getHackingLevel()) {
        tlog.tWarnV(2, "Skipping %s - hacking skill too low", host)
        return false
    }
    // If we can't open enough ports, return false
    if(available.length < server.numOpenPortsRequired) {
        tlog.tWarnV(2, "Skipping %s - can't open enough ports", host)
        return false
    }
    // Open _all_ available ports
    for(let prog of available) {
        switch(prog) {
        case "BruteSSH.exe":
            tlog.tInfoV(3, "Running %s on %s", prog, host)
            ns.brutessh(server.hostname)
            break
        case "FTPCrack.exe":
            tlog.tInfoV(3, "Running %s on %s", prog, host)
            ns.ftpcrack(server.hostname)
            break
        case "relaySMTP.exe":
            tlog.tInfoV(3, "Running %s on %s", prog, host)
            ns.relaysmtp(server.hostname)
            break
        case "HTTPWorm.exe":
            tlog.tInfoV(3, "Running %s on %s", prog, host)
            ns.httpworm(server.hostname)
            break
        case "SQLInject.exe":
            tlog.tInfoV(3, "Running %s on %s", prog, host)
            ns.sqlinject(server.hostname)
            break
        default:
            tlog.tErrorV(0, "Unknown hacking program %s", prog)
        }
    }
    // At this point, the server should be nukable, so nuke it and return true
    tlog.tInfoV(3, "Running NUKE.exe on %s", host)
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
        tlog.tInfoV(2, "Skipping %s - purchased by player", hostname)
        return
    }
    if(!server.purchasedByPlayer && skipExternal) {
        tlog.tInfoV(2, "Skipping %s - not purchased by player", hostname)
        return
    }

    if(redeploy) {
        tlog.tWarnV(3, "Killing all processes on %s", hostname)
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
        // Copy the script to the given host
        tlog.tInfoV(3, "Copying %s to %s", script, hostname)
        await ns.scp(script, hostname)
        // TODO: A better way of doing this (discover using regex on script?)
        for(let lib of Libraries) {
            tlog.tInfoV(3, "Copying %s to %s", lib, hostname)
            await ns.scp(lib, hostname)
        }

        // Run the script on the host with any extra args
        tlog.tInfo("Running %s on %s with %v threads", script, hostname, threads)
        ns.exec(script, hostname, threads, ...args)
    }else {
        tlog.tError("Can't run %s on %s - insufficient memory available; using %v/%v GB", script, hostname, sUsedMem, sMaxMem)
    }
}

/**
 * @param {NS} ns
 */
export async function main(ns) {
    logging.InitGlobal(ns)
    tlog.termDebug(true)

    let p = new flags.Parser(ns)
    p.description = "Deploy a given script with the given arguments"
    p.argsString = "SCRIPT <...args>"
    p.flag("redeploy").shortOpt('r').help("If the deployment should kill all existing processes")
    p.number("max-threads").shortOpt('T').default("-1").help("The maximum number of threads to utilize, or -1 for unlimited")
    p.flag("skip-external").shortOpt('E').help("Skip deploying to external servers")
    p.flag("skip-purchased").shortOpt('P').help("Skip deploying to player-purchased servers")
    p.counter("verbose").shortOpt('v').help("Print more information to the terminal")
    p.flag("quiet").shortOpt('q').help("Reduce program output")

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
    const verbose = Number(prog.flags['verbose'])
    const quiet = Boolean(prog.flags['quiet'])
    ns.tprintf("Verbosity: %v, Quite: %v", verbose, quiet)
    tlog.termVerbosity(quiet ? 0 : verbose + 1)
    
    tlog.tInfo("Deploying %s with args %s", script, JSON.stringify(prog.args))
    /**
     * @param {string} hostname
     */
    let walkfn = async function(hostname) {
        await deploy(ns, hostname, script, prog.args, available, skipPurchased, skipExternal, redeploy, maxThreads)
    }
    await net.walk(ns, walkfn)
}