// What Lumora has told us: its feedback under /out, kept for variables and feedbacks.

export function emptyState() {
	return {
		page: 1,
		cmd: '',
		gm: 1,
		blackout: false,
		progFade: 0,
		version: '',
		/** executor number -> { name, cue, fader, buttons: [b1, b2, b3] } (current page) */
		execs: new Map(),
		/** master 1–10 -> { name, value, fader } */
		masters: new Map(),
		/** encoder 1… -> { name, value } */
		encoders: new Map(),
	}
}

export function execOf(state, n) {
	let e = state.execs.get(n)
	if (!e) {
		e = { name: '', cue: '', fader: 0, buttons: [false, false, false] }
		state.execs.set(n, e)
	}
	return e
}

/**
 * Applies one feedback message. Returns what changed:
 * { variables: {id: value}, feedbacks: Set<feedback id>, newExecs: number[], pageChanged: bool }
 */
export function applyMessage(state, { address, args }) {
	const out = { variables: {}, feedbacks: new Set(), newExecs: [], pageChanged: false, newEncoders: [] }
	const p = address.split('/').filter(Boolean)
	if (p[0] !== 'out') return out
	const v = args[0]
	const num = (x) => (typeof x === 'number' ? x : Number(x) || 0)
	switch (p[1]) {
		case 'ping':
			break
		case 'page':
			if (num(v) !== state.page) {
				state.page = num(v)
				out.pageChanged = true
				// Lumora sends the new page's executors next: forget the old ones.
				for (const [n, e] of state.execs) {
					Object.assign(e, { name: '', cue: '', fader: 0, buttons: [false, false, false] })
					Object.assign(out.variables, execVariables(n, e))
				}
				out.feedbacks.add('exec_button_lit').add('exec_running').add('exec_fader_above')
			}
			out.variables.page = state.page
			out.feedbacks.add('page_is')
			break
		case 'cmd':
			state.cmd = String(v ?? '')
			out.variables.command_line = state.cmd
			break
		case 'gm':
			state.gm = num(v)
			out.variables.grand_master = Math.round(state.gm * 100)
			out.feedbacks.add('grand_master_below')
			break
		case 'blackout':
			state.blackout = num(v) > 0 || v === true
			out.variables.blackout = state.blackout ? 'On' : 'Off'
			out.feedbacks.add('blackout_on')
			break
		case 'progfade':
			state.progFade = num(v)
			out.variables.prog_fade = state.progFade > 0 ? `${state.progFade} s` : 'Off'
			out.feedbacks.add('prog_fade_on')
			break
		case 'get':
			if (p[2] === 'version') {
				state.version = String(v ?? '')
				out.variables.version = state.version
			}
			break
		case 'exec': {
			// /out/exec/<page>/<n>/fader | name | cue | button/<b>
			const page = num(p[2])
			const n = num(p[3])
			if (page !== state.page || !n) break
			const isNew = !state.execs.has(n)
			const e = execOf(state, n)
			if (isNew) out.newExecs.push(n)
			if (p[4] === 'fader') {
				e.fader = num(v)
				out.feedbacks.add('exec_fader_above')
			} else if (p[4] === 'name') {
				e.name = String(v ?? '')
			} else if (p[4] === 'cue') {
				e.cue = String(v ?? '')
				out.feedbacks.add('exec_running')
			} else if (p[4] === 'button') {
				const b = num(p[5]) - 1
				if (b >= 0 && b < 3) e.buttons[b] = num(v) > 0 || v === true
				out.feedbacks.add('exec_button_lit')
			}
			Object.assign(out.variables, execVariables(n, e))
			break
		}
		case 'master': {
			const n = num(p[2])
			if (!n) break
			const m = state.masters.get(n) || { name: '', value: '', fader: 0 }
			state.masters.set(n, m)
			if (p[3] === 'name') m.name = String(v ?? '')
			else if (p[3] === 'value') m.value = String(v ?? '')
			else if (p[3] === 'fader') m.fader = num(v)
			out.variables[`master_${n}_name`] = m.name
			out.variables[`master_${n}_value`] = m.value
			out.variables[`master_${n}_fader`] = Math.round(m.fader * 100)
			break
		}
		case 'encoder': {
			const n = num(p[2])
			if (!n) break
			if (!state.encoders.has(n)) out.newEncoders.push(n)
			const e = state.encoders.get(n) || { name: '', value: '' }
			state.encoders.set(n, e)
			if (p[3] === 'name') e.name = String(v ?? '')
			else if (p[3] === 'value') e.value = String(v ?? '')
			out.variables[`encoder_${n}_name`] = e.name
			out.variables[`encoder_${n}_value`] = e.value
			break
		}
	}
	return out
}

export function execVariables(n, e) {
	return {
		[`exec_${n}_name`]: e.name,
		[`exec_${n}_cue`]: e.cue,
		[`exec_${n}_fader`]: Math.round(e.fader * 100),
		[`exec_${n}_key1`]: e.buttons[0] ? 'On' : 'Off',
	}
}
