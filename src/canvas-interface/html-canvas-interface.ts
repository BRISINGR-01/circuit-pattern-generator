import Debug from "../Debug";
import { CircuitsPatternCanvasAPI } from "./CircuitsPatternCanvasAPI";
import { DEFAULTS, type CanvasProps } from "./utils";

let circuit: CircuitsPatternCanvasAPI;

/**
 *
 * @param id
 * @param {CanvasProps} props {
 *  speed - the time for one line to move from origin to destination
 * }
 */
export function animateCircuit(id: string, props?: CanvasProps) {
	Debug.isEnabled = props?.debugEnabled ?? false;
	const canvas = document.getElementById(id) as HTMLCanvasElement;

	if (!canvas) throw new Error(`No element found with id: "${id}"`);
	if (canvas.nodeName !== "CANVAS") throw new Error(`Element with id: "${id}" is not a canvas`);

	circuit = new CircuitsPatternCanvasAPI(canvas, props ?? DEFAULTS);
	circuit.start();

	if (props?.guiEnabled) {
		import("./gui").then((gui) => {
			gui.initGUI({ ...DEFAULTS, waveLength: 0 }, circuit);
		});
	}

	window.addEventListener("resize", () => {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		circuit.stop();
		Debug.removeDebugPoints();

		circuit = new CircuitsPatternCanvasAPI(canvas as HTMLCanvasElement, props ?? DEFAULTS);
		circuit.start();
	});
}

export function example() {
	const canvas = document.getElementById("canvas") as HTMLCanvasElement;
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	animateCircuit("canvas", {
		waveGap: 3,
		waveLength: 3,
	});
}

document.getElementById("next")?.addEventListener("click", () => {
	circuit.nextOne();
});
document.getElementById("play")?.addEventListener("click", () => {
	if (circuit.isRunning) {
		circuit.stop();
		document.getElementById("play-icon")!.style.display = "block";
		document.getElementById("pause-icon")!.style.display = "none";
	} else {
		circuit.start();
		document.getElementById("play-icon")!.style.display = "none";
		document.getElementById("pause-icon")!.style.display = "block";
	}
});
