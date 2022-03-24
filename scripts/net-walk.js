/**
 * Recurse through the network starting from home, calling the given callback
 * for each server visited.
 * 
 * @param {NS} ns
 * @param {function(string)} callback The callback function to use
 */
 export async function walk(ns, callback) {
	await walkImpl(ns, "home", "home", callback)
}

/**
 * Recurse through the network, calling the given callback for each server
 * visited.
 * 
 * @param {NS} ns 
 * @param {string} root The initial node to walk from
 * @param {function(string)} callback The callback function to use
 */
export async function walkFrom(ns, root, callback) {
    await walkImpl(ns, root, root, callback)
}

/**
 * Recurse through the network, calling the given callback for each server
 * visited.
 * 
 * This takes the hostname to visit and the 
 * 
 * @param {NS} ns
 * @param {string} hostname
 * @param {string} parent
 * @param {function(string)} callback
 */
export async function walkImpl(ns, hostname, parent, callback) {
	if(hostname != parent) {
		await callback(hostname)
	}

	const children = ns.scan(hostname)
	for(let c of children) {
		if(c != parent) {
			await walkImpl(ns, c, hostname, callback)
		}
	}
}

/**
 * Get a list of all servers available from the given root
 * 
 * @param {NS} ns
 * @param {string} root
 * @returns {string[]} The list of servers available, scanning from root
 */
export async function scanAll(ns, root="home") {
	let servers = []
    await walkImpl(ns, root, root, (s) => servers.push(s))
	return servers
}

/**
 * A tree node for the scanTree function
 */
 export class Node {
    /**
     * Create a new tree node
     * 
     * @param {string} name 
     * @param {string} parent 
     * @param {Node[]} children
     * @param {any} info 
     */
    constructor(name, parent, children, info=null) {
        this.name = name
        this.parent = parent
        this.children = children
        this.info = info
    }
}

/**
 * Create a tree of Node instances by walking the network
 * 
 * This will create and return a Node for the given server, recursively
 * discovering all connected nodes. If a callback is provided, it will be
 * called with the node to be returned, the result of which will be assigned
 * to Node.info.
 * 
 * @param {NS} ns
 * @param {string} server The root server to build the tree from
 * @param {function(Node) => any} callback A callback function used to populate extra info
 * @returns {Node} A Node representing the given server
 */
export async function scanTree(ns, server="home", callback=null) {
    return scanTreeImpl(ns, server, server, callback)
}

/**
 * Create a tree by walking the network
 * 
 * @param {NS} ns 
 * @param {string} server 
 * @param {string} parent 
 * @param {function(Node) => any} callback 
 * @returns {Node} A node representing the given server
 */
async function scanTreeImpl(ns, server, parent, callback) {
    let m = async function(name) {
        await scanTreeImpl(ns, name, server, callback)
    }
	let children = await ns.scan(server).filter((value) => value != parent).map(m)
    let n = new Node(server, parent, children)
    if(callback) {
        n.info = await callback(n)
    }
    return n
}