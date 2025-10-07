import type CircuitPatternGenerator from "../circuitPattern";
import type CanvasSegment from "./CanvasSegment";

export const DEFAULTS = {
	speed: 1,
	color: getComputedStyle(document.documentElement).getPropertyValue("--circuitColor"),
	circuitColor: "green",
	bgColor: "black",
	strokeWidth: 1,
	cellSize: Math.max(window.innerWidth, window.innerHeight) / 20,
	waveGap: 1,
	waveLength: 2,
	debugEnabled: false,
	drawCursor: false,
};

export function drawCursor(position: [number, number], ctx: CanvasRenderingContext2D) {
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

export function calculateDestination(s: number, e: number, progress: number) {
	if (progress === 1) return e;

	return s + (e - s) * progress;
}

export type CanvasProps = {
	speed?: number;
	circuitColor?: string;
	bgColor?: string;
	strokeWidth?: number;
	cellSize?: number;
	waveLength?: number;
	waveGap?: number;
	drawCursor?: boolean;
	debugEnabled?: boolean;
	guiEnabled?: boolean;
};

export type Session = {
	patternGenerator: CircuitPatternGenerator;

	segments: CanvasSegment[];
	completedSegments: CanvasSegment[];
};
