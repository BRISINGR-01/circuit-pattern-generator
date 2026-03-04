import CircuitPatternGenerator, { Action, Position, type Segment } from "../circuitPattern";
import Debug, { createDebugPoint } from "../Debug";
import End from "./EndSegment";
import Line from "./Line";
import { DEFAULTS, type CanvasProps, type Session } from "./utils";

export class CircuitsPatternCanvasAPI {
	ctx: CanvasRenderingContext2D;
	isRunning = false;
	center: Position;
	currentFrame: number = 0;
	nrOfFrames: number = 0;
	animProgress: number = 0;
	waveLength?: number;
	waveGap: number;
	drawCursor: boolean;

	circuitColor: string;
	bgColor: string;
	width: number;
	cellSize: number;
	height: number;

	sessions: Session[];

	constructor(canvas: HTMLCanvasElement, props: CanvasProps) {
		this.height = canvas.height;
		this.width = canvas.width;
		this.waveLength = props.waveLength;
		this.waveGap = props.waveGap ?? DEFAULTS.waveGap;
		this.drawCursor = props.drawCursor ?? DEFAULTS.drawCursor;

		this.sessions = [];
		this.center = new Position(this.width / 2, this.height / 2);
		this.setSpeed(props.speed);
		this.circuitColor = props.circuitColor ?? DEFAULTS.circuitColor;
		this.bgColor = props.bgColor ?? DEFAULTS.bgColor;
		this.cellSize = props.cellSize ?? DEFAULTS.cellSize;

		this.ctx = canvas.getContext("2d")!;
		this.ctx.fillStyle = this.bgColor;
		this.ctx.strokeStyle = this.circuitColor;
		this.ctx.lineWidth = props.strokeWidth ?? DEFAULTS.strokeWidth;

		this.addSession();
	}

	addSession() {
		const patternGenerator = new CircuitPatternGenerator(this.width / this.cellSize, this.height / this.cellSize);

		this.sessions.push({
			patternGenerator,
			segments: patternGenerator.next().map((s) => this.canvasSegmentFromPattern(s)),
			completedSegments: [],
		});
	}

	setSpeed(speed?: number) {
		this.nrOfFrames = 64 / (speed ?? DEFAULTS["speed"]);
	}

	setColor(color: string) {
		this.circuitColor = color;
		this.ctx.strokeStyle = this.circuitColor;
		this.draw();
	}

	setStrokeWidth(strokeWidth: number) {
		this.ctx.lineWidth = strokeWidth;
		this.draw();
	}

	setWaveGap(gap: number) {
		this.waveGap = gap;
		this.draw();
	}
	setWaveLength(l: number) {
		this.waveLength = l;
		this.draw();
	}

	setCellSize(size: number) {
		this.cellSize = size;
		this.reset();
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

			for (let i = 0; i < this.sessions.length; i++) {
				const session = this.sessions[i];

				if (session.segments.length === 0 && session.completedSegments.length === 0) {
					this.sessions.splice(i, 1);
				} else {
					this.updateSession(session);
				}
			}

			if (
				this.sessions.length === 0 ||
				(this.waveLength &&
					this.sessions.at(-1)!.segments.length !== 0 &&
					this.sessions.at(-1)!.segments[0].level > this.waveLength + this.waveGap)
			) {
				// this.addSession();
			}

			if (Debug.isEnabled) {
				for (const p of Debug.data) {
					const origPos = p.position;
					p.position = this.translatePointToCanvas(p.position);
					createDebugPoint({ origPos, ...p });
				}
			}
		}

		this.animProgress = this.currentFrame / this.nrOfFrames;
	}

	private updateSession(session: Session) {
		const lastCompletedSegmentLevel = session.completedSegments[0]?.level;
		const isFinalLevel = lastCompletedSegmentLevel === session.completedSegments.at(-1)?.level;

		if (this.waveLength && !isFinalLevel) {
			const currentLevel = session.segments[0]?.level;
			const lastLevel = this.waveLength && currentLevel ? currentLevel - this.waveLength : null;

			for (let i = 0; i < session.completedSegments.length; i++) {
				if ((lastLevel ?? lastCompletedSegmentLevel) >= session.completedSegments[i].level) {
					session.completedSegments.splice(i, 1);
					i--;
				}
			}
		}

		session.completedSegments.push(...session.segments);
		session.segments = session.patternGenerator.next().map((s) => this.canvasSegmentFromPattern(s));
	}

	draw() {
		this.ctx.fillRect(0, 0, this.width, this.height);

		for (const session of this.sessions) {
			for (const segment of session.segments) {
				segment.draw(this.animProgress, this.ctx, this.drawCursor);
			}

			const currentLevel = session.segments[0]?.level;
			const lastLevel = this.waveLength && currentLevel ? currentLevel - this.waveLength : null;
			const lastCompletedSegmentLevel = session.completedSegments[0]?.level;

			for (const segment of session.completedSegments) {
				const isDisapearing = (lastLevel ?? lastCompletedSegmentLevel) === segment.level;

				segment.draw(isDisapearing ? this.animProgress : 1, this.ctx, this.drawCursor, isDisapearing);
			}
		}
	}

	public start() {
		if (this.sessions.every(({ segments }) => segments.length === 0)) this.reset();

		this.isRunning = true;
		this.animate();
	}

	public stop() {
		this.isRunning = false;
	}

	reset() {
		this.sessions = [];
		this.addSession();

		if (Debug.isEnabled) {
			[...document.getElementsByClassName("debug-point"), ...document.getElementsByClassName("debug-info")].forEach(
				(el) => el.parentElement!.removeChild(el)
			);
		}
	}

	nextOne() {
		this.isRunning = false;
		if (this.sessions.every(({ segments }) => segments.length === 0)) this.reset();

		this.update();
		this.draw();

		if (this.currentFrame !== 0) requestAnimationFrame(() => this.nextOne());
	}

	private animate() {
		this.update();
		this.draw();

		if (this.isRunning) {
			requestAnimationFrame(() => this.animate());
		} else {
			this.isRunning = false;

			document.getElementById("play-icon")!.style.display = "block";
			document.getElementById("pause-icon")!.style.display = "none";
		}
	}
}
