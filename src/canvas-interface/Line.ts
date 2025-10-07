import { Action, type Position, type Segment } from "../circuitPattern";
import type CanvasSegment from "./CanvasSegment";
import { calculateDestination, drawCursor } from "./utils";

export default class Line implements CanvasSegment {
	start: Position;
	end: Position;
	level: number;

	constructor(segment: Segment) {
		if (segment.action === Action.End) throw new Error('Cannot draw a line of an "end" segment');

		this.level = segment.level;
		this.start = segment.start;
		this.end = segment.end;
	}

	draw(progress: number, ctx: CanvasRenderingContext2D, shouldDrawCursor: boolean, isDisapearing?: boolean) {
		const end: [number, number] = isDisapearing
			? [
					calculateDestination(this.end.x, this.start.x, 1 - progress),
					calculateDestination(this.end.y, this.start.y, 1 - progress),
			  ]
			: [
					calculateDestination(this.start.x, this.end.x, progress),
					calculateDestination(this.start.y, this.end.y, progress),
			  ];

		ctx.beginPath();
		ctx.moveTo(...(isDisapearing ? this.end : this.start).asArray);
		ctx.lineTo(...end);
		ctx.stroke();
		ctx.closePath();

		if (shouldDrawCursor && progress < 1) drawCursor(end, ctx);
	}
}
