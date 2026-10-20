import dgram from 'node:dgram'
import net from 'node:net'
import { EventEmitter } from 'node:events'
import { encodeMessage, decodePacket, slipEncode, SlipDecoder } from './osc.js'

const PING_MS = 3000
const LOST_MS = 8000
const RECONNECT_MS = 2000

/**
 * Talks OSC with Lumora, over UDP or TCP.
 *
 * UDP: messages go to host:port (the line's in port in Lumora); feedback comes back to
 * feedbackPort here (the line's out port in Lumora, with this computer as its "other device").
 * TCP: one connection to host:port, both ways, SLIP framed.
 *
 * Events: 'message' ({address, args}), 'state' ('connecting' | 'ok' | 'lost' | 'error', text).
 */
export class LumoraConnection extends EventEmitter {
	constructor(config, log = () => {}) {
		super()
		this.config = config
		this.log = log
		this.prefix = String(config.prefix || '')
			.trim()
			.replace(/^\/+|\/+$/g, '')
		this.lastHeard = 0
		this.state = ''
		this.closed = false
	}

	start() {
		this.setState('connecting', 'Connecting…')
		if (this.config.protocol === 'tcp') this.openTcp()
		else this.openUdp()
		this.pingTimer = setInterval(() => this.ping(), PING_MS)
		this.ping()
	}

	destroy() {
		this.closed = true
		clearInterval(this.pingTimer)
		clearTimeout(this.reconnectTimer)
		try {
			this.udp?.close()
		} catch {
			/* already closed */
		}
		this.tcp?.destroy()
		this.udp = this.tcp = null
		this.removeAllListeners()
	}

	setState(state, text) {
		if (state === this.state && text === this.stateText) return
		this.state = state
		this.stateText = text
		this.emit('state', state, text)
	}

	openUdp() {
		const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true })
		this.udp = sock
		sock.on('error', (e) => {
			this.setState('error', `UDP: ${e.message}`)
		})
		sock.on('message', (buf) => this.receive(buf))
		const port = Number(this.config.feedbackPort) || 0
		sock.bind(port, () => {
			this.log('debug', `Listening for Lumora's feedback on UDP ${sock.address().port}`)
		})
	}

	openTcp() {
		const sock = net.connect({ host: this.config.host, port: Number(this.config.port) })
		this.tcp = sock
		this.tcpReady = false
		const slip = new SlipDecoder()
		sock.setNoDelay(true)
		sock.on('connect', () => {
			this.tcpReady = true
			this.ping()
		})
		sock.on('data', (chunk) => {
			for (const packet of slip.push(chunk)) this.receive(packet)
		})
		sock.on('error', (e) => this.setState('error', `TCP: ${e.message}`))
		sock.on('close', () => {
			this.tcpReady = false
			if (this.closed) return
			if (this.state === 'ok') this.setState('lost', 'Connection closed')
			clearTimeout(this.reconnectTimer)
			this.reconnectTimer = setTimeout(() => {
				if (!this.closed) this.openTcp()
			}, RECONNECT_MS)
		})
	}

	receive(buf) {
		let messages
		try {
			messages = decodePacket(buf)
		} catch (e) {
			this.log('debug', `Unreadable OSC: ${e.message}`)
			return
		}
		this.lastHeard = Date.now()
		if (this.state !== 'ok') this.setState('ok', null)
		for (const m of messages) {
			let address = m.address
			if (this.prefix) {
				const pre = `/${this.prefix}`
				if (!address.toLowerCase().startsWith(pre.toLowerCase() + '/')) continue
				address = address.slice(pre.length)
			}
			this.emit('message', { address, args: m.args })
		}
	}

	ping() {
		if (this.closed) return
		if (this.lastHeard && Date.now() - this.lastHeard > LOST_MS && this.state === 'ok')
			this.setState('lost', 'No answer from Lumora')
		this.send('/ping', [])
	}

	/** Sends a message; the address is Lumora's own (the prefix is added here). */
	send(address, args = []) {
		if (this.closed) return false
		const full = (this.prefix ? `/${this.prefix}` : '') + address
		let packet
		try {
			packet = encodeMessage(full, args)
		} catch (e) {
			this.log('warn', `Can't send ${full}: ${e.message}`)
			return false
		}
		if (this.config.protocol === 'tcp') {
			if (!this.tcp || !this.tcpReady) return false
			this.tcp.write(slipEncode(packet))
			return true
		}
		if (!this.udp || !this.config.host) return false
		this.udp.send(packet, Number(this.config.port), this.config.host, (e) => {
			if (e) this.setState('error', `UDP: ${e.message}`)
		})
		return true
	}
}
