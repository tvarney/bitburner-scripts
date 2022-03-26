const fSchema = [
	['server', 'foodnstuff'],
	['money-factor', 0.75],
	['security-offset', 5],
	['help', false]
]
const fHelp = {
	'server': "The server to hack",
	'money-factor': "A factor between 0 and 1 of the server maxMoney to grow to",
	'security-offset': "The amount above server minSecurity to weaken to",
}

/**
 * @param {NS} ns
 * @param {[string, string|number|boolean|string[]]][]} schema
 * @param {object} help
 */
function printHelp(ns, schema, help) {
	schema = schema.sort((a, b) => (a[0] < b[0] ? -1 : a[0] == b[0] ? 0 : 1))
	ns.tprint("Usage: run " + ns.getScriptName())
	ns.tprint("")
	ns.tprint("Flags:")
	for(let f of schema) {
		const flag = f[0]
		const def = f[1]
		ns.tprint("  --" + flag + " <"+ def.constructor.name +"|" + JSON.stringify(def) +">")
		if(flag in help) {
			ns.tprint("      " + help[flag])
		}
	}
}

/**
 * @param {NS} ns
 **/
export async function main(ns) {
	const data = ns.flags(fSchema)
	if(data['help']) {
		printHelp(ns, fSchema, fHelp)
		ns.exit()
	}

	let hostname = data['server']
	if(hostname == "self") {
		hostname = ns.getHostname()
	}
	const maxSecurity = ns.getServerMinSecurityLevel(hostname) + data['security-offset']
	const minMoney = ns.getServerMaxMoney(hostname) * data['money-factor']
	while(true) {
		if(ns.getServerSecurityLevel(hostname) > maxSecurity) {
			await ns.weaken(hostname)
		}else if(ns.getServerMoneyAvailable(hostname) < minMoney) {
			await ns.grow(hostname)
		}else {
			await ns.hack(hostname)
		}
	}
}