import * as dat from "dat.gui";
import Debug from "../Debug";
import type { CircuitsPatternCanvasAPI } from "./CircuitsPatternCanvasAPI";

const root = document.documentElement;

export function initGUI(
	properties: {
		speed: number;
		color: string;
		debugEnabled: boolean;
		circuitColor: string;
		bgColor: string;
		strokeWidth: number;
		cellSize: number;
		waveLength: number;
		waveGap: number;
		drawCursor: boolean;
	},
	circuit: CircuitsPatternCanvasAPI
) {
	const gui = new dat.GUI();

	gui.add(properties, "speed", 0, 10).onChange((s) => circuit.setSpeed(s));
	gui.addColor(properties, "color").onChange((color) => {
		root.style.setProperty("--circuitColor", color);
		circuit.setColor(color);
	});

	gui.add(properties, "strokeWidth", 0, 10).onChange((s) => circuit.setStrokeWidth(s));
	gui.add(properties, "waveLength", 0, 10, 1).onChange((l) => {
		circuit.setWaveLength(l);
		circuit.reset();
	});
	gui.add(properties, "waveGap", 0, 10, 1).onChange((g) => {
		circuit.setWaveGap(g);
		circuit.reset();
	});
	gui.add(properties, "cellSize", 0, 100).onChange((s) => {
		circuit.setCellSize(s);
		circuit.reset();
	});

	gui.add(properties, "debugEnabled").onChange((isEnabled) => {
		Debug.isEnabled = isEnabled;
		if (!isEnabled) Debug.removeDebugPoints();
		circuit.draw();
	});

	gui.add(properties, "drawCursor").onChange((isEnabled) => {
		circuit.drawCursor = isEnabled;
		circuit.draw();
	});

	return properties;
}
