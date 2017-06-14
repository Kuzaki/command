'use strict'

const PRIVATE_CHANNEL_INDEX = 7,
	PRIVATE_CHANNEL_ID = -2 >>> 0,
	PRIVATE_CHANNEL_NAME = 'Proxy',
	LOGIN_MESSAGE = true

class Command {
	constructor(dispatch) {
		this.dispatch = dispatch

		this.loaded = false
		this.hooks = {}

		dispatch.hook('S_LOGIN', 2, () => { this.loaded = false })

		dispatch.hook('S_LOAD_CLIENT_USER_SETTING', 1, () => {
			if(!this.loaded && (this.loaded = true))
				process.nextTick(() => {
					dispatch.toClient('S_JOIN_PRIVATE_CHANNEL', 1, {
						index: PRIVATE_CHANNEL_INDEX,
						id: PRIVATE_CHANNEL_ID,
						unk: [],
						name: PRIVATE_CHANNEL_NAME
					})

					if(LOGIN_MESSAGE) this.message('TERA Proxy enabled. Client version: ' + this.dispatch.base.protocolVersion)
				})
		})

		dispatch.hook('S_JOIN_PRIVATE_CHANNEL', 1, event => event.index === PRIVATE_CHANNEL_INDEX ? false : undefined)
		dispatch.hook('C_LEAVE_PRIVATE_CHANNEL', 1, event => event.index === PRIVATE_CHANNEL_INDEX ? false : undefined)

		dispatch.hook('C_REQUEST_PRIVATE_CHANNEL_INFO', 1, event => {
			if(event.channelId === PRIVATE_CHANNEL_ID) {
				dispatch.toClient('S_REQUEST_PRIVATE_CHANNEL_INFO', 1, {
					owner: 1,
					password: 0,
					members: [],
					friends: []
				})
				return false
			}
		})

		dispatch.hook('C_CHAT', 1, {order: 10}, event => {
			if(event.channel === 11 + PRIVATE_CHANNEL_INDEX) {
				let args = null

				try {
					args = parseArgs(stripOuterHTML(event.message))
				}
				catch(e) {
					this.message('Syntax error: ' + e.message)
					return false
				}

				try {
					if(!this.exec(args)) this.message('Unknown command "' + args[0] + '".')
				}
				catch(e) {
					this.message('Error running callback for command "' + args[0] + '".')
				}
				return false
			}
		})
	}

	exec(str) {
		let args = Array.isArray(str) ? str : parseArgs(str)

		if(args.length === 0) return false

		let cmd = this.hooks[args[0].toLowerCase()]

		if(cmd) {
			args.shift()
			cmd(...args)
			return true
		}

		return false
	}

	add(cmd, cb) {
		if(Array.isArray(cmd)) {
			for(let c of cmd) add(c, cb)
			return
		}

		if(typeof cmd !== 'string') throw new Error('Command must be a string or array of strings')
		if(cmd === '') throw new Error('Command must not be an empty string')

		if(this.hooks[cmd = cmd.toLowerCase()]) throw new Error('Command already registered:', cmd)

		this.hooks[cmd] = cb
	}

	message(msg) {
		this.dispatch.toClient('S_PRIVATE_CHAT', 1, {
			channel: PRIVATE_CHANNEL_ID,
			authorID: 0,
			authorName: '',
			message: msg
		})
	}
}

function stripOuterHTML(str) {
	return str.replace(/^<[^>]+>|<\/[^>]+><[^\/][^>]*>|<\/[^>]+>$/g, '')
}

function parseArgs(str) {
	let args = [],
		arg = '',
		quote = ''

	let parseHTML = /.*?<\/.*?>/g

	for(let i = 0, c = ''; i < str.length; i++) {
		c = str[i]

		switch(c) {
			case '<':
				parseHTML.lastIndex = i + 1

				let len = parseHTML.exec(str)

				if(!len) throw new Error('HTML parsing failure')

				len = len[0].length
				arg += str.substr(i, len + 1)
				i += len
				break
			case '\\':
				c = str[++i]

				if(c === undefined) throw new Error('Unexpected end of line')

				arg += c
				break
			case '\'':
			case '"':
				if(arg === '' && quote === '') {
					quote = c
					break
				}
				if(quote === c) {
					quote = ''
					break
				}
				arg += c
				break
			case ' ':
				if(quote === '') {
					if(arg !== '') {
						args.push(arg)
						arg = ''
					}
					break
				}
			default:
				arg += c
		}
	}

	if(arg !== '') {
		if(quote !== '') throw new Error('Expected ' + quote)

		args.push(arg)
	}

	return args
}

let map = new WeakMap()

module.exports = function Require(dispatch) {
	if(map.has(dispatch.base)) return map.get(dispatch.base)

	let command = new Command(dispatch)
	map.set(dispatch.base, command)
	return command
}