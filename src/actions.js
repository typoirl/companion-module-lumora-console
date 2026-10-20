import { argsFrom } from './osc.js'

export const KEYS = [
	'Go',
	'GoBack',
	'Goto',
	'Pause',
	'Off',
	'On',
	'Clear',
	'ClearAll',
	'Store',
	'Update',
	'Delete',
	'Remove',
	'Copy',
	'Move',
	'Label',
	'Assign',
	'Fixture',
	'Group',
	'Preset',
	'Sequence',
	'Cue',
	'Executor',
	'Page',
	'Effect',
	'Attribute',
	'Default',
	'Fade',
	'Delay',
	'Full',
	'Zero',
	'Rate',
	'Size',
	'At',
	'Thru',
	'+',
	'-',
	'.',
	'0',
	'1',
	'2',
	'3',
	'4',
	'5',
	'6',
	'7',
	'8',
	'9',
	'Back',
	'Enter',
	'Next',
	'Prev',
	'NextY',
	'Highlight',
	'Blackout',
]

export const POOLS = [
	{ id: 1, label: 'Dimmer' },
	{ id: 2, label: 'Position' },
	{ id: 3, label: 'Gobo' },
	{ id: 4, label: 'Color' },
	{ id: 5, label: 'Beam' },
	{ id: 6, label: 'Focus' },
	{ id: 7, label: 'Control' },
	{ id: 8, label: 'All' },
]

const pageOption = {
	type: 'number',
	id: 'page',
	label: 'Page (0: the current page)',
	default: 0,
	min: 0,
	max: 9999,
}
const executorOption = {
	type: 'number',
	id: 'executor',
	label: 'Executor (101–199 keys, 201–299 faders, 301–399 encoders, 401–499 any)',
	default: 201,
	min: 101,
	max: 499,
}
const levelOption = (label = 'Level (%)', def = 100) => ({
	type: 'number',
	id: 'level',
	label,
	default: def,
	min: 0,
	max: 100,
	range: true,
})

/** /exec/<page>/<n>/… or /exec/<n>/… for the current page. */
function execAddress(o, what) {
	const page = Number(o.page) || 0
	return page > 0 ? `/exec/${page}/${o.executor}/${what}` : `/exec/${o.executor}/${what}`
}

export function actionDefinitions(self) {
	const send = (address, args = []) => self.send(address, args)
	const text = async (value) => self.parseVariablesInString(String(value ?? ''))
	return {
		command: {
			name: 'Command line',
			description: 'Runs a command, as typed on the command line (the OSC line needs Commands on in Lumora)',
			options: [
				{ type: 'textinput', id: 'command', label: 'Command', default: 'Group 1 At Full', useVariables: true },
				{ type: 'checkbox', id: 'fresh', label: 'Clear the command line first', default: false },
			],
			callback: async (a) => {
				const cmd = (await text(a.options.command)).trim()
				if (cmd) send(a.options.fresh ? '/newcmd' : '/cmd', argsFrom([cmd]))
			},
		},
		key: {
			name: 'Key',
			description: 'Presses a command key',
			options: [
				{
					type: 'dropdown',
					id: 'key',
					label: 'Key',
					default: 'Go',
					choices: KEYS.map((k) => ({ id: k, label: k })),
					allowCustom: true,
				},
			],
			callback: (a) => send(`/key/${a.options.key}`),
		},
		exec_key: {
			name: 'Executor: key',
			description: "Presses one of an executor's keys (what it does is set in Lumora: Go, Flash, Toggle…)",
			options: [
				pageOption,
				executorOption,
				{
					type: 'dropdown',
					id: 'button',
					label: 'Key',
					default: 1,
					choices: [
						{ id: 1, label: 'Key 1' },
						{ id: 2, label: 'Key 2' },
						{ id: 3, label: 'Key 3' },
					],
				},
				{
					type: 'dropdown',
					id: 'edge',
					label: 'Action',
					default: 'tap',
					choices: [
						{ id: 'tap', label: 'Tap (press and release)' },
						{ id: 'press', label: 'Press (hold until Release)' },
						{ id: 'release', label: 'Release' },
					],
				},
			],
			callback: (a) => {
				const o = a.options
				const address = execAddress(o, `button/${o.button}`)
				if (o.edge === 'press') send(address, [{ type: 'i', value: 1 }])
				else if (o.edge === 'release') send(address, [{ type: 'i', value: 0 }])
				else send(address)
			},
		},
		exec_playback: {
			name: 'Executor: playback',
			options: [
				pageOption,
				executorOption,
				{
					type: 'dropdown',
					id: 'what',
					label: 'Do',
					default: 'go',
					choices: [
						{ id: 'go', label: 'Go' },
						{ id: 'goback', label: 'Go back' },
						{ id: 'pause', label: 'Pause' },
						{ id: 'off', label: 'Off' },
						{ id: 'on', label: 'On' },
						{ id: 'top', label: 'Top (first cue)' },
					],
				},
			],
			callback: (a) => send(execAddress(a.options, a.options.what)),
		},
		exec_fader: {
			name: 'Executor: set fader',
			options: [pageOption, executorOption, levelOption()],
			callback: (a) => send(execAddress(a.options, 'fader'), [{ type: 'i', value: Math.round(a.options.level) }]),
		},
		exec_fader_step: {
			name: 'Executor: move fader (current page)',
			description: 'Up or down by a step, from where it is (for encoders and rotary buttons)',
			options: [
				executorOption,
				{ type: 'number', id: 'step', label: 'Step (%; negative goes down)', default: 5, min: -100, max: 100 },
			],
			callback: (a) => {
				const now = self.state.execs.get(Number(a.options.executor))?.fader ?? 0
				const next = Math.min(100, Math.max(0, Math.round(now * 100 + Number(a.options.step))))
				send(`/exec/${a.options.executor}/fader`, [{ type: 'i', value: next }])
			},
		},
		cue: {
			name: 'Cue: go to',
			description: 'Sends a sequence to a cue, on whichever executor it is on',
			options: [
				{ type: 'number', id: 'sequence', label: 'Sequence', default: 1, min: 1, max: 99999 },
				{ type: 'textinput', id: 'cue', label: 'Cue', default: '1', useVariables: true },
			],
			callback: async (a) => {
				const cue = (await text(a.options.cue)).trim()
				if (cue) send(`/cue/${a.options.sequence}/${cue}/fire`)
			},
		},
		group: {
			name: 'Group: select or set',
			options: [
				{ type: 'number', id: 'group', label: 'Group', default: 1, min: 1, max: 99999 },
				{ type: 'checkbox', id: 'setLevel', label: 'Also set its intensity', default: false },
				{ ...levelOption('Intensity (%)'), isVisible: (o) => !!o.setLevel },
			],
			callback: (a) => {
				const o = a.options
				send(`/group/${o.group}`, o.setLevel ? [{ type: 'i', value: Math.round(o.level) }] : [])
			},
		},
		select: {
			name: 'Fixtures: select',
			options: [
				{
					type: 'textinput',
					id: 'fixtures',
					label: 'Fixtures (as after Fixture: 1 Thru 8, 21.1 + 22.1)',
					default: '1 Thru 8',
					useVariables: true,
				},
			],
			callback: async (a) => {
				const which = (await text(a.options.fixtures)).trim()
				if (which) send('/select', argsFrom([which]))
			},
		},
		fixture: {
			name: 'Fixture: intensity or attribute',
			options: [
				{ type: 'textinput', id: 'fixture', label: 'Fixture (101, or 21.3)', default: '1', useVariables: true },
				{ type: 'textinput', id: 'attribute', label: 'Attribute (empty: intensity; Pan, Tilt, Zoom…)', default: '' },
				{
					type: 'number',
					id: 'value',
					label: 'Value (% ; degrees for pan and tilt)',
					default: 100,
					min: -720,
					max: 720,
				},
			],
			callback: async (a) => {
				const fid = (await text(a.options.fixture)).trim()
				const attr = String(a.options.attribute || '').trim()
				if (!fid) return
				const v = Number(a.options.value)
				// Lumora reads intensity and attributes in percent, pan and tilt in degrees.
				send(attr ? `/fixture/${fid}/${attr}` : `/fixture/${fid}`, [{ type: 'f', value: v }])
			},
		},
		preset: {
			name: 'Preset: apply',
			description: 'Applies a preset to the selected fixtures',
			options: [
				{ type: 'dropdown', id: 'pool', label: 'Pool', default: 4, choices: POOLS },
				{ type: 'number', id: 'preset', label: 'Preset', default: 1, min: 1, max: 99999 },
			],
			callback: (a) => send(`/preset/${a.options.pool}/${a.options.preset}/fire`),
		},
		macro: {
			name: 'Macro: run',
			options: [{ type: 'number', id: 'macro', label: 'Macro', default: 1, min: 1, max: 99999 }],
			callback: (a) => send(`/macro/${a.options.macro}/fire`),
		},
		master: {
			name: 'Master: fader, key, tap or reset',
			options: [
				{ type: 'number', id: 'master', label: 'Master (1–10)', default: 1, min: 1, max: 10 },
				{
					type: 'dropdown',
					id: 'what',
					label: 'Do',
					default: 'tap',
					choices: [
						{ id: 'tap', label: 'Tap tempo' },
						{ id: 'key', label: 'Its key (Learn or Reset)' },
						{ id: 'reset', label: 'Reset' },
						{ id: 'fader', label: 'Set its fader' },
					],
				},
				{ ...levelOption('Fader (%)', 50), isVisible: (o) => o.what === 'fader' },
			],
			callback: (a) => {
				const o = a.options
				if (o.what === 'fader') send(`/master/${o.master}`, [{ type: 'i', value: Math.round(o.level) }])
				else send(`/master/${o.master}/${o.what}`)
			},
		},
		grand_master: {
			name: 'Grand master',
			options: [levelOption('Level (%)', 100)],
			callback: (a) => send('/gm', [{ type: 'i', value: Math.round(a.options.level) }]),
		},
		grand_master_step: {
			name: 'Grand master: move',
			description: 'Up or down by a step, from where it is (for knobs and rotary buttons)',
			options: [{ type: 'number', id: 'step', label: 'Step (%; negative goes down)', default: 5, min: -100, max: 100 }],
			callback: (a) => {
				const next = Math.min(100, Math.max(0, Math.round(self.state.gm * 100 + Number(a.options.step))))
				send('/gm', [{ type: 'i', value: next }])
			},
		},
		blackout: {
			name: 'Blackout',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Blackout',
					default: 'toggle',
					choices: [
						{ id: 'toggle', label: 'Toggle' },
						{ id: 'on', label: 'On' },
						{ id: 'off', label: 'Off' },
					],
				},
			],
			callback: (a) => {
				const on = a.options.mode === 'toggle' ? !self.state.blackout : a.options.mode === 'on'
				send('/blackout', [{ type: 'i', value: on ? 1 : 0 }])
			},
		},
		page: {
			name: 'Executor page',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Page',
					default: 'next',
					choices: [
						{ id: 'next', label: 'Next' },
						{ id: 'prev', label: 'Previous' },
						{ id: 'set', label: 'Go to page…' },
					],
				},
				{
					type: 'number',
					id: 'page',
					label: 'Page',
					default: 1,
					min: 1,
					max: 9999,
					isVisible: (o) => o.mode === 'set',
				},
			],
			callback: (a) => {
				if (a.options.mode === 'set') send('/page', [{ type: 'i', value: a.options.page }])
				else send(`/page/${a.options.mode}`)
			},
		},
		prog_fade: {
			name: 'Programmer fade',
			description: 'Programmer changes fade over this time (0: off, they snap)',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Programmer fade',
					default: 'set',
					choices: [
						{ id: 'set', label: 'Set the time' },
						{ id: 'toggle', label: 'Toggle (on with the time below)' },
					],
				},
				{ type: 'number', id: 'seconds', label: 'Seconds (0: off)', default: 2, min: 0, max: 600, step: 0.5 },
			],
			callback: (a) => {
				let s = Number(a.options.seconds)
				if (a.options.mode === 'toggle' && self.state.progFade > 0) s = 0
				send('/progfade', [{ type: 'f', value: s }])
			},
		},
		encoder: {
			name: 'Encoder: turn',
			description: "Turns one of the encoder bar's encoders (for rotary buttons and knobs)",
			options: [
				{ type: 'number', id: 'encoder', label: 'Encoder', default: 1, min: 1, max: 20 },
				{ type: 'number', id: 'steps', label: 'Steps (negative turns down)', default: 1, min: -100, max: 100 },
				{ type: 'checkbox', id: 'fine', label: 'Fine', default: false },
			],
			callback: (a) =>
				send(a.options.fine ? `/encoder/fine/${a.options.encoder}` : `/encoder/${a.options.encoder}`, [
					{ type: 'f', value: Number(a.options.steps) },
				]),
		},
		undo: {
			name: 'Undo or redo',
			options: [
				{
					type: 'dropdown',
					id: 'what',
					label: 'Do',
					default: 'undo',
					choices: [
						{ id: 'undo', label: 'Undo' },
						{ id: 'redo', label: 'Redo' },
					],
				},
			],
			callback: (a) => send(`/${a.options.what}`),
		},
		custom: {
			name: 'Custom OSC message',
			description: "Any address of Lumora's (the prefix is added), with values separated by spaces",
			options: [
				{ type: 'textinput', id: 'address', label: 'Address', default: '/exec/201/go', useVariables: true },
				{
					type: 'textinput',
					id: 'args',
					label: 'Values (numbers, or text in quotes)',
					default: '',
					useVariables: true,
				},
			],
			callback: async (a) => {
				const address = (await text(a.options.address)).trim()
				if (!address.startsWith('/')) return
				send(address, argsFrom(parseValues(await text(a.options.args))))
			},
		},
	}
}

/** "1 0.5 "two words"" -> [1, 0.5, 'two words'] */
export function parseValues(s) {
	const out = []
	const re = /"([^"]*)"|(\S+)/g
	let m
	while ((m = re.exec(String(s ?? '')))) {
		if (m[1] !== undefined) out.push(m[1])
		else if (/^-?\d+$/.test(m[2])) out.push(parseInt(m[2], 10))
		else if (/^-?\d*\.\d+$/.test(m[2])) out.push(parseFloat(m[2]))
		else out.push(m[2])
	}
	return out
}
