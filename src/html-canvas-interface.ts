import CircuitPatternGenerator, {
	Action,
	calculateNextNodeOffset as calculateSegmentEnd,
	Position,
	type Segment,
} from "./circuitPattern";
import Debug, { createDebugPoint } from "./Debug";

type CanvasProps = {
	speed?: number;
	circuitColor?: string;
	bgColor?: string;
	strokeWidth?: number;
	cellSize?: number;
	fps?: number;
};

const DEFAULTS = {
	speed: 1,
	circuitColor: "green",
	fps: 60,
	bgColor: "black",
	strokeWidth: 1,
	cellSize: 1,
};

function calculateDestination(s: number, e: number, progress: number) {
	if (progress === 1) return e;

	return s + (e - s) * progress;
}

interface CanvasSegment {
	draw(progress: number, ctx: CanvasRenderingContext2D): void;
}

class Line implements CanvasSegment {
	start: Position;
	end: Position;

	constructor(segment: Segment) {
		if (segment.action === Action.End) throw new Error('Cannot draw a line of an "end" segment');

		this.start = segment.start;
		this.end = segment.end;
	}

	draw(progress: number, ctx: CanvasRenderingContext2D) {
		const end = [
			calculateDestination(this.start.x, this.end.x, progress),
			calculateDestination(this.start.y, this.end.y, progress),
		] as [number, number];

		ctx.beginPath();
		ctx.moveTo(...this.start.asArray);
		ctx.lineTo(...end);
		ctx.stroke();
		ctx.closePath();

		if (progress < 1) drawCursor(end, ctx);
	}
}

class End implements CanvasSegment {
	line: Line;
	position: Position;
	r: number;

	constructor(segment: Segment, size: number) {
		this.r = size / 10;
		// to put the element in the middle
		// const lineLength = (size - this.r) / 2;
		const lineLength = (size - this.r) / 4;

		const offset = calculateSegmentEnd(Action.Up, segment.direction);
		const rOffset = offset.scale(lineLength + this.r);

		this.position = new Position(segment.start.x + rOffset.x, segment.start.y + rOffset.y);
		this.line = new Line({
			...segment,
			end: segment.start.add(offset.scale(lineLength)),
			action: Action.Up,
		});
	}

	draw(progress: number, ctx: CanvasRenderingContext2D) {
		this.line.draw(Math.min(1, progress * 2), ctx);

		const arcProgress = 2 * Math.PI * progress;

		ctx.beginPath();
		ctx.arc(...this.position.asArray, this.r, 0, arcProgress);
		ctx.stroke();
		ctx.closePath();

		if (progress < 1) {
			drawCursor(
				[this.position.x + this.r * Math.cos(arcProgress), this.position.y + this.r * Math.sin(arcProgress)],
				ctx
			);
		}
	}
}

function drawCursor(position: [number, number], ctx: CanvasRenderingContext2D) {
	const r = 2;

	ctx.beginPath();
	ctx.arc(...position, r, 0, 2 * Math.PI);

	const prevColor = ctx.fillStyle;
	ctx.fillStyle = ctx.strokeStyle;
	ctx.fill();
	ctx.fillStyle = prevColor;

	ctx.stroke();
	ctx.closePath();
}

export class CircuitsPatternCanvasAPI {
	ctx: CanvasRenderingContext2D;
	patterGenerator: CircuitPatternGenerator;
	currentFrame: number = 0;
	isRunning = false;
	center: Position;

	circuitColor: string;
	bgColor: string;
	width: number;
	height: number;
	cellSize: number;
	nrOfFrames: number;
	animProgress: number = 0;

	segments: CanvasSegment[] = [];
	completedSegments: CanvasSegment[] = [];

	constructor(canvas: HTMLCanvasElement, props: CanvasProps) {
		this.height = canvas.height;
		this.width = canvas.width;
		this.center = new Position(this.width / 2, this.height / 2);

		this.circuitColor = props.circuitColor ?? DEFAULTS["circuitColor"];
		this.bgColor = props.bgColor ?? DEFAULTS["bgColor"];
		this.nrOfFrames = (props.fps ?? DEFAULTS["fps"]) / (props.speed ?? DEFAULTS["speed"]);
		this.cellSize = props.cellSize ?? DEFAULTS["cellSize"];

		this.ctx = canvas.getContext("2d")!;
		this.ctx.fillStyle = this.bgColor;
		this.ctx.strokeStyle = this.circuitColor;
		this.ctx.lineWidth = props.strokeWidth ?? DEFAULTS["strokeWidth"];

		this.patterGenerator = new CircuitPatternGenerator(this.width / this.cellSize, this.height / this.cellSize);

		this.segments = this.patterGenerator.next().map((s) => this.canvasSegmentFromPattern(s));
	}

	private canvasSegmentFromPattern(segment: Segment) {
		segment.start = this.translatePointToCanvas(segment.start);
		segment.end = this.translatePointToCanvas(segment.end);
		return segment.action == Action.End ? new End(segment, this.cellSize) : new Line(segment);
	}

	private translatePointToCanvas(p: Position) {
		return p.scale(this.cellSize).add(this.center);
	}

	private update() {
		this.currentFrame++;

		if (this.currentFrame > this.nrOfFrames) {
			this.currentFrame = 0;
			this.completedSegments.push(...this.segments);
			this.segments = this.patterGenerator.next().map((s) => this.canvasSegmentFromPattern(s));

			if (!Debug.isEnabled) return;

			for (const p of Debug.data) {
				const origPos = p.position;
				p.position = this.translatePointToCanvas(p.position);
				createDebugPoint({ origPos, ...p });
			}
		}

		this.animProgress = this.currentFrame / this.nrOfFrames;
	}

	private draw() {
		this.ctx.fillRect(0, 0, this.width, this.height);

		for (const segment of this.completedSegments) {
			segment.draw(1, this.ctx);
		}

		for (const segment of this.segments) {
			segment.draw(this.animProgress, this.ctx);
		}
	}

	public start() {
		if (this.segments.length === 0) this.reset();

		this.isRunning = true;
		this.animate();
	}

	public stop() {
		this.isRunning = false;
	}

	reset() {
		this.patterGenerator = new CircuitPatternGenerator(this.width / this.cellSize, this.height / this.cellSize);
		this.segments = this.patterGenerator.next().map((s) => this.canvasSegmentFromPattern(s));
		this.completedSegments = [];

		if (Debug.isEnabled) {
			[...document.getElementsByClassName("debug-point"), ...document.getElementsByClassName("debug-info")].forEach(
				(el) => el.parentElement!.removeChild(el)
			);
		}
	}

	nextOne() {
		this.isRunning = false;
		if (this.segments.length === 0) this.reset();

		this.update();
		this.draw();

		if (this.currentFrame !== 0) requestAnimationFrame(() => this.nextOne());
	}

	private animate() {
		this.update();
		this.draw();

		if (this.segments.length !== 0 && this.isRunning) {
			requestAnimationFrame(() => this.animate());
		} else {
			this.isRunning = false;
			if (Debug.isEnabled) {
				document.getElementById("play-icon")!.style.display = "block";
				document.getElementById("pause-icon")!.style.display = "none";
			}
		}
	}
}

let circuit: CircuitsPatternCanvasAPI;

/**
 *
 * @param id
 * @param {CanvasProps} props {
 *  speed - the time for one line to move from origin to destination
 * }
 */
export function animateCircuit(id: string, props?: CanvasProps) {
	const canvas = document.getElementById(id) as HTMLCanvasElement;

	if (!canvas) throw new Error(`No element found with id: "${id}"`);
	if (canvas.nodeName !== "CANVAS") throw new Error(`Element with id: "${id}" is not a canvas`);

	circuit = new CircuitsPatternCanvasAPI(canvas, props ?? DEFAULTS);
	circuit.start();

	window.addEventListener("resize", () => {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		circuit.stop();

		if (Debug.isEnabled) {
			[...document.getElementsByClassName("debug-point"), ...document.getElementsByClassName("debug-info")].forEach(
				(el) => el.parentElement!.removeChild(el)
			);
		}

		circuit = new CircuitsPatternCanvasAPI(canvas as HTMLCanvasElement, props ?? DEFAULTS);
		circuit.start();
	});
}

export function example() {
	const canvas = document.getElementById("canvas") as HTMLCanvasElement;
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	animateCircuit("canvas", { speed: 15, cellSize: Math.max(window.innerWidth, window.innerHeight) / 20 });
}

document.getElementById("next")!.addEventListener("click", () => {
	circuit.nextOne();
});
document.getElementById("play")!.addEventListener("click", () => {
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
