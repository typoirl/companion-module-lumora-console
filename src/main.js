import { InstanceBase, InstanceStatus, Regex, runEntrypoint } from '@companion-module/base'
import { LumoraConnection } from './connection.js'
import { actionDefinitions } from './actions.js'
import { feedbackDefinitions } from './feedbacks.js'
import { presetDefinitions } from './presets.js'
import { STANDARD_EXECUTORS, variableDefinitions } from './variables.js'
import { applyMessage, emptyState, execVariables } from './state.js'
import { upgradeScripts } from './upgrades.js'

class LumoraInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
		this.state = emptyState()
		this.execNumbers = new Set(STANDARD_EXECUTORS)
		this.encoderCount = 5
	}

	async init(config) {
		this.config = config
		this.setActionDefinitions(actionDefinitions(this))
		this.setFeedbackDefinitions(feedbackDefinitions(this))
		this.setPresetDefinitions(presetDefinitions(this))
		this.defineVariables()
		this.resetVariables()
		this.connect()
	}

	async destroy() {
		this.connection?.destroy()
		this.connection = null
		clearTimeout(this.redefineTimer)
	}

	async configUpdated(config) {
		this.config = config
		this.state = emptyState()
		this.resetVariables()
		this.connect()
	}

	getConfigFields() {
		return [
			{
				type: 'static-text',
				id: 'info',
				width: 12,
				label: 'Setting up Lumora',
				value:
					"In Lumora, open Setup → Control → OSC and add a line. UDP: set its <b>Other device</b> to this computer's IP address, " +
					'its <b>In port</b> to the port below, its <b>Out port</b> to the feedback port below, and tick <b>Receive</b> and <b>Send</b> ' +
					"(and <b>Commands</b> to send command lines). TCP: Lumora listens on the line's in port; tick the same boxes.",
			},
			{
				type: 'textinput',
				id: 'host',
				label: "Lumora computer's IP address",
				width: 6,
				default: '127.0.0.1',
				regex: Regex.HOSTNAME,
			},
			{
				type: 'dropdown',
				id: 'protocol',
				label: 'Protocol',
				width: 6,
				default: 'udp',
				choices: [
					{ id: 'udp', label: 'UDP' },
					{ id: 'tcp', label: 'TCP' },
				],
			},
			{ type: 'number', id: 'port', label: "Lumora's in port", width: 6, default: 8000, min: 1, max: 65535 },
			{
				type: 'number',
				id: 'feedbackPort',
				label: "Feedback port here (UDP: Lumora's out port)",
				width: 6,
				default: 9000,
				min: 1,
				max: 65535,
				isVisible: (c) => c.protocol !== 'tcp',
			},
			{
				type: 'textinput',
				id: 'prefix',
				label: 'Prefix (only if the line in Lumora has one, without slashes)',
				width: 6,
				default: '',
			},
		]
	}

	connect() {
		this.connection?.destroy()
		if (!this.config?.host) {
			this.updateStatus(InstanceStatus.BadConfig, "Set Lumora's IP address")
			return
		}
		this.updateStatus(InstanceStatus.Connecting)
		this.connection = new LumoraConnection(this.config, (level, msg) => this.log(level, msg))
		this.connection.on('state', (state, text) => {
			if (state === 'ok') {
				this.updateStatus(InstanceStatus.Ok)
				this.send('/get/version')
			} else if (state === 'connecting') this.updateStatus(InstanceStatus.Connecting, text)
			else if (state === 'lost') this.updateStatus(InstanceStatus.Disconnected, text)
			else this.updateStatus(InstanceStatus.ConnectionFailure, text)
		})
		this.connection.on('message', (m) => this.onMessage(m))
		this.connection.start()
	}

	send(address, args = []) {
		if (!this.connection?.send(address, args)) this.log('debug', `Not sent (not connected): ${address}`)
	}

	onMessage(m) {
		const r = applyMessage(this.state, m)
		let redefine = false
		for (const n of r.newExecs) {
			if (!this.execNumbers.has(n)) {
				this.execNumbers.add(n)
				redefine = true
			}
		}
		for (const n of r.newEncoders) {
			if (n > this.encoderCount) {
				this.encoderCount = n
				redefine = true
			}
		}
		if (redefine) {
			// Executors and encoders show up as Lumora sends them: define their variables once.
			clearTimeout(this.redefineTimer)
			this.redefineTimer = setTimeout(() => this.defineVariables(), 200)
		}
		if (Object.keys(r.variables).length) this.setVariableValues(r.variables)
		if (r.feedbacks.size) this.checkFeedbacks(...r.feedbacks)
	}

	defineVariables() {
		this.setVariableDefinitions(variableDefinitions(this.execNumbers, this.encoderCount))
	}

	resetVariables() {
		const values = {
			page: this.state.page,
			command_line: '',
			grand_master: 100,
			blackout: 'Off',
			prog_fade: 'Off',
			version: '',
		}
		for (const n of this.execNumbers)
			Object.assign(values, execVariables(n, { name: '', cue: '', fader: 0, buttons: [false, false, false] }))
		this.setVariableValues(values)
		this.checkFeedbacks()
	}
}

runEntrypoint(LumoraInstance, upgradeScripts)
