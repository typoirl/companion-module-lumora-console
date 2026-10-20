// OSC 1.0 messages, bundles and SLIP framing (for TCP), with no dependencies.

function pad4(n) {
	return (4 - (n % 4)) % 4
}

function encodeString(s) {
	const raw = Buffer.from(String(s), 'utf8')
	return Buffer.concat([raw, Buffer.alloc(1 + pad4(raw.length + 1))])
}

/**
 * Encodes one message.
 * @param {string} address e.g. "/exec/1/201/fader"
 * @param {Array<{type: 'i'|'f'|'s'|'T'|'F', value?: any}>} args
 */
export function encodeMessage(address, args = []) {
	let tags = ','
	const parts = []
	for (const a of args) {
		switch (a.type) {
			case 'i': {
				const b = Buffer.alloc(4)
				b.writeInt32BE(Math.trunc(Number(a.value) || 0))
				parts.push(b)
				tags += 'i'
				break
			}
			case 'f': {
				const b = Buffer.alloc(4)
				b.writeFloatBE(Number(a.value) || 0)
				parts.push(b)
				tags += 'f'
				break
			}
			case 's':
				parts.push(encodeString(a.value ?? ''))
				tags += 's'
				break
			case 'T':
			case 'F':
				tags += a.type
				break
			default:
				throw new Error(`OSC type ${a.type} not supported`)
		}
	}
	return Buffer.concat([encodeString(address), encodeString(tags), ...parts])
}

function readString(buf, offset) {
	let end = offset
	while (end < buf.length && buf[end] !== 0) end++
	if (end >= buf.length) throw new Error('OSC string not terminated')
	const s = buf.toString('utf8', offset, end)
	return { value: s, next: end + 1 + pad4(end + 1 - offset) }
}

function decodeMessage(buf) {
	const addr = readString(buf, 0)
	const args = []
	if (addr.next >= buf.length) return { address: addr.value, args }
	const tags = readString(buf, addr.next)
	let pos = tags.next
	for (const t of tags.value.slice(1)) {
		switch (t) {
			case 'i':
				args.push(buf.readInt32BE(pos))
				pos += 4
				break
			case 'f':
				args.push(buf.readFloatBE(pos))
				pos += 4
				break
			case 'd':
				args.push(buf.readDoubleBE(pos))
				pos += 8
				break
			case 'h':
				args.push(Number(buf.readBigInt64BE(pos)))
				pos += 8
				break
			case 's':
			case 'S': {
				const s = readString(buf, pos)
				args.push(s.value)
				pos = s.next
				break
			}
			case 'b': {
				const n = buf.readInt32BE(pos)
				args.push(buf.subarray(pos + 4, pos + 4 + n))
				pos += 4 + n + pad4(n)
				break
			}
			case 'T':
				args.push(true)
				break
			case 'F':
				args.push(false)
				break
			case 'N':
				args.push(null)
				break
			default:
				throw new Error(`OSC type ${t} not supported`)
		}
	}
	return { address: addr.value, args }
}

/** Decodes a packet: one message, or a bundle of them (nested bundles flattened). */
export function decodePacket(buf) {
	if (buf.length >= 8 && buf.toString('ascii', 0, 8) === '#bundle\0') {
		const out = []
		let pos = 16 // "#bundle\0" and the time tag
		while (pos + 4 <= buf.length) {
			const n = buf.readInt32BE(pos)
			pos += 4
			out.push(...decodePacket(buf.subarray(pos, pos + n)))
			pos += n
		}
		return out
	}
	return [decodeMessage(buf)]
}

const END = 0xc0,
	ESC = 0xdb,
	ESC_END = 0xdc,
	ESC_ESC = 0xdd

/** SLIP-frames a packet (OSC 1.1 over a stream), with an END byte at both ends. */
export function slipEncode(packet) {
	const out = [END]
	for (const b of packet) {
		if (b === END) out.push(ESC, ESC_END)
		else if (b === ESC) out.push(ESC, ESC_ESC)
		else out.push(b)
	}
	out.push(END)
	return Buffer.from(out)
}

/** Collects SLIP frames from a stream; push() returns the complete packets so far. */
export class SlipDecoder {
	constructor() {
		this.current = []
		this.escaped = false
	}
	push(chunk) {
		const packets = []
		for (const b of chunk) {
			if (this.escaped) {
				this.current.push(b === ESC_END ? END : b === ESC_ESC ? ESC : b)
				this.escaped = false
			} else if (b === ESC) {
				this.escaped = true
			} else if (b === END) {
				if (this.current.length) packets.push(Buffer.from(this.current))
				this.current = []
			} else {
				this.current.push(b)
			}
		}
		return packets
	}
}

/** Typed arguments from plain values: whole numbers as int, others as float, text as string. */
export function argsFrom(values) {
	return values.map((v) => {
		if (typeof v === 'boolean') return { type: v ? 'T' : 'F' }
		if (typeof v === 'number') return Number.isInteger(v) ? { type: 'i', value: v } : { type: 'f', value: v }
		return { type: 's', value: String(v) }
	})
}
