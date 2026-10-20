// Variables: the page, command line, masters, and the current page's executors and encoders.

export const STANDARD_EXECUTORS = [
	...Array.from({ length: 10 }, (_, i) => 101 + i),
	...Array.from({ length: 10 }, (_, i) => 201 + i),
	...Array.from({ length: 10 }, (_, i) => 301 + i),
]

export function variableDefinitions(execNumbers, encoderCount) {
	const defs = [
		{ variableId: 'page', name: 'Executor page' },
		{ variableId: 'command_line', name: 'Command line' },
		{ variableId: 'grand_master', name: 'Grand master (%)' },
		{ variableId: 'blackout', name: 'Blackout (On/Off)' },
		{ variableId: 'prog_fade', name: 'Programmer fade' },
		{ variableId: 'version', name: 'Lumora version' },
	]
	for (let n = 1; n <= 10; n++) {
		defs.push({ variableId: `master_${n}_name`, name: `Master ${n}: name` })
		defs.push({ variableId: `master_${n}_value`, name: `Master ${n}: value (BPM, ratio or rate)` })
		defs.push({ variableId: `master_${n}_fader`, name: `Master ${n}: fader (%)` })
	}
	for (const n of [...execNumbers].sort((a, b) => a - b)) {
		defs.push({ variableId: `exec_${n}_name`, name: `Executor ${n}: sequence name` })
		defs.push({ variableId: `exec_${n}_cue`, name: `Executor ${n}: live cue` })
		defs.push({ variableId: `exec_${n}_fader`, name: `Executor ${n}: fader (%)` })
		defs.push({ variableId: `exec_${n}_key1`, name: `Executor ${n}: first key lit (On/Off)` })
	}
	for (let n = 1; n <= encoderCount; n++) {
		defs.push({ variableId: `encoder_${n}_name`, name: `Encoder ${n}: what it turns` })
		defs.push({ variableId: `encoder_${n}_value`, name: `Encoder ${n}: value` })
	}
	return defs
}
